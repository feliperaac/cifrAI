import { Card } from '../components/ui/Card';
import { FlameIcon } from '../components/Icons';
import { t, tp } from '../i18n';
import { formatDays } from './format';
import { useProgress } from './useProgress';

/** Tom de incentivo, nunca de cobrança: a sequência pendente é um convite, não um alarme. */
export function StreakCard() {
  const { status, summary, reload } = useProgress();
  if (status === 'idle' || status === 'loading') return <Card status="loading" />;
  if (status === 'error') {
    return <Card status="error" errorMessage={t('progress.error')} onRetry={reload} />;
  }
  const { current, best, activeToday } = summary.streak;
  const message = activeToday
    ? t('streak.doneToday')
    : current > 0
      ? t('streak.pending')
      : best > 0
        ? tp('streak.restart', { best: formatDays(best) })
        : t('streak.empty');

  return (
    <section
      aria-labelledby="streak-title"
      className="card flex items-center gap-3"
      data-variant="raised"
      data-testid="streak-card"
    >
      <span
        className="flex size-12 flex-none items-center justify-center rounded-pill border-2 border-text bg-accent text-on-accent"
        aria-hidden="true"
      >
        <FlameIcon />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="streak-title" className="m-0 label-caps text-muted">
          {t('streak.title')}
        </h2>
        <p className="m-0 font-display text-xl leading-tight font-extrabold tabular-nums">
          {formatDays(current)}
        </p>
        <p className="m-0 text-sm text-muted">{message}</p>
      </div>
    </section>
  );
}
