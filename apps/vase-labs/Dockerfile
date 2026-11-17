FROM node:22-alpine AS runner
WORKDIR /repo
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/vase-labs ./apps/vase-labs
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 600000 \
  && npm ci --workspace @vase/labs --include-workspace-root --include=dev --no-audit --no-fund
RUN npm run prisma:generate --workspace @vase/labs
RUN npm run build --workspace @vase/labs

ARG HOSTNAME=0.0.0.0
ARG PORT=3000

ENV NODE_ENV=production
ENV HOSTNAME=$HOSTNAME
ENV PORT=$PORT

EXPOSE 3000
# NEXT_DEPLOYMENT_ID llega recién al arrancar (no al armar la imagen). Si Next lo ve solo al arrancar,
# pide los archivos de la página con un sufijo que el armado no conoce y la página queda sin responder
# a los clics. Por eso se arranca sin esa variable.
# La migración de presupuestos falló una vez a medias: si sigue marcada como fallida, se desmarca para que
# se vuelva a aplicar (la migración se rehace sola). Si ya está aplicada, el comando no hace nada.
CMD ["sh", "-c", "node apps/vase-labs/scripts/validate-runtime-env.js && node apps/vase-labs/scripts/repair-assistant-secret-migration.js && cd apps/vase-labs && (npx prisma migrate resolve --rolled-back 20261117120000_conversation_quotes >/dev/null 2>&1 || true) && npx prisma migrate deploy &&env -u NEXT_DEPLOYMENT_ID npx next start -H \"${HOSTNAME:-0.0.0.0}\" -p \"${PORT:-3000}\""]
