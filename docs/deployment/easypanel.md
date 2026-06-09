# Despliegue en EasyPanel

Estrategia: **1 App Service** (Next.js, desde el `Dockerfile` raíz) + **1 MySQL Service**.  
EasyPanel gestiona el reverse proxy, SSL y dominio — **no se usa Caddy ni docker-compose** en este modo.

Si además vas a usar `vase-app` para lanzar el editor externo de Business en `editor.vase.ar`, revisa tambien [`business-editor-bridge.md`](business-editor-bridge.md).
Si queres levantar `vase-labs` como un segundo App Service desde este mismo repo, revisa tambien [`easypanel-vase-labs.md`](easypanel-vase-labs.md).

---

## Paso 1 — Crear el MySQL Service

1. En tu proyecto de EasyPanel: **Services → + Create → MySQL**
2. Completá los campos:
   - **Service Name**: `mysql` (este nombre es el hostname interno)
   - **MySQL Version**: `8.4`
   - **Root Password**: generá una contraseña segura y guardala
   - **Database**: `vase`
   - **User**: `vase_user`
   - **Password**: generá otra contraseña segura y guardala
3. Hacé clic en **Create** y esperá que el status sea **Running**

Anotá los datos porque los necesitás para armar la `DATABASE_URL`.

---

## Paso 2 — Construir la DATABASE_URL

```
DATABASE_URL=mysql://vase_user:TU_PASSWORD@mysql:3306/vase
```

- `mysql` → nombre del MySQL Service (Paso 1)
- `vase_user` / `TU_PASSWORD` → usuario y contraseña que configuraste
- `vase` → nombre de la base de datos

**Ejemplo:**
```
DATABASE_URL=mysql://vase_user:S3cur3Pass\!@mysql:3306/vase
```

---

## Paso 3 — Crear el App Service

1. **Services → + Create → App**
2. Configurá la fuente:
   - **Source**: GitHub / GitLab (elegí tu repositorio)
   - **Branch**: `main` (o tu rama de producción)
3. En **Build**:
   - **Build Type**: `Dockerfile`
   - **Dockerfile Path**: `Dockerfile` (ya está en la raíz del repo)
4. En **Build Arguments** — agregá:
   ```
   NEXT_PUBLIC_APP_URL=https://tu-dominio.com
   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=TU_CLAVE_BASE64_32_BYTES
   NEXT_DEPLOYMENT_ID=IDENTIFICADOR_UNICO_DEL_DEPLOY
   ```
   > ⚠️ `NEXT_PUBLIC_APP_URL` se "hornea" en el bundle del cliente en build time.  
   > Debe ir como Build Argument **y también** como variable de entorno en runtime.
   > `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` también debe estar disponible durante `next build`; usá el mismo valor en Build Arguments y Environment.
   > `NEXT_DEPLOYMENT_ID` debe cambiar en cada deploy real y ser igual para todas las réplicas de ese deploy.
5. En **Ports**:
   - **Port**: `3000`
   - **Protocol**: `HTTP`
6. Hacé clic en **Create**

---

## Paso 4 — Variables de entorno

Carga todas las variables en **Service → Environment**.  
Referencia completa en `.env.easypanel.example`.
Si vas a separar Labs en un segundo App Service, usa la misma base y cambia solo las variables por servicio indicadas al final del ejemplo.

### Variables obligatorias

| Variable | Valor | Cómo obtenerla |
|---|---|---|
| `DATABASE_URL` | `mysql://vase_user:PASS@mysql:3306/vase` | Ver Paso 2 |
| `AUTH_SECRET` | cadena aleatoria de 32+ chars | `openssl rand -base64 32` |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | base64 de 32 bytes | usar el mismo valor en Build Arguments y Environment |
| `NEXT_DEPLOYMENT_ID` | identificador del deploy | mismo valor que Build Arguments para ese deploy |
| `NEXT_PUBLIC_APP_URL` | `https://tu-dominio.com` | Tu dominio público |
| `TRUSTED_ORIGINS` | `https://tu-dominio.com` | Tu dominio público |
| `MONITORING_TOKEN` | cadena aleatoria de 32+ chars | `openssl rand -base64 32` |
| `NODE_ENV` | `production` | fijo |
| `PORT` | `3000` | fijo |
| `HOSTNAME` | `0.0.0.0` | fijo |
| `MASTER_ADMIN_PASSWORD` | `define una password fuerte` | crea/actualiza el Master Admin al arrancar |
| `MASTER_ADMIN_EMAIL` | `vasescompany912@gmail.com` | opcional; si no se define usa este email |
| `TEST_ACCOUNT_PASSWORD` | contraseña de prueba | opcional; crea/actualiza una cuenta cliente de prueba al arrancar |
| `TEST_ACCOUNT_EMAIL` | `prueba.piquim@vase.local` | opcional; email de la cuenta cliente de prueba |

