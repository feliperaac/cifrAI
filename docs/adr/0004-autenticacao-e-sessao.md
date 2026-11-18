# ADR-0004: Autenticação e sessão (e-mail + senha, cookie no navegador, bearer no APK)

Status: proposto (implementado na F1-06; aguarda revisão do `security-reviewer`)
Data: 2026-11-17
Relacionados: ADR-0001 (risco 5), ADR-0002 (itens 5 e 7, tabela de impacto F1-06), ADR-0003, F1-06, F1-08, F1-11, F4

## Contexto

A API precisa identificar o usuário para `POST /v1/sync` e `GET /v1/progress` (F1-08). O produto roda em três formas com a mesma base de código: navegador, PWA instalado (ambos servidos pelo Caddy na **mesma origem** da API, em `/api`) e APK Capacitor (o front é embutido no APK e abre de `https://localhost`, **origem diferente** da API). O ADR-0002 já decidiu que **não existe conta anônima**: o convidado vive só no aparelho.

## Decisões

### 1. Como cada cliente autentica

- **Navegador/PWA:** cookie `__Host-cifrai_sid`, `HttpOnly; Secure; SameSite=Lax; Path=/`, sem `Domain` (o prefixo `__Host-` faz o navegador exigir isso e bloqueia injeção por subdomínio). O JavaScript nunca vê o token, então XSS não o rouba. `Secure` vale também no dev: o dev passa pelo Caddy com HTTPS, e `localhost` é contexto seguro.
- **APK Capacitor:** **token opaco no corpo da resposta + `Authorization: Bearer`**. Cookie cross-origin não serve: com `SameSite=Lax` o WebView não o envia em `fetch` entre origens, e `SameSite=None` abriria a API a CSRF e depende de política de cookies de terceiros que o Android/WebView vem restringindo. O cliente escolhe com `delivery: "cookie" | "token"` em register/login; no modo `token` o servidor **não** seta cookie. O token fica no armazenamento seguro do aparelho (Keystore via plugin do Capacitor, a decidir na F4), nunca em `localStorage`.
- Se o `Authorization` vier junto com o cookie, o Bearer vence (cliente nativo nunca depende do cookie).
- **Pendente (F4):** o APK faz chamadas cross-origin e exigirá CORS (`@fastify/cors`, origem exata `https://localhost` e cabeçalho `Authorization`, sem curinga). Não foi adicionado agora porque o navegador/PWA é same-origin e não precisa; adicionar dependência sem uso seria prematuro. `APP_ORIGINS` já aceita essa origem na checagem anti-CSRF.

### 2. Sessões no servidor, token só como hash

- Token: 32 bytes aleatórios (`crypto.randomBytes`), base64url. Opaco, sem dados dentro (sem JWT: precisamos de revogação imediata e não há ganho em validação sem estado com um único Oracle).
- No banco (`SESSIONS`, V024..V026) vai só `HMAC-SHA256(SESSION_SECRET, token)` em `RAW(32)` com `UNIQUE`. Vazamento do banco não entrega tokens utilizáveis nem permite validar candidatos sem o segredo. O token puro nunca é gravado nem logado.
- Expiração: **14 dias ociosos** (deslizante, renovada no máximo 1x por hora para não gravar a cada requisição) e **teto absoluto de 90 dias**; depois disso, login de novo. Constantes em `auth/service.ts`.
- Rotação: **um token novo a cada login/cadastro** (impede fixação de sessão). Não há rotação periódica do token em uso: com requisições concorrentes e o sync offline ela cria corridas (resposta perdida = sessão perdida) e o ganho é pequeno para um token de 256 bits, `HttpOnly` e revogável. Reavaliar se o `security-reviewer` pedir.
- Revogação: `POST /v1/auth/logout` marca `REVOKED_AT` (idempotente) e limpa o cookie. Linhas expiradas/revogadas do usuário são apagadas no próximo login dele (sem job agendado por ora). Trocar `SESSION_SECRET` invalida todas as sessões.
- Troca/reset de senha com revogação das outras sessões fica para quando existir o fluxo (não faz parte da F1-06).

### 3. CSRF

