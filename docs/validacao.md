# Validação local (`pnpm validate`)

Um comando roda a pipeline da Definition of Done, para no primeiro erro e imprime um resumo por etapa com tempo.
O CI (F0-09) deve chamar o mesmo script: `bash infra/scripts/validate.sh`.

## Comandos

```
pnpm validate            # rápido: qualidade + builds (sem subir stack, sem Oracle)
pnpm validate --stack    # + sobe o stack em 8088/8443, confere saúde e endpoints, derruba no fim
pnpm validate --db       # + Flyway info/validate e teste de privilégios do CIFRAI_APP (Oracle real)
pnpm validate --stack --db
```

Código de saída: `0` tudo ok; `1` alguma etapa falhou (o resumo diz qual); `2` uso incorreto/pnpm ausente.

## O que cada etapa prova

| Etapa                         | Prova                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| format:check                  | Prettier em todo o repo                                                                       |
| lint / typecheck              | ESLint e `tsc` estrito em todos os pacotes                                                    |
| test                          | Testes unitários (Vitest) de todos os pacotes                                                 |
| content:validate              | Conteúdo válido. **Hoje é placeholder** (validador real em F1-01); passa sem provar nada      |
| web build                     | `vite build` do PWA gera bundle, manifest e service worker                                    |
| docker build dev / prod       | As imagens constroem (`compose.yaml` + `compose.dev.yaml`, e só `compose.yaml`)               |
| stack up / healthy / endpoints | api, web e proxy ficam `healthy` (timeout 180 s); `/api/health`, `/api/ready` (Oracle) e `/` respondem 200 via HTTPS |
| db flyway info/validate       | Migrações aplicadas e íntegras (checksums) no Oracle real                                     |
| db app-privileges             | `CIFRAI_APP` faz DML, constraints valem e DDL é negado (ORA-01031); tudo com rollback         |

## Comportamentos importantes

- Docker ou `.env` ausentes: as etapas dependentes aparecem como `PULADO` com o motivo, e o resultado final avisa
  "OK, mas com etapas PULADAS" (não é validação completa). O script só confere se o `.env` existe; nunca lê nem imprime valores.
- `--stack` sempre derruba o stack ao sair (trap), inclusive em falha ou Ctrl+C. O stack usa `compose.dev.yaml`
  (ainda não existe `compose.prod.yaml`).
- Node diferente de 24: apenas avisa. pnpm é procurado em `~/.local/bin` se não estiver no PATH.
- O script nunca executa `flyway clean`, `DROP` ou `TRUNCATE`.
- `--db` remove ao final o arquivo vazio `apps/api/scripts/app-privileges.mjs` criado pelo bind mount do Docker.

## Registrando evidência no `validation_log.md`

1. Rode o comando e copie do terminal o bloco `RESUMO DA VALIDACAO` (etapas, status, tempos) e o `RESULTADO`.
2. Crie uma nova entrada `VL-XXXX` (nunca edite as antigas) com: data, tarefa, agente, ambiente (versão do Node, se
   é diferente de 24), flags usadas, comando exato, resultado por etapa e etapas `PULADAS`/não verificadas.
3. Só marque `[x]` em `task_state.md` se a entrada existir e cobrir o critério de aceite da tarefa.
   Itens fora da pipeline (UI em 360×640, teclado/leitor de tela, E2E, revisão de segurança) continuam manuais.
