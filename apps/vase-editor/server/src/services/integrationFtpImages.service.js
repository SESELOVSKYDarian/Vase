import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Client as FtpClient } from 'basic-ftp';
import { pool } from '../db.js';
import { buildUploadPublicUrlFromBase } from './uploadPublicUrl.js';

const DEFAULT_SOURCE_SYSTEM = 'ftp-images-sync';
const DEFAULT_REMOTE_DIR = '/';
const DEFAULT_MAX_FILES = 300;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp', '.tif', '.tiff']);

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toTextOrNull = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

const normalizeLookupCode = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const readBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['true', '1', 'si', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
};

const readInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeRemoteDir = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return DEFAULT_REMOTE_DIR;
  return normalized;
};

const joinRemotePath = (remoteDir, fileName) => {
  const base = String(remoteDir || '').trim();
  const name = String(fileName || '').trim().replace(/^\/+/, '');
  if (!base || base === '/') return `/${name}`;
  return `${base.replace(/\/+$/, '')}/${name}`;
};

const compileFileNameRegex = (pattern) => {
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

const extractCodeFromFileName = (fileName, codeRegex) => {
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

const normalizeImageEntries = (rawImages, fallbackAlt) => {
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

const normalizeFtpConfig = (raw = {}) => {
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

const normalizeSyncOptions = (raw = {}) => {
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

const buildCodeProductLookupMap = (rows = []) => {
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

const resolveProductForCode = (code, lookupMap) => {
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

const buildPublicImageUrl = (baseUrl, fileName) => buildUploadPublicUrlFromBase(baseUrl, `/uploads/products/${fileName}`);

const isValidImageFileName = (name) => {
  const extension = path.extname(String(name || '')).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension);
};

const prepareDownloadedImageEntry = ({ url, sourceFile, fallbackAlt, makePrimary }) => ({
  url,
  alt: fallbackAlt || null,
  primary: makePrimary === true,
  source: 'ftp',
  source_file: sourceFile,
});

const mergeImagesForProduct = ({
  existingImages,
  downloadedImages,
  replaceExistingImages,
}) => {
  const normalizedExisting = normalizeImageEntries(existingImages, null);
  const normalizedDownloaded = Array.isArray(downloadedImages) ? downloadedImages.filter(Boolean) : [];

  if (!normalizedDownloaded.length) {
    return normalizedExisting;
  }

  let baseImages = normalizedExisting;
  if (!replaceExistingImages) {
    const downloadedSourceFiles = new Set(
      normalizedDownloaded
        .map((item) => toTextOrNull(item.source_file))
        .filter(Boolean)
    );

    baseImages = normalizedExisting.filter((image) => {
      const sourceFile = toTextOrNull(image.source_file);
      if (!sourceFile) return true;
      return !downloadedSourceFiles.has(sourceFile);
    });
  } else {
    baseImages = [];
  }

  const hasPrimaryInBase = baseImages.some((image) => image.primary === true);
  const withPrimary = normalizedDownloaded.map((image, index) => ({
    ...image,
    primary: hasPrimaryInBase ? false : index === 0,
  }));

  const merged = [...baseImages, ...withPrimary];
  if (!merged.some((image) => image.primary === true) && merged.length > 0) {
    merged[0] = { ...merged[0], primary: true };
  }

  return merged;
};

export async function syncProductImagesFromFtp({
  tenantId,
  baseUrl,
  uploadsBaseUrl,
  payload = {},
}) {
  const ftpConfig = normalizeFtpConfig(payload);
  const options = normalizeSyncOptions(payload);

  const client = new FtpClient();
  client.ftp.verbose = false;

  const uploadsDir = path.join(process.cwd(), 'uploads', 'products');
  await fs.mkdir(uploadsDir, { recursive: true });

  const itemResults = [];
  let failed = 0;
  let updated = 0;
  let downloaded = 0;
  let skippedNoCode = 0;
  let skippedNoProduct = 0;
  let skippedAmbiguous = 0;
  let skippedLocked = 0;
  let skippedNotImage = 0;

  try {
    await client.access({
      host: ftpConfig.host,
      user: ftpConfig.user,
      password: ftpConfig.password,
      port: ftpConfig.port,
      secure: ftpConfig.secure,
    });

    const listing = await client.list(ftpConfig.remoteDir);
    const files = listing
      .filter((entry) => entry?.isFile && entry?.name && isValidImageFileName(entry.name))
      .slice(0, options.maxFiles);

    const codeSet = new Set();
    const fileEntries = files.map((entry) => {
      const code = extractCodeFromFileName(entry.name, options.fileNameRegex);
      if (code) codeSet.add(normalizeLookupCode(code));
      return {
        name: entry.name,
        remotePath: joinRemotePath(ftpConfig.remoteDir, entry.name),
        code,
      };
    });

    const codes = [...codeSet].filter(Boolean);
    const productsRes = codes.length
      ? await pool.query(
        [
          'select id, name, sku, erp_id, external_id, data, admin_locked',
          'from product_cache',
          'where tenant_id = $1',
          'and deleted_at is null',
          'and (',
          'lower(coalesce(sku, \'\')) = any($2::text[])',
          'or lower(coalesce(erp_id, \'\')) = any($2::text[])',
          'or lower(coalesce(external_id, \'\')) = any($2::text[])',
          ')',
        ].join(' '),
        [tenantId, codes]
      )
      : { rows: [] };

    const productLookup = buildCodeProductLookupMap(productsRes.rows || []);
    const groupedByProductId = new Map();

    for (const fileEntry of fileEntries) {
      if (!fileEntry.code) {
        skippedNoCode += 1;
        itemResults.push({
          file: fileEntry.name,
          remote_path: fileEntry.remotePath,
          code: null,
          ok: false,
          status: 'skipped',
          reason: 'code_not_found_in_filename',
        });
        continue;
      }

      const resolved = resolveProductForCode(fileEntry.code, productLookup);
      if (resolved.ambiguous) {
        skippedAmbiguous += 1;
        itemResults.push({
          file: fileEntry.name,
          remote_path: fileEntry.remotePath,
          code: fileEntry.code,
          ok: false,
          status: 'skipped',
          reason: 'ambiguous_product_code',
        });
        continue;
      }

      if (!resolved.product) {
        skippedNoProduct += 1;
        itemResults.push({
          file: fileEntry.name,
          remote_path: fileEntry.remotePath,
          code: fileEntry.code,
          ok: false,
          status: 'skipped',
          reason: 'product_not_found',
        });
        continue;
      }

      if (options.skipAdminLocked && resolved.product.admin_locked === true) {
        skippedLocked += 1;
        itemResults.push({
          file: fileEntry.name,
          remote_path: fileEntry.remotePath,
          code: fileEntry.code,
          product_id: resolved.product.id,
          ok: false,
          status: 'skipped',
          reason: 'product_admin_locked',
        });
        continue;
      }

      const bucket = groupedByProductId.get(resolved.product.id) || {
        product: resolved.product,
        code: fileEntry.code,
        files: [],
      };
      bucket.files.push(fileEntry);
      groupedByProductId.set(resolved.product.id, bucket);
    }

    for (const bucket of groupedByProductId.values()) {
      const { product, code, files: productFiles } = bucket;

      try {
        const downloadedImages = [];

        for (const fileEntry of productFiles) {
          const extension = path.extname(fileEntry.name).toLowerCase();
          if (!IMAGE_EXTENSIONS.has(extension)) {
            skippedNotImage += 1;
            itemResults.push({
              file: fileEntry.name,
              remote_path: fileEntry.remotePath,
              code,
              product_id: product.id,
              ok: false,
              status: 'skipped',
              reason: 'invalid_image_extension',
            });
            continue;
          }

          const outputFileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
          const outputPath = path.join(uploadsDir, outputFileName);
          const publicUrl = buildPublicImageUrl(uploadsBaseUrl || baseUrl, outputFileName);

          if (!options.dryRun) {
            await client.downloadTo(outputPath, fileEntry.remotePath);
          }

          downloaded += 1;
          downloadedImages.push(
            prepareDownloadedImageEntry({
              url: publicUrl,
              sourceFile: fileEntry.remotePath,
              fallbackAlt: toTextOrNull(product.name) || code,
              makePrimary: false,
            })
          );

          if (!options.dryRun && options.deleteRemoteAfterSync) {
            try {
              await client.remove(fileEntry.remotePath);
            } catch (removeErr) {
              itemResults.push({
                file: fileEntry.name,
                remote_path: fileEntry.remotePath,
                code,
                product_id: product.id,
                ok: false,
                status: 'warning',
                reason: 'remote_delete_failed',
                detail: removeErr?.message || 'No se pudo eliminar del FTP',
              });
            }
          }
        }

        const existingData = isPlainObject(product.data) ? { ...product.data } : {};
        const mergedImages = mergeImagesForProduct({
          existingImages: existingData.images,
          downloadedImages,
          replaceExistingImages: options.replaceExistingImages,
        });

        if (!options.dryRun) {
          await pool.query(
            [
              'update product_cache',
              'set data = $3::jsonb,',
              'source_system = $4,',
              'last_sync_at = now(),',
              'updated_at = now()',
              'where tenant_id = $1 and id = $2',
            ].join(' '),
            [
              tenantId,
              product.id,
              JSON.stringify({
                ...existingData,
                images: mergedImages,
              }),
              options.sourceSystem,
            ]
          );
        }

        updated += 1;
        itemResults.push({
          code,
          product_id: product.id,
          files: productFiles.map((file) => file.name),
          ok: true,
          status: options.dryRun ? 'dry_run' : 'updated',
          images_added: downloadedImages.length,
          replace_existing_images: options.replaceExistingImages,
        });
      } catch (productErr) {
        failed += 1;
        itemResults.push({
          code,
          product_id: product.id,
          ok: false,
          status: 'error',
          reason: 'product_image_sync_failed',
          detail: productErr?.message || 'Error no controlado al procesar imagenes',
        });
      }
    }

    return {
      ok: failed === 0,
      partial: failed > 0 && updated > 0,
      tenant_id: tenantId,
      source_system: options.sourceSystem,
      dry_run: options.dryRun,
      ftp: {
        host: ftpConfig.host,
        port: ftpConfig.port,
        secure: ftpConfig.secure,
        remote_dir: ftpConfig.remoteDir,
      },
      total_files: files.length,
      downloaded_files: downloaded,
      updated_products: updated,
      failed,
      skipped: {
        no_code: skippedNoCode,
        no_product: skippedNoProduct,
        ambiguous_code: skippedAmbiguous,
        admin_locked: skippedLocked,
        not_image: skippedNotImage,
      },
      item_results: itemResults,
    };
  } catch (err) {
    if (err?.code && err?.status) {
      throw err;
    }
    const error = new Error('ftp_sync_failed');
    error.status = 502;
    error.code = 'ftp_sync_failed';
    error.detail = err?.message || 'No se pudo completar la conexion FTP o la sincronizacion';
    throw error;
  } finally {
    client.close();
  }
}
