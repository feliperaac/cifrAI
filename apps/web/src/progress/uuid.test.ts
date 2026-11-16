import { EventUuidSchema } from '@cifrai/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { newUuid } from './uuid';

afterEach(() => vi.unstubAllGlobals());

describe('newUuid', () => {
  it('gera UUID v4 aceito pelo schema do envelope', () => {
    expect(EventUuidSchema.safeParse(newUuid()).success).toBe(true);
    expect(newUuid()).not.toBe(newUuid());
  });

  it('sem randomUUID (HTTP fora de localhost) usa getRandomValues e continua v4', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const id = newUuid();
    expect(EventUuidSchema.safeParse(id).success).toBe(true);
    expect(id[14]).toBe('4');
  });
});
