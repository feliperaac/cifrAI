import { z } from 'zod';

/** ADR-0002 seção 1: envelope imutável do log de eventos de progresso. */
export const EVENT_TYPES = [
  'lesson.completed',
  'exercise.answered',
  'review.graded',
  'daily_goal.set',
  'practice.self_reported',
] as const;
export const EventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof EventTypeSchema>;

/** Versões de payload aceitas por tipo. Tipos novos entram só por adição. */
export const SUPPORTED_EVENT_VERSIONS = {
  'lesson.completed': [1],
} as const;

/** Limite do payload serializado em UTF-8 (ADR-0002). */
export const MAX_EVENT_PAYLOAD_BYTES = 2048;

const UUID_V4_OR_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** UUID v4 ou v7. O servidor nunca deduz tempo do UUID. */
export const EventUuidSchema = z.string().regex(UUID_V4_OR_V7, {
  message: 'UUID inválido; use a versão 4 ou 7.',
});

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone.includes('/') || zone === 'UTC';
  } catch {
    return false;
  }
}

export const TimeZoneSchema = z
  .string()
  .max(64)
  .refine(isValidTimeZone, { message: 'Fuso IANA inválido (ex.: America/Rio_Branco).' });

const payloadSize = (payload: unknown) => new TextEncoder().encode(JSON.stringify(payload)).length;

/** Apenas FATOS: nunca XP, streak nem datas de revisão. `strictObject` rejeita campos extras. */
export const LessonCompletedPayloadSchema = z
  .strictObject({
    lessonId: z.string().regex(/^u\d{2}\.l\d{2}$/),
    exercisesTotal: z.number().int().min(0).max(100),
    exercisesCorrect: z.number().int().min(0).max(100),
    /** Duração da lição em segundos, do "Começar" ao resultado. */
    durationSeconds: z.number().int().min(0).max(86_400),
  })
  .refine((p) => p.exercisesCorrect <= p.exercisesTotal, {
    message: 'exercisesCorrect não pode passar de exercisesTotal.',
    path: ['exercisesCorrect'],
  });
export type LessonCompletedPayload = z.infer<typeof LessonCompletedPayloadSchema>;

const envelopeShape = {
  eventId: EventUuidSchema,
  schemaVersion: z.number().int().min(1),
  contentVersion: z.string().min(1).max(64),
  deviceId: EventUuidSchema,
  clientSeq: z.number().int().min(1),
  clientTs: z.iso.datetime({ message: 'clientTs deve ser ISO-8601 em UTC (sufixo Z).' }),
  clientTz: TimeZoneSchema,
};

export const LessonCompletedEventSchema = z
  .strictObject({
    ...envelopeShape,
    type: z.literal('lesson.completed'),
    schemaVersion: z.literal(1),
    payload: LessonCompletedPayloadSchema,
  })
  .refine((event) => payloadSize(event.payload) <= MAX_EVENT_PAYLOAD_BYTES, {
    message: `Payload acima de ${MAX_EVENT_PAYLOAD_BYTES} bytes.`,
    path: ['payload'],
  });
export type LessonCompletedEvent = z.infer<typeof LessonCompletedEventSchema>;

/** Cresce por adição: os demais tipos do ADR entram aqui quando suas tarefas chegarem. */
export const ProgressEventSchema = LessonCompletedEventSchema;
export type ProgressEvent = z.infer<typeof ProgressEventSchema>;

/** Data local (YYYY-MM-DD) de um instante UTC num fuso IANA. ADR-0002 item 3: usa o `clientTz` do evento. */
export function localDateOf(isoUtc: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(isoUtc));
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}
