import type { Lesson } from '@cifrai/content';

/**
 * Máquina de estados da lição (pura, sem React): intro → exercício → feedback → próximo → resultado.
 * "próximo" é a transição CONTINUE a partir do feedback. Erro não pune: não há vidas nem
 * repetição obrigatória; a resposta errada só muda o feedback.
 */
export type LessonPhase = 'intro' | 'exercise' | 'feedback' | 'result';

export interface LessonState {
  phase: LessonPhase;
  /** Índice do exercício atual (em `result`, igual a `total`). */
  index: number;
  total: number;
  /** XP da lição, vindo do conteúdo (`lesson.xp`); só é concedido em `result`. */
  lessonXp: number;
  /** Um item por exercício respondido, na ordem. */
  answers: boolean[];
  skipped: number;
}

export type LessonEvent =
  | { type: 'START' }
  | { type: 'ANSWER'; correct: boolean }
  | { type: 'CONTINUE' }
  /** Exercício de tipo ainda não suportado pela UI: avança sem feedback e sem pontuar. */
  | { type: 'SKIP' };

export function createLessonState(lesson: Pick<Lesson, 'xp' | 'exercises'>): LessonState {
  return {
    phase: 'intro',
    index: 0,
    total: lesson.exercises.length,
    lessonXp: lesson.xp,
    answers: [],
    skipped: 0,
  };
}

function advance(state: LessonState, patch: Partial<LessonState>): LessonState {
  const index = state.index + 1;
  return {
    ...state,
    ...patch,
    index,
    phase: index >= state.total ? 'result' : 'exercise',
  };
}

/** Eventos fora de ordem (ex.: ANSWER na intro) são ignorados e devolvem o mesmo estado. */
export function lessonReducer(state: LessonState, event: LessonEvent): LessonState {
  switch (event.type) {
    case 'START':
      if (state.phase !== 'intro') return state;
      return state.total === 0 ? { ...state, phase: 'result' } : { ...state, phase: 'exercise' };
    case 'ANSWER':
      if (state.phase !== 'exercise') return state;
      return { ...state, phase: 'feedback', answers: [...state.answers, event.correct] };
    case 'CONTINUE':
      if (state.phase !== 'feedback') return state;
      return advance(state, {});
    case 'SKIP':
      if (state.phase !== 'exercise') return state;
      return advance(state, { skipped: state.skipped + 1 });
  }
}

/** 0 a 100. Já conta o exercício respondido em `feedback`, para a barra reagir na hora. */
export function lessonProgress(state: LessonState): number {
  if (state.phase === 'result') return 100;
  if (state.total === 0) return 0;
  const done = state.phase === 'feedback' ? state.index + 1 : state.index;
  return Math.round((done / state.total) * 100);
}

export function correctCount(state: LessonState): number {
  return state.answers.filter(Boolean).length;
}

/**
 * XP ganho: a lição inteira vale `lesson.xp` (schema), independente de acertos (erro não pune).
 * Pendência: o schema não define XP por exercício, XP reduzido em repetição nem teto diário
 * (ADR-0002); o servidor é quem decide o XP final no sync.
 */
export function xpEarned(state: LessonState): number {
  return state.phase === 'result' && state.total > 0 ? state.lessonXp : 0;
}
