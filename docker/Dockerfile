# ── Build Stage ──
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml* package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/

RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared/src/ packages/shared/src/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/backend/src/ packages/backend/src/
COPY packages/backend/tsconfig.json packages/backend/
COPY packages/backend/prisma/ packages/backend/prisma/
COPY packages/frontend/src/ packages/frontend/src/
COPY packages/frontend/public/ packages/frontend/public/
COPY packages/frontend/tsconfig.json packages/frontend/tsconfig.node.json packages/frontend/
COPY packages/frontend/vite.config.ts packages/frontend/tailwind.config.ts packages/frontend/postcss.config.js packages/frontend/index.html packages/frontend/

RUN pnpm --filter @cristream/shared build
RUN pnpm --filter @cristream/backend exec prisma generate
RUN pnpm --filter @cristream/backend build
RUN pnpm --filter @cristream/frontend build

# ── Production Stage ──
FROM node:20-alpine AS production

RUN apk add --no-cache ffmpeg
WORKDIR /app

# Copy node_modules from builder (includes sharp native bindings)
COPY --from=builder /app/node_modules/ node_modules/
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/
COPY --from=builder /app/packages/backend/package.json packages/backend/
COPY --from=builder /app/packages/backend/dist/ packages/backend/dist/
COPY --from=builder /app/packages/backend/prisma/ packages/backend/prisma/
COPY --from=builder /app/packages/backend/node_modules/ packages/backend/node_modules/
COPY --from=builder /app/packages/frontend/dist/ packages/frontend/dist/
COPY --from=builder /app/packages/frontend/package.json packages/frontend/

EXPOSE 3000

CMD ["sh", "-c", "cd packages/backend && npx prisma generate && npx prisma migrate deploy && node dist/server.js"]
