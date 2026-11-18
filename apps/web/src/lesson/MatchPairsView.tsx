import { useMemo, useState } from 'react';
import type { MatchPairsExercise } from '@cifrai/content';
import { t, tp } from '../i18n';
import { CheckIcon } from '../components/ui/CheckIcon';
import { CrossIcon } from '../components/ui/CrossIcon';
import { shuffledIndices } from './shuffle';

export interface MatchPairsViewProps {
  exercise: MatchPairsExercise;
  locked: boolean;
  /** `null` enquanto faltam pares; array completo (ver `evaluateMatchPairs`) quando todos estão ligados. */
  onRespond: (response: number[] | null) => void;
}

type Side = 'left' | 'right';
interface Pending {
  side: Side;
  index: number;
}

/**
 * Dois toques ligam um par (qualquer coluna primeiro). Os itens são botões nativos: Tab/Enter/Espaço
 * bastam. O número do par aparece nos dois lados (não depende só de cor).
 */
export function MatchPairsView({ exercise, locked, onRespond }: MatchPairsViewProps) {
  const n = exercise.pairs.length;
  /** `rightOrder[pos]` = índice do conteúdo exibido na posição `pos` da coluna da direita. */
  const rightOrder = useMemo(() => shuffledIndices(n, exercise.id), [n, exercise.id]);
  /** `links[left]` = índice do conteúdo na direita, ou -1. */
  const [links, setLinks] = useState<number[]>(() => Array.from({ length: n }, () => -1));
  const [pending, setPending] = useState<Pending | null>(null);
  const [status, setStatus] = useState('');

  function commit(next: number[], message: string) {
    setLinks(next);
    setStatus(message);
    onRespond(next.every((value) => value >= 0) ? next : null);
  }

  function pick(side: Side, index: number) {
    if (locked) return;
    const linkedLeft = side === 'left' ? index : links.indexOf(index);
    if (linkedLeft >= 0 && (links[linkedLeft] ?? -1) >= 0) {
      const next = links.map((value, i) => (i === linkedLeft ? -1 : value));
      setPending(null);
      commit(next, t('lesson.pairs.status.unpaired'));
      return;
    }
    if (pending === null || pending.side === side) {
      setPending({ side, index });
      const text =
        (side === 'left' ? exercise.pairs[index]?.left : exercise.pairs[index]?.right) ?? '';
      setStatus(tp('lesson.pairs.status.selected', { text }));
      return;
    }
    const left = side === 'left' ? index : pending.index;
    const right = side === 'left' ? pending.index : index;
    const next = links.map((value, i) => (i === left ? right : value));
    setPending(null);
    const number = left + 1;
    commit(
      next,
      tp('lesson.pairs.status.paired', {
        left: exercise.pairs[left]?.left ?? '',
        right: exercise.pairs[right]?.right ?? '',
        n: number,
      }),
    );
  }

  const missing = links.filter((value) => value < 0).length;

  function renderItem(side: Side, index: number) {
    const pair = exercise.pairs[index];
    if (pair === undefined) return null;
    const text = side === 'left' ? pair.left : pair.right;
    const leftOfItem = side === 'left' ? index : links.indexOf(index);
    const linked = leftOfItem >= 0 && (links[leftOfItem] ?? -1) >= 0;
    const isPending = pending?.side === side && pending.index === index;
    const rightCorrect = linked && links[leftOfItem] === leftOfItem;
    const verdict = locked && linked ? (rightCorrect ? 'correct' : 'wrong') : undefined;
    return (
      <li key={`${side}-${index}`} className="list-none">
        <button
          type="button"
          className="pair-item"
          aria-pressed={isPending || linked}
          aria-disabled={locked || undefined}
          data-linked={linked}
          data-pending={isPending}
          data-state={verdict}
          data-testid={`pair-${side}-${index}`}
          onClick={() => pick(side, index)}
        >
          <span className="min-w-0 flex-1">{text}</span>
          {linked && (
            <span className="pair-item__badge">
              {tp('lesson.pairs.pairNumber', { n: leftOfItem + 1 })}
            </span>
          )}
          {isPending && <span className="pair-item__badge">{t('lesson.pairs.selected')}</span>}
          {verdict === 'correct' && (
            <span className="flex items-center gap-1 text-sm font-bold text-success">
              <CheckIcon />
              {t('lesson.pairs.right.ok')}
            </span>
          )}
          {verdict === 'wrong' && (
            <span className="flex items-center gap-1 text-sm font-bold text-danger">
              <CrossIcon />
              {t('lesson.pairs.right.wrong')}
            </span>
          )}
        </button>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="m-0 font-display text-2xl font-extrabold">{exercise.prompt}</h2>
      <p className="m-0 text-muted">{t('lesson.pairs.hint')}</p>
      <div className="grid grid-cols-2 gap-3">
        <ul className="m-0 flex flex-col gap-3 p-0" aria-label={t('lesson.pairs.left')}>
          {exercise.pairs.map((_, index) => renderItem('left', index))}
        </ul>
        <ul className="m-0 flex flex-col gap-3 p-0" aria-label={t('lesson.pairs.right')}>
          {rightOrder.map((index) => renderItem('right', index))}
        </ul>
      </div>
      <p className="m-0 text-sm font-bold text-muted">
        {missing > 0 ? tp('lesson.pairs.remaining', { n: missing }) : t('lesson.pairs.allPaired')}
      </p>
      <div role="status" aria-live="polite" className="sr-only">
        {status}
      </div>
    </div>
  );
}
