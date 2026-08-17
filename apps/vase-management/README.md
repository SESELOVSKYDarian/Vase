# Vase Management — Gestión empresarial

**Sistema profesional de gestión empresarial para Argentina** con soporte completo para facturación electrónica AFIP, multi-empresa, multi-sucursal y múltiples depósitos.

> ⚠️ **IMPORTANTE**: Este es un sistema en desarrollo con data de ejemplo. Integración con ARCA/WSFE pendiente para producción.

## 📋 Características principales

✅ **Autenticación & Usuarios**
- Login seguro con NextAuth / Auth.js
- Roles y permisos granulares (Super Admin, Admin, Vendedor, Compras, Depósito, Contador)
- Auditoría de acciones por usuario

✅ **Multi-empresa & Multi-sucursal**
- Soporte para múltiples empresas en un solo sistema
- Gestión de sucursales y puntos de venta
- Permisos por empresa y sucursal

✅ **Módulo de Ventas**
- Presupuestos → Pedidos → Remitos → Facturas
- Carrito de compras dinámico
- Cálculo automático de IVA
- Estados de venta completos

✅ **Catálogo de Productos**
- Categorías y marcas
- Código interno y código de barras
- Precios de costo y venta
- Imágenes de productos
- Múltiples unidades de medida

✅ **Gestión de Stock**
- Múltiples depósitos
- Entradas, salidas y ajustes de stock
- Transferencias entre depósitos
- Stock mínimo y alertas de reposición
- Historial completo de movimientos

✅ **Facturación Electrónica AFIP**
- Facturas A, B, C, M y E
- Notas de crédito y débito
- Remitos y recibos
- CAE simulado (integración con ARCA ready)
- Generación de QR
- Numeración automática

✅ **Gestión de Compras**
- Órdenes de compra
- Facturas de proveedores
- Recepción de mercadería
- Control de proveedores
- Histórico de compras

✅ **Tesorería & Flujo de Fondos**
- Caja diaria
- Bancos y transferencias
- Mercado Pago, tarjetas y cheques
- Ingresos y egresos
- Balance de caja

✅ **Contabilidad Básica**
- Libro IVA ventas
- Libro IVA compras
- Plan de cuentas simple
- Exportación para contador

✅ **Reportes & Análisis**
- Dashboard con métricas clave
- Ventas del mes con gráficos
- Top productos y clientes
- Stock crítico
- Cuentas por cobrar y pagar
- Exportación a CSV

✅ **Asistente IA**
- Consultas en lenguaje natural
- Responde sobre ventas, stock, clientes
- Arquitectura preparada para conectar Anthropic/OpenAI
- Mock funcional con datos reales de BD

✅ **Diseño**
- Tema claro y oscuro
- Responsive (desktop, tablet, móvil)
- Sidebar colapsable
- Tablas profesionales con paginación
- Modales para crear/editar
- Toasts de notificación
- Validaciones con Zod

## 🛠️ Stack tecnológico

```
Frontend:          Next.js 14 + React 18 + TypeScript
Estilos:           Tailwind CSS 3 + componentes shadcn/ui
Formularios:       React Hook Form + Zod
Gráficos:          Recharts
Autenticación:     Auth.js (NextAuth v5)
Base de datos:     PostgreSQL + Prisma ORM
APIs:              Route handlers REST + Server Actions
UI Components:     Radix UI + Lucide Icons
Utilidades:        date-fns, clsx, zustand
```

## 📦 Instalación

### Requisitos previos
- Node.js 18+ (recomendado: LTS)
- PostgreSQL 14+
- npm o yarn

### 1. Clonar y configurar

```bash
git clone <repo-url>
cd vase-business
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

**Editar `.env.local`:**
```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/vase_business?schema=public"

# NextAuth / Auth.js
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3006"

# Dejar en blanco para usar mock
AFIP_CERT=""
AFIP_KEY=""
AFIP_CUIT=""
AFIP_ENV="sandbox"
```

Generar `NEXTAUTH_SECRET`:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String([byte[]] (1..32 | % {Get-Random -Max 256}))
```

### 3. Base de datos

```bash
# Crear esquema y tablas
npm run db:push

# Insertar datos de demo
npm run db:seed

# (Opcional) Abrir Prisma Studio
npm run db:studio
```

### 4. Iniciar desarrollo

```bash
npm run dev
```

Acceder a: **http://localhost:3006**

## 🔐 Credenciales de demo

```
Email:    admin@demo.com
Password: admin123

Email:    vendedor@demo.com
Password: vendedor123

Email:    superadmin@vase.com
Password: admin123
```

## 📁 Estructura del proyecto

