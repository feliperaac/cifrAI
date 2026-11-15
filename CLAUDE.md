# CifrAI — CLAUDE.md

> App estilo Duolingo para aprender **violão** do zero. Webapp (PWA) primeiro; depois empacotado como APK via Capacitor (WebView). Idioma do produto: **pt-BR**. Idioma do código e identificadores: **inglês**. Documentação: **pt-BR**.

## 1. Protocolo obrigatório (em toda sessão)

1. **Leia `task_state.md`** antes de qualquer coisa. Ele é a fonte da verdade sobre o que está feito, em andamento e bloqueado.
2. Escolha **uma** tarefa por vez (a de maior prioridade não bloqueada). Marque-a como `[~]` em andamento.
3. **Delegue** ao agente certo (seção 9). Tarefas que cruzam camadas são quebradas em subtarefas por camada.
4. Implemente em passos pequenos, com testes junto do código.
5. **Valide** (seção 8) e **registre evidências** em `validation_log.md` (comando executado + resultado real).
6. Atualize `task_state.md` (`[x]` só se houver entrada correspondente no `validation_log.md`).
7. Nunca declare "pronto/funcionando" sem evidência de comando executado. "Deveria funcionar" não é validação.

## 2. Decisões de arquitetura (resumo)

| Área | Decisão | Motivo |
|---|---|---|
| Linguagem | **TypeScript (strict)** em tudo | Um idioma, tipos e schemas compartilhados front/back, ótimo para IA e iteração rápida |
| Front | React + Vite + PWA (`vite-plugin-pwa`), TanStack Query, Zustand, React Router, Tailwind + design tokens | Mobile-first, offline, leve |
| Back | Node.js LTS + Fastify + Zod | Rápido, validação na borda, boa DX |
| Banco | **Oracle 19c** via `node-oracledb` 6.x **thin mode** | Já disponível localmente; thin mode dispensa Oracle Instant Client na imagem |
| Migrações | Flyway (container) com SQL versionado em `db/migrations` | Simples, auditável, funciona em Oracle |
| Proxy/TLS | Caddy | HTTPS automático em prod e certificado interno em dev (microfone exige HTTPS) |
| Áudio | Web Audio API + AudioWorklet | Afinador, metrônomo, tons de referência |
| Mobile | PWA → **Capacitor** (WebView Android) | Mesmo código, melhor acesso a permissões/áudio que WebView "crua" |
| Infra | Docker + Compose (dev VM → prod VM). Kubernetes só quando houver necessidade real | Simplicidade primeiro |
| Monorepo | pnpm workspaces | Compartilhar `shared` e `content` |

Qualquer mudança nesta tabela exige um ADR curto em `docs/adr/` e consulta ao `gemini-architect`.

## 3. Estrutura do repositório

```
cifrai/
├── CLAUDE.md  AGENTS.md  task_state.md  validation_log.md
├── .claude/agents/            # subagentes
├── apps/
│   ├── web/                   # React + Vite PWA
│   └── api/                   # Fastify
├── packages/
│   ├── shared/                # schemas Zod, tipos, constantes (cordas, notas, cifras)
│   └── content/               # lições/exercícios em JSON validado por Zod (conteúdo como código)
├── db/
│   ├── migrations/            # V001__create_users.sql ...
│   └── seeds/
├── infra/
│   ├── docker/                # Dockerfiles
│   ├── caddy/Caddyfile
│   └── scripts/               # deploy.sh, rollback.sh, backup.sh
├── compose.yaml               # base
├── compose.dev.yaml           # overrides de dev (hot reload)
├── compose.prod.yaml          # overrides de prod
├── .env.example
└── docs/adr/                  # decisões de arquitetura
```

## 4. Comandos (alvo da Fase 0; ajuste ao criar)

```
pnpm install
pnpm dev                       # sobe web + api localmente
pnpm lint && pnpm typecheck
pnpm test                      # unit (Vitest)
pnpm test:e2e                  # Playwright (viewport mobile)
pnpm content:validate          # valida todo packages/content contra o schema
docker compose -f compose.yaml -f compose.dev.yaml up --build
docker compose -f compose.yaml -f compose.dev.yaml run --rm migrate
```

## 5. Convenções de código

- TypeScript `strict`, sem `any` (use `unknown` + Zod). ESLint + Prettier obrigatórios.
- Validação **na borda** (request/response) com Zod; tipos derivados dos schemas em `packages/shared`.
- Funções pequenas, nomes descritivos, sem comentários que repetem o código; comente o "porquê".
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Erros da API em formato único: `{ "error": { "code": "...", "message": "..." } }`.
- IDs de conteúdo são **estáveis e legíveis** (`u02.l03.e01`); nunca reutilize ou renumere.
- Strings de UI em catálogo (não hardcoded em componentes), mesmo com só pt-BR.

## 6. Oracle 19c: regras

