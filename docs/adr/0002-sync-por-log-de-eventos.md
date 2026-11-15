# ADR-0002: Sync de progresso por log de eventos

Status: aceito (aprovado pelo usuário em 2026-11-15)
Data: 2026-11-15
Relacionados: ADR-0001 (risco 5 e "Decisões do usuário"), D1, F1-06, F1-07, F1-08, F1-10, F1-11

## Contexto

O aluno estuda com o violão no colo e muitas vezes sem rede. O progresso (lições concluídas, respostas, revisões, meta diária) precisa ser registrado offline e enviado depois, a partir de um ou mais aparelhos (PWA no navegador e, depois, APK Capacitor).

O ADR-0001 já fixou a **direção**, aprovada pelo usuário: sincronizar um **log de eventos append-only e idempotente**, com `eventId` gerado no cliente, `UNIQUE` no Oracle, e XP, streak e revisão **calculados no servidor**, com claim de `guestId` no login. Este ADR detalha essa direção. Ele não reabre a escolha entre sincronizar eventos ou estado.

Restrições que moldam os detalhes:

- **Oracle 19c**: não tem tipo `JSON` nativo (JSON vai em `VARCHAR2`/`CLOB` com `CHECK (... IS JSON)`). String vazia vira `NULL`. Bind variables sempre. As tabelas pertencem a `CIFRAI_MIG`, o `CIFRAI_APP` recebe `GRANT` por tabela, e a convenção é um DDL por migração (ver `db/README.md`).
- **Uma instância de API** no Compose, stateless, com porta aberta para Kubernetes no futuro.
- **Time pequeno**: a solução precisa caber em 1 dev, sem fila nem worker separado.
- Modelo atual do banco: só `USERS` (PK `RAW(16)`, `TIMEZONE` IANA) e `APP_SETTINGS`.
- O streak é motivacional e não tem valor financeiro (D6 deixa monetização fora do MVP). Isso define quanto rigor antifraude vale a pena.

## Decisão

### 1. Envelope do evento (schema em `packages/shared`)

Cada evento é imutável e tem este formato (Zod, união discriminada por `type`):

| Campo | Tipo | Regra |
|---|---|---|
| `eventId` | UUID string | Gerado no cliente. **v7 preferido** (localidade no índice), v4 aceito. O servidor **nunca** deduz tempo do UUID. |
| `type` | enum | `lesson.completed`, `exercise.answered`, `review.graded`, `daily_goal.set`, `practice.self_reported`. Tipos novos só por adição. |
| `schemaVersion` | int ≥ 1 | Versão do payload **daquele tipo**. O servidor aceita as versões listadas em `SUPPORTED_EVENT_VERSIONS` e converte as antigas para a atual com upcasters puros em `packages/shared`. |
| `payload` | objeto | Validado pelo schema `(type, schemaVersion)`. Contém só **fatos** (lição X, exercício Y, resposta, nota 0–5, duração), **nunca** XP, streak ou datas de revisão. Limite: 2 KB serializado em UTF-8. |
| `contentVersion` | string | Versão do pacote `packages/content` em uso no cliente quando o evento foi gerado. |
| `deviceId` | UUID | Aleatório por instalação, guardado no IndexedDB. Não é um identificador de hardware. |
| `clientSeq` | int ≥ 1 | Monotônico por `deviceId`. Detecta lacunas e reordenação. |
| `clientTs` | ISO-8601 UTC | Relógio do aparelho no momento do fato. |
| `clientTz` | IANA tz | Fuso do aparelho no momento do fato (ex.: `America/Sao_Paulo`). Validado contra a lista IANA, com fallback para `USERS.TIMEZONE`. |

O servidor acrescenta `receivedAt` (UTC), `effectiveTs`, `localDate`, `serverSeq` (identity), `payloadHash` e `userId`.

As **regras de derivação** (XP por lição, SM-2, cálculo do streak) são funções puras em `packages/shared`. O cliente usa essas funções para uma **estimativa otimista** offline e o servidor usa as mesmas funções como **autoridade**. Depois de cada sync, o cliente substitui a estimativa pelo estado devolvido pelo servidor.

### 2. Idempotência

