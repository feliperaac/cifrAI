import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { t } from '../i18n';
import { THEME_STORAGE_KEY, useThemeStore } from './themeStore';

describe('tema', () => {
  it('troca para escuro, aplica no documento e persiste', async () => {
    render(<ThemeSwitcher />);
    await userEvent.click(screen.getByRole('radio', { name: t('theme.dark') }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('voltar para Sistema remove o atributo', async () => {
    useThemeStore.getState().setMode('light');
    render(<ThemeSwitcher />);
    expect(screen.getByRole('radio', { name: t('theme.light') })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: t('theme.system') }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('restaura o modo salvo ao recarregar o módulo', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const vi = (await import('vitest')).vi;
    vi.resetModules();
    const fresh = await import('./themeStore');
    expect(fresh.useThemeStore.getState().mode).toBe('dark');
  });
});
