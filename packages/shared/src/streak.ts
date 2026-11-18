import { addDays, daysBetween } from './dates.js';

/** ADR-0002 item 5: eventos registrados com mais de 7 dias de atraso não mexem no streak. */
export const STREAK_BACKFILL_DAYS = 7;

export interface ActivityDay {
  /** Data local (`YYYY-MM-DD`) em que a lição foi concluída (`localDate` do evento). */
  localDate: string;
  /**
   * Data local em que o evento chegou ao servidor. Só existe depois do sync; no log local o evento
   * nasce na hora, então fica ausente e nunca é "atrasado".
   */
  recordedOn?: string;
}

export interface StreakResult {
  /** Dias consecutivos com ao menos 1 lição, terminando hoje ou ontem. */
  current: number;
  best: number;
  /** Já há atividade hoje? */
  activeToday: boolean;
  /**
   * Há sequência de pé, mas hoje ainda não tem lição. Ela só zera quando o dia acabar; serve para
   * a UI incentivar com leveza, nunca para pressionar.
   */
  pendingToday: boolean;
  /** Sempre verdadeiro: no cliente isto é ESTIMATIVA OTIMISTA; o servidor é a autoridade (ADR-0002). */
  estimate: true;
}

/**
 * Streak por `localDate`. Regras:
 * - conta dias distintos (várias lições no mesmo dia valem 1);
 * - o dia de hoje sem atividade ainda não zera: a contagem ancora em ontem;
 * - se nem hoje nem ontem têm atividade, `current` é 0;
 * - atividade atrasada além de `backfillDays` (via `recordedOn`) é ignorada;
 * - datas futuras (relógio adiantado) são ignoradas.
 */
export function computeStreak(
  activity: readonly ActivityDay[],
  today: string,
  backfillDays: number = STREAK_BACKFILL_DAYS,
): StreakResult {
  const days = new Set<string>();
  for (const { localDate, recordedOn } of activity) {
    if (localDate > today) continue;
    if (recordedOn !== undefined && daysBetween(localDate, recordedOn) > backfillDays) continue;
    days.add(localDate);
  }

  const activeToday = days.has(today);
  const anchor = activeToday ? today : addDays(today, -1);
  let current = 0;
  for (let d = anchor; days.has(d); d = addDays(d, -1)) current += 1;

  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const d of [...days].sort()) {
    run = previous !== null && addDays(previous, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    previous = d;
  }

  return { current, best, activeToday, pendingToday: !activeToday && current > 0, estimate: true };
}