### Variables de email (requeridas para auth funcional)

| Variable | Descripción |
|---|---|
| `SMTP_HOST` | Servidor SMTP (ej: `smtp.gmail.com`) |
| `SMTP_PORT` | Puerto (587 para STARTTLS, 465 para TLS) |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña SMTP |
| `SMTP_SECURE` | `false` para STARTTLS, `true` para TLS directo |
| `AUTH_FROM_EMAIL` | Remitente de emails de auth (ej: `noreply@tu-dominio.com`) |

### Variables opcionales

| Variable | Para qué sirve |
|---|---|
| `RESEND_API_KEY` | Formulario de contacto vía Resend |
| `CONTACT_TO_EMAIL` | Destinatario del formulario de contacto |
| `CONTACT_FROM_EMAIL` | Remitente del formulario de contacto |
| `AI_MODEL` | Modelo IA principal (deja vacío para default) |
| `AI_TRANSCRIPTION_MODEL` | Modelo de transcripción |
| `AI_SUMMARY_MODEL` | Modelo de resumen |
| `VASE_API_KEY` | API key interna (página de developers) |
| `UPLOAD_MAX_FILE_SIZE_MB` | Tamaño máx. de uploads (default: `10`) |
| `UPLOAD_SCAN_MODE` | `report_only` o `block` (default: `report_only`) |
| `MALWARE_SCAN_URL` | URL del servicio de escaneo de malware |
| `MALWARE_SCAN_TOKEN` | Token del servicio de escaneo de malware |
| `STORAGE_BUCKET` | Nombre del bucket de storage (default: `vase-private`) |

### Variables para uploads privados

Estas variables conectan `vase.ar` con el servicio `uploads.vase.ar`. `UPLOADS_JWT_SECRET` debe ser exactamente el mismo valor configurado en el servicio `uploads-service`.

| Variable | Valor de produccion |
|---|---|
| `UPLOADS_BASE_URL` | `https://uploads.vase.ar` |
| `UPLOADS_JWT_SECRET` | `usa el mismo secreto real que en uploads-service` |

> 💡 Usá **EasyPanel Secrets** para `DATABASE_URL`, `AUTH_SECRET`, `SMTP_PASS` y cualquier token/key sensible.

---

## Paso 5 — Deploy inicial

1. Guardá las variables de entorno
2. EasyPanel inicia el build automáticamente; podés verlo en **Service → Deployments**
3. El proceso de build tarda varios minutos (instala deps + compila Next.js)
4. Al arrancar el contenedor, se ejecutan automáticamente las migraciones de Prisma (`prisma migrate deploy`)
5. Cuando el status sea **Running**, la app está disponible

### Crear o actualizar el Master Admin

Si `MASTER_ADMIN_PASSWORD` está cargada en Environment, el contenedor crea o actualiza el Master Admin automáticamente en cada arranque, después de sincronizar Prisma.

También podés ejecutarlo manualmente desde la terminal del App Service:

```bash
MASTER_ADMIN_EMAIL='vasescompany912@gmail.com' MASTER_ADMIN_PASSWORD='vase0091218**' npm run bootstrap:master-admin
```

El comando es idempotente: si el usuario ya existe, actualiza nombre, contraseña, rol `SUPER_ADMIN` y marca el email como verificado. Si no existe, lo crea.

### Crear o actualizar una cuenta cliente de prueba

Si `TEST_ACCOUNT_PASSWORD` está cargada en Environment, el contenedor crea o actualiza una cuenta cliente de prueba automáticamente. Por defecto usa:

```env
TEST_ACCOUNT_EMAIL=prueba.piquim@vase.local
TEST_TENANT_SLUG=piquim-prueba
TEST_TENANT_NAME=PIQUIM Prueba
```

También podés ejecutarlo manualmente desde la terminal del App Service:

