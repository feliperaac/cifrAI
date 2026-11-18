import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise, Lesson } from '@cifrai/content';
import { devLesson } from '../pages/dev/fixtureLessons';
import { LessonPlayer } from './LessonPlayer';

function lessonOf(
  type: Exercise['type'],
  extra: Partial<Lesson> = {},
  exerciseId?: string,
): Lesson {
  const exercises = devLesson.exercises.filter(
    (e) => e.type === type && (exerciseId === undefined || e.id === exerciseId),
  );
  return { ...devLesson, ...extra, exercises, exerciseCount: exercises.length };
}

async function start(lesson: Lesson, user: ReturnType<typeof userEvent.setup>) {
  render(<LessonPlayer lesson={lesson} onExit={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: 'Começar' }));
}

const pair = (side: 'left' | 'right', text: string) =>
  within(screen.getByRole('list', { name: side === 'left' ? 'Coluna 1' : 'Coluna 2' })).getByRole(
    'button',
    { name: new RegExp(`^${text.replace(/[()]/g, '\\$&')}`) },
  );

describe('match_pairs com diagrama', () => {
  const lesson = lessonOf('match_pairs', {}, 'u99.l01.e11');
  const diagrams = () =>
    within(screen.getByRole('list', { name: 'Coluna 1' })).getAllByRole('button');

  it('não vaza o nome antes de verificar e revela depois, com ícone + texto', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    const items = diagrams();
    expect(items).toHaveLength(3);
    for (const [i, item] of items.entries()) {
      expect(item).toHaveAttribute('aria-label', `Diagrama ${i + 1}`);
      expect(item.querySelector('[data-testid="chord-caption"]')).toBeNull();
      expect(item.textContent).not.toMatch(/Mi menor|Lá menor|Dó maior/);
    }
    // Liga na ordem errada: diagramas 1,2,3 aos nomes C, Em, Am.
    const names = ['C (Dó maior)', 'Em (Mi menor)', 'Am (Lá menor)'];
    for (const [i, name] of names.entries()) {
      await user.click(items[i] as HTMLElement);
      await user.click(pair('right', name));
    }
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText('Quase lá!')).toBeInTheDocument();
    expect(screen.getAllByText('par errado').length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        'Resposta certa: Em (Mi menor) ↔ Em (Mi menor); Am (Lá menor) ↔ Am (Lá menor); C (Dó) ↔ C (Dó maior)',
      ),
    ).toBeInTheDocument();
    expect(diagrams()[0]).toHaveAttribute('aria-label', expect.stringContaining('Em (Mi menor)'));
  });

  it('acerta ligando por teclado', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    const names = ['Em (Mi menor)', 'Am (Lá menor)', 'C (Dó maior)'];
    for (const [i, name] of names.entries()) {
      (diagrams()[i] as HTMLElement).focus();
      await user.keyboard('{Enter}');
      pair('right', name).focus();
      await user.keyboard('{Enter}');
    }
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText('Certo!')).toBeInTheDocument();
  });
});

