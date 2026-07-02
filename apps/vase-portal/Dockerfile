FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/vase-portal/package.json ./apps/vase-portal/package.json
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /repo

ARG NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=https://vase.ar
ARG NEXT_PUBLIC_APP_URL=https://app.vase.ar

ENV NODE_ENV=production
ENV NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=$NEXT_PUBLIC_PUBLIC_SITE_ORIGIN
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/vase-portal ./apps/vase-portal

RUN npm run build --workspace @vase/portal

FROM node:22-alpine AS runner
WORKDIR /repo

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/package-lock.json ./package-lock.json
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/apps/vase-portal ./apps/vase-portal

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@vase/portal"]
