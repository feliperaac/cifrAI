import type { ChordFrets } from './chordNotes';

export interface StrumOptions {
  /** Padrão: 'down' (6ª -> 1ª). */
  direction?: 'down' | 'up';
  /** Intervalo entre cordas em ms (padrão ~32). */
  spacingMs?: number;
  /** 0..1 (padrão 0.85). */
  velocity?: number;
}

export interface ArpeggioOptions {
  /** Intervalo entre notas em ms (padrão 320). */
  spacingMs?: number;
  velocity?: number;
}

/**
 * Contrato de áudio da UI. Hoje implementado por síntese (webAudioEngine); pode ser trocado
 * por amostras CC0 ou plugin nativo (ADR-0001) sem mudar os componentes.
 * `playChord`/`playArpeggio` devolvem o instante (AudioContext.currentTime) em que a 1ª nota começa.
 */
export interface AudioEngine {
  readonly kind: string;
  playChord(chord: ChordFrets, options?: StrumOptions): number;
  playArpeggio(chord: ChordFrets, options?: ArpeggioOptions): number;
  /** Silencia (com fade curto) tudo que está soando. */
  stop(): void;
  /** Libera recursos (não fecha o AudioContext, que pertence a quem o criou). */
  dispose(): void;
}
