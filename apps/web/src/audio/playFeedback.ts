import { feedbackSoundsEnabled } from './feedbackPrefs';
import type { FeedbackKind } from './feedbackSounds';
import { playFeedbackFromGesture } from './session';

/** Chamar direto de um handler de clique. Respeita a preferência e nunca lança. */
export function playFeedback(kind: FeedbackKind): void {
  if (!feedbackSoundsEnabled()) return;
  try {
    playFeedbackFromGesture(kind).catch(() => undefined);
  } catch {
    // áudio é um extra: falha nunca interrompe a lição
  }
}