- `PROGRESS_EVENTS.ID = eventId` (PK `RAW(16)`).
- `payloadHash` = SHA-256 de um JSON canônico (`type`, `schemaVersion`, `payload`, `clientTs`, `deviceId`, `clientSeq`), guardado como `RAW(32)`.
- Classificação de cada evento recebido:
  - id novo → insere (`accepted`);
  - id já existe, **mesmo `userId` e mesmo hash** → `duplicate` (o cliente trata como sucesso e remove do outbox);
  - id já existe com hash diferente → `rejected` / `EVENT_ID_CONFLICT`;
  - id já existe e pertence a **outro usuário** → `rejected` / `EVENT_OWNED_BY_OTHER`. Nunca responder "duplicate" nesse caso: isso confirmaria a existência do id e misturaria contas.
- Implementação: dentro da transação, um `SELECT ID, USER_ID, PAYLOAD_HASH ... WHERE ID IN (:1, ..., :n)` (bind por posição, n ≤ 100) classifica os eventos. Depois vem um `executeMany` dos novos com `batchErrors: true`, que funciona como **rede de segurança** para corrida: um `ORA-00001` nessa etapa leva a reconsultar aquele id e reclassificar.

### 3. Tempo, ordem e relógio errado do cliente

O relógio do aparelho pode estar errado por acidente ou de propósito. Regras:

1. **Correção de skew por lote:** a requisição envia `sentAt` (relógio do cliente no envio). O servidor calcula `skew = receivedAt − sentAt` e usa `correctedTs = clientTs + skew` **se** |skew| > 2 min. Isso corrige o relógio errado mas consistente, que é o caso mais comum.
2. **Limites (clamp) por aparelho:**
   - limite superior: `receivedAt + 5 min` (nada no futuro);
   - limite inferior: `SYNC_DEVICES.LAST_EFFECTIVE_TS` daquele `deviceId` menos 5 min. Um aparelho **não consegue** registrar fatos anteriores ao que ele mesmo já sincronizou. Isso fecha o "atrasar o relógio para preencher dias passados" depois de um sync;
   - para um aparelho novo (primeiro sync), o limite inferior é `max(USERS.CREATED_AT, receivedAt − STREAK_BACKFILL_DAYS)` para eventos de conta. Para eventos de convidado no claim, vale o item 7.
   - `effectiveTs = clamp(correctedTs, inferior, superior)`. Os valores `clientTs` e `clientTz` originais ficam guardados para auditoria e não são descartados.
3. **`localDate`** = data de `effectiveTs` no fuso `clientTz` (validado). Usar o fuso do evento, e não só o do perfil, trata corretamente viagens e horário de verão. Como offsets IANA ficam entre −12 h e +14 h, trocar de fuso desloca no máximo um dia.
4. **Ordem canônica de derivação:** `(effectiveTs, deviceId, clientSeq, serverSeq)`. `serverSeq` só desempata, porque ele reflete a ordem de chegada e não a ordem dos fatos.
5. **Eventos atrasados:** eventos com `localDate` anterior a `hoje − STREAK_BACKFILL_DAYS` (proposta: **7 dias**, configurável) são aceitos e contam para XP total, progresso de lição e SM-2, mas são marcados `LATE = 1` e **não** alteram streak nem meta diária. O streak pode ser "consertado" retroativamente só dentro da janela.

**Risco residual aceito:** quem limpa o armazenamento ganha um `deviceId` novo e, no primeiro sync, pode preencher até 7 dias com relógio adulterado. Como o streak não tem valor financeiro, esse custo é aceitável. Se surgir monetização ligada a streak (D6), este ponto deve ser revisto.

### 4. O que o servidor calcula e como evita manipulação

O cliente envia fatos e o servidor deriva todo o resto a partir do catálogo de conteúdo e das regras.

