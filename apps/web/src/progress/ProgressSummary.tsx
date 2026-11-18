import { useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { XpBadge } from '../components/ui/XpBadge';
import { t, tp } from '../i18n';
import { formatDays, formatDisplayDate } from './format';
import { useProgressStore } from './progressStore';

export interface ProgressSummaryProps {
  /** `compact`: XP total e do dia na Home. `full`: cartão completo no perfil. */
  variant?: 'compact' | 'full';
}

export function ProgressSummary({ variant = 'compact' }: ProgressSummaryProps) {
  const status = useProgressStore((s) => s.status);
  const persistence = useProgressStore((s) => s.persistence);
  const summary = useProgressStore((s) => s.summary);
  const load = useProgressStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === 'idle' || status === 'loading') return <Card status="loading" />;
  if (status === 'error') {
    return <Card status="error" errorMessage={t('progress.error')} onRetry={() => void load()} />;
  }

  const memoryNote = persistence === 'memory' && (
    <p role="note" className="m-0 text-sm text-muted">
      {t('progress.memoryOnly')}
    </p>
  );

  if (variant === 'compact') {
    return (
      <div
        className="card flex flex-col items-start gap-1"
        data-variant="raised"
        data-testid="progress-compact"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <XpBadge value={summary.totalXp} />
          <span className="font-bold text-muted">
            {`${t('progress.today')}: ${tp('ui.xpTotal', { n: summary.todayXp })}`}
          </span>
        </div>
        {summary.lessonsCompleted === 0 && (
          <p className="m-0 text-sm text-muted">{t('progress.empty')}</p>
        )}
        {memoryNote}
      </div>
    );
  }

  return (
    <section
      aria-labelledby="progress-title"
      className="card flex flex-col gap-3"
      data-variant="raised"
    >
      <h2 id="progress-title" className="m-0 font-display text-xl font-extrabold">
        {t('progress.title')}
      </h2>
      {summary.lessonsCompleted === 0 ? (
        <p className="m-0 text-muted">{t('progress.empty')}</p>
      ) : (
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-3">
          <Stat label={t('progress.total')} value={tp('ui.xpTotal', { n: summary.totalXp })} />
          <Stat label={t('progress.today')} value={tp('ui.xpTotal', { n: summary.todayXp })} />
          <Stat label={t('progress.lessons')} value={String(summary.lessonsCompleted)} />
          <Stat label={t('streak.current')} value={formatDays(summary.streak.current)} />
          <Stat label={t('streak.best')} value={formatDays(summary.streak.best)} />
        </dl>
      )}
      {summary.lastCompletedAt !== null && (
        <p className="m-0 text-sm text-muted">
          {tp('progress.lastLesson', { date: formatDisplayDate(summary.lastCompletedAt) })}
        </p>
      )}
      {summary.lessonsCompleted > 0 && (
        <p className="m-0 text-sm text-muted">{t('streak.estimateNote')}</p>
      )}
      {memoryNote}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="label-caps">{label}</dt>
      <dd className="m-0 font-display text-xl font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}
