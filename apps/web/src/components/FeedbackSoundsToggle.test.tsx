import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { FEEDBACK_SOUNDS_KEY, useFeedbackPrefs } from '../audio/feedbackPrefs';
import { FeedbackSoundsToggle } from './FeedbackSoundsToggle';

describe('FeedbackSoundsToggle', () => {
  afterEach(() => useFeedbackPrefs.getState().setEnabled(true));

  it('chave acessível, ligada por padrão, alterna e persiste', async () => {
    const user = userEvent.setup();
    render(<FeedbackSoundsToggle />);
    const sw = screen.getByRole('switch', { name: /Sons de feedback/ });
    expect(sw).toBeChecked();
    await user.click(sw);
    expect(sw).not.toBeChecked();
    expect(localStorage.getItem(FEEDBACK_SOUNDS_KEY)).toBe('0');
    expect(screen.getByText('Desligados')).toBeInTheDocument();
  });
});
