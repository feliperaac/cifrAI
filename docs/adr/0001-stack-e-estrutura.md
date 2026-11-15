# ADR-0001: Stack e estrutura do repositório

Status: aceito (aprovado pelo usuário em 2026-11-15)
Data: 2026-11-15

## Contexto

CifrAI é um app estilo Duolingo para aprender violão do zero, mobile-first, feito por um time pequeno (1 dev + agentes de IA). O aluno estuda com o violão no colo e nem sempre tem boa rede, então o app precisa funcionar offline. Começa como PWA e depois vira APK Android via Capacitor. Algumas restrições não são escolha nossa:

- **Oracle 19c** já existe (on-prem, PDB). Fica fora do Compose e é acessado a partir do host.
- Deploy com **Docker Compose** em uma VM dev e uma VM prod. Kubernetes só se houver necessidade real.
- O afinador precisa de microfone, e o microfone exige HTTPS também em dev.

O monorepo inicial já existe (F0-01, VL-0002): pnpm 12.21.0 via `packageManager`, Node 24 em `.nvmrc`/`engines`, TypeScript 5.9 strict, ESLint flat, Prettier e Vitest. Os workspaces são `apps/web`, `apps/api`, `packages/shared` e `packages/content`.

## Decisão

Adotar a stack da seção 2 do `CLAUDE.md` e a estrutura da seção 3, **com as salvaguardas listadas em "Consequências"**:

| Área | Decisão |
|---|---|
| Linguagem | TypeScript strict em tudo; schemas Zod compartilhados |
| Front | React + Vite + `vite-plugin-pwa`, TanStack Query, Zustand, React Router, Tailwind + tokens |
| Back | Node.js LTS + Fastify + Zod (validação na borda) |
| Banco | Oracle 19c via `node-oracledb` 6.x em **thin mode** (sem Instant Client) |
| Migrações | Flyway Community em container, SQL versionado e imutável em `db/migrations` |
| Proxy/TLS | Caddy (ACME em prod, CA interna em dev) |
| Áudio | Web Audio API + AudioWorklet |
| Mobile | PWA → Capacitor (WebView Android) |
| Infra | Docker + Compose; imagem com tag = git SHA promovida dev → prod |
| Monorepo | pnpm workspaces |

A estrutura é `apps/{web,api}`, `packages/{shared,content}`, `db/{migrations,seeds}`, `infra/{docker,caddy,scripts}`, `compose*.yaml` e `docs/adr/`. O conteúdo das lições é código: JSON versionado e validado por Zod, com IDs estáveis.

## Alternativas consideradas

- **Thick mode (Instant Client na imagem):** suporta NNE e recursos avançados, mas a imagem fica maior, precisa de `libaio` e há atrito de licença e download. Fica como **plano B** se o banco exigir NNE.
- **Liquibase OSS** em vez de Flyway: tem rollback declarativo e bom suporte a Oracle. Recusado *por enquanto*: também roda em JVM, tem um formato a mais (changelog) e o modelo forward-only em SQL puro do Flyway basta para 1 dev. Continua como substituto previsto em D4.
- **Runner de migração próprio em Node/TS:** sem JVM, mas recriaria lock, checksum e histórico na mão. Recusado: custo de manutenção e risco maiores que o benefício.
- **App nativo (Kotlin) ou React Native:** melhor latência de áudio, mas exige duas bases de código e perde o PWA. Recusado; o áudio fica atrás de um adaptador (ver Consequências).
- **Polyrepo ou Nx/Turborepo:** polyrepo dificulta compartilhar `shared`/`content`, e Nx/Turbo trazem complexidade sem ganho nesta escala.
- **Kubernetes já:** sem necessidade (um host, sem autoscaling). A API fica stateless para manter a porta aberta.

## Consequências

**Positivas:** um só idioma e um só conjunto de tipos de ponta a ponta; imagens pequenas (thin mode); um único código para web e APK; reversibilidade alta na maior parte das escolhas.

**Negativas e riscos, com as salvaguardas adotadas:**