`SameSite=Lax` é a primeira camada. A segunda é a checagem de origem em todo método não seguro sob `/v1/auth` (e a replicar nas demais rotas autenticadas por cookie): se há `Origin`, ele precisa ter o mesmo host da requisição ou constar em `APP_ORIGINS`; se **não** há `Origin` mas há cookie de sessão, rejeita (`403 CSRF_REJECTED`). Requisição com `Authorization: Bearer` não tem credencial ambiente e dispensa a checagem. Só `application/json` vira objeto: `application/x-www-form-urlencoded` (o que um `<form>` cross-site envia) recebe 415 e `text/plain` chega como string e é recusado pela validação (400), então um formulário cross-site não consegue forjar a requisição. As respostas de auth levam `Cache-Control: no-store`.

### 4. Rate limit

`@fastify/rate-limit` (MIT, mantido pelo time do Fastify, ~350 KB, sem dependências nativas), `global: false`, só nas rotas de auth:

- **Por IP** (rota): cadastro 10/hora; login 20/15 min.
- **Por e-mail** (via `createRateLimit`, chave = SHA-256 do e-mail normalizado): **8 falhas de login em 15 min**; só tentativas erradas contam. Estourado, até a senha certa recebe `429 RATE_LIMITED` (com `Retry-After`) até a janela passar. Risco aceito: um atacante pode travar o login de uma vítima conhecida por 15 min; a alternativa (sem limite por e-mail) deixa o ataque distribuído por IPs livre.
- O armazenamento é **em memória do processo**. Vale enquanto a API for uma única réplica (decisão atual); com várias réplicas é preciso trocar o `store` (Redis) ou os limites ficam multiplicados. `req.ip` só reflete o cliente real com `TRUST_PROXY=true` (Caddy à frente; ligado no compose). Se a API for exposta direto (porta `API_DEV_PORT` no dev), o `X-Forwarded-For` é forjável, o que só afeta o limite por IP.

### 5. Senha

- Mínimo **10** caracteres, máximo **128** (teto contra DoS no hash). Bloqueio de uma lista curta de senhas comuns (≥ 10 caracteres), de senha igual ao e-mail (ou à parte local) e de senha com ≤ 2 caracteres distintos. **Sem** regras de composição (NIST SP 800-63B). A política é aplicada só no cadastro; no login só se limita o tamanho. Sem verificação de vazamento online (HIBP) por ora: envia dados a terceiros e exige decisão de privacidade.
- Hash **argon2id** pela lib **`@node-rs/argon2` 2.2.2** (MIT; mantida, última versão em 2026-10; ~740 KB; binário pré-compilado via napi-rs, com variantes gnu e **musl** — a imagem é Alpine, e o hash/verify funcionou na imagem `node:24-alpine` no teste de integração). Roda no threadpool do libuv, sem bloquear o event loop. Alternativa descartada: `argon2` (node-gyp ou prebuild próprio, mais frágil em Alpine) e `node:crypto.scrypt` (nativo, mas não é a recomendação atual da OWASP). Parâmetros: **m = 19 MiB, t = 2, p = 1** (mínimo OWASP), sal aleatório de 16 bytes na string PHC; a string cabe em `PASSWORD_HASH VARCHAR2(255)`. Os parâmetros ficam no hash, então dá para aumentá-los depois e re-hashear no login (não implementado).
- Sem *pepper* no hash da senha: o `SESSION_SECRET` já protege os tokens, e um pepper de senha complica a rotação sem ganho claro com argon2id salgado. Reavaliar com o `security-reviewer`.
- Concorrência: cada hash usa ~19 MiB; o limite de memória do container é 512 MB e o rate limit contém o volume. Sem semáforo próprio por ora.

### 6. Anti-enumeração

- **Login:** e-mail inexistente e senha errada devolvem o mesmo `401 INVALID_CREDENTIALS` com a mesma mensagem, e o caminho do e-mail inexistente executa uma verificação argon2 contra um hash descartável (mesmo custo de CPU).
- **Cadastro:** o hash é calculado **antes** de qualquer consulta, e a unicidade é garantida pela constraint `UQ_USERS_EMAIL` (ORA-00001 → `409 EMAIL_TAKEN`), sem corrida entre "verificar e inserir". Revelar "e-mail já cadastrado" é inerente a cadastro sem verificação de e-mail; o risco residual é mitigado só pelo rate limit por IP e **fica aberto até existir verificação por e-mail** (fora da F1).

