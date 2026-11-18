import { LabsSettingsSections } from "../settings/labs-settings-sections";

export const dynamic = "force-dynamic";

/** Configuraciones de Labs: plan de uso, canales, motor de IA y puntaje de interés. */
export default async function LabsConfiguracionesPage({ searchParams }: { searchParams: Promise<{ attempt?: string }> }) {
  const query = await searchParams;
  return (
    <div className="vpa-stack" style={{ gap: 20 }}>
      <LabsSettingsSections attempt={query.attempt} />
    </div>
  );
}
