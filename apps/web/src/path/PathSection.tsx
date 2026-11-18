import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { t } from '../i18n';
import { useProgress } from '../progress/useProgress';
import { useCurriculum, type CurriculumLoader } from './catalog';
import { buildPath } from './pathState';
import { UnitPath } from './UnitPath';

/** Junta currículo (fonte substituível) e progresso (log local) e cuida de loading/empty/error. */
export function PathSection({ loader }: { loader?: CurriculumLoader }) {
  const [attempt, setAttempt] = useState(0);
  const curriculum = useCurriculum(loader, attempt);
  const { status, summary } = useProgress();
  const units = curriculum.status === 'ready' ? curriculum.units : null;
  const completed = summary.completedLessonIds;
  const path = useMemo(
    () => (units === null ? [] : buildPath(units, new Set(completed))),
    [units, completed],
  );

  if (curriculum.status === 'loading' || status === 'idle' || status === 'loading') {
    return <Card status="loading" />;
  }
  if (curriculum.status === 'error') {
    return (
      <Card
        status="error"
        errorMessage={t('path.error')}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    );
  }
  if (curriculum.status === 'empty' || path.length === 0) {
    return (
      <Card variant="raised" className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-xl font-extrabold">{t('path.comingSoon')}</h2>
        <p className="m-0 text-muted">{t('path.comingSoonDescription')}</p>
      </Card>
    );
  }
  return <UnitPath units={path} />;
}
