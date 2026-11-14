// Límite de intentos en memoria, sin dependencias: frena probar contraseñas o códigos sin parar.
// Cuenta por IP y por lo que identifica al intento (por ejemplo, el correo). Con varios servidores
// cada uno lleva su cuenta; alcanza para frenar ataques simples.

export function createRateLimiter({ windowMs, max, keyOf = () => '', now = () => Date.now() }) {
  const hits = new Map();
  let lastSweep = now();

  const sweep = (time) => {
    if (time - lastSweep < windowMs) return;
    lastSweep = time;
    for (const [key, entry] of hits) {
      if (entry.resetAt <= time) hits.delete(key);
    }
  };

  return function rateLimit(req, res, next) {
    const time = now();
    sweep(time);
    const key = `${req.ip || 'sin-ip'}|${String(keyOf(req) || '').toLowerCase().slice(0, 200)}`;
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= time) {
      hits.set(key, { count: 1, resetAt: time + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - time) / 1000)));
      return res.status(429).json({ error: 'too_many_attempts' });
    }
    return next();
  };
}
