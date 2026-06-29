FROM node:20-alpine AS web-build

ARG VITE_API_URL=
ARG VITE_TENANT_ID=
ARG VITE_EDITOR_HOST=business.vase.ar
ARG VITE_EXTERNAL_AUTH=true
ARG VITE_VASE_APP_URL=https://app.vase.ar
ARG VITE_VASE_APP_LAUNCH_URL=https://app.vase.ar/app/business/launch
ARG VITE_VASE_APP_LOGIN_URL=https://app.vase.ar/signin
ARG VITE_VASE_APP_SIGNUP_URL=https://app.vase.ar/register

WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TENANT_ID=$VITE_TENANT_ID
ENV VITE_EDITOR_HOST=$VITE_EDITOR_HOST
ENV VITE_EXTERNAL_AUTH=$VITE_EXTERNAL_AUTH
ENV VITE_VASE_APP_URL=$VITE_VASE_APP_URL
ENV VITE_VASE_APP_LAUNCH_URL=$VITE_VASE_APP_LAUNCH_URL
ENV VITE_VASE_APP_LOGIN_URL=$VITE_VASE_APP_LOGIN_URL
ENV VITE_VASE_APP_SIGNUP_URL=$VITE_VASE_APP_SIGNUP_URL

RUN npm run build

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY db/ /app/db/
COPY --from=web-build /app/web/dist /app/web/dist

EXPOSE 3000

CMD ["node", "src/index.js"]
