import { t, tp } from '../../i18n';

export interface XpBadgeProps {
  value: number;
  /** XP recém-ganho: mostra "+N" e anuncia por aria-live. */
  gained?: number;
}

export function XpBadge({ value, gained = 0 }: XpBadgeProps) {
  const gaining = gained > 0;
  return (
    <span className="xp-badge" data-gain={gaining}>
      <span className="text-xl leading-none font-extrabold tabular-nums">{value}</span>
      <span className="label-caps">{t('ui.xp')}</span>
      {gaining && (
        <span className="xp-badge__gain text-sm font-extrabold tabular-nums" aria-hidden="true">
          {`+${gained}`}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {gaining ? tp('ui.xpGained', { n: gained }) : ''}
      </span>
    </span>
  );
}
