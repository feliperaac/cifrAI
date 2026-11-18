import {
  buildXpLedger,
  computeStreak,
  DEFAULT_DAILY_GOAL_XP,
  goalForDate,
  isGoalMet,
  lastDays,
  localDateOf,
  type StreakResult,
  type XpLedger,
  type XpReason,
} from '@cifrai/shared';
import { isGoalRecord, isLessonRecord, type StoredRecord } from './eventStore';

export interface WeekDay {
  /** Data local `YYYY-MM-DD`. */
  date: string;
  xp: number;
  /** Houve ao menos uma lição neste dia. */
  active: boolean;
  goalMet: boolean;
}

export interface ProgressSummary {
  totalXp: number;
  todayXp: number;
  lessonsCompleted: number;
  /** Instante UTC (ISO) da última conclusão; a UI formata no fuso de exibição. */
  lastCompletedAt: string | null;
  /** "Hoje" no fuso do aparelho (`YYYY-MM-DD`); vazio antes do primeiro carregamento. */
  today: string;
  /** ESTIMATIVA OTIMISTA local; o servidor é a autoridade (ADR-0002). */
  streak: StreakResult;
  /** Meta vigente hoje, em XP. */
  dailyGoalXp: number;
  goalMetToday: boolean;
  /** Lições distintas já concluídas (alimenta a trilha). */
  completedLessonIds: string[];
  /** Os 7 últimos dias, do mais antigo a hoje. */
  week: WeekDay[];
}

export const WEEK_LENGTH = 7;

export const EMPTY_SUMMARY: ProgressSummary = {
  totalXp: 0,
  todayXp: 0,
  lessonsCompleted: 0,
  lastCompletedAt: null,
  today: '',
  streak: { current: 0, best: 0, activeToday: false, pendingToday: false, estimate: true },
  dailyGoalXp: DEFAULT_DAILY_GOAL_XP,
  goalMetToday: false,
  completedLessonIds: [],
  week: [],
};

export function ledgerOf(records: readonly StoredRecord[]): XpLedger {
  return buildXpLedger(
    records.filter(isLessonRecord).map(({ event, lessonXp }) => ({ event, lessonXp })),
  );
}

/** "Hoje" no fuso do aparelho, o mesmo critério do `localDate` dos eventos (ADR-0002 item 3). */
export function summarize(
  records: readonly StoredRecord[],
  now: Date,
  timeZone: string,
): { summary: ProgressSummary; ledger: XpLedger } {
  const ledger = ledgerOf(records);
  const lessons = records.filter(isLessonRecord);
  const goals = records.filter(isGoalRecord).map(({ event }) => event);
  const today = localDateOf(now.toISOString(), timeZone);
  const last = lessons.reduce<string | null>(
    (acc, { event }) => (acc === null || event.clientTs > acc ? event.clientTs : acc),
    null,
  );
  const activeDates = new Set(ledger.entries.map((entry) => entry.localDate));
  const dailyGoalXp = goalForDate(goals, today);
  const todayXp = ledger.byDay[today] ?? 0;

  return {
    ledger,
    summary: {
      totalXp: ledger.total,
      todayXp,
      lessonsCompleted: ledger.entries.length,
      lastCompletedAt: last,
      today,
      streak: computeStreak(
        [...activeDates].map((localDate) => ({ localDate })),
        today,
      ),
      dailyGoalXp,
      goalMetToday: isGoalMet(todayXp, dailyGoalXp),
      completedLessonIds: [...new Set(ledger.entries.map((entry) => entry.lessonId))],
      week: lastDays(today, WEEK_LENGTH).map((date) => ({
        date,
        xp: ledger.byDay[date] ?? 0,
        active: activeDates.has(date),
        goalMet: isGoalMet(ledger.byDay[date] ?? 0, goalForDate(goals, date)),
      })),
    },
  };
}

export function reasonOf(ledger: XpLedger, eventId: string): XpReason | null {
  return ledger.entries.find((entry) => entry.eventId === eventId)?.reason ?? null;
}
