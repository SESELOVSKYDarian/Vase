# Variables de produccion para Render

Usar estas variables en el backend de Render.

## Email / verificacion

```env
EMAIL_COMPANY_NAME=Sanitarios El Teflon
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=alexisvallejos803@gmail.com
SMTP_FROM=Sanitarios El Teflon <alexisvallejos803@gmail.com>
EMAIL_VERIFICATION_TTL_MINUTES=15
EMAIL_VERIFICATION_MAX_ATTEMPTS=5
```

## Web publica

```env
CORS_ORIGIN=https://proyecto-teflon-web.vercel.app
PUBLIC_ADMIN_URL=https://proyecto-teflon-web.vercel.app/admin
PUBLIC_API_URL=https://proyecto-teflon.onrender.com
INTEGRATIONS_PUBLIC_BASE_URL=https://proyecto-teflon.onrender.com
DISABLE_AUTH=false
```

## Secretos

Estos no deben hardcodearse en el repo. Cargarlos manualmente en Render:

```env
SMTP_PASS=usar_el_mismo_valor_actual_que_ya_tenes_en_server_env_local
JWT_SECRET=rotar_y_cargar_un_valor_nuevo
BOOTSTRAP_TOKEN=rotar_y_cargar_un_valor_nuevo
MP_ACCESS_TOKEN=rotar_y_cargar_un_valor_nuevo_si_sigue_vigente
DATABASE_URL=usar_la_url_productiva_actual
```

## Importante

- `SMTP_PASS` no va en Vercel
- `SMTP_PASS` no debe subirse al repo
- el envio de codigo sale desde Render
- si en Render falta SMTP, el frontend no puede mandar ningun gmail aunque Vercel funcione bien

## Checklist

1. cargar estas variables en Render
2. guardar
3. redeploy del backend
4. crear una cuenta nueva desde Vercel
5. revisar logs de Render si el correo no llega
