import type { ChordQuality, ChordRoot, ChordShape } from './chord.js';

export interface ChordDisplayName {
  /** Cifra como aparece no diagrama (ex.: Am). */
  cifra: string;
  /** Nome por extenso em pt-BR; maior mostra só a nota (ex.: Lá menor, Ré com sétima). */
  nomePt: string | null;
  /** Cifra e nome juntos (ex.: "Am (Lá menor)"); só a cifra se o acorde não tiver `root`/`quality`. */
  rotulo: string;
}

const NOTE_PT: Record<string, string> = {
  C: 'Dó',
  D: 'Ré',
  E: 'Mi',
  F: 'Fá',
  G: 'Sol',
  A: 'Lá',
  B: 'Si',
};

const ACCIDENTAL_PT: Record<string, string> = { '#': ' sustenido', b: ' bemol' };

const QUALITY_SUFFIX_PT: Record<ChordQuality, string> = {
  major: '',
  minor: ' menor',
  dominant7: ' com sétima',
};

export function rootNamePt(root: ChordRoot): string {
  const letter = root.charAt(0);
  const accidental = root.charAt(1);
  return `${NOTE_PT[letter] ?? letter}${ACCIDENTAL_PT[accidental] ?? ''}`;
}

/** Fonte única do nome por extenso (legenda do diagrama, aria-label, quizzes). */
export function chordDisplayName(
  chord: Pick<ChordShape, 'name' | 'root' | 'quality'>,
): ChordDisplayName {
  const { name: cifra, root, quality } = chord;
  if (root === undefined || quality === undefined) return { cifra, nomePt: null, rotulo: cifra };
  const nomePt = `${rootNamePt(root)}${QUALITY_SUFFIX_PT[quality]}`;
  return { cifra, nomePt, rotulo: `${cifra} (${nomePt})` };
}
