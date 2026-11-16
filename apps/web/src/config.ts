/**
 * Ponto unico para desligar o service worker (ADR-0001, risco 4b).
 * No app nativo (Capacitor) o SW gera cache duplicado: build com
 * `VITE_ENABLE_SW=false` ou, em runtime, quando `isNativePlatform()` for verdadeiro.
 */
export function isServiceWorkerEnabled(
  env: { VITE_ENABLE_SW?: string | undefined } = import.meta.env,
  isNativePlatform: () => boolean = () => false,
): boolean {
  if (env.VITE_ENABLE_SW === 'false') return false;
  return !isNativePlatform();
}

/** Fuso de exibição de datas (o banco e o log guardam UTC). */
export const DISPLAY_TIME_ZONE = 'America/Rio_Branco';

/**
 * Versão do conteúdo gravada nos eventos. Sem API de conteúdo ainda (F1-15), vem do build ou cai em
 * `dev`; o servidor só a guarda para auditoria.
 */
export const CONTENT_VERSION: string = import.meta.env.VITE_CONTENT_VERSION ?? 'dev';
