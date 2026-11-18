# task_state.md — CifrAI

> Fonte da verdade do andamento. Leia antes de agir; atualize ao terminar.
> Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluído (exige entrada no `validation_log.md`) · `[!]` bloqueado

**Última atualização:** 2026-11-17
**Fase atual:** F1 — Núcleo do produto (F0 concluída)
**Próxima tarefa:** F1-21 (endurecimento da autenticação), depois F1-08 (endpoints). F1-03 e F1-15 quando o usuário quiser
**Ambiente:** VM dev (Oracle 19c local) · VM prod: ainda não provisionada

## Regras de uso
1. Uma tarefa `[~]` por vez por agente.
2. Cada tarefa tem ID estável (`F0-01`). Não renumerar.
3. Ao concluir: marcar `[x]`, referenciar a entrada do log (`VL-000X`).
4. Bloqueio: marcar `[!]` e descrever em "Bloqueios".

---

## F0 — Fundação
- [x] F0-01 `devops-infra` Monorepo pnpm (`apps/web`, `apps/api`, `packages/shared`, `packages/content`), ESLint, Prettier, tsconfig base, `.nvmrc` (VL-0002)
- [x] F0-02 `gemini-architect` ADR-0001: stack e estrutura (revisão por segunda opinião do Gemini) (VL-0003)
- [x] F0-03 `devops-infra` Dockerfiles multi-stage (web, api), `compose.yaml` + `compose.dev.yaml`, Caddy com HTTPS interno (VL-0004)
- [x] F0-04 `oracle-db` Criar usuários `CIFRAI_MIG` e `CIFRAI_APP` no PDB, script documentado; teste de conexão da API (thin mode) a partir do container (VL-0006)
- [x] F0-05 `oracle-db` Flyway no compose (`migrate`), migração `V001` com tabelas base (VL-0008, VL-0010)
- [x] F0-06 `backend-api` Fastify base: `/health`, `/ready` (checa Oracle), logging estruturado, tratamento de erro padrão (VL-0009)
- [x] F0-07 `frontend-ui` Esqueleto PWA: rotas, layout mobile, design tokens, tema claro/escuro, manifest + service worker (VL-0011, VL-0012)
- [x] F0-08 `qa-validator` Pipeline local de validação (lint, tipos, testes, build docker) + primeiro registro no log (VL-0014)
- [x] F0-10 `gemini-architect` ADR-0002: modelo de sync por log de eventos (idempotente, XP/streak/revisão no servidor, `guestId` no login). Precede F1-07 e F1-11; decide D1 (VL-0013; ADR-0002 aceito em 2026-11-15)
- [x] F0-09 `devops-infra` CI básico (lint, test, build de imagem com tag = SHA) (VL-0015)

