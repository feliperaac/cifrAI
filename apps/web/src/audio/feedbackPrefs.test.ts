import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FEEDBACK_SOUNDS_KEY, useFeedbackPrefs } from './feedbackPrefs';

describe('preferência "Sons de feedback"', () => {
  beforeEach(() => localStorage.clear());

  it('ligada por padrão e persiste ao alternar', () => {
    vi.resetModules();
    expect(useFeedbackPrefs.getState().enabled).toBe(true);
    useFeedbackPrefs.getState().setEnabled(false);
    expect(localStorage.getItem(FEEDBACK_SOUNDS_KEY)).toBe('0');
    useFeedbackPrefs.getState().setEnabled(true);
    expect(localStorage.getItem(FEEDBACK_SOUNDS_KEY)).toBe('1');
  });

  it('lê "0" salvo como desligada e valor estranho como ligada', async () => {
    localStorage.setItem(FEEDBACK_SOUNDS_KEY, '0');
    vi.resetModules();
    expect((await import('./feedbackPrefs')).useFeedbackPrefs.getState().enabled).toBe(false);
    localStorage.setItem(FEEDBACK_SOUNDS_KEY, 'xyz');
    vi.resetModules();
    expect((await import('./feedbackPrefs')).useFeedbackPrefs.getState().enabled).toBe(true);
  });
});
