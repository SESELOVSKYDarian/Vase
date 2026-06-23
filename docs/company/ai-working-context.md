# Vase - Guia Para IA Colaboradora

## Objetivo

Este documento ayuda a cualquier IA a trabajar mejor en Vase sin perder contexto entre sesiones.

## Antes De Responder O Implementar

Leer:

1. `PROJECT_CONTEXT.md`
2. `docs/company/product-and-company.md`
3. `docs/company/brand-and-design.md`
4. Documento especifico del area, si existe

## Preguntas Que La IA Debe Responder Internamente

- A que app pertenece este cambio?
- Es producto, plataforma, admin, help, IA, workplace o marketing?
- Requiere contrato compartido?
- Requiere DB propia de esa app?
- Rompe separacion entre servicios?
- Requiere update de docs?
- Requiere test?
- Afecta EasyPanel?

## Reglas Tecnicas

- No reintroducir monolito.
- No crear `src/` raiz.
- No crear `prisma/` raiz.
- No usar `legacy/`.
- No importar codigo entre apps con rutas relativas.
- Compartir solo mediante `packages/*`.
- Mantener cada app deployable por separado.
- Mantener PostgreSQL por app.

## Reglas De Producto

- `vase-app` decide identidad, tenants, billing y entitlements.
- `vase-admin` gobierna, no cobra.
- `vase-help` es fuente oficial de conocimiento.
- `vase-business` opera ecommerce.
- `vase-management` opera ERP.
- `vase-labs` opera IA.
- `vase-workplace` opera trabajo interno.
- `vase-portal` capta y explica.

## Reglas De Diseno

- No usar UI generica.
- No abusar de violeta.
- No abusar de gradientes.
- Priorizar claridad y jerarquia.
- Mantener tono premium, calmo y humano.
- Respetar colores de marca.
- Pensar mobile y desktop.

## Verificacion Minima

```bash
npm run test:v3
npm run typecheck
npm run build
npm run lint
```

Para cambios Prisma:

```bash
npx prisma validate --schema apps/<app>/prisma/schema.prisma
```

## Cuando Actualizar Docs

Actualizar docs si:

- cambia arquitectura
- cambia responsabilidad de una app
- cambia diseño/marca
- cambia deploy
- cambia seguridad
- cambia flujo de producto
- se agrega un producto o modulo nuevo
