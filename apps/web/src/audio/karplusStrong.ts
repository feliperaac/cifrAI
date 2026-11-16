/**
 * Síntese de corda dedilhada: Karplus-Strong estendido (Jaffe-Smith) como função pura.
 * Linha de atraso + filtro de perda (média de 2 pontos, escurece com o tempo) + all-pass
 * de atraso fracionário (afinação exata), excitação de ruído com pente de posição de
 * palheta e filtro de brilho, ressonâncias de corpo e envelope de entrada/saída.
 * Determinística: o ruído vem de um PRNG com semente.
 */

export interface StringVoice {
  /** Tempo (s) para a fundamental cair 60 dB. Graves sustentam mais, agudas menos. */
  t60: number;
  /** Média de 2 pontos no laço (0..0.5): amortece agudos a cada volta. Maior = mais escuro. */
  damping: number;
  /** Passa-baixa de 1 polo extra no laço (0..0.5): amortecimento adicional dos harmônicos agudos. */
  loopSmoothing: number;
  /** Posição do dedo/palheta ao longo da corda (fração, ~0.2 a 0.25 tira o brilho agudo). */
  pluckPosition: number;
  /** Suavização do ataque (0..0.95): ruído passado por passa-baixa de 1 polo. Maior = dedo/nylon; menor = palheta. */
  attackSoftness: number;
  /** Micro-desafinação fixa da corda em cents (tira a regularidade "sintética"). Manter |x| <= 2. */
  detuneCents: number;
}

export interface BodyResonance {
  hz: number;
  q: number;
  /** Ganho relativo da ressonância somada ao som seco. */
  gain: number;
}

/**
 * Configuração de timbre. Ajuste aqui depois de ouvir:
 * - mais "brilho": reduza `attackSoftness`/`loopSmoothing` (voices) e suba `outputLowpassHz`;
 * - mais "calor/corpo": suba `bodyMix` ou o `gain` das ressonâncias de 100/200/450 Hz;
 * - mais "plástico/metálico": suba `loopSmoothing` e/ou baixe `outputLowpassHz`.
 */
export interface SynthParams {
  duration: number;
  /** Nível final de pico (< 1). */
  peak: number;
  /** Fade-in curto (s) para evitar clique; ataque natural. */
  fadeIn: number;
  fadeOut: number;
  /** Estalo de unha/palheta (0..0.2). 0 = sem estalo. */
  pickNoise: number;
  body: readonly BodyResonance[];
  bodyMix: number;
  /** Passa-baixa suave (Butterworth 2ª ordem) na saída, em Hz; 0 desliga. */
  outputLowpassHz: number;
  seed: number;
}

/**
 * v2 (menos metálico). Valores da v1 para referência: damping .44 .42 .40 .36 .32 .30;
 * attackSoftness .55 .52 .50 .46 .42 .40; pluckPosition .17 .18 .18 .19 .20 .20;
 * t60 3.4 3.2 3.0 2.7 2.4 2.1; sem loopSmoothing, sem detune; pickNoise .05; fadeIn 1.5 ms;
 * corpo 98/205/1100 Hz (q 5/7/2, gain .5/.35/.12), bodyMix .6; sem passa-baixa de saída.
 */
export const STRING_VOICES: readonly StringVoice[] = [
  {
    t60: 3.4,
    damping: 0.42,
    loopSmoothing: 0.42,
    pluckPosition: 0.2,
    attackSoftness: 0.85,
    detuneCents: 1.2,
  },
  {
    t60: 3.2,
    damping: 0.4,
    loopSmoothing: 0.42,
    pluckPosition: 0.21,
    attackSoftness: 0.85,
    detuneCents: -1.0,
  },
  {
    t60: 2.9,
    damping: 0.38,
    loopSmoothing: 0.4,
    pluckPosition: 0.22,
    attackSoftness: 0.78,
    detuneCents: 0.8,
  },
  {
    t60: 2.6,
    damping: 0.36,
    loopSmoothing: 0.38,
    pluckPosition: 0.23,
    attackSoftness: 0.76,
    detuneCents: -1.5,
  },
  {
    t60: 2.3,
    damping: 0.34,
    loopSmoothing: 0.34,
    pluckPosition: 0.24,
    attackSoftness: 0.74,
    detuneCents: 1.0,
  },
  {
    t60: 2.0,
    damping: 0.32,
    loopSmoothing: 0.3,
    pluckPosition: 0.25,
    attackSoftness: 0.72,
    detuneCents: -0.7,
  },
];

