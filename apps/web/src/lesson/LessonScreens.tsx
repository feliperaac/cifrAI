import type { Lesson } from '@cifrai/content';
import { XpBadge } from '../components/ui/XpBadge';
import { t, tp } from '../i18n';
import type { CompletionOutcome } from '../progress/progressStore';

export function LessonIntro({ lesson }: { lesson: Lesson }) {
  return (
    <section aria-labelledby="lesson-title" className="flex flex-col gap-4 py-4">
      <h1 id="lesson-title" className="m-0 font-display text-3xl font-extrabold">
        {lesson.title}
      </h1>
      <p className="m-0 text-lg">{lesson.objective}</p>
      <p className="m-0 flex flex-wrap gap-x-4 font-bold text-muted">
        <span>{tp('lesson.intro.exercises', { n: lesson.exercises.length })}</span>
        <span>{tp('lesson.intro.xp', { n: lesson.xp })}</span>
      </p>
      {lesson.safetyNotice !== undefined && (
        <div role="note" className="card" data-variant="raised">
          <p className="m-0 mb-1 label-caps">{t('lesson.safety')}</p>
          <p className="m-0">{lesson.safetyNotice}</p>
        </div>
      )}
      <p className="m-0 text-muted">{t('lesson.intro.noPunish')}</p>
    </section>
  );
}

export interface LessonResultProps {
  /** `null` enquanto o evento ainda está sendo gravado neste aparelho. */
  outcome: CompletionOutcome | null;
  correct: number;
  total: number;
}

export function LessonResult({ outcome, correct, total }: LessonResultProps) {
  return (
    <section
      aria-labelledby="result-title"
      className="flex flex-col items-start gap-4 py-6 md:py-10"
    >
      <h1 id="result-title" className="m-0 font-display text-3xl font-extrabold" tabIndex={-1}>
        {t('lesson.result.title')}
      </h1>
      {outcome === null ? (
        <p role="status" className="m-0 text-muted">
          {t('lesson.result.saving')}
        </p>
      ) : outcome.status === 'error' ? (
        <p role="alert" className="m-0 font-bold text-danger">
          {t('lesson.result.saveError')}
        </p>
      ) : (
        <>
          <XpBadge value={outcome.awardedXp} />
          <p className="m-0 text-xl font-bold">
            {tp('lesson.result.xp', { n: outcome.awardedXp })}
          </p>
          <p className="m-0 font-bold" data-testid="xp-total">
            {tp('lesson.result.total', { n: outcome.totalXp })}
          </p>
          {outcome.reason === 'repeat' && (
            <p className="m-0 text-muted">{t('lesson.result.repeat')}</p>
          )}
          {outcome.reason === 'capped' && (
            <p className="m-0 text-muted">{t('lesson.result.capped')}</p>
          )}
          <p className="m-0 text-sm text-muted">{t('lesson.result.estimate')}</p>
        </>
      )}
      <p className="m-0 text-lg">{tp('lesson.result.score', { correct, total })}</p>
      <p className="m-0 text-muted">{t('lesson.result.encourage')}</p>
    </section>
  );
}
