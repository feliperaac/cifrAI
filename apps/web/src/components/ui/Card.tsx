import type { ReactNode } from 'react';
import { t } from '../../i18n';
import { Button } from './Button';
import { CheckIcon } from './CheckIcon';

interface CardBase {
  variant?: 'flat' | 'raised' | 'interactive';
  className?: string;
  children?: ReactNode;
  /** Estado do conteúdo; `ready` mostra `children`. */
  status?: 'ready' | 'loading' | 'empty' | 'error';
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
}

export type CardProps = CardBase;

export function Card({
  variant = 'flat',
  className = '',
  children,
  status = 'ready',
  emptyMessage,
  errorMessage,
  onRetry,
  selected = false,
  disabled = false,
  onClick,
  href,
}: CardProps) {
  const interactive = variant === 'interactive' && status === 'ready';
  const common = {
    className: `card ${className}`.trim(),
    'data-variant': variant,
    'data-selected': selected || undefined,
  };

  const body = (
    <>
      {status === 'loading' && (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only" role="status">
            {t('ui.loading')}
          </span>
          <div className="skeleton w-2/3" aria-hidden="true" />
          <div className="skeleton" aria-hidden="true" />
        </div>
      )}
      {status === 'empty' && <p className="m-0 text-muted">{emptyMessage ?? t('ui.empty')}</p>}
      {status === 'error' && (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="m-0 text-danger font-bold">{errorMessage ?? t('ui.error')}</p>
          {onRetry !== undefined && (
            <Button variant="secondary" onClick={onRetry}>
              {t('ui.retry')}
            </Button>
          )}
        </div>
      )}
      {status === 'ready' && (
        <>
          {selected && (
            <span className="mb-1 flex items-center gap-1 text-sm font-bold text-primary">
              <CheckIcon />
              {t('ui.selected')}
            </span>
          )}
          {children}
        </>
      )}
    </>
  );

  if (!interactive) return <div {...common}>{body}</div>;

  if (href !== undefined && !disabled) {
    return (
      <a {...common} href={href} aria-current={selected ? 'true' : undefined}>
        {body}
      </a>
    );
  }
  return (
    <button
      {...common}
      type="button"
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onClick?.();
      }}
    >
      {body}
    </button>
  );
}
