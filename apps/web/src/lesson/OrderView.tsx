import { useMemo, useState } from 'react';
import type { OrderExercise } from '@cifrai/content';
import { t, tp } from '../i18n';
import { CheckIcon } from '../components/ui/CheckIcon';
import { CrossIcon } from '../components/ui/CrossIcon';
import { moveItem } from './exerciseLogic';
import { shuffledIndices } from './shuffle';

export interface OrderViewProps {
  exercise: OrderExercise;
  locked: boolean;
  /** Índices (no conteúdo) na ordem atual; só chamado depois da primeira mudança. */
  onRespond: (response: number[]) => void;
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.5em"
      height="1.5em"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
    </svg>
  );
}

/** Ordenação por botões (sem arrastar): funciona com teclado, leitor de tela e toque. */
export function OrderView({ exercise, locked, onRespond }: OrderViewProps) {
  const total = exercise.items.length;
  const initial = useMemo(() => shuffledIndices(total, exercise.id), [total, exercise.id]);
  const [order, setOrder] = useState<number[]>(initial);
  const [status, setStatus] = useState('');

  function move(position: number, delta: -1 | 1) {
    if (locked) return;
    const target = position + delta;
    if (target < 0 || target >= total) return;
    const next = moveItem(order, position, target);
    setOrder(next);
    onRespond(next);
    const item = exercise.items[order[position] as number] ?? '';
    setStatus(tp('lesson.order.moved', { item, pos: target + 1, total }));
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="m-0 font-display text-2xl font-extrabold">{exercise.prompt}</h2>
      <p className="m-0 text-muted">{t('lesson.order.hint')}</p>
      <ol className="m-0 flex flex-col gap-3 p-0" aria-label={t('lesson.order.listLabel')}>
        {order.map((itemIndex, position) => {
          const item = exercise.items[itemIndex] ?? '';
          const verdict = locked ? (itemIndex === position ? 'correct' : 'wrong') : undefined;
          return (
            <li
              key={itemIndex}
              className="order-item"
              data-state={verdict}
              data-testid={`order-item-${position}`}
            >
              <span className="order-item__pos" aria-hidden="true">
                {position + 1}
              </span>
              <span className="min-w-0 flex-1 text-lg font-semibold">
                <span className="sr-only">
                  {tp('lesson.order.position', { n: position + 1 })}:{' '}
                </span>
                {item}
              </span>
              {verdict === 'correct' && (
                <span className="flex items-center gap-1 text-sm font-bold text-success">
                  <CheckIcon />
                  {t('lesson.order.ok')}
                </span>
              )}
              {verdict === 'wrong' && (
                <span className="flex items-center gap-1 text-sm font-bold text-danger">
                  <CrossIcon />
                  {tp('lesson.order.shouldBe', { n: itemIndex + 1 })}
                </span>
              )}
              {!locked && (
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={tp('lesson.order.up', { item })}
                    aria-disabled={position === 0 || undefined}
                    onClick={() => move(position, -1)}
                  >
                    <Chevron up />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={tp('lesson.order.down', { item })}
                    aria-disabled={position === total - 1 || undefined}
                    onClick={() => move(position, 1)}
                  >
                    <Chevron up={false} />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div role="status" aria-live="polite" className="sr-only">
        {status}
      </div>
    </div>
  );
}