- **XP:** vem do catálogo (`packages/content`, por lição/exercício), e nunca do payload. Primeira conclusão de uma lição num `localDate`: XP cheio. Repetições no mesmo dia: XP reduzido (proposta: 20%). Teto diário de XP por regra (proposta: 500). Duração mínima plausível por lição, derivada do número de exercícios. Abaixo dela o evento é aceito como fato, mas rende 0 XP (`code: IMPLAUSIBLE_DURATION` no resultado, como aviso).
- **Streak:** é calculado a partir de `DAILY_ACTIVITY` (dias com `COUNTS_FOR_STREAK = 1` e atividade mínima de 1 lição ou meta atingida). Ele é recalculado olhando para trás a partir do último dia ativo. Isso é barato porque há uma linha por dia.
- **Meta diária:** `daily_goal.set` altera a meta a partir do `localDate` do evento. `GOAL_MET` é calculado por dia.
- **Revisão espaçada (SM-2 simplificado, F1-10):** o estado do cartão (`EASINESS`, `INTERVAL_DAYS`, `REPETITIONS`, `DUE_AT`) é derivado de eventos `review.graded` (nota 0–5). Como o SM-2 **depende da ordem**, um evento cujo `effectiveTs` seja anterior ao `LAST_REVIEWED_AT` do cartão dispara um **replay local daquele cartão**: o servidor relê do log os `review.graded` daquele `(userId, cardId)` em ordem canônica e recalcula. Nunca há replay global no caminho do sync.
- **Referências de conteúdo:** os IDs de conteúdo são estáveis e nunca reutilizados (CLAUDE.md §5). Lições removidas ficam no catálogo como **aposentadas** (sem aparecer na trilha), com o XP que tinham. Assim, eventos antigos de clientes que ficaram offline durante um deploy de conteúdo continuam válidos. ID desconhecido → `rejected` / `UNKNOWN_CONTENT_REF`.
- **Versão das regras:** `USER_PROGRESS_STATE.RULES_VERSION`. Quando as regras de XP, streak ou SM-2 mudarem, um comando administrativo reconstrói as projeções a partir do log, usuário por usuário (rebuild), sem tocar nos eventos.

### 5. Endpoint de sync

`POST /v1/sync` (autenticado, ver F1-06):

```jsonc
// request
{ "deviceId": "uuid", "sentAt": "2026-11-15T12:00:00Z", "guestClaim": { "guestId": "uuid" } /* opcional, item 7 */,
  "events": [ /* 1..100 envelopes */ ] }
// response 200
{ "results": [ { "eventId": "uuid", "status": "accepted|duplicate|rejected", "code": "OPTIONAL_CODE" } ],
  "state": { "xpTotal": 0, "todayXp": 0, "dailyGoalXp": 0, "streak": { "current": 0, "best": 0, "lastDate": "2026-11-15" },
             "reviewDueCount": 0, "rulesVersion": 1, "stateVersion": 42 },
  "serverTime": "2026-11-15T12:00:01Z" }
```

- **Aceitação parcial:** cada evento tem seu resultado e o lote não é tudo-ou-nada. Um evento malformado é `rejected` (`INVALID_PAYLOAD`, `UNSUPPORTED_SCHEMA_VERSION` etc.) e os demais seguem. O cliente remove do outbox os `accepted`, os `duplicate` e os `rejected` definitivos (guardando os rejeitados numa área de diagnóstico local). Erros 5xx ou de rede mantêm o lote inteiro no outbox e o envio é refeito com backoff exponencial e jitter.
- O envelope da requisição inválido (JSON quebrado, > 100 eventos, corpo > 256 KB) → 400/413 no formato padrão `{ "error": { "code", "message" } }`.
- **Estado completo** (lições, cartões com `DUE_AT`, histórico diário) fica em `GET /v1/progress` (F1-08). A resposta do sync traz só o resumo para manter o payload pequeno. O cliente chama `GET /v1/progress` quando `stateVersion` mudar por causa de outro aparelho.
- **Limites:** até 100 eventos e 256 KB por requisição. Rate limit com `@fastify/rate-limit`: proposta de 30 req/min por usuário e 60 req/min por IP. O store em memória basta com uma instância; com várias instâncias ou kube, o store passa a ser compartilhado (registrar em ADR quando acontecer).
- **Transação (uma por requisição):**
  1. `SELECT ... FROM USER_PROGRESS_STATE WHERE USER_ID = :u FOR UPDATE`. Isso serializa os syncs do mesmo usuário (dois aparelhos ao mesmo tempo) e evita corrida de `MERGE` com `ORA-00001`/`ORA-00060`.
  2. Classificar (item 2), validar, calcular `effectiveTs`/`localDate`.
  3. Inserir os novos com `executeMany`.
  4. Calcular **em memória** o efeito do lote: dias afetados, lições afetadas e cartões afetados (com replay local quando houver evento fora de ordem).
  5. Gravar as projeções **em massa**, com um `MERGE`/`executeMany` por tabela e não por evento. Atualizar `SYNC_DEVICES` e incrementar `STATE_VERSION`.
  6. Commit.

