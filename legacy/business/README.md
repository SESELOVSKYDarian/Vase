# Proyecto Teflon - MVP Full-Stack E-commerce

Guía rápida y detallada para que Dario pueda levantar **frontend + backend + DB**.

## Estructura
- `server/`: API Node.js + Express + PostgreSQL.
- `web/`: Frontend React + Vite + Tailwind CSS.
- `db/`: Esquema y seeds de la base de datos.

## Requisitos
- Node.js 18+ (recomendado 20+)
- PostgreSQL 15+ (o Docker)
- npm

## Opción A: Docker (recomendado)
1. Clonar el repo.
2. Ejecutar:
   - `docker-compose up --build`
3. URLs:
   - Frontend: `http://localhost:5173`
   - API: `http://localhost:4000`
4. Importante:
   - El `docker-compose.yml` actual usa `VITE_API_BASE_URL`, pero el frontend espera `VITE_API_URL`.
   - Si usás Docker, asegurate de setear `VITE_API_URL` (ver sección de variables).

## Opción B: Local (sin Docker)

### 1) Base de datos
Crear una DB y ejecutar schema + seed:

```bash
psql -U user -d teflon -f db/schema.sql
psql -U user -d teflon -f db/seed.sql
```

### 2) Backend
```bash
cd server
npm install
copy .env.example .env
npm run dev
```

### 3) Frontend
```bash
cd web
npm install
copy .env.example .env
npm run dev
```

## Variables de entorno

### `server/.env`
```env
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/teflon
JWT_SECRET=tu-secret
BOOTSTRAP_TOKEN=tu-bootstrap
DISABLE_AUTH=false

# Mercado Pago (opcional)
MP_ACCESS_TOKEN=
MP_WEBHOOK_URL=
MP_SUCCESS_URL=http://localhost:5173/order-success?status=success
MP_FAILURE_URL=http://localhost:5173/order-success?status=failure
MP_PENDING_URL=http://localhost:5173/order-success?status=pending
```

### `web/.env`
```env
VITE_API_URL=http://localhost:4000
VITE_TENANT_ID=REEMPLAZAR_POR_ID_DE_TENANT
```

Para obtener `VITE_TENANT_ID`:
```sql
select id from tenants;
```

## Usuario admin seed
Se crea automáticamente:
- Email: `admin@teflon.local`
- Password: `admin123`

## Cómo entrar al admin
1. Abrir `http://localhost:5173`
2. Loguearse con el usuario admin.
3. Ir a `http://localhost:5173/admin`

## Funciones principales
- Login/registro con roles (retail / wholesale / admin).
- Catálogo con precio dinámico según rol.
- Checkout con WhatsApp o Transferencia.
- Panel admin para editar:
  - Secciones (home/about)
  - Productos y categorías
  - Ajustes de precios (porcentaje minorista/mayorista + ofertas)

## Ajustes de precios (admin)
En el panel admin existe la sección **Precios**:
- % para minorista
- % para mayorista
- Ofertas globales (porcentaje + scope)

## Endpoints clave
- `POST /auth/login`
- `POST /auth/signup`
- `GET /api/me`
- `GET /public/products`
- `POST /checkout/validate`
- `POST /api/orders/submit`
- `GET /api/admin/orders`
- `GET /api/settings/checkout`
- `PUT /api/admin/settings/checkout`
- `GET /tenant/price-lists`
- `GET /tenant/users`
- `PATCH /tenant/users/:id`
- `PUT /tenant/users/:id/price-list`

## Scripts útiles (root)
```bash
npm run install-all
npm run dev
```

## Migraciones rápidas (si falla login)
Si la DB ya existía, necesitás agregar columnas nuevas:

```sql
ALTER TABLE user_tenants
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checkout_mode text NOT NULL DEFAULT 'online';
```

## Migración ETAPA 1 (listas de precios)
Si aparece `no existe la relación "price_lists"` o `user_price_list`, ejecutá:

```bash
psql -U user -d teflon -f db/migrations/20260223_pricing_lists.sql
```

## Problemas comunes
- **Pantalla en blanco / Unexpected token '<'**  
  Casi siempre es por deps faltantes en `web/`. Ejecutar `npm install` en `web`.

- **Login 500**  
  La DB no tiene las columnas nuevas (ver migraciones arriba).

## Notas
- Este proyecto es multi-tenant. Siempre setear `VITE_TENANT_ID` para que el frontend encuentre los datos.
- Si `DISABLE_AUTH=true`, las rutas `/tenant` y `/admin` quedan sin token.
- Frontend usa `VITE_API_URL` como base de API (ver `web/.env.example`).

## Etapa 1 (MVP) completada
- Checkout funcional con modos:
  - WhatsApp (`submitted`, abre `wa.me` con detalle de items, SKU, qty, precio y total).
  - Transferencia (`pending_payment`, muestra CBU/Alias/Banco/Titular).
  - Placeholder de pago online (solo visual, sin implementar gateway).
- Roles y visibilidad de precios:
  - Visitante y retail: precio minorista.
  - Mayorista pendiente: sigue viendo minorista + aviso de aprobacion pendiente.
  - Mayorista activo: precio mayorista y/o lista de precios asignada.
- Listas de precios por usuario:
  - Asignacion automatica por segmento (`retail` / `wholesale`).
  - Asignacion manual desde admin por usuario.
- Admin de usuarios (tab `Usuarios`):
  - Aprobar mayoristas.
  - Cambiar rol y estado.
  - Asignar lista de precios y guardar cambios.
