// Ajustes de Labs para mostrar adentro de app.vase.ar (pestaña "Labs" de Ajustes), sin menú ni barra:
// se ven y se editan ahí mismo, sin salir a labs.vase.ar.
import "../../app/owner/labs/labs-panel.css";
import { LabsSettingsSections } from "../../app/owner/labs/settings/labs-settings-sections";
import { EmbedHeight } from "./embed-height";

export const dynamic = "force-dynamic";

export default async function EmbeddedLabsSettings({ searchParams }: { searchParams: Promise<{ attempt?: string }> }) {
  const { attempt } = await searchParams;
  return (
    <div className="vpa vpa-embed" style={{ display: "block", height: "auto", minHeight: 0, overflow: "visible", background: "transparent" }}>
      <EmbedHeight>
        <div className="lx">
          <div className="vpa-stack" style={{ gap: 20, padding: 2 }}>
            <LabsSettingsSections attempt={attempt} embed />
          </div>
        </div>
      </EmbedHeight>
    </div>
  );
}