### 6. Conflito entre aparelhos

Não existe conflito de escrita, porque eventos só se somam. O que muda entre aparelhos é a **ordem**, e a ordem canônica do item 3 resolve isso de forma determinística. Os casos específicos:

- O mesmo fato duplicado em dois aparelhos (ex.: concluiu a lição X no celular e no tablet no mesmo dia): são dois eventos. O XP de repetição reduzido e o teto diário limitam o ganho.
- `daily_goal.set` concorrente: vale o de maior `effectiveTs` (last-writer-wins pela ordem canônica).
- SM-2: replay local do cartão (item 4).

### 7. Modo convidado e claim do `guestId` (resolve D1, ver "Decisão pendente")

- O convidado recebe um `guestId` (UUID) local. Os eventos ficam num **outbox no IndexedDB** e **não vão ao servidor** enquanto não houver conta. Não existem contas anônimas no servidor.
- O app pede `navigator.storage.persist()` e mostra lembretes para criar conta (após a 1ª lição, ao atingir um streak de 3 dias e antes de qualquer ação que limpe dados). Isso reduz o risco de o navegador apagar o armazenamento.
- **Claim no login ou no cadastro:**
  1. Se o outbox do convidado tiver eventos, o app **pergunta** "Levar o progresso deste aparelho para a conta?" (levar / descartar). Isso evita que um aparelho compartilhado misture o progresso de duas pessoas. No cadastro novo, levar é o padrão.
  2. Ao levar, o cliente envia o outbox em um ou mais `POST /v1/sync`, já autenticado, com `guestClaim.guestId`. Os eventos são reatribuídos ao `userId` da sessão. Para eventos de convidado, o limite inferior de tempo é `receivedAt − GUEST_CLAIM_MAX_AGE` (proposta: 30 dias), e eventos mais antigos que a janela de streak entram como `LATE`.
  3. `GUEST_CLAIMS (GUEST_ID PK, USER_ID)`: o primeiro claim vincula o `guestId` a um usuário. Um claim do mesmo `guestId` por **outro** usuário → os eventos são `rejected` / `GUEST_ALREADY_CLAIMED`. Um claim repetido pelo mesmo usuário é idempotente (lotes retomados após uma queda de rede).
  4. Depois que todos os eventos estiverem `accepted`/`duplicate`, o cliente apaga o outbox de convidado e passa a usar o outbox da conta.
- O `guestId` **não é credencial**. Ele só agrupa eventos para auditoria e idempotência do claim. A autorização vem da sessão autenticada. Quem conhece um `guestId` alheio não ganha nada, porque os eventos daquele convidado só existem no aparelho dele.
- **Logout:** apaga os dados locais da conta (outbox já sincronizado, cache de estado). Um novo convidado nesse aparelho recebe `guestId` e `deviceId` novos. Eventos ainda não sincronizados bloqueiam o logout até o próximo sync, ou o app pede confirmação explícita para descartá-los.

### 8. Esboço do modelo Oracle (para F1-07; **sem migrações neste ADR**)

Todas as tabelas pertencem a `CIFRAI_MIG`, com um DDL por arquivo e `GRANT SELECT, INSERT, UPDATE, DELETE` ao `CIFRAI_APP` em migração própria. Todos os FK de `USER_ID` usam `ON DELETE CASCADE` (LGPD). Timestamps são `TIMESTAMP WITH TIME ZONE` gravados em UTC. `LOCAL_DATE` é `DATE` (truncado, sem hora) porque representa um **dia de calendário no fuso do aluno**, não um instante. Essa é a única exceção deliberada à regra de TSTZ.

