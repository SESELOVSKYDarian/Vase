// Parte de integrationFtpImages.service.js: DEFAULT_SOURCE_SYSTEM, DEFAULT_REMOTE_DIR, DEFAULT_MAX_FILES, IMAGE_EXTENSIONS, isPlainObject, toTextOrNull y más.
import path from 'node:path';
import { buildUploadPublicUrlFromBase } from '../uploadPublicUrl.js';

export const DEFAULT_SOURCE_SYSTEM = 'ftp-images-sync';
export const DEFAULT_REMOTE_DIR = '/';
export const DEFAULT_MAX_FILES = 300;
export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp', '.tif', '.tiff']);

export const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const toTextOrNull = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

export const normalizeLookupCode = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

export const readBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['true', '1', 'si', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
};

export const readInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeRemoteDir = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return DEFAULT_REMOTE_DIR;
  return normalized;
};

export const joinRemotePath = (remoteDir, fileName) => {
  const base = String(remoteDir || '').trim();
  const name = String(fileName || '').trim().replace(/^\/+/, '');
  if (!base || base === '/') return `/${name}`;
  return `${base.replace(/\/+$/, '')}/${name}`;
};

export const compileFileNameRegex = (pattern) => {
  const normalized = toTextOrNull(pattern);
  if (!normalized) return null;
  try {
    return new RegExp(normalized, 'i');
  } catch (err) {
    const error = new Error('invalid_filename_regex');
    error.status = 400;
    error.code = 'invalid_filename_regex';
    error.detail = `Regex invalida: ${err?.message || 'error_desconocido'}`;
    throw error;
  }
};

export const extractCodeFromFileName = (fileName, codeRegex) => {
  const baseName = path.basename(String(fileName || ''));
  const extension = path.extname(baseName);
  const rawName = baseName.slice(0, baseName.length - extension.length);
  if (!rawName) return null;

  if (codeRegex) {
    const match = rawName.match(codeRegex);
    if (!match) return null;
    if (match.groups?.sku) return toTextOrNull(match.groups.sku);
    if (match.groups?.code) return toTextOrNull(match.groups.code);
    if (match.groups?.codigo) return toTextOrNull(match.groups.codigo);
    if (match[1]) return toTextOrNull(match[1]);
  }

  if (rawName.includes('__')) return toTextOrNull(rawName.split('__')[0]);
  if (rawName.includes('_')) return toTextOrNull(rawName.split('_')[0]);
  return toTextOrNull(rawName);
};

export const normalizeImageEntries = (rawImages, fallbackAlt) => {
  if (!Array.isArray(rawImages)) return [];

  return rawImages
    .map((item, index) => {
      if (typeof item === 'string') {
        const url = item.trim();
        if (!url) return null;
        return {
          url,
          alt: fallbackAlt || null,
          primary: index === 0,
        };
      }

      if (!isPlainObject(item)) return null;
      const url = toTextOrNull(item.url || item.src || item.image || item.imagen);
      if (!url) return null;
      return {
        ...item,
        url,
        alt: toTextOrNull(item.alt) || fallbackAlt || null,
        primary: item.primary === true,
      };
    })
    .filter(Boolean);
};

export const normalizeFtpConfig = (raw = {}) => {
  const ftp = isPlainObject(raw.ftp) ? raw.ftp : {};

  const host = toTextOrNull(raw.host ?? raw.ftp_host ?? raw.servidor ?? ftp.host ?? ftp.servidor ?? process.env.FTP_IMAGES_HOST);
  const user = toTextOrNull(raw.user ?? raw.username ?? raw.usuario ?? ftp.user ?? ftp.username ?? ftp.usuario ?? process.env.FTP_IMAGES_USER);
  const password = toTextOrNull(raw.password ?? raw.pass ?? raw.clave ?? ftp.password ?? ftp.pass ?? ftp.clave ?? process.env.FTP_IMAGES_PASSWORD);
  const port = readInteger(raw.port ?? raw.ftp_port ?? ftp.port ?? process.env.FTP_IMAGES_PORT, 21);
  const secure = readBoolean(raw.secure ?? raw.ftps ?? ftp.secure ?? ftp.ftps ?? process.env.FTP_IMAGES_SECURE, false);
  const remoteDir = normalizeRemoteDir(
    raw.remote_dir ??
    raw.remoteDir ??
    raw.directory ??
    raw.folder ??
    raw.carpeta ??
    ftp.remote_dir ??
    ftp.remoteDir ??
    ftp.directory ??
    ftp.folder ??
    ftp.carpeta ??
    process.env.FTP_IMAGES_REMOTE_DIR
  );

  if (!host || !user || !password) {
    const error = new Error('ftp_config_required');
    error.status = 400;
    error.code = 'ftp_config_required';
    error.detail = 'Faltan credenciales FTP. Requiere host, user y password.';
    throw error;
  }

  return {
    host,
    user,
    password,
    port,
    secure,
    remoteDir,
  };
};