export const DEFAULT_SYNTH: SynthParams = {
  duration: 3.4,
  peak: 0.85,
  fadeIn: 0.003,
  fadeOut: 0.12,
  pickNoise: 0,
  // Ar da caixa (~100 Hz), tampo (~200 Hz) e madeira (~450 Hz).
  body: [
    { hz: 100, q: 5, gain: 0.5 },
    { hz: 200, q: 7, gain: 0.4 },
    { hz: 450, q: 4, gain: 0.25 },
  ],
  bodyMix: 0.6,
  outputLowpassHz: 4000,
  seed: 1,
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Atraso de fase (amostras) de y = (1-a)x[n] + a x[n-1] na frequência angular w. */
function averagerDelay(a: number, w: number): number {
  return Math.atan2(a * Math.sin(w), 1 - a + a * Math.cos(w)) / w;
}

/** Atraso de fase (amostras) de y = (1-p)x + p y[n-1] em w. */
function onePoleDelay(p: number, w: number): number {
  return Math.atan2(p * Math.sin(w), 1 - p * Math.cos(w)) / w;
}

function lowpass(x: Float32Array, hz: number, sampleRate: number): Float32Array<ArrayBuffer> {
  const w0 = (2 * Math.PI * Math.min(hz, sampleRate * 0.45)) / sampleRate;
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const cos = Math.cos(w0);
  const a0 = 1 + alpha;
  const b0 = (1 - cos) / 2 / a0;
  const b1 = (1 - cos) / a0;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  const y = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    const xi = x[i] ?? 0;
    const yi = b0 * xi + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = xi;
    y2 = y1;
    y1 = yi;
    y[i] = yi;
  }
  return y;
}

/** Atraso de fase (amostras) do all-pass (C + z^-1)/(1 + C z^-1) em w. */
function allpassDelay(c: number, w: number): number {
  const re = c + Math.cos(w);
  const im = -Math.sin(w);
  const reD = 1 + c * Math.cos(w);
  const imD = -c * Math.sin(w);
  const phase = Math.atan2(im, re) - Math.atan2(imD, reD);
  let unwrapped = -phase;
  if (unwrapped < 0) unwrapped += 2 * Math.PI;
  return unwrapped / w;
}

function solveFractionalDelay(target: number, w: number): number {
  let d = target;
  for (let i = 0; i < 6; i += 1) {
    const c = (1 - d) / (1 + d);
    d += target - allpassDelay(c, w);
    d = Math.min(1.9, Math.max(0.1, d));
  }
  return d;
}

function peakOf(x: Float32Array): number {
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  return peak;
}

function bandpass(x: Float32Array, hz: number, q: number, sampleRate: number): Float32Array {
  const w0 = (2 * Math.PI * hz) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  const b0 = alpha / a0;
  const b2 = -alpha / a0;
  const a1 = (-2 * Math.cos(w0)) / a0;
  const a2 = (1 - alpha) / a0;
  const y = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    const xi = x[i] ?? 0;
    const yi = b0 * xi + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = xi;
    y2 = y1;
    y1 = yi;
    y[i] = yi;
  }
  return y;
}

