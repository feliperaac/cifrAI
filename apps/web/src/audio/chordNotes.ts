import { STRING_COUNT } from '@cifrai/shared';

/** Afinação padrão (A4 = 440 Hz), da 6ª para a 1ª corda: E2 A2 D3 G3 B3 E4. */
export const STANDARD_TUNING_HZ = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63] as const;

export interface ChordFrets {
  readonly frets: readonly number[];
}

export interface ChordNote {
  /** 0 = 6ª corda (grave) ... 5 = 1ª corda (aguda). */
  stringIndex: number;
  /** Numeração do violão: 6 = Mi grave ... 1 = Mi agudo. */
  stringNumber: number;
  /** Casa absoluta (0 = solta). */
  fret: number;
  frequency: number;
}

export function fretFrequency(openHz: number, fret: number): number {
  return openHz * 2 ** (fret / 12);
}

/** Notas que soam, na ordem 6ª -> 1ª. Corda muda (-1) é omitida. `frets` são casas absolutas. */
export function chordToNotes(
  chord: ChordFrets,
  tuning: readonly number[] = STANDARD_TUNING_HZ,
): ChordNote[] {
  const notes: ChordNote[] = [];
  chord.frets.forEach((fret, stringIndex) => {
    const open = tuning[stringIndex];
    if (open === undefined || !Number.isInteger(fret) || fret < 0) return;
    notes.push({
      stringIndex,
      stringNumber: STRING_COUNT - stringIndex,
      fret,
      frequency: fretFrequency(open, fret),
    });
  });
  return notes;
}
