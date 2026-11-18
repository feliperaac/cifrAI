#!/usr/bin/env bash
# Pipeline local de validacao do CifrAI (F0-08). Reutilizavel pelo CI (F0-09).
# Uso: infra/scripts/validate.sh [--stack] [--db] [--help]   (ou: pnpm validate -- --stack)
# Nunca imprime nem le valores do .env: so confere se o arquivo existe.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$RAIZ"

COM_STACK=0
COM_DB=0
for arg in "$@"; do
  case "$arg" in
    --stack) COM_STACK=1 ;;
    --db) COM_DB=1 ;;
    -h | --help)
      echo "Uso: infra/scripts/validate.sh [--stack] [--db]"
      echo "  --stack  sobe o stack (HTTP 8088 / HTTPS 8443), confere saude e endpoints, derruba no fim"
      echo "  --db     roda Flyway info/validate e o teste de privilegios do CIFRAI_APP (Oracle real)"
      exit 0
      ;;
    *) echo "Argumento desconhecido: $arg (use --help)" >&2; exit 2 ;;
  esac
done

# pnpm instalado em ~/.local/bin pode nao estar no PATH de shells nao interativos.
if ! command -v pnpm >/dev/null 2>&1 && [ -x "$HOME/.local/bin/pnpm" ]; then
  export PATH="$HOME/.local/bin:$PATH"
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "ERRO: pnpm nao encontrado (nem em ~/.local/bin)." >&2
  exit 2
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo "?")"
if [ "$NODE_MAJOR" != "24" ]; then
  echo "AVISO: Node $(node -v 2>/dev/null || echo ausente) em uso; o projeto exige Node 24 (.nvmrc). Resultados locais podem divergir do CI/imagens."
fi

TEM_DOCKER=0
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then TEM_DOCKER=1; fi
TEM_ENV=0
if [ -f "$RAIZ/.env" ]; then TEM_ENV=1; fi

COMPOSE_DEV=(docker compose -f compose.yaml -f compose.dev.yaml)
COMPOSE_BASE=(docker compose -f compose.yaml)

NOMES=()
STATUS=()
TEMPOS=()
FALHOU=0
FALHA_ETAPA=""

registrar() { NOMES+=("$1"); STATUS+=("$2"); TEMPOS+=("$3"); }

# etapa "<nome>" cmd... : executa; em falha registra e marca FALHOU (o chamador para).
etapa() {
  local nome="$1"; shift
  echo
  echo "==> [$nome] $*"
  local ini=$SECONDS
  if "$@"; then
    registrar "$nome" "OK" "$((SECONDS - ini))"
  else
    registrar "$nome" "FALHOU" "$((SECONDS - ini))"
    FALHOU=1
    FALHA_ETAPA="$nome"
  fi
}

pular() {
  echo
  echo "==> [$1] PULADO: $2"
  registrar "$1" "PULADO" "0"
}

resumo() {
  echo
  echo "================ RESUMO DA VALIDACAO ================"
  printf '%-28s %-8s %s\n' "ETAPA" "STATUS" "TEMPO"
  local i
  for i in "${!NOMES[@]}"; do
    printf '%-28s %-8s %ss\n' "${NOMES[$i]}" "${STATUS[$i]}" "${TEMPOS[$i]}"
  done
  echo "-----------------------------------------------------"
  if [ "$FALHOU" -ne 0 ]; then
    echo "RESULTADO: FALHOU na etapa '$FALHA_ETAPA'. Etapas seguintes nao foram executadas."
  elif printf '%s\n' "${STATUS[@]}" | grep -q '^PULADO$'; then
    echo "RESULTADO: OK, mas com etapas PULADAS (nao conta como validacao completa)."
  else
    echo "RESULTADO: OK, todas as etapas passaram."
  fi
}

# ---------- stack ----------
STACK_SUBIU=0
derrubar_stack() {
  if [ "$STACK_SUBIU" -eq 1 ]; then
    echo
    echo "==> Derrubando o stack (trap)..."
    HTTP_PORT=8088 HTTPS_PORT=8443 "${COMPOSE_DEV[@]}" down --remove-orphans >/dev/null 2>&1 \
      && echo "Stack derrubado." || echo "AVISO: falha ao derrubar o stack; confira 'docker compose ps'."
    STACK_SUBIU=0
  fi
}
limpar_stub_db() {
  # O bind mount de arquivo cria um stub vazio (root) em apps/api/scripts; remover se vazio.
  local nome stub
  for nome in app-privileges progress-model; do
    stub="$RAIZ/apps/api/scripts/$nome.mjs"
    if [ -e "$stub" ] && [ ! -s "$stub" ]; then rm -f "$stub" 2>/dev/null || true; fi
  done
}
ao_sair() {
  local codigo=$?
  derrubar_stack
  limpar_stub_db
  trap - EXIT
  exit "$codigo"
}
trap ao_sair EXIT

stack_subir() {
  export HTTP_PORT=8088 HTTPS_PORT=8443
  STACK_SUBIU=1
  "${COMPOSE_DEV[@]}" up -d --build api web proxy
}

