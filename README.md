# Vase Platform V3

Vase es una plataforma SaaS modular para digitalizar, gestionar, vender y automatizar negocios.

Este repo esta organizado como monorepo V3: cada producto vive como app independiente en `apps/*`, y el codigo compartido vive en `packages/*`.

## Leer Primero

- `PROJECT_CONTEXT.md`: contexto maestro del proyecto para IA y colaboradores.
- `docs/company/product-and-company.md`: que es Vase, que hace la empresa y que hace cada producto.
- `docs/company/brand-and-design.md`: marca, tono, colores, UI y reglas visuales.
- `docs/company/ai-working-context.md`: reglas para que una IA trabaje correctamente en este repo.
- `docs/v3/easypanel.md`: despliegue por servicio en EasyPanel.
- `docs/v3/worktree-deploy.md`: worktree/sparse checkout para trabajar o desplegar una app puntual.

## Apps

| App | Dominio | Workspace |
| --- | --- | --- |
| `apps/vase-portal` | `vase.ar` | `@vase/portal` |
| `apps/vase-app` | `app.vase.ar` | `@vase/app` |
| `apps/vase-admin` | `admin.vase.ar` | `@vase/admin` |
| `apps/vase-help` | `help.vase.ar` | `@vase/help` |
| `apps/vase-business` | `business.vase.ar` | `@vase/business` |
| `apps/vase-management` | `management.vase.ar` | `@vase/management` |
| `apps/vase-labs` | `labs.vase.ar` | `@vase/labs` |
| `apps/vase-workplace` | `workplace.vase.ar` | `@vase/workplace` |

## Packages

- `packages/contracts`
- `packages/config`
- `packages/auth`
- `packages/ui`
- `packages/internal-api`

## Comandos

```bash
npm run test:v3
npm run typecheck
npm run build
npm run lint
```

Build por app:

```bash
npm run build --workspace @vase/app
npm run build --workspace @vase/business
```

Validar Prisma por app:

```bash
npx prisma validate --schema apps/vase-app/prisma/schema.prisma
```

## Reglas

- No reintroducir monolito.
- No crear `src/` raiz.
- No crear `prisma/` raiz.
- No usar `legacy/`.
- Cada app tiene DB PostgreSQL propia.
- Compartir codigo solo mediante `packages/*`.
- Cada servicio EasyPanel usa el Dockerfile de su app.
