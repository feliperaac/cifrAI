# validation_log.md — CifrAI

> Registro **cronológico e imutável** de validações. Cada entrada prova o que foi verificado, com comando e saída reais. Nunca edite entradas antigas; se algo mudou, crie uma nova entrada referenciando a anterior.

## Como registrar

```
## VL-XXXX — <título curto>
- **Data:** AAAA-MM-DD
- **Tarefa:** F?-?? (de task_state.md)
- **Agente:** <quem executou>
- **Commit/Tag:** <git sha ou "sem commit">
- **Ambiente:** dev-vm | local | prod-vm
- **Escopo validado:** <o que foi testado>
- **Comandos executados:**
  1. `comando`  → resultado resumido (cole as linhas relevantes da saída)
- **Resultado:** ✅ passou | ❌ falhou | ⚠️ passou com ressalvas
- **Evidências:** <logs, prints, caminhos de relatório>
- **Problemas encontrados:** <ou "nenhum">
- **Ações/pendências:** <ou "nenhuma">
```

## Gates padrão (use como checklist em cada entrada)

| Gate | Comando / critério |
|---|---|
| G1 Lint | `pnpm lint` sem erros |
| G2 Tipos | `pnpm typecheck` sem erros |
| G3 Unit | `pnpm test` verde |
| G4 Conteúdo | `pnpm content:validate` verde |
| G5 Migração limpa | Flyway aplica `V001..Vn` em schema vazio |
| G6 Migração incremental | Flyway aplica nova versão sobre estado anterior |
| G7 Build Docker | `docker compose build` sem erro |
| G8 Saúde | `docker compose ps` com todos `healthy`; `GET /ready` = 200 (inclui Oracle) |
| G9 E2E mobile | `pnpm test:e2e` (viewport 360×640) verde |
| G10 Segurança | Sem segredos no diff; revisão do `security-reviewer` quando aplicável |
| G11 A11y básica | Contraste AA, navegação por teclado, alvos ≥ 48px |
| G12 Áudio (quando aplicável) | Testado em navegador real com microfone, via HTTPS |

## Regras
- Falha também é registrada (com causa e correção), não apague.
- "Não executado" é um resultado válido; escreva o motivo.
- Evidência vazia = validação inválida.

---

## VL-0001 — Planejamento inicial e scaffolding de documentos
- **Data:** 2026-11-15
- **Tarefa:** pré-F0
- **Agente:** planejamento (Claude)
- **Commit/Tag:** sem commit
- **Ambiente:** local
- **Escopo validado:** criação dos documentos de governança (CLAUDE.md, AGENTS.md, task_state.md, validation_log.md, agentes)
- **Comandos executados:** nenhum (somente documentação)
- **Resultado:** ⚠️ não validado em execução; nenhum código existe ainda
- **Evidências:** n/a
- **Problemas encontrados:** nenhum
- **Ações/pendências:** executar F0-01 e F0-02; confirmar nome do pacote do MCP do Gemini (D5); confirmar versão de Node/pnpm e registrar aqui

---

## VL-0002 — F0-01 Monorepo pnpm
- **Data:** 2026-11-15
- **Tarefa:** F0-01
- **Agente:** devops-infra (reverificado pelo agente principal)
- **Commit/Tag:** sem commit (não há repositório git)
- **Ambiente:** local, Node v20.20.2, pnpm 12.21.0 (via corepack em `~/.local/bin`)
- **Escopo validado:** workspaces `apps/web`, `apps/api`, `packages/shared`, `packages/content`; ESLint flat + Prettier; tsconfig base strict; `.nvmrc`
- **Comandos executados:** `pnpm install --frozen-lockfile`; `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm format:check` e checagem negativa de `no-explicit-any` (agente)
- **Resultado:** ✅ install ok; lint "No issues found"; typecheck 4/4 Done; test 4/4 arquivos passando; `no-explicit-any` falha como esperado
- **Evidências:** saídas acima reexecutadas pelo agente principal
- **Problemas encontrados:** Node local é 20.20.2, mas `.nvmrc`/`engines` pedem 24 (só aviso, sem `engine-strict`). Nada foi rodado em Node 24.
- **Ações/pendências:** CI e Dockerfiles (F0-03, F0-09) devem usar Node 24 e ativar pnpm 12.21.0 via corepack; instalar Node 24 localmente; `content:validate` é placeholder até F1-01; `.dockerignore` exclui `*.md`

---

## VL-0003 — F0-02 ADR-0001 (stack e estrutura)
- **Data:** 2026-11-15
- **Tarefa:** F0-02
- **Agente:** gemini-architect (arquivo conferido pelo agente principal)
- **Commit/Tag:** sem commit
- **Ambiente:** local
- **Escopo validado:** `docs/adr/0001-stack-e-estrutura.md` (91 linhas; Contexto, Decisão, Alternativas, Consequências, Critérios de aceite, Segunda opinião); status **proposto**
- **Comandos executados:** consulta ao Gemini via MCP (`gemini-3.8-flash`; `gemini-2.5-pro` deu 404); `wc -l` e `grep` no ADR (sem dados pessoais/caminhos)
- **Resultado:** ✅ ADR criado com segunda opinião registrada. Documentação apenas, sem código.
- **Evidências:** o agente confirmou na documentação oficial que o thin mode não suporta NNE; "19c deprecated na Community" (Gemini) NÃO foi confirmado e o Flyway foi mantido
- **Problemas encontrados:** a recusa da correção de microfone do Gemini no Capacitor não foi conferida em fonte
- **Ações/pendências:** o usuário decide aceitar o ADR; ADR-0002 (sync por eventos) antes de F1-07; verificar NNE em F0-04; fechar D4 em F0-05; confirmar microfone em F4-02; decidir versão do Node (24 vs mais nova)

