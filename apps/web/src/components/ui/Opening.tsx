import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

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

export function OpeningItem({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div className="opening-item" style={{ '--i': index } as CSSProperties}>
      {children}
    </div>
  );
}
