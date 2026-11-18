import type { FastifyRequest } from 'fastify';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface OriginPolicy {
  allowedOrigins: readonly string[];
}

/**
 * Defesa em profundidade alem de SameSite=Lax. Em metodo nao seguro:
 *  - Authorization: Bearer presente -> nao ha credencial ambiente (cookie), nao ha CSRF: libera.
 *  - Origin presente -> precisa ser a propria origem (mesmo host) ou constar em APP_ORIGINS.
 *  - Sem Origin mas com cookie de sessao -> rejeita (navegadores sempre enviam Origin em POST).
 * Retorna true quando a requisicao pode seguir.
 */
export function isOriginAcceptable(
  req: FastifyRequest,
  policy: OriginPolicy,
  cookieName: string,
): boolean {
  if (SAFE_METHODS.has(req.method)) return true;
  if (typeof req.headers.authorization === 'string') return true;
  const origin = req.headers.origin;
  if (typeof origin === 'string') {
    if (policy.allowedOrigins.includes(origin)) return true;
    try {
      return new URL(origin).host === req.headers.host;
    } catch {
      return false;
    }
  }
  return req.cookies?.[cookieName] === undefined;
}
