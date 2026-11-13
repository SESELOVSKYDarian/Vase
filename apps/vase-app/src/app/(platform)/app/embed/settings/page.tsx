import { EmbedFrame } from "@/components/layout/embed-frame";
import { SettingsBody, loadSettingsContext } from "../../settings/settings-content";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/**
 * Ajustes de tu cuenta (Mi perfil, Mi negocio, Facturación) para mostrar adentro de Business, Labs
 * y el resto de los productos, sin mandar a la persona a app.vase.ar. Es la misma pantalla que en app.
 * tenant: la cuenta que el producto tiene abierta. theme: claro u oscuro, como el producto.
 */
export default async function EmbeddedSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const tenant = one(query.tenant).trim().slice(0, 80) || undefined;
  const theme = one(query.theme) === "dark" ? "dark" : "light";
  const ctx = await loadSettingsContext(query.tab, tenant);

  const tabHref = (tab: string) => {
    const params = new URLSearchParams({ tab, theme });
    if (tenant) params.set("tenant", tenant);
    return `/app/embed/settings?${params.toString()}`;
  };

  return (
    <EmbedFrame theme={theme}>
      <SettingsBody ctx={ctx} tabHref={tabHref} embed />
    </EmbedFrame>
  );
}
