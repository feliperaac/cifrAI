// Gera as variantes da logo do CifrAI (SVG com texto convertido em paths).
// Uso: LOGO_TOOLS=<pasta com node_modules de opentype.js, wawoff2, @resvg/resvg-js> node gerar.mjs [--png <pasta>]
// As dependencias ficam FORA do repositorio; so os SVGs gerados e este script ficam versionados.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tools = process.env.LOGO_TOOLS;
if (!tools) throw new Error('Defina LOGO_TOOLS');
const req = createRequire(path.join(tools, 'x.js'));
const opentype = req('opentype.js');
const wawoff = req('wawoff2');
const FONTS = path.join(here, '..', 'fonts');

async function loadFont(file) {
  const ttf = await wawoff.decompress(fs.readFileSync(path.join(FONTS, file)));
  return opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));
}
const bricolage = await loadFont('bricolage-grotesque-latin-wght-normal.woff2'); // wght padrao 800
const figtree = await loadFont('figtree-latin-wght-normal.woff2');

// ---------- tokens da direcao A (Cedro e Cobre), copiados de identidade-visual.md ----------
export const THEMES = {
  claro: {
    bg: '#FBF5EA',
    primary: '#A8330F',
    onPrimary: '#FFF8EF',
    text: '#1E1812',
    accent: '#F2B22E',
    hole: '#1E1812',
  },
  escuro: {
    bg: '#17120D',
    primary: '#FF8A5B',
    onPrimary: '#2A0E03',
    text: '#F6EDDD',
    accent: '#F5BE4A',
    hole: '#2A0E03',
  },
};

const f1 = (n) => +n.toFixed(1);

// ---------- geometria do violao (unidades locais; y para baixo; braco para cima) ----------
const RIGHT = [
  [0, -122],
  [7, -122],
  [10.5, -120],
  [11.5, -114],
  [11.5, -104],
  [10.5, -99],
  [6.5, -96],
  [5.5, -92],
  [5.5, -62],
  [5.5, -34],
  [7, -27],
  [11, -21],
  [22, -14],
  [33, -4],
  [38, 10],
  [36, 24],
  [31, 34],
  [30, 43],
  [37, 53],
  [47, 67],
  [52, 85],
  [49, 104],
  [39, 119],
  [21, 128],
  [0, 130],
];
const ANCH = [
  ...RIGHT,
  ...RIGHT.slice(1, -1)
    .reverse()
    .map(([x, y]) => [-x, y]),
];

function crSegments(P) {
  const n = P.length,
    segs = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n],
      p1 = P[i],
      p2 = P[(i + 1) % n],
      p3 = P[(i + 2) % n];
    segs.push([
      p1,
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    ]);
  }
  return segs;
}
const SEGS = crSegments(ANCH);
const bodyD =
  'M' +
  f1(SEGS[0][0][0]) +
  ' ' +
  f1(SEGS[0][0][1]) +
  SEGS.map(
    ([, a, b, c]) => `C${f1(a[0])} ${f1(a[1])} ${f1(b[0])} ${f1(b[1])} ${f1(c[0])} ${f1(c[1])}`,
  ).join('') +
  'Z';

function sampleOutline(scale, perSeg = 14) {
  const pts = [];
  for (const [p0, p1, p2, p3] of SEGS) {
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg,
        u = 1 - t;
      pts.push(
        [0, 1].map(
          (d) =>
            scale *
            (u * u * u * p0[d] + 3 * u * u * t * p1[d] + 3 * u * t * t * p2[d] + t * t * t * p3[d]),
        ),
      );
    }
  }
  return pts;
}

