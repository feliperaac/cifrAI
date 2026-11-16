# task_state.md — CifrAI

> Fonte da verdade do andamento. Leia antes de agir; atualize ao terminar.
> Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluído (exige entrada no `validation_log.md`) · `[!]` bloqueado

**Última atualização:** 2026-11-15
**Fase atual:** F1 — Núcleo do produto (F0 concluída)
**Próxima tarefa:** F1-02 (ChordDiagram)
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
- [~] F1-02 `frontend-ui` Componente `ChordDiagram` (SVG, suporte a canhoto, pestana, X/O)
- [ ] F1-03 `frontend-ui` Componente `Fretboard` interativo (tocar casas para montar acorde)
- [ ] F1-04 `frontend-ui` Player de lição: máquina de estados, feedback, barra de progresso, tela de resultado (XP)
- [ ] F1-05 `frontend-ui` Tipos de exercício: múltipla escolha, associar pares, ordenar, montar acorde, "praticou no violão?" (auto-avaliação)
- [ ] F1-06 `backend-api` Auth (e-mail + senha com argon2, sessão por cookie httpOnly) e modo convidado
- [ ] F1-07 `oracle-db` Modelo de progresso: usuários, progresso por lição, log de XP, streak, cartões de revisão. ADR-0002: provar `executeMany`+`batchErrors` em thin mode no 19c e `ON DELETE CASCADE`
- [ ] F1-08 `backend-api` Endpoints: currículo, progresso, XP, streak, meta diária
- [ ] F1-09 `frontend-ui` Trilha de unidades (mapa estilo Duolingo), perfil, meta diária, streak
- [ ] F1-10 `backend-api` Revisão espaçada (SM-2 simplificado) para cifras e acordes
- [ ] F1-11 `frontend-ui` Offline-first: progresso em IndexedDB e sync ao reconectar
- [~] F1-13 `audio-dsp` Tocar o acorde ao clicar no `ChordDiagram` (síntese de corda dedilhada, strum 6ª→1ª, notas calculadas das casas e da afinação E A D G B E). Pedido do usuário em 2026-11-15; "idêntico ao violão" não é garantível por síntese: ver relatório e decidir por amostras (CC0) depois
- [ ] F1-12 `qa-validator` E2E Playwright (viewport mobile) do fluxo: abrir → lição → XP → streak

## F2 — Conteúdo do curso 1 (violão básico)
- [ ] F2-01 `pedagogy-content` U0 Conhecendo o violão e como segurar (postura, posição do polegar)
- [ ] F2-02 `pedagogy-content` U1 Afinação e as 6 cordas (nomes, ordem, afinação por ouvido)
- [ ] F2-03 `pedagogy-content` U2 Notas e cifras (A–G ↔ Lá–Sol, # e b, m, 7, mnemônicos)
- [ ] F2-04 `pedagogy-content` U3 Mão esquerda: soltar os dedos (numeração, "aranha", pressão e posição perto do traste)
- [ ] F2-05 `pedagogy-content` U4 Primeiros acordes (Em, Am, E, A, D) e trocas
- [ ] F2-06 `pedagogy-content` U5 Mão direita: pulso e batidas básicas
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
_(Anote aqui contexto que a próxima sessão precisa saber.)_
