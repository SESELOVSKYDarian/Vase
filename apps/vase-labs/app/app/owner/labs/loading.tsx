import { PanelContentSkeleton } from "@vase/ui/panel";

// Lo que se ve al instante al cambiar de sección en Labs. El menú ya está dibujado: solo carga el contenido.
export default function LabsLoading() {
  return <PanelContentSkeleton />;
}
