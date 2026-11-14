// Parte de integrationFtpImages.service.js: mergeImagesForProduct.
import { normalizeImageEntries, toTextOrNull } from './normalize-sync-options.js';

export const mergeImagesForProduct = ({
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
