# Probar Vase en tu computadora

Todo corre en tu compu con bases de datos propias. **No toca producción**: ni la base real, ni los mails a clientes, ni Mercado Pago.

## La primera vez

1. Instalá **Docker Desktop**: https://www.docker.com/products/docker-desktop/ y abrilo (tiene que quedar corriendo).
2. En la carpeta del proyecto:

```powershell
npm install
```

```powershell
npm run local:setup
```

Esto:
- levanta MySQL, Postgres, Redis y un buzón de mails falso (Mailpit) en Docker;
- escribe los `.env.local` de cada app apuntando a esas bases (claves de prueba generadas solo para tu compu);
- crea las tablas con las mismas migraciones que producción;
- carga un negocio de prueba y una cuenta de administrador.

Las cuentas quedan en `apps/vase-app/.env.local` (`TEST_ACCOUNT_*` y `MASTER_ADMIN_*`).

## Todos los días

```powershell
npm run local:dev
```

| Qué | Dirección |
| --- | --- |
| Vase (app) | http://localhost:3002 |
| Sitio (vase.ar) | http://localhost:3000 |
| Novedades | http://news.localhost:3000 |
| Business (panel) | http://localhost:5173 |
| Labs | http://localhost:3007 |
| Mails que mandan las apps | http://localhost:8025 |

Para arrancar solo algunas: `npm run local:dev -- app labs`. Con Management y Rest: `npm run local:dev -- todo`.

Frenar todo: `Ctrl+C`. Apagar las bases: `npm run local:down`.

## Empezar de cero

Borra las bases locales y las vuelve a crear (no afecta producción):

```powershell
npm run local:reset
```

## Lo que no anda en local

- **WhatsApp / Instagram de Labs**: Meta necesita una dirección pública; para probar canales reales usá el entorno de prueba del servidor.
- **Mercado Pago**: sin claves de prueba cargadas, los pagos no se pueden completar. Si querés probarlos, agregá en `apps/vase-app/.env.local` las claves de **prueba** (empiezan con `TEST-`) de tu cuenta de Mercado Pago.
- **IA (OpenAI)**: sin clave, el asistente no responde. Podés agregar `OPENAI_API_KEY` en `apps/vase-labs/.env.local` si lo necesitás.

## Cómo trabajar sin romper producción

1. Cada cambio en su rama, partiendo de `main`.
2. Lo probás en local (`npm run local:dev`).
3. Si hace falta verlo en el servidor (dominios reales, WhatsApp), lo subís a la rama `staging` y se publica en el entorno de prueba.
4. Cuando anda, se pasa a `main` y se borra la rama del cambio.
5. Producción siempre se publica desde `main`. **Nunca** apuntar un servicio de producción a otra rama.