// ---------- utilidades de caminho ----------
function resample(pts, step) {
  const closed = [...pts, pts[0]];
  const cum = [0];
  for (let i = 1; i < closed.length; i++)
    cum.push(
      cum[i - 1] + Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]),
    );
  const total = cum[cum.length - 1],
    n = Math.round(total / step),
    out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (k / n) * total;
    while (cum[j + 1] < s) j++;
    const t = (s - cum[j]) / (cum[j + 1] - cum[j]);
    out.push([
      closed[j][0] + t * (closed[j + 1][0] - closed[j][0]),
      closed[j][1] + t * (closed[j + 1][1] - closed[j][1]),
    ]);
  }
  return out;
}
function smooth(pts, win) {
  const n = pts.length;
  return pts.map((_, i) => {
    let x = 0,
      y = 0,
      w = 0;
    for (let k = -win; k <= win; k++) {
      const q = pts[(i + k + n * 4) % n],
        wt = win + 1 - Math.abs(k);
      x += q[0] * wt;
      y += q[1] * wt;
      w += wt;
    }
    return [x / w, y / w];
  });
}
// Offset para fora de um contorno horario (tela, y para baixo); suavizado para nao dobrar em cantos concavos.
function offsetOutward(pts, d, win = 6) {
  const base = smooth(resample(pts, 1), 3),
    n = base.length;
  const off = base.map((p, i) => {
    const a = base[(i - 2 + n) % n],
      b = base[(i + 2) % n];
    const tx = b[0] - a[0],
      ty = b[1] - a[1],
      l = Math.hypot(tx, ty);
    return [p[0] + (ty / l) * d, p[1] - (tx / l) * d];
  });
  return smooth(off, win);
}
function arcTable(pts) {
  const n = pts.length,
    cum = [0];
  for (let i = 1; i <= n; i++) {
    const a = pts[i - 1],
      b = pts[i % n];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { cum, total: cum[n] };
}
function at(pts, tab, s) {
  const n = pts.length;
  s = ((s % tab.total) + tab.total) % tab.total;
  let lo = 0,
    hi = n;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (tab.cum[m] <= s) lo = m;
    else hi = m;
  }
  const a = pts[lo],
    b = pts[(lo + 1) % n],
    t = (s - tab.cum[lo]) / (tab.cum[lo + 1] - tab.cum[lo] || 1);
  const p = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  const a2 = pts[(lo - 3 + n) % n],
    b2 = pts[(lo + 4) % n];
  const tx = b2[0] - a2[0],
    ty = b2[1] - a2[1],
    l = Math.hypot(tx, ty);
  return { p, t: [tx / l, ty / l] };
}

