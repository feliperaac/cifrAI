import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LessonSchema } from '@cifrai/content';
import { describe, expect, it, vi } from 'vitest';
import { devLesson } from '../pages/dev/fixtureLessons';
import LessonPage from '../pages/LessonPage';
import { LessonPlayer } from './LessonPlayer';
import type { LessonLoader } from './useLesson';

const mcOnly = {
  ...devLesson,
  exercises: devLesson.exercises.filter((e) => e.type === 'multiple_choice').slice(0, 2),
  exerciseCount: 2,
};

describe('fixture de desenvolvimento', () => {
  it('é uma lição válida no schema do conteúdo', () => {
    expect(LessonSchema.safeParse(devLesson).success).toBe(true);
  });
});

describe('LessonPlayer', () => {
  it('fluxo completo: intro, acerto, erro com explicação, resultado com XP', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    render(<LessonPlayer lesson={mcOnly} onExit={onExit} />);

    expect(screen.getByRole('heading', { name: mcOnly.title })).toBeInTheDocument();
    expect(screen.getByText('Errar faz parte: não tem vida nem castigo.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Começar' }));

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    const check = screen.getByRole('button', { name: 'Verificar' });
    expect(check).toHaveAttribute('aria-disabled', 'true');

    await user.click(screen.getByRole('radio', { name: '6' }));
    await user.click(check);
    expect(screen.getByText('Certo!')).toBeInTheDocument();
    expect(screen.getByText('O violão comum tem 6 cordas.')).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    const next = screen.getByRole('button', { name: 'Continuar' });
    expect(next).toHaveFocus();
    await user.click(next);

    await user.click(screen.getByRole('radio', { name: 'Lá (5ª)' }));
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText('Quase lá!')).toBeInTheDocument();
    expect(screen.getByText('Resposta certa: Mi aguda (1ª)')).toBeInTheDocument();
    expect(screen.getByText(/A 1ª corda, Mi aguda/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver resultado' }));

    expect(screen.getByRole('heading', { name: 'Lição concluída!' })).toBeInTheDocument();
    expect(screen.getByText('Você ganhou 20 XP')).toBeInTheDocument();
    expect(screen.getByText('Você acertou 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    await user.click(screen.getByRole('button', { name: 'Voltar para a trilha' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('opções trabalham por teclado (setas + Enter no botão) e travam após verificar', async () => {
    const user = userEvent.setup();
    render(<LessonPlayer lesson={mcOnly} onExit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Começar' }));
    screen.getByRole('radio', { name: '4' }).focus();
    expect(screen.getByRole('radio', { name: '4' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: '6' })).toBeChecked();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Certo!')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '4' })).toBeDisabled();
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('feedback usa ícone + texto e região aria-live', async () => {
    const user = userEvent.setup();
    render(<LessonPlayer lesson={mcOnly} onExit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Começar' }));
    await user.click(screen.getByRole('radio', { name: '4' }));
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Quase lá!');
    expect(status.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Resposta certa')).toBeInTheDocument();
    expect(screen.getByText('Sua resposta')).toBeInTheDocument();
  });

  it('sair pede confirmação; Esc e "Continuar na lição" ficam; "Sair" sai', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    render(<LessonPlayer lesson={mcOnly} onExit={onExit} />);
    await user.click(screen.getByRole('button', { name: 'Sair da lição' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Sair da lição?' });
    expect(screen.getByRole('button', { name: 'Continuar na lição' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(dialog).not.toBeInTheDocument();
    expect(onExit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sair da lição' }));
    await user.click(screen.getByRole('button', { name: 'Continuar na lição' }));
    expect(onExit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sair da lição' }));
    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('tipo não suportado mostra o fallback e permite pular', async () => {
    const user = userEvent.setup();
    const unsupported = devLesson.exercises.filter((e) => e.type === 'build_chord');
    render(<LessonPlayer lesson={{ ...devLesson, exercises: unsupported }} onExit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Começar' }));
    expect(
      screen.getByText('Este tipo de exercício ainda não está disponível.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pular exercício' }));
    expect(screen.getByRole('heading', { name: 'Lição concluída!' })).toBeInTheDocument();
  });

  it('mostra o aviso de segurança na intro quando existe', () => {
    render(
      <LessonPlayer lesson={{ ...mcOnly, safetyNotice: 'Pare se sentir dor.' }} onExit={vi.fn()} />,
    );
    expect(screen.getByRole('note')).toHaveTextContent('Pare se sentir dor.');
  });
});

describe('LessonPage', () => {
  function renderAt(loader: LessonLoader) {
    render(
      <MemoryRouter initialEntries={['/licao/u99.l01']}>
        <Routes>
          <Route path="/" element={<p>trilha</p>} />
          <Route path="licao/:lessonId" element={<LessonPage loader={loader} />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('loading → ready', async () => {
    renderAt(() => Promise.resolve(mcOnly));
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    expect(await screen.findByRole('heading', { name: mcOnly.title })).toBeInTheDocument();
  });

  it('empty quando a lição não existe', async () => {
    renderAt(() => Promise.resolve(null));
    expect(await screen.findByText('Essa lição não foi encontrada.')).toBeInTheDocument();
  });

  it('empty quando a lição não tem exercícios', async () => {
    renderAt(() => Promise.resolve({ ...mcOnly, exercises: [] }));
    expect(await screen.findByText('Esta lição ainda não tem exercícios.')).toBeInTheDocument();
  });

  it('error com nova tentativa', async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error('falha')).mockResolvedValueOnce(mcOnly);
    renderAt(loader);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a lição.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: mcOnly.title })).toBeInTheDocument(),
    );
  });

  it('sair do resultado volta à trilha', async () => {
    const user = userEvent.setup();
    renderAt(() => Promise.resolve({ ...mcOnly, exercises: mcOnly.exercises.slice(0, 1) }));
    await user.click(await screen.findByRole('button', { name: 'Começar' }));
    await user.click(screen.getByRole('radio', { name: '6' }));
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    await user.click(screen.getByRole('button', { name: 'Ver resultado' }));
    await user.click(screen.getByRole('button', { name: 'Voltar para a trilha' }));
    expect(screen.getByText('trilha')).toBeInTheDocument();
  });
});
