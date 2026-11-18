import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon } from '../components/ui/CheckIcon';
import { LockIcon, PlayIcon } from '../components/Icons';
import { ProgressBar } from '../components/ui/ProgressBar';
import { t, tp, type MessageKey } from '../i18n';
import type { NodeState, PathLesson, PathUnit } from './pathState';

const LESSON_STATE: Record<NodeState, MessageKey> = {
  done: 'path.lesson.state.done',
  current: 'path.lesson.state.current',
  locked: 'path.lesson.state.locked',
};
const LESSON_BADGE: Record<NodeState, MessageKey> = {
  done: 'path.lesson.badge.done',
  current: 'path.lesson.badge.current',
  locked: 'path.lesson.badge.locked',
};
const UNIT_STATE: Record<NodeState, MessageKey> = {
  done: 'path.unit.state.done',
  current: 'path.unit.state.current',
  locked: 'path.unit.state.locked',
};

/** Desvio lateral (em passos) que faz a trilha serpentear; limitado por CSS, funciona de 360 a 1280 px. */
const WIND = [0, 1, 2, 1] as const;

function NodeDisc({ item }: { item: PathLesson }) {
  return (
    <span className="path-node__disc" aria-hidden="true">
      {item.state === 'done' ? (
        <CheckIcon />
      ) : item.state === 'locked' ? (
        <LockIcon />
      ) : (
        <PlayIcon />
      )}
    </span>
  );
}

function LessonNode({ item, wind }: { item: PathLesson; wind: number }) {
  const [hint, setHint] = useState(false);
  const { lesson, number, state } = item;
  const body = (
    <>
      <NodeDisc item={item} />
      <span className="path-node__text">
        <span className="path-node__title">
          {tp('path.lesson.name', { n: number, title: lesson.title })}
          <span className="sr-only">{`, ${t(LESSON_STATE[state])}`}</span>
        </span>
        <span className="path-node__meta" aria-hidden="true">
          <span className="path-node__badge">{t(LESSON_BADGE[state])}</span>
          <span className="tabular-nums">{tp('ui.xpTotal', { n: lesson.xp })}</span>
        </span>
        <span className="sr-only">{tp('ui.xpTotal', { n: lesson.xp })}</span>
      </span>
    </>
  );
  return (
    <li className="path-row" style={{ '--wind': wind } as CSSProperties}>
      {state === 'locked' ? (
        <>
          <button
            type="button"
            className="path-node"
            data-state={state}
            aria-disabled="true"
            onClick={() => setHint(true)}
          >
            {body}
          </button>
          <p role="status" className="path-hint">
            {hint ? t('path.lesson.lockedHint') : ''}
          </p>
        </>
      ) : (
        <Link
          to={`/licao/${lesson.id}`}
          className="path-node"
          data-state={state}
          aria-current={state === 'current' ? 'step' : undefined}
        >
          {body}
        </Link>
      )}
    </li>
  );
}

export interface UnitPathProps {
  units: PathUnit[];
}

/** Trilha vertical: cabeçalho por unidade e nós de lição (concluída, próxima ou bloqueada). */
export function UnitPath({ units }: UnitPathProps) {
  return (
    <ol className="m-0 flex list-none flex-col gap-8 p-0" aria-label={t('path.list.label')}>
      {units.map((pathUnit, index) => {
        const { unit, state, done, total } = pathUnit;
        const titleId = `unit-${unit.id}`;
        return (
          <li key={unit.id}>
            <section
              aria-labelledby={titleId}
              className="flex flex-col gap-4"
              data-unit-state={state}
            >
              <header className="path-unit-head" data-state={state}>
                <p className="m-0 flex items-center justify-between gap-2">
                  <span className="label-caps">{tp('path.unit.number', { n: index + 1 })}</span>
                  <span className="label-caps">{t(UNIT_STATE[state])}</span>
                </p>
                <h2 id={titleId} className="m-0 font-display text-xl font-extrabold">
                  {unit.title}
                </h2>
                <p className="m-0 text-sm">{unit.description}</p>
                <ProgressBar
                  tone="unit"
                  value={(done / total) * 100}
                  label={tp('path.unit.progressLabel', { title: unit.title })}
                />
                <p className="m-0 text-sm font-bold tabular-nums">
                  {tp('path.unit.progress', { done, total })}
                </p>
              </header>
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {pathUnit.lessons.map((item, i) => (
                  <LessonNode key={item.lesson.id} item={item} wind={WIND[i % WIND.length] ?? 0} />
                ))}
              </ol>
            </section>
          </li>
        );
      })}
    </ol>
  );
}
