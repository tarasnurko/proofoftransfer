FROM node:22-alpine AS base
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app

# --- Prune monorepo for web ---
FROM base AS pruner
RUN npm install -g turbo@^2
COPY . .
RUN turbo prune web --docker

# --- Install deps ---
FROM base AS installer
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo build --filter=web

# --- Run ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Drizzle migrations (uses drizzle-orm migrator, not drizzle-kit)
COPY --from=builder /app/apps/web/drizzle ./apps/web/drizzle
COPY --from=builder /app/node_modules/.pnpm/drizzle-orm@0.45.1_@types+pg@8.16.0_postgres@3.4.8/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/.pnpm/postgres@3.4.8/node_modules/postgres ./node_modules/postgres
COPY --chown=nextjs:nodejs apps/web/migrate.mjs ./migrate.mjs

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["sh", "-c", "node migrate.mjs && node apps/web/server.js"]
