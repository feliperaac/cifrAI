# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:24.11.1-alpine3.22
ARG CADDY_IMAGE=caddy:2.10.2-alpine

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm CI=true
ENV PATH=$PNPM_HOME:$PATH
# corepack embutido (0.34) nao suporta pnpm 12; atualiza para versao fixa.
RUN npm i -g corepack@0.36.0 && corepack enable && corepack prepare pnpm@12.21.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/content/package.json packages/content/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @cifrai/web...

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages packages
RUN pnpm --filter @cifrai/web build

# Dev: Vite dev server (0.0.0.0:8080, HMR via wss atras do Caddy) com bind mount de apps/ e packages/.
FROM deps AS dev
ENV NODE_ENV=development \
    VITE_CACHE_DIR=/tmp/vite-cache \
    API_PROXY_TARGET=http://api:3000
COPY tsconfig.base.json ./
USER node
WORKDIR /repo/apps/web
EXPOSE 8080
CMD ["node", "node_modules/vite/bin/vite.js"]

FROM ${CADDY_IMAGE} AS prod
COPY infra/caddy/Caddyfile.web /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/dist /srv
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