## F1 — Núcleo do produto (MVP sem áudio)
- [x] F1-01 `pedagogy-content` Schema Zod de lição/exercício em `packages/content` + validador (`content:validate`). ADR-0002: o catálogo deve expor XP por lição, número de exercícios e estado "aposentado" (VL-0017)
- [x] F1-02 `frontend-ui` Componente `ChordDiagram` (SVG, suporte a canhoto, pestana, X/O) (VL-0018, verificado pelo usuário)
- [x] F1-20 `frontend-ui` Shell responsivo (ADR-0003): fundo de página e superfície de coluna; menu inferior vira barra lateral em `lg` com um único `<nav>`; player continua coluna centrada; aceite em 360×640, 768×1024 e 1280×800 (capturas); ordem de Tab e `aria-current`. Pedido do usuário em 2026-11-17. Precede F1-09 (VL-0025, verificado pelo usuário)
- [x] F1-19 `audio-dsp` + `frontend-ui` Sons de feedback ao acertar e ao errar no player (curtos, agradáveis, sintetizados, sem punir; respeitar mudo/preferência e `prefers-reduced-motion` não se aplica a áudio, mas oferecer chave de som). Pedido do usuário em 2026-11-15 (VL-0027, aprovado pelo usuário)
- [ ] F1-03 `frontend-ui` Componente `Fretboard` interativo (tocar casas para montar acorde)
- [x] F1-16 `frontend-ui` Identidade visual e design system: paleta própria em CSS vars (claro/escuro, contraste forte), tipografia marcante, escala de espaçamento/raio/sombra, UMA abertura de página coreografada, primeiros blocos reutilizáveis (botão, card, barra de progresso, selo de XP). Diretriz do usuário em 2026-11-15 (.claude/agents/frontend-ui.md, "Direção visual"). Precede F1-04 e F1-09; começa depois da F1-14 (VL-0021, aprovado pelo usuário, ícones PWA regerados)
- [x] F1-17 `frontend-ui` Logo exclusiva do CifrAI: violão com a cifra (nomes de acorde) dando volta nele; arte original em SVG, legível em 16 px, claro/escuro; depois regerar ícones PWA, favicon e Wordmark. Pedido do usuário em 2026-11-15 (VL-0023, verificado pelo usuário)
- [x] F1-04 `frontend-ui` Player de lição: máquina de estados, feedback, barra de progresso, tela de resultado (XP) (VL-0022, verificado pelo usuário)
- [x] F1-18 `frontend-ui` Player com som e pontos locais: exercícios com `ChordDiagram` tocável (schema `multiple_choice` com `chordId`/`chordPresentation`) e XP local por evento `lesson.completed` (ADR-0002) com total na Home/Perfil/resultado. Feedback do usuário em 2026-11-15 (VL-0024, verificado pelo usuário)
- [x] F1-05 `frontend-ui` Tipos de exercício: múltipla escolha, associar pares, ordenar, montar acorde, "praticou no violão?" (auto-avaliação) (VL-0026, verificado pelo usuário; schema estendido com chordIds no practice_timer e chordId nos pares do match_pairs)
- [x] F1-06 `backend-api` Auth (e-mail + senha com argon2, sessão por cookie httpOnly) e modo convidado (VL-0030; ADR-0004; revisão de segurança sem bloqueios)
- [x] F1-07 `oracle-db` Modelo de progresso: usuários, progresso por lição, log de XP, streak, cartões de revisão. ADR-0002: provar `executeMany`+`batchErrors` em thin mode no 19c e `ON DELETE CASCADE` (VL-0029; migrações V005..V023 aplicadas no Oracle de dev; verificado do zero)
- [ ] F1-21 `backend-api` + `devops-infra` Endurecimento da autenticação (achados do security-reviewer, VL-0030), ANTES da F1-08: (a) limite por e-mail incrementar antes do verify, com teste `Promise.all` (M1); (b) publicar portas de dev só em `127.0.0.1` e fixar `trustProxy` no IP do Caddy (M2); (c) normalizar senha em NFC antes de hash/verify/política; (d) exigir `Bearer ` no bypass de Origin e centralizar extração de credencial + CSRF num plugin para todo método não seguro em `/v1`; (e) rate limit em `/me` e `/logout`; (f) `Retry-After` no 429 por e-mail; (g) revogar a sessão do cookie anterior no login; (h) validar a resposta antes do `setCookie`; (i) corrigir ADR-0004 §4; (j) Caddy: cabeçalhos sem duplicidade e `admin localhost:2019`
- [ ] F1-08 `backend-api` Endpoints: currículo, progresso, XP, streak, meta diária
- [~] F1-09 `frontend-ui` Trilha de unidades (mapa estilo Duolingo), perfil, meta diária, streak (VL-0028, aguarda verificação visual do usuário)
- [ ] F1-10 `backend-api` Revisão espaçada (SM-2 simplificado) para cifras e acordes
- [ ] F1-11 `frontend-ui` Offline-first: progresso em IndexedDB e sync ao reconectar
- [x] F1-13 `audio-dsp` Tocar o acorde ao clicar no `ChordDiagram` (síntese de corda dedilhada, strum 6ª→1ª, notas calculadas das casas e da afinação E A D G B E). Pedido do usuário em 2026-11-15; "idêntico ao violão" não é garantível por síntese: ver relatório e decidir por amostras (CC0) depois (VL-0019, som aprovado pelo usuário)
- [x] F1-14 `frontend-ui` Nome por extenso abaixo do acorde no `ChordDiagram` (ex.: "G (Sol)", "Am (Lá menor)"). Sugestão do usuário em 2026-11-15 (VL-0020; nome acima do diagrama, aprovado pelo usuário)
- [ ] F1-15 `pedagogy-content` + `frontend-ui` Exercícios de identificar acorde: mostrar a cifra e perguntar o nome (e o inverso, diagrama → nome), cifra ↔ nome (Sol, Lá…). Estende o schema (mídia de acorde em `multiple_choice`); alinhar com F1-05 e F2-03. Sugestão do usuário em 2026-11-15
- [ ] F1-12 `qa-validator` E2E Playwright (viewport mobile) do fluxo: abrir → lição → XP → streak

