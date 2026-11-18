import { DAILY_GOAL_OPTIONS, localDateOf, type DailyGoalSetEvent } from './events.js';

export const DEFAULT_DAILY_GOAL_XP = 20;

export function isDailyGoalOption(value: number): boolean {
  return (DAILY_GOAL_OPTIONS as readonly number[]).includes(value);
}

/** Meta atingida no dia = XP do dia >= meta. */
export function isGoalMet(xp: number, goalXp: number): boolean {
  return goalXp > 0 && xp >= goalXp;
}

export interface GoalProgress {
  pct: number;
  met: boolean;
  remaining: number;
}

export function goalProgress(xp: number, goalXp: number): GoalProgress {
  const pct = goalXp > 0 ? Math.min(100, Math.floor((Math.max(0, xp) / goalXp) * 100)) : 0;
  return { pct, met: isGoalMet(xp, goalXp), remaining: Math.max(0, goalXp - xp) };
}

type GoalEventKey = Pick<
  DailyGoalSetEvent,
  'clientTs' | 'clientTz' | 'deviceId' | 'clientSeq' | 'payload'
>;

const byCanonicalOrder = (a: GoalEventKey, b: GoalEventKey): number => {
  if (a.clientTs !== b.clientTs) return a.clientTs < b.clientTs ? -1 : 1;
  if (a.deviceId !== b.deviceId) return a.deviceId < b.deviceId ? -1 : 1;
  return a.clientSeq - b.clientSeq;
};

/**
 * Meta vigente em `date`: a do último `daily_goal.set` com `localDate <= date` (ordem canônica do
 * ADR, o último vence). Mudar a meta hoje não reescreve o passado. Sem eventos: padrão de 20 XP.
 */
export function goalForDate(events: readonly GoalEventKey[], date: string): number {
  let goal: number = DEFAULT_DAILY_GOAL_XP;
  for (const event of [...events].sort(byCanonicalOrder)) {
    if (localDateOf(event.clientTs, event.clientTz) <= date) goal = event.payload.goalXp;
  }
  return goal;
}
