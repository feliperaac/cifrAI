import { useEffect, useState } from 'react';
import type { Lesson, Unit } from '@cifrai/content';

/** A trilha só precisa dos metadados; os exercícios vêm do `LessonLoader` ao abrir a lição. */
export type CatalogLesson = Pick<
  Lesson,
  'id' | 'title' | 'objective' | 'category' | 'status' | 'xp' | 'exerciseCount' | 'prerequisites'
>;
export type CatalogUnit = Pick<Unit, 'id' | 'title' | 'description'> & {
  lessons: CatalogLesson[];
};

/** Unidades em ordem de currículo (a ordem do array é a ordem de estudo). */
export type CurriculumLoader = () => Promise<CatalogUnit[]>;

/**
 * Fonte do currículo, substituível (API de conteúdo, F1-08/F1-15). Em produção ainda não há
 * conteúdo, então devolve vazio ("Em breve"). Em DEV serve o catálogo de fixture; o import
 * dinâmico sai do bundle de produção.
 */
export const defaultCurriculumLoader: CurriculumLoader = import.meta.env.DEV
  ? async () => (await import('../pages/dev/fixtureCatalog')).devCatalog
  : () => Promise.resolve([]);

export type CurriculumLoad =
  | { status: 'loading' }
  | { status: 'ready'; units: CatalogUnit[] }
  | { status: 'empty' }
  | { status: 'error' };

export function useCurriculum(
  load: CurriculumLoader = defaultCurriculumLoader,
  attempt = 0,
): CurriculumLoad {
  const [result, setResult] = useState<{ key: number; value: CurriculumLoad } | null>(null);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (units) => {
        if (!cancelled) {
          setResult({
            key: attempt,
            value: units.length === 0 ? { status: 'empty' } : { status: 'ready', units },
          });
        }
      },
      () => {
        if (!cancelled) setResult({ key: attempt, value: { status: 'error' } });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  return result?.key === attempt ? result.value : { status: 'loading' };
}