**`PROGRESS_EVENTS`** (log append-only; o `CIFRAI_APP` só faz `INSERT`/`SELECT`, e o `DELETE` existe apenas para exclusão de conta)
- `ID RAW(16)` PK (`eventId`); `USER_ID RAW(16)` NOT NULL FK; `DEVICE_ID RAW(16)` NOT NULL; `CLIENT_SEQ NUMBER(19)` NOT NULL
- `EVENT_TYPE VARCHAR2(64 CHAR)` NOT NULL; `SCHEMA_VERSION NUMBER(5)` NOT NULL; `CONTENT_VERSION VARCHAR2(32 CHAR)` NOT NULL
- `SUBJECT_KEY VARCHAR2(64 CHAR)`: lição ou cartão afetado, extraído do payload. Serve para replay local sem `JSON_VALUE`.
- `PAYLOAD VARCHAR2(4000 CHAR)` NOT NULL `CHECK (PAYLOAD IS JSON)`. O limite real é de 4000 **bytes** com `MAX_STRING_SIZE=STANDARD`, por isso o Zod limita a 2 KB em bytes UTF-8. Não usar `CLOB` (overhead de LOB) e não depender de `MAX_STRING_SIZE=EXTENDED` (mudança irreversível na base).
- `PAYLOAD_HASH RAW(32)` NOT NULL; `CLIENT_TS`, `EFFECTIVE_TS`, `RECEIVED_AT` TSTZ NOT NULL; `CLIENT_TZ VARCHAR2(64 CHAR)` NOT NULL; `LOCAL_DATE DATE` NOT NULL
- `LATE NUMBER(1) DEFAULT 0 NOT NULL CHECK (LATE IN (0,1))`; `GUEST_ID RAW(16)` (nulo se for evento de conta)
- `SERVER_SEQ NUMBER(19) GENERATED ALWAYS AS IDENTITY` + `UNIQUE`
- Índices: `(USER_ID, EFFECTIVE_TS)` (rebuild/export), `(USER_ID, SUBJECT_KEY, EFFECTIVE_TS)` (replay de cartão/lição), `(USER_ID, LOCAL_DATE)` (recálculo de dia).

**`SYNC_DEVICES`**: PK `(USER_ID, DEVICE_ID)`; `FIRST_SEEN_AT`, `LAST_SYNC_AT`, `LAST_EFFECTIVE_TS` TSTZ; `LAST_CLIENT_SEQ NUMBER(19)`.

**`USER_PROGRESS_STATE`**: PK `USER_ID` (criada na mesma transação do cadastro; é a linha de lock); `XP_TOTAL NUMBER(10)`, `STREAK_CURRENT NUMBER(5)`, `STREAK_BEST NUMBER(5)`, `STREAK_LAST_DATE DATE`, `DAILY_GOAL_XP NUMBER(5)`, `RULES_VERSION NUMBER(5)`, `STATE_VERSION NUMBER(19)`, `UPDATED_AT` TSTZ.

**`DAILY_ACTIVITY`**: PK `(USER_ID, LOCAL_DATE)`; `XP NUMBER(6)`, `LESSONS_COMPLETED NUMBER(5)`, `GOAL_XP NUMBER(5)`, `GOAL_MET NUMBER(1)`, `COUNTS_FOR_STREAK NUMBER(1)` (com `CHECK IN (0,1)`).

**`LESSON_PROGRESS`**: PK `(USER_ID, LESSON_ID VARCHAR2(64 CHAR))`; `COMPLETIONS NUMBER(6)`, `BEST_SCORE NUMBER(3)`, `FIRST_COMPLETED_AT`, `LAST_COMPLETED_AT` TSTZ.

**`REVIEW_CARDS`**: PK `(USER_ID, CARD_ID VARCHAR2(64 CHAR))`; `EASINESS NUMBER(4,2)`, `INTERVAL_DAYS NUMBER(5)`, `REPETITIONS NUMBER(5)`, `DUE_AT`, `LAST_REVIEWED_AT` TSTZ. Índice `(USER_ID, DUE_AT)`.

**`GUEST_CLAIMS`**: PK `GUEST_ID RAW(16)`; `USER_ID RAW(16)` NOT NULL FK; `CLAIMED_AT` TSTZ; `EVENT_COUNT NUMBER(10)`.

Sem particionamento: é uma option paga do Enterprise Edition e não se justifica nesta escala. O volume esperado (dezenas de eventos por usuário por semana) cabe em B-tree comum. Rever se `PROGRESS_EVENTS` passar de dezenas de milhões de linhas.

## Alternativas consideradas

