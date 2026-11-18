import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { devLesson } from '../pages/dev/fixtureLessons';
import { useFeedbackPrefs } from '../audio/feedbackPrefs';
import { LessonPlayer } from './LessonPlayer';

const playFeedbackFromGesture = vi.hoisted(() => vi.fn());
vi.mock('../audio/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../audio/session')>()),
  playFeedbackFromGesture,
}));

const mc = {
  ...devLesson,
  exercises: devLesson.exercises.filter((e) => e.type === 'multiple_choice').slice(0, 2),
  exerciseCount: 2,
};

async function answer(user: ReturnType<typeof userEvent.setup>, option: string) {
  await user.click(screen.getByRole('radio', { name: option }));
  await user.click(screen.getByRole('button', { name: 'Verificar' }));
}

describe('LessonPlayer: sons de feedback', () => {
  beforeEach(() => {
    playFeedbackFromGesture.mockReset().mockResolvedValue(undefined);
    useFeedbackPrefs.getState().setEnabled(true);
  });
  afterEach(() => useFeedbackPrefs.getState().setEnabled(true));

  it('toca uma vez por feedback (certo, errado) e uma vez ao concluir', async () => {
    const user = userEvent.setup();
    render(<LessonPlayer lesson={mc} onExit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Começar' }));
    expect(playFeedbackFromGesture).not.toHaveBeenCalled();

    await answer(user, '6');
    expect(playFeedbackFromGesture.mock.calls).toEqual([['correct']]);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(playFeedbackFromGesture).toHaveBeenCalledTimes(1);

    await answer(user, 'Lá (5ª)');
    expect(playFeedbackFromGesture.mock.calls.at(-1)).toEqual(['wrong']);
    expect(playFeedbackFromGesture).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Ver resultado' }));
    expect(playFeedbackFromGesture.mock.calls.at(-1)).toEqual(['complete']);
    expect(playFeedbackFromGesture).toHaveBeenCalledTimes(3);
  });

  it('com sons desligados não toca nada', async () => {
    useFeedbackPrefs.getState().setEnabled(false);
    const user = userEvent.setup();
    render(<LessonPlayer lesson={mc} onExit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Começar' }));
    await answer(user, '6');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await answer(user, 'Lá (5ª)');
    await user.click(screen.getByRole('button', { name: 'Ver resultado' }));
    expect(playFeedbackFromGesture).not.toHaveBeenCalled();
  });

  it('falha de áudio (rejeição ou exceção síncrona) não quebra a lição', async () => {
    const user = userEvent.setup();
    playFeedbackFromGesture.mockRejectedValueOnce(new Error('boom'));
    playFeedbackFromGesture.mockImplementationOnce(() => {
      throw new Error('sync');
    });
    render(<LessonPlayer lesson={mc} onExit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Começar' }));
    await answer(user, '6');
    expect(screen.getByText('Certo!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await answer(user, 'Lá (5ª)');
    expect(screen.getByText('Quase lá!')).toBeInTheDocument();
  });
});
