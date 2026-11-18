import { useState } from 'react';
import type { BuildChordExercise } from '@cifrai/content';
import { chordDisplayName, getChord } from '@cifrai/shared';
import { t, tp } from '../i18n';
import { useChordPlayer } from '../audio/useChordPlayer';
import { ChordDiagram } from '../components/ChordDiagram';
import { Button } from '../components/ui/Button';
import { EMPTY_FRETS, FretboardInput, describeFrets } from '../components/FretboardInput';
import { rowCount } from '../components/chordGeometry';

export interface BuildChordViewProps {
  exercise: BuildChordExercise;
  /** `null` até o aluno mexer no braço. */
  frets: number[] | null;
  locked: boolean;
  correct: boolean;
  onRespond: (frets: number[] | null) => void;
}

export function BuildChordView({
  exercise,
  frets,
  locked,
  correct,
  onRespond,
}: BuildChordViewProps) {
  const shape = getChord(exercise.chordId);
  const player = useChordPlayer();
  const [initial] = useState(() => [...EMPTY_FRETS]);
  if (shape === undefined) return <p role="alert">{t('chord.unknown')}</p>;
  const current = frets ?? initial;
  const touched = frets !== null;
  const rows = rowCount(shape);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="m-0 font-display text-2xl font-extrabold">{exercise.prompt}</h2>
      <p className="m-0 text-muted">{t('lesson.build.hint')}</p>
      <FretboardInput
        value={current}
        onChange={onRespond}
        baseFret={shape.baseFret}
        rows={rows}
        disabled={locked}
      />
      <p className="m-0 text-sm text-muted" role="status" aria-live="polite">
        {touched
          ? tp('lesson.build.summary', { summary: describeFrets(current) })
          : t('lesson.build.touchFirst')}
      </p>
      {!locked && (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={!touched}
            onPointerEnter={player.warmUp}
            onFocus={player.warmUp}
            onClick={() => player.play({ frets: current })}
          >
            {t('lesson.build.listen')}
          </Button>
          <Button variant="ghost" disabled={!touched} onClick={() => onRespond(null)}>
            {t('lesson.build.reset')}
          </Button>
        </div>
      )}
      {player.error !== null && (
        <p role="alert" className="m-0 text-sm font-bold text-danger">
          {t(
            player.error === 'unsupported'
              ? 'chord.play.unsupported'
              : player.error === 'suspended'
                ? 'chord.play.suspended'
                : 'chord.play.failed',
          )}
        </p>
      )}
      {locked && !correct && (
        <div className="flex flex-col items-center gap-2" data-testid="build-correct-shape">
          <p className="m-0 font-bold">
            {tp('lesson.build.correctShape', { name: chordDisplayName(shape).rotulo })}
          </p>
          <div className="w-48 max-w-full">
            <ChordDiagram chord={shape} />
          </div>
        </div>
      )}
    </div>
  );
}
