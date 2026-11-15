// Parte de builder.ts: normalizeBuilderDocument.
import { BuilderCapabilities, BuilderDocument } from "./create-block-from-type";

export function normalizeBuilderDocument(
  document: BuilderDocument,
  capabilities: BuilderCapabilities,
): BuilderDocument {
  const nextTemplate = capabilities.availableTemplates.includes(document.templateKey)
    ? document.templateKey
    : capabilities.availableTemplates[0];
  const nextPalette = capabilities.availablePalettes.includes(document.theme.palette)
    ? document.theme.palette
    : capabilities.availablePalettes[0];

  return {
    ...document,
    templateKey: nextTemplate,
    theme: {
      ...document.theme,
      palette: nextPalette,
    },
    seo: {
      title: document.seo.title,
      description: document.seo.description ?? null,
      keyword: document.seo.keyword ?? null,
      secondaryKeywords: document.seo.secondaryKeywords ?? [],
      canonicalPath: document.seo.canonicalPath ?? null,
      indexable: document.seo.indexable ?? true,
      ogTitle: document.seo.ogTitle ?? null,
      ogDescription: document.seo.ogDescription ?? null,
      tracking: document.seo.tracking
        ? {
            googleTagManagerContainerId: document.seo.tracking.googleTagManagerContainerId ?? null,
            enabled:
              document.seo.tracking.enabled ??
              Boolean(document.seo.tracking.googleTagManagerContainerId),
            notes: document.seo.tracking.notes ?? null,
          }
        : {
            googleTagManagerContainerId: null,
            enabled: false,
            notes: null,
          },
    },
    blocks: document.blocks.filter((block) =>
      capabilities.availableBlockTypes.includes(block.type),
    ),
  };
}
