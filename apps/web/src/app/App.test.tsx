import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { t } from '../i18n';
import { App } from './App';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('rotas', () => {
  it.each([
    ['/', 'path.title'],
    ['/afinador', 'tuner.title'],
    ['/perfil', 'profile.title'],
    ['/nao-existe', 'notFound.title'],
  ] as const)('renderiza %s', (path, key) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: t(key) })).toBeInTheDocument();
  });

  it('tem landmarks e navegação inferior com 3 destinos', () => {
    renderAt('/');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: t('nav.label') });
    expect(nav.querySelectorAll('a')).toHaveLength(3);
  });
});
