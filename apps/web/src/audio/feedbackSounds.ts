export type FeedbackKind = 'correct' | 'wrong' | 'complete';

export interface FeedbackSpec {
  /** Pico final (0..1): baixo de propósito, o feedback não deve competir com o acorde nem assustar. */
  peak: number;
  /** Duração total em segundos (limite duro do produto). */
  maxSeconds: number;
}

export const FEEDBACK_SPECS: Record<FeedbackKind, FeedbackSpec> = {
  correct: { peak: 0.3, maxSeconds: 0.4 },
  wrong: { peak: 0.22, maxSeconds: 0.3 },
  complete: { peak: 0.3, maxSeconds: 1.2 },
};

const ATTACK_S = 0.005;
const RELEASE_S = 0.03;

interface Note {
  startS: number;
  durS: number;
  /** Frequência inicial e final (glissando suave quando diferentes). */
  from: number;
  to?: number;
  /** Constante de tempo do decaimento exponencial. */
  tau: number;
  attackS?: number;
  /** [múltiplo do parcial, amplitude relativa]: marimba suave = fundamental + parcial 4 curto. */
  partials: readonly (readonly [number, number])[];
}

const MARIMBA: Note['partials'] = [
  [1, 1],
  [4, 0.18],
];

const NOTES: Record<FeedbackKind, readonly Note[]> = {
  // Dó5 -> Sol5 (quinta ascendente, alegre e aberta).
  correct: [
    { startS: 0, durS: 0.2, from: 523.25, tau: 0.08, partials: MARIMBA },
    { startS: 0.11, durS: 0.28, from: 783.99, tau: 0.1, partials: MARIMBA },
  ],
  // Fá4 -> Ré4 num único gesto, ataque lento e senoide pura: "ops" suave, sem buzzer.
  wrong: [
    {
      startS: 0,
      durS: 0.3,
      from: 349.23,
      to: 293.66,
      tau: 0.14,
      attackS: 0.015,
      partials: [
        [1, 1],
        [2, 0.12],
      ],
    },
  ],
  // Arpejo de Dó maior ascendente (Dó5 Mi5 Sol5 Dó6), a última nota ressoa.
  complete: [
    { startS: 0, durS: 0.3, from: 523.25, tau: 0.1, partials: MARIMBA },
    { startS: 0.13, durS: 0.3, from: 659.25, tau: 0.1, partials: MARIMBA },
    { startS: 0.26, durS: 0.3, from: 783.99, tau: 0.1, partials: MARIMBA },
    { startS: 0.39, durS: 0.78, from: 1046.5, tau: 0.22, partials: MARIMBA },
  ],
};

/** Síntese pura (sem AudioContext): testável medindo pico, duração e frequência. */
export function synthesizeFeedback(
  kind: FeedbackKind,
  sampleRate: number,
): Float32Array<ArrayBuffer> {
  const notes = NOTES[kind];
  const spec = FEEDBACK_SPECS[kind];
  const end = Math.max(...notes.map((n) => n.startS + n.durS));
  const out = new Float32Array(Math.ceil(end * sampleRate));
  for (const note of notes) {
    const first = Math.round(note.startS * sampleRate);
    const count = Math.round(note.durS * sampleRate);
    const attack = note.attackS ?? ATTACK_S;
    let phase = 0;
    for (let i = 0; i < count && first + i < out.length; i += 1) {
      const t = i / sampleRate;
      const progress = i / count;
      const freq = note.to === undefined ? note.from : note.from + (note.to - note.from) * progress;
      phase += (2 * Math.PI * freq) / sampleRate;
      let tone = 0;
      for (const [mult, amp] of note.partials) {
        // Parcial agudo some mais rápido: timbre de madeira, não de sino.
        tone += amp * Math.sin(phase * mult) * Math.exp((-t * (mult - 1)) / (note.tau * 2));
      }
      const rise = t < attack ? 0.5 - 0.5 * Math.cos((Math.PI * t) / attack) : 1;
      const left = note.durS - t;
      const fall = left < RELEASE_S ? 0.5 - 0.5 * Math.cos((Math.PI * left) / RELEASE_S) : 1;
      out[first + i] = (out[first + i] ?? 0) + tone * Math.exp(-t / note.tau) * rise * fall;
    }
  }
  let max = 0;
  for (const v of out) max = Math.max(max, Math.abs(v));
  const scale = max === 0 ? 0 : spec.peak / max;
  for (let i = 0; i < out.length; i += 1) out[i] = (out[i] ?? 0) * scale;
  return out;
}

const cache = new WeakMap<AudioContext, Map<FeedbackKind, AudioBuffer>>();

export function playFeedbackSound(ctx: AudioContext, kind: FeedbackKind): void {
  let perCtx = cache.get(ctx);
  if (perCtx === undefined) {
    perCtx = new Map();
    cache.set(ctx, perCtx);
  }
  let buffer = perCtx.get(kind);
  if (buffer === undefined) {
    const samples = synthesizeFeedback(kind, ctx.sampleRate);
    buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    perCtx.set(kind, buffer);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.onended = () => source.disconnect();
  source.start(ctx.currentTime + 0.005);
}
