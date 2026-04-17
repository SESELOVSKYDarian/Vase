# =============================================================
# Dockerfile para EasyPanel — 1 App Service + 1 MySQL Service
# Next.js standalone output + Prisma migrations al inicio
#
# EasyPanel gestiona reverse proxy, dominio y SSL — no hay Caddy.
# =============================================================

# ── Stage 1: Dependencias ──────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build ─────────────────────────────────────────────────────────
# NEXT_PUBLIC_APP_URL se "hornea" en el bundle del cliente en build time.
# Configuralo como Build Argument en EasyPanel (ej: https://tu-dominio.com).
FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Genera el Prisma Client antes del build de Next.js
RUN npx prisma generate

# Produce .next/standalone gracias a output:"standalone" en next.config.ts
RUN npm run build

# ── Stage 3: Runner — imagen de produccion final ───────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Assets publicos
COPY --from=builder /app/public ./public

# Standalone output de Next.js (server.js + node_modules minimo)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma: migraciones + cliente generado + CLI (necesario para migrate deploy)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma  ./node_modules/prisma

EXPOSE 3000

# 1. Aplica migraciones pendientes de Prisma (idempotente — seguro en cada deploy)
# 2. Arranca Next.js via server.js del standalone (escucha en 0.0.0.0:3000)
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
