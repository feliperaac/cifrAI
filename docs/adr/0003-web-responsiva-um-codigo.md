# ADR-0003: Web responsiva como produto de primeira classe, um só código

Status: aceito (usuário pediu, em 2026-11-17, ajustar o que existe para web e celular)
Data: 2026-11-17
Relacionados: ADR-0001, F1-09, F1-12, F1-20, F3-03, F4-02, F4-03

## Contexto

O front foi desenhado em 360×640 (coluna de 448 px). No desktop aparece uma coluna estreita, com a borda do menu inferior atravessando a tela e fundo vazio. O mesmo build roda no navegador, como PWA instalado e no APK (o Capacitor embute os arquivos do front no APK; não abre o site remoto). A partir do Android 16, apps com targetSdk 36 podem não conseguir travar orientação e tamanho em telas grandes (a confirmar na documentação de "large screens" antes da F4).

## Opções

(a) coluna centrada com fundo decorativo; (b) shell adaptativo com conteúdo agnóstico de largura; (c) apps separados; (d) moldura de celular no desktop.

## Decisão

(b), em dois passos: (1) acabamento da coluna (fundo de página e superfície); (2) a partir de `lg` (1024 px) o menu inferior vira barra lateral, **sempre um único `<nav>`** reestilizado por CSS, sem renderização condicional. O player de lição fica sempre em coluna única centrada, sem menu. Layouts específicos por tela só com justificativa (uso medido). Painel lateral direito, landing pública e SEO ficam fora deste ADR. Apps separados e moldura de celular estão descartados.

## Consequências

- Web apresentável, tablets cobertos, custo baixo enquanto há poucas telas.
- Toda tela nova precisa de critério de aceite em 360, 768 e 1280 px (entra no Definition of Done do front); risco de deriva dos breakpoints.
- E2E (F1-12): projeto mobile 360×640 com o fluxo completo e projeto desktop 1280×800 com smoke.
- F4-03 passa a conferir: botão voltar do Android dentro da lição (deve abrir o diálogo de saída), tablet em paisagem, teclado virtual e a regra de orientação.
- F3-03: `getUserMedia` com `echoCancellation`, `noiseSuppression` e `autoGainControl` em `false`.
- Reverter: baixo (CSS e shell). Compose, banco e segurança: sem impacto.

## Segunda opinião

`gemini-architect` com consulta ao Gemini: concordam com um só código, um único nav e adiar o painel direito. Divergências: custo (Gemini estimou 1–2 semanas e sugeriu a moldura primeiro; o arquiteto estimou 1–2 dias) e travar orientação em retrato (a confirmar na F4-03). Resolução: passos incrementais.
