# Servicio `vase-labs` en EasyPanel

Esta guia agrega un segundo App Service para Labs sin separar el repo ni la base de datos.

## Que resuelve

- mismo repo de GitHub
- mismo `Dockerfile` raiz
- mismo MySQL Service
- mismo set base de secretos
- dominio separado para Labs, por ejemplo `labs.vase.ar`

## Que no resuelve

- split real del monolito
- repo independiente para Labs
- sesion compartida entre subdominios en el navegador

La app sigue siendo la misma. Este cambio separa el servicio en EasyPanel y evita que `labs.vase.ar` se reescriba como storefront.

## Prerrequisitos

1. Tener aplicada la guia base [`easypanel.md`](./easypanel.md) para el servicio principal.
2. Tener el MySQL Service `mysql` corriendo.
3. Tener el subdominio `labs.vase.ar` apuntado a EasyPanel.

## Paso 1 - Crear el App Service

1. En EasyPanel: **Services -> + Create -> App**
2. Usa la misma fuente que `vase`:
   - **Source**: mismo repositorio
   - **Branch**: `main`
3. En **Build**:
   - **Build Type**: `Dockerfile`
   - **Dockerfile Path**: `Dockerfile`
4. Nombre sugerido del servicio: `vase-labs`
5. En **Ports**:
   - **Port**: `3000`
   - **Protocol**: `HTTP`

## Paso 2 - Build Arguments

Usa los mismos secrets de build que el servicio principal, pero con URL propia:

```env
NEXT_PUBLIC_APP_URL=https://labs.vase.ar
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=EL_MISMO_VALOR_QUE_EN_VASE
NEXT_DEPLOYMENT_ID=vase-labs-prod-001
```

Notas:

- `NEXT_PUBLIC_APP_URL` define la URL canonica y ahora tambien ayuda a que el middleware reconozca `labs.vase.ar` como host interno.
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` debe ser exactamente igual al del servicio `vase`.
- `NEXT_DEPLOYMENT_ID` debe ser distinto por deploy y por servicio.

## Paso 3 - Variables de entorno

Parte de `.env.easypanel.example` y repite los valores compartidos.

### Mantener iguales que en `vase`

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
- `MONITORING_TOKEN`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`
- `AUTH_FROM_EMAIL`
- `UPLOADS_BASE_URL`
- `UPLOADS_JWT_SECRET`

### Cambiar para `vase-labs`

```env
NEXT_PUBLIC_APP_URL=https://labs.vase.ar
TRUSTED_ORIGINS=https://labs.vase.ar,https://vase.ar
NEXT_DEPLOYMENT_ID=vase-labs-prod-001
```

### Recomendado dejar vacio en el servicio secundario

- `MASTER_ADMIN_PASSWORD`
- `TEST_ACCOUNT_PASSWORD`

Esos bootstrap scripts son idempotentes, pero normalmente alcanza con correrlos en el servicio principal.

## Paso 4 - Dominio

Asocia `labs.vase.ar` al servicio `vase-labs` desde EasyPanel y espera a que el SSL quede activo.

## Paso 5 - Verificacion

1. Abre `https://labs.vase.ar/api/health/live`
2. Abre `https://labs.vase.ar/api/health/ready`
3. Entra a `https://labs.vase.ar/signin`
4. Verifica que `https://labs.vase.ar/app/labs` cargue normal

## Notas operativas

- `vase` y `vase-labs` siguen compartiendo base y codigo.
- Las rutas de Business siguen existiendo en `vase-labs`; este cambio no las elimina.
- Si despues queres separar Labs del GitHub de Vase, primero hay que extraer una app o paquete dedicado.
