import { localDateOf, type LessonCompletedEvent } from './events.js';

/**
 * ESTIMATIVA OTIMISTA de XP, calculada no cliente (ADR-0002 seção 4). O servidor usa as mesmas
 * regras como autoridade e o cliente substitui a estimativa pelo estado devolvido no sync.
 * Os dois números abaixo são PROPOSTAS do ADR, ainda não decididas em definitivo.
 */
export const REPEAT_XP_RATE = 0.2;
export const DAILY_XP_CAP = 500;

/** `lessonXp` vem do catálogo de conteúdo (nunca do payload do evento). */
export interface XpLedgerInput {
  event: Pick<
    LessonCompletedEvent,
    'eventId' | 'deviceId' | 'clientSeq' | 'clientTs' | 'clientTz' | 'payload'
  >;
  lessonXp: number;
}

export type XpReason = 'full' | 'repeat' | 'capped';

export interface XpLedgerEntry {
  eventId: string;
  lessonId: string;
  localDate: string;
  xp: number;
  reason: XpReason;
}

export interface XpLedger {
  entries: XpLedgerEntry[];
  total: number;
  byDay: Record<string, number>;
}

/** Ordem canônica do ADR (sem `effectiveTs`/`serverSeq`, que só o servidor conhece). */
function canonicalCompare(a: XpLedgerInput['event'], b: XpLedgerInput['event']): number {
  if (a.clientTs !== b.clientTs) return a.clientTs < b.clientTs ? -1 : 1;
  if (a.deviceId !== b.deviceId) return a.deviceId < b.deviceId ? -1 : 1;
  return a.clientSeq - b.clientSeq;
}

/**
 * Função pura e determinística: refaz o livro de XP a partir do log. Por dia local e lição, a
 * primeira conclusão rende `lessonXp`; as repetições rendem `floor(lessonXp * REPEAT_XP_RATE)`.
 * Depois aplica o teto diário. IDs de evento repetidos na entrada contam uma vez só.
 */
export function buildXpLedger(
  inputs: readonly XpLedgerInput[],
  rules: { repeatRate?: number; dailyCap?: number } = {},
): XpLedger {
  const repeatRate = rules.repeatRate ?? REPEAT_XP_RATE;
  const dailyCap = rules.dailyCap ?? DAILY_XP_CAP;
  const seenEvents = new Set<string>();
  const seenLessonDays = new Set<string>();
  const byDay: Record<string, number> = {};
  const entries: XpLedgerEntry[] = [];

  const ordered = [...inputs].sort((a, b) => canonicalCompare(a.event, b.event));
  for (const { event, lessonXp } of ordered) {
    if (seenEvents.has(event.eventId)) continue;
    seenEvents.add(event.eventId);

    const localDate = localDateOf(event.clientTs, event.clientTz);
    const key = `${localDate}|${event.payload.lessonId}`;
    const repeated = seenLessonDays.has(key);
    seenLessonDays.add(key);

    const base = repeated ? Math.floor(lessonXp * repeatRate) : lessonXp;
    const room = Math.max(0, dailyCap - (byDay[localDate] ?? 0));
    const xp = Math.max(0, Math.min(base, room));
    byDay[localDate] = (byDay[localDate] ?? 0) + xp;
    entries.push({
      eventId: event.eventId,
      lessonId: event.payload.lessonId,
      localDate,
      xp,
      reason: xp < base ? 'capped' : repeated ? 'repeat' : 'full',
    });
  }
  const total = entries.reduce((sum, entry) => sum + entry.xp, 0);
  return { entries, total, byDay };
}
