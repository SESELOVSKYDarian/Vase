import { getApiBase, getTenantHeaders } from './api';

const readSessionToken = () => localStorage.getItem('teflon_token') || '';

export async function getUploadsSession() {
  const token = readSessionToken();
  if (!token) throw new Error('not_authenticated');

  const response = await fetch(`${getApiBase()}/api/uploads/token`, {
    headers: {
      ...getTenantHeaders(),
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `uploads_token_${response.status}`);
  }

  return {
    token: payload.token,
    baseUrl: String(payload.uploads_base_url || import.meta.env.VITE_UPLOADS_BASE_URL || 'https://uploads.vase.ar').replace(/\/+$/, ''),
    user: payload.user || null,
  };
}

export async function listUploadFiles(session) {
  const response = await fetch(`${session.baseUrl}/files`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `uploads_list_${response.status}`);
  return payload.files || [];
}

export async function uploadPrivateFile(session, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${session.baseUrl}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.token}` },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `uploads_upload_${response.status}`);
  return payload;
}

export async function fetchPrivateFileBlob(session, privateUrl) {
  const response = await fetch(privateUrl, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (!response.ok) throw new Error(`uploads_file_${response.status}`);
  return response.blob();
}

export async function createPublicUploadUrl(session, filename) {
  const response = await fetch(`${session.baseUrl}/files/${encodeURIComponent(filename)}/public-url`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `uploads_public_${response.status}`);
  return payload;
}