describe('match_pairs no player', () => {
  const lesson = lessonOf('match_pairs', {}, 'u99.l01.e08');

  it('liga pares por toque, desfaz e acerta', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    const check = screen.getByRole('button', { name: 'Verificar' });
    expect(check).toHaveAttribute('aria-disabled', 'true');

    await user.click(pair('left', 'Lá'));
    expect(pair('left', 'Lá')).toHaveAttribute('aria-pressed', 'true');
    await user.click(pair('right', 'A'));
    expect(pair('left', 'Lá')).toHaveTextContent('par 1');
    expect(pair('right', 'A')).toHaveTextContent('par 1');
    expect(screen.getByText('Faltam 2 pares.')).toBeInTheDocument();

    await user.click(pair('right', 'A')); // desfaz
    expect(screen.getByText('Faltam 3 pares.')).toBeInTheDocument();

    for (const [l, r] of [
      ['Lá', 'A'],
      ['Mi', 'E'],
      ['Sol', 'G'],
    ] as const) {
      await user.click(pair('left', l));
      await user.click(pair('right', r));
    }
    expect(check).not.toHaveAttribute('aria-disabled');
    await user.click(check);
    expect(screen.getByText('Certo!')).toBeInTheDocument();
    expect(screen.getAllByText('par certo')).toHaveLength(6);
  });

  it('funciona só por teclado (Enter) e aceita começar pela coluna 2', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    pair('right', 'E').focus();
    await user.keyboard('{Enter}');
    pair('left', 'Mi').focus();
    await user.keyboard('{Enter}');
    expect(pair('left', 'Mi')).toHaveTextContent('par 2');
  });

  it('erro: mostra ícone + texto, os pares certos e a explicação, sem punir', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    for (const [l, r] of [
      ['Lá', 'E'],
      ['Mi', 'G'],
      ['Sol', 'A'],
    ] as const) {
      await user.click(pair('left', l));
      await user.click(pair('right', r));
    }
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText('Quase lá!')).toBeInTheDocument();
    expect(screen.getByText('Resposta certa: Lá ↔ A; Mi ↔ E; Sol ↔ G')).toBeInTheDocument();
    expect(screen.getAllByText('par errado')).toHaveLength(6);
    expect(screen.getByText(/Na cifra, as notas viram letras/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver resultado' })).toHaveFocus();
  });
});

describe('order no player', () => {
  const lesson = lessonOf('order');
  const items = () =>
    screen
      .getAllByTestId(/^order-item-/)
      .map((li) => li.querySelector('.text-lg')?.textContent?.replace(/^posição \d+: /, ''));

  it('começa embaralhado, move por botões e acerta ao ordenar', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    const target = devLesson.exercises.find((e) => e.type === 'order');
    if (target?.type !== 'order') throw new Error('fixture');
    expect(items()).not.toEqual(target.items);
    expect(screen.getByRole('button', { name: 'Verificar' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    // Ordenação por seleção: sobe cada item certo até a posição desejada.
    for (let pos = 0; pos < target.items.length; pos += 1) {
      const name = target.items[pos] as string;
      let current = items().indexOf(name);
      while (current > pos) {
        await user.click(screen.getByRole('button', { name: `Mover ${name} para cima` }));
        current -= 1;
      }
    }
    expect(items()).toEqual(target.items);
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText('Certo!')).toBeInTheDocument();
    expect(screen.getAllByText('posição certa')).toHaveLength(target.items.length);
  });

  it('teclado: foco continua no botão depois de mover e anuncia a posição', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    const first = items()[0] as string;
    const down = screen.getByRole('button', { name: `Mover ${first} para baixo` });
    down.focus();
    await user.keyboard('{Enter}');
    expect(down).toHaveFocus();
    expect(screen.getByText(`${first} agora está na posição 2 de 6.`)).toBeInTheDocument();
    expect(items()[1]).toBe(first);
  });

  it('erro: mostra posição certa de cada item e a ordem correta', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    const first = items()[0] as string;
    await user.click(screen.getByRole('button', { name: `Mover ${first} para baixo` }));
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText('Quase lá!')).toBeInTheDocument();
    expect(screen.getByText(/Resposta certa: 1\. Mi grave/)).toBeInTheDocument();
    expect(screen.getAllByText(/o certo é a posição/).length).toBeGreaterThan(0);
  });
});

