import Link from "next/link";
import type { Route } from "next";
import { CircleHelp, ClipboardCheck, Settings2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { NavLink } from "@/components/layout/nav-link";
import { ProductArt } from "@/components/panel/product-art";
import { PANEL_PRODUCTS, panelProductHref } from "@/components/panel/products";
import type { PlatformModuleAccess, PlatformModuleKey } from "@/config/modules";
import { BUSINESS_LAUNCH_PATH } from "@/lib/business/links";
import type { ShellNotification } from "@/server/services/labs-notifications";

function hrefFor(key: PlatformModuleKey) {
  // La pantalla de Business es solo del Dueño; el resto entra directo al editor.
  return key === "business" ? BUSINESS_LAUNCH_PATH : panelProductHref(key);
}

/** Inicio para Encargado y Miembro: solo sus productos y lo que puede usar. */
export function TeamHome({
  role,
  tenantName,
  userName,
  modules,
  notifications,
}: {
  role: "MANAGER" | "MEMBER";
  tenantName: string;
  userName: string;
  modules: PlatformModuleAccess[];
  notifications: ShellNotification[];
}) {
  // El editor de Business no admite el rol Miembro.
  const visible = modules.filter((module) => module.isActive && (role === "MANAGER" || module.key !== "business"));
  const firstName = userName.trim().split(/\s+/)[0];

  return (
    <AppShell
      title={firstName ? `Hola, ${firstName}` : "Hola"}
      subtitle="¿A dónde querés ir?"
      tenantLabel={tenantName}
      modules={modules}
      notifications={notifications}
      currentUserName={userName}
      viewerRole={role}
    >
      <div className="vpa-hm">
        <section aria-label="Tus productos">
          <div className="vpa-hmh">
            <h2>Tus productos</h2>
          </div>
          {visible.length === 0 ? (
            <div className="vpa-empty">Todavía no tenés productos asignados. Pedíselo al dueño de la cuenta.</div>
          ) : (
            <div className="vpa-tiles">
              {visible.map((module) => {
                const product = PANEL_PRODUCTS[module.key];
                return (
                  <NavLink
                    key={module.key}
                    href={hrefFor(module.key)}
                    className="vpa-tile"
                    style={{ background: product.artBg, color: product.artTx }}
                    forceDocumentNavigation={module.key === "management" || module.key === "business"}
                  >
                    <span className="vpa-tcopy">
                      <b>{product.name}</b>
                      <span className="d">{product.short}</span>
                      <span className="goin">Entrar</span>
                    </span>
                    <span className="vpa-tart" aria-hidden="true">
                      <ProductArt product={module.key} variant="tile" />
                    </span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </section>
        <section aria-label="Tu cuenta">
          <div className="vpa-hmh">
            <h2>Tu cuenta</h2>
          </div>
          <div className="vpa-quick">
            {role === "MANAGER" ? (
              <Link href={"/app/owner/customizations" as Route} className="vpa-qk">
                <span className="ic" aria-hidden="true">
                  <ClipboardCheck size={20} />
                </span>
                <span>
                  <b>Trabajos a medida</b>
                  <span className="t">Pedidos y reuniones</span>
                </span>
              </Link>
            ) : null}
            <Link href={"/app/help" as Route} className="vpa-qk">
              <span className="ic" aria-hidden="true">
                <CircleHelp size={20} />
              </span>
              <span>
                <b>Ayuda y soporte</b>
                <span className="t">Guías y videos</span>
              </span>
            </Link>
            <Link href={"/app/settings" as Route} className="vpa-qk">
              <span className="ic" aria-hidden="true">
                <Settings2 size={20} />
              </span>
              <span>
                <b>Ajustes</b>
                <span className="t">Tu perfil</span>
              </span>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
