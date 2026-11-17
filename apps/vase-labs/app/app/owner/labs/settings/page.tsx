import { cookies } from "next/headers";
import { LabsSettingsSections } from "./labs-settings-sections";
import { LabsSettingsTabs } from "./settings-tabs";
import { VaseSettingsFrame } from "./vase-settings-frame";

export const dynamic = "force-dynamic";

/** Mi perfil, Mi negocio y Facturación: la pantalla de tu cuenta de Vase, adentro de Labs. */
async function AccountTab({ tab }: { tab: "perfil" | "negocio" | "facturacion" }) {
  const theme = (await cookies()).get("vase_theme")?.value === "dark" ? "dark" : "light";
  return (
    <div className="vpa-stack" style={{ gap: 20 }}>
      <LabsSettingsTabs active={tab} />
      <VaseSettingsFrame tab={tab} theme={theme} />
    </div>
  );
}

/** Ajustes de Labs: las pestañas de tu cuenta y, en "Labs", el plan de uso, canales, motor de IA y puntaje. */
export default async function LabsSettingsPage({ searchParams }: { searchParams: Promise<{ attempt?: string; tab?: string }> }) {
  const query = await searchParams;
  if (query.tab === "perfil" || query.tab === "negocio" || query.tab === "facturacion") return <AccountTab tab={query.tab} />;
  return (
    <div className="vpa-stack" style={{ gap: 20 }}>
      <LabsSettingsTabs />
      <LabsSettingsSections attempt={query.attempt} />
    </div>
  );
}
