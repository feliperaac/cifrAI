# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:24.11.1-alpine3.22

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm CI=true
ENV PATH=$PNPM_HOME:$PATH
# corepack embutido (0.34) nao suporta pnpm 12; atualiza para versao fixa.
RUN npm i -g corepack@0.36.0 && corepack enable && corepack prepare pnpm@12.21.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/content/package.json packages/content/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @cifrai/api...

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages packages
RUN pnpm --filter @cifrai/api build \
 && pnpm --filter @cifrai/api --prod deploy /out \
 && cp -r apps/api/dist /out/dist

# Dev: codigo vem por bind mount (compose.dev.yaml), hot reload via tsx watch.
FROM deps AS dev
ENV NODE_ENV=development
USER node
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["pnpm", "exec", "tsx", "watch", "src/server.ts"]

FROM ${NODE_IMAGE} AS prod
ENV NODE_ENV=production API_PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1
CMD ["node", "dist/server.js"]