1. **Thin mode não suporta Native Network Encryption nem checksumming** (confirmado na doc oficial do node-oracledb). Também não lê `sqlnet.ora`, não aceita verificador de senha 10G e só aceita NCHAR com AL16UTF16. *Salvaguarda:* na F0-04, verificar a configuração de rede do PDB (NNE `REQUIRED`?) e o verificador de senha dos usuários `CIFRAI_*`. Se houver NNE obrigatório, migrar para thick ou TCPS (registrar em ADR). Pool com `poolPingInterval` e `expireTime` (keepalive) contra conexões mortas.
2. **Rede container → host:** usar `extra_hosts: host-gateway` e confirmar a regra de firewall do host para a porta 1521 vinda da bridge Docker (F0-04).
3. **Flyway Community:** sem `undo` nem dry-run. No Oracle, DDL faz commit implícito, então uma migração com vários DDL que falha no meio deixa estado parcial e exige `repair`. *Salvaguarda:* migrações pequenas (idealmente um DDL por arquivo), forward-only, backup antes de migrar em prod. A imagem do Flyway deve ter versão fixa e o suporte a Oracle 19c precisa ser comprovado com execução real (D4, F0-05). Pela doc da Redgate, o 19c é "supported" para Teams/Enterprise, e a página não diz nada explícito sobre a Community.
4. **Capacitor:** a origem do app é `https://localhost`, então a API fica cross-origin. Cookie `httpOnly` com `SameSite=None` em WebView é frágil. Service worker no WebView pode gerar cache duplo. O WebView Android pode ter latência de áudio ruim. *Salvaguardas:* (a) a estratégia de sessão no APK deve ser decidida em F1-06 (cookie com API no mesmo site via proxy, `CapacitorCookies`, ou bearer token com refresh); (b) desligar o registro do SW quando `Capacitor.isNativePlatform()`; (c) o áudio fica atrás de uma interface (`AudioEngine`) para permitir um plugin nativo depois; (d) fazer uma PoC de afinador e metrônomo em Android de entrada antes de F3-03.
5. **Sync offline-first:** sincronizar *estado* gera XP duplicado, conflitos entre dispositivos e streak manipulável pelo relógio do cliente. *Decisão de direção:* sincronizar um **log de eventos append-only** (`eventId` UUID gerado no cliente, `UNIQUE` no Oracle para idempotência, `ORA-00001` tratado como sucesso). XP, streak e agendamento de revisão são **calculados no servidor**. O timestamp do cliente só é aceito dentro de uma janela de tolerância. O convidado tem um `guestId` que é reivindicado no login. Os detalhes ficam para um ADR próprio antes de F1-07/F1-11.
6. **pnpm no Docker:** o lockfile único invalida o cache entre apps, e `workspace:*` aponta para TS não compilado. *Salvaguarda:* a API é empacotada em bundle único (esbuild/tsup), ou usa `pnpm deploy --prod`, e a imagem final não contém pnpm. Usar `pnpm fetch` para cachear dependências. Escolha final na F0-03.

**Custo de reverter:** baixo para front, proxy e monorepo. Médio para Flyway → Liquibase, porque a tabela de histórico muda, mas os SQLs são reaproveitáveis. Médio para thin → thick (só muda a imagem da API). **Alto** para o modelo de sync depois de haver usuários, por isso ele ganha ADR próprio antes de F1.

**Compose (dev/prod):** igual nos dois ambientes; mudam só as variáveis de ambiente. O Oracle fica fora do Compose. O `migrate` é um serviço one-shot.

**APK:** os riscos 4 e 5 são os que mais o afetam.

**LGPD e segurança:** o log de eventos é dado pessoal (progresso ligado a uma conta), então exclusão de conta deve apagar ou anonimizar os eventos. O usuário da API tem DML mínimo. Nenhuma credencial vai para a imagem.

## Como validar / critérios de aceite

- F0-03: imagens web e api buildam em multi-stage, não-root, e a imagem da API roda sem pnpm e sem monorepo dentro.
- F0-04: a API conecta em thin mode a partir do container, com `SELECT 1 FROM DUAL` passando em pool. NNE e verificador de senha verificados e registrados.
- F0-05: Flyway Community (versão fixa) aplica `V001` em schema vazio e uma versão nova sobre o estado anterior no 19c (fecha D4).
- Antes de F1-07: ADR-0002 (modelo de sync por eventos) aceito.
- Antes de F3-03: PoC de áudio no WebView Android medida e registrada.

