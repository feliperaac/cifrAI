import { describe, expect, it } from 'vitest';
import { isServiceWorkerEnabled } from './config';

describe('isServiceWorkerEnabled', () => {
  it('liga por padrão', () => expect(isServiceWorkerEnabled({})).toBe(true));
  it('desliga por env', () =>
    expect(isServiceWorkerEnabled({ VITE_ENABLE_SW: 'false' })).toBe(false));
  it('desliga em plataforma nativa', () =>
    expect(isServiceWorkerEnabled({}, () => true)).toBe(false));
});