- **Sincronizar estado (last-writer-wins por linha):** recusada no ADR-0001. Duplica XP, perde progresso entre aparelhos e deixa o streak nas mãos do relógio do cliente.
- **CRDTs (ex.: Automerge/Yjs):** resolvem merge de documento, mas aqui o problema é cálculo autoritativo no servidor (XP, streak), não edição colaborativa. Adicionam dependência pesada sem ganho.
- **Login obrigatório desde a 1ª tela:** mais simples (sem claim, sem outbox de convidado), mas cria atrito no onboarding exatamente do público que desiste fácil (iniciante). Recusada como padrão; ver D1.
- **Contas anônimas no servidor para o convidado:** permitiriam backup do convidado, mas criam usuários-fantasma, ampliam a superfície para bots e cadastros em massa e complicam a LGPD (dado pessoal sem titular identificado). Recusada.
- **Derivação assíncrona (fila + worker):** desacopla ingestão e cálculo, mas exige mais um serviço e deixa o estado eventualmente consistente na resposta do sync. Recusada nesta escala. A derivação síncrona em lote (item 5) resolve. Rever se a latência do sync passar do orçamento (critério abaixo).
- **Replay completo do log a cada sync:** é simples e sempre correto, mas o custo cresce com o histórico. Fica só como ferramenta de rebuild administrativo.
- **Confiar no `clientTs` sem clamp, ou clamp fixo para `serverTs − 72h`:** a primeira opção deixa o streak manipulável. A segunda empilharia vários dias offline legítimos num único instante e dispararia o teto diário e a regra de duração mínima. Recusadas em favor de correção de skew + limite inferior por aparelho + janela de streak.

## Consequências

**Positivas**
- Idempotência forte: reenviar é sempre seguro, e o outbox pode repetir sem medo.
- Um único lugar de verdade para XP, streak e SM-2 (servidor), com as mesmas funções puras dando a estimativa offline.
- Histórico completo: permite rebuild quando as regras mudam, exportação LGPD (portabilidade) e depuração.
- API stateless (lock no banco, não em memória). A migração para várias instâncias só exige trocar o store do rate limit.

**Negativas e riscos**
- **Mais tabelas e mais lógica** do que um CRUD de progresso. O código de derivação precisa de testes de propriedade (ordem do lote ≠ ordem canônica → mesmo resultado).
- **Evolução de schema de evento** é para sempre: upcasters precisam ser mantidos e versões antigas não podem ser removidas enquanto houver clientes offline com elas.
- **Perda de dados do convidado** se o armazenamento do navegador for apagado antes do login. Mitigação: `storage.persist()`, lembretes e, no APK, o armazenamento do WebView é persistente.
- **Fraude residual de streak** (item 3): aceita conscientemente.
- **`FOR UPDATE` por usuário** serializa syncs do mesmo aluno. É aceitável porque um aluno faz poucas requisições.
- **Crescimento do log**: sem compactação no MVP. Se o volume justificar, uma política futura de snapshot + arquivamento precisará de ADR próprio.

**Custo de reverter:** **alto** depois que houver usuários reais (o formato do evento é contrato com clientes offline). Antes do primeiro deploy em prod é baixo. Por isso este ADR precisa ser aceito antes de F1-07.

**Compose (dev/prod):** não muda. Não há novo serviço, porque a derivação é síncrona na API. As tabelas novas entram por Flyway como qualquer outra migração. Os parâmetros (`STREAK_BACKFILL_DAYS`, `GUEST_CLAIM_MAX_AGE_DAYS`, limites de rate limit e lote) entram por variável de ambiente, iguais nos dois ambientes.

**APK/Capacitor:** o outbox no IndexedDB funciona igual no WebView. A sessão do APK (cookie vs bearer) continua sendo decisão de F1-06; o sync só exige "requisição autenticada". O `deviceId` é aleatório e não usa o Android ID, então não precisa de permissão nem é identificador persistente de hardware.

**LGPD e segurança:** eventos e projeções são dados pessoais. A exclusão de conta apaga tudo por `ON DELETE CASCADE` a partir de `USERS`, inclusive `GUEST_CLAIMS`. A exportação usa o log. O `clientTz` revela uma localização aproximada (fuso), o que é aceitável e deve constar da política de privacidade. Os logs da API não registram payloads, só contagens e códigos. O `security-reviewer` revisa F1-06 e F1-08.

### Impacto nas tarefas

