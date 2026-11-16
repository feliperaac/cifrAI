import { CHORD_CATALOG, getChord } from '@cifrai/shared';
import { describe, expect, it } from 'vitest';
import { chordToNotes } from './chordNotes';

const hz = (id: string) => chordToNotes(getChord(id) ?? { frets: [] }).map((n) => n.frequency);

describe('chordToNotes', () => {
  it('Am (x02210): omite a 6ª muda e calcula as casas absolutas', () => {
    const notes = chordToNotes({ frets: [-1, 0, 2, 2, 1, 0] });
    expect(notes.map((n) => n.stringNumber)).toEqual([5, 4, 3, 2, 1]);
    const f = notes.map((n) => n.frequency);
    expect(f[0]).toBeCloseTo(110.0, 2); // A2
    expect(f[1]).toBeCloseTo(164.81, 1); // E3
    expect(f[2]).toBeCloseTo(220.0, 1); // A3
    expect(f[3]).toBeCloseTo(261.63, 1); // C4
    expect(f[4]).toBeCloseTo(329.63, 2); // E4
  });
  it('Em: seis cordas, ordem 6ª -> 1ª', () => {
    expect(chordToNotes({ frets: [0, 2, 2, 0, 0, 0] }).map((n) => n.stringNumber)).toEqual([
      6, 5, 4, 3, 2, 1,
    ]);
    expect(hz('em')[1]).toBeCloseTo(123.47, 1);
  });
  it('G: casa 3 na 6ª = G2 (98 Hz)', () => {
    expect(hz('g')[0]).toBeCloseTo(98.0, 0);
  });
  it('todo acorde do catálogo gera só notas audíveis e crescentes por corda', () => {
    for (const chord of CHORD_CATALOG) {
      const notes = chordToNotes(chord);
      expect(notes.length).toBeGreaterThanOrEqual(4);
      for (const n of notes) expect(n.frequency).toBeGreaterThan(80);
    }
  });
  it('ignora casas inválidas', () => {
    expect(chordToNotes({ frets: [-1, -1, -1, -1, -1, -1] })).toEqual([]);
    expect(
      chordToNotes({ frets: [1.5, 0, 0, 0, 0, 0] as unknown as readonly number[] } as never),
    ).toHaveLength(5);
  });
});
