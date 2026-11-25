// El código está repartido por tema en la carpeta page/. Este archivo solo lo junta.
// partes: ./page/platform-features.ts, ./page/VaseLabsPage.tsx
import { JsonLd } from "@/components/seo/json-ld";
import { pageMetadata, softwareJsonLd } from "@/config/seo";
import VaseLabsPage from "./page/VaseLabsPage";

export const metadata = pageMetadata("/vaselabs");

/** Página de Vase Labs, con los datos del producto para Google. */
export default function Page() {
  return (
    <>
      <JsonLd data={softwareJsonLd("/vaselabs", "Vase Labs", "CommunicationApplication")} />
      <VaseLabsPage />
    </>
  );
}