| Tarefa | O que muda |
|---|---|
| **F1-06** `backend-api` | Cadastro cria `USER_PROGRESS_STATE` na mesma transação. Login/cadastro aceitam o fluxo de claim (item 7). A sessão do APK continua a decidir. Sem contas anônimas. |
| **F1-07** `oracle-db` | Criar as tabelas do item 8 (um DDL por arquivo + grants), com teste de privilégio do `CIFRAI_APP` e teste de `ON DELETE CASCADE`. Comprovar `executeMany` com `batchErrors` em thin mode no 19c. |
| **F1-08** `backend-api` | `POST /v1/sync` e `GET /v1/progress`; schemas do envelope e dos payloads em `packages/shared`; regras de XP, streak e meta como funções puras; rate limit; transação com `FOR UPDATE`. |
| **F1-10** `backend-api` | SM-2 como função pura `(cardState, grade, effectiveTs) → cardState` e replay local por cartão. Testes de ordem fora de sequência. |
| **F1-11** `frontend-ui` | Outbox no IndexedDB (convidado e conta separados), `deviceId`/`clientSeq`, sync ao reconectar com backoff, estimativa otimista via `packages/shared`, prompt de claim, `storage.persist()`, logout seguro. |
| **F1-01** `pedagogy-content` | O catálogo precisa expor XP por lição, número de exercícios (para a duração mínima) e o estado "aposentado". |

## Critérios de aceite

1. Reenviar o mesmo lote 3 vezes gera exatamente as mesmas linhas em `PROGRESS_EVENTS` e o mesmo `XP_TOTAL` (teste de integração no Oracle 19c real).
2. Mesmo `eventId` com payload diferente → `EVENT_ID_CONFLICT`. Mesmo `eventId` vindo de outro usuário → `EVENT_OWNED_BY_OTHER`.
3. Teste de propriedade: qualquer permutação dos mesmos eventos, dividida em qualquer número de lotes, produz projeções idênticas (XP, streak, `DAILY_ACTIVITY`, `REVIEW_CARDS`).
4. Evento com `clientTs` 2 dias no futuro é limitado a `receivedAt + 5 min`. Evento anterior ao `LAST_EFFECTIVE_TS` do aparelho é levado ao limite inferior. Um aparelho com relógio 3 h adiantado mas consistente tem os eventos corrigidos pelo skew.
5. Eventos de 10 dias atrás: contam XP e SM-2, `LATE = 1`, e não alteram o streak.
6. Claim: o mesmo `guestId` por dois usuários → o segundo recebe `GUEST_ALREADY_CLAIMED`. Claim interrompido e retomado não duplica nada.
7. Dois syncs simultâneos do mesmo usuário (2 aparelhos) terminam sem `ORA-00001`/`ORA-00060` e com estado consistente.
8. Lote com 101 eventos ou corpo > 256 KB → 413/400 no formato de erro padrão. O rate limit retorna 429.
9. Orçamento de latência: um sync de 100 eventos fica abaixo de 500 ms p95 na VM dev (medido e registrado no `validation_log.md`).
10. Excluir um usuário remove todas as linhas dele nas 7 tabelas.
11. E2E (F1-12): convidado faz uma lição offline → cria conta → o XP aparece no servidor → um segundo aparelho vê o mesmo XP.

## Decisão do usuário: D1 (aceita em 2026-11-15)

**Decisão (aceita pelo usuário):** **modo convidado com sync posterior. Login é opcional e o convidado é o padrão.** O aluno abre o app e já faz a primeira lição. O progresso fica no aparelho até ele criar uma conta, e então é levado para ela pelo claim do item 7. Não há contas anônimas no servidor.

- *Por quê:* menor atrito no onboarding de iniciantes e coerência com o offline-first. O custo extra (outbox de convidado + claim) é pequeno porque o outbox já existe para o modo logado.
- *O que o usuário aceita junto:* o progresso do convidado pode ser perdido se o navegador apagar os dados antes do cadastro. Isso é mitigado, mas não eliminado.
- *Alternativa:* login obrigatório. É mais simples, mas tem mais desistência na primeira tela.

Parâmetros aceitos pelo usuário junto com o ADR (a resposta cobriu a lista de parâmetros como um todo; limites de lote e rate limit — 100 eventos/256 KB, 30 req/min por usuário e 60 por IP — seguem a seção de endpoint): `STREAK_BACKFILL_DAYS = 7`, `GUEST_CLAIM_MAX_AGE_DAYS = 30`, XP de repetição no mesmo dia = 20%, teto diário = 500 XP.

## Segunda opinião (Gemini)

Consulta em 2026-11-15 via MCP (`generate_text`, modelo `gemini-3.8-flash`), com briefing sanitizado (sem nomes, hosts, caminhos ou credenciais) e pedido explícito de revisão adversarial sobre uma versão preliminar deste desenho.

