import type { ReactNode } from 'react';
import type {
  BuildChordExercise,
  Exercise,
  MatchPairsExercise,
  MultipleChoiceExercise,
  OrderExercise,
  PracticeTimerExercise,
} from '@cifrai/content';
import { chordDisplayName, getChord } from '@cifrai/shared';
import { t } from '../i18n';
import { BuildChordView } from './BuildChordView';
import {
  evaluateBuildChord,
  evaluateMatchPairs,
  evaluateOrder,
  matchPairsAnswerText,
  orderAnswerText,
} from './exerciseLogic';
import { MatchPairsView } from './MatchPairsView';
import { MultipleChoiceView } from './MultipleChoiceView';
import { OrderView } from './OrderView';
import { PracticeTimerView, type SelfAssessment } from './PracticeTimerView';

export interface ExerciseRenderState {
  response: unknown;
  /** Verdadeiro depois de verificar: o exercício não aceita mais mudança. */
  locked: boolean;
  onRespond: (response: unknown) => void;
}

export interface ExerciseKit {
  render: (state: ExerciseRenderState) => ReactNode;
  /** Falso/verdadeiro para a resposta atual; só chamado quando `response` não é nulo. */
  evaluate: (response: unknown) => boolean;
  /** Texto da resposta certa, para o feedback de erro. */
  correctAnswerText: () => string;
  /** Título do feedback quando o padrão ("Certo!"/"Quase lá!") não serve (ex.: auto-avaliação). */
  feedbackTitle?: (response: unknown) => string | null;
}

/** Contexto da lição que alguns tipos precisam (ex.: aviso de segurança no timer). */
export interface ExerciseContext {
  safetyNotice?: string | undefined;
}

export function evaluateMultipleChoice(
  exercise: MultipleChoiceExercise,
  optionId: string,
): boolean {
  return optionId === exercise.correctOptionId;
}

function multipleChoiceKit(exercise: MultipleChoiceExercise): ExerciseKit {
  return {
    render: ({ response, locked, onRespond }) => (
      <MultipleChoiceView
        exercise={exercise}
        selectedId={typeof response === 'string' ? response : null}
        correctId={locked ? exercise.correctOptionId : null}
        locked={locked}
        onSelect={onRespond}
      />
    ),
    evaluate: (response) =>
      typeof response === 'string' && evaluateMultipleChoice(exercise, response),
    correctAnswerText: () =>
      exercise.options.find((option) => option.id === exercise.correctOptionId)?.text ?? '',
  };
}

function matchPairsKit(exercise: MatchPairsExercise): ExerciseKit {
  return {
    render: ({ locked, onRespond }) => (
      <MatchPairsView key={exercise.id} exercise={exercise} locked={locked} onRespond={onRespond} />
    ),
    evaluate: (response) => evaluateMatchPairs(exercise, response),
    correctAnswerText: () => matchPairsAnswerText(exercise),
  };
}

function orderKit(exercise: OrderExercise): ExerciseKit {
  return {
    render: ({ locked, onRespond }) => (
      <OrderView key={exercise.id} exercise={exercise} locked={locked} onRespond={onRespond} />
    ),
    evaluate: (response) => evaluateOrder(exercise, response),
    correctAnswerText: () => orderAnswerText(exercise),
  };
}

function buildChordKit(exercise: BuildChordExercise): ExerciseKit {
  return {
    render: ({ response, locked, onRespond }) => (
      <BuildChordView
        key={exercise.id}
        exercise={exercise}
        frets={Array.isArray(response) ? (response as number[]) : null}
        locked={locked}
        correct={locked && evaluateBuildChord(exercise, response)}
        onRespond={onRespond}
      />
    ),
    evaluate: (response) => evaluateBuildChord(exercise, response),
    correctAnswerText: () => {
      const shape = getChord(exercise.chordId);
      return shape === undefined ? '' : chordDisplayName(shape).rotulo;
    },
  };
}

/** Auto-avaliação: terminar a prática conta como feita; "preciso treinar mais" não é erro nem pune. */
function practiceTimerKit(exercise: PracticeTimerExercise, context: ExerciseContext): ExerciseKit {
  return {
    render: ({ response, locked, onRespond }) => (
      <PracticeTimerView
        key={exercise.id}
        exercise={exercise}
        safetyNotice={context.safetyNotice}
        assessment={response === 'done' || response === 'more' ? response : null}
        locked={locked}
        onRespond={onRespond as (value: SelfAssessment) => void}
      />
    ),
    evaluate: () => true,
    correctAnswerText: () => '',
    feedbackTitle: (response) =>
      t(response === 'more' ? 'lesson.timer.feedback.more' : 'lesson.timer.feedback.done'),
  };
}

/**
 * PONTO DE EXTENSÃO: um `case` por tipo de exercício. Cada kit entrega a view, a avaliação
 * e a resposta certa. Tipo desconhecido devolve `null` e cai no fallback do player.
 */
export function resolveExerciseKit(
  exercise: Exercise,
  context: ExerciseContext = {},
): ExerciseKit | null {
  switch (exercise.type) {
    case 'multiple_choice':
      return multipleChoiceKit(exercise);
    case 'match_pairs':
      return matchPairsKit(exercise);
    case 'order':
      return orderKit(exercise);
    case 'build_chord':
      return buildChordKit(exercise);
    case 'practice_timer':
      return practiceTimerKit(exercise, context);
    default:
      return null;
  }
}
