import { DISPLAY_TIME_ZONE } from '../config';
import { tp } from '../i18n';

/** Datas aparecem no fuso de exibição (America/Rio_Branco); o log guarda UTC. */
export function formatDisplayDate(isoUtc: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: DISPLAY_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoUtc));
}

const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'short' });
const longDateFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/**
 * Data local `YYYY-MM-DD` (já resolvida no fuso do `clientTz`) vira rótulo sem novo deslocamento
 * de fuso: usa meio-dia UTC só como âncora de calendário.
 */
const anchor = (localDate: string) => new Date(`${localDate}T12:00:00Z`);
export const formatWeekdayShort = (localDate: string) =>
  weekdayFormat.format(anchor(localDate)).replace('.', '');
export const formatLongLocalDate = (localDate: string) => longDateFormat.format(anchor(localDate));

export const formatDays = (n: number) =>
  tp(n === 1 ? 'streak.days.one' : 'streak.days.other', { n });
