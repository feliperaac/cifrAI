import { DAILY_GOAL_OPTIONS } from '@cifrai/shared';
import { useState } from 'react';
import { t, tp, type MessageKey } from '../i18n';
import { useProgressStore } from './progressStore';

/** Escolha da meta diária (radios nativos: setas do teclado funcionam sem código extra). */
export function GoalPicker() {
  const goal = useProgressStore((s) => s.summary.dailyGoalXp);
  const setDailyGoal = useProgressStore((s) => s.setDailyGoal);
  const [feedback, setFeedback] = useState<{ kind: 'saved' | 'error'; xp: number } | null>(null);

  const choose = async (xp: (typeof DAILY_GOAL_OPTIONS)[number]) => {
    const ok = await setDailyGoal(xp);
    setFeedback({ kind: ok ? 'saved' : 'error', xp });
  };

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-1 font-semibold">{t('goal.title')}</legend>
      <p className="m-0 text-sm text-muted">{t('goal.picker.description')}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DAILY_GOAL_OPTIONS.map((xp) => (
          <label
            key={xp}
            className="flex min-h-tap cursor-pointer flex-col items-center justify-center rounded-card border border-border bg-surface px-2 py-1 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-on-primary has-[:focus-visible]:outline-3"
          >
            <input
              type="radio"
              name="daily-goal"
              value={xp}
              checked={goal === xp}
              onChange={() => void choose(xp)}
              className="sr-only"
            />
            <span className="font-display font-extrabold tabular-nums">
              {tp('goal.picker.option', { n: xp })}
            </span>
            <span className="text-xs">{t(`goal.level.${xp}` as MessageKey)}</span>
          </label>
        ))}
      </div>
      <p role="status" className="m-0 min-h-5 text-sm text-muted">
        {feedback?.kind === 'saved' && tp('goal.picker.saved', { n: feedback.xp })}
        {feedback?.kind === 'error' && (
          <span className="font-bold text-danger">{t('goal.picker.error')}</span>
        )}
      </p>
    </fieldset>
  );
}
