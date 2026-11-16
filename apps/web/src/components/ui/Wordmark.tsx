import { t } from '../../i18n';
import { GUITAR_BODY_D, LOGO_VIEWBOX, WORD_AI_D, WORD_CIFR_D } from './logoPaths';

// Arcos do anel aberto da variante C (r=98, centro 128): mesmos ângulos do SVG oficial
// (dash 246,3 de 615,8 de circunferência = 144 graus, começando em 56 e 236 graus).
function arcPath(startDeg: number, sweepDeg: number): string {
  const pt = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return `${(128 + 98 * Math.cos(r)).toFixed(1)} ${(128 + 98 * Math.sin(r)).toFixed(1)}`;
  };
  return `M ${pt(startDeg)} A 98 98 0 0 1 ${pt(startDeg + sweepDeg)}`;
}
const ARC_SWEEP = 144;
const ARCS = [arcPath(56, ARC_SWEEP), arcPath(236, ARC_SWEEP)];

/** Lockup oficial (variante C "Mínima"): ícone simplificado + "CifrAI". Cores por tokens,
 *  então acompanha o tema. Rótulo único no <svg>; nada de texto duplicado ao leitor de tela.
 *  Na abertura "Afinação" os dois arcos se desenham, o violão surge e a palavra sobe. */
export function Wordmark({ className = 'h-9 w-auto' }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      role="img"
      aria-label={t('app.name')}
      className={className}
      focusable="false"
    >
      <g transform="translate(6 6) scale(0.4844)">
        {ARCS.map((d, i) => (
          <path
            key={i}
            d={d}
            className="opening-arc"
            pathLength="100"
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
          />
        ))}
        <g className="opening-mark">
          <circle cx="50.8" cy="67.7" r="19" fill="var(--color-primary)" />
          <circle cx="205.2" cy="188.3" r="19" fill="var(--color-primary)" />
          <g transform="translate(128 128) rotate(38) scale(0.68)">
            <path d={GUITAR_BODY_D} fill="var(--color-primary)" />
            <circle cx="0" cy="70" r="15" fill="var(--logo-hole)" />
            <circle
              cx="0"
              cy="70"
              r="20"
              fill="none"
              stroke="var(--color-on-primary)"
              strokeWidth="2.4"
            />
          </g>
        </g>
      </g>
      <g transform="translate(138 103)" className="opening-word">
        <path fill="var(--color-text)" d={WORD_CIFR_D} />
        <path fill="var(--color-primary)" d={WORD_AI_D} />
      </g>
    </svg>
  );
}
