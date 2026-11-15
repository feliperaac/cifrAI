import { messages, type MessageKey } from './pt-BR';

export type { MessageKey };

export function t(key: MessageKey): string {
  return messages[key];
}
