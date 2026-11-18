import { createHmac, randomBytes } from 'node:crypto';

/** 256 bits de entropia, base64url: opaco, sem estrutura nem dados do usuario. */
export const generateSessionToken = (): string => randomBytes(32).toString('base64url');

/**
 * HMAC-SHA256 do token com o `SESSION_SECRET`: o banco guarda so isso (RAW(32)). Quem vazar o banco
 * nao consegue forjar nem validar tokens sem o segredo, e o token puro nunca e persistido.
 */
export const hashSessionToken = (token: string, secret: string): Buffer =>
  createHmac('sha256', secret).update(token).digest();
