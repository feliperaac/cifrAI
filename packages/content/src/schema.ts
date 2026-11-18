import { CHORD_ID_PATTERN } from '@cifrai/shared';
import { z } from 'zod';

export const SCHEMA_VERSION = 1;
/** Teto de XP por lição. O ADR-0002 propõe teto diário de 500; uma lição não deve passar de 1/5 disso. */
export const MAX_LESSON_XP = 100;
export const MAX_EXERCISES_PER_LESSON = 20;

export const ID_PATTERNS = {
  course: /^c\d{2}$/,
  unit: /^u\d{2}$/,
  lesson: /^u\d{2}\.l\d{2}$/,
  exercise: /^u\d{2}\.l\d{2}\.e\d{2}$/,
  chord: CHORD_ID_PATTERN,
} as const;

const text = (max = 500) =>
  z
    .string()
    .max(max, { message: `Texto longo demais (máximo ${max} caracteres).` })
    .refine((value) => value.trim().length > 0, {
      message: 'O texto não pode ser vazio nem só espaços.',
    });

const id = (pattern: RegExp, example: string) =>
  z.string().regex(pattern, { message: `ID inválido; formato esperado, por exemplo: ${example}.` });

export const CourseIdSchema = id(ID_PATTERNS.course, 'c01');
export const UnitIdSchema = id(ID_PATTERNS.unit, 'u02');
export const LessonIdSchema = id(ID_PATTERNS.lesson, 'u02.l03');
export const ExerciseIdSchema = id(ID_PATTERNS.exercise, 'u02.l03.e01');
export const ChordIdSchema = id(ID_PATTERNS.chord, 'em, d7, f-barre');

export const LESSON_CATEGORIES = [
  'concept',
  'technique',
  'chord',
  'rhythm',
  'song',
  'review',
] as const;
export const LessonCategorySchema = z.enum(LESSON_CATEGORIES);

export const LESSON_STATUSES = ['active', 'retired'] as const;
export const LessonStatusSchema = z.enum(LESSON_STATUSES);

export const SOURCE_KINDS = ['public-domain', 'folk', 'original'] as const;

const exerciseBase = {
  id: ExerciseIdSchema,
  prompt: text(),
  hint: text().optional(),
  explanation: text(),
};

const optionSchema = z.strictObject({ id: z.string().regex(/^[a-z0-9]{1,8}$/), text: text(200) });

/**
 * Como o acorde de um `multiple_choice` é apresentado (só vale com `chordId`):
 * - `diagram`: diagrama tocável com a cifra escondida até a resposta (o nome costuma ser a resposta);
 * - `diagram_with_name`: diagrama tocável com o nome por extenso sempre visível;
 * - `audio_only`: só o botão de ouvir, sem diagrama (exercício "ouça e escolha").
 */
export const CHORD_PRESENTATIONS = ['diagram', 'diagram_with_name', 'audio_only'] as const;
export const ChordPresentationSchema = z.enum(CHORD_PRESENTATIONS);

export const MultipleChoiceExerciseSchema = z.strictObject({
  ...exerciseBase,
  type: z.literal('multiple_choice'),
  options: z.array(optionSchema).min(2).max(6),
  correctOptionId: z.string(),
  /** Opcional e retrocompatível: acorde do catálogo de `@cifrai/shared`, que o aluno pode ouvir. */
  chordId: ChordIdSchema.optional(),
  chordPresentation: ChordPresentationSchema.optional(),
});

/**
 * Cada lado do par é texto OU um acorde do catálogo: `left` xor `leftChordId`, `right` xor `rightChordId`.
 * O lado com `*ChordId` é renderizado como diagrama SEM nome (o nome por extenso só aparece no feedback).
 */
export const MatchPairSchema = z.strictObject({
  left: text(120).optional(),
  leftChordId: ChordIdSchema.optional(),
  right: text(120).optional(),
  rightChordId: ChordIdSchema.optional(),
});

export const MatchPairsExerciseSchema = z.strictObject({
  ...exerciseBase,
  type: z.literal('match_pairs'),
  pairs: z.array(MatchPairSchema).min(2).max(6),
});

export const OrderExerciseSchema = z.strictObject({
  ...exerciseBase,
  type: z.literal('order'),
  /** Itens na ordem CORRETA; a UI embaralha. */
  items: z.array(text(120)).min(2).max(8),
});

export const BuildChordExerciseSchema = z.strictObject({
  ...exerciseBase,
  type: z.literal('build_chord'),
  /** Referência; o diagrama (frets/fingers/barre) vem do catálogo de `@cifrai/shared`; o validador exige que exista. */
  chordId: ChordIdSchema,
});

export const PracticeTimerExerciseSchema = z.strictObject({
  ...exerciseBase,
  type: z.literal('practice_timer'),
  durationSeconds: z.number().int().min(10).max(600),
  /** Opcional: acordes do catálogo mostrados como diagramas (com nome) para o aluno treinar. */
  chordIds: z.array(ChordIdSchema).min(1).max(4).optional(),
});

const normalize = (value: string): string => value.trim().toLowerCase();

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const value of values.map(normalize)) {
    if (seen.has(value)) dup.add(value);
    seen.add(value);
  }
  return [...dup];
}

type Fail = (path: (string | number)[], message: string) => void;

