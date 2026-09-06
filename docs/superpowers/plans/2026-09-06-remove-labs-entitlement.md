# Remove Stale Labs Entitlements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que Super Admin retire el entitlement de Vase Labs de un cliente, especialmente cuentas eliminadas, sin borrar workspace ni auditoría.

**Architecture:** La pantalla de Entitlements mostrará solo relaciones Labs activas y marcará las que ya no tienen usuario titular. Un endpoint `DELETE` protegido por Super Admin ejecutará una transacción que desactiva módulo, submódulos y acceso del dueño, registra auditoría, limpia overrides y sincroniza el estado `SUSPENDED` con `vase-labs`. La interfaz quitará la tarjeta solo después de una respuesta exitosa.

**Tech Stack:** Next.js App Router, React, Prisma/MySQL, Zod, Vitest.

---

## Archivos

- Modify: `packages/contracts/src/index.ts` — incluir el indicador opcional de cuenta sin titular en el control administrativo.
- Modify: `apps/vase-app/src/server/services/labs-admin.ts` — filtrar entitlements activos y agregar retiro transaccional/sincronización.
- Modify: `apps/vase-app/src/app/api/admin/labs/tenants/route.ts` — agregar `DELETE` autenticado.
- Modify: `apps/vase-app/src/components/admin/labs-admin-workspace.tsx` — agregar identificación de cuenta eliminada, confirmación y botón de retiro.
- Test: `apps/vase-app/src/tests/labs-admin-page.test.tsx` — verificar el botón y la identificación de cuenta sin titular.
- Test: `apps/vase-app/src/tests/labs-admin-api.test.ts` — verificar autenticación y payload del retiro.
- Test: `apps/vase-app/src/tests/labs-admin-service.test.ts` — verificar desactivación transaccional y conservación del workspace.

## Task 1: Agregar pruebas rojas

- [ ] **Step 1: Agregar prueba de UI**

Agregar un control con `ownerDeleted: true` en `labs-admin-page.test.tsx` y verificar que el HTML contenga `Cuenta eliminada` y `Quitar entitlement`.

- [ ] **Step 2: Agregar prueba de API**

Mockear `removeLabsAdminTenant`, llamar `DELETE` con `{ globalTenantId: "tenant-1" }`, verificar que use el usuario autenticado y devuelva HTTP 200.

- [ ] **Step 3: Ejecutar pruebas rojas**

```powershell
npx vitest run --config vitest.local.config.ts apps/vase-app/src/tests/labs-admin-page.test.tsx apps/vase-app/src/tests/labs-admin-api.test.ts
```

Expected: FAIL porque el contrato, el botón, la acción y el método `DELETE` todavía no existen.

## Task 2: Implementar retiro seguro

- [ ] **Step 1: Añadir `ownerDeleted` opcional al contrato**

En `labsAdminTenantControlSchema`, agregar `ownerDeleted: z.boolean().optional()`.

- [ ] **Step 2: Filtrar y marcar entitlements activos**

En `listLabsAdminTenants`, consultar solamente tenants con `TenantModule` Labs activo y al menos un `TenantSubmodule` Labs activo. Seleccionar `primaryOwnerUserId` y devolver `ownerDeleted: tenant.primaryOwnerUserId === null`.

- [ ] **Step 3: Implementar `removeLabsAdminTenant`**

Validar `{ globalTenantId }`, resolver el tenant y ejecutar una transacción que:

```ts
await tx.tenantModule.updateMany({
  where: { tenantId: tenant.id, moduleId: "vase_labs" },
  data: { isActive: false, activatedAt: null },
});
await tx.tenantSubmodule.updateMany({
  where: { tenantId: tenant.id, submodule: { moduleId: "vase_labs" } },
  data: { isActive: false, activatedAt: null },
});
if (tenant.primaryOwnerUserId) {
  await tx.userModuleAccess.updateMany({
    where: { userId: tenant.primaryOwnerUserId, moduleId: "vase_labs" },
    data: { isActive: false },
  });
}
await tx.tenantAiWorkspace.updateMany({
  where: { tenantId: tenant.id },
  data: {
    channelLimits: { WHATSAPP: 0, INSTAGRAM: 0, FACEBOOK: 0 },
    channelOverrideReason: null,
    channelOverrideBy: null,
    channelOverrideAt: null,
    labsSyncStatus: "PENDING",
  },
});
await tx.auditLog.create({
  data: {
    tenantId: tenant.id,
    actorUserId,
    action: "LABS_ENTITLEMENT_REMOVED",
    targetType: "TenantAiWorkspace",
    targetId: tenant.aiWorkspace?.id ?? null,
    metadata: { reason: "SUPER_ADMIN_REMOVAL", previousPlan: plan },
  },
});
```

Luego enviar a `vase-labs` el plan conservado, estado `SUSPENDED`, canales vacíos y límites en cero mediante el mismo token interno. Marcar `labsSyncStatus` como `SYNCED` o `FAILED` sin revertir la baja local.

- [ ] **Step 4: Agregar endpoint `DELETE`**

En la ruta API, exigir `requireVerifiedPlatformRole("SUPER_ADMIN")`, leer JSON, llamar `removeLabsAdminTenant(body, session.user.id)` y devolver el resultado usando el mismo manejo de errores.

## Task 3: Implementar interfaz

- [ ] **Step 1: Marcar cuentas eliminadas**

En cada tarjeta, mostrar `Cuenta eliminada` cuando `control.ownerDeleted` sea verdadero.

- [ ] **Step 2: Agregar retiro con confirmación**

Agregar botón `Quitar entitlement` que pida confirmación explícita, haga `DELETE /api/admin/labs/tenants` y quite la tarjeta del estado local solo si la respuesta es exitosa.

- [ ] **Step 3: Mantener edición de overrides**

No cambiar el flujo `Editar Labs`, `Guardar override` ni `Restaurar plan`.

## Task 4: Verificar y entregar

- [ ] **Step 1: Ejecutar pruebas objetivo**

```powershell
npx vitest run --config vitest.local.config.ts apps/vase-app/src/tests/labs-admin-page.test.tsx apps/vase-app/src/tests/labs-admin-api.test.ts apps/vase-app/src/tests/labs-admin-service.test.ts
```

- [ ] **Step 2: Ejecutar lint y diff check**

```powershell
npx eslint packages/contracts/src/index.ts apps/vase-app/src/server/services/labs-admin.ts apps/vase-app/src/app/api/admin/labs/tenants/route.ts apps/vase-app/src/components/admin/labs-admin-workspace.tsx apps/vase-app/src/tests/labs-admin-page.test.tsx apps/vase-app/src/tests/labs-admin-api.test.ts apps/vase-app/src/tests/labs-admin-service.test.ts
git diff --check
```

- [ ] **Step 3: Commit**

```powershell
git add packages/contracts/src/index.ts apps/vase-app/src/server/services/labs-admin.ts apps/vase-app/src/app/api/admin/labs/tenants/route.ts apps/vase-app/src/components/admin/labs-admin-workspace.tsx apps/vase-app/src/tests/labs-admin-page.test.tsx apps/vase-app/src/tests/labs-admin-api.test.ts apps/vase-app/src/tests/labs-admin-service.test.ts docs/superpowers/plans/2026-09-06-remove-labs-entitlement.md
git commit -m "feat(admin): remove stale Labs entitlements"
```

No se deben eliminar filas de `TenantAiWorkspace`, `AuditLog`, `Tenant`, `Module` ni `ModuleSubmodule`.
