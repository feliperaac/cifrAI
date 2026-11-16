import { describe, expect, it } from 'vitest';
import { CHORD_CATALOG, ChordShapeSchema, chordDisplayName, getChord } from './index.js';

const EXPECTED: Record<string, [string, string]> = {
  em: ['Em', 'Mi menor'],
  am: ['Am', 'Lá menor'],
  e: ['E', 'Mi'],
  a: ['A', 'Lá'],
  d: ['D', 'Ré'],
  c: ['C', 'Dó'],
  g: ['G', 'Sol'],
  dm: ['Dm', 'Ré menor'],
  d7: ['D7', 'Ré com sétima'],
  g7: ['G7', 'Sol com sétima'],
};

describe('chordDisplayName', () => {
  it.each(Object.entries(EXPECTED))('%s', (id, [cifra, nomePt]) => {
    const chord = getChord(id);
    if (chord === undefined) throw new Error(id);
    expect(chordDisplayName(chord)).toEqual({ cifra, nomePt, rotulo: `${cifra} (${nomePt})` });
  });

  it('cobre exatamente os 10 acordes do catálogo', () => {
    expect(CHORD_CATALOG.map((c) => c.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('namePt formal do catálogo concorda com root/quality', () => {
    for (const chord of CHORD_CATALOG) {
      const display = chordDisplayName(chord).nomePt ?? '';
      const formal = chord.quality === 'major' ? `${display} maior` : display;
      expect(chord.namePt, chord.id).toBe(formal);
    }
  });

  it('acidentes e acorde sem dados estruturados', () => {
    expect(chordDisplayName({ name: 'F#m', root: 'F#', quality: 'minor' }).rotulo).toBe(
      'F#m (Fá sustenido menor)',
    );
    expect(chordDisplayName({ name: 'Bb', root: 'Bb', quality: 'major' }).rotulo).toBe(
      'Bb (Si bemol)',
    );
    expect(chordDisplayName({ name: 'X' })).toEqual({ cifra: 'X', nomePt: null, rotulo: 'X' });
  });

  it('schema exige root e quality juntos', () => {
    const { id, name, frets, fingers, baseFret } = CHORD_CATALOG[0];
    const parcial = { id, name, frets, fingers, baseFret, root: 'E' };
    expect(ChordShapeSchema.safeParse(parcial).success).toBe(false);
  });
});
