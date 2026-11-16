import { useEffect, useState } from 'react';
import type { Lesson } from '@cifrai/content';

export type LessonLoad =
  | { status: 'loading' }
  | { status: 'ready'; lesson: Lesson }
  | { status: 'empty' }
  | { status: 'error' };

export type LessonLoader = (lessonId: string) => Promise<Lesson | null>;

/**
 * Fonte de lições. Em produção ainda não há API de conteúdo (pendência), então devolve `null`
 * (estado "não encontrada"). Em DEV serve a lição de fixture; o import dinâmico sai do bundle de produção.
 */
export const defaultLessonLoader: LessonLoader = import.meta.env.DEV
  ? async (lessonId) => {
      const { devLesson } = await import('../pages/dev/fixtureLessons');
      return devLesson.id === lessonId ? devLesson : null;
    }
  : () => Promise.resolve(null);

export function useLesson(
  lessonId: string | undefined,
  load: LessonLoader = defaultLessonLoader,
  attempt = 0,
): LessonLoad {
  const [result, setResult] = useState<{ key: string; value: LessonLoad } | null>(null);
  const key = `${lessonId ?? ''}#${attempt}`;

  useEffect(() => {
    let cancelled = false;
    if (lessonId === undefined) return;
    load(lessonId).then(
      (lesson) => {
        if (!cancelled)
          setResult({
            key,
            value: lesson === null ? { status: 'empty' } : { status: 'ready', lesson },
          });
      },
      () => {
        if (!cancelled) setResult({ key, value: { status: 'error' } });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [lessonId, load, key]);

  if (lessonId === undefined) return { status: 'empty' };
  return result?.key === key ? result.value : { status: 'loading' };
}