---

## VL-0004 — F0-03 Dockerfiles, compose e Caddy
- **Data:** 2026-11-15
- **Tarefa:** F0-03
- **Agente:** devops-infra (reverificado pelo agente principal)
- **Commit/Tag:** sem commit
- **Ambiente:** local, Docker 29.4.3, Compose v5.1.3; portas 8088/8443 (80/443 ocupadas no host); variáveis ORACLE_* com valores dummy exportados só no shell
- **Escopo validado:** `infra/docker/{api,web}.Dockerfile`, `compose.yaml`, `compose.dev.yaml`, `infra/caddy/Caddyfile` (+ `Caddyfile.web`), placeholders em `infra/placeholder/`
- **Comandos executados:** `docker compose -f compose.yaml -f compose.dev.yaml config -q`; `up -d --build`; espera por healthy; `curl -sk https://localhost:8443/api/ready` e `/`; `exec api id`; `down -v`
- **Resultado:** ✅ config ok; 3 containers (api, web, proxy) `healthy`; `/api/ready` devolveu `{"status":"ready","placeholder":true,"oracle":"not-checked"}`; `/` HTTP 200 via HTTPS; api roda como uid=1000(node); `down -v` limpou tudo. O agente também validou o build prod (`compose.yaml` sozinho), headers de segurança e 308 de HTTP para HTTPS.
- **Evidências:** saídas acima, reexecutadas pelo agente principal
- **Problemas encontrados:** o corepack do Node 24.11.1 quebra com pnpm 12 (contornado com `corepack@0.36.0` nos Dockerfiles). Hot reload (`node --watch`) não testado. O `/ready` é placeholder e não checa o Oracle. O `.env` não existe e é obrigatório para subir (`ORACLE_SERVICE` e `ORACLE_PASSWORD`).
- **Ações/pendências:** remover `infra/placeholder` e trocar os stages `build`/`CMD` em F0-06/F0-07; criar `compose.prod.yaml` (`read_only`, `cap_drop`, restringir admin do Caddy em `:2019`, domínio real) em F0-09 ou F5; redirect HTTP→HTTPS perde a porta quando ≠ 80/443; revisão do `security-reviewer` ainda não feita (infra)

---

## VL-0005 — Correção do gate de lint (regressão após F0-03/F0-04)
- **Data:** 2026-11-15
- **Tarefa:** correção transversal (F0-01/F0-03)
- **Agente:** agente principal
- **Problema:** `pnpm lint` falhava com 5x `no-undef` em `infra/placeholder/*.mjs` (globals do Node não declarados para `.mjs`); VL-0004 não havia rodado o lint. `format:check` também acusava `compose*.yaml`, `api-server.mjs` e `oracle-check.mjs`.
- **Correção:** globals do Node declarados em `eslint.config.js` para `*.mjs`/`*.js` (sem nova dependência); removido o comentário `/* global */` redundante de `oracle-check.mjs` (causava `no-redeclare`); `prettier --write` nos arquivos citados (só formatação)
- **Comandos executados:** `pnpm lint`; `pnpm format:check`; `pnpm typecheck`; `pnpm test`; `node --check apps/api/scripts/oracle-check.mjs`; `docker compose ... config -q`
- **Resultado:** ver execução na sessão: lint "No issues found", typecheck 4/4, test 4/4, format ok, compose config ok

---

## VL-0006 — F0-04 Usuários Oracle e conexão thin a partir do container
- **Data:** 2026-11-15
- **Tarefa:** F0-04
- **Agente:** oracle-db (scripts) + usuário (criação dos usuários como DBA) + agente principal (teste de conexão)
- **Commit/Tag:** sem commit
- **Ambiente:** Oracle 19c em 192.168.20.242:1521, service `ORCL` (banco non-CDB: `CON_NAME=ORCL`); API em container dev (Node 24.11.1)
- **Escopo validado:** `db/admin/create_users.sql` (executado pelo usuário), `apps/api/scripts/oracle-check.mjs`
- **Comandos executados:** `create_users.sql` pelo usuário (`password_versions` = 11G e 12C); `docker compose -f compose.yaml -f compose.dev.yaml build api`; `docker compose ... run --rm --no-deps -e ORACLE_HOST=192.168.20.242 -e ORACLE_CHECK_DDL=1 api node apps/api/scripts/oracle-check.mjs`
- **Resultado:** ✅ `thin=true oracledb=6.10.0`; `SELECT 1 FROM DUAL -> [{"OK":1}]`; sessão como `CIFRAI_APP` no service `ORCL`; banner de rede "TCP/IP NT Protocol Adapter" (sem NNE); DDL negado com `ORA-01031` como esperado
- **Problemas encontrados:** (1) a imagem dev precisou de rebuild após a dependência `oracledb`; (2) `host.docker.internal` resolve para o host Docker (172.17.0.1), onde NÃO há Oracle, então o teste falhou com `NJS-503` até passar `ORACLE_HOST=192.168.20.242`; (3) a dica de NNE do script aparece em qualquer falha de conexão e é enganosa nesse caso
- **Ações/pendências:** ajustar `ORACLE_HOST=192.168.20.242` no `.env` (e no `.env.example`/docs, pois o Oracle não roda na máquina do Docker); ADR-0001 pediu checar NNE: confirmado sem NNE neste ambiente; concessões de DML por tabela e `CURRENT_SCHEMA` ficam para F0-05/F0-06; `CIFRAI_MIG` ainda não foi testado por conexão

