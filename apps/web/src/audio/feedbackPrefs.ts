import { create } from 'zustand';

export const FEEDBACK_SOUNDS_KEY = 'cifrai.feedbackSounds';

function readStored(): boolean {
  try {
    return localStorage.getItem(FEEDBACK_SOUNDS_KEY) !== '0';
  } catch {
    return true;
  }
}

interface FeedbackPrefs {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

/** Ligado por padrão; só o valor explícito '0' desliga. */
export const useFeedbackPrefs = create<FeedbackPrefs>((set) => ({
  enabled: readStored(),
  setEnabled: (enabled) => {
    try {
      localStorage.setItem(FEEDBACK_SOUNDS_KEY, enabled ? '1' : '0');
    } catch {
      // armazenamento indisponível: vale só nesta sessão
    }
    set({ enabled });
  },
}));

export const feedbackSoundsEnabled = (): boolean => useFeedbackPrefs.getState().enabled;
