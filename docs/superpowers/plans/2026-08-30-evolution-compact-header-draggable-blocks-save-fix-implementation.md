# Evolution Compact Header, Draggable Blocks and Save Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplificar la barra superior, hacer móvil el panel de bloques en escritorio y reparar el guardado de configuración con errores útiles.

**Architecture:** La UI concentra todas las acciones secundarias en `EvolutionActionsMenu` y delega el movimiento a un componente aislado `DraggableFloatingPanel`. El backend normaliza el payload de configuración en una función pura para garantizar que `seo` siempre exista; el frontend interpreta cada respuesta fallida y devuelve el origen y detalle del error.

**Tech Stack:** React 18, Pointer Events, Zustand, Express, PostgreSQL, Node test runner, Vite.

---

### Task 1: Regresiones de guardado

**Files:**
- Create: `apps/vase-editor/server/src/services/tenantSettingsPayload.test.js`
- Create: `apps/vase-editor/web/tests/editor-save-errors.test.mjs`

- [ ] **Step 1: Escribir prueba backend fallida**

La prueba importa `normalizeTenantSettingsWritePayload` y exige que un body sin SEO produzca `seo: {}`, mientras que un body con SEO conserve sus propiedades.

- [ ] **Step 2: Escribir prueba frontend fallida**

La prueba importa `readSaveFailure` y usa `Response` reales para comprobar JSON con `details`, JSON con `error` y una respuesta de texto.

- [ ] **Step 3: Ejecutar ambas pruebas**

```powershell
node --test apps/vase-editor/server/src/services/tenantSettingsPayload.test.js
node --test apps/vase-editor/web/tests/editor-save-errors.test.mjs
```

Expected: FAIL porque los módulos todavía no existen.

- [ ] **Step 4: Commit de pruebas**

```powershell
git add apps/vase-editor/server/src/services/tenantSettingsPayload.test.js apps/vase-editor/web/tests/editor-save-errors.test.mjs
git commit -m "test: reproduce evolution save failures"
```

### Task 2: Reparar backend y detalle de errores

**Files:**
- Create: `apps/vase-editor/server/src/services/tenantSettingsPayload.js`
- Modify: `apps/vase-editor/server/src/routes/tenant.js`
- Create: `apps/vase-editor/web/src/utils/saveResponse.js`
- Modify: `apps/vase-editor/web/src/hooks/admin/useEditorState.js`
- Modify: `apps/vase-editor/web/src/pages/admin/evolution/EvolutionAdmin.jsx`

- [ ] **Step 1: Normalizar payload de configuración**

Crear `normalizeTenantSettingsWritePayload(body)` para devolver siempre `branding`, `theme`, `seo` y `commerce` como objetos y normalizar `price_tier_labels`.

- [ ] **Step 2: Usar el payload normalizado en `PUT /tenant/settings`**

Sustituir variables sueltas por:

```js
const { branding, theme, seo, commerce } = normalizeTenantSettingsWritePayload(req.body);
```

- [ ] **Step 3: Implementar lectura segura de errores HTTP**

Crear `readSaveFailure(response, operation)` para devolver `{ code, error, details, operation }` desde JSON o texto sin consumir una respuesta más de una vez.

- [ ] **Step 4: Propagar el origen del fallo**

En `handleSaveAll`, adjuntar el resultado de `readSaveFailure` para configuración, Inicio, Nosotros y publicación. En excepciones, devolver `details: err.message`.

- [ ] **Step 5: Ejecutar pruebas de guardado**

Expected: ambas pruebas pasan.

- [ ] **Step 6: Commit funcional**

```powershell
git add apps/vase-editor/server/src/services/tenantSettingsPayload.js apps/vase-editor/server/src/routes/tenant.js apps/vase-editor/web/src/utils/saveResponse.js apps/vase-editor/web/src/hooks/admin/useEditorState.js apps/vase-editor/web/src/pages/admin/evolution/EvolutionAdmin.jsx
git commit -m "fix: preserve seo and expose editor save errors"
```

