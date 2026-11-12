import Link from "next/link";
import { LABS_SETTINGS_TABS } from "../labs-owner-nav";

/** Las mismas pestañas de Ajustes que en tu cuenta de Vase, con la de Labs prendida. */
export function LabsSettingsTabs() {
  return (
    <div className="vpa-seg" role="tablist" aria-label="Ajustes">
      {LABS_SETTINGS_TABS.map((item) =>
        item.id === "labs" ? (
          <Link key={item.id} role="tab" aria-selected href={item.href as never} className="on">
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
