import { useEffect, useReducer, useState } from 'react';
import type { PracticeTimerExercise } from '@cifrai/content';
import { t } from '../i18n';
import { ChordDiagram } from '../components/ChordDiagram';
import { Button } from '../components/ui/Button';
import { createTimer, formatClock, timerReducer } from './practiceTimerLogic';

export type SelfAssessment = 'done' | 'more';

export interface PracticeTimerViewProps {
  exercise: PracticeTimerExercise;
  safetyNotice?: string | undefined;
  assessment: SelfAssessment | null;
  locked: boolean;
  onRespond: (assessment: SelfAssessment) => void;
}

export function PracticeTimerView({
  exercise,
  safetyNotice,
  assessment,
  locked,
  onRespond,
}: PracticeTimerViewProps) {
  const [timer, dispatch] = useReducer(timerReducer, exercise.durationSeconds, createTimer);
  const [now, setNow] = useState(() => Date.now());
  const running = timer.status === 'running';

  function press(type: 'START' | 'PAUSE' | 'RESUME') {
    const instant = Date.now();
    dispatch({ type, now: instant });
    setNow(instant);
  }

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const instant = Date.now();
      dispatch({ type: 'TICK', now: instant });
      setNow(instant);
    };
    const id = setInterval(tick, 250);
    // Ao voltar para a aba o relógio é reavaliado na hora (timers em segundo plano são estrangulados).
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [running]);

  const remainingMs =
    timer.status === 'running' ? Math.max(0, timer.endAt - now) : timer.remainingMs;
  const total = exercise.durationSeconds * 1000;
  const elapsedPct = Math.round(((total - remainingMs) / total) * 100);
  const finished = timer.status === 'finished';
  const canAssess = finished && !locked;

  const message =
    timer.status === 'idle'
      ? t('lesson.timer.idle')
      : timer.status === 'running'
        ? t('lesson.timer.running')
        : timer.status === 'paused'
          ? t('lesson.timer.paused')
          : t('lesson.timer.finished');

  return (
    <div className="flex flex-col gap-4">
      <h2 className="m-0 font-display text-2xl font-extrabold">{exercise.prompt}</h2>
      {exercise.hint !== undefined && <p className="m-0 text-muted">{exercise.hint}</p>}
      <div role="note" className="card" data-variant="raised">
        <p className="m-0 mb-1 label-caps">{t('lesson.safety')}</p>
        <p className="m-0">{safetyNotice ?? t('lesson.timer.safetyDefault')}</p>
      </div>

      {exercise.chordIds !== undefined && (
        <section aria-label={t('lesson.timer.chordsLabel')} data-testid="timer-chords">
          <ul className="m-0 grid grid-cols-2 gap-3 p-0 sm:grid-cols-[repeat(auto-fit,minmax(10rem,12rem))] sm:justify-center">
            {exercise.chordIds.map((chordId) => (
              <li key={chordId} className="list-none">
                <ChordDiagram chordId={chordId} playable />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="timer-face" data-status={timer.status}>
        <p
          className="m-0 font-display text-4xl font-extrabold tabular-nums"
          role="timer"
          aria-label={t('lesson.timer.label')}
          data-testid="timer-clock"
        >
          {formatClock(remainingMs)}
        </p>
        <div className="progress w-full" aria-hidden="true">
          <div className="progress__fill" style={{ width: `${elapsedPct}%` }} />
        </div>
        <p className="m-0 text-muted" role="status" aria-live="polite">
          {message}
        </p>
      </div>

      {!locked && !finished && (
        <div className="flex flex-wrap gap-3">
          {timer.status === 'idle' && (
            <Button onClick={() => press('START')}>{t('lesson.timer.start')}</Button>
          )}
          {timer.status === 'running' && (
            <Button variant="secondary" onClick={() => press('PAUSE')}>
              {t('lesson.timer.pause')}
            </Button>
          )}
          {timer.status === 'paused' && (
            <Button onClick={() => press('RESUME')}>{t('lesson.timer.resume')}</Button>
          )}
          <Button variant="ghost" onClick={() => dispatch({ type: 'FINISH' })}>
            {t('lesson.timer.skip')}
          </Button>
        </div>
      )}

      {(canAssess || assessment !== null) && (
        <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
          <legend className="mb-2 font-bold">{t('lesson.timer.assessLabel')}</legend>
          {(['done', 'more'] as const).map((value) => (
            <label
              key={value}
              className="choice"
              data-selected={assessment === value}
              data-locked={locked}
            >
              <input
                type="radio"
                name={exercise.id}
                value={value}
                checked={assessment === value}
                disabled={locked}
                onChange={() => onRespond(value)}
                className="choice__input"
              />
              <span className="min-w-0 flex-1">{t(`lesson.timer.${value}`)}</span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
