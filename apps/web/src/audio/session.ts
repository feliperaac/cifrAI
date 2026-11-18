import type { ChordFrets } from './chordNotes';
import type { AudioEngine, StrumOptions } from './engine';
import type { FeedbackKind } from './feedbackSounds';

export type AudioFailure = 'unsupported' | 'suspended' | 'failed';

export class AudioError extends Error {
  constructor(readonly reason: AudioFailure) {
    super(reason);
  }
}

type ContextConstructor = new () => AudioContext;

let ctx: AudioContext | null = null;
let enginePromise: Promise<AudioEngine> | null = null;
let holders = 0;

function contextConstructor(): ContextConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    AudioContext?: ContextConstructor;
    webkitAudioContext?: ContextConstructor;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

/** Carrega o módulo de síntese (chunk separado); seguro de chamar antes do gesto (ex.: hover/foco). */
export function preloadEngineModule(): Promise<typeof import('./webAudioEngine')> {
  return import('./webAudioEngine');
}

export function retainAudio(): () => void {
  holders += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    if (holders === 0) disposeAudio();
  };
}

export function disposeAudio(): void {
  const closing = ctx;
  const pending = enginePromise;
  ctx = null;
  enginePromise = null;
  void pending?.then((engine) => engine.dispose()).catch(() => undefined);
  void closing?.close().catch(() => undefined);
}

function acquireContext(): { context: AudioContext; resumed: Promise<void> } {
  const Ctor = contextConstructor();
  if (Ctor === undefined) throw new AudioError('unsupported');
  if (ctx === null || ctx.state === 'closed') {
    try {
      ctx = new Ctor();
    } catch {
      throw new AudioError('unsupported');
    }
    enginePromise = null;
  }
  const context = ctx;
  return { context, resumed: context.state === 'running' ? Promise.resolve() : context.resume() };
}

/**
 * Deve ser chamada SINCRONAMENTE dentro do handler de clique/toque: o AudioContext é criado e
 * retomado antes de qualquer `await` (autoplay/iOS). Nunca toca sozinho.
 */
export async function playChordFromGesture(
  chord: ChordFrets,
  options?: StrumOptions,
): Promise<void> {
  const { context, resumed } = acquireContext();
  enginePromise ??= preloadEngineModule().then((m) => m.createWebAudioEngine(context));
  try {
    const [engine] = await Promise.all([enginePromise, resumed]);
    if (context.state !== 'running') throw new AudioError('suspended');
    engine.playChord(chord, options);
  } catch (error) {
    if (error instanceof AudioError) throw error;
    enginePromise = null;
    throw new AudioError('failed');
  }
}

/**
 * Som de feedback da lição (síntese em chunk próprio). Mesmas regras de gesto de
 * `playChordFromGesture`; silencia o acorde em execução para não sobrepor. Não toca se o
 * contexto não ficar liberado.
 */
export async function playFeedbackFromGesture(kind: FeedbackKind): Promise<void> {
  const { context, resumed } = acquireContext();
  const loading = import('./feedbackSounds');
  try {
    const [module] = await Promise.all([loading, resumed]);
    if (context.state !== 'running') throw new AudioError('suspended');
    stopAudio();
    module.playFeedbackSound(context, kind);
  } catch (error) {
    if (error instanceof AudioError) throw error;
    throw new AudioError('failed');
  }
}

export function stopAudio(): void {
  void enginePromise?.then((engine) => engine.stop()).catch(() => undefined);
}
