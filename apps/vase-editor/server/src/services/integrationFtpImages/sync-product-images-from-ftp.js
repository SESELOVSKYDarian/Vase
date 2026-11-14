// Parte de integrationFtpImages.service.js: syncProductImagesFromFtp.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Client as FtpClient } from 'basic-ftp';
import { pool } from '../../db.js';
import { IMAGE_EXTENSIONS, buildCodeProductLookupMap, buildPublicImageUrl, extractCodeFromFileName, isPlainObject, isValidImageFileName, joinRemotePath, normalizeFtpConfig, normalizeLookupCode, normalizeSyncOptions, prepareDownloadedImageEntry, resolveProductForCode, toTextOrNull } from './normalize-sync-options.js';
import { mergeImagesForProduct } from './merge-images-for-product.js';

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
