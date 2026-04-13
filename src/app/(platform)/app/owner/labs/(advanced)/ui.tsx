import { PanelCard } from "@/components/ui/panel-card";

export function LabsModuleDisabledCard() {
  return (
    <PanelCard
      eyebrow="Modulo no activo"
      title="VaseLabs no esta habilitado en este tenant"
      description="Este tenant fue creado sin Labs. Puedes activarlo desde onboarding comercial o creando una cuenta con Labs."
    />
  );
}
