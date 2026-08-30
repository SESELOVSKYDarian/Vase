# Evolution Responsive Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ocultar las acciones principales de previsualización/publicación y hacer que Escritorio, Tablet y Celular rendericen el storefront con un viewport real dentro del editor.

**Architecture:** Crear un `ResponsivePreviewFrame` aislado que monta sus hijos dentro de un iframe mediante `createPortal` y replica las hojas de estilo del documento principal. `PageSectionsEditor` seguirá siendo dueño de `PageBuilder` y sólo delegará el entorno visual; `EvolutionCanvas` conservará los callbacks de previsualización/publicación en el menú de tres puntos.

**Tech Stack:** React 18, React DOM portals, Zustand, Tailwind CSS, Vite, Node test runner.

---

### Task 1: Definir la regresión responsive

**Files:**
- Modify: `apps/vase-editor/web/tests/evolution-editor-layout.test.mjs`

- [ ] **Step 1: Escribir la prueba fallida**

Agregar aserciones que exijan `ResponsivePreviewFrame`, `createPortal`, los tres anchos de viewport y que las acciones `onPreview`/`onPublish` continúen en `EvolutionActionsMenu` pero no como botones directos de la barra superior.

- [ ] **Step 2: Ejecutar la prueba y comprobar el fallo**

Run: `node --test tests/evolution-editor-layout.test.mjs`

Expected: FAIL porque `ResponsivePreviewFrame.jsx` todavía no existe y `PageSectionsEditor` monta `PageBuilder` directamente.

- [ ] **Step 3: Commit de la prueba**

```powershell
git add apps/vase-editor/web/tests/evolution-editor-layout.test.mjs
git commit -m "test: define responsive evolution preview"
```

### Task 2: Implementar el iframe responsive

**Files:**
- Create: `apps/vase-editor/web/src/components/admin/evolution/ResponsivePreviewFrame.jsx`
- Modify: `apps/vase-editor/web/src/components/admin/evolution/PageSectionsEditor.jsx`
- Modify: `apps/vase-editor/web/src/components/admin/evolution/EvolutionCanvas.jsx`

- [ ] **Step 1: Crear `ResponsivePreviewFrame`**

Implementar un iframe con `title="Vista responsive del sitio"`, ancho `100%`, `834px` o `390px` según `viewport`, documento interno inicializado con un nodo `#preview-root`, réplica de `style` y `link[rel="stylesheet"]`, y `createPortal(children, mountNode)`.

- [ ] **Step 2: Conectar `PageBuilder` al frame**

Reemplazar el contenedor directo por:

```jsx
<ResponsivePreviewFrame viewport={previewViewport}>
    <PageBuilder sections={previewSections} />
</ResponsivePreviewFrame>
```

Mantener intactos los handlers de agregar, eliminar, ordenar, ocultar y seleccionar bloques.

- [ ] **Step 3: Limpiar el ancho simulado anterior**

Eliminar de `EvolutionCanvas` el `viewportWidthClass`; el nuevo frame será la única fuente del ancho responsive.

- [ ] **Step 4: Ocultar acciones superiores sin perder callbacks**

Eliminar los botones directos Previsualizar y Publicar de la cabecera. Conservar `openPreview` y `openDomainCenter('publish')` conectados a `EvolutionActionsMenu`.

- [ ] **Step 5: Ejecutar la prueba específica**

Run: `node --test tests/evolution-editor-layout.test.mjs`

Expected: todas las pruebas del archivo pasan.

- [ ] **Step 6: Commit funcional**

```powershell
git add apps/vase-editor/web/src/components/admin/evolution/ResponsivePreviewFrame.jsx apps/vase-editor/web/src/components/admin/evolution/PageSectionsEditor.jsx apps/vase-editor/web/src/components/admin/evolution/EvolutionCanvas.jsx
git commit -m "feat: add real responsive evolution preview"
```

### Task 3: Verificación integral

**Files:**
- Verify: `apps/vase-editor/web/tests/*.test.mjs`
- Verify: `apps/vase-editor/web/src/components/admin/evolution/*`

- [ ] **Step 1: Ejecutar todas las pruebas**

```powershell
$tests = Get-ChildItem -LiteralPath tests -Filter '*.test.mjs' | ForEach-Object { $_.FullName }
node --test $tests
```

Expected: cero fallos.

- [ ] **Step 2: Ejecutar build de producción**

Run: `npm run build`

Expected: Vite termina correctamente.

- [ ] **Step 3: Revisar diff y árbol de trabajo**

```powershell
git diff --check
git status --short
```

Expected: sin errores de whitespace y sólo cambios previstos antes del commit final.

