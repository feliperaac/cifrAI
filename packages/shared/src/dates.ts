/** Aritmética de datas locais `YYYY-MM-DD` (sem fuso: a data já é local). Funções puras. */
const DAY_MS = 86_400_000;

const toUtcMs = (date: string): number => {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export function addDays(date: string, days: number): string {
  return new Date(toUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Dias entre `from` e `to` (positivo se `to` é depois). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** Os `count` dias terminando em `endDate`, do mais antigo ao mais recente. */
export function lastDays(endDate: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(endDate, i - (count - 1)));
}
