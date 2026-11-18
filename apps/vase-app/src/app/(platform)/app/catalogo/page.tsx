import Link from "next/link";
import type { Route } from "next";
import { RefreshCw, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CatalogSource } from "@/components/panel/catalog-source";
import { ExternalConnection } from "@/components/panel/external-connection";
import { PANEL_PRODUCTS, formatArs } from "@/components/panel/products";
import { prisma } from "@/lib/db/prisma";
import { PRODUCT_COLORS, formatShortDate, loadSharedContext } from "@/lib/business/shared-context";
import { getBusinessConnection } from "@/server/services/business-connection";
import { getSharedCatalog } from "@/server/services/business-shared";

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "sinstock", label: "Sin stock" },
  { id: "sinfoto", label: "Sin foto" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Catálogo compartido: los mismos productos para Business, Labs y Management. */
export default async function CatalogoPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const query = await searchParams;
  const search = one(query.q).trim().slice(0, 80);
  const filter: FilterId = FILTERS.find((item) => item.id === one(query.f))?.id ?? "todos";
  const { membership, session, dashboard, active, hasBusiness, hasManagement } = await loadSharedContext();
  const isOwner = membership.role === "OWNER";

  const [catalog, sourceRow] = await Promise.all([
    hasBusiness ? getSharedCatalog(membership.tenantId, search) : Promise.resolve(null),
    prisma.tenantDataSource.findUnique({ where: { tenantId_resource: { tenantId: membership.tenantId, resource: "CATALOG" } } }),
  ]);
  const externalSystem = sourceRow?.source === "EXTERNAL" ? sourceRow.externalSystem : null;
  const empty = !catalog || catalog.total === 0;
  const connection = empty && hasBusiness && catalog !== null ? await getBusinessConnection(membership.tenantId) : null;

  const items = (catalog?.items ?? []).filter((item) =>
    filter === "sinstock" ? (item.stock ?? 0) <= 0 : filter === "sinfoto" ? !item.hasImage : true,
  );
  const href = (next: { q?: string; f?: FilterId }) => {
    const params = new URLSearchParams();
    const q = next.q ?? search;
    const f = next.f ?? filter;
    if (q) params.set("q", q);
    if (f !== "todos") params.set("f", f);
    const text = params.toString();
    return (text ? `/app/catalogo?${text}` : "/app/catalogo") as Route;
  };
  const counts: Record<FilterId, number> = {
    todos: catalog?.total ?? 0,
    sinstock: catalog?.outOfStock ?? 0,
    sinfoto: catalog?.withoutImage ?? 0,
  };
  const lastSync = formatShortDate(catalog?.lastSyncAt ?? null);
  const fromSystem = (catalog?.fromSystem ?? 0) > 0;

  return (
    <AppShell
      title="Catálogo"
      subtitle={empty ? "Tus productos, los mismos en todos tus productos de Vase" : `${counts.todos.toLocaleString("es-AR")} productos · compartido por tus productos de Vase`}
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      viewerRole={membership.role}
    >
      {hasBusiness && catalog === null ? (
        <div className="vpa-empty">No pudimos traer tus productos de Vase Business. Probá de nuevo en un rato.</div>
      ) : empty && !search ? (
        <CatalogSource
          hasManagement={hasManagement}
          canEdit={isOwner}
          currentSystem={externalSystem}
          connection={hasBusiness ? <ExternalConnection connection={connection} canEdit={isOwner} systemName={externalSystem ?? "tu sistema"} /> : null}
        />
      ) : (
        <div className="vpa-stack" style={{ gap: 16 }}>
          <div className="vpa-src">
            <span className="vpa-g1">
              <b>{fromSystem ? `Tus productos salen de ${externalSystem ?? "tu sistema de gestión"}` : "Tus productos están cargados en Vase"}</b>
              <span>
                {fromSystem ? (
                  <>
                    <RefreshCw size={12} aria-hidden="true" style={{ verticalAlign: -1 }} /> Precio y stock se actualizan solos{lastSync ? ` · último envío ${lastSync}` : ""}
                  </>
                ) : (
                  "Los editás en Business y se actualizan en todos lados"
                )}
              </span>
            </span>
            <span className="vpa-srcuse" aria-label="Productos que usan este catálogo">
              {active
                .filter((module) => module.key in PRODUCT_COLORS)
                .map((module) => (
                  <b key={module.key} style={{ background: PRODUCT_COLORS[module.key] }}>
                    {PANEL_PRODUCTS[module.key].name.replace("Vase ", "")}
                  </b>
                ))}
            </span>
          </div>

          <div className="vpa-filt">
            <form className="vpa-search" action="/app/catalogo" role="search">
              <Search size={16} aria-hidden="true" />
              <input className="vpa-inp" type="search" name="q" defaultValue={search} placeholder="Buscar por nombre, código o marca" aria-label="Buscar productos" />
              {filter !== "todos" ? <input type="hidden" name="f" value={filter} /> : null}
            </form>
            <nav className="vpa-seg" aria-label="Filtrar productos">
              {FILTERS.map((item) => (
                <Link key={item.id} href={href({ f: item.id })} className={filter === item.id ? "on" : undefined} aria-current={filter === item.id ? "page" : undefined}>
                  {item.label} {counts[item.id].toLocaleString("es-AR")}
                </Link>
              ))}
            </nav>
            <Link href={"/app/business" as Route} className="vpa-btn acc">
              Editar en Business
            </Link>
          </div>

          <section className="vpa-card" style={{ padding: "12px 20px" }}>
            {items.length === 0 ? (
              <div className="vpa-empty" style={{ margin: "8px 0" }}>
                {search ? `No encontramos productos con “${search}”.` : "No hay productos con este filtro."}
              </div>
            ) : (
              <div className="vpa-tw">
                <table className="vpa-tbl">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Marca</th>
                      <th className="r">Precio</th>
                      <th className="r">Stock</th>
                      <th>Foto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="wrap">
                          <b>{item.name}</b>
                          {item.sku ? <span className="sub">Código {item.sku}</span> : null}
                        </td>
                        <td className="vpa-mut">{item.brand ?? "—"}</td>
                        <td className="r">{item.price == null ? "—" : formatArs(item.price)}</td>
                        <td className={(item.stock ?? 0) <= 0 ? "r low" : "r"}>{item.stock == null ? "—" : item.stock.toLocaleString("es-AR")}</td>
                        <td>
                          <span className={item.hasImage ? "vpa-tag g" : "vpa-tag y"}>
                            <i />
                            {item.hasImage ? "Tiene" : "Falta"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {counts.todos > items.length && filter === "todos" && !search ? (
            <p className="vpa-note">Mostramos los primeros {items.length.toLocaleString("es-AR")}. Usá el buscador para encontrar el resto.</p>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
