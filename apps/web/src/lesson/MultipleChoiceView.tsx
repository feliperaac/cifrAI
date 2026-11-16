import type { MultipleChoiceExercise } from '@cifrai/content';
import { t } from '../i18n';
import { ChordDiagram } from '../components/ChordDiagram';
import { ChordListenButton } from '../components/ChordListenButton';
import { CheckIcon } from '../components/ui/CheckIcon';
import { CrossIcon } from '../components/ui/CrossIcon';

export interface MultipleChoiceViewProps {
  exercise: MultipleChoiceExercise;
  selectedId: string | null;
  /** Só preenchido após verificar; marca a opção certa com ícone + texto. */
  correctId: string | null;
  locked: boolean;
  onSelect: (optionId: string) => void;
}

/** Radios nativos: setas, Tab e leitor de tela funcionam sem código extra. */
export function MultipleChoiceView({
  exercise,
  selectedId,
  correctId,
  locked,
  onSelect,
}: MultipleChoiceViewProps) {
  const presentation = exercise.chordPresentation ?? 'diagram';
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="mb-4 font-display text-2xl font-extrabold">{exercise.prompt}</legend>
      {exercise.chordId !== undefined && (
        <div className="mb-1 flex flex-col items-center gap-2" data-testid="exercise-chord">
          {presentation === 'audio_only' ? (
            <>
              <ChordListenButton chordId={exercise.chordId} />
              <p className="m-0 w-full text-sm text-muted">{t('lesson.mc.listenHint')}</p>
            </>
          ) : (
            <div className="w-48 max-w-full">
              <ChordDiagram
                chordId={exercise.chordId}
                playable
                hideName={presentation === 'diagram' && !locked}
              />
            </div>
          )}
        </div>
      )}
      {exercise.options.map((option) => {
        const selected = option.id === selectedId;
        const isCorrect = correctId !== null && option.id === correctId;
        const isWrong = correctId !== null && selected && !isCorrect;
        return (
          <label
            key={option.id}
            className="choice"
            data-selected={selected}
            data-state={isCorrect ? 'correct' : isWrong ? 'wrong' : undefined}
            data-locked={locked}
          >
            <input
              type="radio"
              name={exercise.id}
              value={option.id}
              checked={selected}
              disabled={locked}
              onChange={() => onSelect(option.id)}
              className="choice__input"
            />
            <span className="min-w-0 flex-1">{option.text}</span>
            {isCorrect && (
              <span className="flex items-center gap-1 text-sm font-bold text-success">
                <CheckIcon />
                {t('lesson.mc.correctOption')}
              </span>
            )}
            {isWrong && (
              <span className="flex items-center gap-1 text-sm font-bold text-danger">
                <CrossIcon />
                {t('lesson.mc.yourAnswer')}
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
