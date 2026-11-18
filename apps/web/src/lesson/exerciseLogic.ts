import type { BuildChordExercise, MatchPairsExercise, OrderExercise } from '@cifrai/content';
import { STRING_COUNT, getChord } from '@cifrai/shared';

function isIntArray(value: unknown, length: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((item) => typeof item === 'number' && Number.isInteger(item))
  );
}

/** `response[i]` = índice (no conteúdo) do par da direita que o aluno ligou ao item `i` da esquerda; -1 = sem par. */
export function evaluateMatchPairs(exercise: MatchPairsExercise, response: unknown): boolean {
  return (
    isIntArray(response, exercise.pairs.length) && response.every((right, left) => right === left)
  );
}

export function matchPairsAnswerText(exercise: MatchPairsExercise): string {
  return exercise.pairs.map((pair) => `${pair.left} ↔ ${pair.right}`).join('; ');
}

/** `response` = índices (no conteúdo) dos itens, na ordem em que o aluno os deixou. */
export function evaluateOrder(exercise: OrderExercise, response: unknown): boolean {
  return isIntArray(response, exercise.items.length) && response.every((item, pos) => item === pos);
}

export function orderAnswerText(exercise: OrderExercise): string {
  return exercise.items.map((item, index) => `${index + 1}. ${item}`).join('; ');
}

/** `response` = 6 casas (6ª → 1ª corda): -1 muda, 0 solta, n casa apertada. Compara com o catálogo. */
export function evaluateBuildChord(exercise: BuildChordExercise, response: unknown): boolean {
  const shape = getChord(exercise.chordId);
  if (shape === undefined || !isIntArray(response, STRING_COUNT)) return false;
  return shape.frets.every((fret, index) => fret === response[index]);
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from < 0 || from >= items.length) return [...items];
  const copy = [...items];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved as T);
  return copy;
}
