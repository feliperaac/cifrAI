# CifrAI

App estilo Duolingo para aprender **violão do zero**: lições curtas, exercícios interativos, XP, sequência diária (streak), afinador, metrônomo e revisão espaçada de acordes e cifras. O produto é em **pt-BR**.

Começa como **PWA** (funciona offline e é instalável) e depois é empacotado como **APK** com Capacitor, reaproveitando o mesmo código.

> **Status:** em desenvolvimento, Fase 0 (fundação). Ainda não há versão utilizável. O andamento está em [`task_state.md`](task_state.md).

## Stack

| Área | Tecnologia |
|---|---|
| Linguagem | TypeScript (strict) em tudo |
| Front | React, Vite, PWA (`vite-plugin-pwa`), React Router, Tailwind com design tokens, Zustand |
| API | Node.js, Fastify, Zod |
| Banco | Oracle 19c via `node-oracledb` (thin mode) |
| Migrações | Flyway Community (container) |
| Proxy/TLS | Caddy (HTTPS interno em dev; o microfone exige HTTPS) |
| Áudio | Web Audio API e AudioWorklet (planejado) |
| Mobile | Capacitor, WebView Android (planejado) |
| Infra | Docker e Compose |
| Monorepo | pnpm workspaces |

As decisões e os trade-offs estão nos ADRs em [`docs/adr/`](docs/adr/).

## Estrutura

```
apps/web         PWA (React + Vite)
apps/api         API (Fastify)
packages/shared  schemas Zod, tipos e constantes compartilhados
packages/content lições e exercícios como código, validados por Zod
db/migrations    SQL versionado (Flyway)
db/admin         scripts de DBA (criação de usuários)
infra/           Dockerfiles, Caddy e scripts
docs/            ADRs e documentação
```

## Pré-requisitos

- Node.js **24** (ver `.nvmrc`) e pnpm **12.21.0** (via corepack)
- Docker e Docker Compose
- Um **Oracle 19c** acessível. Ele **não** roda no compose; a API conecta por service name.
- Os usuários `CIFRAI_MIG` (DDL, só para o Flyway) e `CIFRAI_APP` (DML mínimo, usado pela API), criados com [`db/admin/create_users.sql`](db/admin/README.md)

## Como rodar

```bash
pnpm install
cp .env.example .env     # preencha host, service name e senhas do Oracle (nunca commite o .env)

# aplica as migrações
docker compose --profile migrate run --rm migrate

# sobe web, API e proxy em modo dev
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

Em dev, o web fica em `http://localhost:5173` e a API em `/api` atrás do Caddy. Se as portas 80 e 443 estiverem ocupadas, defina `HTTP_PORT` e `HTTPS_PORT` (por exemplo 8088 e 8443).

## Comandos úteis

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

O detalhe de cada etapa de validação e como registrar evidências está em [`validation_log.md`](validation_log.md).

## Como o trabalho é conduzido

- [`CLAUDE.md`](CLAUDE.md) e [`AGENTS.md`](AGENTS.md): regras do projeto para agentes de código.
- [`task_state.md`](task_state.md): fonte da verdade sobre o que está feito, em andamento e bloqueado.
- [`validation_log.md`](validation_log.md): evidência (comando e resultado real) de cada tarefa concluída.

## Convenções

- Código e identificadores em inglês; documentação e textos de UI em pt-BR.
- Commits no padrão Conventional Commits.
- Validação na borda com Zod; Oracle sempre com bind variables.
- Datas gravadas em UTC no banco; exibição no fuso do usuário.

## Conteúdo e direitos autorais

O app **não inclui letras de músicas protegidas**. Usa músicas de domínio público e folclore, exercícios originais e apenas progressões de acordes. Todo conteúdo de técnica traz aviso de segurança: pausas, sem dor, e parar se houver desconforto nos pulsos ou dedos.

## Licença

Ainda não definida.
