import type { MultipleChoiceExercise } from '@cifrai/content';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MultipleChoiceView } from './MultipleChoiceView';

const play = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('../audio/session', async (original) => ({
  ...(await original<typeof import('../audio/session')>()),
  playChordFromGesture: play,
}));

const base: MultipleChoiceExercise = {
  id: 'u99.l01.e06',
  type: 'multiple_choice',
  prompt: 'Qual acorde é este?',
  options: [
    { id: 'o1', text: 'Em (Mi menor)' },
    { id: 'o2', text: 'Am (Lá menor)' },
  ],
  correctOptionId: 'o2',
  explanation: 'Porque sim.',
};

const view = (exercise: MultipleChoiceExercise, locked = false) => (
  <MultipleChoiceView
    exercise={exercise}
    selectedId={null}
    correctId={locked ? exercise.correctOptionId : null}
    locked={locked}
    onSelect={vi.fn()}
  />
);

beforeEach(() => play.mockClear());

describe('MultipleChoiceView com acorde', () => {
  it('sem chordId não mostra diagrama nem botão de som (retrocompatível)', () => {
    render(view(base));
    expect(screen.queryByTestId('exercise-chord')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('diagrama: tocável, nome escondido na tela e nos rótulos; só toca por gesto', async () => {
    const user = userEvent.setup();
    render(view({ ...base, chordId: 'am' }));
    expect(screen.getByTestId('chord-diagram')).toBeInTheDocument();
    expect(screen.queryByTestId('chord-caption')).toBeNull();
    const container = screen.getByTestId('exercise-chord');
    expect(container.textContent).not.toMatch(/Am|Lá menor/);
    expect(container.querySelector('svg text')?.textContent ?? '').not.toMatch(/Am/);
    expect(play).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Ouvir o acorde' }));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('o nome do acorde é revelado depois de verificar', () => {
    const { rerender } = render(view({ ...base, chordId: 'am' }));
    expect(screen.queryByTestId('chord-caption')).toBeNull();
    rerender(view({ ...base, chordId: 'am' }, true));
    expect(screen.getByTestId('chord-caption')).toHaveTextContent('Am (Lá menor)');
  });

  it('diagram_with_name mostra o nome desde o início', () => {
    render(view({ ...base, chordId: 'am', chordPresentation: 'diagram_with_name' }));
    expect(screen.getByTestId('chord-caption')).toHaveTextContent('Am (Lá menor)');
    expect(screen.getByRole('button', { name: /Tocar acorde Am/ })).toBeInTheDocument();
  });

  it('audio_only: sem diagrama, botão de ouvir e dica de que não toca sozinho', async () => {
    const user = userEvent.setup();
    render(view({ ...base, chordId: 'am', chordPresentation: 'audio_only' }));
    expect(screen.queryByTestId('chord-diagram')).toBeNull();
    expect(screen.getByText(/O som nunca toca sozinho/)).toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Ouvir o acorde' }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent('Tocando…');
  });

  it('audio_only: erro de áudio aparece como alerta', async () => {
    const { AudioError } = await import('../audio/session');
    play.mockRejectedValueOnce(new AudioError('suspended'));
    const user = userEvent.setup();
    render(view({ ...base, chordId: 'am', chordPresentation: 'audio_only' }));
    await user.click(screen.getByRole('button', { name: 'Ouvir o acorde' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('O áudio está bloqueado');
  });

  it('as opções continuam sendo radios navegáveis', () => {
    render(view({ ...base, chordId: 'am' }));
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });
});
