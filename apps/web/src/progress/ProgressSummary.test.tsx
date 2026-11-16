import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createMemoryEventStore, type EventStore } from './eventStore';
import { configureProgress, getProgressState } from './progressStore';
import { ProgressSummary } from './ProgressSummary';
import { newUuid } from './uuid';

async function completeOne() {
  await getProgressState().recordLessonCompleted({
    eventId: newUuid(),
    lesson: { id: 'u01.l01', xp: 20 },
    exercisesTotal: 4,
    exercisesCorrect: 4,
    durationSeconds: 60,
  });
}

describe('ProgressSummary', () => {
  it('vazio: 0 XP e convite para a primeira lição (compacto)', async () => {
    render(<ProgressSummary />);
    expect(await screen.findByText('Conclua sua primeira lição para ganhar XP.')).toBeVisible();
    expect(screen.getByTestId('progress-compact')).toHaveTextContent('0');
    expect(screen.getByText('XP de hoje: 0 XP')).toBeInTheDocument();
  });

  it('compacto mostra o total e o XP do dia', async () => {
    await completeOne();
    render(<ProgressSummary />);
    expect(await screen.findByText('XP de hoje: 20 XP')).toBeInTheDocument();
    expect(screen.queryByText(/primeira lição/)).toBeNull();
  });

  it('completo: total, hoje, lições e última data', async () => {
    await completeOne();
    render(<ProgressSummary variant="full" />);
    expect(await screen.findByRole('heading', { name: 'Seu progresso' })).toBeInTheDocument();
    expect(screen.getByText('XP total').nextSibling).toHaveTextContent('20 XP');
    expect(screen.getByText('XP de hoje').nextSibling).toHaveTextContent('20 XP');
    expect(screen.getByText('Lições concluídas').nextSibling).toHaveTextContent('1');
    expect(screen.getByText(/Última lição: \d{2}\/\d{2}\/\d{4}/)).toBeInTheDocument();
  });

  it('completo vazio mostra a mensagem de empty', async () => {
    render(<ProgressSummary variant="full" />);
    expect(await screen.findByText('Conclua sua primeira lição para ganhar XP.')).toBeVisible();
  });

  it('erro de leitura mostra alerta e "Tentar de novo" recarrega', async () => {
    let fail = true;
    const base = createMemoryEventStore();
    const store: EventStore = {
      kind: 'memory',
      append: base.append,
      list: () => (fail ? Promise.reject(new Error('x')) : base.list()),
    };
    configureProgress({ store });
    const user = userEvent.setup();
    render(<ProgressSummary />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível ler seus pontos neste aparelho.',
    );
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByTestId('progress-compact')).toBeInTheDocument();
  });

  it('avisa quando só há memória (sem IndexedDB)', async () => {
    render(<ProgressSummary />);
    expect(await screen.findByRole('note')).toHaveTextContent('valem só até fechar o app');
  });
});