function checkMatchPairs(pairs: z.infer<typeof MatchPairSchema>[], fail: Fail) {
  for (const side of ['left', 'right'] as const) {
    const key = `${side}ChordId` as const;
    const keys: string[] = [];
    let chordSides = 0;
    pairs.forEach((pair, index) => {
      const hasText = pair[side] !== undefined;
      const hasChord = pair[key] !== undefined;
      if (hasText === hasChord) {
        fail(['pairs', index], `Informe ${side} (texto) ou ${key} (acorde), um dos dois.`);
        return;
      }
      if (hasChord) chordSides += 1;
      keys.push(`${hasChord ? 'c:' : 't:'}${pair[hasChord ? key : side] ?? ''}`);
    });
    if (chordSides > 0 && chordSides < pairs.length) {
      fail(
        ['pairs'],
        `A coluna ${side === 'left' ? 'da esquerda' : 'da direita'} mistura texto e acordes.`,
      );
    }
    if (duplicates(keys).length > 0) {
      fail(
        ['pairs'],
        `Há itens repetidos na coluna ${side === 'left' ? 'da esquerda' : 'da direita'}.`,
      );
    }
  }
  if (
    pairs.some((pair) => pair.leftChordId !== undefined) &&
    pairs.some((pair) => pair.rightChordId !== undefined)
  ) {
    fail(['pairs'], 'Só um lado pode ter diagramas (o outro lado é o nome ou texto).');
  }
}

export const ExerciseSchema = z
  .discriminatedUnion('type', [
    MultipleChoiceExerciseSchema,
    MatchPairsExerciseSchema,
    OrderExerciseSchema,
    BuildChordExerciseSchema,
    PracticeTimerExerciseSchema,
  ])
  .superRefine((exercise, ctx) => {
    const fail = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    if (exercise.type === 'multiple_choice') {
      const ids = exercise.options.map((option) => option.id);
      if (duplicates(ids).length > 0) fail(['options'], 'IDs de opção repetidos.');
      if (duplicates(exercise.options.map((option) => option.text)).length > 0) {
        fail(['options'], 'Há opções com texto repetido.');
      }
      if (!ids.includes(exercise.correctOptionId)) {
        fail(['correctOptionId'], 'A resposta correta não está entre as opções.');
      }
      if (exercise.chordPresentation !== undefined && exercise.chordId === undefined) {
        fail(['chordPresentation'], 'chordPresentation exige chordId.');
      }
    } else if (exercise.type === 'practice_timer') {
      if (
        exercise.chordIds !== undefined &&
        new Set(exercise.chordIds).size !== exercise.chordIds.length
      ) {
        fail(['chordIds'], 'Há acordes repetidos em chordIds.');
      }
    } else if (exercise.type === 'match_pairs') {
      checkMatchPairs(exercise.pairs, fail);
    } else if (exercise.type === 'order') {
      if (duplicates(exercise.items).length > 0)
        fail(['items'], 'Há itens repetidos na ordenação.');
    }
  });

export const SourceSchema = z
  .strictObject({
    kind: z.enum(SOURCE_KINDS),
    title: text(200),
    /** Onde a origem foi verificada (citação ou URL). Obrigatória para folk e public-domain. */
    reference: text(300).optional(),
    license: text(100).optional(),
  })
  .superRefine((source, ctx) => {
    if (source.kind !== 'original' && source.reference === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['reference'],
        message: 'Músicas folclóricas ou de domínio público exigem a fonte verificada.',
      });
    }
  });

export const LessonSchema = z
  .strictObject({
    id: LessonIdSchema,
    title: text(120),
    objective: text(300),
    category: LessonCategorySchema,
    status: LessonStatusSchema,
    xp: z.number().int().min(1).max(MAX_LESSON_XP),
    exerciseCount: z.number().int().min(1).max(MAX_EXERCISES_PER_LESSON),
    prerequisites: z.array(LessonIdSchema),
    safetyNotice: text(400).optional(),
    source: SourceSchema.optional(),
    exercises: z.array(ExerciseSchema).min(1).max(MAX_EXERCISES_PER_LESSON),
  })
  .superRefine((lesson, ctx) => {
    if (lesson.category === 'technique' && lesson.safetyNotice === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['safetyNotice'],
        message:
          'Lições de técnica exigem safetyNotice (pausas, sem dor, parar se houver desconforto).',
      });
    }
    if (lesson.category === 'song' && lesson.source === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['source'],
        message: 'Lições de música exigem source (public-domain, folk ou original).',
      });
    }
  });

export const UnitSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  courseId: CourseIdSchema,
  id: UnitIdSchema,
  title: text(120),
  description: text(400),
  lessons: z.array(LessonSchema).min(1),
});

export type Exercise = z.infer<typeof ExerciseSchema>;
export type MultipleChoiceExercise = z.infer<typeof MultipleChoiceExerciseSchema>;
export type MatchPairsExercise = z.infer<typeof MatchPairsExerciseSchema>;
export type OrderExercise = z.infer<typeof OrderExerciseSchema>;
export type BuildChordExercise = z.infer<typeof BuildChordExerciseSchema>;
export type PracticeTimerExercise = z.infer<typeof PracticeTimerExerciseSchema>;
export type ChordPresentation = z.infer<typeof ChordPresentationSchema>;
export type ExerciseType = Exercise['type'];
export type Source = z.infer<typeof SourceSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type LessonCategory = z.infer<typeof LessonCategorySchema>;
export type LessonStatus = z.infer<typeof LessonStatusSchema>;
export type Unit = z.infer<typeof UnitSchema>;
/** Curso = unidades do mesmo `courseId`, montado pelo validador a partir de `units/*.json`. */
export interface Course {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  units: Unit[];
}
