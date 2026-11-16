import type { ReactNode } from 'react';
import type { Exercise, MultipleChoiceExercise } from '@cifrai/content';
import { MultipleChoiceView } from './MultipleChoiceView';

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

/**
 * PONTO DE EXTENSÃO (F1-05): um `case` por tipo de exercício. Cada kit entrega a view, a avaliação
 * e a resposta certa. Tipos sem kit caem no fallback "ainda não suportado" do player.
 */
export function resolveExerciseKit(exercise: Exercise): ExerciseKit | null {
  switch (exercise.type) {
    case 'multiple_choice':
      return multipleChoiceKit(exercise);
    case 'match_pairs':
    case 'order':
    case 'build_chord':
    case 'practice_timer':
      return null;
  }
}
