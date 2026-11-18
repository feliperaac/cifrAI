import { Card } from '../components/ui/Card';
import { CheckIcon } from '../components/ui/CheckIcon';
import { t, tp } from '../i18n';
import { formatLongLocalDate, formatWeekdayShort } from './format';
import { useProgress } from './useProgress';
import type { WeekDay } from './summary';

const statusKey = (day: WeekDay) =>
  day.goalMet ? 'week.day.goal' : day.active ? 'week.day.active' : 'week.day.none';

/** Mini calendário dos últimos 7 dias. O estado vai por ícone e texto (sr-only), não só por cor. */
export function WeekCalendar() {
  const { status, summary, reload } = useProgress();
  if (status === 'idle' || status === 'loading') return <Card status="loading" />;
  if (status === 'error') {
    return <Card status="error" errorMessage={t('progress.error')} onRetry={reload} />;
  }
  return (
    <section
      aria-labelledby="week-title"
      className="card flex flex-col gap-3"
      data-variant="raised"
    >
      <h2 id="week-title" className="m-0 font-display text-xl font-extrabold">
        {t('week.title')}
      </h2>
      <ol className="m-0 grid list-none grid-cols-7 gap-1 p-0" data-testid="week-calendar">
        {summary.week.map((day) => {
          const isToday = day.date === summary.today;
          return (
            <li
              key={day.date}
              className="flex flex-col items-center gap-1"
              aria-current={isToday ? 'date' : undefined}
            >
              <span className="label-caps text-muted">{formatWeekdayShort(day.date)}</span>
              <span
                className="flex size-9 items-center justify-center rounded-pill border-2 text-sm font-bold tabular-nums"
                style={{
                  borderColor: isToday ? 'var(--color-primary)' : 'var(--color-border)',
                  background: day.active ? 'var(--color-accent)' : 'transparent',
                  color: day.active ? 'var(--color-on-accent)' : 'var(--color-text-muted)',
                }}
              >
                {day.active ? <CheckIcon /> : day.date.slice(8)}
                <span className="sr-only">
                  {tp('week.day.sr', {
                    date: formatLongLocalDate(day.date),
                    status: t(statusKey(day)),
                    today: isToday ? ` (${t('week.today')})` : '',
                  })}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