export const normalizeSyncOptions = (raw = {}) => {
  const options = isPlainObject(raw.options) ? raw.options : {};
  const fileNameRegex = compileFileNameRegex(
    raw.filename_regex ??
    raw.file_name_regex ??
    raw.regex_archivo ??
    raw.regex ??
    options.filename_regex ??
    options.file_name_regex ??
    options.regex_archivo ??
    process.env.FTP_IMAGES_FILENAME_REGEX
  );

  const maxFiles = Math.max(
    1,
    Math.min(
      5000,
      readInteger(raw.max_files ?? raw.maxFiles ?? options.max_files ?? options.maxFiles ?? process.env.FTP_IMAGES_MAX_FILES, DEFAULT_MAX_FILES)
    )
  );

  return {
    sourceSystem: toTextOrNull(raw.source_system ?? raw.sourceSystem ?? options.source_system ?? options.sourceSystem) || DEFAULT_SOURCE_SYSTEM,
    dryRun: readBoolean(raw.dry_run ?? raw.dryRun ?? raw.simular ?? options.dry_run ?? options.dryRun ?? options.simular, false),
    replaceExistingImages: readBoolean(
      raw.replace_existing_images ??
      raw.replaceExistingImages ??
      raw.reemplazar_imagenes ??
      options.replace_existing_images ??
      options.replaceExistingImages ??
      options.reemplazar_imagenes,
      false
    ),
    deleteRemoteAfterSync: readBoolean(
      raw.delete_remote_after_sync ??
      raw.deleteRemoteAfterSync ??
      raw.eliminar_remoto ??
      options.delete_remote_after_sync ??
      options.deleteRemoteAfterSync ??
      options.eliminar_remoto,
      false
    ),
    skipAdminLocked: readBoolean(raw.skip_admin_locked ?? raw.skipAdminLocked ?? options.skip_admin_locked ?? options.skipAdminLocked, true),
    fileNameRegex,
    maxFiles,
  };
};

export const buildCodeProductLookupMap = (rows = []) => {
  const map = new Map();

  rows.forEach((row) => {
    [row.sku, row.erp_id, row.external_id]
      .map((value) => normalizeLookupCode(value))
      .filter(Boolean)
      .forEach((code) => {
        const entries = map.get(code) || [];
        entries.push(row);
        map.set(code, entries);
      });
  });

  return map;
};

export const resolveProductForCode = (code, lookupMap) => {
  const entries = lookupMap.get(normalizeLookupCode(code)) || [];
  if (!entries.length) return { product: null, ambiguous: false };

  const uniqueById = new Map();
  entries.forEach((entry) => {
    if (!uniqueById.has(entry.id)) {
      uniqueById.set(entry.id, entry);
    }
  });

  if (uniqueById.size > 1) {
    return { product: null, ambiguous: true };
  }

  return { product: Array.from(uniqueById.values())[0], ambiguous: false };
};

export const buildPublicImageUrl = (baseUrl, fileName) => buildUploadPublicUrlFromBase(baseUrl, `/uploads/products/${fileName}`);

export const isValidImageFileName = (name) => {
  const extension = path.extname(String(name || '')).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension);
};

export const prepareDownloadedImageEntry = ({ url, sourceFile, fallbackAlt, makePrimary }) => ({
  url,
  alt: fallbackAlt || null,
  primary: makePrimary === true,
  source: 'ftp',
  source_file: sourceFile,
});
