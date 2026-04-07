# Vase Testing Strategy

## Objetivo
Construir una piramide de testing realista para una plataforma SaaS multi-tenant con paneles por rol, APIs protegidas y flujos comerciales.

## Capas

### 1. Unit tests
- Motor: Vitest.
- Cobertura: validadores, reglas de negocio, sanitización, guards, helpers de seguridad, pricing, lifecycle.
- Ejecución: `npm run test:unit`.

### 2. Integration tests
- Motor: Vitest.
- Cobertura: route handlers, health checks, guards, flujos que combinan varias capas sin navegador completo.
- Ejecución: `npm run test:integration`.
- Fixtures: `src/tests/fixtures.ts`.

### 3. End-to-end tests
- Motor: Playwright.
- Cobertura inicial:
  - Home pública.
  - API docs pública.
  - Health probes.
  - Futuro: signin, onboarding, owner dashboard, admin dashboard.
- Ejecución: `npm run test:e2e`.

## Ambientes de prueba
- `dev`: feedback rápido con mocks o datos locales.
- `staging`: pruebas cercanas a producción con base aislada y secretos propios.
- `prod`: smoke probes no destructivos y synthetic monitoring.

## Datos y fixtures
- Seed base: `prisma/seed.ts`
- Fixtures demo: `prisma/fixtures/demo.ts`
- Fixtures de tests: `src/tests/fixtures.ts`

## Criterio de salida a producción
- `lint`, `test`, `typecheck`, `build` en verde.
- Migración validada sobre staging.
- Seeds de smoke aplicables.
- E2E mínimos sobre home, docs y health en verde.
- Rollback documentado.
