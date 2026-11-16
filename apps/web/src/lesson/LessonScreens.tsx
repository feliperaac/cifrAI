import type { Lesson } from '@cifrai/content';
import { XpBadge } from '../components/ui/XpBadge';
import { t, tp } from '../i18n';

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
  xp: number;
  correct: number;
  total: number;
}

export function LessonResult({ xp, correct, total }: LessonResultProps) {
  return (
    <section aria-labelledby="result-title" className="flex flex-col items-start gap-4 py-4">
      <h1 id="result-title" className="m-0 font-display text-3xl font-extrabold" tabIndex={-1}>
        {t('lesson.result.title')}
      </h1>
      <XpBadge value={xp} />
      <p className="m-0 text-xl font-bold">{tp('lesson.result.xp', { n: xp })}</p>
      <p className="m-0 text-lg">{tp('lesson.result.score', { correct, total })}</p>
      <p className="m-0 text-muted">{t('lesson.result.encourage')}</p>
    </section>
  );
}
