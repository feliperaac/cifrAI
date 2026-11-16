import { chordDisplayName, getChord, type ChordShape } from '@cifrai/shared';
import type { CSSProperties } from 'react';
import { useChordPlayer } from '../audio/useChordPlayer';
import { t, tp, type MessageKey } from '../i18n';
import {
  DOT_RADIUS,
  FRET_HEIGHT,
  GRID_LEFT,
  GRID_RIGHT,
  GRID_TOP,
  MARKER_Y,
  NAME_BAND,
  NAME_Y,
  STRING_COUNT,
  VIEW_WIDTH,
  fretCenterY,
  rowCount,
  stringX,
  viewHeight,
} from './chordGeometry';

export interface ChordDiagramProps {
  chord?: ChordShape;
  chordId?: string;
  leftHanded?: boolean;
  /** Largura em px. Sem valor, preenche o container (mínimo 140px). */
  size?: number;
  showFingers?: boolean;
  /** Mostra o nome por extenso acima do desenho (ex.: "Am (Lá menor)"). Padrão: true. */
  showFullName?: boolean;
  /** Substitui o título acessível (por padrão "Acorde Am (Lá menor)"). */
  title?: string;
  /** Torna o bloco um botão que toca o acorde (strum). Padrão: false. */
  playable?: boolean;
}

const INK = 'var(--color-text)';
const SOFT = 'var(--color-text-muted)';
const DOT_FILL = 'var(--color-primary)';
const ON_DOT = 'var(--color-on-primary)';
const BG = 'var(--color-bg)';

const textStyle: CSSProperties = { fontFamily: 'inherit' };

export function describeChord(chord: ChordShape, showFingers: boolean): string {
  const parts = [...chord.frets].map((fret, index) => {
    const string = STRING_COUNT - index;
    const finger = chord.fingers[index] ?? 0;
    if (fret < 0) return tp('chord.stringMuted', { string });
    if (fret === 0) return tp('chord.stringOpen', { string });
    return showFingers && finger > 0
      ? tp('chord.stringFretFinger', { string, fret, finger })
      : tp('chord.stringFret', { string, fret });
  });
  if (chord.barre !== undefined) {
    parts.push(
      tp('chord.barre', {
        fret: chord.barre.fret,
        finger: chord.barre.finger,
        from: chord.barre.fromString,
        to: chord.barre.toString,
      }),
    );
  }
  if (chord.baseFret > 1) parts.push(tp('chord.baseFret', { fret: chord.baseFret }));
  return parts.join(', ');
}

/** Sem `showFullName` só a cifra vai para o leitor de tela: o nome pode ser a resposta do exercício. */
function chordLabel(chord: ChordShape, showFullName: boolean): string {
  return tp('chord.label', { name: showFullName ? chordDisplayName(chord).rotulo : chord.name });
}

interface ChordSvgProps {
  shape: ChordShape;
  leftHanded: boolean;
  size?: number;
  showFingers: boolean;
  showFullName: boolean;
  title?: string;
  /** Dentro de um botão: o botão carrega o nome e a descrição. */
  decorative?: boolean;
}

const PLAY_ERROR_KEYS = {
  unsupported: 'chord.play.unsupported',
  suspended: 'chord.play.suspended',
  failed: 'chord.play.failed',
} as const satisfies Record<string, MessageKey>;

function PlayableChord(props: Omit<ChordSvgProps, 'decorative'>) {
  const { shape, showFingers, showFullName, title } = props;
  const player = useChordPlayer();
  const name = title ?? chordLabel(shape, showFullName);
  const descId = `chord-desc-${shape.id}`;
  const statusKey: MessageKey | null =
    player.error !== null
      ? PLAY_ERROR_KEYS[player.error]
      : player.state === 'loading'
        ? 'chord.play.loading'
        : player.state === 'playing'
          ? 'chord.play.playing'
          : null;

  return (
    <div className="flex flex-col items-stretch gap-1">
      {showFullName && <ChordCaption shape={shape} />}
      <button
        type="button"
        className="chord-play min-h-tap min-w-tap cursor-pointer rounded-card bg-transparent p-0 text-inherit"
        data-state={player.state}
        aria-label={tp('chord.play.label', {
          name: showFullName ? chordDisplayName(shape).rotulo : shape.name,
        })}
        aria-describedby={descId}
        aria-busy={player.state === 'loading'}
        onPointerEnter={player.warmUp}
        onFocus={player.warmUp}
        onClick={() => player.play(shape)}
      >
        <ChordSvg {...props} decorative />
      </button>
      <span id={descId} className="sr-only">
        {`${name}: ${describeChord(shape, showFingers)}`}
      </span>
      <span
        role={player.error === null ? 'status' : 'alert'}
        className="min-h-5 text-center text-sm text-muted"
      >
        {statusKey === null ? '' : t(statusKey)}
      </span>
    </div>
  );
}

