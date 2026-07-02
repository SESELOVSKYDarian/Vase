FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/vase-app/package.json ./apps/vase-app/package.json
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /repo

ARG NEXT_DEPLOYMENT_ID
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ARG NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=https://vase.ar
ARG NEXT_PUBLIC_APP_URL=https://app.vase.ar
ARG NEXT_PUBLIC_LABS_URL=https://labs.vase.ar

ENV NODE_ENV=production
ENV NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=$NEXT_PUBLIC_PUBLIC_SITE_ORIGIN
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_LABS_URL=$NEXT_PUBLIC_LABS_URL

COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/vase-app ./apps/vase-app

WORKDIR /repo/apps/vase-app
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /repo

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3002

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/package-lock.json ./package-lock.json
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/apps/vase-app ./apps/vase-app

WORKDIR /repo/apps/vase-app
EXPOSE 3000
EXPOSE 3002

CMD ["sh", "scripts/prisma-startup.sh", "sh", "-c", "if [ -n \"$MASTER_ADMIN_PASSWORD\" ]; then npm run bootstrap:master-admin; fi && if [ -n \"$TEST_ACCOUNT_PASSWORD\" ]; then npm run bootstrap:test-account; fi && npx next start -H 0.0.0.0 -p \"${PORT:-3002}\""]