| Ponto do Gemini | Resolução | Motivo |
|---|---|---|
| SM-2 não é comutativo; derivação incremental quebra com eventos fora de ordem; fazer replay localizado por cartão | **Aceito** | Correto. Adotado replay por `(userId, cardId)` a partir do log (índice com `SUBJECT_KEY`), em vez do mini-histórico dentro do cartão que ele sugeriu, que duplicaria dados |
| Clamp fixo em `serverTs − 72h` empilha dias offline num só instante e dispara teto diário/duração mínima | **Aceito** | A versão preliminar tinha esse problema. Substituído por correção de skew + limite inferior por aparelho + janela de streak |
| Não permitir conserto retroativo ilimitado do streak; horizonte de ~48 h | **Aceito com ajuste** | Janela adotada, mas de 7 dias (configurável): o app é offline-first e o streak não tem valor monetário. 48 h puniria o aluno sem rede no fim de semana |
| `batchErrors` dá o erro, mas não o hash; precisa consultar | **Aceito** | Adotado o `SELECT` de classificação antes do insert, com `batchErrors` só como rede de segurança. Pela doc do node-oracledb, `batchErrors` devolve o `offset` da linha com erro. O suporte em thin mode no 19c fica como critério de F1-07 |
| `MERGE` concorrente gera `ORA-00001`/`ORA-00060`; serializar por usuário com `SELECT FOR UPDATE` | **Aceito** | Comportamento conhecido do Oracle para upsert concorrente de linha inexistente. O lock fica em `USER_PROGRESS_STATE`, não em `USERS`, para não competir com edição de perfil |
| Usar `VARCHAR2` em vez de `CLOB` para o payload, com `MAX_STRING_SIZE=EXTENDED` (32 KB) | **Parcial** | `VARCHAR2(4000)` aceito. `EXTENDED` recusado: é mudança irreversível na base compartilhada e desnecessária com payload ≤ 2 KB |
| Particionar por `HASH(user_id)` cedo; B-tree com UUID aleatório degrada | **Recusado** | Particionamento é option paga do Enterprise Edition. Na escala esperada, B-tree basta, e UUIDv7 já é ordenado por tempo |
| Derivar por evento gera centenas de SQL; calcular o lote em memória e gravar em massa | **Aceito** | Item 5, passos 4–5 |
| Aparelho compartilhado: o convidado A contamina a conta B no login; pedir confirmação | **Aceito** | Prompt "levar ou descartar" no claim |
| `guestId` sem segredo permite sequestro de claim | **Recusado (não se aplica)** | Os eventos de convidado nunca estão no servidor antes do claim, e o claim é feito pela sessão autenticada com eventos que o próprio cliente envia. O `guestId` não dá acesso a nada. `GUEST_CLAIMS` impede reuso por outra conta |
| Sem contas anônimas no servidor | **Aceito** | Coincide com a proposta (bloat, bots, LGPD) |
| Drift de versão de conteúdo invalida eventos antigos; manter mapeamento ou catálogo por versão | **Aceito parcialmente** | IDs estáveis e nunca reutilizados já cobrem a maior parte. Basta manter lições removidas como "aposentadas" no catálogo. Tabela de mapeamento só se surgir fusão de exercícios |
| Usar o fuso do evento e não só o do perfil | **Aceito** | `clientTz` por evento, validado, com fallback para `USERS.TIMEZONE` |
| Safari/iOS apaga IndexedDB após 7 dias sem uso | **Aceito como risco** | A regra do WebKit vale para sites sem interação recente, não para PWA instalado na tela inicial, e o alvo do APK é Android. Mitigação por `storage.persist()` e lembretes de cadastro |

**Divergências de fundo:** o Gemini tende a propor salvaguardas de grande escala (particionamento, `EXTENDED`, horizonte curto de streak) que pesam mais para uma base 19c compartilhada e um app sem monetização do que os riscos que resolvem. Os pontos de corretude (SM-2 fora de ordem, clamp ingênuo, concorrência do `MERGE`, contaminação de convidado) foram todos incorporados.

**Pendências de verificação factual** (viram critérios de F1-07/F1-08 e não foram aceitas como fato só por esta análise): `executeMany` + `batchErrors` em thin mode contra o 19c real, e o orçamento de latência do item 9 dos critérios.
