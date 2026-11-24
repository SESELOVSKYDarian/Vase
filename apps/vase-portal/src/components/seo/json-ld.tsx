import { jsonLdScript } from "@/config/seo";

/** Datos estructurados para Google (schema.org). El contenido sale de nuestra configuración, no del usuario. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />;
}
