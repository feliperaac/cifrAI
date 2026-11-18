import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { getProgressState } from '../progress/progressStore';
import { newUuid } from '../progress/uuid';
import type { CatalogLesson, CatalogUnit, CurriculumLoader } from './catalog';
import { buildPath } from './pathState';
import { PathSection } from './PathSection';
import { UnitPath } from './UnitPath';

const lesson = (id: string, title: string): CatalogLesson => ({
  id,
  title,
  objective: 'x',
  category: 'concept',
  status: 'active',
  xp: 20,
  exerciseCount: 8,
  prerequisites: [],
});
const catalog: CatalogUnit[] = [
  {
    id: 'u01',
    title: 'Primeiros passos',
    description: 'Comece aqui.',
    lessons: [
      lesson('u01.l01', 'Cordas'),
      lesson('u01.l02', 'Postura'),
      lesson('u01.l03', 'Pulso'),
    ],
  },
];

const renderPath = (done: string[]) =>
  render(
    <MemoryRouter>
      <UnitPath units={buildPath(catalog, new Set(done))} />
    </MemoryRouter>,
  );

describe('UnitPath', () => {
  it('anuncia estado e número da lição para leitor de tela', () => {
    renderPath(['u01.l01']);
    expect(screen.getByRole('link', { name: /Lição 1: Cordas ?, concluída/ })).toHaveAttribute(
      'href',
      '/licao/u01.l01',
    );
    const current = screen.getByRole('link', { name: /Lição 2: Postura ?, disponível/ });
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /Lição 3: Pulso ?, bloqueada/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('cabeçalho da unidade com progresso', () => {
    renderPath(['u01.l01']);
    expect(screen.getByRole('heading', { level: 2, name: 'Primeiros passos' })).toBeInTheDocument();
    expect(screen.getByText('1 de 3 lições')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /Primeiros passos/ })).toHaveAttribute(
      'aria-valuenow',
      '33',
    );
  });

  it('lição bloqueada não navega e explica o motivo ao ativar, por teclado', async () => {
    const user = userEvent.setup();
    renderPath([]);
    const locked = screen.getByRole('button', { name: /Lição 2: Postura ?, bloqueada/ });
    locked.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Conclua a lição anterior para abrir esta.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Postura/ })).toBeNull();
  });

  it('ordem de tabulação segue a trilha: concluídas e atual, depois bloqueadas', async () => {
    const user = userEvent.setup();
    renderPath(['u01.l01']);
    await user.tab();
    expect(screen.getByRole('link', { name: /Lição 1/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: /Lição 2/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /Lição 3/ })).toHaveFocus();
  });

  it('mostra o XP de cada lição', () => {
    renderPath([]);
    expect(
      within(screen.getByRole('link', { name: /Lição 1/ })).getAllByText('20 XP').length,
    ).toBeGreaterThan(0);
  });
});

describe('PathSection', () => {
  const wrap = (loader: CurriculumLoader) =>
    render(
      <MemoryRouter>
        <PathSection loader={loader} />
      </MemoryRouter>,
    );

  it('vazio: "Em breve"', async () => {
    wrap(() => Promise.resolve([]));
    expect(await screen.findByRole('heading', { name: 'Em breve' })).toBeInTheDocument();
  });

  it('erro: mensagem e tentar de novo', async () => {
    const user = userEvent.setup();
    let calls = 0;
    wrap(() => (++calls === 1 ? Promise.reject(new Error('x')) : Promise.resolve(catalog)));
    expect(await screen.findByText('Não foi possível carregar a trilha.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(
      await screen.findByRole('link', { name: /Lição 1: Cordas ?, disponível/ }),
    ).toBeInTheDocument();
  });

  it('loading antes de resolver', () => {
    wrap(() => new Promise(() => undefined));
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
  });

  it('lição concluída no progresso aparece como concluída e abre a próxima', async () => {
    await getProgressState().recordLessonCompleted({
      eventId: newUuid(),
      lesson: { id: 'u01.l01', xp: 20 },
      exercisesTotal: 4,
      exercisesCorrect: 4,
      durationSeconds: 60,
    });
    wrap(() => Promise.resolve(catalog));
    expect(
      await screen.findByRole('link', { name: /Lição 1: Cordas ?, concluída/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Lição 2: Postura ?, disponível/ }),
    ).toBeInTheDocument();
  });
});