---

## VL-0007 — F0-04 (complemento): conexão do CIFRAI_MIG
- **Data:** 2026-11-15
- **Tarefa:** F0-04 (pendência de VL-0006)
- **Agente:** agente principal
- **Ambiente:** Oracle 19c em 192.168.20.242:1521, service `ORCL`; container dev da API
- **Comandos executados:** `oracle-check.mjs` com `ORACLE_CHECK_DDL=1` e credenciais do `CIFRAI_MIG` (via `--env-file` temporário em scratchpad, removido ao fim; valores não impressos); depois `DROP TABLE CIFRAI_DDL_PROBE PURGE` e conferência em `USER_TABLES`
- **Resultado:** ✅ `thin=true`; `SELECT 1` ok; `SESSION_USER=CIFRAI_MIG`; sem NNE. O CREATE TABLE de sonda funcionou, como esperado para o usuário de DDL (o script rotula como "FALHA", mensagem pensada para o `CIFRAI_APP`).
- **Problemas encontrados:** a sonda `CIFRAI_DDL_PROBE` ficou no schema `CIFRAI_MIG`; removida (0 restantes). `oracle-check.mjs` agora apaga a sonda se o CREATE funcionar. O `.env` tinha espaços antes do `=` (corrigido pelo usuário).
- **Ações/pendências:** `oracle-check.mjs` só lê `ORACLE_USER`/`ORACLE_PASSWORD`; para testar o MIG sem arquivo temporário, aceitar um flag ou variáveis `ORACLE_MIG_*` (decidir em F0-05)

---

## VL-0008 — F0-05 Flyway e migrações base (PARCIAL)
- **Data:** 2026-11-15
- **Tarefa:** F0-05
- **Agente:** oracle-db (reverificado pelo agente principal)
- **Ambiente:** Oracle 19c em 192.168.20.242:1521, service `ORCL`; Flyway Community `flyway/flyway:13.12.2-alpine`
- **Escopo validado:** serviço `migrate` (profile `migrate`) no `compose.yaml`; `db/migrations/V001..V004`; `db/tests/app-privileges.mjs`; `db/README.md`
- **Comandos executados (reexecutados pelo agente principal):** `docker compose --profile migrate run --rm migrate info` e `validate`; teste de privilégios do `CIFRAI_APP` em container. O agente rodou antes `migrate` em schema vazio ("applied 4 migrations ... v004") e de novo ("up to date").
- **Resultado:** ✅ Flyway detecta "Oracle 19.0", 4 migrações em `Success`, `validate` ok; `CIFRAI_APP` faz SELECT/INSERT/UPDATE/DELETE em `USERS` e `APP_SETTINGS`; UNIQUE, CHECK de e-mail minúsculo e `CHECK IS JSON` disparam; CREATE/ALTER/DROP/TRUNCATE dão ORA-01031; `flyway_schema_history` invisível ao APP (ORA-00942)
- **D4:** Flyway Community 13.12.2 atende o Oracle 19c, sem plugin extra
- **Problemas encontrados:** o teste de privilégios, no comando documentado, falhou por caminho depois que o diretório de trabalho do container mudou (efeito da F0-06 em andamento); passou com caminho ajustado
- **LACUNA (DoD):** não foi provado "migração nova aplicada sobre o estado anterior". O `flyway clean` que permitiria o teste foi bloqueado pelo classificador de permissões e não foi autorizado. Fecha com a primeira migração real nova (ex.: F1-07) ou com `clean` autorizado pelo usuário.
- **Ações/pendências:** decisão do usuário sobre `clean`; fechar D4 no ADR; cada tabela nova precisa de migração própria de GRANT; ajustar `db/README.md` ao novo WORKDIR do container da API quando a F0-06 fechar; backup de schema (prod) ainda sem script

---

## VL-0009 — F0-06 Fastify base (/health, /ready, logs, erros)
- **Data:** 2026-11-15
- **Tarefa:** F0-06
- **Agente:** backend-api (reverificado pelo agente principal)
- **Ambiente:** Node local 20.20.2 (imagem usa 24.11.1); Oracle real em 192.168.20.242:1521, service `ORCL`; portas 8088/8443
- **Escopo validado:** `apps/api/src` (config Zod, pool único thin, `/health`, `/ready`, erro padrão, logs pino com redação, shutdown gracioso), `tsup.config.ts`, `infra/docker/api.Dockerfile`, remoção de `infra/placeholder/api-server.mjs`
- **Comandos executados (agente principal):** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`; `docker compose -f compose.yaml -f compose.dev.yaml up -d --build api proxy web`; `curl -sk https://localhost:8443/api/{health,ready,nada}`; busca por "password" nos logs da api; `down`
- **Resultado:** ✅ format ok; lint sem erros; typecheck 4/4; testes 14 na api + 1 por pacote (todos passam); api, proxy e web `healthy`; `/api/health` → `{"status":"ok"}`; `/api/ready` → `{"status":"ready"}` com o Oracle real; `/api/nada` → 404 `{"error":{"code":"NOT_FOUND",...}}`; 0 ocorrências de "password" nos logs. O agente também validou `/ready` 503 genérico com `ORACLE_SERVICE` inválido, saída com código 1 sem as variáveis obrigatórias e shutdown com exit 0.
- **Problemas encontrados:** `db/tests/app-privileges.mjs` falhava no Prettier (corrigido); o agente rodou `pnpm format` no repo todo (sem git para conferir o que mudou); healthcheck gera 2 linhas de log por chamada
- **Dependências adicionadas (versões exatas, MIT):** fastify 5.12.8, zod 4.6.7, tsx 4.23.15, tsup 9.0.0, @types/oracledb 6.10.1; `pnpm-workspace.yaml` com `esbuild: false` em `allowBuilds`
- **Ações/pendências:** `db/README.md` ainda cita o WORKDIR antigo do container da API; `API` ainda não usa `ORACLE_SCHEMA`/`CURRENT_SCHEMA = CIFRAI_MIG` (decisão da F0-05): precisa entrar no pool antes de qualquer query em tabelas; `compose.prod.yaml` ainda não existe; filtrar `/health` nos logs; `security-reviewer` ainda não revisou a infra