function ChordCaption({ shape }: { shape: ChordShape }) {
  const { cifra, nomePt } = chordDisplayName(shape);
  return (
    <p
      className="m-0 flex flex-wrap items-baseline justify-center gap-x-1.5 rounded-card bg-bg px-2 py-1 text-center text-balance [overflow-wrap:anywhere]"
      data-testid="chord-caption"
      aria-hidden="true"
    >
      <span className="text-lg leading-tight font-extrabold tracking-tight text-text">{cifra}</span>
      {nomePt !== null && (
        <>
          {' '}
          <span className="text-base leading-tight font-medium text-muted">{`(${nomePt})`}</span>
        </>
      )}
    </p>
  );
}

export function ChordDiagram({
  chord,
  chordId,
  leftHanded = false,
  size,
  showFingers = true,
  showFullName = true,
  title,
  playable = false,
}: ChordDiagramProps) {
  const shape = chord ?? (chordId === undefined ? undefined : getChord(chordId));
  if (shape === undefined) return <p role="alert">{t('chord.unknown')}</p>;
  const props = {
    shape,
    leftHanded,
    showFingers,
    showFullName,
    ...(size === undefined ? {} : { size }),
    ...(title === undefined ? {} : { title }),
  };
  if (playable) return <PlayableChord {...props} />;
  return (
    <div className="flex flex-col items-stretch gap-1">
      {showFullName && <ChordCaption shape={shape} />}
      <ChordSvg {...props} />
    </div>
  );
}

