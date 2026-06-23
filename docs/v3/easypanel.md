# EasyPanel V3

Cada producto de Vase se despliega como App Service independiente usando el `Dockerfile` de su carpeta:

| Servicio | Dockerfile | Dominio | Base |
| --- | --- | --- | --- |
| `vase-portal-app` | `apps/vase-portal/Dockerfile` | `vase.ar` | `postgres-portal` |
| `vase-app-app` | `apps/vase-app/Dockerfile` | `app.vase.ar` | `postgres-app` |
| `vase-admin-app` | `apps/vase-admin/Dockerfile` | `admin.vase.ar` | `postgres-admin` |
| `vase-help-app` | `apps/vase-help/Dockerfile` | `help.vase.ar` | `postgres-help` |
| `vase-business-app` | `apps/vase-business/Dockerfile` | `business.vase.ar` | `postgres-business` |
| `vase-management-app` | `apps/vase-management/Dockerfile` | `management.vase.ar` | `postgres-management` |
| `vase-labs-app` | `apps/vase-labs/Dockerfile` | `labs.vase.ar` | `postgres-labs` |
| `vase-workplace-app` | `apps/vase-workplace/Dockerfile` | `workplace.vase.ar` | `postgres-workplace` |

Crear tambien un Redis compartido:

```env
REDIS_URL=redis://redis-platform:6379
```

Variables compartidas por todas las apps:

```env
AUTH_SECRET=CHANGE_ME_BASE64_32
AUTH_COOKIE_DOMAIN=.vase.ar
SERVICE_TO_SERVICE_TOKEN=CHANGE_ME_BASE64_32
SESSION_ISSUER=app.vase.ar
SESSION_AUDIENCE=vase-platform
TRUSTED_ORIGINS=https://vase.ar,https://app.vase.ar,https://admin.vase.ar,https://help.vase.ar,https://business.vase.ar,https://management.vase.ar,https://labs.vase.ar,https://workplace.vase.ar
```

Cada app usa su propio `DATABASE_URL` PostgreSQL documentado en `apps/*/.env.example`.
