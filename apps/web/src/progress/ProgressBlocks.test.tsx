import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DailyGoalCard } from './DailyGoalCard';
import { GoalPicker } from './GoalPicker';
import { getProgressState } from './progressStore';
import { StreakCard } from './StreakCard';
import { newUuid } from './uuid';
import { WeekCalendar } from './WeekCalendar';

const complete = (xp = 20) =>
  getProgressState().recordLessonCompleted({
    eventId: newUuid(),
    lesson: { id: 'u01.l01', xp },
    exercisesTotal: 4,
    exercisesCorrect: 4,
    durationSeconds: 60,
  });

describe('StreakCard', () => {
  it('vazio: convite gentil', async () => {
    render(<StreakCard />);
    expect(
      await screen.findByText('Faça uma lição hoje para começar sua sequência.'),
    ).toBeVisible();
    expect(screen.getByText('0 dias')).toBeInTheDocument();
  });

  it('com lição hoje: singular e mensagem de ok', async () => {
    await complete();
    render(<StreakCard />);
    expect(await screen.findByText('1 dia')).toBeInTheDocument();
    expect(screen.getByText('Hoje já conta! Volte amanhã para continuar.')).toBeInTheDocument();
  });
});

describe('DailyGoalCard', () => {
  it('parcial: barra com valor e quanto falta', async () => {
    await complete(10);
    render(<DailyGoalCard />);
    expect(await screen.findByText('10 de 20 XP hoje')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso da meta diária' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
    expect(screen.getByText('Faltam 10 XP para a meta de hoje.')).toBeInTheDocument();
  });

  it('atingida: texto e ícone, não só cor', async () => {
    await complete(20);
    render(<DailyGoalCard />);
    expect(await screen.findByText('Meta do dia batida. Muito bem!')).toBeInTheDocument();
  });
});

describe('GoalPicker', () => {
  it('mostra as 4 opções com 20 XP marcada e troca a meta', async () => {
    const user = userEvent.setup();
    render(<GoalPicker />);
    const group = screen.getByRole('group', { name: 'Meta diária' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(screen.getByRole('radio', { name: /20 XP/ })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /50 XP/ }));
    expect(await screen.findByText('Meta salva: 50 XP por dia.')).toBeInTheDocument();
    expect(getProgressState().summary.dailyGoalXp).toBe(50);
    expect(screen.getByRole('radio', { name: /50 XP/ })).toBeChecked();
  });
});

describe('WeekCalendar', () => {
  it('7 dias, hoje marcado, com texto de estado para leitor de tela', async () => {
    await complete();
    render(<WeekCalendar />);
    const list = await screen.findByTestId('week-calendar');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    expect(items.at(-1)).toHaveAttribute('aria-current', 'date');
    expect(items.at(-1)).toHaveTextContent(/hoje.*meta batida/);
    expect(items[0]).toHaveTextContent(/sem lição/);
  });
});