### 7. Dados e Oracle

- E-mail normalizado na borda (Zod: `trim` + `toLowerCase` + formato) e reforçado pelo `CHECK (EMAIL = LOWER(EMAIL))`. `displayName` vazio vira ausente (`''` seria `NULL` no Oracle).
- `USERS.TIMEZONE` é IANA validado (padrão `America/Rio_Branco`, memória do projeto); datas gravadas em UTC (`TIMESTAMP WITH TIME ZONE`), tipo do bind explícito.
- Cadastro cria `USERS` + `USER_PROGRESS_STATE` (meta padrão de 20 XP) + `SESSIONS` na **mesma transação** (ADR-0002); falha em qualquer passo não deixa linha órfã (testado).
- Tabelas pertencem a `CIFRAI_MIG`; a API usa `CURRENT_SCHEMA` (`ORACLE_SCHEMA`, padrão `CIFRAI_MIG`) por conexão, conforme `db/README.md`. Sem `SELECT *`, sempre bind variables.
- Logs: JSON com `requestId`; registram `userId`, `delivery` e códigos, **nunca** senha, token, cookie nem e-mail (redação de `authorization`, `cookie`, `set-cookie`, `*.password`, `*.token`, `*.sessionToken`).
- Segredos só por ambiente: `SESSION_SECRET` (≥ 32 caracteres; a API recusa o placeholder `CHANGE_ME…` do `.env.example`).

### 8. Modo convidado

Não existe conta anônima no servidor (ADR-0002, item 7). O `guestId` **não é credencial** e **não aparece** em register/login/me. Ele só entra como `guestClaim` no corpo do `POST /v1/sync` (F1-08/F1-11), já com sessão autenticada; a tabela `GUEST_CLAIMS` existe (V021..V023). Ponto de extensão desta tarefa: nenhum campo novo em auth; o claim é responsabilidade do serviço de sync.

## Contrato

| Rota | Entrada | Saída |
|---|---|---|
| `POST /v1/auth/register` | `{email, password, displayName?, timezone?, delivery?}` | `201 {user, expiresAt, sessionToken?}` + cookie se `delivery=cookie` |
| `POST /v1/auth/login` | `{email, password, delivery?}` | `200` idem |
| `POST /v1/auth/logout` | cookie ou Bearer | `204`, cookie limpo |
| `GET /v1/auth/me` | cookie ou Bearer | `200 {user}` ou `401 UNAUTHORIZED` |

Erros: `{error:{code,message}}` com `VALIDATION_ERROR` (400), `WEAK_PASSWORD` (400), `EMAIL_TAKEN` (409), `INVALID_CREDENTIALS` (401), `UNAUTHORIZED` (401), `CSRF_REJECTED` (403), `RATE_LIMITED` (429), `DB_UNAVAILABLE` (503). Schemas em `packages/shared/src/auth.ts`.

## Consequências

- Duas dependências de runtime novas além do argon2: `@fastify/cookie` (MIT, oficial) e `@fastify/rate-limit` (MIT, oficial); `@cifrai/shared` entra no bundle da API (`noExternal` no tsup) por ser TypeScript puro.
- Nova variável obrigatória `SESSION_SECRET` (compose usa `:?`; `.env.example` traz o placeholder).
- Uma consulta ao Oracle por requisição autenticada (JOIN `SESSIONS`/`USERS` por índice único). Aceitável no volume atual; cache só com medição.
- Pendências: CORS do APK (F4), verificação de e-mail e recuperação de senha, re-hash por mudança de parâmetros, exclusão de conta (LGPD: `DELETE FROM USERS`, cascata), store de rate limit compartilhado se houver réplicas, revisão do `security-reviewer`.
- Reverter: baixo para o cookie; trocar de bearer para cookie no APK é só o `delivery`.
