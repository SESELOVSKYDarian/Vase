FROM node:22-alpine AS builder
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/vase-workplace ./apps/vase-workplace
RUN npm ci --workspace @vase/workplace --include-workspace-root --include=dev --no-audit --no-fund
RUN npm run prisma:generate --workspace @vase/workplace
ENV DATABASE_URL=postgresql://build:build@localhost:5432/vase_workplace
RUN npm run build --workspace @vase/workplace

FROM node:22-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3008
COPY --from=builder /repo/package.json /repo/package-lock.json /repo/tsconfig.base.json ./
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/apps/vase-workplace ./apps/vase-workplace
EXPOSE 3008
CMD ["sh", "-c", "cd apps/vase-workplace && npx prisma migrate deploy && npx next start -H \"${HOSTNAME:-0.0.0.0}\" -p \"${PORT:-3008}\""]
