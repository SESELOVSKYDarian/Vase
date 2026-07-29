"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";

type Ingredient = { id: string; name: string; baseUnit: string };
type Scope = { id: string; name: string };
type ModifierGroup = {
  id: string; name: string;
  options: Array<{ id: string; name: string; priceDelta: string }>;
};
type Product = {
  id: string; sku: string; name: string; available: boolean; revision: number;
  taxRate: string; taxIncluded: boolean;
  prices: Array<{ scopeType: string; scopeId: string; amount: string; currency: string; revision: number }>;
  recipeItems: Array<{ ingredientId: string; quantity: string; unit: string }>;
  branchAvailability: Array<{ branchId: string; available: boolean; revision: number }>;
  modifierGroups: Array<{ modifierGroupId: string }>;
};
type Category = { id: string; name: string; products: Product[] };

export default function OwnerCatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [branches, setBranches] = useState<Scope[]>([]);
  const [branchGroups, setBranchGroups] = useState<Scope[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/v1/catalog", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setCategories(payload.categories);
    setIngredients(payload.ingredients);
    setBranches(payload.branches);
    setBranchGroups(payload.branchGroups);
    setModifierGroups(payload.modifierGroups);
  }, []);
  useEffect(() => { void refresh().catch((cause) => setError(String(cause))); }, [refresh]);

  async function command(body: Record<string, unknown>) {
    setError("");
    const response = await fetch("/api/v1/catalog", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return false; }
    await refresh();
    return true;
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (await command({
      action: "CREATE_CATEGORY", code: form.get("code"),
      name: form.get("name"), sortOrder: 0,
    })) event.currentTarget.reset();
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (await command({
      action: "CREATE_PRODUCT", categoryId: form.get("categoryId"),
      sku: form.get("sku"), name: form.get("name"),
      description: String(form.get("description") ?? "") || undefined,
      available: true, taxRate: form.get("taxRate"), taxIncluded: true,
    })) event.currentTarget.reset();
  }

  async function setPrice(event: FormEvent<HTMLFormElement>, product: Product) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scopeType = String(form.get("scopeType"));
    const scopeId = scopeType === "TENANT" ? "TENANT_CONTEXT" : String(form.get("scopeId"));
    const current = product.prices.find((price) =>
      price.scopeType === scopeType &&
      (scopeType === "TENANT" || price.scopeId === scopeId));
    await command({
      action: "SET_PRICE", productId: product.id, scopeType,
      scopeId: scopeType === "TENANT"
        ? product.prices.find((price) => price.scopeType === "TENANT")?.scopeId ??
          // The API replaces this sentinel with the authenticated tenant below.
          "AUTHENTICATED_TENANT"
        : scopeId,
      amount: form.get("amount"), currency: "ARS",
      expectedRevision: current?.revision ?? 0,
    });
  }

  const allProducts = categories.flatMap((category) => category.products);
  return (
    <main className="product-content">
      <p className="eyebrow">Catálogo canónico</p><h1>Productos, recetas y precios</h1>
      <section className="ui-card">
        <h2>Categorías y productos</h2>
        <form className="inline-form" onSubmit={createCategory}>
          <label>Código<input name="code" required /></label>
          <label>Categoría<input name="name" required /></label>
          <button className="button button-primary">Crear categoría</button>
        </form>
        <form className="inline-form" onSubmit={createProduct}>
          <label>Categoría<select name="categoryId" required><option value="">Seleccionar</option>
            {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
          </select></label>
          <label>SKU<input name="sku" required /></label><label>Producto<input name="name" required /></label>
          <label>Descripción<input name="description" /></label>
          <label>IVA<select name="taxRate" defaultValue="21.00">
            {["0.00", "2.50", "5.00", "10.50", "21.00", "27.00"].map((rate) =>
              <option value={rate} key={rate}>{rate}%</option>)}
          </select></label>
          <button className="button button-primary">Crear producto</button>
        </form>
      </section>
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">{categories.map((category) => (
        <section className="ui-card" key={category.id}><h2>{category.name}</h2>
          {category.products.map((product) => <article key={product.id}>
            <code>{product.sku}</code><strong>{product.name}</strong>
            <Badge>IVA {product.taxRate}% · {product.available ? "Disponible" : "Pausado"}</Badge>
            <form className="inline-form" onSubmit={(event) => void setPrice(event, product)}>
              <label>Alcance<select name="scopeType" defaultValue="TENANT">
                <option value="TENANT">Todo el negocio</option>
                <option value="BRANCH_GROUP">Grupo</option><option value="BRANCH">Sucursal</option>
              </select></label>
              <label>Grupo/sucursal<select name="scopeId"><option value="">No aplica al negocio completo</option>
                <optgroup label="Grupos">{branchGroups.map((scope) =>
                  <option value={scope.id} key={scope.id}>{scope.name}</option>)}</optgroup>
                <optgroup label="Sucursales">{branches.map((scope) =>
                  <option value={scope.id} key={scope.id}>{scope.name}</option>)}</optgroup>
              </select></label>
              <label>ARS<input name="amount" inputMode="decimal" pattern="\d+\.\d{2}" required /></label>
              <button className="button">Guardar precio</button>
            </form>
            <form className="inline-form" onSubmit={(event) => {
              event.preventDefault(); const form = new FormData(event.currentTarget);
              const items = ingredients.flatMap((ingredient) => {
                const quantity = String(form.get(`ingredient:${ingredient.id}`) ?? "").trim();
                return quantity && Number(quantity) > 0
                  ? [{ ingredientId: ingredient.id, quantity, unit: ingredient.baseUnit }]
                  : [];
              });
              void command({
                action: "REPLACE_RECIPE", productId: product.id,
                expectedRevision: product.revision,
                scopeType: form.get("scopeType"),
                scopeId: String(form.get("scopeId") ?? "") || undefined,
                items,
              });
            }}>
              <label>Receta para<select name="scopeType" defaultValue="TENANT">
                <option value="TENANT">Todo el negocio</option>
                <option value="BRANCH_GROUP">Grupo</option>
                <option value="BRANCH">Sucursal</option>
              </select></label>
              <label>Grupo/sucursal<select name="scopeId"><option value="">No aplica al negocio completo</option>
                <optgroup label="Grupos">{branchGroups.map((scope) =>
                  <option value={scope.id} key={scope.id}>{scope.name}</option>)}</optgroup>
                <optgroup label="Sucursales">{branches.map((scope) =>
                  <option value={scope.id} key={scope.id}>{scope.name}</option>)}</optgroup>
              </select></label>
              {ingredients.map((item) => <label key={item.id}>{item.name} ({item.baseUnit})
                <input name={`ingredient:${item.id}`} inputMode="decimal"
                  defaultValue={product.recipeItems.find((recipe) =>
                    recipe.ingredientId === item.id &&
                    (recipe as typeof recipe & { scopeType?: string }).scopeType === "TENANT"
                  )?.quantity ?? ""} />
              </label>)}
              <button className="button">Reemplazar receta</button>
            </form>
            <button className="button" onClick={() => void command({
              action: "UPDATE_PRODUCT", productId: product.id,
              expectedRevision: product.revision, available: !product.available,
            })}>{product.available ? "Pausar" : "Activar"}</button>
            <form className="inline-form" onSubmit={(event) => {
              event.preventDefault(); const form = new FormData(event.currentTarget);
              const branchId = String(form.get("branchId"));
              const current = product.branchAvailability.find((item) =>
                item.branchId === branchId);
              void command({
                action: "SET_BRANCH_AVAILABILITY", productId: product.id,
                branchId, available: form.get("available") === "true",
                expectedRevision: current?.revision ?? 0,
              });
            }}>
              <label>Sucursal<select name="branchId" required>{branches.map((branch) =>
                <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label>
              <label>Disponibilidad<select name="available">
                <option value="true">Disponible</option><option value="false">Oculto</option>
              </select></label>
              <button className="button">Guardar disponibilidad</button>
            </form>
          </article>)}
        </section>
      ))}</div>
      <section className="ui-card"><h2>Modificadores</h2>
        <form className="inline-form" onSubmit={(event) => {
          event.preventDefault(); const form = new FormData(event.currentTarget);
          void command({
            action: "CREATE_MODIFIER_GROUP", code: form.get("code"), name: form.get("name"),
            minSelections: Number(form.get("minSelections")), maxSelections: Number(form.get("maxSelections")),
          }).then((ok) => { if (ok) event.currentTarget.reset(); });
        }}>
          <label>Código<input name="code" required /></label><label>Grupo<input name="name" required /></label>
          <label>Mínimo<input name="minSelections" type="number" min="0" defaultValue="0" /></label>
          <label>Máximo<input name="maxSelections" type="number" min="1" defaultValue="1" /></label>
          <button className="button button-primary">Crear grupo</button>
        </form>
        <form className="inline-form" onSubmit={(event) => {
          event.preventDefault(); const form = new FormData(event.currentTarget);
          void command({
            action: "CREATE_MODIFIER_OPTION", modifierGroupId: form.get("modifierGroupId"),
            code: form.get("code"), name: form.get("name"), priceDelta: form.get("priceDelta"),
          }).then((ok) => { if (ok) event.currentTarget.reset(); });
        }}>
          <label>Grupo<select name="modifierGroupId" required>{modifierGroups.map((group) =>
            <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
          <label>Código<input name="code" required /></label><label>Opción<input name="name" required /></label>
          <label>Variación ARS<input name="priceDelta" defaultValue="0.00" pattern="-?\d+\.\d{2}" required /></label>
          <button className="button">Agregar opción</button>
        </form>
        <form className="inline-form" onSubmit={(event) => {
          event.preventDefault(); const form = new FormData(event.currentTarget);
          void command({
            action: "LINK_MODIFIER_GROUP", productId: form.get("productId"),
            modifierGroupId: form.get("modifierGroupId"), sortOrder: 0,
          });
        }}>
          <label>Producto<select name="productId" required>{allProducts.map((product) =>
            <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
          <label>Grupo<select name="modifierGroupId" required>{modifierGroups.map((group) =>
            <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
          <button className="button">Asignar al producto</button>
        </form>
      </section>
    </main>
  );
}
