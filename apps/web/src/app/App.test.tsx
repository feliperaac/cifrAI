import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// A rota é lazy: sob carga (validate roda tudo em paralelo) 1 s não basta.
const LAZY_ROUTE_TIMEOUT_MS = 5000;

describe('galeria de acordes (dev)', () => {
  it('existe em /dev/acordes (import.meta.env.DEV) e não está na navegação', async () => {
    renderAt('/dev/acordes');
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: /Galeria de acordes/ },
        { timeout: LAZY_ROUTE_TIMEOUT_MS },
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('chord-diagram')).toHaveLength(10);
    const nav = screen.getByRole('navigation', { name: t('nav.label') });
    expect(nav.querySelectorAll('a')).toHaveLength(3);
  });

  it('alternadores canhoto e dedos atuam nos diagramas', async () => {
    const user = userEvent.setup();
    renderAt('/dev/acordes');
    await screen.findAllByTestId('chord-diagram', {}, { timeout: LAZY_ROUTE_TIMEOUT_MS });
    expect(screen.getAllByTestId('chord-diagram')[0]).toHaveAttribute('data-left-handed', 'false');
    await user.click(screen.getByRole('checkbox', { name: 'Canhoto' }));
    expect(screen.getAllByTestId('chord-diagram')[0]).toHaveAttribute('data-left-handed', 'true');
    await user.click(screen.getByRole('checkbox', { name: 'Mostrar dedos' }));
    expect(document.querySelectorAll('[data-kind="finger"] text')).toHaveLength(0);
  });
});

describe('XP acumulado', () => {
  it('Home e Perfil mostram o progresso local', async () => {
    const first = renderAt('/');
    expect(await screen.findByText('XP de hoje: 0 XP')).toBeInTheDocument();
    first.unmount();
    renderAt('/perfil');
    expect(await screen.findByRole('heading', { name: 'Seu progresso' })).toBeInTheDocument();
  });
});