export function synthesizePluck(
  frequency: number,
  sampleRate: number,
  voice: StringVoice,
  params: SynthParams = DEFAULT_SYNTH,
): Float32Array<ArrayBuffer> {
  if (!(frequency > 0) || !(sampleRate > 0)) throw new RangeError('frequência/taxa inválida');
  frequency *= 2 ** (voice.detuneCents / 1200);
  const total = Math.max(1, Math.floor(params.duration * sampleRate));
  const w = (2 * Math.PI * frequency) / sampleRate;
  const period = sampleRate / frequency;
  const a = voice.damping;

  const p = voice.loopSmoothing;
  const loopDelay = period - averagerDelay(a, w) - onePoleDelay(p, w);
  const length = Math.max(4, Math.round(loopDelay - 1));
  const frac = solveFractionalDelay(loopDelay - length, w);
  const apC = (1 - frac) / (1 + frac);

  const rng = mulberry32(params.seed * 7919 + Math.round(frequency * 100));
  const line = new Float32Array(length);
  let smooth = 0;
  for (let i = 0; i < length; i += 1) {
    smooth = smooth * voice.attackSoftness + (rng() * 2 - 1) * (1 - voice.attackSoftness);
    line[i] = smooth;
  }
  const comb = Math.max(1, Math.round(voice.pluckPosition * length));
  const shaped = new Float32Array(length);
  for (let i = 0; i < length; i += 1)
    shaped[i] = (line[i] ?? 0) - (i >= comb ? (line[i - comb] ?? 0) : 0);
  let mean = 0;
  for (const v of shaped) mean += v;
  mean /= length;
  for (let i = 0; i < length; i += 1) line[i] = (shaped[i] ?? 0) - mean;

  // Ganho por volta para o decaimento da fundamental atingir -60 dB em t60.
  const loopGain = 10 ** (-3 / (voice.t60 * frequency));

  const dry = new Float32Array(total);
  let idx = 0;
  let prevOut = 0;
  let poleOut = 0;
  let apIn = 0;
  let apOut = 0;
  for (let n = 0; n < total; n += 1) {
    const out = line[idx] ?? 0;
    dry[n] = out;
    const avg = (1 - a) * out + a * prevOut;
    prevOut = out;
    poleOut = (1 - p) * avg + p * poleOut;
    const lp = poleOut * loopGain;
    const ap = apC * lp + apIn - apC * apOut;
    apIn = lp;
    apOut = ap;
    line[idx] = ap;
    idx += 1;
    if (idx === length) idx = 0;
  }

  const dryPeak = peakOf(dry) || 1;
  const mixed = new Float32Array(total);
  for (let i = 0; i < total; i += 1) mixed[i] = (dry[i] ?? 0) / dryPeak;
  for (const res of params.body) {
    const filtered = bandpass(dry, res.hz, res.q, sampleRate);
    const scale = (params.bodyMix * res.gain) / dryPeak;
    for (let i = 0; i < total; i += 1) mixed[i] = (mixed[i] ?? 0) + (filtered[i] ?? 0) * scale;
  }

  const clickLength = Math.min(total, Math.floor(0.004 * sampleRate));
  for (let i = 0; i < clickLength; i += 1) {
    const env = 1 - i / clickLength;
    mixed[i] = (mixed[i] ?? 0) + (rng() * 2 - 1) * params.pickNoise * env * env;
  }

  const fadeInSamples = Math.max(1, Math.floor(params.fadeIn * sampleRate));
  const fadeOutSamples = Math.min(total, Math.max(1, Math.floor(params.fadeOut * sampleRate)));
  for (let i = 0; i < Math.min(fadeInSamples, total); i += 1) {
    mixed[i] = (mixed[i] ?? 0) * (i / fadeInSamples);
  }
  for (let i = 0; i < fadeOutSamples; i += 1) {
    mixed[total - 1 - i] = (mixed[total - 1 - i] ?? 0) * (i / fadeOutSamples);
  }

  const shapedOut =
    params.outputLowpassHz > 0 ? lowpass(mixed, params.outputLowpassHz, sampleRate) : mixed;
  const scale = params.peak / (peakOf(shapedOut) || 1);
  for (let i = 0; i < total; i += 1) shapedOut[i] = (shapedOut[i] ?? 0) * scale;
  return shapedOut;
}
