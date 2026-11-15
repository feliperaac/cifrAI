# AGENTS.md — CifrAI

Instruções universais para qualquer agente de código (Claude Code, Codex, Gemini CLI, Cursor etc.). Detalhes específicos do Claude estão em `CLAUDE.md`; em caso de conflito, `CLAUDE.md` prevalece para o Claude e este arquivo vale para os demais.

## Projeto
**CifrAI**: app de aprendizado de violão estilo Duolingo (lições curtas, XP, streak, exercícios interativos, afinador, metrônomo). Monorepo TypeScript: `apps/web` (React/Vite PWA), `apps/api` (Fastify), `packages/shared`, `packages/content`. Banco: Oracle 19c. Execução: Docker Compose.

## Antes de começar
1. Leia `task_state.md` (estado e prioridades).
2. Leia a seção relevante de `CLAUDE.md`.
3. Ao terminar, registre evidências em `validation_log.md` e atualize `task_state.md`.

## Setup
```
pnpm install
cp .env.example .env        # preencher credenciais Oracle de dev
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

## Regras essenciais
- TypeScript strict, sem `any`. Validação Zod nas bordas.
- SQL sempre com bind variables; nunca concatenar. Nunca usar SYS/SYSTEM.
- Migrações em `db/migrations` são imutáveis após aplicadas.
- Sem segredos no repositório. `.env` nunca é commitado.
- Mobile-first: validar em 360×640. Acessibilidade básica (contraste, foco, `aria-*`, alvos de toque ≥ 48px).
- Nada de letras protegidas por direitos autorais no conteúdo.
- Mudanças pequenas e focadas; Conventional Commits.

## Testes
- Unit: `pnpm test` · E2E: `pnpm test:e2e` · Conteúdo: `pnpm content:validate` · Lint/tipos: `pnpm lint && pnpm typecheck`.
- Todo bug corrigido ganha um teste que o reproduz.

## Definition of Done
Lint e tipos limpos, testes passando, build Docker saudável, migrações aplicam do zero, evidências registradas em `validation_log.md`, `task_state.md` atualizado.

## Agentes especializados (`.claude/agents/`)
`gemini-architect`, `frontend-ui`, `backend-api`, `oracle-db`, `devops-infra`, `pedagogy-content`, `audio-dsp`, `qa-validator`, `security-reviewer`. Cada arquivo define escopo, entradas, saídas e limites. Respeite o escopo: não edite fora dele sem alinhar com o agente responsável.

## Formato de relatório de qualquer agente
1. O que foi feito (arquivos alterados)
2. Como validar (comandos exatos)
3. Resultado observado
4. Riscos / pendências
