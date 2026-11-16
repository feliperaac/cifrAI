import { t } from '../../i18n';
import { CheckIcon } from './CheckIcon';

export interface ProgressBarProps {
  /** 0 a 100; ignorado se `indeterminate`. */
  value?: number;
  label: string;
  tone?: 'lesson' | 'unit';
  indeterminate?: boolean;
}

export function ProgressBar({
  value = 0,
  label,
  tone = 'lesson',
  indeterminate = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const complete = !indeterminate && pct === 100;
  return (
    <div className="flex items-center gap-2">
      <div
        className="progress min-w-0 flex-1"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : pct}
        aria-busy={indeterminate || undefined}
        data-tone={tone}
        data-indeterminate={indeterminate}
      >
        <div className="progress__fill" style={indeterminate ? undefined : { width: `${pct}%` }} />
      </div>
      {complete && (
        <span className="flex items-center gap-1 text-sm font-bold text-success">
          <CheckIcon />
          {t('ui.complete')}
        </span>
      )}
    </div>
  );
}
