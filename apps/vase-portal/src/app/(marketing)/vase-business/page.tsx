// El código está repartido por tema en la carpeta page/. Este archivo solo lo junta.
// partes: ./page/pillars.ts, ./page/VaseBusinessPage.tsx
import { JsonLd } from "@/components/seo/json-ld";
import { pageMetadata, softwareJsonLd } from "@/config/seo";
import VaseBusinessPage from "./page/VaseBusinessPage";

export const metadata = pageMetadata("/vase-business");

export default function Page() {
  return (
    <>
      <JsonLd data={softwareJsonLd("/vase-business", "Vase Business", "BusinessApplication")} />
      <VaseBusinessPage />
    </>
  );
}