## Segunda opinião (Gemini)

Consulta em 2026-11-15 via MCP (`generate_text`, modelo `gemini-3.8-flash`; `gemini-2.5-pro` não estava mais disponível), com briefing sanitizado (sem nomes, hosts ou credenciais) e pedido explícito de revisão adversarial.

| Ponto do Gemini | Resolução | Motivo |
|---|---|---|
| Thin não suporta NNE; checar `sqlnet.ora` e ter thick como plano B | **Aceito** | Confirmado na doc oficial do node-oracledb (apêndice thin vs thick) |
| Firewall do host e conexões ociosas mortas; usar `extra_hosts` e ping de pool | **Aceito** | Coerente com a seção 6 do CLAUDE.md |
| Trocar Flyway por Liquibase ou runner próprio ("restrições arbitrárias", 19c "deprecated" na Community) | **Recusado por ora** | Não encontrei fonte para "19c deprecated". O caso conhecido de "Unsupported Database: Oracle 19.0" era plugin Oracle ausente no Flyway 10+, não restrição de edição. Mantido com verificação real em F0-05 (D4) |
| DDL com commit implícito: um DDL por migração | **Aceito** | Fato do Oracle; vira convenção para `oracle-db` |
| Abandonar cookies `httpOnly` no APK e usar bearer | **Adiado (F1-06)** | Risco real, mas há alternativas que mantêm cookie (mesmo site via proxy, `CapacitorCookies`). Token em storage aumenta a superfície de XSS. Decisão de `backend-api` + `security-reviewer` |
| Desligar o SW no Capacitor | **Aceito** | O Capacitor 7+ já intercepta requisições do SW (`resolveServiceWorkerRequests`); o cache duplo é desnecessário |
| Microfone exige sobrescrever `onPermissionRequest` e usar `@capacitor/camera` | **Recusado** | O `BridgeWebChromeClient` do Capacitor já trata a permissão de captura de áudio quando `RECORD_AUDIO` está no manifest; o plugin de câmera é irrelevante. Confirmar em F4-02 |
| Latência de áudio no WebView; abstrair o motor de áudio e fazer PoC cedo | **Aceito** | Barato, e é o maior risco de produto |
| Sync por log de eventos idempotente, cálculo no servidor, claim de `guestId` | **Aceito como direção** | Resolve duplicação, conflito e relógio. Usar UUID (v7 ou v4) em `RAW(16)`, conforme a seção 6. Detalhar no ADR-0002 |
| Bundle único da API (tsup/esbuild) para fugir de symlinks do pnpm | **Aceito como opção preferida** | Imagem menor e sem pnpm em runtime. Decisão final em F0-03 junto com `pnpm deploy` |
| Fixar pnpm em `9.x` | **Recusado** | O projeto já fixa pnpm 12.21.0 via `packageManager` + corepack; a sugestão está desatualizada |

**Divergências de fundo:** o Gemini tende a recomendar trocas de ferramenta (Flyway, cookies) com base em afirmações que não pude confirmar. A posição deste ADR é manter as decisões e transformar cada risco em critério de aceite verificável nas tarefas F0-03, F0-04, F0-05, F1-06 e F4-02.


## Decisões do usuário (2026-11-15)

- **ADR aceito** como escrito.
- **D4 fechada:** Flyway Community `13.12.2` (imagem `flyway/flyway:13.12.2-alpine`) aceito. Comprovado em execução real no Oracle 19c: schema vazio até v002, v003-v004 sobre o estado anterior, reexecução sem mudanças e `validate` (VL-0008, VL-0010). Liquibase fica como plano B apenas se surgir restrição real.
- **Sync:** direção por log de eventos append-only e idempotente aprovada; o detalhe vai para o ADR-0002 (tarefa F0-10), antes de F1-07 e F1-11.
- **Node:** o projeto segue em Node 24 (`.nvmrc`, `engines`, imagens Docker).
