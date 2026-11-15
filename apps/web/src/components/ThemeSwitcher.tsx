import { t, type MessageKey } from '../i18n';
import { useThemeStore, type ThemeMode } from '../theme/themeStore';

const options: { mode: ThemeMode; label: MessageKey }[] = [
  { mode: 'system', label: 'theme.system' },
  { mode: 'light', label: 'theme.light' },
  { mode: 'dark', label: 'theme.dark' },
];

export function ThemeSwitcher() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{t('theme.title')}</legend>
      <div className="flex gap-2">
        {options.map((o) => (
          <label
            key={o.mode}
            className="flex min-h-tap flex-1 cursor-pointer items-center justify-center rounded-card border border-border bg-surface px-2 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-on-primary has-[:focus-visible]:outline-3"
          >
            <input
              type="radio"
              name="theme"
              value={o.mode}
              checked={mode === o.mode}
              onChange={() => setMode(o.mode)}
              className="sr-only"
            />
            {t(o.label)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
