import { ProgressEventSchema, type LessonCompletedEvent } from '@cifrai/shared';
import { newUuid } from './uuid';

/**
 * Registro local de um evento. `lessonXp` é metadado LOCAL (XP do catálogo no momento da conclusão,
 * para recalcular a estimativa offline); não faz parte do envelope nem vai no payload (ADR-0002).
 */
export interface StoredLessonEvent {
  event: LessonCompletedEvent;
  lessonXp: number;
}

export interface AppendMeta {
  deviceId: string;
  clientSeq: number;
}

export type AppendStatus = 'added' | 'duplicate';

/**
 * Repositório do log local. O outbox/sync (F1-11) se apoia nesta interface; aqui não há envio.
 * `append` é atômico: aloca o `clientSeq` e grava o evento juntos, e um `eventId` já gravado
 * devolve `duplicate` sem consumir sequência (idempotência).
 */
export interface EventStore {
  readonly kind: 'indexeddb' | 'memory';
  append(eventId: string, build: (meta: AppendMeta) => StoredLessonEvent): Promise<AppendStatus>;
  list(): Promise<StoredLessonEvent[]>;
}

export function createMemoryEventStore(): EventStore {
  const events = new Map<string, StoredLessonEvent>();
  let deviceId: string | undefined;
  let lastSeq = 0;
  return {
    kind: 'memory',
    // async: um erro no `build` vira rejeição, como no IndexedDB.
    async append(eventId, build) {
      if (events.has(eventId)) return 'duplicate';
      deviceId ??= newUuid();
      const record = build({ deviceId, clientSeq: lastSeq + 1 });
      lastSeq += 1;
      events.set(eventId, record);
      return 'added';
    },
    list() {
      return Promise.resolve([...events.values()].sort(bySeq));
    },
  };
}

const bySeq = (a: StoredLessonEvent, b: StoredLessonEvent) => a.event.clientSeq - b.event.clientSeq;

function parseRecord(value: unknown): StoredLessonEvent | null {
  if (typeof value !== 'object' || value === null) return null;
  const { event, lessonXp } = value as { event?: unknown; lessonXp?: unknown };
  const parsed = ProgressEventSchema.safeParse(event);
  if (!parsed.success || typeof lessonXp !== 'number' || !Number.isFinite(lessonXp)) return null;
  return { event: parsed.data, lessonXp };
}

const DB_NAME = 'cifrai';
const DB_VERSION = 1;
const EVENTS = 'events';
const META = 'meta';

const request = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('IndexedDB request failed'));
  });

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = factory.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(EVENTS)) {
        db.createObjectStore(EVENTS, { keyPath: 'event.eventId' });
      }
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error('IndexedDB open failed'));
    open.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

/** `deviceId` e `lastSeq` ficam em `meta`, na mesma transação que grava o evento. */
export function createIndexedDbEventStore(factory: IDBFactory): EventStore {
  let db: Promise<IDBDatabase> | undefined;
  const database = () => (db ??= openDatabase(factory));

  return {
    kind: 'indexeddb',
    async append(eventId, build) {
      const conn = await database();
      return new Promise<AppendStatus>((resolve, reject) => {
        const tx = conn.transaction([EVENTS, META], 'readwrite');
        let status: AppendStatus = 'added';
        tx.oncomplete = () => resolve(status);
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
        const events = tx.objectStore(EVENTS);
        const meta = tx.objectStore(META);
        void (async () => {
          try {
            if ((await request(events.getKey(eventId))) !== undefined) {
              status = 'duplicate';
              return;
            }
            const storedDevice = (await request(meta.get('deviceId'))) as
              { value: string } | undefined;
            const storedSeq = (await request(meta.get('lastSeq'))) as { value: number } | undefined;
            const deviceId = storedDevice?.value ?? newUuid();
            const clientSeq = (storedSeq?.value ?? 0) + 1;
            const record = build({ deviceId, clientSeq });
            if (storedDevice === undefined) meta.put({ key: 'deviceId', value: deviceId });
            meta.put({ key: 'lastSeq', value: clientSeq });
            events.put(record);
          } catch (error) {
            tx.abort();
            reject(error instanceof Error ? error : new Error('IndexedDB append failed'));
          }
        })();
      });
    },
    async list() {
      const conn = await database();
      const tx = conn.transaction(EVENTS, 'readonly');
      const all = (await request(tx.objectStore(EVENTS).getAll())) as unknown[];
      return all.flatMap((raw) => parseRecord(raw) ?? []).sort(bySeq);
    },
  };
}

/**
 * IndexedDB quando disponível; qualquer falha (modo privado antigo, cota, WebView sem suporte)
 * troca para memória e `kind` passa a refletir isso, para a UI avisar que os pontos não persistem.
 */
export function createEventStore(
  factory: IDBFactory | undefined = globalThis.indexedDB as IDBFactory | undefined,
): EventStore {
  let current: EventStore =
    factory === undefined ? createMemoryEventStore() : createIndexedDbEventStore(factory);
  const degrade = () => {
    current = createMemoryEventStore();
  };
  return {
    get kind() {
      return current.kind;
    },
    async append(eventId, build) {
      try {
        return await current.append(eventId, build);
      } catch (error) {
        if (current.kind === 'memory') throw error;
        degrade();
        return current.append(eventId, build);
      }
    },
    async list() {
      try {
        return await current.list();
      } catch (error) {
        if (current.kind === 'memory') throw error;
        degrade();
        return current.list();
      }
    },
  };
}
