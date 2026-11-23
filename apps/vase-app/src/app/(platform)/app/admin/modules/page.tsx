import type { Route } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { ADMIN_PRODUCTS } from "@/lib/admin/product-catalog";

function money(value: unknown, type: string) {
  const amount = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value));
  return type === "MONTHLY" ? `${amount}/mes` : type === "YEARLY" ? `${amount}/año` : amount;
}

/** Productos: los 4 productos de Vase. Cada uno tiene sus planes, precios y características. */
export default async function AdminProductsPage() {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const [modules, management, rest] = await Promise.all([
    prisma.module.findMany({
      where: { id: { in: ADMIN_PRODUCTS.map((product) => product.moduleId) } },
      select: {
        id: true,
        tenantLinks: { where: { isActive: true }, select: { id: true } },
        submodules: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: { name: true, pricing: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1, select: { price: true, type: true } } },
        },
        pricing: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1, select: { price: true, type: true } },
      },
    }),
    prisma.managementPricingVersion.findFirst({ where: { status: "PUBLISHED" }, orderBy: { version: "desc" }, select: { monthlyPrice: true } }),
    prisma.restPricingVersion.findMany({ where: { status: "PUBLISHED" }, select: { plan: true, monthlyPrice: true }, take: 4 }).catch(() => []),
  ]);

  return (
    <AppShell title="Productos" subtitle="Planes, precios y qué trae cada producto" tenantLabel="Admin">
      <div className="adm-prods">
        {ADMIN_PRODUCTS.map((product) => {
          const row = modules.find((item) => item.id === product.moduleId);
          const plans =
            product.id === "management"
              ? management
                ? [{ name: "Mensual", price: money(management.monthlyPrice, "MONTHLY") }]
                : []
              : product.id === "rest"
                ? rest.map((plan) => ({ name: String(plan.plan), price: money(plan.monthlyPrice, "MONTHLY") }))
                : (row?.submodules ?? []).map((plan) => ({ name: plan.name, price: plan.pricing[0] ? money(plan.pricing[0].price, plan.pricing[0].type) : "Sin precio" }));
          const single = !plans.length && row?.pricing[0] ? money(row.pricing[0].price, row.pricing[0].type) : null;
          return (
            <Link key={product.id} href={`/modules/${product.id}` as Route} className="adm-prod">
              <div className="adm-prod-h">
                <div className="vpa-g1">
                  <b>{product.name}</b>
                  <span>{product.tagline}</span>
                </div>
                <ChevronRight size={18} aria-hidden="true" style={{ color: "var(--mut)" }} />
              </div>
              <div className="adm-prod-facts">
                <div>
                  <small>Clientes</small>
                  <b>{row?.tenantLinks.length ?? 0}</b>
                </div>
                <div>
                  <small>Planes</small>
                  <b>{plans.length || (single ? 1 : 0)}</b>
                </div>
                <div>
                  <small>Características</small>
                  <b>{product.features.length}</b>
                </div>
              </div>
              <ul className="vpa-mut" style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 4, fontSize: 12.5 }}>
                {plans.length
                  ? plans.map((plan) => (
                      <li key={plan.name} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span>{plan.name}</span>
                        <b style={{ color: "var(--tx)" }}>{plan.price}</b>
                      </li>
                    ))
                  : <li>{single ?? "Sin precio cargado"}</li>}
              </ul>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
