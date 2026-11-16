import fs from 'node:fs';
const P = {
  A: {
    name: 'A · Cedro e Cobre',
    light: {
      bg: '#FBF5EA',
      surface: '#F2E9D8',
      raised: '#FFFFFF',
      border: '#7A6A55',
      text: '#1E1812',
      muted: '#5A4C3C',
      primary: '#A8330F',
      'on-primary': '#FFF8EF',
      accent: '#F2B22E',
      'on-accent': '#1E1812',
      success: '#1B6B43',
      danger: '#A8201A',
      focus: '#0B4FB3',
    },
    dark: {
      bg: '#17120D',
      surface: '#241D15',
      raised: '#2F261B',
      border: '#9C8A72',
      text: '#F6EDDD',
      muted: '#C7B79F',
      primary: '#FF8A5B',
      'on-primary': '#2A0E03',
      accent: '#F5BE4A',
      'on-accent': '#1E1812',
      success: '#5FD49A',
      danger: '#FF8F86',
      focus: '#8DB9FF',
    },
  },
  B: {
    name: 'B · Pinho e Limão',
    light: {
      bg: '#F3F7F2',
      surface: '#E3ECE2',
      raised: '#FFFFFF',
      border: '#5B7164',
      text: '#0D1F18',
      muted: '#41564B',
      primary: '#0A5C49',
      'on-primary': '#F3FBEF',
      accent: '#C8F25B',
      'on-accent': '#0D1F18',
      success: '#17693F',
      danger: '#B3261E',
      focus: '#1747B5',
    },
    dark: {
      bg: '#0A1511',
      surface: '#122019',
      raised: '#1A2E24',
      border: '#7E9C8B',
      text: '#EAF4E6',
      muted: '#A9C2B2',
      primary: '#C8F25B',
      'on-primary': '#0D1F18',
      accent: '#FF7A59',
      'on-accent': '#1B0903',
      success: '#6EDBA0',
      danger: '#FF938A',
      focus: '#9DBFFF',
    },
  },
};
const lin = (c) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const L = (h) => {
  const n = parseInt(h.slice(1), 16);
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const cr = (a, b) => {
  const [x, y] = [L(a), L(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const pairs = [
  ['text', 'bg', 4.5],
  ['text', 'surface', 4.5],
  ['text', 'raised', 4.5],
  ['muted', 'bg', 4.5],
  ['muted', 'surface', 4.5],
  ['on-primary', 'primary', 4.5],
  ['primary', 'bg', 4.5],
  ['on-accent', 'accent', 4.5],
  ['border', 'bg', 3],
  ['border', 'surface', 3],
  ['success', 'bg', 4.5],
  ['danger', 'bg', 4.5],
  ['success', 'surface', 4.5],
  ['danger', 'surface', 4.5],
  ['focus', 'bg', 3],
  ['focus', 'surface', 3],
];
let md = '',
  fail = 0;
for (const k in P)
  for (const m of ['light', 'dark']) {
    md += `\n**${P[k].name} · ${m === 'light' ? 'claro' : 'escuro'}**\n\n| Par (frente sobre fundo) | Razão | Mínimo | AA |\n|---|---|---|---|\n`;
    for (const [f, b, min] of [
      ...pairs,
      m === 'light' ? ['text', 'accent', 3] : ['accent', 'bg', 3],
    ]) {
      const r = cr(P[k][m][f], P[k][m][b]);
      const ok = r >= min;
      if (!ok) fail++;
      md += `| ${f} ${P[k][m][f]} / ${b} ${P[k][m][b]} | ${r.toFixed(2)} | ${min} | ${ok ? 'passa' : 'FALHA'} |\n`;
    }
  }
fs.writeFileSync(process.argv[2] + '/contrast.md', md);
fs.writeFileSync(process.argv[2] + '/palettes.json', JSON.stringify(P));
console.log('fail', fail);
console.log(
  md
    .split('\n')
    .filter((l) => l.includes('FALHA') || l.startsWith('**'))
    .join('\n'),
);
