import Link from "next/link";
import type { Route } from "next";
import { Camera, CircleCheck, PackageX, ShoppingBag, Store, UserCheck, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getSharedCatalog, getSharedCustomers, getSharedOrders } from "@/server/services/business-shared";

type Opportunity = { id: string; icon: LucideIcon; tone: "r" | "y" | "g" | "b"; title: string; detail: string; action: string; href: string };

const plural = (count: number, one: string, many: string) => `${count.toLocaleString("es-AR")} ${count === 1 ? one : many}`;

/**
 * Oportunidades de Inicio: cosas concretas que podés hacer hoy para vender más, sacadas de tus datos
 * (catálogo, pedidos, clientes y Mi negocio). Si Business no contesta, se arma con lo que haya.
 */
export async function Opportunities({ tenantId, hasBusiness }: { tenantId: string; hasBusiness: boolean }) {
  const [catalog, orders, customers, info, branches] = await Promise.all([
    hasBusiness ? getSharedCatalog(tenantId) : Promise.resolve(null),
    hasBusiness ? getSharedOrders(tenantId) : Promise.resolve(null),
    hasBusiness ? getSharedCustomers(tenantId) : Promise.resolve(null),
    prisma.tenantBusinessInfo.findUnique({ where: { tenantId }, select: { logoUrl: true, whatsapp: true, phone: true } }),
    prisma.tenantBranch.count({ where: { tenantId } }),
  ]);

  const list: Opportunity[] = [];
  if (orders && orders.open > 0) {
    list.push({ id: "pedidos", icon: ShoppingBag, tone: "b", title: `${plural(orders.open, "pedido espera", "pedidos esperan")} que lo atiendas`, detail: "Nuevos, por cobrar o preparando. Responder rápido hace que vuelvan a comprarte.", action: "Ver pedidos", href: "/app/pedidos" });
  }
  if (catalog && catalog.total === 0) {
    list.push({ id: "catalogo", icon: PackageX, tone: "y", title: "Tu catálogo está vacío", detail: "Cargá tus productos una vez y aparecen en tu tienda y en lo que responde la IA.", action: "Cargar productos", href: "/app/catalogo" });
  }
  if (catalog && catalog.outOfStock > 0) {
    list.push({ id: "stock", icon: PackageX, tone: "r", title: `${plural(catalog.outOfStock, "producto está", "productos están")} sin stock`, detail: "Si los reponés, vuelven a mostrarse como disponibles.", action: "Ver cuáles", href: "/app/catalogo?f=sinstock" });
  }
  if (catalog && catalog.withoutImage > 0) {
    list.push({ id: "fotos", icon: Camera, tone: "y", title: `${plural(catalog.withoutImage, "producto no tiene", "productos no tienen")} foto`, detail: "Con foto se venden más. Sumalas desde Business.", action: "Ver cuáles", href: "/app/catalogo?f=sinfoto" });
  }
  const pendingCustomers = customers?.items.filter((item) => item.pending).length ?? 0;
  if (pendingCustomers > 0) {
    list.push({ id: "clientes", icon: UserCheck, tone: "y", title: `${plural(pendingCustomers, "cliente espera", "clientes esperan")} tu aprobación`, detail: "Se registraron como mayoristas y no pueden ver precios hasta que los apruebes.", action: "Ver clientes", href: "/app/clientes" });
  }
  if (!info?.logoUrl || !(info?.whatsapp || info?.phone) || branches === 0) {
    list.push({ id: "negocio", icon: Store, tone: "g", title: "Completá los datos de tu negocio", detail: "Logo, WhatsApp y sucursales: los usan tu tienda y la IA para responder.", action: "Completar", href: "/app/negocio" });
  }

  return (
    <section aria-label="Oportunidades">
      <div className="vpa-hmh">
        <h2>Oportunidades</h2>
      </div>
      <div className="vpa-opps">
        {list.length === 0 ? (
          <div className="vpa-opp">
            <span className="ic g" aria-hidden="true">
              <CircleCheck size={20} />
            </span>
            <span className="vpa-g1">
              <b>Todo en orden</b>
              <span>No hay nada pendiente. Te avisamos acá cuando aparezca algo para mejorar.</span>
            </span>
          </div>
        ) : (
          list.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <div className="vpa-opp" key={item.id}>
                <span className={`ic ${item.tone}`} aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className="vpa-g1">
                  <b>{item.title}</b>
                  <span>{item.detail}</span>
                </span>
                <Link href={item.href as Route} className="vpa-btn line sm">
                  {item.action}
                </Link>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

/** Lo que se ve mientras llegan las oportunidades. */
export function OpportunitiesSkeleton() {
  return (
    <section aria-label="Oportunidades" aria-busy="true">
      <div className="vpa-hmh">
        <h2>Oportunidades</h2>
      </div>
      <div className="vpa-opps">
        {[0, 1].map((key) => (
          <div className="vpa-opp" key={key}>
            <span className="vpa-sk" style={{ width: 42, height: 42, borderRadius: 13 }} />
            <span className="vpa-g1" style={{ gap: 6, display: "flex", flexDirection: "column", flex: 1 }}>
              <span className="vpa-sk" style={{ width: "55%", height: 14, borderRadius: 6 }} />
              <span className="vpa-sk" style={{ width: "80%", height: 12, borderRadius: 6 }} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
