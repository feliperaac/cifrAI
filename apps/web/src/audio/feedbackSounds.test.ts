import { describe, expect, it } from 'vitest';
import { FEEDBACK_SPECS, synthesizeFeedback, type FeedbackKind } from './feedbackSounds';

const KINDS: FeedbackKind[] = ['correct', 'wrong', 'complete'];

/** Frequência de maior magnitude (DFT ingênua, passo de 2 Hz) numa janela [fromS, toS). */
function dominant(x: Float32Array, sr: number, fromS: number, toS: number): number {
  const seg = x.subarray(Math.floor(fromS * sr), Math.floor(toS * sr));
  let best = 0;
  let bestMag = -1;
  for (let f = 200; f <= 1400; f += 2) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < seg.length; i += 1) {
      const a = (2 * Math.PI * f * i) / sr;
      re += (seg[i] ?? 0) * Math.cos(a);
      im += (seg[i] ?? 0) * Math.sin(a);
    }
    const mag = re * re + im * im;
    if (mag > bestMag) {
      bestMag = mag;
      best = f;
    }
  }
  return best;
}

describe('sons de feedback (síntese)', () => {
  for (const sr of [44100, 48000]) {
    for (const kind of KINDS) {
      it(`${kind}: pico, duração, sem clique nas pontas (${sr} Hz)`, () => {
        const x = synthesizeFeedback(kind, sr);
        const spec = FEEDBACK_SPECS[kind];
        let peak = 0;
        let finite = true;
        for (const v of x) {
          finite &&= Number.isFinite(v);
          peak = Math.max(peak, Math.abs(v));
        }
        expect(finite).toBe(true);
        expect(peak).toBeCloseTo(spec.peak, 3);
        expect(peak).toBeLessThanOrEqual(0.3001);
        expect(x.length / sr).toBeLessThanOrEqual(spec.maxSeconds + 1e-6);
        expect(Math.abs(x[0] ?? 1)).toBeLessThan(0.005);
        expect(Math.abs(x[x.length - 1] ?? 1)).toBeLessThan(0.005);
        // Sem degraus: a maior diferença entre amostras vizinhas fica bem abaixo do pico.
        let step = 0;
        for (let i = 1; i < x.length; i += 1)
          step = Math.max(step, Math.abs((x[i] ?? 0) - (x[i - 1] ?? 0)));
        expect(step).toBeLessThan(peak * 0.35);
      });
    }
  }

  it('acerto: duas notas ascendentes (Dó5 depois Sol5)', () => {
    const sr = 44100;
    const x = synthesizeFeedback('correct', sr);
    const a = dominant(x, sr, 0.01, 0.09);
    const b = dominant(x, sr, 0.2, 0.3);
    expect(Math.abs(a - 523.25)).toBeLessThan(12);
    expect(Math.abs(b - 783.99)).toBeLessThan(12);
  });

  it('erro: nota única descendente, mais grave e mais baixa que o acerto', () => {
    const sr = 44100;
    const x = synthesizeFeedback('wrong', sr);
    const early = dominant(x, sr, 0.02, 0.1);
    const late = dominant(x, sr, 0.18, 0.28);
    expect(early).toBeGreaterThan(late);
    expect(early).toBeLessThan(380);
    expect(FEEDBACK_SPECS.wrong.peak).toBeLessThan(FEEDBACK_SPECS.correct.peak);
  });

  it('conclusão: arpejo ascendente terminando em Dó6', () => {
    const sr = 44100;
    const x = synthesizeFeedback('complete', sr);
    const notes = [0.01, 0.14, 0.27, 0.4].map((s) => dominant(x, sr, s, s + 0.08));
    for (let i = 1; i < notes.length; i += 1) expect(notes[i]).toBeGreaterThan(notes[i - 1] ?? 0);
    expect(Math.abs((notes[3] ?? 0) - 1046.5)).toBeLessThan(20);
  });
});
