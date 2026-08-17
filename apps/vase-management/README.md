# Vase Management

Aplicación de gestión empresarial de Vase para ventas, compras, stock,
facturación, tesorería, reportes y depósitos.

## Autenticación central

Vase App es la autoridad de identidad. Management no presenta un formulario de
credenciales propio: el usuario inicia sesión en Vase App y entra desde el
proyecto Management o abre una URL de Management con la cookie compartida.

En cada request autenticado, Management valida la sesión central, consulta a
Vase App la membresía y el rol vigentes, y mantiene una proyección local
idempotente del usuario, la empresa y el rol. Esa proyección no guarda
contraseña y no convierte la base de Management en autoridad de identidad.

Las aplicaciones conservan bases separadas:

- Vase App mantiene usuarios globales, tenants, membresías y accesos a apps.
- Vase Management mantiene su base PostgreSQL propia con los datos operativos
  y la proyección local necesaria para sus relaciones internas.

## Variables de entorno

Copiar `.env.example` a `.env.local` para desarrollo. En EasyPanel, cargar las
variables como configuración de runtime.

| Variable | Responsabilidad |
| --- | --- |
| `DATABASE_URL` | PostgreSQL exclusivo de Vase Management. |
| `AUTH_SECRET` | Decodifica la cookie central; debe coincidir exactamente con Vase App. |
| `SERVICE_TO_SERVICE_TOKEN` | Autoriza llamadas internas a Vase App; debe coincidir exactamente con Vase App. |
| `APP_INTERNAL_URL` | URL interna alcanzable de Vase App, por ejemplo `http://vase-app:3002` en EasyPanel. |
| `VASE_APP_PUBLIC_URL` | URL pública server-side usada para login y redirecciones. |
| `NEXT_PUBLIC_VASE_APP_URL` | URL pública incorporada al cliente para acciones como logout. |
| `NEXT_PUBLIC_APP_URL` | URL pública canónica de Management. |

En Vase App, producción además requiere `AUTH_COOKIE_DOMAIN=.vase.ar` y
`MANAGEMENT_PUBLIC_URL=https://management.vase.ar`.

Generar `AUTH_SECRET` y `SERVICE_TO_SERVICE_TOKEN` por separado, fuera del
repositorio, ejecutando una vez por cada secreto:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copiar el valor generado para cada variable en los dos servicios. No imprimir
ni guardar esos valores en el Dockerfile, el repositorio o logs de build.

### Desarrollo local

Para un entorno completamente local, sobrescribir en `.env.local`:

```env
APP_INTERNAL_URL=http://localhost:3002
VASE_APP_PUBLIC_URL=http://localhost:3002
NEXT_PUBLIC_VASE_APP_URL=http://localhost:3002
NEXT_PUBLIC_APP_URL=http://localhost:3006
```

En Vase App, dejar `AUTH_COOKIE_DOMAIN` vacío localmente para usar una cookie
host-only. Ambos procesos todavía deben compartir `AUTH_SECRET` y
`SERVICE_TO_SERVICE_TOKEN`.

## Puesta en marcha

Desde la raíz del monorepo:

```powershell
npm install
npx prisma generate --schema apps/vase-app/prisma/schema.prisma
npx prisma generate --schema apps/vase-management/prisma/schema.prisma
npm run dev:v3:app
```

En otra terminal:

```powershell
npm run dev --workspace vase-business
```

- Vase App: `http://localhost:3002/signin`
- Vase Management: `http://localhost:3006/dashboard`

No se crean credenciales locales de Management. El usuario y su tenant deben
existir en Vase App y tener acceso activo a `vase_management`.

## Scripts de Management

Ejecutar desde `apps/vase-management` o mediante
`npm run <script> --workspace vase-business`:

```text
dev          Next.js en el puerto 3006
build        build de producción
start        servidor de producción
db:generate  genera Prisma Client
db:push      sincroniza el esquema en desarrollo
db:migrate   crea migraciones de desarrollo
db:studio    abre Prisma Studio
```

## Despliegue

1. Configurar las variables runtime en Vase App y Management.
2. Construir y desplegar Vase App.
3. Confirmar que la cookie `__Secure-authjs.session-token` usa `.vase.ar`.
4. Construir y desplegar Management con las URLs públicas correctas.
5. Abrir `/dashboard` en el navegador ya autenticado y verificar el tenant.
6. Probar revocación de acceso y logout central antes de retirar el SSO legado.

Los secretos centrales (`AUTH_SECRET` y `SERVICE_TO_SERVICE_TOKEN`) son
runtime-only. El Dockerfile sólo agrega como nuevos argumentos las URLs
públicas que Next.js necesita durante el build.