- Conectar por **service name do PDB** (`host:1521/SERVICE`), nunca SID, nunca `SYS`/`SYSTEM`.
- Dois usuários: `CIFRAI_MIG` (DDL, usado só pelo Flyway) e `CIFRAI_APP` (DML mínimo, usado pela API).
- **Sempre bind variables**. Proibido concatenar SQL com dado de usuário.
- Booleano = `NUMBER(1)` com `CHECK (col IN (0,1))`. Chave primária = `GENERATED ALWAYS AS IDENTITY` (ou UUID em `RAW(16)` quando exposta).
- Strings: `VARCHAR2(n CHAR)`. **Atenção:** string vazia vira `NULL` no Oracle; trate isso no código.
- Datas: `TIMESTAMP WITH TIME ZONE`, gravar em UTC.
- JSON em coluna: `CLOB/VARCHAR2` com `CHECK (col IS JSON)`.
- Paginação com `OFFSET :o ROWS FETCH NEXT :n ROWS ONLY`. Nada de `SELECT *`.
- Pool de conexões único por processo; healthcheck com `SELECT 1 FROM DUAL`.
- Migrações são **imutáveis** depois de aplicadas; mudanças novas = novo arquivo. Sempre compatíveis com a versão anterior da API (expandir → migrar → contrair).
- Container acessa o Oracle do host via `extra_hosts: ["host.docker.internal:host-gateway"]` (ou IP da VM). Oracle **não** entra no compose.

## 7. Docker, Compose e promoção dev → prod

- Imagens multi-stage, usuário **não-root**, sem `latest`, versões fixas, `.dockerignore` rigoroso.
- Todo serviço com `healthcheck`, limites de recurso e `restart: unless-stopped` em prod.
- **Build uma vez, promove a mesma imagem**: CI gera imagem com tag = git SHA; dev e prod diferem só por variáveis de ambiente.
- Config 12-factor: tudo por env; segredos fora do git (`.env` ignorado, `.env.example` versionado).
- Deploy = `infra/scripts/deploy.sh <ENV> <TAG>`; rollback = redeploy da tag anterior. Backup do schema antes de migração em prod.
- Kubernetes só se surgir necessidade (vários hosts, autoscaling, zero-downtime estrito). Manter API stateless para facilitar a migração.

## 8. Definition of Done

Uma tarefa só está concluída quando **todos** forem verdadeiros e registrados no `validation_log.md`:

- [ ] `pnpm lint` e `pnpm typecheck` sem erros
- [ ] Testes novos/alterados passam (`pnpm test`); E2E quando houver fluxo de UI
- [ ] `pnpm content:validate` passa (se mexeu em conteúdo)
- [ ] Build Docker funciona e containers ficam `healthy`
- [ ] Migrações aplicam do zero **e** sobre o estado anterior
- [ ] UI testada em viewport 360×640 (mobile) e com teclado/leitor de tela básico
- [ ] Sem segredo no diff; revisão do `security-reviewer` em mudanças de auth/dados/infra
- [ ] `task_state.md` atualizado

## 9. Agentes e quando acioná-los

| Agente | Acione para |
|---|---|
| `gemini-architect` | Decisões de arquitetura, ADRs, segunda opinião, revisão de trade-offs (usa MCP do Gemini) |
| `frontend-ui` | Telas, componentes, diagramas de acordes, fluxo de lição, PWA, acessibilidade |
| `backend-api` | Rotas Fastify, regras de negócio, auth, XP/streak, sync de progresso |
| `oracle-db` | Modelagem, migrações, queries, tuning, seeds |
| `devops-infra` | Dockerfiles, compose, Caddy, CI, deploy dev→prod, kube futuro |
| `pedagogy-content` | Currículo, lições, exercícios, progressão, conteúdo de violão |
| `audio-dsp` | Afinador, metrônomo, detecção de pitch, tons de referência |
| `qa-validator` | Plano e execução de validação, testes, evidências no log |
| `security-reviewer` | Revisão de auth, OWASP, segredos, LGPD, supply chain |

Regra de orquestração: o agente principal **planeja e integra**; subagentes executam dentro do seu escopo e devolvem relatório objetivo (o que mudou, como validar, riscos).

## 10. Conteúdo e direitos autorais

- **Nunca** incluir letra de música protegida por direitos autorais. Use músicas de **domínio público/folclore** (verificar cada uma e registrar a fonte), exercícios originais, ou apenas **progressões de acordes** com "estilo de".
- Cifras de músicas populares: só a progressão e o padrão rítmico, sem letra.
- Conteúdo pedagógico de técnica deve incluir aviso de segurança: pausas, sem dor, parar se houver desconforto nos pulsos/dedos.

## 11. Proibido

- Commitar segredos, `.env`, dumps de banco ou wallets Oracle.
- Usar `SYS/SYSTEM` na aplicação; SQL por concatenação; `SELECT *`.
- Editar migração já aplicada.
- Marcar tarefa como concluída sem evidência.
- Adicionar dependência sem justificar no PR/log (tamanho, licença, manutenção).
- Instalar o app como "site embrulhado" sem funcionalidade offline/áudio: o valor está no PWA completo.
