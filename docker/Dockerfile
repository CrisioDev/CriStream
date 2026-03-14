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
COPY packages/frontend/tsconfig.json packages/frontend/tsconfig.node.json packages/frontend/
COPY packages/frontend/vite.config.ts packages/frontend/tailwind.config.ts packages/frontend/postcss.config.js packages/frontend/index.html packages/frontend/

RUN pnpm --filter @streamguard/shared build
RUN pnpm --filter @streamguard/backend exec prisma generate
RUN pnpm --filter @streamguard/backend build
RUN pnpm --filter @streamguard/frontend build

# ── Production Stage ──
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml* package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/

RUN pnpm install --frozen-lockfile || pnpm install

COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/
COPY --from=builder /app/packages/backend/dist/ packages/backend/dist/
COPY --from=builder /app/packages/backend/prisma/ packages/backend/prisma/
COPY --from=builder /app/packages/frontend/dist/ packages/frontend/dist/
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma/ node_modules/.prisma/

EXPOSE 3000

CMD ["sh", "-c", "cd packages/backend && pnpm exec prisma generate && pnpm exec prisma migrate deploy && node dist/server.js"]
