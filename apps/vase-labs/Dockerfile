FROM node:22-alpine AS runner
WORKDIR /repo
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/vase-labs ./apps/vase-labs
RUN npm install
RUN npm run prisma:generate --workspace @vase/labs
RUN npm run build --workspace @vase/labs

ARG HOSTNAME=0.0.0.0
ARG PORT=3000

ENV NODE_ENV=production
ENV HOSTNAME=$HOSTNAME
ENV PORT=$PORT

EXPOSE 3000
CMD ["sh", "-c", "cd apps/vase-labs && npx next start -H \"${HOSTNAME:-0.0.0.0}\" -p \"${PORT:-3000}\""]
