import { DISPLAY_TIME_ZONE } from '../config';

/** Datas aparecem no fuso de exibição (America/Rio_Branco); o log guarda UTC. */
export function formatDisplayDate(isoUtc: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: DISPLAY_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoUtc));
}
