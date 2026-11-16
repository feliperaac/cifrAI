import type { ChordFrets } from './chordNotes';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioError,
  playChordFromGesture,
  preloadEngineModule,
  retainAudio,
  type AudioFailure,
} from './session';

export type ChordPlayerState = 'idle' | 'loading' | 'playing';

const PLAYING_FEEDBACK_MS = 700;

export interface ChordPlayer {
  state: ChordPlayerState;
  error: AudioFailure | null;
  /** Chamar direto do onClick/onKeyDown (gesto do usuário). */
  play: (chord: ChordFrets) => void;
  /** Adianta o download do chunk de áudio (hover/foco). Não cria AudioContext. */
  warmUp: () => void;
}

export function useChordPlayer(): ChordPlayer {
  const [state, setState] = useState<ChordPlayerState>('idle');
  const [error, setError] = useState<AudioFailure | null>(null);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const token = useRef(0);

  useEffect(() => {
    alive.current = true;
    const release = retainAudio();
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      release();
    };
  }, []);

  const play = useCallback((chord: ChordFrets) => {
    const mine = ++token.current;
    clearTimeout(timer.current);
    setError(null);
    setState('loading');
    playChordFromGesture(chord).then(
      () => {
        if (!alive.current || token.current !== mine) return;
        setState('playing');
        timer.current = setTimeout(() => {
          if (alive.current && token.current === mine) setState('idle');
        }, PLAYING_FEEDBACK_MS);
      },
      (reason: unknown) => {
        if (!alive.current || token.current !== mine) return;
        setState('idle');
        setError(reason instanceof AudioError ? reason.reason : 'failed');
      },
    );
  }, []);

  const warmUp = useCallback(() => {
    preloadEngineModule().catch(() => undefined);
  }, []);

  return { state, error, play, warmUp };
}