---

## VL-0010 — F0-05 (complemento): migrações sobre o estado anterior
- **Data:** 2026-11-15
- **Tarefa:** F0-05 (fecha a lacuna de VL-0008)
- **Agente:** agente principal, com `flyway clean` autorizado explicitamente pelo usuário
- **Ambiente:** Oracle 19c em 192.168.20.242:1521, service `ORCL`; schema `CIFRAI_MIG`; Flyway 13.12.2
- **Antes do clean:** o schema só continha objetos criados pelas migrações (`USERS`, `APP_SETTINGS`, `flyway_schema_history` e seus índices/LOB), conferido em `USER_OBJECTS`
- **Comandos executados:** `migrate -cleanDisabled=false clean`; `migrate -target=2 migrate` + `info`; `migrate` (V003-V004 sobre V001-V002) ; `migrate` de novo; `validate`; `info`; teste de privilégios do `CIFRAI_APP`
- **Resultado:** ✅ `clean` ok; do zero até v002 (2 migrações); depois v003 e v004 aplicadas sobre o estado anterior ("now at version v004"); reexecução "up to date. No migration necessary."; `validate` "Successfully validated 4 migrations"; as 4 em `Success`; teste de privilégios do `CIFRAI_APP` reexecutado após a recriação
- **Problemas encontrados:** nenhum
- **Ações/pendências:** fechar D4 no ADR ("Flyway Community 13.12.2 aceito"); `clean` só é aceitável em dev (`cleanDisabled` segue true por padrão no Flyway e não está habilitado em nenhum arquivo do projeto); `db/README.md` ainda cita o WORKDIR antigo do container da API; backup de schema em prod ainda sem script

---

## VL-0011 — F0-07 Esqueleto PWA (PARCIAL: sem checagem visual)
- **Data:** 2026-11-15
- **Tarefa:** F0-07
- **Agente:** frontend-ui (reverificado pelo agente principal)
- **Ambiente:** Node local 20.20.2 (imagem usa 24.11.1); portas 8088/8443
- **Escopo validado:** `apps/web` (React 19, Vite 8, Router 7, Tailwind 4, Zustand, vite-plugin-pwa), `infra/docker/web.Dockerfile`, `compose.dev.yaml`, remoção de `infra/placeholder/`
- **Comandos executados (agente principal):** `pnpm format:check`, `lint`, `typecheck`, `test`; `pnpm --filter @cifrai/web build`; `docker compose -f compose.yaml -f compose.dev.yaml up -d --build`; `curl -sk https://localhost:8443/`, `/perfil`, `/api/ready`; `down`
- **Resultado:** ✅ format ok; lint sem erros; typecheck 4/4; testes: web 13, api 14, content 1, shared 1; build gera `manifest.webmanifest` e `sw.js`, precache de 16 entradas (296,85 KiB), JS inicial 266 KB (85 KB gzip); api, web e proxy `healthy`; `/` e `/perfil` 200; `/api/ready` → `{"status":"ready"}`. O agente também confirmou o handshake do HMR (101) atrás do Caddy e `Cache-Control: no-cache` em `/`, `sw.js` e manifest.
- **NÃO VERIFICADO (DoD exige "UI em 360x640 e teclado/leitor de tela básico"):** checagem visual em 360x640 e do tema escuro; comportamento offline real; instalabilidade/Lighthouse (F4-01); navegação por teclado e leitor de tela; atualização real do SW; contraste AA não medido
- **Problemas encontrados:** `compose.dev.yaml` ganhou `mem_limit: 512m` no web (128m matava o Vite por OOM) e `pnpm_config_verify_deps_before_run: 'false'` na api (o pnpm tentava instalar deps do web como usuário `node`); `Caddyfile.web` devolve o HTML do index em `/health` (só o status importa); `TanStack Query` não foi instalado (nada o usa ainda); `happy-dom` no lugar de `jsdom` (que exige Node >= 22.22)
- **Ações/pendências:** checagem visual manual em 360x640 (claro e escuro) e offline; passar `Capacitor.isNativePlatform` em `main.tsx` quando o Capacitor entrar (F4-02); `api.Dockerfile` dev poderia rodar `tsx` direto em vez de depender da variável do pnpm

---

