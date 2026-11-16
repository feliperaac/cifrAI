// Gera favicon, icones PWA (PNG) e os paths do Wordmark a partir da logo oficial
// (variante C "Minima", fonte: docs/design/logo/c-minima-*.svg).
//
// Uso: LOGO_TOOLS=<pasta com node_modules/@resvg/resvg-js> pnpm --filter @cifrai/web icons
// resvg fica FORA do repo (nao e dependencia do projeto); so os PNG/SVG gerados sao versionados.
// Se mudar a arte, rode antes `node docs/design/logo/gerar.mjs` (precisa de LOGO_TOOLS tambem).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const logoDir = path.join(here, '..', '..', '..', 'docs', 'design', 'logo');
const pub = (name) => path.join(here, '..', 'public', name);
const read = (name) => readFileSync(path.join(logoDir, name), 'utf8');

const tools = process.env.LOGO_TOOLS;
if (!tools) throw new Error('Defina LOGO_TOOLS (pasta com node_modules de @resvg/resvg-js)');
const { Resvg } = createRequire(path.join(tools, 'x.js'))('@resvg/resvg-js');

const app = read('c-minima-app-claro.svg'); // tile cheio, arte em 80% central (zona segura maskable)
const tileRect = '<rect width="256" height="256" fill="#A8330F"/>';
if (!app.includes(tileRect)) throw new Error('Formato do tile mudou; ajuste o script.');
const rounded = app.replace(tileRect, '<rect width="256" height="256" rx="56" fill="#A8330F"/>');

const png = (svg, px) => new Resvg(svg, { fitTo: { mode: 'width', value: px } }).render().asPng();

writeFileSync(pub('favicon.svg'), rounded);
writeFileSync(pub('icon-192.png'), png(rounded, 192));
writeFileSync(pub('icon-512.png'), png(rounded, 512));
writeFileSync(pub('icon-maskable-512.png'), png(app, 512));
writeFileSync(pub('apple-touch-icon.png'), png(app, 180)); // iOS aplica o proprio arredondamento

// Paths do Wordmark (icone simplificado + "CifrAI"), lidos do lockup oficial.
const lock = read('c-minima-lockup-claro.svg');
const body = lock.match(/<path d="([^"]+)" fill="#A8330F"\/><circle cx="0" cy="70"/)?.[1];
const wm = [
  ...lock.matchAll(
    /<g transform="translate\(138 103\)"><path fill="#1E1812" d="([^"]+)"\/><path fill="#A8330F" d="([^"]+)"/g,
  ),
][0];
const viewBox = lock.match(/viewBox="([^"]+)"/)?.[1];
if (!body || !wm || !viewBox) throw new Error('Formato do lockup mudou; ajuste o script.');
writeFileSync(
  path.join(here, '..', 'src', 'components', 'ui', 'logoPaths.ts'),
  `// Gerado por apps/web/scripts/generate-icons.mjs a partir de docs/design/logo (variante C). Nao edite.\n` +
    `export const LOGO_VIEWBOX = '${viewBox}';\n` +
    `export const GUITAR_BODY_D = '${body}';\n` +
    `export const WORD_CIFR_D = '${wm[1]}';\n` +
    `export const WORD_AI_D = '${wm[2]}';\n`,
);
