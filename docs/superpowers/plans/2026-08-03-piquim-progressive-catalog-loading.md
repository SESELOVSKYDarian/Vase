# Piquim Progressive Catalog Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar productos de Piquim desde la primera página recibida y comunicar claramente la carga inicial, la carga restante y los errores recuperables.

**Architecture:** La utilidad de paginación notificará un snapshot acumulado después de cada página. `CatalogPage` conservará esos snapshots en estado y `PiquimSubcatalogPage` representará carga, progreso y reintento sin alterar la taxonomía dinámica ni las tarjetas actuales.

**Tech Stack:** React 18, Vite 5, JavaScript ES modules, Vitest 4, Tailwind CSS.

---

### Task 1: Emitir resultados acumulados por página

**Files:**
- Modify: `apps/vase-editor/web/src/utils/piquimCatalogCategories.js:117-128`
- Test: `tests/vase-editor-piquim-category-tree.test.ts:52-67`

- [ ] **Step 1: Escribir la prueba fallida de progreso**

Agregar una prueba que capture los snapshots antes de que termine la tercera página:

```ts
it("publishes accumulated products after every catalog page", async () => {
  const snapshots: string[][] = [];
  const fetchPage = vi.fn(async (page: number) => ({
    total_pages: 3,
    total: 3,
    items: [{ id: `product-${page}` }],
  }));

  await fetchAllCatalogPages(fetchPage, (progress) => {
    snapshots.push(progress.items.map((item) => item.id));
  });

  expect(snapshots).toEqual([
    ["product-1"],
    ["product-1", "product-2"],
    ["product-1", "product-2", "product-3"],
  ]);
});
```

- [ ] **Step 2: Ejecutar la prueba y verificar RED**

Run: `npx vitest run tests/vase-editor-piquim-category-tree.test.ts`

Expected: FAIL porque `fetchAllCatalogPages` todavía ignora el callback de progreso.

- [ ] **Step 3: Implementar el callback acumulado**

Cambiar la utilidad para emitir una copia segura tras cada página:

```js
export async function fetchAllCatalogPages(fetchPage, onProgress) {
  const firstPage = await fetchPage(1);
  const pageCount = Math.max(1, Number(firstPage?.total_pages || 1));
  const items = Array.isArray(firstPage?.items) ? [...firstPage.items] : [];
  const total = Math.max(items.length, Number(firstPage?.total || items.length));

  onProgress?.({ items: [...items], total, page: 1, totalPages: pageCount });

  for (let page = 2; page <= pageCount; page += 1) {
    const response = await fetchPage(page);
    if (Array.isArray(response?.items)) items.push(...response.items);
    onProgress?.({ items: [...items], total, page, totalPages: pageCount });
  }

  return { items, total };
}
```

- [ ] **Step 4: Ejecutar la prueba y verificar GREEN**

Run: `npx vitest run tests/vase-editor-piquim-category-tree.test.ts`

Expected: 5 tests passing.

- [ ] **Step 5: Commit enfocado**

```powershell
git add -- apps/vase-editor/web/src/utils/piquimCatalogCategories.js tests/vase-editor-piquim-category-tree.test.ts
git commit -m "feat: stream Piquim catalog pages"
```

### Task 2: Mostrar carga progresiva y recuperación en la interfaz

**Files:**
- Modify: `apps/vase-editor/web/src/pages/store/CatalogPage.jsx:284-442`
- Modify: `apps/vase-editor/web/src/pages/store/CatalogPage.jsx:703-718`
- Modify: `apps/vase-editor/web/src/pages/store/CatalogPage.jsx:1281-1605`
- Test: `tests/vase-editor-piquim-category-tree.test.ts`

- [ ] **Step 1: Escribir la prueba fallida del contrato visual**

Leer `CatalogPage.jsx` y comprobar las tres acciones visibles:

```ts
it("renders progressive Piquim loading and retry states", async () => {
  const source = await readFile(
    new URL("../apps/vase-editor/web/src/pages/store/CatalogPage.jsx", import.meta.url),
    "utf8",
  );

  expect(source).toContain("Cargando productos...");
  expect(source).toContain("Cargando más productos...");
  expect(source).toContain("No se pudieron cargar algunos productos");
  expect(source).toContain("onRetry");
});
```