## VL-0012 — F0-07 (complemento): checagem visual manual
- **Data:** 2026-11-15
- **Tarefa:** F0-07 (fecha parte da lacuna de VL-0011)
- **Agente:** usuário (checagem manual); registro pelo agente principal
- **Ambiente:** stack dev em `http://192.168.20.234:5173` (HTTP, fora de `localhost`), navegador do usuário
- **Roteiro:** 360×640 no modo dispositivo; navegação Trilha/Afinador/Perfil e 404; temas claro/escuro/sistema com persistência após recarregar; alvos de toque e foco por teclado; strings pt-BR; console
- **Resultado:** ✅ usuário reportou "tudo ok" em todos os itens do roteiro. Sem defeitos relatados. Não foram anotados valores nem capturas de tela.
- **Ainda NÃO verificado:** offline real e service worker instalado (exigem `localhost`/HTTPS); instalabilidade e Lighthouse (F4-01); leitor de tela; contraste AA medido por ferramenta; atualização real do SW
- **Ações/pendências:** testar offline/SW em `localhost` ou HTTPS antes da F4-01

---

## VL-0013 — F0-10 ADR-0002 (sync por log de eventos)
- **Data:** 2026-11-15
- **Tarefa:** F0-10
- **Agente:** gemini-architect (arquivo conferido pelo agente principal)
- **Commit/Tag:** sem commit
- **Escopo validado:** `docs/adr/0002-sync-por-log-de-eventos.md` (248 linhas; Contexto, Decisão, Alternativas, Consequências, Critérios de aceite, Decisão pendente D1, Segunda opinião); status **proposto**
- **Comandos executados:** consulta ao Gemini via MCP (`gemini-3.8-flash`, briefing sanitizado); `wc -l` e `grep` no ADR (sem dados pessoais, caminhos ou IPs)
- **Resultado:** ✅ ADR criado. Documentação apenas: nenhuma migração, nenhum código. Conteúdo não revisado linha a linha pelo agente principal.
- **Evidências:** o agente recusou do Gemini: particionamento (option paga do Enterprise), `MAX_STRING_SIZE=EXTENDED` (irreversível), horizonte de streak de 48 h (trocado por 7 dias); aceitou: recálculo do SM-2 fora de ordem, correção de relógio por lote, `FOR UPDATE` no usuário, classificação por `SELECT` antes do `batchErrors`, pergunta "levar ou descartar" no claim, fuso por evento, lições "aposentadas"
- **Problemas encontrados:** nenhum
- **Ações/pendências:** o usuário aceita o ADR e decide D1 e os parâmetros propostos (`STREAK_BACKFILL_DAYS`=7, `GUEST_CLAIM_MAX_AGE_DAYS`=30, XP de repetição 20%, teto 500 XP/dia, lote 100 eventos/256 KB, rate limit 30/min por usuário e 60/min por IP); provar `executeMany` com `batchErrors` em thin mode no 19c real e `ON DELETE CASCADE` na F1-07; F1-01 deve expor XP por lição, número de exercícios e estado "aposentado"; medir latência p95 < 500 ms

---

## VL-0014 — F0-08 Pipeline local de validação (`pnpm validate`)
- **Data:** 2026-11-15 (fuso de referência: America/Rio_Branco)
- **Tarefa:** F0-08
- **Agente:** qa-validator (reverificado pelo agente principal)
- **Ambiente:** Node local 20.20.2 (projeto exige 24; o script avisa sem falhar); Docker Compose v5.1.3; Oracle real em 192.168.20.242:1521, service `ORCL`; portas 8088/8443
- **Escopo validado:** `infra/scripts/validate.sh`, script raiz `validate`, `docs/validacao.md`, correção do comando de teste em `db/README.md` (WORKDIR `/repo/apps/api`)
- **Comandos executados:** pelo agente: `pnpm validate`; `pnpm validate --stack --db`; `pnpm validate` com erro de lint temporário (arquivo removido); `validate.sh --stack` interrompido com SIGTERM. Pelo agente principal: `pnpm validate` (cache quente)
- **Resultado:** ✅ agente: `pnpm validate` exit 0 com cache frio (5m35s, docker dev 214s e prod 95s); `--stack --db` exit 0 (api/web/proxy healthy; `/api/health` 200; `/api/ready` 200 com Oracle real; `/` 200; Flyway "Oracle 19.0", versão 004, "validated 4 migrations"; app-privileges 13/13 OK; stack derrubado ao final). Falha controlada: exit 1, "FALHOU na etapa 'lint'", etapas seguintes não executadas. SIGTERM durante `--stack`: exit 143, 0 containers cifrai depois. Agente principal: format 1s, lint 3s, typecheck 7s, test 4s, content 1s, web build 7s, docker dev 10s, docker prod 9s, "RESULTADO: OK"; sem arquivo temporário (`apps/api/scripts` só tem `oracle-check.mjs`) e sem containers do projeto.
- **Não verificado / limites:** `content:validate` é placeholder (F1-01); Node 24 real; stack só com overlay dev (sem `compose.prod.yaml`); E2E, UI 360×640, teclado/leitor de tela, offline e segurança fora da pipeline; migração "sobre o estado anterior" não está na pipeline (feita manualmente em VL-0010); `--stack` usa portas fixas 8088/8443
- **Problemas encontrados:** `db/README.md` citava o WORKDIR antigo do container da API (corrigido); o bind mount do teste de privilégios cria um stub vazio de dono root em `apps/api/scripts/app-privileges.mjs` (o script remove ao final)
- **Ações/pendências:** F0-09 deve reutilizar `infra/scripts/validate.sh` e prover `.env`/variáveis para os builds; seção 4 do `CLAUDE.md` pode ganhar `pnpm validate` (decisão do usuário); adicionar stack de prod quando existir `compose.prod.yaml`

