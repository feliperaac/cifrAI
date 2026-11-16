import { describe, expect, it } from 'vitest';
import { createMemoryEventStore, type EventStore } from './eventStore';
import { createProgressStore, type LessonCompletion } from './progressStore';
import { newUuid } from './uuid';

const completion = (over: Partial<LessonCompletion> = {}): LessonCompletion => ({
  eventId: newUuid(),
  lesson: { id: 'u01.l01', xp: 20 },
  exercisesTotal: 8,
  exercisesCorrect: 6,
  durationSeconds: 120,
  ...over,
});

function setup(initial = '2026-11-15T15:00:00.000Z', store: EventStore = createMemoryEventStore()) {
  let now = new Date(initial);
  const progress = createProgressStore({
    store,
    now: () => now,
    timeZone: () => 'America/Rio_Branco',
  });
  return { store, progress, advance: (iso: string) => (now = new Date(iso)) };
}

describe('progressStore', () => {
  it('load: vazio → ready com zeros', async () => {
    const { progress } = setup();
    expect(progress.getState().status).toBe('idle');
    await progress.getState().load();
    expect(progress.getState()).toMatchObject({
      status: 'ready',
      summary: { totalXp: 0, todayXp: 0, lessonsCompleted: 0, lastCompletedAt: null },
    });
  });

  it('load com falha de leitura vira error e pode tentar de novo', async () => {
    let fail = true;
    const store: EventStore = {
      kind: 'memory',
      append: () => Promise.resolve('added'),
      list: () => (fail ? Promise.reject(new Error('x')) : Promise.resolve([])),
    };
    const { progress } = setup(undefined, store);
    await progress.getState().load();
    expect(progress.getState().status).toBe('error');
    fail = false;
    await progress.getState().load();
    expect(progress.getState().status).toBe('ready');
  });

  it('registra o evento no formato do ADR-0002 e soma o XP', async () => {
    const { progress, store } = setup();
    const c = completion();
    const outcome = await progress.getState().recordLessonCompleted(c);
    expect(outcome).toEqual({ status: 'added', awardedXp: 20, reason: 'full', totalXp: 20 });
    const [stored] = await store.list();
    expect(stored?.event).toEqual({
      eventId: c.eventId,
      type: 'lesson.completed',
      schemaVersion: 1,
      payload: {
        lessonId: 'u01.l01',
        exercisesTotal: 8,
        exercisesCorrect: 6,
        durationSeconds: 120,
      },
      contentVersion: 'dev',
      deviceId: expect.stringMatching(/^[0-9a-f-]{36}$/) as string,
      clientSeq: 1,
      clientTs: '2026-11-15T15:00:00.000Z',
      clientTz: 'America/Rio_Branco',
    });
    expect(stored?.event.payload).not.toHaveProperty('xp');
    expect(progress.getState().summary).toMatchObject({
      totalXp: 20,
      todayXp: 20,
      lessonsCompleted: 1,
    });
  });

  it('idempotente: o mesmo eventId não duplica o XP e devolve o mesmo resultado', async () => {
    const { progress } = setup();
    const c = completion();
    const first = await progress.getState().recordLessonCompleted(c);
    const again = await progress.getState().recordLessonCompleted(c);
    expect(again).toEqual({ ...first, status: 'duplicate' });
    expect(progress.getState().summary.totalXp).toBe(20);
  });

  it('repetição no mesmo dia rende 20%; XP do dia soma ambos', async () => {
    const { progress, advance } = setup();
    await progress.getState().recordLessonCompleted(completion());
    advance('2026-11-15T18:00:00.000Z');
    const second = await progress.getState().recordLessonCompleted(completion());
    expect(second).toMatchObject({ awardedXp: 4, reason: 'repeat', totalXp: 24 });
    expect(progress.getState().summary.todayXp).toBe(24);
  });

  it('no dia seguinte o XP do dia zera mas o total continua', async () => {
    const { progress, advance } = setup();
    await progress.getState().recordLessonCompleted(completion());
    advance('2026-11-16T15:00:00.000Z');
    await progress.getState().load();
    expect(progress.getState().summary).toMatchObject({ totalXp: 20, todayXp: 0 });
    const next = await progress.getState().recordLessonCompleted(completion());
    expect(next).toMatchObject({ awardedXp: 20, reason: 'full', totalXp: 40 });
    expect(progress.getState().summary.todayXp).toBe(20);
  });

  it('"hoje" respeita o fuso: 02:00 UTC de 16/11 ainda é dia 15 em Rio Branco', async () => {
    const { progress } = setup('2026-11-16T02:00:00.000Z');
    await progress.getState().recordLessonCompleted(completion());
    const summary = progress.getState().summary;
    expect(summary.todayXp).toBe(20);
    expect(summary.lastCompletedAt).toBe('2026-11-16T02:00:00.000Z');
  });

  it('payload inválido (acertos > total) vira error e não grava', async () => {
    const { progress, store } = setup();
    const outcome = await progress
      .getState()
      .recordLessonCompleted(completion({ exercisesCorrect: 9, exercisesTotal: 2 }));
    expect(outcome).toMatchObject({ status: 'error', awardedXp: 0 });
    expect(await store.list()).toEqual([]);
  });

  it('expõe a persistência atual (memória) para a UI avisar', async () => {
    const { progress } = setup();
    await progress.getState().load();
    expect(progress.getState().persistence).toBe('memory');
  });
});