stack_saudavel() {
  local limite=180 ini=$SECONDS svc id st
  while :; do
    local todos=1
    for svc in api web proxy; do
      id="$("${COMPOSE_DEV[@]}" ps -q "$svc" 2>/dev/null || true)"
      st="ausente"
      if [ -n "$id" ]; then st="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" 2>/dev/null || echo ausente)"; fi
      [ "$st" = "healthy" ] || todos=0
    done
    if [ "$todos" -eq 1 ]; then echo "api, web e proxy: healthy"; return 0; fi
    if [ $((SECONDS - ini)) -ge "$limite" ]; then
      echo "ERRO: timeout de ${limite}s esperando os servicos ficarem healthy." >&2
      "${COMPOSE_DEV[@]}" ps >&2 || true
      return 1
    fi
    sleep 3
  done
}

checar_url() { # checar_url <caminho> <trecho esperado no corpo, opcional>
  local caminho="$1" esperado="${2:-}" corpo codigo
  corpo="$(mktemp)"
  codigo="$(curl -sk --max-time 10 -o "$corpo" -w '%{http_code}' "https://localhost:8443$caminho" || echo 000)"
  if [ "$codigo" != "200" ]; then
    echo "ERRO: https://localhost:8443$caminho respondeu HTTP $codigo (esperado 200)" >&2
    rm -f "$corpo"; return 1
  fi
  if [ -n "$esperado" ] && ! grep -q "$esperado" "$corpo"; then
    echo "ERRO: corpo de $caminho nao contem '$esperado'" >&2
    rm -f "$corpo"; return 1
  fi
  echo "OK  $caminho -> 200 $(head -c 80 "$corpo" | tr -d '\n')"
  rm -f "$corpo"
}

stack_endpoints() {
  checar_url /api/health '"ok"' && checar_url /api/ready '"ready"' && checar_url / '<div id="root"'
}

# ---------- db ----------
db_flyway() {
  "${COMPOSE_BASE[@]}" --profile migrate run --rm migrate info \
    && "${COMPOSE_BASE[@]}" --profile migrate run --rm migrate validate
}
db_privilegios() {
  "${COMPOSE_DEV[@]}" run --rm --no-deps --build \
    -v ./db/tests/app-privileges.mjs:/repo/apps/api/scripts/app-privileges.mjs:ro \
    api node scripts/app-privileges.mjs
}
db_progresso() {
  "${COMPOSE_DEV[@]}" run --rm --no-deps \
    -v ./db/tests/progress-model.mjs:/repo/apps/api/scripts/progress-model.mjs:ro \
    api node scripts/progress-model.mjs
}

# ---------- pipeline ----------
echo "CifrAI: validacao local (stack=$COM_STACK db=$COM_DB)"

passos_basicos=(
  "format:check|pnpm format:check"
  "lint|pnpm lint"
  "typecheck|pnpm typecheck"
  "test|pnpm test"
  "content:validate|pnpm content:validate"
  "web build|pnpm --filter @cifrai/web build"
)
for p in "${passos_basicos[@]}"; do
  [ "$FALHOU" -eq 0 ] || break
  # shellcheck disable=SC2086
  etapa "${p%%|*}" ${p#*|}
done

# Etapas que precisam de docker e .env (o compose exige variaveis do .env ate para build).
requisito_docker() {
  if [ "$TEM_DOCKER" -ne 1 ]; then echo "docker indisponivel (comando ausente ou daemon parado)"; return 1; fi
  if [ "$TEM_ENV" -ne 1 ]; then echo ".env ausente (copie de .env.example e preencha)"; return 1; fi
}

if [ "$FALHOU" -eq 0 ]; then
  if motivo="$(requisito_docker)"; then
    etapa "docker build dev" "${COMPOSE_DEV[@]}" build
    [ "$FALHOU" -ne 0 ] || etapa "docker build prod" "${COMPOSE_BASE[@]}" build
  else
    pular "docker build dev" "$motivo"
    pular "docker build prod" "$motivo"
  fi
fi

if [ "$COM_STACK" -eq 1 ] && [ "$FALHOU" -eq 0 ]; then
  if motivo="$(requisito_docker)"; then
    etapa "stack up" stack_subir
    [ "$FALHOU" -ne 0 ] || etapa "stack healthy" stack_saudavel
    [ "$FALHOU" -ne 0 ] || etapa "stack endpoints" stack_endpoints
    derrubar_stack
  else
    pular "stack" "$motivo"
  fi
fi

if [ "$COM_DB" -eq 1 ] && [ "$FALHOU" -eq 0 ]; then
  if motivo="$(requisito_docker)"; then
    etapa "db flyway info/validate" db_flyway
    [ "$FALHOU" -ne 0 ] || etapa "db app-privileges" db_privilegios
    [ "$FALHOU" -ne 0 ] || etapa "db progress-model" db_progresso
  else
    pular "db" "$motivo"
  fi
fi

resumo
[ "$FALHOU" -eq 0 ] || exit 1