---

## VL-0015 — F0-09 CI GitHub Actions
- **Data:** 2026-11-15 (fuso de referência: America/Rio_Branco)
- **Tarefa:** F0-09
- **Agente:** devops-infra (workflow) + agente principal (diagnóstico, correção e acompanhamento das execuções)
- **Commit/Tag:** `24ad41a` (workflow), `e134e59`, `3bb65d9` (correção); branch `main`, remoto `feliperaac/cifrAI` (repositório público)
- **Ambiente:** GitHub Actions, `ubuntu-24.04`, Node 24 (`.nvmrc`), pnpm 12.21.0 via corepack 0.36.0, `TZ=America/Rio_Branco`
- **Escopo validado:** `.github/workflows/ci.yml` (jobs `validate` e `images`), `.github/dependabot.yml`, seção "CI" de `docs/validacao.md`
- **Comandos/verificações:** pelo agente: `yaml.safe_load` nos dois YAML e `pnpm validate` local. Pelo agente principal: leitura integral do workflow; conferência dos 6 SHAs das actions contra as tags no GitHub (`git ls-remote`, todos OK); acompanhamento das execuções pela API pública do GitHub
- **Execução 1** (run 43775882480, commit `e134e59`): ❌ falhou no passo `pnpm validate` (13 s); `images` pulado. Log do job exige login; a causa foi achada reproduzindo localmente em checkouts limpos (Node 24 em Alpine e em Debian glibc, `.env` copiado do exemplo): `.env.example` não tinha `ORACLE_MIG_USER`/`ORACLE_MIG_PASSWORD` e o compose valida o arquivo inteiro (`:?` no serviço `migrate`) até para `build`. Localmente passava porque o `.env` real tem essas variáveis.
- **Correção:** `.env.example` ganhou `ORACLE_MIG_USER=CIFRAI_MIG` e `ORACLE_MIG_PASSWORD=CHANGE_ME` (commit `3bb65d9`). Verificado em ambiente limpo com `TZ=America/Rio_Branco CI=true pnpm validate`: 8/8 etapas OK, incluindo docker dev (13s) e prod (9s).
- **Execução 2** (run 43776444066, commit `3bb65d9`): ✅ `validate` success, `images (api)` success, `images (web)` success.
- **Resultado:** ✅ CI verde no GitHub
- **NÃO VERIFICADO:** que as imagens existem de fato no GHCR (pacotes nascem privados; a API anônima não os lista; o job de publicação terminou com sucesso em push na `main`); `content:validate` segue placeholder, então o CI não prova nada nessa etapa; etapas `--stack` e `--db` não rodam no CI (sem Oracle no runner); primeiro PR do Dependabot ainda não revisado (pnpm 12 pode se comportar de forma diferente); revisão do `security-reviewer` sobre o workflow não feita
- **Problemas encontrados:** `pnpm validate` local passou antes do primeiro push porque usava o `.env` real. Para o CI, o certo é testar com o `.env.example`.
- **Ações/pendências:** o usuário vincula os pacotes `cifrai-api` e `cifrai-web` ao repositório e define a visibilidade; `docker login ghcr.io` com token `read:packages` na VM de produção; cogitar proteção de branch exigindo `validate` e `images`; o build prod roda duas vezes (no `validate` e no `images`); repositório é público (conferir se é o desejado)

---

## VL-0016 — F0-09 (complemento): imagens no GHCR e visibilidade do repositório
- **Data:** 2026-11-15 (fuso de referência: America/Rio_Branco)
- **Tarefa:** F0-09 (fecha itens "não verificados" de VL-0015)
- **Agente:** usuário (conferência manual no GitHub); registro pelo agente principal
- **Resultado:** ✅ o usuário confirmou que os pacotes `cifrai-api` e `cifrai-web` aparecem em "Packages" da conta, ou seja, a publicação das imagens no GHCR pelo job `images` funcionou. O usuário também confirmou que o repositório público é intencional.
- **Não verificado:** a tag publicada de cada imagem (esperado: SHA completo `3bb65d9b37fbdd44692e8c7b3cc5f422c84ec1ba`) e a visibilidade de cada pacote; o usuário relatou só que os pacotes aparecem
- **Ações/pendências:** vincular os pacotes ao repositório e definir a visibilidade; proteção da `main`; `docker login ghcr.io` com token `read:packages` na VM de produção (F5-01)

- **Atualização (tags conferidas pelo usuário em `cifrai-api`):** existem 2 tags, `3bb65d9b37fbdd44692e8c7b3cc5f422c84ec1ba` (commit da correção do CI) e `648ab699ee839d4ce22f9ecda4359d115b6e1752` (commit de documentação). Ambas são SHAs completos de commits da `main` e não existe `latest`: o comportamento esperado. A tag de `cifrai-web` não foi relatada, mas os dois jobs de imagem têm a mesma configuração.
- **Observação:** todo push na `main` publica uma imagem nova, inclusive commits só de documentação. Considerar `paths-ignore` (`**/*.md`, `docs/**`) no workflow e uma política de retenção de versões antigas no GHCR.

