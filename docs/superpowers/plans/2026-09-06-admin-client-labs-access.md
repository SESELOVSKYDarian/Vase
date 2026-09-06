# Admin Client Labs Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que Super Admin asigne, cambie o quite el único plan de Vase Labs de un cliente desde `/admin/users`, sin modificar el catálogo global ni otros clientes.

**Architecture:** Mantener el contrato existente de `ClientProductAccess` y `applyClientProductAccess`. El editor mostrará una acción explícita de retiro que envía `labs: null`; el servicio ya valida el plan activo, desactiva relaciones Labs anteriores, actualiza el módulo del tenant y conserva workspace/historial. Se agregará cobertura de UI y de persistencia para asignar, cambiar y retirar.

**Tech Stack:** Next.js/React, TypeScript, Prisma service layer, Vitest, jsdom.

---

## Archivos y responsabilidades

- Modify: `apps/vase-app/src/components/admin/client-product-access-editor.tsx` — agregar el botón explícito `Quitar acceso a Vase Labs` junto al estado comercial, conservando `Sin acceso`.
- Test: `apps/vase-app/src/tests/admin-client-product-editor.test.tsx` — verificar retiro explícito y nueva asignación desde `Sin acceso`.
- Test: `apps/vase-app/src/tests/client-product-access-service.test.ts` — verificar que cambiar de plan deja uno activo y que retirar desactiva módulo y submódulos sin borrar workspace.

## Task 1: Probar el retiro desde el editor

- [ ] **Step 1: Agregar una prueba que falle antes de la implementación**

En `apps/vase-app/src/tests/admin-client-product-editor.test.tsx`, agregar junto al test de orden de Labs:

```tsx
it("quita explícitamente el acceso Labs y permite volver a asignarlo", () => {
  const state = renderInteractive({
    ...props.value,
    labs: { submoduleId: "labs-pro", plan: "PRO", status: "ACTIVE" },
  });
  click(container!.querySelector<HTMLButtonElement>('[aria-controls$="-labs"]')!);

  const removeButton = container!.querySelector<HTMLButtonElement>('[aria-label="Quitar acceso a Vase Labs"]');
  expect(removeButton).not.toBeNull();
  click(removeButton!);
  expect(state.getLatest().labs).toBeNull();
  expect(container!.querySelector<HTMLSelectElement>('[aria-label="Estado comercial de Vase Labs"]')?.value).toBe("OFF");

  change(container!.querySelector<HTMLSelectElement>('[aria-label="Estado comercial de Vase Labs"]')!, "TRIAL");
  expect(state.getLatest().labs).toEqual({ submoduleId: "labs-starter", plan: "STARTER", status: "TRIAL" });
});
```

- [ ] **Step 2: Ejecutar solamente la prueba nueva y confirmar el fallo**

Run from the repository root after creating the temporary Vitest config used by this repository:

```powershell
npx vitest run --config vitest.local.config.ts apps/vase-app/src/tests/admin-client-product-editor.test.tsx -t "quita explícitamente"
```

Expected: FAIL because the editor does not yet render the `Quitar acceso a Vase Labs` button.

## Task 2: Implementar la acción explícita de retiro

- [ ] **Step 1: Agregar el botón al bloque Labs**

En `apps/vase-app/src/components/admin/client-product-access-editor.tsx`, después del `select` de `Estado comercial` y antes de los mensajes del catálogo, agregar:

```tsx
{value.labs ? (
  <button
    type="button"
    aria-label="Quitar acceso a Vase Labs"
    onClick={() => setProduct("labs", null)}
    className="justify-self-start rounded-full border border-[var(--danger)]/30 px-4 py-2 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/10"
  >
    Quitar acceso a Vase Labs
  </button>
) : null}
```

La acción debe llamar al mismo `setProduct("labs", null)` que usa la opción `Sin acceso`, para que no existan dos contratos de persistencia.

- [ ] **Step 2: Ejecutar la prueba nueva y el archivo completo**

