import type { ButtonHTMLAttributes } from 'react';
import { t } from '../../i18n';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

/** aria-disabled (e não `disabled`) mantém o botão focável e anunciável; o clique é bloqueado aqui. */
export function Button({
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  children,
  ...rest
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <button
      {...rest}
      type={type}
      className="btn"
      data-variant={variant}
      data-full={fullWidth}
      aria-disabled={inactive || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (inactive) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {loading ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span>{t('ui.loading')}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
