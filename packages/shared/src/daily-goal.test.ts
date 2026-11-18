import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DAILY_GOAL_XP,
  goalForDate,
  goalProgress,
  isDailyGoalOption,
  isGoalMet,
} from './daily-goal.js';
import {
  DAILY_GOAL_OPTIONS,
  DailyGoalSetEventSchema,
  ProgressEventSchema,
  SUPPORTED_EVENT_VERSIONS,
} from './events.js';

const goalEvent = (goalXp: number, clientTs: string, clientSeq = 1) => ({
  eventId: '3f2b8f4e-6a1c-4d7e-9b52-1c0e5a7d9f10',
  type: 'daily_goal.set' as const,
  schemaVersion: 1 as const,
  payload: { goalXp: goalXp as 10 },
  contentVersion: 'dev',
  deviceId: '0190f0a2-7b3c-7a11-8c22-3d4e5f607182',
  clientSeq,
  clientTs,
  clientTz: 'America/Rio_Branco',
});

describe('evento daily_goal.set', () => {
  it('aceita as 4 opções e entra no envelope', () => {
    for (const goalXp of DAILY_GOAL_OPTIONS) {
      expect(
        ProgressEventSchema.safeParse(goalEvent(goalXp, '2026-11-15T12:00:00.000Z')).success,
      ).toBe(true);
    }
    expect(SUPPORTED_EVENT_VERSIONS['daily_goal.set']).toEqual([1]);
  });

  it.each([
    ['meta fora das opções', { payload: { goalXp: 25 } }],
    ['meta zero', { payload: { goalXp: 0 } }],
    ['campo extra no payload (XP não é fato)', { payload: { goalXp: 20, xp: 5 } }],
    ['versão 2', { schemaVersion: 2 }],
    ['fuso inválido', { clientTz: 'Marte/Olympus' }],
  ])('rejeita %s', (_n, patch) => {
    const event = { ...goalEvent(20, '2026-11-15T12:00:00.000Z'), ...patch };
    expect(DailyGoalSetEventSchema.safeParse(event).success).toBe(false);
  });
});

describe('meta diária', () => {
  it('padrão é 20 e as opções são 10/20/30/50', () => {
    expect(DEFAULT_DAILY_GOAL_XP).toBe(20);
    expect([...DAILY_GOAL_OPTIONS]).toEqual([10, 20, 30, 50]);
    expect(isDailyGoalOption(30)).toBe(true);
    expect(isDailyGoalOption(25)).toBe(false);
  });

  it('meta atingida quando XP do dia >= meta', () => {
    expect(isGoalMet(19, 20)).toBe(false);
    expect(isGoalMet(20, 20)).toBe(true);
    expect(isGoalMet(35, 20)).toBe(true);
  });

  it('progresso limitado a 100% e com o que falta', () => {
    expect(goalProgress(5, 20)).toEqual({ pct: 25, met: false, remaining: 15 });
    expect(goalProgress(50, 20)).toEqual({ pct: 100, met: true, remaining: 0 });
  });

  it('sem eventos vale o padrão', () => {
    expect(goalForDate([], '2026-11-15')).toBe(20);
  });

  it('a meta vale a partir do dia do evento e não reescreve o passado', () => {
    const events = [goalEvent(50, '2026-11-15T12:00:00.000Z')];
    expect(goalForDate(events, '2026-11-14')).toBe(20);
    expect(goalForDate(events, '2026-11-15')).toBe(50);
    expect(goalForDate(events, '2026-11-20')).toBe(50);
  });

  it('o último evento vence, mesmo fora de ordem na entrada', () => {
    const events = [
      goalEvent(30, '2026-11-16T12:00:00.000Z', 2),
      goalEvent(10, '2026-11-15T12:00:00.000Z', 1),
    ];
    expect(goalForDate(events, '2026-11-15')).toBe(10);
    expect(goalForDate(events, '2026-11-16')).toBe(30);
  });

  it('localDate usa o clientTz do evento (22h em Rio Branco ainda é o mesmo dia)', () => {
    const events = [goalEvent(10, '2026-11-16T02:00:00.000Z')]; // 21h do dia 15 em UTC-5
    expect(goalForDate(events, '2026-11-15')).toBe(10);
  });
});