function ChordSvg({
  shape,
  leftHanded,
  size,
  showFingers,
  showFullName,
  title,
  decorative = false,
}: ChordSvgProps) {
  const rows = rowCount(shape);
  const topOffset = showFullName ? NAME_BAND : 0;
  const height = viewHeight(rows) - topOffset;
  const accessibleTitle = title ?? chordLabel(shape, showFullName);
  const description = `${accessibleTitle}: ${describeChord(shape, showFingers)}`;
  const { barre, baseFret } = shape;
  const highPosition = baseFret > 1;
  const x = (stringNumber: number) => stringX(stringNumber, leftHanded);
  const labelOnLeft = !leftHanded;

  const style: CSSProperties =
    size === undefined
      ? { width: '100%', minWidth: 140, height: 'auto' }
      : { width: size, height: 'auto' };

  const barreRange =
    barre === undefined
      ? undefined
      : { from: x(barre.fromString), to: x(barre.toString), y: fretCenterY(barre.fret, baseFret) };

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      {...(decorative
        ? { 'aria-hidden': true, focusable: false }
        : { role: 'img', 'aria-label': description })}
      style={style}
      data-testid="chord-diagram"
      data-chord-id={shape.id}
      data-left-handed={leftHanded ? 'true' : 'false'}
    >
      <title>{accessibleTitle}</title>
      <desc>{description}</desc>

      {!showFullName && (
        <text
          x={VIEW_WIDTH / 2}
          y={NAME_Y}
          textAnchor="middle"
          fontSize={17}
          fontWeight={700}
          fill={INK}
          style={textStyle}
          aria-hidden="true"
        >
          {shape.name}
        </text>
      )}

      <g transform={`translate(0 ${-topOffset})`}>
        {/* Braço: casas, nut e cordas */}
        <g aria-hidden="true">
          {Array.from({ length: rows + 1 }, (_, row) => (
            <line
              key={`fret-${row}`}
              x1={GRID_LEFT}
              x2={GRID_RIGHT}
              y1={GRID_TOP + row * FRET_HEIGHT}
              y2={GRID_TOP + row * FRET_HEIGHT}
              stroke={row === 0 && !highPosition ? INK : SOFT}
              strokeWidth={row === 0 && !highPosition ? 5 : 1.2}
              data-part={row === 0 ? 'nut' : 'fret'}
            />
          ))}
          {Array.from({ length: STRING_COUNT }, (_, i) => {
            const stringNumber = STRING_COUNT - i;
            return (
              <line
                key={`string-${stringNumber}`}
                x1={x(stringNumber)}
                x2={x(stringNumber)}
                y1={GRID_TOP}
                y2={GRID_TOP + rows * FRET_HEIGHT}
                stroke={SOFT}
                strokeWidth={2 - i * 0.2}
                data-part="string"
                data-string={stringNumber}
              />
            );
          })}
        </g>

        {highPosition && (
          <text
            x={labelOnLeft ? GRID_LEFT - 10 : GRID_RIGHT + 10}
            y={fretCenterY(baseFret, baseFret) + 4}
            textAnchor={labelOnLeft ? 'end' : 'start'}
            fontSize={11}
            fontWeight={600}
            fill={INK}
            style={textStyle}
            aria-hidden="true"
            data-part="base-fret"
          >
            {tp('chord.fretLabel', { fret: baseFret })}
          </text>
        )}

        {/* X (muda) e O (solta): formas distintas, não só cor */}
        <g aria-hidden="true">
          {shape.frets.map((fret, index) => {
            const stringNumber = STRING_COUNT - index;
            const cx = x(stringNumber);
            if (fret === -1) {
              return (
                <path
                  key={`m-${stringNumber}`}
                  d={`M${cx - 5} ${MARKER_Y - 5}L${cx + 5} ${MARKER_Y + 5}M${cx + 5} ${MARKER_Y - 5}L${cx - 5} ${MARKER_Y + 5}`}
                  stroke={INK}
                  strokeWidth={2}
                  strokeLinecap="round"
                  fill="none"
                  data-kind="muted"
                  data-string={stringNumber}
                  data-cx={cx}
                />
              );
            }
            if (fret === 0) {
              return (
                <circle
                  key={`o-${stringNumber}`}
                  cx={cx}
                  cy={MARKER_Y}
                  r={5}
                  stroke={INK}
                  strokeWidth={2}
                  fill="none"
                  data-kind="open"
                  data-string={stringNumber}
                  data-cx={cx}
                />
              );
            }
            return null;
          })}
        </g>

        {/* Pestana */}
        {barre !== undefined && barreRange !== undefined && (
          <g aria-hidden="true" data-kind="barre" data-fret={barre.fret}>
            <rect
              x={Math.min(barreRange.from, barreRange.to) - DOT_RADIUS}
              y={barreRange.y - DOT_RADIUS}
              width={Math.abs(barreRange.from - barreRange.to) + DOT_RADIUS * 2}
              height={DOT_RADIUS * 2}
              rx={DOT_RADIUS}
              fill={DOT_FILL}
              stroke={BG}
              strokeWidth={1.5}
            />
            {showFingers && (
              <text
                x={barreRange.from}
                y={barreRange.y + 4.5}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill={ON_DOT}
                style={textStyle}
              >
                {barre.finger}
              </text>
            )}
          </g>
        )}

        {/* Dedos */}
        <g aria-hidden="true">
          {shape.frets.map((fret, index) => {
            if (fret < 1) return null;
            const stringNumber = STRING_COUNT - index;
            const onBarre =
              barre !== undefined &&
              fret === barre.fret &&
              stringNumber <= barre.fromString &&
              stringNumber >= barre.toString;
            if (onBarre) return null;
            const cx = x(stringNumber);
            const cy = fretCenterY(fret, baseFret);
            const finger = shape.fingers[index] ?? 0;
            return (
              <g
                key={`f-${stringNumber}`}
                data-kind="finger"
                data-string={stringNumber}
                data-fret={fret}
                data-cx={cx}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={DOT_RADIUS}
                  fill={DOT_FILL}
                  stroke={BG}
                  strokeWidth={1.5}
                />
                {showFingers && finger > 0 && (
                  <text
                    x={cx}
                    y={cy + 4.5}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill={ON_DOT}
                    style={textStyle}
                  >
                    {finger}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
