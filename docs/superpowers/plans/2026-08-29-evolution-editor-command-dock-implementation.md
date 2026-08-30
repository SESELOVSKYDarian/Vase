# Evolution Editor Command Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar el editor Evolution como un canvas dominante con rail neutral, dock inferior, popovers y un inspector contextual, manteniendo todas las funciones existentes y el comportamiento multiempresa.

**Architecture:** La lógica de negocio y los handlers existentes permanecen en `EvolutionAdmin`, `EvolutionCanvas`, `EvolutionInspector` y `PageSectionsEditor`. Solo se agregan estados visuales pequeños a Zustand y componentes de presentación enfocados; el dock coordina paneles mediante `activeDockPanel`, mientras el editor de bloques conserva sus mutaciones actuales.

**Tech Stack:** React 18, Zustand 5, Tailwind CSS 3, Phosphor Icons, Vite 5, Node test runner.

---

## Mapa de archivos

- Crear `apps/vase-editor/web/src/components/admin/evolution/EvolutionCommandDock.jsx`: dock responsive, selector de viewport y disparadores de popovers.
- Crear `apps/vase-editor/web/src/components/admin/evolution/EvolutionActionsMenu.jsx`: acciones infrecuentes de guardar, cliente, dominios y búsqueda.
- Crear `apps/vase-editor/web/src/components/admin/evolution/EvolutionTenantIdentity.jsx`: identidad dinámica del tenant sin valores Piquim hardcodeados.
- Crear `apps/vase-editor/web/tests/evolution-editor-layout.test.mjs`: paridad funcional y estructura del nuevo shell.
- Modificar `apps/vase-editor/web/src/store/useEvolutionStore.js`: estado exclusivamente visual del dock y viewport.
- Modificar `apps/vase-editor/web/src/components/admin/evolution/EvolutionLayout.jsx`: composición del shell y propagación de branding.
- Modificar `apps/vase-editor/web/src/components/admin/evolution/EvolutionSidebar.jsx`: rail compacto reutilizable.
- Modificar `apps/vase-editor/web/src/components/admin/evolution/EvolutionCanvas.jsx`: barra superior, canvas dominante, acciones y dock.
- Modificar `apps/vase-editor/web/src/components/admin/evolution/PageSectionsEditor.jsx`: canvas completo y popovers de bloques/agregar.
- Modificar `apps/vase-editor/web/src/components/admin/evolution/EvolutionInspector.jsx`: overlay contextual y ancho responsive.

### Task 1: Contrato visual y prueba de paridad

**Files:**
- Create: `apps/vase-editor/web/tests/evolution-editor-layout.test.mjs`
- Test: `apps/vase-editor/web/tests/evolution-editor-layout.test.mjs`

- [ ] **Step 1: Escribir la prueba fallida**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('el shell evolution conserva acciones y usa dock contextual', async () => {
  const [canvas, dock, sections] = await Promise.all([
    read('../src/components/admin/evolution/EvolutionCanvas.jsx'),
    read('../src/components/admin/evolution/EvolutionCommandDock.jsx'),
    read('../src/components/admin/evolution/PageSectionsEditor.jsx'),
  ]);

  for (const action of ['onSave', 'onUndo', 'onRedo', 'openPreview', 'openDomainCenter']) {
    assert.match(canvas, new RegExp(action));
  }
  for (const label of ['Páginas', 'Bloques', 'Agregar']) assert.match(dock, new RegExp(label));
  for (const handler of ['handleAddSection', 'handleDeleteSection', 'handleToggleEnabled', 'handleDrop']) {
    assert.match(sections, new RegExp(handler));
  }
});

