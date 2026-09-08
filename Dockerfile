# syntax=docker/dockerfile:1
# Imagen de Codexia: un solo servidor Node que sirve API + app Vue + homepage.
# Se construye FUERA del servidor de producción (aquí / CI) y Coolify solo la ejecuta.

# ---------- builder ----------
FROM node:24-bookworm-slim AS builder
WORKDIR /app
# Toolchain para compilar bcrypt (nativo) y OpenSSL para Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# La red del build bloquea registry.npmjs.org (SNI), así que usamos el espejo de Yarn
# (mismos tarballs, misma integridad). Playwright/Puppeteer no descargan navegadores.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    npm_config_audit=false \
    npm_config_fund=false \
    npm_config_registry=https://registry.yarnpkg.com/ \
    NODE_OPTIONS=--max-old-space-size=4096

# Instalar dependencias (workspaces). Reescribimos el host del lockfile al espejo
# para que `npm ci` baje los tarballs desde ahí (los hashes sha512 siguen validando).
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN sed -i 's#https://registry.npmjs.org/#https://registry.yarnpkg.com/#g' package-lock.json \
 && npm ci --no-audit --no-fund

# Código y build (Prisma client + backend tsc + frontend vite).
COPY . .
RUN npx prisma generate --schema backend/prisma/schema.prisma
RUN npm run build
# (No se hace `npm prune`: en monorepo de workspaces elimina deps hoisted del backend.)

# ---------- runtime ----------
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
# openssl (Prisma) + cliente psql (restauración inicial de datos en el arranque).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates postgresql-client && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=3001

# Node modules (con @prisma/client generado y bcrypt compilado para linux) + artefactos.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
# Deps del backend que npm NO hoisteó a la raíz (p. ej. @fastify/static).
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/homepage ./homepage
COPY --from=builder /app/database ./database
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/app/docker-entrypoint.sh"]
