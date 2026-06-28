import fs from 'node:fs/promises';
import jwt from 'jsonwebtoken';
import { buildUploadPublicUrlFromBase } from './uploadPublicUrl.js';

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const sanitizeUploadFolder = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const resolveUploadsServiceBaseUrl = () =>
  trimTrailingSlash(
    process.env.UPLOADS_SERVICE_URL ||
      process.env.UPLOADS_BASE_URL ||
      process.env.UPLOADS_PUBLIC_BASE_URL ||
      'https://uploads.vase.ar'
  );

export const buildUploadsPublicFileUrl = ({ username, filename, baseUrl = resolveUploadsServiceBaseUrl() }) =>
  buildUploadPublicUrlFromBase(
    baseUrl,
    `/public-files/${encodeURIComponent(username)}/${encodeURIComponent(filename)}`
  );

export const buildProductUploadsUsername = (tenantId) => {
  const normalized = sanitizeUploadFolder(tenantId);
  if (!normalized) return 'vase-business-products';
  return `products-${normalized}`;
};

export const signUploadsServiceToken = ({ subject, username, tenantId, role = 'system' }) => {
  const secret = process.env.UPLOADS_JWT_SECRET || '';
  if (!secret) {
    const error = new Error('uploads_jwt_secret_missing');
    error.status = 500;
    error.code = 'uploads_jwt_secret_missing';
    throw error;
  }

  return jwt.sign(
    {
      sub: subject || `vase-business:${tenantId || username}`,
      username,
      role,
      tenant_id: tenantId || null,
      service: 'vase-business',
    },
    secret,
    { expiresIn: '15m' }
  );
};

async function uploadFormDataToUploadsService({ formData, username, tenantId }) {
  const baseUrl = resolveUploadsServiceBaseUrl();
  const token = signUploadsServiceToken({
    subject: `product-upload:${tenantId || username}`,
    username,
    tenantId,
  });

  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || `uploads_service_${response.status}`);
    error.status = response.status;
    error.code = payload?.error || 'uploads_service_error';
    throw error;
  }

  return {
    ...payload,
    public_url: buildUploadsPublicFileUrl({
      username,
      filename: payload.filename,
      baseUrl,
    }),
  };
}

export async function uploadLocalFileToUploadsService({ filePath, originalName, mimeType, username, tenantId }) {
  const buffer = await fs.readFile(filePath);
  return uploadBufferToUploadsService({
    buffer,
    originalName,
    mimeType,
    username,
    tenantId,
  });
}

export async function uploadBufferToUploadsService({ buffer, originalName, mimeType, username, tenantId }) {
  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), originalName || 'file');

  return uploadFormDataToUploadsService({
    formData,
    username,
    tenantId,
  });
}
