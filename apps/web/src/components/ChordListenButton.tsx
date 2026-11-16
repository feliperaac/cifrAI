import { getChord } from '@cifrai/shared';
import { useChordPlayer } from '../audio/useChordPlayer';
import { t, type MessageKey } from '../i18n';

const ERROR_KEYS = {
  unsupported: 'chord.play.unsupported',
  suspended: 'chord.play.suspended',
  failed: 'chord.play.failed',
} as const satisfies Record<string, MessageKey>;

/** "Ouça e escolha": só o botão de ouvir, sem diagrama nem nome. O som só sai por gesto. */
export function ChordListenButton({ chordId }: { chordId: string }) {
  const player = useChordPlayer();
  const shape = getChord(chordId);
  if (shape === undefined) return <p role="alert">{t('chord.unknown')}</p>;
  const status: MessageKey | null =
    player.error !== null
      ? ERROR_KEYS[player.error]
      : player.state === 'loading'
        ? 'chord.play.loading'
        : player.state === 'playing'
          ? 'chord.play.playing'
          : null;
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className="btn"
        data-variant="secondary"
        aria-busy={player.state === 'loading'}
        onPointerEnter={player.warmUp}
        onFocus={player.warmUp}
        onClick={() => player.play(shape)}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M4 9v6h4l5 4V5L8 9H4Z" />
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
        </svg>
        {t('chord.listen')}
      </button>
      <span
        role={player.error === null ? 'status' : 'alert'}
        className="min-h-5 text-sm text-muted"
      >
        {status === null ? '' : t(status)}
      </span>
    </div>
  );
}
