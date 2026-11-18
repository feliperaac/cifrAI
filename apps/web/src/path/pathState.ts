import type { CatalogLesson, CatalogUnit } from './catalog';

export type NodeState = 'locked' | 'current' | 'done';

export interface PathLesson {
  lesson: CatalogLesson;
  /** Posição (1-based) entre as lições visíveis da unidade. */
  number: number;
  state: NodeState;
}

export interface PathUnit {
  unit: CatalogUnit;
  state: NodeState;
  lessons: PathLesson[];
  done: number;
  total: number;
}

/**
 * Regra de desbloqueio (documentada em docs/design/trilha.md):
 * 1. A ordem de estudo é a ordem do currículo (unidades em ordem, lições em ordem), só com lições
 *    `active`. Lições `retired` somem da trilha e não bloqueiam ninguém.
 * 2. Uma lição concluída fica sempre concluída (pode ser refeita).
 * 3. Uma lição pendente só abre se a lição ativa imediatamente anterior estiver concluída E todos
 *    os seus `prerequisites` ativos e conhecidos estiverem concluídos. IDs desconhecidos ou
 *    aposentados em `prerequisites` são ignorados (não trancam o aluno por erro de catálogo).
 * 4. A primeira lição abre sempre. A "atual" é a primeira pendente que está aberta.
 * Unidade: concluída se todas as lições estão; atual se contém a lição atual; senão bloqueada.
 * Esta regra vale só na interface; a autoridade final é do servidor.
 */
export function buildPath(
  units: readonly CatalogUnit[],
  completed: ReadonlySet<string>,
): PathUnit[] {
  const visible = units
    .map((unit) => ({ unit, lessons: unit.lessons.filter((l) => l.status === 'active') }))
    .filter(({ lessons }) => lessons.length > 0);
  const known = new Set(visible.flatMap(({ lessons }) => lessons.map((l) => l.id)));

  let previousDone = true;
  let currentTaken = false;
  return visible.map(({ unit, lessons }) => {
    const path = lessons.map((lesson, index): PathLesson => {
      const done = completed.has(lesson.id);
      const prerequisitesDone = lesson.prerequisites.every(
        (id) => !known.has(id) || completed.has(id),
      );
      let state: NodeState;
      if (done) state = 'done';
      else if (previousDone && prerequisitesDone && !currentTaken) {
        state = 'current';
        currentTaken = true;
      } else state = 'locked';
      previousDone = done;
      return { lesson, number: index + 1, state };
    });
    const doneCount = path.filter((l) => l.state === 'done').length;
    const state: NodeState =
      doneCount === path.length
        ? 'done'
        : path.some((l) => l.state === 'current')
          ? 'current'
          : 'locked';
    return { unit, state, lessons: path, done: doneCount, total: path.length };
  });
}
