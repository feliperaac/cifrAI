/** Autocorrelação normalizada com refino no k-ésimo período e interpolação parabólica. */
export function estimateFrequency(x: Float32Array, sampleRate: number): number {
  const start = Math.floor(0.12 * sampleRate);
  const len = Math.floor(0.4 * sampleRate);
  const minLag = Math.floor(sampleRate / 700);
  const maxLag = Math.floor(sampleRate / 60);
  const seg = x.subarray(start, start + len + maxLag * 10);
  const corr = (lag: number): number => {
    let num = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i < len; i += 1) {
      const a = seg[i] ?? 0;
      const b = seg[i + lag] ?? 0;
      num += a * b;
      e1 += a * a;
      e2 += b * b;
    }
    return num / Math.sqrt(e1 * e2 || 1);
  };
  const values: number[] = [];
  for (let lag = minLag; lag <= maxLag; lag += 1) values.push(corr(lag));
  const best = Math.max(...values);
  let first = 0;
  for (let i = 1; i < values.length - 1; i += 1) {
    const v = values[i] ?? 0;
    if (v > 0.8 * best && v >= (values[i - 1] ?? 0) && v >= (values[i + 1] ?? 0)) {
      first = i + minLag;
      break;
    }
  }
  const refine = (lag: number): number => {
    const y0 = corr(lag - 1);
    const y1 = corr(lag);
    const y2 = corr(lag + 1);
    const denom = y0 - 2 * y1 + y2;
    return lag + (denom === 0 ? 0 : (0.5 * (y0 - y2)) / denom);
  };
  const coarse = refine(first);
  const k = Math.max(1, Math.floor((0.1 * sampleRate) / coarse));
  const fine = refine(Math.round(coarse * k));
  return (sampleRate * k) / fine;
}

/** Energia acima de `cutoff` Hz / energia total (passa-alta Butterworth de 4ª ordem sobre o 1º segundo). */
export function highBandRatio(x: Float32Array, sampleRate: number, cutoff = 3000): number {
  const seg = x.subarray(0, sampleRate);
  const w0 = (2 * Math.PI * cutoff) / sampleRate;
  const cos = Math.cos(w0);
  let y: Float32Array = seg;
  for (const q of [0.5412, 1.3066]) {
    const alpha = Math.sin(w0) / (2 * q);
    const a0 = 1 + alpha;
    const b0 = (1 + cos) / 2 / a0;
    const b1 = -(1 + cos) / a0;
    const a1 = (-2 * cos) / a0;
    const a2 = (1 - alpha) / a0;
    const out = new Float32Array(y.length);
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < y.length; i += 1) {
      const xi = y[i] ?? 0;
      const yi = b0 * xi + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = xi;
      y2 = y1;
      y1 = yi;
      out[i] = yi;
    }
    y = out;
  }
  let hi = 0;
  let total = 0;
  for (let i = 0; i < seg.length; i += 1) {
    hi += (y[i] ?? 0) ** 2;
    total += (seg[i] ?? 0) ** 2;
  }
  return hi / (total || 1);
}