## F2 — Conteúdo do curso 1 (violão básico)
- [ ] F2-01 `pedagogy-content` U0 Conhecendo o violão e como segurar (postura, posição do polegar)
- [ ] F2-02 `pedagogy-content` U1 Afinação e as 6 cordas (nomes, ordem, afinação por ouvido)
- [ ] F2-03 `pedagogy-content` U2 Notas e cifras (A–G ↔ Lá–Sol, # e b, m, 7, mnemônicos)
- [ ] F2-04 `pedagogy-content` U3 Mão esquerda: soltar os dedos (numeração, "aranha", pressão e posição perto do traste)
- [ ] F2-05 `pedagogy-content` U4 Primeiros acordes (Em, Am, E, A, D) e trocas
- [ ] F2-06 `pedagogy-content` U5 Mão direita: pulso e batidas básicas; incluir exercícios de pizzicato (palma abafando perto do cavalete), base Carlevaro/Tárrega
- [ ] F2-07 `pedagogy-content` U6 Primeiras músicas fáceis (domínio público/folclore + progressões)
- [ ] F2-08 `pedagogy-content` U7 Mais acordes (C, G, Dm, D7, G7) e leitura de cifra completa
- [ ] F2-09 `pedagogy-content` U8 Dedilhado básico (p-i-m-a) e padrões iniciais
- [ ] F2-10 `pedagogy-content` Revisão de segurança/ergonomia de todo o conteúdo (avisos de dor/pausas)

## F3 — Áudio
- [ ] F3-01 `audio-dsp` Metrônomo preciso (AudioContext, agendamento antecipado) com contagem visual
- [ ] F3-02 `audio-dsp` Tons de referência das 6 cordas (E2 A2 D3 G3 B3 E4)
- [ ] F3-03 `audio-dsp` Afinador por microfone (AudioWorklet + detecção de pitch), tolerância ±5 cents
- [ ] F3-04 `frontend-ui` UI do afinador e exercício "afine a corda"
- [ ] F3-05 `audio-dsp` Exercício de ritmo: bater no tempo com o metrônomo (toque na tela)
- [ ] F3-06 `audio-dsp` (pesquisa) Viabilidade de reconhecer acorde tocado via microfone

## F4 — Mobile (APK)
- [ ] F4-01 `frontend-ui` Auditoria PWA (Lighthouse), instalável, ícones, splash
- [ ] F4-02 `devops-infra` Projeto Capacitor, permissão de microfone, build APK debug
- [ ] F4-03 `qa-validator` Teste em aparelho real Android (áudio, latência, offline, botão voltar)
- [ ] F4-04 `security-reviewer` Revisão do APK (cleartext off, deep links, storage)

## F5 — Produção
- [ ] F5-01 `devops-infra` Provisionar VM prod, Docker, Caddy com domínio e TLS
- [ ] F5-02 `oracle-db` Schema prod, usuários, backup/restore testado
- [ ] F5-03 `devops-infra` Deploy por tag + rollback testado (`deploy.sh`, `rollback.sh`)
- [ ] F5-06 `devops-infra` + `backend-api` Pré-produção de autenticação/LGPD (VL-0030): confirmar que o Caddy vê o IP real do cliente (M3; `trusted_proxies` se houver CDN), rota de exclusão de conta, política de privacidade (e-mail, fuso, IP em logs, retenção), decisão sobre menores de 12 anos (LGPD art. 14), job de limpeza de sessões, `SESSION_SECRET` com rotação (`SESSION_SECRET_PREVIOUS`), hardening do container (read_only, cap_drop, no-new-privileges)
- [ ] F5-04 `security-reviewer` Revisão pré-produção (OWASP, LGPD, rate limit, headers)
- [ ] F5-05 `devops-infra` Observabilidade mínima: logs, healthchecks, alerta de indisponibilidade

## Decisões abertas
| # | Pergunta | Responsável | Padrão assumido até decidir |
|---|---|---|---|
| D1 | Modo convidado com sync posterior ou login obrigatório? | você + `backend-api` | Convidado com progresso local; login opcional. **Fechada 2026-11-15:** convidado com sync posterior, login opcional (ADR-0002) |
| D2 | Sistema de "vidas" estilo Duolingo? | você + `pedagogy-content` | **Sem vidas** no MVP (erro não pune, iniciante desiste fácil) |
| D3 | Domínio e registry de imagens (GHCR, privado local?) | `devops-infra` | Registry privado simples na VM dev |
| D4 | Flyway Community cobre o necessário para Oracle 19c? | `oracle-db` | **Fechada 2026-11-15:** sim, Flyway Community 13.12.2 (VL-0008, VL-0010) |
| D5 | Servidor MCP do Gemini a adotar | `gemini-architect` | Ver `.claude/agents/gemini-architect.md` |
| D6 | Monetização futura (assinatura, conteúdo extra)? | você | Fora do escopo do MVP |

## Bloqueios
_Nenhum._

## Notas de sessão
- **Ambiente:** stack dev no ar (`HTTP_PORT=8088 HTTPS_PORT=8443 docker compose -f compose.yaml -f compose.dev.yaml up -d`); web em `http://192.168.20.234:5173`, galeria em `/dev/acordes`. Portas 80/443 e os containers `arasuper-app` e `proxy-nginx` são do usuário: não tocar. Node local 20 (projeto exige 24: CI e Docker usam 24). pnpm em `~/.local/bin`.
- **Segredos:** `.env` e `.mcp.json` são do usuário e ficam fora do git; nunca ler nem imprimir valores. Testar o CI sempre com o `.env.example`.
- **Repositório:** `git@github.com:feliperaac/cifrAI.git` (público), branch `main`. Todo push de código dispara o CI e publica imagens no GHCR; commits só de `*.md` e `docs/**` não disparam.
- **Em andamento (aguarda o usuário):** F1-09 (trilha, perfil, meta e streak em 360, 768 e 1280 px). Próxima: F1-21 (endurecimento da auth), depois F1-08. Próximo VL: 0031.
- **Aguardam o usuário:** decisões de F1-01 (teto de XP 100, categorias de lição, XP por exercício, mínimo de exercícios), valores de XP de repetição (20%) e teto diário (500) propostos no ADR-0002, preferência de dedilhado (G 2-1-3 ou 3-2-4; A 1-2-3), se entra acorde com pestana (F/Bm).
- **Próximas (ordem):** F1-21 (endurecimento da auth, antes da F1-08), F1-08 (endpoints currículo/progresso/sync), F1-10 (SM-2), F1-11 (outbox/sync sobre o `EventStore`), F1-03 (Fretboard; o `FretboardInput` da F1-05 já existe), F1-15 (quizzes de identificar acorde, só com go-ahead; parte do schema já feita), F1-12 (E2E Playwright com projetos mobile 360×640 e desktop 1280×800, ADR-0003). Depois F2 (conteúdo, base Carlevaro/Tárrega, pizzicato na F2-06), F3 (áudio), F4 (APK), F5 (produção, F5-06 LGPD/auth).
- **Ferramentas:** `gh` 2.105 instalado e logado como `feliperaac` (issues no GitHub, rótulos de triagem criados; `docs/agents/*` e seção "Agent skills" no CLAUDE.md). Extensão do Chrome serve para conferir telas (a janela não redimensiona; usar DevTools do usuário para 360/768). Agentes não devem tocar no `.env`; `pnpm validate --stack` derruba a stack dev ao final (subir de novo: comando acima).
- **Decisões do usuário nesta fase:** logo variante C; direção visual A "Cedro e Cobre"; web responsiva em um só código (ADR-0003); base pedagógica Carlevaro e Tárrega + pizzicato; `flyway clean` em dev autorizado uma vez (verificação do zero feita, VL-0029).
- **Memórias do projeto** em `~/.claude/projects/-home-felipe-projetos-pessoal-cifrai/memory/` (fuso Rio Branco, CI, stack no ar, referência Duolingo, direção de design).
