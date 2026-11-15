import { describe, expect, it } from 'vitest';
import { t } from './index';
import { messages } from './pt-BR';

describe('catálogo pt-BR', () => {
  it('resolve chaves', () => {
    expect(t('nav.path')).toBe('Trilha');
    expect(t('nav.tuner')).toBe('Afinador');
    expect(t('nav.profile')).toBe('Perfil');
  });

  it('não tem strings vazias', () => {
    for (const [key, value] of Object.entries(messages)) {
      expect(value.trim(), key).not.toBe('');
    }
  });
});
