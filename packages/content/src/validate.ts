import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasChord } from '@cifrai/shared';
import { SCHEMA_VERSION, UnitSchema, type Course, type Unit } from './schema.js';

export interface RawUnitFile {
  /** Nome do arquivo (ex.: `u00.json`). */
  file: string;
  data: unknown;
}

export interface ContentIssue {
  file: string;
  path: string;
  message: string;
}

export interface CatalogLessonEntry {
  id: string;
  unitId: string;
  status: 'active' | 'retired';
  xp: number;
  exerciseCount: number;
}

export interface ValidationSummary {
  units: number;
  lessons: number;
  activeLessons: number;
  retiredLessons: number;
  exercises: number;
  totalXp: number;
}

export interface ValidationResult {
  ok: boolean;
  issues: ContentIssue[];
  warnings: string[];
  summary: ValidationSummary;
  course: Course | null;
  catalog: CatalogLessonEntry[];
}

const LYRICS_KEY = /^(lyrics?|letras?|lyric_?text|full_?lyrics?)$/i;
const SAFETY_KEYWORDS = /pausa|dor\b|doer|desconforto/i;

export function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((acc, part) => {
    if (typeof part === 'number') return `${acc}[${part}]`;
    const key = String(part);
    return acc === '' ? key : `${acc}.${key}`;
  }, '');
}

function findLyricsKeys(value: unknown, path: (string | number)[], out: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findLyricsKeys(item, [...path, index], out));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (LYRICS_KEY.test(key)) out.push(formatPath([...path, key]));
      findLyricsKeys(child, [...path, key], out);
    }
  }
}

function checkHierarchy(file: string, unit: Unit, issues: ContentIssue[]): void {
  const add = (path: string, message: string) => issues.push({ file, path, message });

  if (file !== `${unit.id}.json`) {
    add('id', `O arquivo deve se chamar "${unit.id}.json" (o nome segue o ID da unidade).`);
  }
  unit.lessons.forEach((lesson, li) => {
    const lp = `lessons[${li}]`;
    if (!lesson.id.startsWith(`${unit.id}.`)) {
      add(`${lp}.id`, `A lição "${lesson.id}" não pertence à unidade "${unit.id}".`);
    }
    if (lesson.exerciseCount !== lesson.exercises.length) {
      add(
        `${lp}.exerciseCount`,
        `exerciseCount=${lesson.exerciseCount}, mas a lista tem ${lesson.exercises.length} exercícios.`,
      );
    }
    if (
      lesson.category === 'technique' &&
      lesson.safetyNotice !== undefined &&
      !SAFETY_KEYWORDS.test(lesson.safetyNotice)
    ) {
      add(`${lp}.safetyNotice`, 'O aviso deve mencionar pausa, dor ou desconforto.');
    }
    lesson.exercises.forEach((exercise, ei) => {
      if (
        (exercise.type === 'build_chord' || exercise.type === 'multiple_choice') &&
        exercise.chordId !== undefined &&
        !hasChord(exercise.chordId)
      ) {
        add(
          `${lp}.exercises[${ei}].chordId`,
          `Acorde "${exercise.chordId}" não existe no catálogo de @cifrai/shared.`,
        );
      }
      const extraChordIds =
        exercise.type === 'practice_timer'
          ? (exercise.chordIds ?? []).map((chordId, ci) => [`chordIds[${ci}]`, chordId] as const)
          : exercise.type === 'match_pairs'
            ? exercise.pairs.flatMap((pair, pi) =>
                (['leftChordId', 'rightChordId'] as const).flatMap((key) =>
                  pair[key] === undefined ? [] : [[`pairs[${pi}].${key}`, pair[key]] as const],
                ),
              )
            : [];
      for (const [path, chordId] of extraChordIds) {
        if (!hasChord(chordId)) {
          add(
            `${lp}.exercises[${ei}].${path}`,
            `Acorde "${chordId}" não existe no catálogo de @cifrai/shared.`,
          );
        }
      }
      if (!exercise.id.startsWith(`${lesson.id}.`)) {
        add(
          `${lp}.exercises[${ei}].id`,
          `O exercício "${exercise.id}" não pertence à lição "${lesson.id}".`,
        );
      }
    });
  });
}

