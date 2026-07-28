FROM node:22-alpine AS builder
WORKDIR /repo

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/vase-rest ./apps/vase-rest

RUN npm ci --workspace @vase/rest --include-workspace-root --include=dev --no-audit --no-fund
RUN npm run prisma:generate --workspace @vase/rest

ENV DATABASE_URL=postgresql://build:build@localhost:5432/vase_rest
RUN npm run build --workspace @vase/rest

FROM node:22-alpine AS runner
WORKDIR /repo

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3009

COPY --from=builder /repo/package.json /repo/package-lock.json /repo/tsconfig.base.json ./
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/apps/vase-rest ./apps/vase-rest

EXPOSE 3009
CMD ["sh", "-c", "node apps/vase-rest/scripts/validate-runtime-env.js && cd apps/vase-rest && npx prisma migrate deploy && npx next start -H \"${HOSTNAME:-0.0.0.0}\" -p \"${PORT:-3009}\""]