---

## VL-0017 — F1-01 Schema Zod de conteúdo e validador (`content:validate`)
- **Data:** 2026-11-15 (fuso de referência: America/Rio_Branco)
- **Tarefa:** F1-01
- **Agente:** pedagogy-content (reverificado pelo agente principal)
- **Ambiente:** Node local 20.20.2; reverificação em Node 24.11.1 (Debian glibc, checkout limpo com `.env.example`, `pnpm install --frozen-lockfile`)
- **Escopo validado:** `packages/content` (`schema.ts`, `validate.ts`, `cli.ts`, `index.ts`, 30 testes novos + fixture, `README.md`, `units/.gitkeep`), script raiz `content:validate`, dependências `zod` 4.6.7 e `tsx` 4.23.15 (versões já usadas em `apps/api`)
- **Comandos executados:** pelo agente: `pnpm lint`, `typecheck`, `test`, `format:check`, `pnpm content:validate` com zero unidades, prova de falha com `units/u90.json` temporário e `pnpm validate` completo (exit 0). Pelo agente principal, em checkout limpo Node 24: `format:check`, `lint`, `typecheck`, `test`, `content:validate`, e prova de falha própria
- **Resultado:** ✅ format, lint e typecheck sem erros nos 4 pacotes; testes: content 31 (2 arquivos), web 13, api 14, shared 1; `content:validate` com zero unidades: exit 0 com aviso "Nenhuma unidade encontrada em units/. Passa por enquanto: o conteúdo real é da fase F2"; unidade inválida (`correctOptionId` fora das opções): exit 1 apontando arquivo e campo; após remover o arquivo, exit 0. Nenhum arquivo temporário sobrou no projeto.
- **Cobertura do schema:** hierarquia curso > unidade > lição > exercício com IDs estáveis (`u02.l03.e01`); 5 tipos de exercício (`multiple_choice`, `match_pairs`, `order`, `build_chord`, `practice_timer`); XP 1 a 100 por lição, `exerciseCount`, `status active|retired`, catálogo com `id`, `unitId`, `status`, `xp`, `exerciseCount` (ADR-0002); `safetyNotice` obrigatório em `technique`; `source` obrigatório em `song`; chaves de letra rejeitadas
- **NÃO VERIFICADO / LIMITES:** nenhum conteúdo real (F2); `chordId` não é validado contra o catálogo de acordes (vem da F1-02); a checagem de letra pega só nomes de chave, não texto de letra num campo comum (revisão humana necessária); a checagem do `safetyNotice` (pausa, dor, desconforto) é heurística; regras cruzadas de uma unidade só aparecem depois que os erros do Zod são corrigidos; mínimo de 8 exercícios por lição não é validado (máximo é 20)
- **Decisões do usuário pendentes:** teto de XP por lição (assumido 100, `MAX_LESSON_XP`); lista de categorias (`concept|technique|chord|rhythm|song|review`); XP por exercício além de por lição; mínimo de exercícios por lição; tipos `listen_identify`, `tuner_task` e `rhythm_tap` ficam para a F3
- **Ações/pendências:** F1-02 valida `chordId` contra o catálogo; F1-05 pode pedir novos campos (opções embaralháveis, imagem/áudio em `multiple_choice`, `build_chord` com cordas mudas); ao mudar o schema, subir `schemaVersion` e atualizar os testes

---

## VL-0018 — F1-02 ChordDiagram (PARCIAL: sem checagem visual)
- **Data:** 2026-11-15 (fuso de referência: America/Rio_Branco)
- **Tarefa:** F1-02
- **Agente:** frontend-ui (reverificado pelo agente principal)
- **Ambiente:** Node local 20.20.2; reverificação em Node 24.11.1 (Debian glibc, checkout limpo com `.env.example`, `pnpm install --frozen-lockfile`); stack dev no ar
- **Escopo validado:** modelo `ChordShape` (Zod) e catálogo em `packages/shared`; `ChordDiagram` e `chordGeometry` em `apps/web`; galeria `/dev/acordes` (só em dev); `chordId` do `build_chord` validado contra o catálogo em `packages/content`; helper `tp()` no i18n; dependências de workspace (`@cifrai/shared`) e `zod` 4.6.7 no shared
- **Comandos executados (agente principal, checkout limpo Node 24):** `format:check`, `lint`, `typecheck`, `content:validate` (rc 0), `pnpm test`, `pnpm --filter @cifrai/web build`, busca de "dev/acordes", "Galeria de acordes" e "Mostrar dedos" em `apps/web/dist`. O agente rodou também `pnpm validate` completo (exit 0, builds docker dev e prod OK).
- **Resultado:** ✅ testes: shared 15, content 32, web 38, api 14; JS inicial 266,5 kB (85,16 kB gzip, orçamento 200 KB); **0 ocorrências da galeria no build de produção**; stack dev `healthy` e `/dev/acordes` responde 200 em :5173. Digitações do catálogo (Em, Am, E, A, D, C, G, Dm, D7, G7) conferidas por teste que calcula as notas que soam e por revisão manual do agente.
- **NÃO VERIFICADO (DoD exige UI em 360×640 e teclado/leitor de tela):** aparência real em 360×640, temas claro e escuro, destro/canhoto, contraste das bolinhas, foco por teclado, leitura por leitor de tela; sem navegador na VM do agente nem do agente principal
- **Decisões/pendências:** o usuário deve olhar `http://192.168.20.234:5173/dev/acordes` e confirmar; confirmar a preferência de dedilhado (G 2-1-3 ou 3-2-4; A 1-2-3); decidir se entra um acorde com pestana (F ou Bm) no catálogo, já que nenhum acorde do F2 tem pestana (suporte coberto só por teste unitário); `aria-label` e `<desc>` repetem o texto (revisar com TalkBack/NVDA); a galeria tem texto hardcoded de propósito (para não ir ao bundle de produção); o catálogo só é validado contra o schema nos testes, não em runtime; quem tiver web dev rodando precisa recriar a imagem e renovar o volume anônimo (`up -d --build --renew-anon-volumes web`)

