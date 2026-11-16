# Logo do CifrAI (F1-17, fase 1: proposta)

Status: **proposta**. Nada foi aplicado em `apps/web` nem em `public/`. Comparação visual: abrir `docs/design/logo/comparar.html` no navegador (estático, só `<img>` para os SVGs, fundo claro e escuro, tamanhos reais 16, 32, 64 e 192 px).

Brief do usuário: "um violão e uma cifra dando volta nele". Três leituras da ideia, todas desenhadas à mão (curvas Catmull-Rom sobre pontos escritos no script), sem mascote e sem nota musical.

## As três variantes

| | Ideia | Arquivos (prefixo) |
|---|---|---|
| **A. Órbita** | Violão inclinado 38 graus dentro de um anel fino; 8 cifras (Am G C D7 Em F Dm E) em órbita, letras tangentes ao círculo, separadas por pontos cobre | `a-orbita-*` |
| **B. Contorno** | Violão em pé; as cifras (12, Am G C D7 Em F Dm E Am G C D7) correm pelo contorno do corpo e do braço, no caminho deslocado 7 unidades para fora | `b-contorno-*` |
| **C. Mínima** | Violão inclinado, anel aberto em dois arcos e dois selos com as letras **A** e **E** (as duas cordas-nome do violão e acordes de corda solta) | `c-minima-*` |

Detalhes do violão (todas): corpo cobre, boca escura com roseta fina, 6 cordas convergindo do nut à ponte. O "A" e o "I" do wordmark vêm em cobre; "Cifr" em tinta (A e I maiúsculos, como o usuário escreve).

## Arquivos por variante (prefixo `<v>-<nome>-`)

- `icone-claro.svg`, `icone-escuro.svg`: marca completa, fundo transparente.
- `icone-simples-claro.svg`, `icone-simples-escuro.svg`: **versão simplificada para favicon/ícone pequeno** (cifras viram pontos ou arcos; roseta mais grossa).
- `lockup-claro.svg`, `lockup-escuro.svg`: horizontal, ícone simplificado + wordmark "CifrAI". (Nos lockups usei o ícone simplificado de propósito: as cifras ficariam ilegíveis ao lado de um texto grande.)
- `mono-tinta.svg`, `mono-creme.svg` (+ `-simples`) e `lockup-mono-tinta.svg`, `lockup-mono-creme.svg`: uma cor só, boca/cordas/letras vazadas por máscara SVG, funcionam sobre qualquer fundo que contraste.
- `app-claro.svg`, `app-escuro.svg`: tile quadrado cheio (primária como fundo, arte em 80% central, dentro da zona segura maskable) para ícone PWA. Para gerar PNG 192/512, rasterizar estes.
- `gerar.mjs`: gera tudo e `comparar.html`. As dependências ficam **fora do repo**: `LOGO_TOOLS=<pasta com node_modules de opentype.js, wawoff2, @resvg/resvg-js> node gerar.mjs [--png <pasta>]`.

## Independência de fonte

Todo texto (cifras e wordmark) está **convertido em paths** a partir dos arquivos em `docs/design/fonts` (Figtree 800 para as cifras; Bricolage Grotesque 800 para o wordmark, ambas OFL-1.1). Nenhum SVG contém `<text>` nem `font-family` (conferido por grep). O kerning par-a-par da Bricolage não é lido pelo opentype.js (lookups GSUB/GPOS não suportados), então o espaçamento foi montado glifo a glifo com tracking de -1,5 e um ajuste manual de -7 entre "r" e "A"; vale um olho de designer.

## Cores e contraste (só tokens da direção A; razões WCAG 2.x calculadas com a mesma fórmula de `contraste.mjs`)