test('la identidad del editor es multiempresa', async () => {
  const identity = await read('../src/components/admin/evolution/EvolutionTenantIdentity.jsx');
  assert.match(identity, /branding/);
  assert.doesNotMatch(identity, /Piquim|piquim/);
});
```

- [ ] **Step 2: Ejecutar la prueba y comprobar el fallo**

Run: `cd apps/vase-editor/web && node --test tests/evolution-editor-layout.test.mjs`

Expected: FAIL porque los componentes nuevos todavía no existen.

- [ ] **Step 3: Commit de la prueba**

```bash
git add apps/vase-editor/web/tests/evolution-editor-layout.test.mjs
git commit -m "test: define evolution editor layout parity"
```

### Task 2: Estado visual del dock

**Files:**
- Modify: `apps/vase-editor/web/src/store/useEvolutionStore.js`
- Test: `apps/vase-editor/web/tests/evolution-editor-layout.test.mjs`

- [ ] **Step 1: Agregar estado sin tocar contratos funcionales**

```js
activeDockPanel: null,
previewViewport: 'desktop',
setActiveDockPanel: (panel) => set((state) => ({
  activeDockPanel: state.activeDockPanel === panel ? null : panel,
})),
closeDockPanel: () => set({ activeDockPanel: null }),
setPreviewViewport: (viewport) => set({ previewViewport: viewport || 'desktop' }),
```

`setActiveModule` también debe cerrar `activeDockPanel` sin cambiar selección, permisos ni datos adicionales.

- [ ] **Step 2: Extender la prueba**

Comprobar que el store contiene `activeDockPanel`, `previewViewport`, `setActiveDockPanel`, `closeDockPanel` y `setPreviewViewport`.

- [ ] **Step 3: Ejecutar la prueba**

Run: `cd apps/vase-editor/web && node --test tests/evolution-editor-layout.test.mjs`

Expected: sigue fallando solo por los componentes no creados.

- [ ] **Step 4: Commit**

```bash
git add apps/vase-editor/web/src/store/useEvolutionStore.js apps/vase-editor/web/tests/evolution-editor-layout.test.mjs
git commit -m "feat: add evolution dock view state"
```

### Task 3: Identidad multiempresa y rail

**Files:**
- Create: `apps/vase-editor/web/src/components/admin/evolution/EvolutionTenantIdentity.jsx`
- Modify: `apps/vase-editor/web/src/components/admin/evolution/EvolutionSidebar.jsx`
- Modify: `apps/vase-editor/web/src/components/admin/evolution/EvolutionLayout.jsx`

- [ ] **Step 1: Crear identidad dinámica**

```jsx
const EvolutionTenantIdentity = ({ branding, compact = false }) => {
  const title = branding?.companyName || branding?.title || 'Empresa';
  const logo = branding?.logo_url || '';
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--admin-accent)] text-[var(--admin-accent-contrast)]">
        {logo ? <img src={logo} alt="" className="size-7 object-contain" /> : title.slice(0, 1).toUpperCase()}
      </div>
      {!compact ? <div className="min-w-0"><p className="text-[10px] admin-text-muted">Empresa</p><p className="truncate text-sm font-semibold admin-text-primary">{title}</p></div> : null}
    </div>
  );
};
```

- [ ] **Step 2: Convertir navegación en rail**

Mantener exactamente `moduleGroups`, `activeModule`, `setActiveModule`, `toggleSidebar` y todos los ids. En desktop usar ancho compacto de 72 px; el estado expandido abre un overlay/panel de 232 px. Cada botón conserva label accesible mediante texto o tooltip.

- [ ] **Step 3: Propagar branding desde layout**

`EvolutionLayout` continúa calculando `adminTheme`, `adminBranding` y `shellStyle`; pasa `adminBranding` al rail, canvas e identidad sin introducir nombres específicos de tenant.

- [ ] **Step 4: Ejecutar pruebas y build parcial**

Run: `cd apps/vase-editor/web && node --test tests/evolution-editor-layout.test.mjs`

Expected: el test multiempresa pasa; el test de dock sigue fallando.

- [ ] **Step 5: Commit**

```bash
git add apps/vase-editor/web/src/components/admin/evolution/EvolutionTenantIdentity.jsx apps/vase-editor/web/src/components/admin/evolution/EvolutionSidebar.jsx apps/vase-editor/web/src/components/admin/evolution/EvolutionLayout.jsx
git commit -m "feat: add multitenant evolution rail"
```

### Task 4: Barra superior y menú de acciones

**Files:**
- Create: `apps/vase-editor/web/src/components/admin/evolution/EvolutionActionsMenu.jsx`
- Modify: `apps/vase-editor/web/src/components/admin/evolution/EvolutionCanvas.jsx`

- [ ] **Step 1: Extraer acciones infrecuentes**

`EvolutionActionsMenu` recibe callbacks, no implementa lógica:

```jsx
const EvolutionActionsMenu = ({ open, onClose, onSave, onPreview, onPublish, onDomains, onViewClient, isSaving }) => (
  open ? (
    <div role="menu" aria-label="Acciones del editor">
      <button role="menuitem" type="button" onClick={() => { onSave(); onClose(); }} disabled={isSaving}>Guardar</button>
      <button role="menuitem" type="button" onClick={() => { onPreview(); onClose(); }}>Previsualizar</button>
      <button role="menuitem" type="button" onClick={() => { onPublish(); onClose(); }}>Publicar</button>
      <button role="menuitem" type="button" onClick={() => { onDomains(); onClose(); }}>Dominios</button>
      <button role="menuitem" type="button" onClick={() => { onViewClient(); onClose(); }}>Ver cliente</button>
    </div>
  ) : null
);
```

El menú muestra `Guardar`, `Ver cliente`, `Dominios` y cualquier acción desplazada de la barra. `Previsualizar` y `Publicar` permanecen visibles.

- [ ] **Step 2: Simplificar header sin perder utilidades**

Conservar búsqueda global, notificaciones, perfil, logout, undo/redo y modales. La barra muestra identidad/breadcrumb, estado de guardado, `Previsualizar`, `Publicar` y overflow. Los controles ocultos por breakpoint siguen disponibles en el menú.

- [ ] **Step 3: Ejecutar prueba de paridad**

Run: `cd apps/vase-editor/web && node --test tests/evolution-editor-layout.test.mjs`

Expected: no falta `onSave`, `onUndo`, `onRedo`, `openPreview` ni `openDomainCenter`.

- [ ] **Step 4: Commit**

```bash
git add apps/vase-editor/web/src/components/admin/evolution/EvolutionActionsMenu.jsx apps/vase-editor/web/src/components/admin/evolution/EvolutionCanvas.jsx
git commit -m "feat: simplify evolution action bar"
```

### Task 5: Dock inferior y viewport

**Files:**
- Create: `apps/vase-editor/web/src/components/admin/evolution/EvolutionCommandDock.jsx`
- Modify: `apps/vase-editor/web/src/components/admin/evolution/EvolutionCanvas.jsx`

- [ ] **Step 1: Crear dock accesible**

El dock consume store visual y callbacks existentes:

```jsx
const panels = [
  { id: 'pages', label: 'Páginas' },
  { id: 'blocks', label: 'Bloques' },
  { id: 'add', label: 'Agregar' },
];
```

Incluye desktop/tablet/mobile y undo/redo, con `aria-pressed`, tooltips y estados disabled.

- [ ] **Step 2: Mostrar dock solo en edición storefront**

En `EvolutionCanvas`, renderizarlo para `home`, `about`, `catalog`, `catalog_live` y `design_live`. El resto de módulos conserva su workspace actual.

- [ ] **Step 3: Aplicar ancho de preview**

El viewport modifica únicamente una clase de contenedor (`100%`, `834px`, `390px`) y no altera los datos renderizados.

- [ ] **Step 4: Ejecutar prueba**

Run: `cd apps/vase-editor/web && node --test tests/evolution-editor-layout.test.mjs`

Expected: PASS para labels del dock y paridad del canvas.

- [ ] **Step 5: Commit**

```bash
git add apps/vase-editor/web/src/components/admin/evolution/EvolutionCommandDock.jsx apps/vase-editor/web/src/components/admin/evolution/EvolutionCanvas.jsx
git commit -m "feat: add evolution command dock"
```

### Task 6: Popovers de páginas, bloques y agregar

**Files:**
- Modify: `apps/vase-editor/web/src/components/admin/evolution/PageSectionsEditor.jsx`
- Test: `apps/vase-editor/web/tests/evolution-editor-layout.test.mjs`

- [ ] **Step 1: Separar vista previa y controles**

Mantener los handlers `handleAddSection`, `handleDeleteSection`, `handleToggleEnabled`, `handleMoveSection`, `handleDrop`, `handleSelectSection` y `handleUpdateOffset` sin cambios semánticos.

- [ ] **Step 2: Renderizar canvas completo**

Eliminar la grilla persistente de dos columnas solo en presentación. El `PageBuilder` ocupa el ancho disponible y la lista se muestra en un popover posicionado sobre el canvas cuando `activeDockPanel === 'blocks'`.

- [ ] **Step 3: Reutilizar tipos en popover Agregar**

Cuando `activeDockPanel === 'add'`, renderizar `sectionTypes` y llamar `handleAddSection(item.type)`. No duplicar plantillas ni lógica de ids.

- [ ] **Step 4: Páginas**

El panel `pages` ofrece `Inicio` y `Sobre nosotros` llamando `setActiveModule('home')` y `setActiveModule('about')`. Las páginas específicas existentes siguen resolviéndose mediante `pageKey` y datos actuales.

- [ ] **Step 5: Extender prueba de paridad**

Verificar por fuente que permanecen todos los handlers y que `PageBuilder` sigue recibiendo `previewSections`.

- [ ] **Step 6: Ejecutar pruebas**

Run: `cd apps/vase-editor/web && node --test tests/evolution-editor-layout.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/vase-editor/web/src/components/admin/evolution/PageSectionsEditor.jsx apps/vase-editor/web/tests/evolution-editor-layout.test.mjs
git commit -m "feat: move evolution blocks into contextual popovers"
```

### Task 7: Inspector contextual y responsive

**Files:**
- Modify: `apps/vase-editor/web/src/components/admin/evolution/EvolutionInspector.jsx`
- Modify: `apps/vase-editor/web/src/components/admin/evolution/EvolutionLayout.jsx`

- [ ] **Step 1: Conservar renderers especializados**

No modificar el contrato de `CatalogInspectorPanel`, `UsersInspectorPanel`, `BlockPropertiesEditor`, `ProductPropertiesEditor`, `MediaPropertiesEditor` ni `EvolutionInput`.

- [ ] **Step 2: Ajustar presentación**

En desktop, inspector contextual de 320-400 px. En resoluciones menores a 1536 px, overlay derecho con backdrop. En móvil, sheet de ancho completo. Mantener el auto-cierre cuando no hay `selectedId` y las excepciones por módulo.

- [ ] **Step 3: Mantener footer y acciones**

Conservar `hideFooterModules`, `allowSaveWithoutSelectionModules`, undo/redo, cerrar y guardar con sus estados disabled/loading.

- [ ] **Step 4: Commit**

```bash
git add apps/vase-editor/web/src/components/admin/evolution/EvolutionInspector.jsx apps/vase-editor/web/src/components/admin/evolution/EvolutionLayout.jsx
git commit -m "feat: refine contextual evolution inspector"
```

### Task 8: Verificación final de paridad

**Files:**
- Modify: `apps/vase-editor/web/tests/evolution-editor-layout.test.mjs`
- Verify: `apps/vase-editor/web/src/components/admin/evolution/*.jsx`

- [ ] **Step 1: Completar inventario automatizado**

Agregar aserciones para búsqueda, notificaciones, perfil, logout, command palette, dominio, publicación, guardar, preview, undo/redo y todos los módulos del rail.

- [ ] **Step 2: Ejecutar todos los tests**

Run:

```powershell
cd apps/vase-editor/web
$tests = Get-ChildItem -LiteralPath tests -Filter '*.test.mjs' | ForEach-Object { $_.FullName }
node --test $tests
```

Expected: todos pasan.

- [ ] **Step 3: Ejecutar build**

Run: `cd apps/vase-editor/web && npm run build`

Expected: Vite finaliza con `built` y código 0; advertencias existentes de tamaño de chunk no bloquean.

- [ ] **Step 4: Revisar diff**

Run: `git diff --check && git status --short`

Expected: sin errores de whitespace y solo archivos del editor/plan/test modificados.

- [ ] **Step 5: Verificación visual**

Comprobar en `/admin/evolution` los estados: sin selección, bloque seleccionado, inspector cerrado, bloques abierto, agregar abierto, desktop/tablet/mobile, tema claro/oscuro y tenant con nombre/logo largos.

- [ ] **Step 6: Commit final**

```bash
git add apps/vase-editor/web/src apps/vase-editor/web/tests/evolution-editor-layout.test.mjs
git commit -m "feat: redesign evolution editor workspace"
```
