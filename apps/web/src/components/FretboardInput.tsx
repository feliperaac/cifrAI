import { useRef, useState, type KeyboardEvent } from 'react';
import { STRING_COUNT } from '@cifrai/shared';
import { t, tp } from '../i18n';

export interface FretboardInputProps {
  /** Casas por corda, da 6ª à 1ª: -1 muda, 0 solta, n casa apertada. */
  value: readonly number[];
  onChange: (frets: number[]) => void;
  /** Primeira casa exibida (casa absoluta). */
  baseFret?: number;
  /** Quantas casas exibir. */
  rows?: number;
  disabled?: boolean;
}

export const EMPTY_FRETS: readonly number[] = [0, 0, 0, 0, 0, 0];

export function describeFrets(frets: readonly number[]): string {
  return frets
    .map((fret, index) => {
      const string = STRING_COUNT - index;
      if (fret < 0) return tp('chord.stringMuted', { string });
      if (fret === 0) return tp('chord.stringOpen', { string });
      return tp('chord.stringFret', { string, fret });
    })
    .join(', ');
}

/**
 * Braço interativo enxuto (sem canvas): grade de botões nativos com alvo de 48 px.
 * Linha 0 = cabeçalho de cada corda (solta/abafada); as demais = casas.
 * Setas movem o foco (tabindex móvel), Enter/Espaço ativam. Reutilizável por outras telas.
 */
export function FretboardInput({
  value,
  onChange,
  baseFret = 1,
  rows = 4,
  disabled = false,
}: FretboardInputProps) {
  const [focus, setFocus] = useState({ row: 0, col: 0 });
  const cells = useRef(new Map<string, HTMLButtonElement>());

  function set(index: number, fret: number) {
    if (disabled) return;
    onChange(value.map((current, i) => (i === index ? fret : current)));
  }

  function onKeyDown(event: KeyboardEvent, row: number, col: number) {
    const delta: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move = delta[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const nextRow = Math.min(rows, Math.max(0, row + move[0]));
    const nextCol = Math.min(STRING_COUNT - 1, Math.max(0, col + move[1]));
    setFocus({ row: nextRow, col: nextCol });
    cells.current.get(`${nextRow}-${nextCol}`)?.focus();
  }

  function cellProps(row: number, col: number) {
    return {
      ref: (node: HTMLButtonElement | null) => {
        if (node === null) cells.current.delete(`${row}-${col}`);
        else cells.current.set(`${row}-${col}`, node);
      },
      tabIndex: focus.row === row && focus.col === col ? 0 : -1,
      onKeyDown: (event: KeyboardEvent) => onKeyDown(event, row, col),
      onFocus: () => setFocus({ row, col }),
    };
  }

  return (
    <div
      className="fretboard"
      role="group"
      aria-label={t('lesson.build.board')}
      data-disabled={disabled}
      style={{ gridTemplateColumns: `2.5rem repeat(${STRING_COUNT}, minmax(3rem, 1fr))` }}
    >
      <span aria-hidden="true" />
      {value.map((fret, col) => {
        const string = STRING_COUNT - col;
        const muted = fret < 0;
        return (
          <button
            key={`h-${string}`}
            type="button"
            className="fretboard__head"
            data-kind={muted ? 'muted' : fret === 0 ? 'open' : 'pressed'}
            aria-disabled={disabled || undefined}
            aria-label={tp(muted ? 'lesson.build.stringMuted' : 'lesson.build.stringOpen', {
              string,
            })}
            data-testid={`head-${string}`}
            {...cellProps(0, col)}
            onClick={() => set(col, muted ? 0 : -1)}
          >
            <span aria-hidden="true">{muted ? '✕' : fret === 0 ? '○' : String(fret)}</span>
            <span className="fretboard__string-number" aria-hidden="true">
              {string}
            </span>
          </button>
        );
      })}
      {Array.from({ length: rows }, (_, r) => {
        const fretNumber = baseFret + r;
        return [
          <span key={`l-${r}`} className="fretboard__fret-label" aria-hidden="true">
            {tp('chord.fretLabel', { fret: fretNumber })}
          </span>,
          ...value.map((fret, col) => {
            const string = STRING_COUNT - col;
            const pressed = fret === fretNumber;
            return (
              <button
                key={`c-${r}-${string}`}
                type="button"
                className="fretboard__cell"
                data-pressed={pressed}
                aria-pressed={pressed}
                aria-disabled={disabled || undefined}
                aria-label={tp('lesson.build.cell', { string, fret: fretNumber })}
                data-testid={`cell-${string}-${fretNumber}`}
                {...cellProps(r + 1, col)}
                onClick={() => set(col, pressed ? 0 : fretNumber)}
              >
                {pressed && <span className="fretboard__dot" aria-hidden="true" />}
              </button>
            );
          }),
        ];
      })}
    </div>
  );
}
