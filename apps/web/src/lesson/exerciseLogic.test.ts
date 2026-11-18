import { describe, expect, it } from 'vitest';
import type { BuildChordExercise, MatchPairsExercise, OrderExercise } from '@cifrai/content';
import {
  evaluateBuildChord,
  evaluateMatchPairs,
  evaluateOrder,
  matchPairsAnswerText,
  moveItem,
  orderAnswerText,
} from './exerciseLogic';
import { shuffledIndices } from './shuffle';

const base = { id: 'u99.l01.e01', prompt: 'p', explanation: 'e' };
const pairs: MatchPairsExercise = {
  ...base,
  type: 'match_pairs',
  pairs: [
    { left: 'Lá', right: 'A' },
    { left: 'Mi', right: 'E' },
  ],
};
const order: OrderExercise = { ...base, type: 'order', items: ['a', 'b', 'c'] };
const build: BuildChordExercise = { ...base, type: 'build_chord', chordId: 'em' };

describe('evaluateMatchPairs', () => {
  it('aceita só quando todo item está ligado ao seu par', () => {
    expect(evaluateMatchPairs(pairs, [0, 1])).toBe(true);
    expect(evaluateMatchPairs(pairs, [1, 0])).toBe(false);
    expect(evaluateMatchPairs(pairs, [0, -1])).toBe(false);
    expect(evaluateMatchPairs(pairs, [0])).toBe(false);
    expect(evaluateMatchPairs(pairs, 'x')).toBe(false);
  });
  it('texto da resposta lista os pares', () => {
    expect(matchPairsAnswerText(pairs)).toBe('Lá ↔ A; Mi ↔ E');
  });
});

describe('evaluateOrder', () => {
  it('compara com a ordem do conteúdo', () => {
    expect(evaluateOrder(order, [0, 1, 2])).toBe(true);
    expect(evaluateOrder(order, [1, 0, 2])).toBe(false);
    expect(evaluateOrder(order, [0, 1])).toBe(false);
    expect(evaluateOrder(order, null)).toBe(false);
    expect(orderAnswerText(order)).toBe('1. a; 2. b; 3. c');
  });
  it('moveItem move e respeita os limites', () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 2, 3)).toEqual([1, 2, 3]);
  });
});

describe('evaluateBuildChord', () => {
  it('valida contra o gabarito do catálogo (Em = 0 2 2 0 0 0)', () => {
    expect(evaluateBuildChord(build, [0, 2, 2, 0, 0, 0])).toBe(true);
    expect(evaluateBuildChord(build, [0, 2, 3, 0, 0, 0])).toBe(false);
    expect(evaluateBuildChord(build, [-1, 2, 2, 0, 0, 0])).toBe(false);
    expect(evaluateBuildChord(build, [0, 2, 2])).toBe(false);
    expect(evaluateBuildChord({ ...build, chordId: 'nao-existe' }, [0, 0, 0, 0, 0, 0])).toBe(false);
  });
});

describe('shuffledIndices', () => {
  it('é permutação estável e nunca a identidade', () => {
    for (let n = 2; n <= 8; n += 1) {
      for (const seed of ['a', 'u02.l03.e01', 'zz']) {
        const result = shuffledIndices(n, seed);
        expect([...result].sort((x, y) => x - y)).toEqual(Array.from({ length: n }, (_, i) => i));
        expect(result.every((v, i) => v === i)).toBe(false);
        expect(shuffledIndices(n, seed)).toEqual(result);
      }
    }
  });
});
