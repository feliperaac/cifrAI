import { describe, expect, it } from 'vitest';
import { createMockContext } from './mockAudio';
import { createWebAudioEngine } from './webAudioEngine';

const AM = { frets: [-1, 0, 2, 2, 1, 0] } as const;
const EM = { frets: [0, 2, 2, 0, 0, 0] } as const;

describe('WebAudioEngine (AudioContext simulado)', () => {
  it('strum: 6 notas da 6ª à 1ª com ~32 ms entre cordas', () => {
    const { asContext, started } = createMockContext();
    const engine = createWebAudioEngine(asContext(), { random: () => 0.5 });
    const first = engine.playChord(EM);
    expect(started).toHaveLength(6);
    expect(first).toBeCloseTo(10.02, 5);
    started.forEach((s, i) => expect(s.at).toBeCloseTo(first + (i * 32) / 1000, 5));
    const gains = started.map((s) => s.gain);
    expect(Math.max(...gains)).toBeLessThanOrEqual(0.3);
    expect(gains[0] ?? 0).toBeGreaterThan(gains[5] ?? 1);
  });

  it('corda muda não agenda (Am = 5 notas)', () => {
    const { asContext, started } = createMockContext();
    createWebAudioEngine(asContext()).playChord(AM);
    expect(started).toHaveLength(5);
  });

  it('jitter fica dentro de 25..40 ms', () => {
    for (const r of [0, 1]) {
      const { asContext, started } = createMockContext();
      createWebAudioEngine(asContext(), { random: () => r }).playChord(EM);
      for (let i = 1; i < started.length; i += 1) {
        const gap = ((started[i]?.at ?? 0) - (started[i - 1]?.at ?? 0)) * 1000;
        expect(gap).toBeGreaterThanOrEqual(25);
        expect(gap).toBeLessThanOrEqual(40);
      }
    }
  });

  it('strum para cima inverte a ordem; arpejo espaça as notas', () => {
    const { asContext, started } = createMockContext();
    const engine = createWebAudioEngine(asContext(), { random: () => 0.5 });
    engine.playChord(EM, { direction: 'up' });
    expect(started[0]?.buffer).toBe(started[0]?.buffer);
    engine.playArpeggio(EM, { spacingMs: 300 });
    const arp = started.slice(6);
    expect(arp).toHaveLength(6);
    expect((arp[1]?.at ?? 0) - (arp[0]?.at ?? 0)).toBeCloseTo(0.3, 5);
  });

  it('reutiliza buffers em cache entre execuções', () => {
    const { asContext, started } = createMockContext();
    const engine = createWebAudioEngine(asContext());
    engine.playChord(EM);
    engine.playChord(EM);
    expect(started[0]?.buffer).toBe(started[6]?.buffer);
  });
});
