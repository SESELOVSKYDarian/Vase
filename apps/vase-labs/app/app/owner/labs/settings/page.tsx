import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LabsSettingsTabs } from "./settings-tabs";
import { VaseSettingsFrame } from "./vase-settings-frame";

export const dynamic = "force-dynamic";

/**
 * Ajustes de Labs: Mi perfil, Mi negocio y Facturación, la pantalla de tu cuenta de Vase adentro de Labs.
 * Lo propio de Labs (plan de uso, canales, motor de IA y puntaje) pasó a Configuraciones: los links
 * viejos (sin pestaña o con ?attempt= de la conexión con Meta) llegan ahí.
 */
export default async function LabsSettingsPage({ searchParams }: { searchParams: Promise<{ attempt?: string; tab?: string }> }) {
  const query = await searchParams;
  const tab = query.tab === "negocio" || query.tab === "facturacion" || query.tab === "perfil" ? query.tab : null;
  if (!tab) {
    redirect(query.attempt ? `/owner/configuraciones?attempt=${encodeURIComponent(query.attempt)}` : "/owner/configuraciones");
  }
  const theme = (await cookies()).get("vase_theme")?.value === "dark" ? "dark" : "light";
  return (
    <div className="vpa-stack" style={{ gap: 20 }}>
      <LabsSettingsTabs active={tab} />
      <VaseSettingsFrame tab={tab} theme={theme} />
    </div>
  );
}
