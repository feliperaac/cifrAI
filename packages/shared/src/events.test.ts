import { describe, expect, it } from 'vitest';
import {
  LessonCompletedEventSchema,
  ProgressEventSchema,
  isValidTimeZone,
  localDateOf,
} from './events.js';

const valid = {
  eventId: '3f2b8f4e-6a1c-4d7e-9b52-1c0e5a7d9f10',
  type: 'lesson.completed',
  schemaVersion: 1,
  payload: { lessonId: 'u01.l02', exercisesTotal: 8, exercisesCorrect: 7, durationSeconds: 150 },
  contentVersion: 'dev',
  deviceId: '0190f0a2-7b3c-7a11-8c22-3d4e5f607182',
  clientSeq: 1,
  clientTs: '2026-11-15T12:00:00.000Z',
  clientTz: 'America/Rio_Branco',
};

describe('envelope do evento (ADR-0002)', () => {
  it('aceita um lesson.completed válido (eventId v4 e deviceId v7)', () => {
    expect(ProgressEventSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['eventId que não é UUID', { eventId: 'abc' }],
    ['UUID v1', { eventId: 'c232ab00-9414-11ec-b3c8-9f6bdeced846' }],
    ['clientSeq zero', { clientSeq: 0 }],
    ['clientTs com offset', { clientTs: '2026-11-15T12:00:00-05:00' }],
    ['clientTs sem hora', { clientTs: '2026-11-15' }],
    ['fuso inválido', { clientTz: 'Marte/Olympus' }],
    ['tipo desconhecido', { type: 'lesson.deleted' }],
    ['versão de payload não suportada', { schemaVersion: 2 }],
    ['campo extra no envelope', { xp: 20 }],
    ['contentVersion vazio', { contentVersion: '' }],
  ])('rejeita %s', (_name, patch) => {
    expect(LessonCompletedEventSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it('o payload carrega só fatos: XP e campos extras são rejeitados', () => {
    const withXp = { ...valid, payload: { ...valid.payload, xp: 20 } };
    expect(LessonCompletedEventSchema.safeParse(withXp).success).toBe(false);
  });

  it('rejeita acertos acima do total', () => {
    const bad = { ...valid, payload: { ...valid.payload, exercisesCorrect: 9 } };
    expect(LessonCompletedEventSchema.safeParse(bad).success).toBe(false);
  });
});

describe('fuso e data local', () => {
  it('valida fusos IANA', () => {
    expect(isValidTimeZone('America/Rio_Branco')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('xx')).toBe(false);
  });

  it('usa o fuso do evento: 02:00 UTC ainda é o dia anterior em Rio Branco (UTC-5)', () => {
    expect(localDateOf('2026-11-16T02:00:00.000Z', 'America/Rio_Branco')).toBe('2026-11-15');
    expect(localDateOf('2026-11-16T02:00:00.000Z', 'UTC')).toBe('2026-11-16');
  });
});
