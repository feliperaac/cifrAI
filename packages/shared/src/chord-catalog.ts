import type { ChordShape } from './chord.js';

/**
 * Catálogo inicial (afinação padrão E A D G B E; cordas da 6ª para a 1ª).
 * Dados puros: nenhuma importação de runtime do Zod, para o front não carregar o Zod.
 * A validação contra `ChordShapeSchema` roda nos testes e no `content:validate`.
 */
export const CHORD_CATALOG = [
  // U4
  {
    id: 'em',
    name: 'Em',
    namePt: 'Mi menor',
    root: 'E',
    quality: 'minor',
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    baseFret: 1,
  },
  {
    id: 'am',
    name: 'Am',
    namePt: 'Lá menor',
    root: 'A',
    quality: 'minor',
    frets: [-1, 0, 2, 2, 1, 0],
    fingers: [0, 0, 2, 3, 1, 0],
    baseFret: 1,
  },
  {
    id: 'e',
    name: 'E',
    namePt: 'Mi maior',
    root: 'E',
    quality: 'major',
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0],
    baseFret: 1,
  },
  {
    id: 'a',
    name: 'A',
    namePt: 'Lá maior',
    root: 'A',
    quality: 'major',
    frets: [-1, 0, 2, 2, 2, 0],
    fingers: [0, 0, 1, 2, 3, 0],
    baseFret: 1,
  },
  {
    id: 'd',
    name: 'D',
    namePt: 'Ré maior',
    root: 'D',
    quality: 'major',
    frets: [-1, -1, 0, 2, 3, 2],
    fingers: [0, 0, 0, 1, 3, 2],
    baseFret: 1,
  },
  // U7
  {
    id: 'c',
    name: 'C',
    namePt: 'Dó maior',
    root: 'C',
    quality: 'major',
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [0, 3, 2, 0, 1, 0],
    baseFret: 1,
  },
  {
    id: 'g',
    name: 'G',
    namePt: 'Sol maior',
    root: 'G',
    quality: 'major',
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, 0, 0, 0, 3],
    baseFret: 1,
  },
  {
    id: 'dm',
    name: 'Dm',
    namePt: 'Ré menor',
    root: 'D',
    quality: 'minor',
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [0, 0, 0, 2, 3, 1],
    baseFret: 1,
  },
  {
    id: 'd7',
    name: 'D7',
    namePt: 'Ré com sétima',
    root: 'D',
    quality: 'dominant7',
    frets: [-1, -1, 0, 2, 1, 2],
    fingers: [0, 0, 0, 2, 1, 3],
    baseFret: 1,
  },
  {
    id: 'g7',
    name: 'G7',
    namePt: 'Sol com sétima',
    root: 'G',
    quality: 'dominant7',
    frets: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, 0, 0, 0, 1],
    baseFret: 1,
  },
] as const satisfies readonly ChordShape[];

export type CatalogChordId = (typeof CHORD_CATALOG)[number]['id'];

export const chordIds: readonly CatalogChordId[] = CHORD_CATALOG.map((chord) => chord.id);

const byId: ReadonlyMap<string, ChordShape> = new Map(
  CHORD_CATALOG.map((chord) => [chord.id, chord]),
);

export function hasChord(id: string): id is CatalogChordId {
  return byId.has(id);
}

export function getChord(id: string): ChordShape | undefined {
  return byId.get(id);
}
