import { CHORD_CATALOG } from '@cifrai/shared';
import { describe, expect, it } from 'vitest';
import { chordToNotes, STANDARD_TUNING_HZ } from './chordNotes';
import { STRING_VOICES, synthesizePluck } from './karplusStrong';
import { estimateFrequency, highBandRatio } from './testSignals';

const cents = (f: number, target: number) => 1200 * Math.log2(f / target);

describe('Karplus-Strong: correção do som', () => {
  const results: string[] = [];

  for (const sampleRate of [44100, 48000]) {
    it(`afinação < 5 cents em todas as notas do catálogo (${sampleRate} Hz)`, () => {
      for (const chord of CHORD_CATALOG) {
        let worst = 0;
        for (const note of chordToNotes(chord)) {
          const voice = STRING_VOICES[note.stringIndex];
          if (voice === undefined) throw new Error('voz');
          const buf = synthesizePluck(note.frequency, sampleRate, voice);
          const err = cents(estimateFrequency(buf, sampleRate), note.frequency);
          worst = Math.max(worst, Math.abs(err));
          expect(
            Math.abs(err),
            `${chord.id} corda ${note.stringNumber} casa ${note.fret}`,
          ).toBeLessThan(5);
        }
        results.push(`${sampleRate} ${chord.id} ${worst.toFixed(2)}`);
      }
      if (process.env['SHOW_CENTS']) console.log(results.join('\n'));
    });
  }

  it('sem clipping, normalizado, ataque imediato e decaimento aproximadamente monotônico', () => {
    const sr = 44100;
    for (const chord of CHORD_CATALOG) {
      for (const note of chordToNotes(chord)) {
        const voice = STRING_VOICES[note.stringIndex];
        if (voice === undefined) throw new Error('voz');
        const buf = synthesizePluck(note.frequency, sr, voice);
        let peak = 0;
        let finite = true;
        for (const v of buf) {
          finite &&= Number.isFinite(v);
          peak = Math.max(peak, Math.abs(v));
        }
        expect(finite).toBe(true);
        expect(peak).toBeLessThanOrEqual(0.9);
        expect(peak).toBeGreaterThan(0.8);

        const early = buf.subarray(0, Math.floor(0.02 * sr));
        expect(Math.max(...early.map(Math.abs))).toBeGreaterThan(0.1 * peak);
        expect(buf[buf.length - 1]).toBeCloseTo(0, 3);

        const win = Math.floor(0.1 * sr);
        const rms = (from: number) => {
          let s = 0;
          for (let i = from; i < from + win; i += 1) s += (buf[i] ?? 0) ** 2;
          return Math.sqrt(s / win);
        };
        const levels: number[] = [];
        for (let from = Math.floor(0.2 * sr); from + win < buf.length - 0.15 * sr; from += win) {
          levels.push(rms(from));
        }
        levels.forEach((level, i) => {
          if (i > 0) expect(level).toBeLessThanOrEqual((levels[i - 1] ?? 0) * 1.15);
        });
        expect(levels[levels.length - 1] ?? 1).toBeLessThan((levels[0] ?? 0) * 0.5);
      }
    }
  });

  it('timbre escuro: pouca energia acima de 3 kHz em todos os acordes', () => {
    const sr = 44100;
    const ratios: string[] = [];
    for (const chord of CHORD_CATALOG) {
      let worst = 0;
      for (const note of chordToNotes(chord)) {
        const voice = STRING_VOICES[note.stringIndex];
        if (voice === undefined) throw new Error('voz');
        worst = Math.max(worst, highBandRatio(synthesizePluck(note.frequency, sr, voice), sr));
      }
      ratios.push(`${chord.id} ${worst.toExponential(2)}`);
      expect(worst, chord.id).toBeLessThan(0.1);
    }
    if (process.env['SHOW_CENTS']) console.log(ratios.join('\n'));
  });

  it('é determinística e rejeita entrada inválida', () => {
    const v = STRING_VOICES[0];
    if (v === undefined) throw new Error('voz');
    const a = synthesizePluck(STANDARD_TUNING_HZ[0], 44100, v);
    const b = synthesizePluck(STANDARD_TUNING_HZ[0], 44100, v);
    expect(a).toEqual(b);
    expect(() => synthesizePluck(0, 44100, v)).toThrow(RangeError);
  });
});
