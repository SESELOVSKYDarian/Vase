# Cutover de dominios Vase

## Objetivo

Separar los tres límites públicos del producto:

- `vase.ar`: sitio público servido por Vase Portal.
- `app.vase.ar`: autenticación y panel general servido por Vase App.
- `labs.vase.ar`: experiencia exclusiva de Labs servida por Vase App con la
  misma sesión y rutas `/app/owner/labs/...`.

## Configuración de servicios en EasyPanel

### `portal-vase`

| Campo | Valor |
| --- | --- |
| Repositorio | `SESELOVSKYDarian/Vase` |
| Rama | `Vase-Test-Repos` |
| Ruta de compilación | `/` |
| Dockerfile | `apps/vase-portal/Dockerfile` |
| Puerto | `3000` |
| Dominio | `vase.ar` |

Argumentos de build:

```text
NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=https://vase.ar
NEXT_PUBLIC_APP_URL=https://app.vase.ar
```

Variables de runtime:

```text
NODE_ENV=production
HOSTNAME=0.0.0.0
PORT=3000
APP_INTERNAL_URL=http://vase-app-next:3002
SERVICE_TO_SERVICE_TOKEN=<MISMO_TOKEN_ALEATORIO_EN_AMBOS_SERVICIOS>
```

### `vase-app-next`

| Campo | Valor |
| --- | --- |
| Repositorio | `SESELOVSKYDarian/Vase` |
| Rama | `Vase-Test-Repos` |
| Ruta de compilación | `/` |
| Dockerfile | `apps/vase-app/Dockerfile` |
| Puerto | `3002` |
| Dominios | `app.vase.ar`, `labs.vase.ar` |

Argumentos de build:

```text
NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=https://vase.ar
NEXT_PUBLIC_APP_URL=https://app.vase.ar
NEXT_PUBLIC_LABS_URL=https://labs.vase.ar
```

Variables de runtime relevantes:

```text
NODE_ENV=production
HOSTNAME=0.0.0.0
PORT=3002
NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=https://vase.ar
NEXT_PUBLIC_APP_URL=https://app.vase.ar
NEXT_PUBLIC_LABS_URL=https://labs.vase.ar
AUTH_COOKIE_DOMAIN=.vase.ar
TRUSTED_ORIGINS=https://app.vase.ar,https://labs.vase.ar
VASE_PRIMARY_HOST=app.vase.ar
VASE_LABS_HOST=labs.vase.ar
SERVICE_TO_SERVICE_TOKEN=<MISMO_TOKEN_ALEATORIO_EN_AMBOS_SERVICIOS>
```

Conservar además las variables existentes de base de datos, Auth.js, cifrado,
correo, almacenamiento y bootstrap. El token entre servicios debe ser largo,
aleatorio, secreto e idéntico en Portal y App. No reutilizar el texto de
ejemplo de este documento.

## Orden de despliegue

1. Guardar una captura de la asignación actual de `vase.ar` y del servicio
   anterior para facilitar rollback.
2. Desplegar `vase-app-next` sin cambiar sus dominios actuales.
3. Confirmar que `app.vase.ar` y `labs.vase.ar` siguen saludables.
4. Desplegar `portal-vase` primero con un dominio temporal, por ejemplo
   `portal-test.vase.ar`.
5. Ejecutar los smoke tests temporales.
6. Reasignar únicamente `vase.ar` desde el servicio anterior a `portal-vase`.
7. Ejecutar la matriz canónica y las verificaciones manuales.

## Smoke tests antes del cutover

```powershell
curl.exe -sS -I https://portal-test.vase.ar/
curl.exe -sS -I https://app.vase.ar/app
curl.exe -sS -I https://labs.vase.ar/app/owner/labs
curl.exe -sS https://portal-test.vase.ar/api/health/live
curl.exe -sS https://app.vase.ar/api/health/ready
```

Resultados aceptables:

- Portal responde `200`.
- App responde `200` con sesión o redirige a
  `https://app.vase.ar/signin?redirectTo=%2Fapp`.
- Labs responde `200` con una sesión autorizada o redirige al login
  centralizado de App.
- Ambos endpoints de health devuelven JSON exitoso.

## Verificación después del cutover

```powershell
curl.exe -sS -I https://vase.ar/
curl.exe -sS -I https://vase.ar/app
curl.exe -sS -I https://app.vase.ar/
curl.exe -sS -I https://app.vase.ar/precios
curl.exe -sS -I https://labs.vase.ar/app/help
curl.exe -sS -I https://labs.vase.ar/api/modules
```

Matriz esperada:

| Solicitud | Resultado |
| --- | --- |
| `vase.ar/` | `200` desde Portal |
| `vase.ar/app` | redirect a `https://app.vase.ar/app` |
| `app.vase.ar/` | redirect a `https://app.vase.ar/app` |
| `app.vase.ar/precios` | redirect a `https://vase.ar/precios` |
| `labs.vase.ar/app/help` | redirect a `https://labs.vase.ar/app/owner/labs` |
| `labs.vase.ar/api/modules` | `404` |

Verificación manual:

1. En App, el logo, `Inicio` y el shortcut Home abren `vase.ar`.
2. En Labs, el logo abre `/app/owner/labs` y no existe
   `Volver al Panel de Vase`.
3. Enviar una consulta controlada desde Portal.
4. Abrir la lista pública de documentación y un documento.
5. Iniciar sesión una vez en App y abrir Labs sin un segundo login.
6. Cerrar sesión y confirmar que App y Labs vuelven a requerir autenticación.
7. Con una cuenta sin Labs, confirmar el redirect a
   `app.vase.ar/app?labs=required` y el aviso de activación.

## Rollback

Si Portal falla después del cambio:

1. Reasignar sólo `vase.ar` al servicio anterior usando la configuración
   guardada antes del cutover.
2. No modificar `app.vase.ar` ni `labs.vase.ar`.
3. Confirmar que el servicio anterior responde en `https://vase.ar/`.
4. Mantener `portal-vase` accesible sólo por el dominio temporal para
   diagnóstico.
5. Corregir, redesplegar y repetir los smoke tests antes de intentar el
   cutover nuevamente.
