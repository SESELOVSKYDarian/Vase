# Bridge de acceso a `business.vase.ar`

Esta guia cubre el acceso compartido entre `vase-app` y `vase-editor`.

## Objetivo

Usar el mismo usuario autenticado en `vase-app` para entrar al editor de
Business sin crear otra cuenta manual dentro de `vase-editor`.

## Variables necesarias en `vase-app`

```env
VASE_BUSINESS_SSO_SECRET=CHANGE_ME_SSO_SECRET
VASE_BUSINESS_SSO_ISSUER=vase-app
VASE_BUSINESS_SSO_AUDIENCE=vase-business
BUSINESS_EDITOR_URL=https://business.vase.ar/admin/evolution
```

Notas:

- `VASE_BUSINESS_SSO_SECRET` debe ser un secreto largo y exactamente igual en
  `vase-app` y `vase-editor`.
- `BUSINESS_EDITOR_URL` se puede omitir si en produccion siempre vas a usar `https://business.vase.ar/admin/evolution`.

## Ruta de lanzamiento

La ruta que emite el token y redirige al editor es:

```text
/app/business/launch
```

Comportamiento:

1. requiere sesion valida
2. resuelve la membership activa del usuario
3. valida que el rol sea `OWNER` o `MANAGER`
4. firma un token corto HS256
5. redirige a `business.vase.ar` con `vase_token`

## Login con callback

`/signin` ahora soporta `redirectTo`.

Ejemplo:

```text
https://vase.ar/signin?redirectTo=/app/business/launch
```

Si el usuario ya tiene sesion, entra directo al launcher.  
Si no tiene sesion, al autenticarse vuelve a `/app/business/launch`.

## Smoke test

1. carga las variables de entorno
2. despliega `vase-app`
3. inicia sesion en `https://vase.ar/signin`
4. abre `https://vase.ar/app/business/launch`
5. confirma redirect a `https://business.vase.ar/admin/evolution?vase_token=...`
6. confirma que el editor termina logueado y operativo