- [ ] **Step 2: Ejecutar la prueba y verificar RED**

Run: `npx vitest run tests/vase-editor-piquim-category-tree.test.ts`

Expected: FAIL porque esos estados todavía no existen.

- [ ] **Step 3: Publicar cada snapshot desde `CatalogPage`**

Agregar estados recuperables y actualizar la rama Piquim dentro de `loadProducts`:

```jsx
const [loadError, setLoadError] = useState("");
const [retryKey, setRetryKey] = useState(0);

// Al comenzar loadProducts:
let progressiveItemCount = 0;
setLoadError("");

const data = isPiquimSubcatalog
  ? await fetchAllCatalogPages(fetchPage, (progress) => {
      if (!active) return;
      progressiveItemCount = progress.items.length;
      setProducts(progress.items);
      setTotalItems(progress.total);
  })
  : await fetchPage(page);

// En catch:
if (active) {
  setLoadError("No se pudieron cargar algunos productos");
  if (!progressiveItemCount) {
    setProducts([]);
    setTotalItems(0);
  }
}
```

Añadir `retryKey` a las dependencias del efecto y pasar al subcatálogo:

```jsx
<PiquimSubcatalogPage
  loading={loading}
  loadError={loadError}
  onRetry={() => setRetryKey((value) => value + 1)}
  {...existingProps}
/>
```

- [ ] **Step 4: Renderizar los estados sin reemplazar productos visibles**

Ampliar las props y agregar estados sobre la zona de secciones:

```jsx
function PiquimSubcatalogPage({ catalog, categories, products, loading, loadError, onRetry, currency, locale, onProductClick, labels }) {
  // estado existente
}

{loading && !normalizedProducts.length ? (
  <PiquimProductsLoadingState />
) : null}

{loading && normalizedProducts.length ? (
  <div className="w-full rounded-2xl border border-[#FFDCC1] bg-[#FFF1E6] px-5 py-3 text-sm font-semibold text-[#A04100]">
    Cargando más productos... {normalizedProducts.length} visibles
  </div>
) : null}

{loadError ? (
  <div className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[#FFB98A] bg-[#FFF1E6] px-5 py-4 text-sm text-[#7A3510]">
    <span>{normalizedProducts.length ? "No se pudieron cargar algunos productos" : "No se pudieron cargar los productos"}</span>
    <button type="button" onClick={onRetry} className="rounded-full bg-[#FF4D00] px-4 py-2 font-bold text-white">Reintentar</button>
  </div>
) : null}
```

Crear el skeleton local:

```jsx
function PiquimProductsLoadingState() {
  return (
    <div className="w-full" role="status" aria-live="polite">
      <p className="mb-4 text-sm font-semibold text-[#A04100]">Cargando productos...</p>
      <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(282px,1fr))] gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`piquim-loading-${index}`} className="h-[390px] animate-pulse rounded-3xl border border-[#E8DFD8] bg-white">
            <div className="h-64 rounded-t-3xl bg-[#F3EAE3]" />
            <div className="space-y-3 p-5"><div className="h-4 w-2/3 rounded bg-[#F3EAE3]" /><div className="h-3 w-1/2 rounded bg-[#F3EAE3]" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Ejecutar pruebas y build**

Run:

```powershell
npx vitest run tests/vase-editor-piquim-category-tree.test.ts tests/vase-editor-catalog-stability.test.ts
npx eslint apps/vase-editor/web/src/utils/piquimCatalogCategories.js tests/vase-editor-piquim-category-tree.test.ts
npm run build --prefix apps/vase-editor/web
git diff --check
```

Expected: todas las pruebas pasan; ESLint enfocado sin errores; build exit 0; diff check sin salida.

- [ ] **Step 6: Commit de implementación**

```powershell
git add -- apps/vase-editor/web/src/pages/store/CatalogPage.jsx tests/vase-editor-piquim-category-tree.test.ts
git commit -m "feat: show progressive Piquim catalog loading"
```
