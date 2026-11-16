import { buildXpLedger, localDateOf, type XpLedger, type XpReason } from '@cifrai/shared';
import type { StoredLessonEvent } from './eventStore';

export interface ProgressSummary {
  totalXp: number;
  todayXp: number;
  lessonsCompleted: number;
  /** Instante UTC (ISO) da última conclusão; a UI formata no fuso de exibição. */
  lastCompletedAt: string | null;
}

export const EMPTY_SUMMARY: ProgressSummary = {
  totalXp: 0,
  todayXp: 0,
  lessonsCompleted: 0,
  lastCompletedAt: null,
};

export function ledgerOf(records: readonly StoredLessonEvent[]): XpLedger {
  return buildXpLedger(records.map(({ event, lessonXp }) => ({ event, lessonXp })));
}

/** "Hoje" no fuso do aparelho, o mesmo critério do `localDate` dos eventos (ADR-0002 item 3). */
export function summarize(
  records: readonly StoredLessonEvent[],
  now: Date,
  timeZone: string,
): { summary: ProgressSummary; ledger: XpLedger } {
  const ledger = ledgerOf(records);
  const today = localDateOf(now.toISOString(), timeZone);
  const last = records.reduce<string | null>(
    (acc, { event }) => (acc === null || event.clientTs > acc ? event.clientTs : acc),
    null,
  );
  return {
    ledger,
    summary: {
      totalXp: ledger.total,
      todayXp: ledger.byDay[today] ?? 0,
      lessonsCompleted: ledger.entries.length,
      lastCompletedAt: last,
    },
  };
}

export function reasonOf(ledger: XpLedger, eventId: string): XpReason | null {
  return ledger.entries.find((entry) => entry.eventId === eventId)?.reason ?? null;
}
