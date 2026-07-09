FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3006
ENV HOSTNAME=0.0.0.0

# Build-time placeholders keep Next.js static analysis from failing when
# production env validation is imported during `next build`.
ARG DATABASE_URL=postgresql://vase_management:vase_management@localhost:5432/vase_management
ARG NEXTAUTH_SECRET=build-time-placeholder-secret
ARG NEXTAUTH_URL=https://management.vase.ar
ARG NEXT_PUBLIC_APP_URL=https://management.vase.ar
ARG NEXT_PUBLIC_APP_NAME="Vase Management"
ARG AFIP_ENV=sandbox

ENV DATABASE_URL=$DATABASE_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV AFIP_ENV=$AFIP_ENV

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3006

CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-3006}"]
