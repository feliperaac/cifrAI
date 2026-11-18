import { z } from 'zod';
import { TimeZoneSchema } from './events.js';

/** Fuso padrão do produto (memória do projeto): exibição em Rio Branco, armazenamento em UTC. */
export const DEFAULT_USER_TIMEZONE = 'America/Rio_Branco';
export const DEFAULT_USER_LOCALE = 'pt-BR';

export const PASSWORD_MIN_LENGTH = 10;
/** Teto contra DoS no argon2 (memória/CPU por tentativa); bem acima de qualquer senha humana. */
export const PASSWORD_MAX_LENGTH = 128;
export const EMAIL_MAX_LENGTH = 254;
export const DISPLAY_NAME_MAX_LENGTH = 80;

/** E-mail normalizado: sem espaços nas pontas e em minúsculas (USERS tem CHECK EMAIL = LOWER(EMAIL)). */
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, 'E-mail longo demais.')
  .pipe(z.email('E-mail inválido.'));

/**
 * Só tamanho aqui (o cliente pode reutilizar para feedback imediato). A lista de senhas comuns fica na
 * API: não vale o peso no bundle do cliente. Sem regras de composição (NIST SP 800-63B).
 */
export const NewPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha precisa de ao menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`);

/** No login não se revalida a política (senhas antigas continuam entrando); só limita o tamanho. */
export const LoginPasswordSchema = z.string().min(1).max(PASSWORD_MAX_LENGTH);

/**
 * `cookie`: navegador/PWA (cookie httpOnly). `token`: APK Capacitor, que recebe o token opaco no corpo
 * e o envia em `Authorization: Bearer` (ver ADR-0004).
 */
export const SessionDeliverySchema = z.enum(['cookie', 'token']);
export type SessionDelivery = z.infer<typeof SessionDeliverySchema>;

/** String vazia vira ausente: no Oracle '' é NULL, então normalizamos já na borda. */
const optionalDisplayName = z
  .string()
  .trim()
  .max(DISPLAY_NAME_MAX_LENGTH)
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v));

export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: NewPasswordSchema,
  displayName: optionalDisplayName,
  timezone: TimeZoneSchema.default(DEFAULT_USER_TIMEZONE),
  delivery: SessionDeliverySchema.default('cookie'),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: LoginPasswordSchema,
  delivery: SessionDeliverySchema.default('cookie'),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/** UUID em formato canônico, sem exigir versão (o RAW(16) pode vir de SYS_GUID). */
const IdSchema = z.guid();

export const AuthUserSchema = z.object({
  id: IdSchema,
  email: z.string(),
  displayName: z.string().nullable(),
  timezone: z.string(),
  locale: z.string(),
  leftHanded: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthSessionResponseSchema = z.object({
  user: AuthUserSchema,
  /** Fim da validade ociosa da sessão (UTC). */
  expiresAt: z.iso.datetime(),
  /** Só presente quando `delivery: 'token'`. Nunca é gravado em claro no servidor. */
  sessionToken: z.string().optional(),
});
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;

export const MeResponseSchema = z.object({ user: AuthUserSchema });
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const AUTH_ERROR_CODES = [
  'VALIDATION_ERROR',
  'WEAK_PASSWORD',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'UNAUTHORIZED',
  'CSRF_REJECTED',
  'RATE_LIMITED',
] as const;
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];
