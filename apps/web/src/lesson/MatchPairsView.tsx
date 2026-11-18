import { useMemo, useState } from 'react';
import type { MatchPairsExercise } from '@cifrai/content';
import { t, tp } from '../i18n';
import { ChordDiagram } from '../components/ChordDiagram';
import { CheckIcon } from '../components/ui/CheckIcon';
import { CrossIcon } from '../components/ui/CrossIcon';
import { pairSideText } from './exerciseLogic';
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

  /** Rótulo de um item. Item com diagrama só ganha o nome depois de verificar (o nome é a resposta). */
  function labelOf(side: Side, index: number): string {
    const pair = exercise.pairs[index];
    if (pair === undefined) return '';
    const isChord = (side === 'left' ? pair.leftChordId : pair.rightChordId) !== undefined;
    if (!isChord || locked) return pairSideText(pair, side);
    const position = side === 'left' ? index : rightOrder.indexOf(index);
    return tp('lesson.pairs.diagramN', { n: position + 1 });
  }

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
      setStatus(tp('lesson.pairs.status.selected', { text: labelOf(side, index) }));
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
        left: labelOf('left', left),
        right: labelOf('right', right),
        n: number,
      }),
    );
  }

  const missing = links.filter((value) => value < 0).length;

  function renderItem(side: Side, index: number) {
    const pair = exercise.pairs[index];
    if (pair === undefined) return null;
    const chordId = side === 'left' ? pair.leftChordId : pair.rightChordId;
    const text = labelOf(side, index);
    const leftOfItem = side === 'left' ? index : links.indexOf(index);
    const linked = leftOfItem >= 0 && (links[leftOfItem] ?? -1) >= 0;
    const isPending = pending?.side === side && pending.index === index;
    const rightCorrect = linked && links[leftOfItem] === leftOfItem;
    const verdict = locked && linked ? (rightCorrect ? 'correct' : 'wrong') : undefined;
    const pairNumber = leftOfItem + 1;
    const ariaLabel =
      chordId === undefined
        ? undefined
        : [
            text,
            linked ? tp('lesson.pairs.pairNumber', { n: pairNumber }) : null,
            isPending ? t('lesson.pairs.selected') : null,
          ]
            .filter((part) => part !== null)
            .join(', ');
    return (
      <li key={`${side}-${index}`} className="list-none">
        <button
          type="button"
          className="pair-item"
          aria-label={ariaLabel}
          aria-pressed={isPending || linked}
          aria-disabled={locked || undefined}
          data-linked={linked}
          data-pending={isPending}
          data-state={verdict}
          data-testid={`pair-${side}-${index}`}
          onClick={() => pick(side, index)}
        >
          {chordId === undefined ? (
            <span className="min-w-0 flex-1">{text}</span>
          ) : (
            <span
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
              data-testid="pair-chord"
            >
              <span className="block w-28 max-w-full">
                <ChordDiagram chordId={chordId} hideName showFullName={false} />
              </span>
              {locked && <span className="text-center text-sm font-bold">{text}</span>}
            </span>
          )}
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
