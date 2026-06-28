FROM node:20-alpine AS web-build

ARG VITE_API_URL=
ARG VITE_TENANT_ID=
ARG VITE_EDITOR_HOST=editor.vase.ar
ARG VITE_EXTERNAL_AUTH=true
ARG VITE_VASE_APP_URL=https://vase.ar
ARG VITE_VASE_APP_LAUNCH_URL=https://vase.ar/app/business/launch
ARG VITE_VASE_APP_LOGIN_URL=https://vase.ar/signin
ARG VITE_VASE_APP_SIGNUP_URL=https://vase.ar/register

WORKDIR /app/web
COPY apps/vase-editor/web/package*.json ./
RUN npm ci
COPY apps/vase-editor/web/ ./

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
COPY apps/vase-editor/server/package*.json ./
RUN npm ci --omit=dev
COPY apps/vase-editor/server/ ./
COPY apps/vase-editor/db/ /app/db/
COPY --from=web-build /app/web/dist /app/web/dist

EXPOSE 3000

CMD ["node", "src/index.js"]