| Par | Razão | Mínimo | Resultado |
|---|---|---|---|
| Cifras `text #1E1812` / `bg #FBF5EA` (claro) | 16,20 | 4,5 | passa |
| Cifras `text #F6EDDD` / `bg #17120D` (escuro) | 16,01 | 4,5 | passa |
| "AI" e violão `primary #A8330F` / `bg #FBF5EA` | 6,15 | 4,5 / 3 | passa |
| "AI" e violão `primary #FF8A5B` / `bg #17120D` | 8,01 | 4,5 / 3 | passa |
| Cordas e roseta `on-primary #FFF8EF` / `primary #A8330F` | 6,33 | 3 | passa |
| Cordas, roseta e boca `#2A0E03` / `primary #FF8A5B` (escuro) | 7,77 | 3 | passa |
| Letra do selo (C) `on-primary` sobre `primary`, claro e escuro | 6,33 / 7,77 | 4,5 | passa |
| Tile de app, arte `on-primary #FFF8EF` / `primary #A8330F` | 6,33 | 3 | passa |
| Tile de app escuro, arte `#2A0E03` / `#FF8A5B` | 7,77 | 3 | passa |
| Mono tinta `#1E1812` / `#FBF5EA`; mono creme `#FBF5EA` / `#17120D` | 16,20 / 17,14 | 3 | passa |
| Boca `#1E1812` sobre corpo `#A8330F` (tema claro) | **2,63** | 3 | **abaixo de 3:1**; é detalhe decorativo e a roseta creme em volta (6,33) já delimita a boca, mas fica registrado |

O `accent` âmbar **não é usado** na marca: sobre o fundo claro ele não chega a 3:1 (ver `identidade-visual.md`). O logo respeita "accent nunca vive sozinho".

## Teste de legibilidade (renderizado com resvg, PNG ampliado 3x só para eu enxergar; ver "o que vi")

| Variante | 192 px | 64 px | 32 px | 16 px |
|---|---|---|---|---|
| A completa | cifras legíveis, violão e cordas claros | cifras Am, G, C legíveis com esforço, D7/Em/F/Dm/E já pequenas | cifras viram pontilhado; só violão + anel | só silhueta |
| B completa | cifras e contorno legíveis | cifras **ilegíveis**, vira silhueta com "poeira" em volta | ilegível | ilegível |
| C completa | letras A e E nítidas | nítidas | letras ainda reconhecíveis como selos, não como letras | massa de cor, silhueta ainda reconhecível |
| Simples (A, B, C) | boa | boa | A: anel tracejado + violão ok; B: pontos em volta ficam sujos; C: violão + anel + 2 pontos, limpo | C e A aceitáveis, B não |

Regra definida: **a partir de 64 px usar o ícone simplificado; o completo só em 128 px ou mais** (splash, "Sobre", README, loja). As cordas só aparecem a partir do completo; no simplificado ficam a boca com roseta grossa.

## Recomendação

1. **Marca principal, favicon e ícone PWA: variante C** (`c-minima-icone-simples-*`, `c-minima-app-*`, lockup `c-minima-lockup-*`). É a única legível em 16 e 32 px, conta a ideia (violão + cifra em volta) com A e E, e combina com o selo de XP e com os arcos da abertura "Afinação".
2. **Ilustração grande (splash, tela "Sobre", empty state, README): variante A completa**, é a que mais entrega o pedido "cifra dando volta". Sugestão futura (fase 2, não feita): na abertura, o anel de cifras gira lentamente uma volta e para; respeitar `prefers-reduced-motion`.
3. **B**: bonita grande, mas não escala; não recomendo como marca. Fica registrada.

Se o usuário preferir uma marca única para tudo, escolher C.

## Fase 2 (só depois de aprovar uma variante)

Gerar PNG 192/512 maskable e 512 "any" a partir de `*-app-*.svg`, favicon.svg (`*-icone-simples-*` com `prefers-color-scheme`), integrar o lockup no cabeçalho e na tela inicial, atualizar `manifest` e `theme_color`. Isso toca `apps/web`/`public/` e foi deliberadamente deixado de fora.

## Não verificado

- `comparar.html` **não foi aberto em navegador** (sem Chromium aqui). Conferi apenas os SVGs rasterizados com resvg (renderer diferente de Chrome/Safari; máscaras SVG e `rotate` funcionam em ambos, mas não testei).
- Não vi os SVGs em tela real de celular, nem em Android/iOS; a nitidez a 16/32 px foi avaliada em PNG 1x ampliado.
- Não testei daltonismo nem alto contraste forçado (as monocromáticas ajudam, mas é suposição).
- Revisão de marca/direitos: desenho próprio, mas não fiz busca de anterioridade; há muitos logos de violão, vale uma checagem rápida antes de registrar.
- Kerning do wordmark ajustado à mão (ver acima).