```powershell
npx vitest run --config vitest.local.config.ts apps/vase-app/src/tests/admin-client-product-editor.test.tsx -t "quita explícitamente"
npx vitest run --config vitest.local.config.ts apps/vase-app/src/tests/admin-client-product-editor.test.tsx
```

Expected: the focused test and all editor tests pass.

## Task 3: Cubrir la persistencia del cambio y retiro

- [ ] **Step 1: Agregar la regresión de transición al servicio**

En `apps/vase-app/src/tests/client-product-access-service.test.ts`, junto al test existente de Labs, agregar una prueba que primero asigne `labs-pro`, luego cambie a `labs-growth`, y finalmente retire:

```ts
it("cambia el plan Labs, desactiva el anterior y conserva el workspace al retirar", async () => {
  const { tx, state } = createStatefulTx();
  state.workspaces.push({
    id: "workspace-1",
    tenantId: "tenant-1",
    channelLimits: { WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 0 },
  });

  await applyClientProductAccess({
    ...baseInput,
    tx,
    access: { business: null, labs: { submoduleId: "labs-pro", plan: "PRO", status: "ACTIVE" }, rest: null, management: null },
  });
  await applyClientProductAccess({
    ...baseInput,
    tx,
    access: { business: null, labs: { submoduleId: "labs-growth", plan: "GROWTH", status: "ACTIVE" }, rest: null, management: null },
  });

  expect(state.tenantSubmodules).toEqual(expect.arrayContaining([
    expect.objectContaining({ submoduleId: "labs-pro", isActive: false }),
    expect.objectContaining({ submoduleId: "labs-growth", isActive: true, commercialStatus: "ACTIVE" }),
  ]));

  await applyClientProductAccess({
    ...baseInput,
    tx,
    access: { business: null, labs: null, rest: null, management: null },
  });

  expect(state.tenantModules.find((item) => item.moduleId === "vase_labs")).toMatchObject({ isActive: false });
  expect(state.tenantSubmodules.filter((item) => ["labs-pro", "labs-growth"].includes(item.submoduleId)))
    .toEqual(expect.arrayContaining([
      expect.objectContaining({ submoduleId: "labs-pro", isActive: false }),
      expect.objectContaining({ submoduleId: "labs-growth", isActive: false }),
    ]));
  expect(state.workspaces).toHaveLength(1);
});
```

- [ ] **Step 2: Ejecutar la prueba de servicio**

```powershell
npx vitest run --config vitest.local.config.ts apps/vase-app/src/tests/client-product-access-service.test.ts -t "cambia el plan Labs"
```

Expected: PASS; no catálogo global ni workspace se elimina.

## Task 4: Verificación y entrega

- [ ] **Step 1: Ejecutar las pruebas objetivo completas**

```powershell
npx vitest run --config vitest.local.config.ts apps/vase-app/src/tests/admin-client-product-editor.test.tsx apps/vase-app/src/tests/client-product-access-service.test.ts
```

- [ ] **Step 2: Ejecutar validaciones estáticas**

```powershell
npx eslint apps/vase-app/src/components/admin/client-product-access-editor.tsx apps/vase-app/src/tests/admin-client-product-editor.test.tsx apps/vase-app/src/tests/client-product-access-service.test.ts
git diff --check
```

- [ ] **Step 3: Revisar diff y crear el commit**

```powershell
git diff --stat
git diff -- apps/vase-app/src/components/admin/client-product-access-editor.tsx apps/vase-app/src/tests/admin-client-product-editor.test.tsx apps/vase-app/src/tests/client-product-access-service.test.ts
git add apps/vase-app/src/components/admin/client-product-access-editor.tsx apps/vase-app/src/tests/admin-client-product-editor.test.tsx apps/vase-app/src/tests/client-product-access-service.test.ts
git commit -m "feat(admin): manage per-client Labs access"
```

No se deben modificar variables de entorno, secretos, autenticación, migraciones ni el catálogo global.
