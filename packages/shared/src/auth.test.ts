import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USER_TIMEZONE,
  LoginRequestSchema,
  PASSWORD_MAX_LENGTH,
  RegisterRequestSchema,
} from './auth.js';

const base = { email: '  Aluno@Example.INVALID ', password: 'violao-no-colo-123' };

describe('RegisterRequestSchema', () => {
  it('normaliza o e-mail e aplica os padrões', () => {
    const r = RegisterRequestSchema.parse(base);
    expect(r.email).toBe('aluno@example.invalid');
    expect(r.timezone).toBe(DEFAULT_USER_TIMEZONE);
    expect(r.delivery).toBe('cookie');
    expect(r.displayName).toBeUndefined();
  });

  it('displayName vazio vira ausente (Oracle: string vazia = NULL)', () => {
    expect(
      RegisterRequestSchema.parse({ ...base, displayName: '   ' }).displayName,
    ).toBeUndefined();
    expect(RegisterRequestSchema.parse({ ...base, displayName: ' Ana ' }).displayName).toBe('Ana');
  });

  it('rejeita senha curta, longa demais, e-mail inválido e fuso inválido', () => {
    expect(RegisterRequestSchema.safeParse({ ...base, password: 'curta' }).success).toBe(false);
    expect(
      RegisterRequestSchema.safeParse({ ...base, password: 'a'.repeat(PASSWORD_MAX_LENGTH + 1) })
        .success,
    ).toBe(false);
    expect(RegisterRequestSchema.safeParse({ ...base, email: 'sem-arroba' }).success).toBe(false);
    expect(RegisterRequestSchema.safeParse({ ...base, timezone: 'Marte/Olympus' }).success).toBe(
      false,
    );
  });
});

describe('LoginRequestSchema', () => {
  it('não revalida a política de senha, mas limita o tamanho', () => {
    expect(LoginRequestSchema.safeParse({ ...base, password: 'x' }).success).toBe(true);
    expect(LoginRequestSchema.safeParse({ ...base, password: '' }).success).toBe(false);
    expect(
      LoginRequestSchema.safeParse({ ...base, password: 'a'.repeat(PASSWORD_MAX_LENGTH + 1) })
        .success,
    ).toBe(false);
  });
});
