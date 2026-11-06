// Ficha técnica (PDF) de un producto: se guarda en data.spec_sheet y la tienda muestra un botón para descargarla.
// Solo se aceptan links http(s): un link con otro esquema (javascript:, data:) se descarta.
export function normalizeSpecSheet(value) {
  if (!value || typeof value !== 'object') return null;
  const url = String(value.url || '').trim();
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const name = String(value.name || '').trim().slice(0, 140) || decodeURIComponent(parsed.pathname.split('/').pop() || 'ficha-tecnica.pdf');
  const size = Number(value.size);
  return {
    url: parsed.toString(),
    name,
    ...(Number.isFinite(size) && size > 0 ? { size: Math.round(size) } : {}),
  };
}
