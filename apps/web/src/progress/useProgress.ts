import { useEffect } from 'react';
import { useProgressStore } from './progressStore';

/** Carrega o log local uma vez e expõe o estado derivado. Compartilhado pelos blocos de progresso. */
export function useProgress() {
  const status = useProgressStore((s) => s.status);
  const persistence = useProgressStore((s) => s.persistence);
  const summary = useProgressStore((s) => s.summary);
  const load = useProgressStore((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);
  return { status, persistence, summary, reload: () => void load() };
}
