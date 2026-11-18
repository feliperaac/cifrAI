import { describe, expect, it } from 'vitest';
import { checkPasswordPolicy, createArgon2Hasher } from './password.js';

describe('createArgon2Hasher', () => {
  const hasher = createArgon2Hasher();

  it('gera argon2id com os parametros OWASP e sal diferente a cada hash', async () => {
    const a = await hasher.hash('violao-no-colo-123');
    const b = await hasher.hash('violao-no-colo-123');
    expect(a).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(a).not.toBe(b);
  });

  it('verifica senha certa e errada, e hash malformado nao lanca', async () => {
    const h = await hasher.hash('violao-no-colo-123');
    expect(await hasher.verify(h, 'violao-no-colo-123')).toBe(true);
    expect(await hasher.verify(h, 'violao-no-colo-124')).toBe(false);
    expect(await hasher.verify('lixo', 'x')).toBe(false);
    await expect(hasher.verifyDummy('qualquer')).resolves.toBeUndefined();
  });
});

describe('checkPasswordPolicy', () => {
  it('aceita frase longa sem regras de composicao', () => {
    expect(checkPasswordPolicy('aprendendo violao hoje', 'a@example.invalid')).toBeNull();
    expect(checkPasswordPolicy('todasminusculas', 'a@example.invalid')).toBeNull();
  });
  it('bloqueia comuns (sem diferenciar caixa), igual ao e-mail e repetitiva', () => {
    expect(checkPasswordPolicy('Password123', 'a@example.invalid')).toBe('too_common');
    expect(checkPasswordPolicy('1234567890', 'a@example.invalid')).toBe('too_common');
    expect(checkPasswordPolicy('ana.silva.silva', 'ana.silva.silva@example.invalid')).toBe(
      'same_as_email',
    );
    expect(checkPasswordPolicy('abababababab', 'a@example.invalid')).toBe('repetitive');
  });
});
