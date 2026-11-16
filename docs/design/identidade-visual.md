# Identidade visual e design system do CifrAI (F1-16, fase 1: proposta)

Status: **proposta, nada implementado no app**. Comparação visual: abrir `docs/design/paletas.html` no navegador (arquivo estático, 4 painéis: 2 paletas x claro/escuro, com a abertura animada e botão "Repetir abertura"). Contrastes: `node docs/design/contraste.mjs <pasta-de-saida>` (recalcula as razões WCAG 2.x e grava `contrast.md`).

## 1. Conceito e personalidade

**Ideia central: "o aprendizado acontece no braço do violão, não na tela".** A interface é um caderno de estudo de luthier: papel/madeira quentes, tinta forte, traços finos de corda, e um único toque de cor viva para recompensa. Tom: professor paciente, frases curtas, erro nunca pune.

- Assinatura visual: **seis linhas finas (as cordas)** como motivo gráfico (abertura, divisores, fundo do selo de XP, estado vazio). Diagramas de acorde já são o herói do produto; o resto do design existe para dar contraste a eles.
- Formas: cartões com raio generoso e **borda de 2px + sombra sólida deslocada (sem blur)**, o que dá "peso tátil" de botão físico/tecla. Parentesco de ideia com apps de lição (feedback tátil), sem copiar: nada de verde-limão como cor principal de marca, nenhum mascote, tipografia e formas arredondadas próprias.
- Evitar (AI slop): gradiente roxo/azul, cinza neutro sem identidade, cards com vidro/blur genérico, emoji como ícone, sombras difusas iguais em tudo, animações em todo lugar.
- Painel SaaS refinado: números grandes em fonte de display (XP, sequência, % progresso), rótulos pequenos em caixa alta com espaçamento, grade clara e alto contraste.
- Estado atual (referência): tokens em `apps/web/src/styles.css` (teal #0f766e sobre slate, fonte do sistema). É funcional, mas genérico; a proposta substitui paleta e fonte e mantém os nomes de token já usados (`bg, surface, border, text, muted, primary, on-primary`), mais `raised, accent, on-accent, success, danger, focus`, para migração sem quebrar componentes.

## 2. Duas direções de paleta

Ambas: contraste calculado (fórmula WCAG, script `contraste.mjs`), foco azul distinto em ambos os temas, sucesso/erro sempre com ícone + texto (cor não é o único sinal).

### Direção A, "Cedro e Cobre" (quente, madeira de violão)
Papel creme, tinta marrom-preta, primária cobre/terracota, destaque âmbar para XP. Lembra tampo de violão e verniz; nada de roxo.

```css
:root {
  --color-bg: #FBF5EA;
  --color-surface: #F2E9D8;
  --color-raised: #FFFFFF;
  --color-border: #7A6A55;
  --color-text: #1E1812;
  --color-muted: #5A4C3C;
  --color-primary: #A8330F;
  --color-on-primary: #FFF8EF;
  --color-accent: #F2B22E;
  --color-on-accent: #1E1812;
  --color-success: #1B6B43;
  --color-danger: #A8201A;
  --color-focus: #0B4FB3;
}
:root[data-theme='dark'] {
  --color-bg: #17120D;
  --color-surface: #241D15;
  --color-raised: #2F261B;
  --color-border: #9C8A72;
  --color-text: #F6EDDD;
  --color-muted: #C7B79F;
  --color-primary: #FF8A5B;
  --color-on-primary: #2A0E03;
  --color-accent: #F5BE4A;
  --color-on-accent: #1E1812;
  --color-success: #5FD49A;
  --color-danger: #FF8F86;
  --color-focus: #8DB9FF;
}
```

### Direção B, "Pinho e Limão" (verde profundo + lima elétrica)
Fundo esverdeado frio, primária pinho no claro; no escuro a primária vira lima elétrica sobre quase-preto verde, destaque coral. Mais "painel de estúdio", mais energia, mas mais próximo do verde-vivo que apps de lição usam (risco de parecer derivado).

```css
:root {
  --color-bg: #F3F7F2;
  --color-surface: #E3ECE2;
  --color-raised: #FFFFFF;
  --color-border: #5B7164;
  --color-text: #0D1F18;
  --color-muted: #41564B;
  --color-primary: #0A5C49;
  --color-on-primary: #F3FBEF;
  --color-accent: #C8F25B;
  --color-on-accent: #0D1F18;
  --color-success: #17693F;
  --color-danger: #B3261E;
  --color-focus: #1747B5;
}
:root[data-theme='dark'] {
  --color-bg: #0A1511;
  --color-surface: #122019;
  --color-raised: #1A2E24;
  --color-border: #7E9C8B;
  --color-text: #EAF4E6;
  --color-muted: #A9C2B2;
  --color-primary: #C8F25B;
  --color-on-primary: #0D1F18;
  --color-accent: #FF7A59;
  --color-on-accent: #1B0903;
  --color-success: #6EDBA0;
  --color-danger: #FF938A;
  --color-focus: #9DBFFF;
}
```

Observações de uso:
- `accent` (âmbar/lima/coral) **nunca vive sozinho sobre o fundo**: no claro, selo de XP tem borda `text` (razão >= 9); no escuro, `accent` sobre `bg` passa 3:1 como componente gráfico. Texto sobre ele usa `on-accent`.
- `border` foi escolhido com >= 3:1 sobre `bg` e `surface` (WCAG 1.4.11), por isso é mais forte que o usual; bordas decorativas leves podem usar `border` a 50% de opacidade só em elementos não interativos.

### Razões de contraste calculadas (todas passam AA; 0 falhas)
Mínimos: 4,5 texto normal, 3 componente gráfico/borda/foco.

**A · Cedro e Cobre · claro**

| Par (frente sobre fundo) | Razão | Mínimo | AA |
|---|---|---|---|
| text #1E1812 / bg #FBF5EA | 16.20 | 4.5 | passa |
| text #1E1812 / surface #F2E9D8 | 14.58 | 4.5 | passa |
| text #1E1812 / raised #FFFFFF | 17.58 | 4.5 | passa |
| muted #5A4C3C / bg #FBF5EA | 7.64 | 4.5 | passa |
| muted #5A4C3C / surface #F2E9D8 | 6.88 | 4.5 | passa |
| on-primary #FFF8EF / primary #A8330F | 6.33 | 4.5 | passa |
| primary #A8330F / bg #FBF5EA | 6.15 | 4.5 | passa |
| on-accent #1E1812 / accent #F2B22E | 9.36 | 4.5 | passa |
| border #7A6A55 / bg #FBF5EA | 4.81 | 3 | passa |
| border #7A6A55 / surface #F2E9D8 | 4.33 | 3 | passa |
| success #1B6B43 / bg #FBF5EA | 5.99 | 4.5 | passa |
| danger #A8201A / bg #FBF5EA | 6.70 | 4.5 | passa |
| success #1B6B43 / surface #F2E9D8 | 5.39 | 4.5 | passa |
| danger #A8201A / surface #F2E9D8 | 6.04 | 4.5 | passa |
| focus #0B4FB3 / bg #FBF5EA | 6.95 | 3 | passa |
| focus #0B4FB3 / surface #F2E9D8 | 6.26 | 3 | passa |
| text #1E1812 / accent #F2B22E | 9.36 | 3 | passa |

**A · Cedro e Cobre · escuro**

| Par (frente sobre fundo) | Razão | Mínimo | AA |
|---|---|---|---|
| text #F6EDDD / bg #17120D | 16.01 | 4.5 | passa |
| text #F6EDDD / surface #241D15 | 14.33 | 4.5 | passa |
| text #F6EDDD / raised #2F261B | 12.78 | 4.5 | passa |
| muted #C7B79F / bg #17120D | 9.48 | 4.5 | passa |
| muted #C7B79F / surface #241D15 | 8.48 | 4.5 | passa |
| on-primary #2A0E03 / primary #FF8A5B | 7.77 | 4.5 | passa |
| primary #FF8A5B / bg #17120D | 8.01 | 4.5 | passa |
| on-accent #1E1812 / accent #F5BE4A | 10.34 | 4.5 | passa |
| border #9C8A72 / bg #17120D | 5.57 | 3 | passa |
| border #9C8A72 / surface #241D15 | 4.99 | 3 | passa |
| success #5FD49A / bg #17120D | 10.07 | 4.5 | passa |
| danger #FF8F86 / bg #17120D | 8.44 | 4.5 | passa |
| success #5FD49A / surface #241D15 | 9.01 | 4.5 | passa |
| danger #FF8F86 / surface #241D15 | 7.55 | 4.5 | passa |
| focus #8DB9FF / bg #17120D | 9.32 | 3 | passa |
| focus #8DB9FF / surface #241D15 | 8.34 | 3 | passa |
| accent #F5BE4A / bg #17120D | 10.94 | 3 | passa |

**B · Pinho e Limão · claro**

| Par (frente sobre fundo) | Razão | Mínimo | AA |
|---|---|---|---|
| text #0D1F18 / bg #F3F7F2 | 15.82 | 4.5 | passa |
| text #0D1F18 / surface #E3ECE2 | 14.16 | 4.5 | passa |
| text #0D1F18 / raised #FFFFFF | 17.12 | 4.5 | passa |
| muted #41564B / bg #F3F7F2 | 7.30 | 4.5 | passa |
| muted #41564B / surface #E3ECE2 | 6.53 | 4.5 | passa |
| on-primary #F3FBEF / primary #0A5C49 | 7.52 | 4.5 | passa |
| primary #0A5C49 / bg #F3F7F2 | 7.35 | 4.5 | passa |
| on-accent #0D1F18 / accent #C8F25B | 13.30 | 4.5 | passa |
| border #5B7164 / bg #F3F7F2 | 4.86 | 3 | passa |
| border #5B7164 / surface #E3ECE2 | 4.35 | 3 | passa |
| success #17693F / bg #F3F7F2 | 6.20 | 4.5 | passa |
| danger #B3261E / bg #F3F7F2 | 6.04 | 4.5 | passa |
| success #17693F / surface #E3ECE2 | 5.55 | 4.5 | passa |
| danger #B3261E / surface #E3ECE2 | 5.40 | 4.5 | passa |
| focus #1747B5 / bg #F3F7F2 | 7.45 | 3 | passa |
| focus #1747B5 / surface #E3ECE2 | 6.67 | 3 | passa |
| text #0D1F18 / accent #C8F25B | 13.30 | 3 | passa |

**B · Pinho e Limão · escuro**

| Par (frente sobre fundo) | Razão | Mínimo | AA |
|---|---|---|---|
| text #EAF4E6 / bg #0A1511 | 16.47 | 4.5 | passa |
| text #EAF4E6 / surface #122019 | 14.91 | 4.5 | passa |
| text #EAF4E6 / raised #1A2E24 | 12.73 | 4.5 | passa |
| muted #A9C2B2 / bg #0A1511 | 9.79 | 4.5 | passa |
| muted #A9C2B2 / surface #122019 | 8.86 | 4.5 | passa |
| on-primary #0D1F18 / primary #C8F25B | 13.30 | 4.5 | passa |
| primary #C8F25B / bg #0A1511 | 14.45 | 4.5 | passa |
| on-accent #1B0903 / accent #FF7A59 | 7.53 | 4.5 | passa |
| border #7E9C8B / bg #0A1511 | 6.22 | 3 | passa |
| border #7E9C8B / surface #122019 | 5.63 | 3 | passa |
| success #6EDBA0 / bg #0A1511 | 10.90 | 4.5 | passa |
| danger #FF938A / bg #0A1511 | 8.68 | 4.5 | passa |
| success #6EDBA0 / surface #122019 | 9.87 | 4.5 | passa |
| danger #FF938A / surface #122019 | 7.86 | 4.5 | passa |
| focus #9DBFFF / bg #0A1511 | 10.04 | 3 | passa |
| focus #9DBFFF / surface #122019 | 9.09 | 3 | passa |
| accent #FF7A59 / bg #0A1511 | 7.25 | 3 | passa |


## 3. Tipografia

| Papel | Família | Licença | Arquivo (latin, variável) | Tamanho |
|---|---|---|---|---|
| Display (títulos, números, wordmark) | **Bricolage Grotesque** (eixo wght 200-800) | OFL-1.1 | `bricolage-grotesque-latin-wght-normal.woff2` | 41.344 B (41.416 B gzip; woff2 já é comprimido) |
| Texto/UI | **Figtree** (wght 300-900) | OFL-1.1 | `figtree-latin-wght-normal.woff2` | 20.156 B |

Total ~61 KB de fonte, **fora do orçamento de JS** (é asset, não bundle), precache no service worker. Subconjunto `latin` cobre todo o pt-BR (ã, ç, é, õ). Obtidas do pacote npm `@fontsource-variable/*` 5.3.0 (OFL-1.1); fonte original Google Fonts. Self-hosted: `@font-face` com `font-display: swap`, `<link rel=preload as=font crossorigin>` só da Bricolage (LCP do título). Fallback: `system-ui`. Bricolage tem personalidade (terminais com leve contraste, "humanista quirky") sem ser infantil; Figtree é legível em tamanho pequeno e tem numerais tabulares bons. Usar só 3 pesos: 500 (texto), 700 (ênfase/botões), 800 (display).

Escala (rem, base 16px, respeita zoom de fonte; razão ~1,25, mobile-first):

| Token | Tamanho/entrelinha | Uso |
|---|---|---|
| `text-xs` | 0,75/1,1 | rótulos em caixa alta (+0,06em) |
| `text-sm` | 0,875/1,25 | legendas, ajuda |
| `text-base` | 1/1,5 | corpo |
| `text-lg` | 1,125/1,4 | enunciado de exercício |
| `text-xl` | 1,375/1,3 | título de card (display 700) |
| `text-2xl` | 1,75/1,2 | título de página (display 800) |
| `text-4xl` | 2,5/1 | números de destaque: XP, resultado (display 800, tabular-nums) |

## 4. Espaçamento, raio e sombra

- Espaçamento (base 4px): 4, 8, 12, 16, 24, 32, 48. Alvo de toque `--space-tap: 3rem` (48px) mantido.
- Raio: `sm` 8px (chips, inputs), `md` 14px (botões), `card` 20px, `pill` 999px (selo, barra).
- Sombra: **sólida e deslocada, sem blur**: `raised` = `0 4px 0 var(--color-border)` (cards), `press` botão = `0 4px 0 var(--color-text)` que cai para `0 1px 0` e `translateY(3px)` ao pressionar. Sem sombra difusa. Elevação de overlay (modal/sheet): `0 -8px 0 var(--color-border)` não é necessária; usar borda 2px + `raised`.
- Bordas: 2px padrão.

## 5. A UMA abertura coreografada

**"Afinação"**, só no primeiro carregamento da sessão (flag em `sessionStorage`; não repete em navegação interna) e na Home:
1. 0 a 500 ms: as 6 linhas-corda ao lado do wordmark se desenham da esquerda para a direita, com atraso de 60 ms entre elas (stroke-dashoffset, easing `cubic-bezier(.2,.7,.2,1)`).
2. 350 a 750 ms: wordmark "CifrAI" sobe 8px e aparece.
3. 500 a 1000 ms: blocos da Home (selo XP/sequência, card da lição atual, botão) entram em cascata de 80 ms, subindo 10px.
Duração total ~1,0 s; só `opacity`/`transform`/`stroke-dashoffset` (compositor, sem layout); não bloqueia interação nem o LCP (conteúdo existe no DOM, só é animado).
**`prefers-reduced-motion: reduce`**: nenhuma animação; estado final imediato (já implementado no protótipo e na regra global de `styles.css`). Sem JS: o CSS roda sozinho. Demais microinterações (pressionar botão, acorde tocando) são feedback funcional curto (<=120 ms), não decoração, e também respeitam reduce.

## 6. Primeiros blocos reutilizáveis

Todos em `apps/web/src/components/ui/`, sem lógica de negócio, textos via catálogo i18n, cada um com teste de componente.

| Bloco | Variantes | Estados |
|---|---|---|
| `Button` | primary, secondary, ghost; tamanho único >= 48px; `fullWidth` | default, hover, focus-visible (anel 3px `focus`), pressed (cai 3px), disabled (surface+muted, `aria-disabled`), loading (spinner + texto "Carregando", sem trocar largura) |
| `Card` | flat, raised, interactive (vira botão/link com `role` correto) | default, hover, focus, selected (borda `primary` 4px + ícone check), disabled; slot de `loading` (skeleton), `empty`, `error` (mensagem + "Tentar de novo") |
| `ProgressBar` | lição (primary), unidade (accent) | `role=progressbar` com `aria-valuenow`; 0%, parcial, 100% (ganha ícone check), indeterminada quando carregando; anima largura 300 ms (instantâneo em reduce) |
| `XpBadge` | pill com número display + "XP" | default, ganhando (+N com contagem curta, 400 ms; estático em reduce), zero, `aria-live=polite` para anunciar ganho |
| (seguintes) `FeedbackBanner` (certo/quase, ícone+texto), `StreakChip`, `Tag` | | |

## 7. Dependências novas

- **Nenhuma biblioteca JS nova.** Tailwind 4 + CSS vars + SVG resolvem tudo; shadcn/ui e DaisyUI **não recomendados**: shadcn exige Radix por componente e CLI de cópia (peso e superfície de manutenção sem necessidade para 4 blocos); DaisyUI impõe tema/visual próprio, indo contra "sem cara de template". Radix Primitives só quando surgir Dialog/Tabs/Tooltip reais (avaliar então, MIT, ~3-6 KB gz por primitivo).
- Fontes: 2 arquivos woff2 (~61 KB, OFL-1.1, self-hosted via copia em `apps/web/public/fonts` ou pacotes `@fontsource-variable/*` 5.3.0 como devDependency; preferência: copiar arquivos para não adicionar dependência). Não entram no orçamento de 200 KB gz de JS; entram no precache do SW (tamanho total de precache a registrar).
- Impacto em JS: ~0 (CSS adicional estimado < 3 KB gz).

## 8. Recomendação

**Seguir a Direção A (Cedro e Cobre).** Razões: (1) liga a identidade ao objeto do produto (madeira/verniz do violão), dando "porquê" ao design; (2) afasta-se claramente do verde-vivo associado a apps de lição, evitando parecer derivado; (3) cobre/âmbar sobre creme dá ótimo contraste e leitura de diagramas (marcadores cobre sobre papel claro), e o escuro marrom-quente é menos fadigante que preto azulado; (4) todas as razões >= 6,1 para primária e >= 9 para texto. A B é mais "energética" e boa se o usuário quiser um tom tecnológico/estúdio; se escolher B, só trocar o bloco de tokens (a estrutura é idêntica).

## Pendências / não verificado

- Renderização do `paletas.html` **não foi aberta em navegador** nesta sessão (sem Chromium disponível); HTML/CSS escritos e ainda por revisar visualmente (o usuário deve abrir).
- Contrastes calculados só para os pares listados, não para todo uso possível (ex.: texto sobre diagrama, estados hover); revalidar ao implementar.
- Não medido: impacto real de LCP/precache das fontes, nem renderização das fontes em Android; sem teste de daltonismo; sem Lighthouse.
- Nenhum código do app alterado; `ChordDiagram` ainda usa cores atuais e precisará ser migrado para os tokens novos (marcador `primary`, número `on-primary`).