---

## VL-0019 — F1-13 Som do acorde ao clicar (PARCIAL: sem audição real)
- **Data:** 2026-11-15 (fuso de referência: America/Rio_Branco)
- **Tarefa:** F1-13
- **Agente:** audio-dsp (reverificado pelo agente principal)
- **Ambiente:** Node local 20.20.2; reverificação em Node 24.11.1 (Debian glibc, checkout limpo com `.env.example`, `pnpm install --frozen-lockfile`); stack dev no ar (hot reload)
- **Escopo validado:** `apps/web/src/audio/` (síntese de corda dedilhada Karplus-Strong estendida, `AudioEngine`, engine Web Audio com cache, sessão/contexto por gesto, hook `useChordPlayer`), prop `playable` no `ChordDiagram`, galeria `/dev/acordes` com som ligado
- **Comandos executados (agente principal, checkout limpo Node 24):** `format:check`, `lint`, `typecheck`, `content:validate` (todos rc 0), `pnpm test`, `pnpm --filter @cifrai/web build`, busca de "dev/acordes", "Karplus" e "synthesizePluck" em `apps/web/dist`. O agente rodou `pnpm validate` completo (exit 0).
- **Resultado:** ✅ testes: shared 15, content 32, web 59, api 14; JS inicial 266,8 kB (85,3 kB gzip, orçamento 200 KB); 0 ocorrências de áudio/galeria no build de produção. Medições do agente (não audição): erro de afinação ≤ 1,45 cents em todos os acordes (44,1 e 48 kHz; limite 5 cents, a micro-desafinação intencional é ±1,5); energia acima de 3 kHz caiu de 37–44% (v1) para 2–7% (v2), em resposta ao feedback do usuário "muito metalizado"; sem clipping, decaimento aproximadamente monotônico, ataque audível em 20 ms.
- **Feedback do usuário:** v1 "ficou bom, mas o som está saindo muito metalizado". A v2 (excitação suavizada, laço com mais amortecimento, ressonâncias de corpo em 100/200/450 Hz, passa-baixa de 4 kHz) está no ar e ainda NÃO foi ouvida pelo usuário.
- **NÃO VERIFICADO:** o som real da v2 (ninguém além do usuário consegue ouvir); latência; WebView Android e iOS/Safari (chave silenciosa pode mudar o Web Audio); CPU em celular fraco (~45 ms por nota em PC no primeiro clique, depois cache); aparência do botão em 360×640 e leitor de tela
- **Decisões/pendências:** o usuário ouve a v2 em `http://192.168.20.234:5173/dev/acordes` e diz se serve; ajuste fino em `apps/web/src/audio/karplusStrong.ts` (parâmetros documentados); se em ~2 rodadas o timbre não convencer, migrar para amostras CC0 com licença verificada (a `AudioEngine` já permite; `session.ts` escolhe a implementação); o site Musicca foi considerado e DESCARTADO pelo usuário (termos proíbem cópia sem autorização escrita); latência medida só na F4-03 em aparelho Android

---

## VL-0020 — F1-14 Nome por extenso no ChordDiagram (PARCIAL: sem verificação visual)
- **Data:** 2026-11-15 (fuso de referência: America/Rio_Branco)
- **Tarefa:** F1-14
- **Agente:** frontend-ui (reverificado pelo agente principal)
- **Ambiente:** Node local 20.20.2; imagens Docker em Node 24; stack dev no ar (hot reload)
- **Escopo validado:** `chordDisplayName` em `packages/shared` (`root`/`quality` opcionais no `ChordShape`, preenchidos nos 10 acordes do catálogo); legenda abaixo do `ChordDiagram` (prop `showFullName`, padrão true); nome removido do topo do SVG quando a legenda aparece (feedback do usuário: nome duplicado), `viewBox` 24 unidades menor; aria sem repetição e sem vazar o nome com `showFullName=false`
- **Comando executado (agente principal, sobre o código final):** `pnpm validate` → format, lint, typecheck, test, content:validate, web build, docker dev e prod, todos OK. O agente havia rodado antes os mesmos gates, com testes shared 29, api 14, content 32, web 75; JS inicial 85,29 kB gzip.
- **Resultado:** ✅ rótulos conferidos por teste para os 10 acordes (ex.: "G (Sol)", "Am (Lá menor)", "D7 (Ré com sétima)")
- **NÃO VERIFICADO:** aparência em 360×640, temas claro/escuro, contraste da legenda, leitor de tela real, espaço no topo após remover o nome
- **Decisões/pendências:** o usuário confere `http://192.168.20.234:5173/dev/acordes`; na F1-15, se a cifra for a resposta, o componente precisa de opção para escondê-la; `namePt` e `root`/`quality` coexistem (teste garante consistência)
