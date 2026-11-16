import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockContext } from './mockAudio';
import { AudioError, disposeAudio, playChordFromGesture } from './session';

const EM = { frets: [0, 2, 2, 0, 0, 0] } as const;

describe('session (gesto do usuário)', () => {
  beforeEach(() => disposeAudio());
  afterEach(() => {
    disposeAudio();
    vi.unstubAllGlobals();
  });

  it('sem Web Audio: erro "unsupported"', async () => {
    vi.stubGlobal('AudioContext', undefined);
    await expect(playChordFromGesture(EM)).rejects.toMatchObject({ reason: 'unsupported' });
  });

  it('cria o contexto só na chamada, retoma suspenso e toca', async () => {
    const mock = createMockContext('suspended');
    const Ctor = vi.fn(function () {
      return mock.ctx;
    });
    vi.stubGlobal('AudioContext', Ctor);
    expect(Ctor).not.toHaveBeenCalled();
    const promise = playChordFromGesture(EM);
    expect(Ctor).toHaveBeenCalledTimes(1);
    expect(mock.ctx.resumeCalls).toBe(1);
    await promise;
    expect(mock.started).toHaveLength(6);
  });

  it('contexto que não retoma: erro "suspended" e nada agendado', async () => {
    const mock = createMockContext('suspended');
    mock.ctx.resume = () => Promise.resolve();
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return mock.ctx;
      }),
    );
    const err = await playChordFromGesture(EM).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AudioError);
    expect((err as AudioError).reason).toBe('suspended');
    expect(mock.started).toHaveLength(0);
  });
});
