import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

// En producción, sin JWT_SECRET (o con la clave de desarrollo) cualquiera podría fabricar sesiones.
// En ese caso se usa una clave al azar para este arranque: las sesiones viejas dejan de valer, pero
// nadie puede falsificarlas. Lo correcto es cargar JWT_SECRET en el servicio.
function resolveJwtSecret() {
  const configured = String(process.env.JWT_SECRET || '').trim();
  const weak = !configured || configured === 'dev-secret';
  if (configured && configured.length < 32) console.warn('SEGURIDAD: JWT_SECRET es corto. Conviene uno de 32 caracteres o más.');
  if (process.env.NODE_ENV === 'production' && weak) {
    console.error('SEGURIDAD: falta JWT_SECRET. Se usa una clave temporal; cargá JWT_SECRET (32+ caracteres).');
    return crypto.randomBytes(48).toString('hex');
  }
  return configured || 'dev-secret';
}

const JWT_SECRET = resolveJwtSecret();

export function authenticate(req, res, next) {
  const authHeader = req.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.sub,
      email: payload.email || null,
      username: payload.username || payload.preferred_username || null,
      role: payload.role,
      status: payload.status || 'active',
      tenantId: payload.tenant_id || null,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

export function optionalAuthenticate(req, res, next) {
  const authHeader = req.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.sub,
      email: payload.email || null,
      username: payload.username || payload.preferred_username || null,
      role: payload.role,
      status: payload.status || 'active',
      tenantId: payload.tenant_id || null,
    };
    return next();
  } catch (err) {
    return next();
  }
}

export function requireRole(roles) {
  const allow = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user || !allow.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    return next();
  };
}

export function signToken(payload, expiresIn = '8h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
