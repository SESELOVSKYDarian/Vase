// Logo de la tienda servido desde el mismo dominio de la tienda.
// Trae el logo de uploads.vase.ar, le recorta el margen transparente (así se ve más grande)
// y avisa si es claro u oscuro (cabecera X-Logo-Tone). Por venir del mismo dominio, el navegador
// también lo puede medir. Solo acepta imágenes de uploads.vase.ar: no sirve para traer cualquier cosa.
import express from 'express';
import { isAllowedLogoUrl, loadLogoBuffer, prepareTrimmedLogo } from '../services/logoImage.js';

export { isAllowedLogoUrl };
export const storefrontLogoRouter = express.Router();

const CACHE_LIMIT = 60;
const cache = new Map();

storefrontLogoRouter.get('/logo', async (req, res) => {
  const url = String(req.query.u || '');
  if (!isAllowedLogoUrl(url)) return res.status(400).json({ error: 'logo_url_not_allowed' });
  try {
    let entry = cache.get(url);
    if (!entry) {
      const buffer = await loadLogoBuffer(url);
      if (!buffer) throw new Error('LOGO_NOT_AVAILABLE');
      entry = await prepareTrimmedLogo(buffer);
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
      cache.set(url, entry);
    }
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('X-Logo-Tone', entry.tone);
    return res.send(entry.body);
  } catch (error) {
    console.warn('[storefront-logo] no se pudo preparar el logo', error instanceof Error ? error.message : error);
    // Si algo falla, la tienda usa el logo original.
    return res.redirect(302, url);
  }
});
