import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { t } from '../../i18n';

const FLAG = 'cifrai.opening.played';

function shouldPlay(): boolean {
  try {
    return sessionStorage.getItem(FLAG) === null;
  } catch {
    return false;
  }
}

/** Abertura "Afinação": toca uma vez por sessão (flag em sessionStorage). Sem JS ou com
 *  prefers-reduced-motion o CSS não anima e o estado final aparece direto. */
export function useOpening(enabled: boolean): 'play' | 'off' {
  const [mode] = useState<'play' | 'off'>(() => (enabled && shouldPlay() ? 'play' : 'off'));
  useEffect(() => {
    if (!enabled) return;
    try {
      sessionStorage.setItem(FLAG, '1');
    } catch {
      /* armazenamento indisponível: a abertura simplesmente não repete */
    }
  }, [enabled]);
  return mode;
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 48 30" width="48" height="30" aria-hidden="true" focusable="false">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={i}
            className="opening-string"
            style={{ '--i': i } as CSSProperties}
            x1="2"
            x2="46"
            y1={3 + i * 4.8}
            y2={3 + i * 4.8}
            pathLength="100"
            strokeWidth={1 + i * 0.25}
          />
        ))}
      </svg>
      <span className="opening-word font-display text-2xl font-extrabold tracking-tight">
        {t('app.name')}
      </span>
    </div>
  );
}

export function OpeningItem({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div className="opening-item" style={{ '--i': index } as CSSProperties}>
      {children}
    </div>
  );
}
