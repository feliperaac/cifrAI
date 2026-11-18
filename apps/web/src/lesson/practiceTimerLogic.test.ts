import { describe, expect, it } from 'vitest';
import { createTimer, formatClock, timerReducer } from './practiceTimerLogic';

describe('timerReducer', () => {
  it('termina pelo relógio de parede, mesmo com poucos ticks (aba em segundo plano)', () => {
    let s = timerReducer(createTimer(30), { type: 'START', now: 1000 });
    expect(s).toMatchObject({ status: 'running', endAt: 31_000 });
    s = timerReducer(s, { type: 'TICK', now: 11_000 });
    expect(s.remainingMs).toBe(20_000);
    s = timerReducer(s, { type: 'TICK', now: 120_000 });
    expect(s.status).toBe('finished');
  });
  it('pausa guarda o restante e retomar recalcula o fim', () => {
    let s = timerReducer(createTimer(30), { type: 'START', now: 0 });
    s = timerReducer(s, { type: 'PAUSE', now: 10_000 });
    expect(s).toEqual({ status: 'paused', remainingMs: 20_000 });
    s = timerReducer(s, { type: 'TICK', now: 500_000 });
    expect(s.status).toBe('paused');
    s = timerReducer(s, { type: 'RESUME', now: 100_000 });
    expect(s).toMatchObject({ status: 'running', endAt: 120_000 });
  });
  it('FINISH encerra e ações inválidas são ignoradas', () => {
    const idle = createTimer(10);
    expect(timerReducer(idle, { type: 'PAUSE', now: 0 })).toBe(idle);
    expect(timerReducer(idle, { type: 'FINISH' }).status).toBe('finished');
  });
  it('formatClock arredonda para cima', () => {
    expect(formatClock(30_000)).toBe('00:30');
    expect(formatClock(29_001)).toBe('00:30');
    expect(formatClock(125_000)).toBe('02:05');
    expect(formatClock(0)).toBe('00:00');
  });
});
