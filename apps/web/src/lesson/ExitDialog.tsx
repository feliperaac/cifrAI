import { useEffect, useRef } from 'react';
import { Button } from '../components/ui/Button';
import { t } from '../i18n';

export interface ExitDialogProps {
  onStay: () => void;
  onLeave: () => void;
}

/** Foco inicia no botão seguro ("Continuar na lição"); Esc também fica na lição. */
export function ExitDialog({ onStay, onLeave }: ExitDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialogRef.current?.querySelector('button')?.focus();
  }, []);
  return (
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="exit-title"
        aria-describedby="exit-desc"
        className="card dialog"
        data-variant="raised"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onStay();
        }}
      >
        <h2 id="exit-title" className="m-0 font-display text-xl font-extrabold">
          {t('lesson.exit.title')}
        </h2>
        <p id="exit-desc" className="m-0 text-muted">
          {t('lesson.exit.description')}
        </p>
        <Button fullWidth onClick={onStay}>
          {t('lesson.exit.stay')}
        </Button>
        <Button variant="secondary" fullWidth onClick={onLeave}>
          {t('lesson.exit.confirm')}
        </Button>
      </div>
    </div>
  );
}