function checkCatalog(
  units: { file: string; unit: Unit }[],
  issues: ContentIssue[],
): CatalogLessonEntry[] {
  const seen = new Map<string, string>();
  const claim = (id: string, file: string, path: string) => {
    const previous = seen.get(id);
    if (previous !== undefined) {
      issues.push({ file, path, message: `ID repetido "${id}" (já usado em ${previous}).` });
    } else {
      seen.set(id, `${file}:${path}`);
    }
  };

  const catalog: CatalogLessonEntry[] = [];
  const lessonOrder = new Map<string, number>();
  for (const { file, unit } of units) {
    claim(unit.id, file, 'id');
    unit.lessons.forEach((lesson, li) => {
      lessonOrder.set(lesson.id, lessonOrder.size);
      claim(lesson.id, file, `lessons[${li}].id`);
      lesson.exercises.forEach((exercise, ei) =>
        claim(exercise.id, file, `lessons[${li}].exercises[${ei}].id`),
      );
      catalog.push({
        id: lesson.id,
        unitId: unit.id,
        status: lesson.status,
        xp: lesson.xp,
        exerciseCount: lesson.exercises.length,
      });
    });
  }

  for (const { file, unit } of units) {
    unit.lessons.forEach((lesson, li) => {
      const own = lessonOrder.get(lesson.id) ?? -1;
      lesson.prerequisites.forEach((pre, pi) => {
        const path = `lessons[${li}].prerequisites[${pi}]`;
        const preOrder = lessonOrder.get(pre);
        if (preOrder === undefined) {
          issues.push({ file, path, message: `Pré-requisito "${pre}" não existe no catálogo.` });
        } else if (preOrder >= own) {
          issues.push({
            file,
            path,
            message: `Pré-requisito "${pre}" deve vir antes da lição (sem ciclos nem referência futura).`,
          });
        }
      });
    });
  }
  return catalog;
}

export function validateUnitFiles(files: RawUnitFile[]): ValidationResult {
  const issues: ContentIssue[] = [];
  const warnings: string[] = [];
  const parsed: { file: string; unit: Unit }[] = [];

  for (const { file, data } of files) {
    const lyrics: string[] = [];
    findLyricsKeys(data, [], lyrics);
    for (const path of lyrics) {
      issues.push({
        file,
        path,
        message: 'Letra de música não é permitida (direitos autorais, CLAUDE.md seção 10).',
      });
    }
    const result = UnitSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({ file, path: formatPath(issue.path), message: issue.message });
      }
      continue;
    }
    checkHierarchy(file, result.data, issues);
    parsed.push({ file, unit: result.data });
  }

  const courseIds = new Set(parsed.map(({ unit }) => unit.courseId));
  if (courseIds.size > 1) {
    for (const { file, unit } of parsed) {
      issues.push({
        file,
        path: 'courseId',
        message: `Todas as unidades devem ter o mesmo courseId (encontrados: ${[...courseIds].join(', ')}); este arquivo usa "${unit.courseId}".`,
      });
    }
  }

  const catalog = checkCatalog(parsed, issues);
  if (files.length === 0) {
    warnings.push(
      'Nenhuma unidade encontrada em units/. Passa por enquanto: o conteúdo real é da fase F2.',
    );
  }

  const summary: ValidationSummary = {
    units: parsed.length,
    lessons: catalog.length,
    activeLessons: catalog.filter((entry) => entry.status === 'active').length,
    retiredLessons: catalog.filter((entry) => entry.status === 'retired').length,
    exercises: catalog.reduce((total, entry) => total + entry.exerciseCount, 0),
    totalXp: catalog.reduce((total, entry) => total + entry.xp, 0),
  };

  const courseId = [...courseIds][0];
  const course: Course | null =
    courseIds.size === 1 && courseId !== undefined && issues.length === 0
      ? { schemaVersion: SCHEMA_VERSION, id: courseId, units: parsed.map(({ unit }) => unit) }
      : null;

  return { ok: issues.length === 0, issues, warnings, summary, course, catalog };
}

export function loadUnitFiles(dir: string): { files: RawUnitFile[]; issues: ContentIssue[] } {
  const files: RawUnitFile[] = [];
  const issues: ContentIssue[] = [];
  let names: string[];
  try {
    names = readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .sort();
  } catch {
    return { files, issues };
  }
  for (const name of names) {
    if (!/^u\d{2}\.json$/.test(name)) {
      issues.push({
        file: name,
        path: '',
        message: 'Nome inválido; use uNN.json (ex.: u00.json).',
      });
      continue;
    }
    try {
      files.push({
        file: name,
        data: JSON.parse(readFileSync(join(dir, name), 'utf8')) as unknown,
      });
    } catch (error) {
      issues.push({
        file: name,
        path: '',
        message: `JSON inválido: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  return { files, issues };
}

export function validateUnitsDir(dir: string): ValidationResult {
  const loaded = loadUnitFiles(dir);
  const result = validateUnitFiles(loaded.files);
  const issues = [...loaded.issues, ...result.issues];
  const warnings =
    loaded.files.length === 0 && loaded.issues.length > 0
      ? result.warnings.filter((w) => !w.startsWith('Nenhuma unidade'))
      : result.warnings;
  return {
    ...result,
    issues,
    warnings,
    ok: issues.length === 0,
    course: issues.length === 0 ? result.course : null,
  };
}
