import { AppError } from '../errors.js';

const oraNumber = (err: unknown): number | undefined => {
  const n = (err as { errorNum?: unknown } | null)?.errorNum;
  return typeof n === 'number' ? n : undefined;
};

/** ORA-00001 (violacao de unicidade) citando a constraint, ex.: "(CIFRAI_MIG.UQ_USERS_EMAIL)". */
export function isUniqueViolation(err: unknown, constraint: string): boolean {
  if (oraNumber(err) !== 1) return false;
  return String((err as Error).message).includes(constraint);
}

const UNAVAILABLE_ORA = new Set([1033, 1034, 3113, 3114, 3135, 12514, 12541, 12537, 12170, 28547]);

/**
 * Mapeia falhas de infraestrutura do Oracle/pool para erro de dominio 503, sem vazar a mensagem
 * original. Outros erros seguem como 500 generico (o handler global registra o detalhe no log).
 */
export function mapOracleError(err: unknown): AppError | undefined {
  const num = oraNumber(err);
  const msg = String((err as Error | undefined)?.message ?? '');
  const poolBusy = msg.startsWith('NJS-040') || msg.startsWith('NJS-047');
  const connectFail = msg.startsWith('NJS-500') || msg.startsWith('NJS-503');
  if (poolBusy || connectFail || (num !== undefined && UNAVAILABLE_ORA.has(num))) {
    return new AppError(503, 'DB_UNAVAILABLE', 'Servico temporariamente indisponivel.');
  }
  return undefined;
}
