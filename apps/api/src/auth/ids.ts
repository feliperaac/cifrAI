/** RAW(16) <-> UUID canonico (minusculo, com hifens). */
export const uuidToBuffer = (uuid: string): Buffer => Buffer.from(uuid.replaceAll('-', ''), 'hex');

export function hexToUuid(hex: string): string {
  const h = hex.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
