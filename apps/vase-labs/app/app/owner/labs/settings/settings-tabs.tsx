"use client";

import Link from "next/link";
import { CreditCard, Store, UserRound } from "lucide-react";
import { PanelSettingsTabs, type SettingsTabItem } from "@vase/ui/panel";
import { LABS_SETTINGS_TABS } from "../labs-owner-nav";

type LocalTab = "negocio" | "perfil" | "facturacion";

const DETAILS: Record<LocalTab, Pick<SettingsTabItem, "hint" | "icon" | "info">> = {
  perfil: { hint: "Tus datos y apariencia", icon: <UserRound size={18} /> },
  negocio: {
    hint: "Datos, sucursales y conexiones",
    icon: <Store size={18} />,
    info: "Lo cargás una vez y lo usan todos tus productos. Si cambiás algo acá, se actualiza en todos lados.",
  },
  facturacion: { hint: "Medios de pago y facturas", icon: <CreditCard size={18} /> },
};

/** Las mismas pestañas de Ajustes que en tu cuenta de Vase. Todas se ven acá, sin salir de Labs. */
export function LabsSettingsTabs({ active = "perfil" }: { active?: LocalTab }) {
  const items: SettingsTabItem[] = LABS_SETTINGS_TABS.map((tab) => ({ id: tab.id, label: tab.label, href: tab.href, ...DETAILS[tab.id] }));
  return (
    <PanelSettingsTabs
      items={items}
      active={active}
      renderLink={({ href, className, children, ariaCurrent }) => (
        <Link href={href as never} className={className} aria-current={ariaCurrent}>
          {children}
        </Link>
      )}
    />
  );
}