```
vase-business/
├── app/
│   ├── auth/login, register, forgot-password
│   ├── dashboard/
│   │   ├── clientes, productos, stock, ventas
│   │   ├── compras, facturacion, tesoreria
│   │   ├── contabilidad, reportes, asistente-ia
│   │   └── multiempresa
│   ├── api/
│   │   ├── auth/, clientes/, productos/
│   │   ├── stock/, ventas/, facturacion/
│   │   ├── compras/, tesoreria/, reportes/
│   │   ├── dashboard/, ia/
│   │   └── ...
│   ├── layout.tsx
│   └── page.tsx (redirect)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── ...
│   ├── ui/
│   │   ├── Toaster.tsx
│   │   └── ...
│   ├── modules/
│   │   ├── clientes/
│   │   ├── productos/
│   │   ├── stock/
│   │   ├── ventas/
│   │   ├── facturacion/
│   │   ├── compras/
│   │   ├── tesoreria/
│   │   ├── reportes/
│   │   ├── ia/
│   │   └── dashboard/
│   └── ...
├── lib/
│   ├── auth.ts        (configuración Auth.js)
│   ├── prisma.ts      (singleton Prisma)
│   └── ...
├── prisma/
│   ├── schema.prisma  (modelo de datos)
│   └── seed.ts        (datos de ejemplo)
├── styles/
│   └── globals.css
├── types/
│   ├── index.ts
│   └── next-auth.d.ts (tipos extendidos)
├── utils/
│   └── index.ts       (funciones de utilidad)
├── middleware.ts      (protección de rutas)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 🔄 Flujos principales

### Venta completa
1. Crear venta (Presupuesto/Pedido)
2. Agregar productos al carrito
3. Confirmar venta
4. Generar factura electrónica
5. Registro automático en libros IVA
6. Actualización de stock

### Compra de mercadería
1. Crear orden de compra
2. Agregar productos
3. Registrar recepción
4. Stock se actualiza automáticamente
5. Costo de productos se actualiza

### Facturación AFIP
1. Crear factura A, B o C
2. Enviar a ARCA/WSFE (hoy es mock)
3. Obtener CAE
4. Generar QR
5. Disponible para descargar/imprimir

## 🔌 Integración AFIP/ARCA

### Ubicación del mock
Archivo: `app/api/facturacion/route.ts`

Función: `mockAFIPAuthorize()`

### Pasos para producción
1. Obtener certificado digital AFIP
2. Descargar WSFE (Web Service Factura Electrónica)
3. Reemplazar `mockAFIPAuthorize()` con llamadas reales
4. Cambiar `AFIP_ENV` a `production`
5. Completar variables: `AFIP_CERT`, `AFIP_KEY`, `AFIP_CUIT`

### Recursos AFIP
- https://www.afip.gob.ar/fe/
- https://serviciosweb.afip.gob.ar/

## 📊 Modelos Prisma

**Principales:**
- `User` — Usuarios del sistema
- `Company` — Empresas
- `Branch` — Sucursales
- `Customer` — Clientes
- `Supplier` — Proveedores
- `Product` — Productos
- `Warehouse` — Depósitos
- `Sale` — Ventas
- `Invoice` — Facturas
- `Purchase` — Compras
- `StockMovement` — Movimientos de stock
- `CashMovement` — Movimientos de caja
- `AuditLog` — Auditoría

Ver: `prisma/schema.prisma`

## 🚀 Deployment

### Vercel (recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Configurar variables de entorno en Vercel dashboard.

### Otros providers
1. Build: `npm run build`
2. Start: `npm run start`
3. Instancia Node.js 18+
4. Base de datos PostgreSQL
5. Variables de entorno

## 📝 Scripts disponibles

```bash
# Desarrollo
npm run dev              # Iniciar servidor dev en :3000

# Base de datos
npm run db:generate    # Generar cliente Prisma
npm run db:push        # Sincronizar schema
npm run db:migrate     # Crear migración
npm run db:seed        # Ejecutar seed
npm run db:studio      # Abrir Prisma Studio
npm run db:reset       # Reset BD + seed (¡PELIGRO!)

# Build
npm run build          # Build para producción
npm run start          # Iniciar servidor prod

# Linting
npm run lint           # ESLint
```

## 🧪 Testing

### Crear usuario de prueba

```typescript
// scripts/create-test-user.ts
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

async function main() {
  const user = await prisma.user.create({
    data: {
      email: "test@test.com",
      name: "Test User",
      password: await bcrypt.hash("password123", 12),
    }
  })
  console.log("Usuario creado:", user)
}

main().catch(console.error).finally(() => process.exit())
```

```bash
npx ts-node scripts/create-test-user.ts
```

## 🔍 Troubleshooting

**Error: `relation "users" does not exist`**
```bash
npm run db:push
npm run db:seed
```

**Error: NextAuth no funciona**
- Verificar `NEXTAUTH_SECRET` y `NEXTAUTH_URL`
- Verificar `DATABASE_URL`
- Revisar logs: `npm run dev`

**Error: "no libre on port 3000"**
```bash
# Usar otro puerto
PORT=3001 npm run dev
```

**Datos de demo no aparecen**
```bash
npm run db:reset  # Limpia y recrea todo
```

## 📚 Documentación adicional

- **Next.js**: https://nextjs.org/docs
- **Auth.js**: https://authjs.dev/
- **Prisma**: https://www.prisma.io/docs/
- **Tailwind**: https://tailwindcss.com/docs
- **Zod**: https://zod.dev/
- **Recharts**: https://recharts.org/

## 🤝 Contribuir

Este es un proyecto base. Para mejoras:
1. Fork el repo
2. Crear rama: `git checkout -b feature/mi-feature`
3. Commit: `git commit -m "Agregué X"`
4. Push: `git push origin feature/mi-feature`
5. Pull Request

## 📄 Licencia

MIT — Libre para uso comercial y personal.

## 💬 Soporte

Para reportar issues o sugerencias:
- Crear issue en GitHub
- Email: soporte@vasebusiness.com (cuando esté disponible)

---

**Vase Management** — Gestión clara para empresas argentinas
v1.0.0 — Junio 2026
