import { hash, verify } from '@node-rs/argon2';
import { PASSWORD_MIN_LENGTH } from '@cifrai/shared';

/**
 * Argon2id (o padrao da lib; confirmado pelo prefixo `$argon2id$` em teste) com a configuracao minima
 * recomendada pela OWASP: m=19 MiB, t=2, p=1. Sal aleatorio por hash vai dentro da string PHC.
 */
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  /** Nunca lanca por hash malformado: devolve false. */
  verify(passwordHash: string, password: string): Promise<boolean>;
  /** Gasta o mesmo tempo de uma verificacao real (e-mail inexistente no login). */
  verifyDummy(password: string): Promise<void>;
}

export function createArgon2Hasher(): PasswordHasher {
  let dummy: Promise<string> | undefined;
  const dummyHash = () => (dummy ??= hash('cifrai-dummy-password-for-timing', ARGON2_OPTIONS));
  return {
    hash: (password) => hash(password, ARGON2_OPTIONS),
    async verify(passwordHash, password) {
      try {
        return await verify(passwordHash, password);
      } catch {
        return false;
      }
    },
    async verifyDummy(password) {
      await verify(await dummyHash(), password).catch(() => false);
    },
  };
}

/** Senhas comuns com >= 10 caracteres (as menores ja caem no minimo). Lista propositalmente curta. */
const COMMON_PASSWORDS = new Set([
  '1234567890',
  '0123456789',
  '12345678910',
  '123456789a',
  '1q2w3e4r5t',
  '1qaz2wsx3e',
  'qwertyuiop',
  'qwerty1234',
  'qwerty12345',
  'qwertyuiop1',
  'asdfghjkl1',
  'asdfghjklç',
  'abcdefghij',
  'abcd123456',
  'abc1234567',
  'password12',
  'password123',
  'password1234',
  'passw0rd123',
  'p@ssword123',
  'senha12345',
  'senha123456',
  'senha@12345',
  'minhasenha',
  'minhasenha1',
  'minhasenha123',
  'mudar12345',
  'violao1234',
  'violao12345',
  'cifrai1234',
  'cifrai12345',
  'iloveyou12',
  'iloveyou123',
  'brasil1234',
  'brasil12345',
  'corinthians',
  'flamengo123',
  'palmeiras123',
  'letmein1234',
  'welcome123',
  'welcome1234',
  'administrator',
  'changeme123',
]);

export type PasswordProblem = 'too_common' | 'same_as_email' | 'repetitive';

/**
 * Politica NIST SP 800-63B: tamanho minimo (no schema), bloqueio de senhas comuns/obvias, sem regras
 * de composicao. Comparacao sem diferenciar caixa.
 */
export function checkPasswordPolicy(password: string, email: string): PasswordProblem | null {
  if (password.length < PASSWORD_MIN_LENGTH) return null; // o schema ja reporta o tamanho
  const p = password.toLowerCase();
  if (COMMON_PASSWORDS.has(p)) return 'too_common';
  if (p === email.toLowerCase() || p === email.split('@')[0]?.toLowerCase()) return 'same_as_email';
  if (new Set(p).size <= 2) return 'repetitive';
  return null;
}
