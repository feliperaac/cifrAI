import { describe, expect, it } from 'vitest';
import { CHORD_CATALOG, ChordShapeSchema, chordIds, getChord, hasChord } from './index.js';

const base = {
  id: 'f',
  name: 'F',
  frets: [1, 3, 3, 2, 1, 1],
  fingers: [1, 3, 4, 2, 1, 1],
  barre: { fret: 1, fromString: 6, toString: 1, finger: 1 },
  baseFret: 1,
};

const issues = (patch: Record<string, unknown>): string[] => {
  const result = ChordShapeSchema.safeParse({ ...base, ...patch });
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe('catálogo de acordes', () => {
  it('tem os 10 acordes de F2 e todos passam no schema', () => {
    expect(chordIds).toEqual(['em', 'am', 'e', 'a', 'd', 'c', 'g', 'dm', 'd7', 'g7']);
    for (const chord of CHORD_CATALOG) {
      expect(ChordShapeSchema.safeParse(chord).success, chord.id).toBe(true);
    }
  });
  it('lookup', () => {
    expect(getChord('am')?.namePt).toBe('Lá menor');
    expect(getChord('zz')).toBeUndefined();
    expect(hasChord('g7')).toBe(true);
    expect(hasChord('F')).toBe(false);
  });
  it('digitações conferidas (notas soando em afinação padrão)', () => {
    const open = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4 em semitons MIDI
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const sounding = (id: string): string[] =>
      (getChord(id)?.frets ?? []).flatMap((fret, i) =>
        fret < 0 ? [] : [names[((open[i] ?? 0) + fret) % 12] ?? ''],
      );
    const pitchClasses = (id: string) => [...new Set(sounding(id))].sort();
    expect(pitchClasses('em')).toEqual(['B', 'E', 'G']);
    expect(pitchClasses('am')).toEqual(['A', 'C', 'E']);
    expect(pitchClasses('e')).toEqual(['B', 'E', 'G#']);
    expect(pitchClasses('a')).toEqual(['A', 'C#', 'E']);
    expect(pitchClasses('d')).toEqual(['A', 'D', 'F#']);
    expect(pitchClasses('c')).toEqual(['C', 'E', 'G']);
    expect(pitchClasses('g')).toEqual(['B', 'D', 'G']);
    expect(pitchClasses('dm')).toEqual(['A', 'D', 'F']);
    expect(pitchClasses('d7')).toEqual(['A', 'C', 'D', 'F#']);
    expect(pitchClasses('g7')).toEqual(['B', 'D', 'F', 'G']);
    expect(sounding('em')[0]).toBe('E');
    expect(sounding('a')[0]).toBe('A');
    expect(sounding('d')[0]).toBe('D');
    expect(sounding('c')[0]).toBe('C');
    expect(sounding('g')[0]).toBe('G');
  });
});

describe('ChordShapeSchema', () => {
  it('aceita pestana em posição baixa', () => {
    expect(issues({})).toEqual([]);
  });
  it('aceita pestana em posição alta', () => {
    expect(
      issues({
        id: 'bm',
        frets: [-1, 2, 4, 4, 3, 2],
        fingers: [0, 1, 3, 4, 2, 1],
        barre: { fret: 2, fromString: 5, toString: 1, finger: 1 },
        baseFret: 2,
      }),
    ).toEqual([]);
  });
  it('rejeita id fora do padrão', () => {
    expect(issues({ id: 'Em Maior' }).length).toBeGreaterThan(0);
  });
  it('rejeita número de cordas errado', () => {
    expect(issues({ frets: [0, 0, 0, 0, 0], fingers: [0, 0, 0, 0, 0] }).length).toBeGreaterThan(0);
  });
  it('rejeita casa fora do intervalo', () => {
    expect(issues({ frets: [13, 3, 3, 2, 1, 1], baseFret: 1 }).length).toBeGreaterThan(0);
    expect(issues({ frets: [-2, 3, 3, 2, 1, 1] }).length).toBeGreaterThan(0);
  });
  it('rejeita dedo em corda solta ou muda e dedo ausente em casa', () => {
    const solo = { barre: undefined, frets: [0, 2, 2, 0, 0, 0] };
    expect(issues({ ...solo, fingers: [1, 2, 3, 0, 0, 0] }).join()).toContain('não pode ter dedo');
    expect(issues({ ...solo, fingers: [0, 0, 3, 0, 0, 0] }).join()).toContain('precisa de dedo');
  });
  it('rejeita dedo fora de 1-4', () => {
    expect(
      issues({ barre: undefined, frets: [0, 2, 2, 0, 0, 0], fingers: [0, 5, 3, 0, 0, 0] }).length,
    ).toBeGreaterThan(0);
  });
  it('rejeita mesmo dedo em duas casas ou em várias cordas sem pestana', () => {
    const solo = { barre: undefined, frets: [0, 2, 3, 0, 0, 0] };
    expect(issues({ ...solo, fingers: [0, 2, 2, 0, 0, 0] }).join()).toContain('duas casas');
    const dois = { barre: undefined, frets: [0, 2, 2, 0, 0, 0] };
    expect(issues({ ...dois, fingers: [0, 2, 2, 0, 0, 0] }).join()).toContain('pestana');
  });
  it('rejeita pestana inconsistente', () => {
    expect(issues({ barre: { ...base.barre, fromString: 1, toString: 6 } }).join()).toContain(
      'fromString > toString',
    );
    expect(issues({ barre: { ...base.barre, fret: 2 } }).length).toBeGreaterThan(0);
    expect(issues({ barre: { ...base.barre, finger: 2 } }).length).toBeGreaterThan(0);
    expect(issues({ frets: [1, 3, 3, 2, 0, 1], fingers: [1, 3, 4, 2, 0, 1] }).join()).toContain(
      'abaixo',
    );
  });
  it('rejeita baseFret incoerente', () => {
    expect(
      issues({
        barre: undefined,
        frets: [-1, 5, 5, 0, 0, 0],
        fingers: [0, 1, 2, 0, 0, 0],
        baseFret: 3,
      }).join(),
    ).toContain('menor casa');
    expect(issues({ frets: [1, 3, 3, 2, 1, 1], baseFret: 1 }).length).toBe(0);
    expect(issues({ frets: [1, 7, 3, 2, 1, 1], fingers: [1, 4, 3, 2, 1, 1] }).join()).toContain(
      'caber',
    );
  });
  it('rejeita campos desconhecidos', () => {
    expect(issues({ extra: 1 }).length).toBeGreaterThan(0);
  });
});
