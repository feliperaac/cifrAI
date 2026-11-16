import { useEffect, useReducer, useRef, useState } from 'react';
import type { Lesson } from '@cifrai/content';
import { Button } from '../components/ui/Button';
import { CheckIcon } from '../components/ui/CheckIcon';
import { CrossIcon } from '../components/ui/CrossIcon';
import { ProgressBar } from '../components/ui/ProgressBar';
import { t, tp } from '../i18n';
import { getProgressState, type CompletionOutcome } from '../progress/progressStore';
import { newUuid } from '../progress/uuid';
import { resolveExerciseKit } from './exerciseKits';
import { ExitDialog } from './ExitDialog';
import { LessonIntro, LessonResult } from './LessonScreens';
import { correctCount, createLessonState, lessonProgress, lessonReducer } from './lessonMachine';

export interface LessonPlayerProps {
  lesson: Lesson;
  /** Sair da lição (depois da confirmação) ou voltar após o resultado. */
  onExit: () => void;
}

export function LessonPlayer({ lesson, onExit }: LessonPlayerProps) {
  const [state, dispatch] = useReducer(lessonReducer, lesson, createLessonState);
  const [response, setResponse] = useState<unknown>(null);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [outcome, setOutcome] = useState<CompletionOutcome | null>(null);
  /** Uma chave de idempotência por execução: remontar o resultado não duplica o XP. */
  const [eventId] = useState(newUuid);
  const startedAt = useRef<number | null>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const exercise =
    state.phase === 'exercise' || state.phase === 'feedback'
      ? lesson.exercises[state.index]
      : undefined;
  const kit = exercise === undefined ? null : resolveExerciseKit(exercise);
  const locked = state.phase === 'feedback';
  const correct = locked ? state.answers[state.answers.length - 1] === true : false;

  useEffect(() => {
    if (state.phase === 'feedback') footerRef.current?.querySelector('button')?.focus();
  }, [state.phase]);

  const finished = state.phase === 'result' && state.total > 0;
  useEffect(() => {
    if (!finished) return;
    let cancelled = false;
    const seconds = startedAt.current === null ? 0 : (Date.now() - startedAt.current) / 1000;
    void getProgressState()
      .recordLessonCompleted({
        eventId,
        lesson: { id: lesson.id, xp: lesson.xp },
        exercisesTotal: state.total,
        exercisesCorrect: correctCount(state),
        durationSeconds: Math.min(86_400, Math.max(0, Math.round(seconds))),
      })
      .then((result) => {
        if (!cancelled) setOutcome(result);
      });
    return () => {
      cancelled = true;
    };
    // O evento descreve o estado final; mudar `state` depois do resultado não reenvia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, eventId, lesson.id, lesson.xp]);

  function check() {
    if (kit === null || response === null) return;
    dispatch({ type: 'ANSWER', correct: kit.evaluate(response) });
  }

  function next() {
    dispatch({ type: 'CONTINUE' });
    setResponse(null);
  }

  const lastAnswered = state.phase === 'feedback' && state.index + 1 >= state.total;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col pt-[env(safe-area-inset-top)]">
      <header className="flex items-center gap-2 px-2 py-2">
        <Button
          variant="ghost"
          aria-label={t('lesson.exit')}
          onClick={() => (state.phase === 'result' ? onExit() : setConfirmingExit(true))}
        >
          <CrossIcon />
        </Button>
        <div className="min-w-0 flex-1 pe-2">
          <ProgressBar value={lessonProgress(state)} label={t('lesson.progress')} />
        </div>
      </header>

      <main className="flex-1 px-4 pb-4">
        {state.phase === 'intro' && <LessonIntro lesson={lesson} />}

        {exercise !== undefined && (
          <section
            aria-label={tp('lesson.exercise.counter', { n: state.index + 1, total: state.total })}
            className="py-4"
          >
            <p className="m-0 mb-3 label-caps">
              {tp('lesson.exercise.counter', { n: state.index + 1, total: state.total })}
            </p>
            {kit !== null ? (
              kit.render({ response, locked, onRespond: setResponse })
            ) : (
              <div
                role="note"
                className="card flex flex-col items-start gap-3"
                data-variant="raised"
              >
                <h2 className="m-0 font-display text-xl font-extrabold">
                  {t('lesson.unsupported.title')}
                </h2>
                <p className="m-0 text-muted">{t('lesson.unsupported.description')}</p>
              </div>
            )}
          </section>
        )}

        {state.phase === 'result' && (
          <LessonResult outcome={outcome} correct={correctCount(state)} total={state.total} />
        )}
      </main>

      <footer
        ref={footerRef}
        className="lesson-footer"
        data-feedback={locked ? (correct ? 'correct' : 'wrong') : undefined}
      >
        <div role="status" aria-live="polite">
          {locked && exercise !== undefined && kit !== null && (
            <div className="flex flex-col gap-1 pb-3">
              <p
                className={`m-0 flex items-center gap-2 font-display text-xl font-extrabold ${correct ? 'text-success' : 'text-danger'}`}
              >
                {correct ? <CheckIcon /> : <CrossIcon />}
                {correct ? t('lesson.feedback.correct') : t('lesson.feedback.wrong')}
              </p>
              {!correct && (
                <p className="m-0 font-bold">
                  {tp('lesson.feedback.correctAnswer', { answer: kit.correctAnswerText() })}
                </p>
              )}
              <p className="m-0">{exercise.explanation}</p>
            </div>
          )}
        </div>
        {state.phase === 'intro' ? (
          <Button
            fullWidth
            onClick={() => {
              startedAt.current = Date.now();
              dispatch({ type: 'START' });
            }}
          >
            {t('lesson.intro.start')}
          </Button>
        ) : state.phase === 'result' ? (
          <Button fullWidth onClick={onExit}>
            {t('lesson.result.back')}
          </Button>
        ) : kit === null && state.phase === 'exercise' ? (
          <Button fullWidth onClick={() => dispatch({ type: 'SKIP' })}>
            {t('lesson.unsupported.skip')}
          </Button>
        ) : state.phase === 'exercise' ? (
          <Button fullWidth disabled={response === null} onClick={check}>
            {t('lesson.check')}
          </Button>
        ) : (
          <Button fullWidth onClick={next}>
            {lastAnswered ? t('lesson.finish') : t('lesson.continue')}
          </Button>
        )}
      </footer>

      {confirmingExit && <ExitDialog onStay={() => setConfirmingExit(false)} onLeave={onExit} />}
    </div>
  );
}