// ---------- texto em paths ----------
function advance(font, str, size, wght) {
  return font.getAdvanceWidth(str, size, wght ? { variation: { wght } } : {});
}
function glyphD(font, ch, size, wght) {
  const p = font.getPath(ch, 0, 0, size, wght ? { variation: { wght } } : {});
  return p.toPathData(2);
}
// Coloca cada letra de `str` ao longo do contorno, comecando em s0; baseline sobre o contorno, topo para fora.
function textOnPath(pts, tab, s0, str, size, wght, color) {
  let s = s0,
    out = '';
  for (const ch of str) {
    const adv = advance(figtree, ch, size, wght);
    const { p, t } = at(pts, tab, s + adv / 2);
    const e = p[0] - t[0] * (adv / 2),
      f = p[1] - t[1] * (adv / 2);
    out += `<path transform="matrix(${f1(t[0] * 1000) / 1000} ${f1(t[1] * 1000) / 1000} ${f1(-t[1] * 1000) / 1000} ${f1(t[0] * 1000) / 1000} ${f1(e)} ${f1(f)})" d="${glyphD(figtree, ch, size, wght)}"/>`;
    s += adv;
  }
  return `<g fill="${color}">${out}</g>`;
}
// Distribui cifras com separadores (pontos) preenchendo o contorno inteiro, folga ajustada para fechar o laco.
function chordLoop(pts, chords, size, wght, color, dotColor, s0 = 0) {
  const tab = arcTable(pts);
  const widths = chords.map((c) => advance(figtree, c, size, wght));
  const gap = (tab.total - widths.reduce((a, b) => a + b, 0)) / chords.length;
  let s = s0,
    out = '';
  chords.forEach((c, i) => {
    out += textOnPath(pts, tab, s, c, size, wght, color);
    const mid = at(pts, tab, s + widths[i] + gap / 2);
    out += `<circle cx="${f1(mid.p[0] + mid.t[1] * size * 0.3)}" cy="${f1(mid.p[1] - mid.t[0] * size * 0.3)}" r="${f1(size * 0.075)}" fill="${dotColor}"/>`;
    s += widths[i] + gap;
  });
  return { svg: out, gap };
}
function circlePts(cx, cy, r, n = 720) {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

// ---------- o violao desenhado ----------
function strings(col, w) {
  let s = '';
  for (let i = 0; i < 6; i++) {
    const k = (i - 2.5) / 2.5;
    s += `<line x1="${f1(k * 3.6)}" y1="-95" x2="${f1(k * 10.5)}" y2="108"/>`;
  }
  return `<g stroke="${col}" stroke-width="${w}" stroke-linecap="round">${s}</g>`;
}
function guitar(c, { x, y, scale, rot = 0, mono = false, id = 'g', simple = false }) {
  const tf = `translate(${x} ${y}) rotate(${rot}) scale(${scale})`;
  if (mono) {
    const k = c.text;
    return `<mask id="${id}-m" maskUnits="userSpaceOnUse" x="-80" y="-140" width="160" height="290"><rect x="-80" y="-140" width="160" height="290" fill="#000"/><path d="${bodyD}" fill="#fff"/><circle cx="0" cy="70" r="15" fill="#000"/><circle cx="0" cy="70" r="20" fill="none" stroke="#000" stroke-width="${simple ? 2.4 : 1.6}"/>${
      simple
        ? ''
        : `<g stroke="#000" stroke-width="1.1" stroke-linecap="round">${[0, 1, 2, 3, 4, 5]
            .map((i) => {
              const kk = (i - 2.5) / 2.5;
              return `<line x1="${f1(kk * 3.6)}" y1="-95" x2="${f1(kk * 10.5)}" y2="108"/>`;
            })
            .join('')}</g>`
    }</mask><g transform="${tf}"><rect x="-80" y="-140" width="160" height="290" fill="${k}" mask="url(#${id}-m)"/></g>`;
  }
  return `<g transform="${tf}"><path d="${bodyD}" fill="${c.primary}"/><circle cx="0" cy="70" r="15" fill="${c.hole}"/><circle cx="0" cy="70" r="20" fill="none" stroke="${c.onPrimary}" stroke-width="${simple ? 2.4 : 1.4}"/>${simple ? '' : strings(c.onPrimary, 0.9)}</g>`;
}

// ---------- variantes: devolvem <g> em viewBox 0 0 256 256 ----------
const RING = ['Am', 'G', 'C', 'D7', 'Em', 'F', 'Dm', 'E'];
function variantA(c, o = {}) {
  // orbita
  const { mono, simple } = o,
    ink = mono ? c.text : c.text,
    dot = mono ? c.text : c.primary;
  let ring;
  if (simple) {
    ring = `<circle cx="128" cy="128" r="112" fill="none" stroke="${ink}" stroke-width="14" stroke-dasharray="${f1(((2 * Math.PI * 112) / 16) * 0.62)} ${f1(((2 * Math.PI * 112) / 16) * 0.38)}" stroke-linecap="butt" transform="rotate(-90 128 128)"/>`;
  } else {
    const pts = circlePts(128, 128, 100);
    ring =
      `<circle cx="128" cy="128" r="90" fill="none" stroke="${dot}" stroke-width="1.6"/>` +
      chordLoop(pts, RING, 24, 800, ink, dot).svg;
  }
  return (
    ring +
    guitar(c, { x: 128, y: 128, scale: simple ? 0.66 : 0.68, rot: 38, mono, id: 'a', simple })
  );
}
function variantB(c, o = {}) {
  // contorno
  const { mono, simple } = o,
    S = simple ? 0.86 : 0.78,
    oy = 128 - 4 * S;
  const pts = sampleOutline(S).map(([x, y]) => [128 + x, oy + y]);
  const dot = c.primary;
  let ring;
  if (simple) {
    const off = offsetOutward(pts, 11),
      tab = arcTable(off),
      n = 26;
    ring = off.length
      ? `<g fill="${c.text}">${Array.from({ length: n }, (_, i) => {
          const q = at(off, tab, ((i + 0.5) * tab.total) / n).p;
          return `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="${f1(i % 2 ? 3.4 : 5.2)}"/>`;
        }).join('')}</g>`
      : '';
  } else {
    const off = offsetOutward(pts, 7, 16);
    ring = chordLoop(off, [...RING, ...RING].slice(0, 12), 19, 800, c.text, dot).svg;
  }
  return ring + guitar(c, { x: 128, y: oy, scale: S, mono, id: 'b', simple });
}
function variantC(c, o = {}) {
  // minimo
  const { mono, simple } = o,
    R = 98;
  const ink = c.text;
  const base = `<circle cx="128" cy="128" r="${R}" fill="none" stroke="${ink}" stroke-width="${simple ? 12 : 5}" stroke-dasharray="${f1(Math.PI * R * 0.8)} ${f1(Math.PI * R * 0.2)}" stroke-linecap="round" transform="rotate(56 128 128)"/>`;
  let marks = '';
  [
    ['A', 218],
    ['E', 38],
  ].forEach(([ch, deg]) => {
    const a = (deg * Math.PI) / 180,
      cx = 128 + R * Math.cos(a),
      cy = 128 + R * Math.sin(a);
    if (simple) {
      marks += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="19" fill="${mono ? ink : c.primary}"/>`;
      return;
    }
    const size = 46,
      adv = advance(figtree, ch, size, 800);
    const gd = figtree.getPath(ch, 0, 0, size, { variation: { wght: 800 } }),
      bb = gd.getBoundingBox();
    marks += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="26" fill="${mono ? ink : c.primary}"/><path fill="${mono ? 'none' : c.onPrimary}" ${mono ? 'fill="#000" style="display:none"' : ''} transform="translate(${f1(cx - (bb.x1 + bb.x2) / 2)} ${f1(cy - (bb.y1 + bb.y2) / 2)})" d="${gd.toPathData(2)}"/>`;
    void adv;
  });
  if (mono && !simple) {
    // monocromatico: letras vazadas no selo (mascara)
    marks = '';
    let holes = '';
    [
      ['A', 218],
      ['E', 38],
    ].forEach(([ch, deg]) => {
      const a = (deg * Math.PI) / 180,
        cx = 128 + R * Math.cos(a),
        cy = 128 + R * Math.sin(a);
      const gd = figtree.getPath(ch, 0, 0, 46, { variation: { wght: 800 } }),
        bb = gd.getBoundingBox();
      marks += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="26" fill="#fff"/>`;
      holes += `<path fill="#000" transform="translate(${f1(cx - (bb.x1 + bb.x2) / 2)} ${f1(cy - (bb.y1 + bb.y2) / 2)})" d="${gd.toPathData(2)}"/>`;
    });
    marks = `<mask id="c-mk" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256"><rect width="256" height="256" fill="#000"/>${marks}${holes}</mask><rect width="256" height="256" fill="${ink}" mask="url(#c-mk)"/>`;
  }
  return base + marks + guitar(c, { x: 128, y: 128, scale: 0.68, rot: 38, mono, id: 'c', simple });
}
const VARIANTS = { a: variantA, b: variantB, c: variantC };
const NAMES = { a: 'orbita', b: 'contorno', c: 'minima' };

// ---------- montagem de arquivos ----------
function titleDesc(v) {
  return `<title id="t">Logo do CifrAI</title><desc id="d">Violao com cifras de acordes (${NAMES[v]}): Am, G, C, D7, Em, F, Dm, E.</desc>`;
}
function svgIcon(v, theme, o = {}) {
  const c = THEMES[theme];
  const inner = VARIANTS[v](c, o);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-labelledby="t d">${titleDesc(v)}${inner}</svg>\n`;
}
function svgMono(v, color, o = {}) {
  const c = { ...THEMES.claro, text: color, primary: color, onPrimary: color, hole: color };
  const inner = VARIANTS[v](c, { ...o, mono: true });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-labelledby="t d">${titleDesc(v)}${inner}</svg>\n`;
}
function svgApp(v, theme) {
  // tile para icone PWA: fundo cobre cheio, arte no miolo seguro (maskable: 80%)
  const c = THEMES[theme];
  const t = {
    bg: c.primary,
    primary: c.onPrimary,
    onPrimary: c.primary,
    text: c.onPrimary,
    accent: c.accent,
    hole: c.primary,
  };
  const inner = VARIANTS[v](t, { simple: true });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-labelledby="t d">${titleDesc(v)}<rect width="256" height="256" fill="${c.primary}"/><g transform="translate(25.6 25.6) scale(0.8)">${inner}</g></svg>\n`;
}
function wordmark(theme, mono) {
  // Bricolage tem lookups GSUB que o opentype.js nao le; montamos glifo a glifo (sem ligaduras, kerning ignorado).
  const c = THEMES[theme],
    size = 100,
    track = -1.5;
  let x = 0;
  const place = (str) =>
    str
      .split('')
      .map((ch) => {
        const g = bricolage.charToGlyph(ch),
          d = g.getPath(x, 0, size, { variation: { wght: 800 } }).toPathData(2);
        x += (g.advanceWidth * size) / bricolage.unitsPerEm + track;
        return d;
      })
      .join('');
  const d1 = place('Cifr');
  x -= 7;
  const d2 = place('AI');
  const col1 = mono || c.text,
    col2 = mono || c.primary;
  return {
    svg: `<path fill="${col1}" d="${d1}"/><path fill="${col2}" d="${d2}"/>`,
    width: x - track,
  };
}
function svgLockup(v, theme, mono) {
  const wm = wordmark(theme, mono),
    icon = 124,
    gap = 14,
    size = 100;
  const capH = 0.7 * size;
  void capH;
  const H = 136,
    x0 = icon + gap,
    base = H / 2 + 0.35 * size;
  const iconSvg = mono
    ? VARIANTS[v](
        { ...THEMES.claro, text: mono, primary: mono, onPrimary: mono, hole: mono },
        { mono: true, simple: true },
      )
    : VARIANTS[v](THEMES[theme], { simple: true });
  const W = Math.ceil(x0 + wm.width + 6);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">${titleDesc(v).replace('Logo do CifrAI', 'CifrAI')}<g transform="translate(6 6) scale(${(icon / 256).toFixed(4)})">${iconSvg}</g><g transform="translate(${x0} ${f1(base)})">${wm.svg}</g></svg>\n`;
}

const out = (name, data) => fs.writeFileSync(path.join(here, name), data);
const INK = THEMES.claro.text,
  CREAM = THEMES.claro.bg;
for (const v of Object.keys(VARIANTS)) {
  const N = NAMES[v];
  for (const th of ['claro', 'escuro']) {
    out(`${v}-${N}-icone-${th}.svg`, svgIcon(v, th));
    out(`${v}-${N}-icone-simples-${th}.svg`, svgIcon(v, th, { simple: true }));
    out(`${v}-${N}-lockup-${th}.svg`, svgLockup(v, th));
    out(`${v}-${N}-app-${th}.svg`, svgApp(v, th));
  }
  out(`${v}-${N}-mono-tinta.svg`, svgMono(v, INK));
  out(`${v}-${N}-mono-tinta-simples.svg`, svgMono(v, INK, { simple: true }));
  out(`${v}-${N}-mono-creme.svg`, svgMono(v, CREAM));
  out(`${v}-${N}-mono-creme-simples.svg`, svgMono(v, CREAM, { simple: true }));
  out(`${v}-${N}-lockup-mono-tinta.svg`, svgLockup(v, 'claro', INK));
  out(`${v}-${N}-lockup-mono-creme.svg`, svgLockup(v, 'escuro', CREAM));
}

const pngIdx = process.argv.indexOf('--png');
if (pngIdx > 0) {
  const { Resvg } = req('@resvg/resvg-js');
  const dir = process.argv[pngIdx + 1];
  fs.mkdirSync(dir, { recursive: true });
  const render = (svg, px, bg) =>
    new Resvg(svg, { fitTo: { mode: 'width', value: px }, background: bg }).render().asPng();
  for (const f of fs.readdirSync(here).filter((f) => f.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(here, f), 'utf8');
    const bg = /escuro|creme/.test(f) ? THEMES.escuro.bg : THEMES.claro.bg;
    for (const px of [16, 32, 64, 192, 512])
      fs.writeFileSync(
        path.join(dir, `${f.replace('.svg', '')}-${px}.png`),
        render(svg, px, f.includes('-app-') ? undefined : bg),
      );
  }
}

// ---------- comparar.html (estatico, so <img> apontando para os SVGs) ----------
const TITLES = {
  a: 'A. Orbita (anel de cifras)',
  b: 'B. Contorno (cifras no corpo)',
  c: 'C. Minima (poucas letras)',
};
const sizes = [16, 32, 64, 192];
const strip = (f, themeBg) =>
  `<div class="row" style="background:${themeBg}">${sizes.map((s) => `<figure><img src="${f}" width="${s}" height="${s}" alt=""><figcaption>${s}px</figcaption></figure>`).join('')}</div>`;
let html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Logo CifrAI: comparar variantes</title><style>
:root{--bg:#FBF5EA;--text:#1E1812;--muted:#5A4C3C;--line:#7A6A55}
body{margin:0;padding:24px;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,sans-serif}
h1{font-size:1.5rem;margin:0 0 4px}h2{font-size:1.2rem;margin:32px 0 4px}h3{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:16px 0 6px}
p{color:var(--muted);max-width:60ch;margin:0 0 12px}
.row{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end;padding:16px;border:2px solid var(--line);border-radius:12px}
figure{margin:0;text-align:center}figcaption{font-size:.7rem;color:#8a7a66;margin-top:4px}
.dark figcaption{color:#C7B79F}
img{display:block;image-rendering:auto}
.lock img{height:68px;width:auto}
.tile img{border-radius:22%}
</style></head><body><h1>Logo CifrAI: 3 propostas</h1><p>Tamanhos reais (CSS px). Em telas de alta densidade os tamanhos pequenos ficam mais nitidos que em 1x. Para cada variante: icone completo, icone simplificado (favicon, ate 32px), lockups com wordmark, monocromaticas e tile de app.</p>`;
for (const v of Object.keys(VARIANTS)) {
  const N = NAMES[v];
  html += `<h2>${TITLES[v]}</h2>`;
  for (const [th, bg] of [
    ['claro', '#FBF5EA'],
    ['escuro', '#17120D'],
  ]) {
    html += `<h3>Icone completo, tema ${th}</h3>${strip(`${v}-${N}-icone-${th}.svg`, bg).replace('class="row"', th === 'escuro' ? 'class="row dark"' : 'class="row"')}`;
    html += `<h3>Icone simplificado (favicon), tema ${th}</h3>${strip(`${v}-${N}-icone-simples-${th}.svg`, bg).replace('class="row"', th === 'escuro' ? 'class="row dark"' : 'class="row"')}`;
    html += `<h3>Lockup com wordmark, tema ${th}</h3><div class="row lock${th === 'escuro' ? ' dark' : ''}" style="background:${bg}"><img src="${v}-${N}-lockup-${th}.svg" alt="CifrAI"><img src="${v}-${N}-lockup-${th}.svg" alt="" style="height:36px"><img src="${v}-${N}-lockup-${th}.svg" alt="" style="height:24px"></div>`;
  }
  html += `<h3>Monocromatica (tinta sobre claro, creme sobre escuro; completa e simplificada)</h3><div class="row" style="background:#FBF5EA"><img src="${v}-${N}-mono-tinta.svg" width="128" alt=""><img src="${v}-${N}-mono-tinta-simples.svg" width="64" alt=""><img src="${v}-${N}-lockup-mono-tinta.svg" style="height:56px;width:auto" alt=""></div><div class="row dark" style="background:#17120D;margin-top:8px"><img src="${v}-${N}-mono-creme.svg" width="128" alt=""><img src="${v}-${N}-mono-creme-simples.svg" width="64" alt=""><img src="${v}-${N}-lockup-mono-creme.svg" style="height:56px;width:auto" alt=""></div>`;
  html += `<h3>Tile de app / PWA (192, 64, 32, 16)</h3><div class="row tile" style="background:#FBF5EA">${[192, 64, 32, 16].map((s) => `<img src="${v}-${N}-app-claro.svg" width="${s}" height="${s}" alt="">`).join('')}${[192, 64, 32, 16].map((s) => `<img src="${v}-${N}-app-escuro.svg" width="${s}" height="${s}" alt="">`).join('')}</div>`;
}
html += `</body></html>\n`;
out('comparar.html', html);
