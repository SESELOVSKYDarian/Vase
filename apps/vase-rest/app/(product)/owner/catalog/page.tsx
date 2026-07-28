"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";

type Category = {
  id: string;
  name: string;
  products: Array<{
    id: string;
    sku: string;
    name: string;
    available: boolean;
    prices: Array<{ scopeType: string; amount: string; currency: string }>;
  }>;
};

export default function OwnerCatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  async function refresh() {
    const response = await fetch("/api/v1/catalog", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setCategories(payload.categories);
  }
  useEffect(() => { void refresh().catch((cause) => setError(String(cause))); }, []);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/catalog", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "CREATE_CATEGORY",
        code: form.get("code"),
        name: form.get("name"),
        sortOrder: Number(form.get("sortOrder") ?? 0),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error);
      return;
    }
    event.currentTarget.reset();
    await refresh();
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Catálogo canónico</p>
      <h1>Productos y recetas</h1>
      <form className="inline-form" onSubmit={createCategory}>
        <label>Código<input name="code" required /></label>
        <label>Nombre de categoría<input name="name" required /></label>
        <input name="sortOrder" type="hidden" value="0" />
        <button className="button button-primary">Crear categoría</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">
        {categories.map((category) => (
          <section className="ui-card" key={category.id}>
            <h2>{category.name}</h2>
            {category.products.map((product) => (
              <article key={product.id}>
                <code>{product.sku}</code>
                <strong>{product.name}</strong>
                <Badge>{product.prices[0]
                  ? `${product.prices[0].currency} ${product.prices[0].amount} · ${product.prices[0].scopeType}`
                  : "Sin precio configurado"}</Badge>
              </article>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