describe('build_chord no player', () => {
  const lesson = lessonOf('build_chord');
  const cell = (string: number, fret: number) =>
    screen.getByRole('button', { name: `Corda ${string}, casa ${fret}` });

  it('monta Em tocando casas e acerta', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    expect(screen.getByRole('button', { name: 'Verificar' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await user.click(cell(5, 2));
    await user.click(cell(4, 2));
    expect(cell(5, 2)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/corda 5 casa 2/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText('Certo!')).toBeInTheDocument();
    expect(cell(5, 2)).toHaveAttribute('aria-disabled', 'true');
  });

  it('tocar de novo solta; abafar corda; limpar volta ao início', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    await user.click(cell(5, 2));
    await user.click(cell(5, 2));
    expect(cell(5, 2)).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByTestId('head-6'));
    expect(screen.getByText(/corda 6 muda/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(screen.getByRole('button', { name: 'Verificar' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('teclado: setas movem o foco e Enter aperta a casa', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    screen.getByTestId('head-6').focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}');
    expect(cell(5, 2)).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(cell(5, 2)).toHaveAttribute('aria-pressed', 'true');
  });

  it('erro: mostra o diagrama certo e a explicação', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    await user.click(cell(1, 3));
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText('Quase lá!')).toBeInTheDocument();
    expect(screen.getByText('Resposta certa: Em (Mi menor)')).toBeInTheDocument();
    expect(screen.getByTestId('build-correct-shape')).toBeInTheDocument();
  });

  it('ouvir o resultado só acontece por clique', async () => {
    const user = userEvent.setup();
    await start(lesson, user);
    const listen = screen.getByRole('button', { name: 'Ouvir o que montei' });
    expect(listen).toHaveAttribute('aria-disabled', 'true');
    await user.click(cell(5, 2));
    expect(screen.getByRole('button', { name: 'Ouvir o que montei' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });
});

describe('practice_timer no player', () => {
  afterEach(() => vi.useRealTimers());

  it('mostra os diagramas dos acordes para treinar, com nome, tocáveis', async () => {
    const user = userEvent.setup();
    await start(lessonOf('practice_timer'), user);
    const section = screen.getByRole('region', { name: 'Acordes para treinar' });
    expect(within(section).getAllByTestId('chord-diagram')).toHaveLength(2);
    expect(within(section).getAllByTestId('chord-caption')).toHaveLength(2);
    expect(within(section).getByRole('button', { name: /Em/ })).toBeInTheDocument();
    expect(screen.getByRole('note')).toBeInTheDocument();
  });

  it('mostra o aviso de segurança da lição, conta, pausa, retoma e termina', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    await start(lessonOf('practice_timer'), user);
    expect(screen.getByRole('note')).toHaveTextContent('Faça pausas curtas');
    expect(screen.getByTestId('timer-clock')).toHaveTextContent('00:30');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Começar' }));
    act(() => void vi.advanceTimersByTime(10_000));
    expect(screen.getByTestId('timer-clock')).toHaveTextContent('00:20');

    await user.click(screen.getByRole('button', { name: 'Pausar' }));
    act(() => void vi.advanceTimersByTime(60_000));
    expect(screen.getByTestId('timer-clock')).toHaveTextContent('00:20');
    expect(screen.getByText('Timer pausado.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retomar' }));
    act(() => void vi.advanceTimersByTime(20_000));
    expect(screen.getByText('Tempo! Como foi?')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Consegui' })).toBeInTheDocument();
  });

  it('auto-avaliação "preciso treinar mais" não pune e dá feedback acolhedor', async () => {
    const user = userEvent.setup();
    await start(lessonOf('practice_timer'), user);
    await user.click(screen.getByRole('button', { name: 'Já pratiquei' }));
    expect(screen.getByRole('button', { name: 'Verificar' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await user.click(screen.getByRole('radio', { name: 'Preciso treinar mais' }));
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText('Sem problema! Treinar de novo ajuda.')).toBeInTheDocument();
    expect(screen.queryByText(/Resposta certa/)).not.toBeInTheDocument();
    expect(screen.getByText(/Trocar de acorde devagar/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver resultado' }));
    expect(await screen.findByText('Você ganhou 20 XP')).toBeInTheDocument();
  });

  it('usa o aviso genérico quando a lição não tem safetyNotice', async () => {
    const user = userEvent.setup();
    const lesson = lessonOf('practice_timer');
    delete lesson.safetyNotice;
    await start(lesson, user);
    expect(screen.getByRole('note')).toHaveTextContent('Se sentir dor nos pulsos ou dedos');
  });
});

describe('cobertura de tipos', () => {
  it.each(['multiple_choice', 'match_pairs', 'order', 'build_chord', 'practice_timer'] as const)(
    '%s tem view (não cai no fallback)',
    async (type) => {
      const user = userEvent.setup();
      await start(lessonOf(type), user);
      expect(screen.queryByText(/ainda não está disponível/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Pular exercício' })).not.toBeInTheDocument();
    },
  );
});
