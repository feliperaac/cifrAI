import { indexedDB as fakeIndexedDB } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createEventStore,
  createIndexedDbEventStore,
  createMemoryEventStore,
  type EventStore,
  type StoredLessonEvent,
} from './eventStore';
import { newUuid } from './uuid';

function record(id: string, meta: { deviceId: string; clientSeq: number }): StoredLessonEvent {
  return {
    lessonXp: 20,
    event: {
      eventId: id,
      type: 'lesson.completed',
      schemaVersion: 1,
      payload: { lessonId: 'u01.l01', exercisesTotal: 2, exercisesCorrect: 2, durationSeconds: 5 },
      contentVersion: 'dev',
      deviceId: meta.deviceId,
      clientSeq: meta.clientSeq,
      clientTs: '2026-11-15T15:00:00.000Z',
      clientTz: 'America/Rio_Branco',
    },
  };
}

function contract(name: string, make: () => EventStore) {
  describe(`EventStore (${name})`, () => {
    let store: EventStore;
    beforeEach(() => {
      store = make();
    });

    it('começa vazio', async () => {
      expect(await store.list()).toEqual([]);
    });

    it('grava, aloca clientSeq monotônico e mantém o mesmo deviceId', async () => {
      const a = newUuid();
      const b = newUuid();
      expect(await store.append(a, (m) => record(a, m))).toBe('added');
      expect(await store.append(b, (m) => record(b, m))).toBe('added');
      const list = await store.list();
      expect(list.map((r) => r.event.clientSeq)).toEqual([1, 2]);
      expect(list[0]?.event.deviceId).toBe(list[1]?.event.deviceId);
    });

    it('é idempotente por eventId e não consome sequência no duplicado', async () => {
      const a = newUuid();
      const b = newUuid();
      await store.append(a, (m) => record(a, m));
      let built = false;
      expect(
        await store.append(a, (m) => {
          built = true;
          return record(a, m);
        }),
      ).toBe('duplicate');
      expect(built).toBe(false);
      await store.append(b, (m) => record(b, m));
      expect((await store.list()).map((r) => r.event.clientSeq)).toEqual([1, 2]);
    });

    it('falha no build não grava nada nem consome sequência', async () => {
      const a = newUuid();
      const b = newUuid();
      await expect(
        store.append(a, () => {
          throw new Error('payload inválido');
        }),
      ).rejects.toThrow();
      expect(await store.list()).toEqual([]);
      await store.append(b, (m) => record(b, m));
      expect((await store.list())[0]?.event.clientSeq).toBe(1);
    });
  });
}

contract('memória', createMemoryEventStore);

contract('IndexedDB (fake-indexeddb)', () => {
  // Fábrica nova por teste: banco isolado, sem depender do global do happy-dom.
  const factory = new (fakeIndexedDB.constructor as new () => IDBFactory)();
  return createIndexedDbEventStore(factory);
});

describe('IndexedDB: persistência e dados inválidos', () => {
  it('sobrevive a reabrir o banco (nova instância, mesmo armazenamento) e mantém deviceId e seq', async () => {
    const factory = new (fakeIndexedDB.constructor as new () => IDBFactory)();
    const first = createIndexedDbEventStore(factory);
    const a = newUuid();
    await first.append(a, (m) => record(a, m));
    const second = createIndexedDbEventStore(factory);
    const b = newUuid();
    await second.append(b, (m) => record(b, m));
    const list = await second.list();
    expect(list.map((r) => r.event.clientSeq)).toEqual([1, 2]);
    expect(list[0]?.event.deviceId).toBe(list[1]?.event.deviceId);
  });

  it('ignora registros corrompidos ao listar', async () => {
    const factory = new (fakeIndexedDB.constructor as new () => IDBFactory)();
    const store = createIndexedDbEventStore(factory);
    const a = newUuid();
    await store.append(a, (m) => record(a, m));
    await new Promise<void>((resolve, reject) => {
      const open = factory.open('cifrai', 1);
      open.onsuccess = () => {
        const tx = open.result.transaction('events', 'readwrite');
        tx.objectStore('events').put({ event: { eventId: 'lixo' }, lessonXp: 'x' });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    }).catch(() => undefined);
    expect(await store.list()).toHaveLength(1);
  });
});

describe('createEventStore (fallback)', () => {
  it('sem IndexedDB usa memória', async () => {
    const store = createEventStore(undefined);
    expect(store.kind).toBe('memory');
    const a = newUuid();
    expect(await store.append(a, (m) => record(a, m))).toBe('added');
    expect(await store.list()).toHaveLength(1);
  });

  it('com IndexedDB que falha ao abrir, cai para memória e continua gravando', async () => {
    const broken = {
      open: () => {
        throw new Error('SecurityError');
      },
    } as unknown as IDBFactory;
    const store = createEventStore(broken);
    expect(store.kind).toBe('indexeddb');
    const a = newUuid();
    expect(await store.append(a, (m) => record(a, m))).toBe('added');
    expect(store.kind).toBe('memory');
    expect(await store.list()).toHaveLength(1);
  });

  it('com IndexedDB funcional mantém kind=indexeddb', async () => {
    const store = createEventStore(new (fakeIndexedDB.constructor as new () => IDBFactory)());
    const a = newUuid();
    await store.append(a, (m) => record(a, m));
    expect(store.kind).toBe('indexeddb');
  });
});
