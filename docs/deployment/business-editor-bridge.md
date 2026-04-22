# Bridge de acceso a `editor.vase.ar`

Esta guia cubre solo el acceso compartido entre `vase-app` y `vase-business`.

## Objetivo

Usar el mismo usuario autenticado en `vase-app` para entrar al editor de Business sin crear otra cuenta manual dentro de `vase-business`.

## Variables necesarias en `vase-app`

```env
VASE_BUSINESS_SSO_SECRET=vase091218
VASE_BUSINESS_SSO_ISSUER=vase-app
VASE_BUSINESS_SSO_AUDIENCE=vase-business
BUSINESS_EDITOR_URL=https://editor.vase.ar/admin/evolution
```

Notas:

- `VASE_BUSINESS_SSO_SECRET` debe ser exactamente igual al configurado en `vase-business`. Valor definido: `vase091218`.
- `BUSINESS_EDITOR_URL` se puede omitir si en produccion siempre vas a usar `https://editor.vase.ar/admin/evolution`.

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
5. redirige a `editor.vase.ar` con `vase_token`

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
5. confirma redirect a `https://editor.vase.ar/admin/evolution?vase_token=...`
6. confirma que el editor termina logueado y operativo
