# NUM Portal - multi-stage Docker image for the analysis portal.
# The portal itself is NOT part of the experiment; it only records and shows it.
# Needs output: 'standalone' in next.config.

# 1) All dependencies, used to build
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) Only the runtime dependencies, for the migration and seed scripts.
#    Next.js traces what the server needs by itself, but those two scripts run outside it.
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 3) Build the application
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
RUN npm run build

# 4) Small runtime image
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static

# Database migrations and the account script (node scripts/migrate.mjs, node scripts/seed.mjs)
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts ./scripts
COPY --from=prod-deps /app/node_modules ./node_modules

USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["sh", "scripts/docker-start.sh"]
