import { goalProgress } from '@cifrai/shared';
import { Card } from '../components/ui/Card';
import { CheckIcon } from '../components/ui/CheckIcon';
import { ProgressBar } from '../components/ui/ProgressBar';
import { t, tp } from '../i18n';
import { useProgress } from './useProgress';

export function DailyGoalCard() {
  const { status, summary, reload } = useProgress();
  if (status === 'idle' || status === 'loading') return <Card status="loading" />;
  if (status === 'error') {
    return <Card status="error" errorMessage={t('progress.error')} onRetry={reload} />;
  }
  const { pct, met, remaining } = goalProgress(summary.todayXp, summary.dailyGoalXp);
  return (
    <section
      aria-labelledby="goal-title"
      className="card flex flex-col gap-2"
      data-variant="raised"
      data-testid="goal-card"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="goal-title" className="m-0 label-caps text-muted">
          {t('goal.title')}
        </h2>
        <p className="m-0 font-bold tabular-nums">
          {tp('goal.progress', { xp: summary.todayXp, goal: summary.dailyGoalXp })}
        </p>
      </div>
      <ProgressBar value={pct} label={t('goal.progressLabel')} tone="unit" />
      <p className="m-0 flex items-center gap-1 text-sm text-muted">
        {met ? (
          <span className="flex items-center gap-1 font-bold text-success">
            <CheckIcon />
            {t('goal.met')}
          </span>
        ) : (
          tp('goal.remaining', { n: remaining })
        )}
      </p>
    </section>
  );
}