```bash
TEST_ACCOUNT_EMAIL='prueba.piquim@vase.local' TEST_ACCOUNT_PASSWORD='Piquim#2026!' TEST_TENANT_SLUG='piquim-prueba' TEST_TENANT_NAME='PIQUIM Prueba' npm run bootstrap:test-account
```

La cuenta queda como `USER`, con email verificado, membresía `OWNER` activa y un tenant de prueba activo.

---

## Paso 6 — Verificar salud

```bash
# Servidor respondiendo
curl https://tu-dominio.com/api/health/live
# Respuesta esperada: {"status":"ok"}

# Base de datos conectada
curl https://tu-dominio.com/api/health/ready
# Respuesta esperada: {"status":"ok"}

# Métricas (requiere MONITORING_TOKEN)
curl -H "Authorization: Bearer TU_MONITORING_TOKEN" \
  https://tu-dominio.com/api/ops/metrics
```

Si `/api/health/ready` devuelve error, la `DATABASE_URL` está mal o el MySQL Service no está listo.

---

## Paso 7 — Redeploy

**Automático:** En **Service → Settings → Auto Deploy**, habilitá tu rama para que EasyPanel redeploy en cada push.

**Manual:** **Service → Deployments → Deploy**.

En cada deploy:
1. Se rebuild la imagen Docker desde el `Dockerfile` raíz
2. Al iniciar el nuevo contenedor, `prisma migrate deploy` aplica las migraciones nuevas
3. El contenedor anterior se reemplaza sin downtime (EasyPanel hace rolling restart)

---

## Troubleshooting

### Build falla con error de Next.js
- Revisá los logs en **Service → Deployments → [deploy] → Logs**
- Verificá que `NEXT_PUBLIC_APP_URL` está seteado como Build Argument
- Asegurate que el `Dockerfile` existe en la raíz del repositorio

### El contenedor arranca pero `/api/health/ready` da 500
- La `DATABASE_URL` está mal formada o el MySQL Service no está running
- Verificá la URL: host debe ser el nombre del MySQL Service (ej: `mysql`), no `localhost`

### La base de datos está vacía en el primer deploy (sin tablas)

> ⚠️ **Este proyecto aún no tiene una carpeta `prisma/migrations/`.**  
> `prisma migrate deploy` solo aplica migraciones ya existentes — **no crea el schema desde cero**.

Antes del primer deploy en EasyPanel, tenés dos opciones:

**Opción A — Crear la migración inicial (recomendado para producción):**
```bash
# En tu entorno local con la DB local corriendo:
npx prisma migrate dev --name init
# Esto crea prisma/migrations/. Commitear y pushear.
```

**Opción B — Usar `db push` en el primer arranque (más rápido, sin historial de migraciones):**  
Reemplazá el CMD del Dockerfile temporalmente:
```dockerfile
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push && node server.js"]
```
Luego, para futuros deploys, podés volver a `migrate deploy`.

### Las migraciones fallan al arrancar
- Revisá los logs del contenedor en **Service → Logs**
- Confirmá que la base de datos `vase` existe en el MySQL Service
- Verificá que el usuario tiene permisos de escritura (`GRANT ALL PRIVILEGES ON vase.* TO 'vase_user'@'%'`)

### Emails no se envían
- Configurá `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- Probá la conexión SMTP desde fuera de EasyPanel para descartar bloqueos de firewall

### 403 en `/api/ops/metrics`
- El header debe ser exactamente `Authorization: Bearer TU_MONITORING_TOKEN`
- Verificá que `MONITORING_TOKEN` está cargado como variable de entorno

---

## Notas adicionales

- **SSL/HTTPS**: EasyPanel maneja Let's Encrypt automáticamente
- **Caddy**: no se usa en este modo (es específico del despliegue con `docker-compose`)
- **docker-compose**: sigue siendo el método alternativo para VPS propio (ver `docker-compose.yml`)
- **Backups**: configurá backups automáticos del MySQL Service desde EasyPanel
- **Escalado**: EasyPanel permite múltiples réplicas del App Service si necesitás más capacidad

---

## Documentación relacionada

- Variables de entorno: `.env.easypanel.example`
- Arquitectura: `docs/production/TECHNICAL_ARCHITECTURE.md`
- Operaciones: `docs/production/OPERATIONS_RUNBOOK.md`
- Seguridad: `docs/security/SECURITY_AUDIT.md`
