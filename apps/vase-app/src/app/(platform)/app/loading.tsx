import { PanelShellSkeleton } from "@vase/ui/panel";
import "@vase/ui/panel.css";

// Lo que se ve al instante al entrar o cambiar de sección del panel, mientras el servidor arma la página.
// Dibuja el marco completo (menú, barra y contenido en gris) porque acá cada página trae su propio menú.
export default function PanelLoading() {
  return <PanelShellSkeleton />;
}
