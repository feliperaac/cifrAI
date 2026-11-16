import { messages, type MessageKey } from './pt-BR';

export type { MessageKey };

export function t(key: MessageKey): string {
  return messages[key];
}

/** Catálogo com placeholders `{nome}`. */
export function tp(key: MessageKey, params: Record<string, string | number>): string {
  return messages[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
