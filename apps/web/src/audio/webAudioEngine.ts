import type { ChordFrets } from './chordNotes';
import { chordToNotes, type ChordNote } from './chordNotes';
import type { ArpeggioOptions, AudioEngine, StrumOptions } from './engine';
import { DEFAULT_SYNTH, STRING_VOICES, synthesizePluck } from './karplusStrong';

const LEAD_S = 0.02;
const STOP_FADE_S = 0.06;
const NOTE_GAIN = 0.3;
const MASTER_GAIN = 0.8;
export const DEFAULT_STRUM_MS = 32;
export const DEFAULT_ARPEGGIO_MS = 320;

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export interface WebAudioEngineOptions {
  /** Injetável para testes (jitter de tempo/velocidade). */
  random?: () => number;
}

class WebAudioEngine implements AudioEngine {
  readonly kind = 'karplus-strong';
  private readonly cache = new Map<string, AudioBuffer>();
  private readonly master: GainNode;
  private readonly compressor: DynamicsCompressorNode;
  private voices = new Set<Voice>();
  private readonly random: () => number;

  constructor(
    private readonly ctx: AudioContext,
    options: WebAudioEngineOptions,
  ) {
    this.random = options.random ?? Math.random;
    this.master = ctx.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.master.connect(this.compressor);
    this.compressor.connect(ctx.destination);
  }

  private bufferFor(note: ChordNote): AudioBuffer {
    const key = `${note.stringIndex}:${note.fret}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    const voice = STRING_VOICES[note.stringIndex] ?? STRING_VOICES[0];
    if (voice === undefined) throw new Error('sem voz de corda');
    const samples = synthesizePluck(note.frequency, this.ctx.sampleRate, voice, {
      ...DEFAULT_SYNTH,
      seed: note.stringIndex + 1,
    });
    const buffer = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    this.cache.set(key, buffer);
    return buffer;
  }

  private schedule(notes: ChordNote[], gapsMs: number[], velocities: number[]): number {
    this.stop();
    const base = this.ctx.currentTime + LEAD_S;
    let offset = 0;
    notes.forEach((note, i) => {
      offset += (gapsMs[i] ?? 0) / 1000;
      const source = this.ctx.createBufferSource();
      source.buffer = this.bufferFor(note);
      const gain = this.ctx.createGain();
      gain.gain.value = NOTE_GAIN * (velocities[i] ?? 1);
      source.connect(gain);
      gain.connect(this.master);
      const voice: Voice = { source, gain };
      this.voices.add(voice);
      source.onended = () => {
        this.voices.delete(voice);
        source.disconnect();
        gain.disconnect();
      };
      source.start(base + offset);
    });
    return base;
  }

  playChord(chord: ChordFrets, options: StrumOptions = {}): number {
    const all = chordToNotes(chord);
    const notes = options.direction === 'up' ? [...all].reverse() : all;
    const spacing = options.spacingMs ?? DEFAULT_STRUM_MS;
    const velocity = Math.min(1, Math.max(0, options.velocity ?? 0.85));
    // Jitter pequeno (+-10% do intervalo) e velocidade levemente variável: menos "robótico".
    const gaps = notes.map((_, i) => (i === 0 ? 0 : spacing * (0.9 + 0.2 * this.random())));
    const velocities = notes.map((_, i) => {
      const slope = options.direction === 'up' ? i / 6 : 1 - i / 12;
      return velocity * Math.min(1, slope * (0.92 + 0.08 * this.random()));
    });
    return this.schedule(notes, gaps, velocities);
  }

  playArpeggio(chord: ChordFrets, options: ArpeggioOptions = {}): number {
    const notes = chordToNotes(chord);
    const spacing = options.spacingMs ?? DEFAULT_ARPEGGIO_MS;
    const velocity = Math.min(1, Math.max(0, options.velocity ?? 0.85));
    const gaps = notes.map((_, i) => (i === 0 ? 0 : spacing));
    const velocities = notes.map(() => velocity * (0.94 + 0.06 * this.random()));
    return this.schedule(notes, gaps, velocities);
  }

  stop(): void {
    const now = this.ctx.currentTime;
    for (const voice of this.voices) {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + STOP_FADE_S);
      try {
        voice.source.stop(now + STOP_FADE_S);
      } catch {
        // já terminou
      }
    }
    this.voices = new Set();
  }

  dispose(): void {
    this.stop();
    this.cache.clear();
    this.master.disconnect();
    this.compressor.disconnect();
  }
}

export function createWebAudioEngine(
  ctx: AudioContext,
  options: WebAudioEngineOptions = {},
): AudioEngine {
  return new WebAudioEngine(ctx, options);
}
