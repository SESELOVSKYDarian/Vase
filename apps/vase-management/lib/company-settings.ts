export type CompanySettingsForm = {
  logoData?: string | null;
  razonSocial?: string | null;
  cuit?: string | null;
  puntoVentaDefault?: number | null;
  arcaEnvironment?: "HOMOLOGACION" | "PRODUCCION" | null;
  arcaCuit?: string | null;
  arcaPuntoVenta?: number | null;
  arcaCertificate?: string | null;
  arcaPrivateKey?: string | null;
  deleteArcaCertificate?: boolean;
  deleteArcaPrivateKey?: boolean;
};

/** DTO de escritura: descarta de forma intencional toda metadata de sólo lectura. */
export function buildSettingsPayload(form: CompanySettingsForm, overrides: CompanySettingsForm = {}) {
  const source = { ...form, ...overrides };
  const text = (value: unknown) => typeof value === "string" ? value : undefined;
  const nullableText = (value: unknown) => value === null ? null : typeof value === "string" ? (value.trim() || null) : undefined;
  const secret = (value: unknown) => text(value)?.trim() || undefined;
  return {
    logoData: source.logoData === null || typeof source.logoData === "string" ? source.logoData : undefined,
    razonSocial: text(source.razonSocial),
    cuit: text(source.cuit),
    puntoVentaDefault: typeof source.puntoVentaDefault === "number" ? source.puntoVentaDefault : undefined,
    arcaEnvironment: source.arcaEnvironment === "HOMOLOGACION" || source.arcaEnvironment === "PRODUCCION" ? source.arcaEnvironment : undefined,
    // null means an explicit deletion; undefined means preserve the DB value.
    arcaCuit: nullableText(source.arcaCuit),
    arcaPuntoVenta: source.arcaPuntoVenta === null || typeof source.arcaPuntoVenta === "number" ? source.arcaPuntoVenta : undefined,
    arcaCertificate: secret(source.arcaCertificate),
    arcaPrivateKey: secret(source.arcaPrivateKey),
    deleteArcaCertificate: source.deleteArcaCertificate || undefined,
    deleteArcaPrivateKey: source.deleteArcaPrivateKey || undefined,
  };
}

export function formatSettingsFieldErrors(fields: Record<string, string[] | undefined> | undefined) {
  if (!fields) return "";
  const labels: Record<string, string> = { razonSocial: "Razón social", cuit: "CUIT de la empresa", puntoVentaDefault: "Punto de venta predeterminado", arcaCuit: "CUIT ARCA", arcaPuntoVenta: "Punto de venta ARCA", arcaEnvironment: "Ambiente ARCA" };
  return Object.entries(fields).flatMap(([key, messages]) => (messages ?? []).map((message) => `${labels[key] ?? key}: ${message}`)).join(" ");
}

