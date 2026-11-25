# Deploy Por App Con Worktree O Checkout Parcial

## Objetivo

Este repo esta organizado como monorepo V3, pero cada servicio vive en una carpeta independiente:

```text
apps/vase-portal
apps/vase-app
apps/vase-admin
apps/vase-help
apps/vase-business
apps/vase-management
apps/vase-labs
apps/vase-workplace
```

Cada app tiene su propio `Dockerfile`, `.env.example`, `prisma/schema.prisma`, health routes y scripts.

Los paquetes compartidos viven en:

```text
packages/contracts
packages/config
packages/auth
packages/ui
packages/internal-api
```

## Regla Importante

Una app necesita su carpeta y los paquetes `packages/*`.

No necesita:

- codigo de otras apps en runtime
- `src/` raiz
- `prisma/` raiz
- `legacy/`
- `docker/` raiz

Esas carpetas ya no existen como fuente V3.

## Opcion Recomendada En EasyPanel

Usar el repo completo como source, pero configurar cada servicio con su Dockerfile especifico:

| Servicio EasyPanel | Dockerfile |
| --- | --- |
| `vase-portal-app` | `apps/vase-portal/Dockerfile` |
| `vase-app-app` | `apps/vase-app/Dockerfile` |
| `vase-admin-app` | `apps/vase-admin/Dockerfile` |
| `vase-help-app` | `apps/vase-help/Dockerfile` |
| `vase-business-app` | `apps/vase-business/Dockerfile` |
| `vase-management-app` | `apps/vase-management/Dockerfile` |
| `vase-labs-app` | `apps/vase-labs/Dockerfile` |
| `vase-workplace-app` | `apps/vase-workplace/Dockerfile` |

Los Dockerfiles copian solo:

```text
package.json
package-lock.json
packages/
apps/<app>/
```

Entonces aunque EasyPanel clone el repo completo, la imagen de cada servicio se construye con la app correspondiente y los paquetes compartidos.

## Opcion Con Sparse Checkout

Si queres que el checkout local o el source enviado a EasyPanel tenga solo una app y paquetes compartidos:

```bash
git clone --filter=blob:none --no-checkout <repo-url> vase-app-deploy
cd vase-app-deploy
git sparse-checkout init --cone
git sparse-checkout set package.json package-lock.json apps/vase-app packages
git checkout Vase-Test-Repos
```

Para Business:

```bash
git sparse-checkout set package.json package-lock.json apps/vase-business packages
```

Para Labs:

```bash
git sparse-checkout set package.json package-lock.json apps/vase-labs packages
```

La idea es siempre incluir:

- `package.json`
- `package-lock.json`
- `packages/`
- `apps/<app>/`

## Opcion Con Git Worktree

Un worktree sirve para tener una copia separada de la misma rama sin duplicar el repo completo internamente:

```bash
git worktree add ../vase-app-worktree Vase-Test-Repos
cd ../vase-app-worktree
```

Despues podes usar sparse checkout dentro de ese worktree si queres ver solo una app:

```bash
git sparse-checkout init --cone
git sparse-checkout set package.json package-lock.json apps/vase-app packages
```

Para volver a ver todo:

```bash
git sparse-checkout disable
```

## Build Local Por App

```bash
npm install
npm run build --workspace @vase/app
```

Otros workspaces:

```bash
npm run build --workspace @vase/portal
npm run build --workspace @vase/admin
npm run build --workspace @vase/help
npm run build --workspace @vase/business
npm run build --workspace @vase/management
npm run build --workspace @vase/labs
npm run build --workspace @vase/workplace
```

## Variables Por Servicio

Cada app usa su propio `.env.example`.

Ejemplo para `vase-app`:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres-app:5432/vase_app
SERVICE_TO_SERVICE_TOKEN=change-me
REDIS_URL=redis://redis-platform:6379
NEXT_PUBLIC_APP_URL=https://app.vase.ar
```

Cada app debe apuntar a su propia DB PostgreSQL.

## Que No Hay Que Hacer

No configurar un servicio EasyPanel apuntando a un Dockerfile raiz. Ya no existe.

No crear una DB compartida para todas las apps.

No importar codigo desde otra app con rutas relativas.

No recuperar `src/`, `prisma/` raiz o `legacy/` como dependencia activa.

## Verificacion

Antes de deploy:

```bash
npm run test:v3
npm run typecheck
npm run build
npm run lint
```

Validar schema de la app:

```bash
npx prisma validate --schema apps/vase-app/prisma/schema.prisma
```

Cambiar `vase-app` por la app que corresponda.
