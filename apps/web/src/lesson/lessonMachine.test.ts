import { describe, expect, it } from 'vitest';
import {
  correctCount,
  createLessonState,
  lessonProgress,
  lessonReducer,
  xpEarned,
  type LessonEvent,
  type LessonState,
} from './lessonMachine';

const lesson = { xp: 30, exercises: [{}, {}, {}] } as Parameters<typeof createLessonState>[0];

function run(events: LessonEvent[], from = createLessonState(lesson)): LessonState {
  return events.reduce(lessonReducer, from);
}

describe('lessonMachine', () => {
  it('começa na intro, sem progresso nem XP', () => {
    const s = createLessonState(lesson);
    expect(s).toMatchObject({ phase: 'intro', index: 0, total: 3, answers: [] });
    expect(lessonProgress(s)).toBe(0);
    expect(xpEarned(s)).toBe(0);
  });

  it('intro → exercício → feedback → próximo exercício', () => {
    const s1 = run([{ type: 'START' }]);
    expect(s1.phase).toBe('exercise');
    const s2 = lessonReducer(s1, { type: 'ANSWER', correct: true });
    expect(s2).toMatchObject({ phase: 'feedback', index: 0, answers: [true] });
    const s3 = lessonReducer(s2, { type: 'CONTINUE' });
    expect(s3).toMatchObject({ phase: 'exercise', index: 1 });
  });

  it('último feedback leva ao resultado com o XP da lição', () => {
    const s = run([
      { type: 'START' },
      { type: 'ANSWER', correct: true },
      { type: 'CONTINUE' },
      { type: 'ANSWER', correct: true },
      { type: 'CONTINUE' },
      { type: 'ANSWER', correct: true },
      { type: 'CONTINUE' },
    ]);
    expect(s.phase).toBe('result');
    expect(xpEarned(s)).toBe(30);
    expect(lessonProgress(s)).toBe(100);
  });

  it('erro não pune: mesmo XP, sem vidas e a lição segue', () => {
    const s = run([
      { type: 'START' },
      { type: 'ANSWER', correct: false },
      { type: 'CONTINUE' },
      { type: 'ANSWER', correct: false },
      { type: 'CONTINUE' },
      { type: 'ANSWER', correct: false },
      { type: 'CONTINUE' },
    ]);
    expect(s.phase).toBe('result');
    expect(correctCount(s)).toBe(0);
    expect(xpEarned(s)).toBe(30);
  });

  it('progresso: sobe já no feedback e conta acertos', () => {
    const s1 = run([{ type: 'START' }]);
    expect(lessonProgress(s1)).toBe(0);
    const s2 = lessonReducer(s1, { type: 'ANSWER', correct: false });
    expect(lessonProgress(s2)).toBe(33);
    const s3 = run([{ type: 'CONTINUE' }, { type: 'ANSWER', correct: true }], s2);
    expect(lessonProgress(s3)).toBe(67);
    expect(correctCount(s3)).toBe(1);
  });

  it('SKIP avança sem feedback e sem pontuar; no último vai ao resultado', () => {
    const s = run([{ type: 'START' }, { type: 'SKIP' }, { type: 'SKIP' }, { type: 'SKIP' }]);
    expect(s).toMatchObject({ phase: 'result', skipped: 3, answers: [] });
  });

  it('ignora eventos fora de ordem (mesmo objeto de estado)', () => {
    const intro = createLessonState(lesson);
    expect(lessonReducer(intro, { type: 'ANSWER', correct: true })).toBe(intro);
    expect(lessonReducer(intro, { type: 'CONTINUE' })).toBe(intro);
    expect(lessonReducer(intro, { type: 'SKIP' })).toBe(intro);
    const ex = run([{ type: 'START' }]);
    expect(lessonReducer(ex, { type: 'START' })).toBe(ex);
    expect(lessonReducer(ex, { type: 'CONTINUE' })).toBe(ex);
    const fb = lessonReducer(ex, { type: 'ANSWER', correct: true });
    expect(lessonReducer(fb, { type: 'ANSWER', correct: false })).toBe(fb);
    expect(lessonReducer(fb, { type: 'SKIP' })).toBe(fb);
    const done = run([{ type: 'SKIP' }, { type: 'SKIP' }, { type: 'SKIP' }], ex);
    expect(lessonReducer(done, { type: 'CONTINUE' })).toBe(done);
  });

  it('lição sem exercícios vai direto ao resultado sem XP', () => {
    const empty = createLessonState({ xp: 10, exercises: [] });
    const s = lessonReducer(empty, { type: 'START' });
    expect(s.phase).toBe('result');
    expect(xpEarned(s)).toBe(0);
    expect(lessonProgress(empty)).toBe(0);
  });
});
