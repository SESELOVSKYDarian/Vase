const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

export const resolveRequestBaseUrl = (req) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:4000';
  return trimTrailingSlash(`${protocol}://${host}`);
};

export const resolveUploadsPublicBaseUrl = (req) => {
  const envBase =
    process.env.UPLOADS_PUBLIC_BASE_URL ||
    process.env.PUBLIC_UPLOADS_BASE_URL ||
    process.env.UPLOADS_BASE_URL ||
    '';

  return trimTrailingSlash(envBase) || resolveRequestBaseUrl(req);
};

export const buildUploadPublicUrl = (req, uploadPath) => {
  const normalizedPath = String(uploadPath || '').trim();
  if (!normalizedPath) return resolveUploadsPublicBaseUrl(req);
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
  return `${resolveUploadsPublicBaseUrl(req)}/${normalizedPath.replace(/^\/+/, '')}`;
};

export const buildUploadPublicUrlFromBase = (baseUrl, uploadPath) => {
  const normalizedBase = trimTrailingSlash(baseUrl);
  const normalizedPath = String(uploadPath || '').trim().replace(/^\/+/, '');
  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase;
};
