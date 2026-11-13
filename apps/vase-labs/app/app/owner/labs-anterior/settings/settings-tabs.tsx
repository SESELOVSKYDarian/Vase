import Link from "next/link";
import { LABS_SETTINGS_TABS } from "../labs-owner-nav";

type LocalTab = "labs" | "negocio" | "perfil" | "facturacion";

/** Las mismas pestañas de Ajustes que en tu cuenta de Vase. Todas se ven acá, sin salir de Labs. */
export function LabsSettingsTabs({ active = "labs" }: { active?: LocalTab }) {
  return (
    <div className="vpa-seg" role="tablist" aria-label="Ajustes">
      {LABS_SETTINGS_TABS.map((item) =>
        item.href.startsWith("/") ? (
          <Link key={item.id} role="tab" aria-selected={item.id === active} href={item.href as never} className={item.id === active ? "on" : ""}>
            {item.label}
          </Link>
        ) : (
          <a key={item.id} role="tab" aria-selected={false} href={item.href}>
            {item.label}
          </a>
        ),
      )}
    </div>
  );
}
