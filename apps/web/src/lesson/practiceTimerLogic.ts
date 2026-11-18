/**
 * Estado do timer de prática, puro e baseado em relógio de parede (`now` em ms): o fim é um
 * instante absoluto, então abas em segundo plano (timers estrangulados) não atrasam o término.
 */
export type TimerState =
  | { status: 'idle'; remainingMs: number }
  | { status: 'running'; remainingMs: number; endAt: number }
  | { status: 'paused'; remainingMs: number }
  | { status: 'finished'; remainingMs: 0 };

export type TimerAction =
  | { type: 'START'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'FINISH' };

export function createTimer(durationSeconds: number): TimerState {
  return { status: 'idle', remainingMs: durationSeconds * 1000 };
}

export function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START':
    case 'RESUME':
      if (state.status !== 'idle' && state.status !== 'paused') return state;
      return {
        status: 'running',
        remainingMs: state.remainingMs,
        endAt: action.now + state.remainingMs,
      };
    case 'PAUSE':
      if (state.status !== 'running') return state;
      return { status: 'paused', remainingMs: Math.max(0, state.endAt - action.now) };
    case 'TICK': {
      if (state.status !== 'running') return state;
      const remainingMs = state.endAt - action.now;
      return remainingMs <= 0
        ? { status: 'finished', remainingMs: 0 }
        : { status: 'running', remainingMs, endAt: state.endAt };
    }
    case 'FINISH':
      return { status: 'finished', remainingMs: 0 };
  }
}

export function formatClock(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
