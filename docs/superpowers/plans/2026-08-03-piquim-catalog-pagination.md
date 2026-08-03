# Piquim Catalog Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar como maximo 20 productos filtrados por pagina en los subcatalogos Piquim, con navegacion numerada y reinicio de pagina al cambiar filtros.

**Architecture:** Mantener la carga progresiva actual y paginar en el cliente despues de normalizar y filtrar el conjunto recibido. Una utilidad pura concentra el calculo de limites y normaliza paginas fuera de rango; `PiquimSubcatalogPage` usa ese resultado para construir solamente las secciones visibles y renderiza un control accesible dentro de la vista Piquim.

**Tech Stack:** React 18, JavaScript, Vite 5, Vitest 4, Tailwind CSS.

---

### Task 1: Crear la utilidad pura de paginacion

**Files:**
- Modify: `apps/vase-editor/web/src/utils/piquimCatalogCategories.js`
- Test: `tests/vase-editor-piquim-category-tree.test.ts`

- [ ] **Step 1: Escribir las pruebas que fallan**

Agregar `paginateCatalogItems` al import de la prueba y estos casos:

```ts
it("shows exactly 20 Piquim products per page", () => {
  const products = Array.from({ length: 45 }, (_, index) => ({ id: `product-${index + 1}` }));

  expect(paginateCatalogItems(products, 2, 20)).toEqual({
    items: products.slice(20, 40),
    currentPage: 2,
    totalPages: 3,
    totalItems: 45,
  });
});

it("clamps a Piquim page after filters reduce the result", () => {
  const products = Array.from({ length: 5 }, (_, index) => ({ id: `product-${index + 1}` }));

  expect(paginateCatalogItems(products, 4, 20)).toEqual({
    items: products,
    currentPage: 1,
    totalPages: 1,
    totalItems: 5,
  });
});
```

- [ ] **Step 2: Ejecutar las pruebas y verificar el fallo esperado**

Run: `npx vitest run tests/vase-editor-piquim-category-tree.test.ts`

Expected: FAIL porque `paginateCatalogItems` todavia no se exporta.

- [ ] **Step 3: Implementar la utilidad minima**

Agregar a `piquimCatalogCategories.js`:

```js
export function paginateCatalogItems(items, requestedPage, pageSize = 20) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const normalizedPageSize = Math.max(1, Number(pageSize) || 20);
  const totalItems = normalizedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize));
  const currentPage = Math.min(totalPages, Math.max(1, Number(requestedPage) || 1));
  const start = (currentPage - 1) * normalizedPageSize;

  return {
    items: normalizedItems.slice(start, start + normalizedPageSize),
    currentPage,
    totalPages,
    totalItems,
  };
}
```

- [ ] **Step 4: Ejecutar la prueba enfocada y las regresiones**

Run: `npx vitest run tests/vase-editor-piquim-category-tree.test.ts tests/vase-editor-catalog-stability.test.ts`

Expected: 2 archivos y 11 pruebas aprobados.

- [ ] **Step 5: Confirmar formato y crear commit**

```powershell
npx eslint apps/vase-editor/web/src/utils/piquimCatalogCategories.js tests/vase-editor-piquim-category-tree.test.ts
git diff --check
git add apps/vase-editor/web/src/utils/piquimCatalogCategories.js tests/vase-editor-piquim-category-tree.test.ts
git commit -m "feat: paginate Piquim catalog items"
```

Expected: los chequeos terminan con codigo 0; el commit incluye solamente la utilidad y su prueba.

### Task 2: Paginar el resultado filtrado en la interfaz Piquim

**Files:**
- Modify: `apps/vase-editor/web/src/pages/store/CatalogPage.jsx`
- Test: `tests/vase-editor-piquim-category-tree.test.ts`

- [ ] **Step 1: Escribir primero el contrato de interfaz que falla**

```ts
it("renders 20-item numbered pagination for Piquim subcatalogs", async () => {
  const source = await readFile(
    new URL("../apps/vase-editor/web/src/pages/store/CatalogPage.jsx", import.meta.url),
    "utf8",
  );

  expect(source).toContain("const PIQUIM_PAGE_SIZE = 20");
  expect(source).toContain("paginateCatalogItems(filteredProducts, catalogPage, PIQUIM_PAGE_SIZE)");
  expect(source).toContain('aria-label="Paginacion del catalogo"');
  expect(source).toContain('label="Anterior"');
  expect(source).toContain('label="Siguiente"');
});
```

- [ ] **Step 2: Ejecutar la nueva prueba y confirmar el fallo**

Run: `npx vitest run tests/vase-editor-piquim-category-tree.test.ts -t "renders 20-item numbered pagination"`