### Task 3: Barra superior compacta

**Files:**
- Modify: `apps/vase-editor/web/tests/evolution-editor-layout.test.mjs`
- Modify: `apps/vase-editor/web/src/components/admin/evolution/EvolutionCanvas.jsx`
- Modify: `apps/vase-editor/web/src/components/admin/evolution/EvolutionActionsMenu.jsx`

- [ ] **Step 1: Escribir prueba estructural fallida**

Exigir que el header no renderice identidad, estado guardado ni botones directos; y que el menú contenga guardar, deshacer, rehacer, inspector, notificaciones, ver cliente, previsualizar, publicar y dominios.

- [ ] **Step 2: Ejecutar prueba específica**

Run: `node --test tests/evolution-editor-layout.test.mjs`

Expected: FAIL con los controles todavía visibles.

- [ ] **Step 3: Simplificar header**

Conservar buscador, flecha Más y perfil. Mover callbacks secundarios al menú y anclar allí el popover de notificaciones.

- [ ] **Step 4: Ejecutar prueba específica**

Expected: PASS.

- [ ] **Step 5: Commit de UI**

```powershell
git add apps/vase-editor/web/tests/evolution-editor-layout.test.mjs apps/vase-editor/web/src/components/admin/evolution/EvolutionCanvas.jsx apps/vase-editor/web/src/components/admin/evolution/EvolutionActionsMenu.jsx
git commit -m "feat: simplify evolution editor header"
```

### Task 4: Panel de bloques arrastrable

**Files:**
- Create: `apps/vase-editor/web/src/components/admin/evolution/DraggableFloatingPanel.jsx`
- Modify: `apps/vase-editor/web/tests/evolution-editor-layout.test.mjs`
- Modify: `apps/vase-editor/web/src/components/admin/evolution/PageSectionsEditor.jsx`

- [ ] **Step 1: Escribir prueba estructural fallida**

Exigir `PointerEvent`, `setPointerCapture`, límites de viewport y uso de `DraggableFloatingPanel` en el panel Bloques.

- [ ] **Step 2: Implementar panel aislado**

Usar el encabezado como handle, ignorar controles interactivos, limitar `x/y` al viewport y desactivar arrastre debajo de `768px`.

- [ ] **Step 3: Integrar panel de bloques**

Envolver el contenido existente sin cambiar handlers de bloques ni guardado.

- [ ] **Step 4: Ejecutar prueba específica**

Expected: PASS.

- [ ] **Step 5: Commit de UI**

```powershell
git add apps/vase-editor/web/src/components/admin/evolution/DraggableFloatingPanel.jsx apps/vase-editor/web/src/components/admin/evolution/PageSectionsEditor.jsx apps/vase-editor/web/tests/evolution-editor-layout.test.mjs
git commit -m "feat: make evolution blocks panel draggable"
```

### Task 5: Verificación integral

**Files:**
- Verify: `apps/vase-editor/server/src/**/*.test.js`
- Verify: `apps/vase-editor/web/tests/*.test.mjs`

- [ ] **Step 1: Ejecutar tests backend**

```powershell
$tests = Get-ChildItem -Recurse -LiteralPath src -Filter '*.test.js' | ForEach-Object { $_.FullName }
node --test $tests
```

- [ ] **Step 2: Ejecutar tests frontend**

```powershell
$tests = Get-ChildItem -LiteralPath tests -Filter '*.test.mjs' | ForEach-Object { $_.FullName }
node --test $tests
```

- [ ] **Step 3: Ejecutar build frontend y checks de servidor**

```powershell
npm run build
node --check ../server/src/routes/tenant.js
node --check ../server/src/services/tenantSettingsPayload.js
```

- [ ] **Step 4: Revisar diff final**

```powershell
git diff --check
git status --short
```

