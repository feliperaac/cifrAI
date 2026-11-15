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
