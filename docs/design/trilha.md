# Trilha, streak e meta diária (F1-09)

## Regra de desbloqueio (UI)

A ordem de estudo é a do currículo (unidades em ordem, lições em ordem), só com lições `active`.

- Lições `retired` somem da trilha e não bloqueiam nada (ADR-0002, seção 4).
- Concluída = existe ao menos um `lesson.completed` da lição no log local. Continua concluída e pode ser refeita.
- Uma lição pendente só abre se a lição ativa imediatamente anterior (mesmo atravessando unidades) estiver concluída e todos os seus `prerequisites` ativos e conhecidos estiverem concluídos. IDs desconhecidos ou aposentados em `prerequisites` são ignorados.
- A primeira lição abre sempre. Existe no máximo uma lição "atual" (a primeira pendente aberta).
- Unidade: concluída (todas as lições), atual (contém a lição atual) ou bloqueada.
- Vale só na interface. A rota `/licao/:id` não bloqueia deep link; a autoridade final é do servidor.

Código: `apps/web/src/path/pathState.ts` (função pura `buildPath`), fonte do currículo substituível em `apps/web/src/path/catalog.ts` (`CurriculumLoader`).

## Streak

`packages/shared/src/streak.ts`, função pura `computeStreak`. Dias distintos com ao menos 1 lição, por `localDate` do evento (data no `clientTz`). O dia de hoje sem atividade não zera: a contagem ancora em ontem (`pendingToday`). Sem hoje nem ontem, o atual é 0; o melhor é preservado. Atividade com `recordedOn` mais de `STREAK_BACKFILL_DAYS` (7) depois do `localDate` é ignorada. No cliente é uma estimativa otimista (`estimate: true`); o servidor é a autoridade.

## Meta diária

Padrão 20 XP; opções 10, 20, 30 e 50. Evento `daily_goal.set` (payload `{ goalXp }`, versão 1). Vale a partir do `localDate` do evento; o último vence (ordem canônica). Meta atingida no dia: XP do dia >= meta.
