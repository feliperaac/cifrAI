/** Hash simples (FNV-1a) para derivar uma semente estável do ID do exercício. */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Permutação dos índices 0..n-1, estável para a mesma semente (a tela não "pula" ao remontar)
 * e nunca igual à identidade quando n >= 2 (a ordem certa não pode vir pronta).
 */
export function shuffledIndices(n: number, seed: string): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const random = mulberry32(hashSeed(seed));
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = order[i] as number;
    order[i] = order[j] as number;
    order[j] = a;
  }
  if (n >= 2 && order.every((value, i) => value === i)) order.push(order.shift() as number);
  return order;
}
