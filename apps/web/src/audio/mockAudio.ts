export interface Started {
  at: number;
  buffer: unknown;
  gain: number;
}

export function createMockContext(initial: 'running' | 'suspended' = 'running') {
  const started: Started[] = [];
  const ctx = {
    state: initial as AudioContextState,
    currentTime: 10,
    sampleRate: 44100,
    destination: {},
    resume: () => {
      ctx.state = 'running';
      ctx.resumeCalls += 1;
      return Promise.resolve();
    },
    resumeCalls: 0,
    close: () => {
      ctx.state = 'closed';
      return Promise.resolve();
    },
    createBuffer: (_c: number, length: number) => ({
      length,
      copyToChannel: () => undefined,
    }),
    createGain: () => ({
      gain: {
        value: 1,
        cancelScheduledValues: () => undefined,
        setValueAtTime: () => undefined,
        linearRampToValueAtTime: () => undefined,
      },
      connect: () => undefined,
      disconnect: () => undefined,
    }),
    createDynamicsCompressor: () => ({
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      connect: () => undefined,
      disconnect: () => undefined,
    }),
    createBufferSource: () => {
      const node = {
        buffer: null as unknown,
        onended: null as (() => void) | null,
        connectedGain: 1,
        connect: (g: { gain: { value: number } }) => {
          node.connectedGain = g.gain.value;
        },
        disconnect: () => undefined,
        start: (at: number) => {
          started.push({ at, buffer: node.buffer, gain: node.connectedGain });
        },
        stop: () => undefined,
      };
      return node;
    },
  };
  return { ctx, started, asContext: () => ctx as unknown as AudioContext };
}
