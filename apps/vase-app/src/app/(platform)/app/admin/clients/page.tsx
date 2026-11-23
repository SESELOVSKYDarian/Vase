import type { Route } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { amountDue } from "@/lib/billing/mercadopago-rules";
import { ADMIN_BILLING_STATUS, ADMIN_PRODUCT_NAMES, adminMoney } from "@/lib/admin/labels";

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "deben", label: "Deben" },
  { id: "prueba", label: "En prueba" },
  { id: "aldia", label: "Al día" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Clientes: cada cuenta de Vase con sus productos, en qué estado está y cuánto debe. Tocás una y ves su ficha. */
export default async function AdminClientsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  try {
    await requireAdminPermission(adminPermissions.USERS);
  } catch {
    forbidden();
  }

  const query = await searchParams;
  const search = one(query.q).trim().slice(0, 80);
  const filter: FilterId = FILTERS.find((item) => item.id === one(query.f))?.id ?? "todos";
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [tenants, unpaid, newThisMonth] = await Promise.all([
    prisma.tenant.findMany({
      where: search ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }, { billingEmail: { contains: search } }] } : undefined,
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        name: true,
        industry: true,
        createdAt: true,
        status: true,
        subscription: { select: { billingStatus: true } },
        tenantModules: { where: { isActive: true }, select: { module: { select: { product: true } } } },
      },
    }),
    prisma.clientPayment.findMany({
      where: { paidAt: null, status: { not: "CANCELED" } },
      select: { tenantId: true, totalAmount: true, paidAmount: true, dueAt: true },
    }),
    prisma.tenant.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  const now = new Date().getTime();
  const debt = new Map<string, { amount: number; overdue: boolean }>();
  for (const row of unpaid) {
    const current = debt.get(row.tenantId) ?? { amount: 0, overdue: false };
    current.amount += amountDue(Number(row.totalAmount), Number(row.paidAmount));
    if (row.dueAt && row.dueAt.getTime() < now) current.overdue = true;
    debt.set(row.tenantId, current);
  }

  const rows = tenants
    .map((tenant) => {
      const owes = debt.get(tenant.id);
      const billing = tenant.subscription?.billingStatus ?? "TRIAL";
      const state = owes?.overdue ? ADMIN_BILLING_STATUS.PAST_DUE : (ADMIN_BILLING_STATUS[billing] ?? ADMIN_BILLING_STATUS.TRIAL);
      const products = [...new Set(tenant.tenantModules.map((row) => ADMIN_PRODUCT_NAMES[row.module.product] ?? row.module.product))];
      return { tenant, owes: owes?.amount ?? 0, billing, state, products };
    })
    .filter((row) =>
      filter === "deben" ? row.owes > 0 : filter === "prueba" ? row.billing === "TRIAL" : filter === "aldia" ? row.billing === "ACTIVE" && row.owes === 0 : true,
    );

  const href = (next: { q?: string; f?: FilterId }) => {
    const params = new URLSearchParams();
    const q = next.q ?? search;
    const f = next.f ?? filter;
    if (q) params.set("q", q);
    if (f !== "todos") params.set("f", f);
    const text = params.toString();
    return (text ? `/clients?${text}` : "/clients") as Route;
  };

  return (
    <AppShell
      title="Clientes"
      subtitle={`${tenants.length.toLocaleString("es-AR")} cuentas · ${newThisMonth} ${newThisMonth === 1 ? "nueva" : "nuevas"} este mes`}
      tenantLabel="Admin"
    >
      <div className="vpa-filt">
        <form className="vpa-search" action="/clients" role="search">
          <Search size={16} aria-hidden="true" />
          <input className="vpa-inp" type="search" name="q" defaultValue={search} placeholder="Buscar por nombre, cuenta o correo" aria-label="Buscar clientes" />
          {filter !== "todos" ? <input type="hidden" name="f" value={filter} /> : null}
        </form>
        <nav className="vpa-seg" aria-label="Filtrar clientes">
          {FILTERS.map((item) => (
            <Link key={item.id} href={href({ f: item.id })} className={filter === item.id ? "on" : undefined} aria-current={filter === item.id ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <section className="vpa-card" style={{ padding: "12px 20px" }}>
        {rows.length === 0 ? (
          <div className="vpa-empty" style={{ margin: "8px 0" }}>
            {search ? `No encontramos clientes con “${search}”.` : "No hay clientes con este filtro."}
          </div>
        ) : (
          <div className="vpa-tw">
            <table className="vpa-tbl">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Estado</th>
                  <th className="r">Debe</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ tenant, owes, state, products }) => (
                  <tr key={tenant.id}>
                    <td className="wrap">
                      <Link href={`/clients/${tenant.id}` as Route}>
                        <b>{tenant.name}</b>
                      </Link>
                      <span className="sub">
                        {tenant.industry || "Sin rubro"} · desde {new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" }).format(tenant.createdAt)}
                      </span>
                    </td>
                    <td className="vpa-mut">{products.length ? products.join(" · ") : "—"}</td>
                    <td>
                      <span className={`vpa-tag ${tenant.status === "SUSPENDED" ? "r" : state.cls}`}>
                        <i />
                        {tenant.status === "SUSPENDED" ? "Suspendida" : state.label}
                      </span>
                    </td>
                    <td className={owes > 0 ? "r low" : "r vpa-mut"}>{owes > 0 ? adminMoney(owes) : "—"}</td>
                    <td className="r">
                      <Link href={`/clients/${tenant.id}` as Route} className="vpa-btn line sm">
                        Ver ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
