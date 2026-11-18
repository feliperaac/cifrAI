import { useFeedbackPrefs } from '../audio/feedbackPrefs';
import { t } from '../i18n';

export function FeedbackSoundsToggle() {
  const enabled = useFeedbackPrefs((s) => s.enabled);
  const setEnabled = useFeedbackPrefs((s) => s.setEnabled);
  return (
    <label className="flex min-h-tap cursor-pointer items-center justify-between gap-3 rounded-card border border-border bg-surface px-3 py-2 has-[:focus-visible]:outline-3">
      <span className="flex flex-col">
        <span className="font-semibold">{t('sounds.title')}</span>
        <span className="text-sm text-muted">{t('sounds.description')}</span>
      </span>
      <span className="flex items-center gap-2 text-sm font-medium">
        {enabled ? t('sounds.on') : t('sounds.off')}
        <input
          type="checkbox"
          role="switch"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-6 accent-[var(--color-primary,currentColor)]"
        />
      </span>
    </label>
  );
}