Expected: FAIL porque la constante, la llamada a la utilidad y la navegacion Piquim no existen.

- [ ] **Step 3: Incorporar el estado y el calculo paginado**

Importar `paginateCatalogItems`, declarar `const PIQUIM_PAGE_SIZE = 20`, agregar `catalogPage` y un ref:

```jsx
const [catalogPage, setCatalogPage] = useState(1);
const catalogTopRef = useRef(null);

const paginatedProducts = useMemo(
  () => paginateCatalogItems(filteredProducts, catalogPage, PIQUIM_PAGE_SIZE),
  [catalogPage, filteredProducts]
);
```

Construir `sections` usando `paginatedProducts.items` en lugar de `filteredProducts`. Agregar `key={selectedSubcatalog.slug}` a `PiquimSubcatalogPage` para reiniciar el estado al cambiar de subcatalogo.

- [ ] **Step 4: Reiniciar la pagina desde cada interaccion de filtro**

Definir callbacks que actualicen el filtro y llamen `setCatalogPage(1)` en la misma interaccion:

```jsx
const handleQueryChange = (value) => {
  setQuery(value);
  setCatalogPage(1);
};

const toggleFilter = (setter, value) => {
  setter((current) => current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value]);
  setCatalogPage(1);
};

const handleStockChange = (value) => {
  setStockOnly(value);
  setCatalogPage(1);
};
```

Usar esos callbacks para texto, sugerencias, tipo, formato, sabor y stock. Los controles y las secciones deben usar siempre `paginatedProducts.currentPage`, que ya normaliza una pagina fuera de rango sin escribir estado desde un efecto.

- [ ] **Step 5: Renderizar la navegacion numerada accesible**

Agregar debajo de las secciones, cuando `paginatedProducts.totalPages > 1`, un `nav aria-label="Paginacion del catalogo"`. Reutilizar `PaginationButton` para anterior y siguiente; renderizar primera, ultima y paginas cercanas a la activa con `...` entre rangos. Cada boton numerado incluye:

```jsx
aria-label={`Pagina ${pageNumber}`}
aria-current={pageNumber === paginatedProducts.currentPage ? "page" : undefined}
```

El cambio de pagina pasa por:

```jsx
const handlePageChange = (nextPage) => {
  setCatalogPage(nextPage);
  requestAnimationFrame(() => {
    catalogTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};
```

Vincular `catalogTopRef` al encabezado del area de productos y mostrar el rango visible, por ejemplo `21-40 de 45 productos`.

- [ ] **Step 6: Ejecutar pruebas**

Run: `npx vitest run tests/vase-editor-piquim-category-tree.test.ts tests/vase-editor-catalog-stability.test.ts`

Expected: 2 archivos y 12 pruebas aprobados, incluidos categorias, carga progresiva y paginacion.

- [ ] **Step 7: Validar lint y build**

```powershell
npx eslint apps/vase-editor/web/src/utils/piquimCatalogCategories.js tests/vase-editor-piquim-category-tree.test.ts
npm --prefix apps/vase-editor/web run build
git diff --check
```

Expected: codigo 0. Se aceptan solamente los avisos existentes de Browserslist desactualizado y bundle mayor a 500 kB.

- [ ] **Step 8: Crear el commit de interfaz**

```powershell
git add apps/vase-editor/web/src/pages/store/CatalogPage.jsx tests/vase-editor-piquim-category-tree.test.ts
git commit -m "feat: paginate Piquim catalog results"
```

Expected: el commit no incluye `apps/vase-labs/app/api/v1/inbox/[tenantSlug]/conversations/route.ts` ni archivos generados de `dist`.

### Task 3: Verificacion final del branch

**Files:**
- Verify: `apps/vase-editor/web/src/pages/store/CatalogPage.jsx`
- Verify: `apps/vase-editor/web/src/utils/piquimCatalogCategories.js`
- Verify: `tests/vase-editor-piquim-category-tree.test.ts`

- [ ] **Step 1: Ejecutar el conjunto final**

```powershell
npx vitest run tests/vase-editor-piquim-category-tree.test.ts tests/vase-editor-catalog-stability.test.ts
npm --prefix apps/vase-editor/web run build
```

Expected: 2 archivos y 12 pruebas aprobados; Vite genera el bundle de produccion.

- [ ] **Step 2: Comprobar alcance y limpieza**

```powershell
git diff --check HEAD~2..HEAD
git status --short
git log -4 --oneline
```

Expected: solamente permanece el cambio ajeno preexistente de `vase-labs` en el checkout principal; los dos commits de implementacion aparecen encima del commit del plan.

