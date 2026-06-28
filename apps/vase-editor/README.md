# Vase Editor

Vase Editor is the multi-tenant ecommerce editor currently served from
`business.vase.ar`. It contains an Express API and a Vite frontend in one
container.

This source was migrated from `Proyecto-Teflon` commit
`4c54310beffc4efcfba10d6a8ae30d6885b04d3a`. Generated dependencies, frontend
build output, uploads, caches, scratch files, and runtime `.env` files were not
imported.

## Service boundaries

- Business: `business.vase.ar`, port `3000`, this directory.
- Business V3: reserved workspace in `apps/vase-business`; do not deploy it.
- Identity and launcher: `vase.ar`, `apps/vase-app`.

Business V3 must receive another domain and database before it is deployed.

## Local verification

From the repository root:

```powershell
npm ci --prefix apps/vase-editor/server
npm ci --prefix apps/vase-editor/web
npm run build --prefix apps/vase-editor/web
docker build -f apps/vase-editor/Dockerfile -t vase-editor .
```

The running service exposes:

```text
GET /health
```

Expected response:

```json
{"ok":true}
```

## EasyPanel

Use the repository root as Docker build context:

```text
Dockerfile: apps/vase-editor/Dockerfile
Internal port: 3000
Domain: business.vase.ar
```

Copy runtime variables from `.env.example` into EasyPanel. Configure every
`VITE_*` value as a Docker build argument as well as an environment variable,
because Vite embeds these values during the image build.

Back up the existing PostgreSQL service before the first deployment. Do not
commit production credentials or use the Business V3 Prisma schema against the
editor database.
