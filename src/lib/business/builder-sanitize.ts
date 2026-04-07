import type { BuilderDocument } from "@/lib/business/builder";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";

export function sanitizeBuilderDocument(document: BuilderDocument): BuilderDocument {
  return {
    schemaVersion: 1,
    templateKey: document.templateKey,
    theme: {
      palette: document.theme.palette,
      buttonStyle: document.theme.buttonStyle,
      surfaceStyle: document.theme.surfaceStyle,
      sectionSpacing: document.theme.sectionSpacing,
    },
    seo: {
      title: sanitizeText(document.seo.title),
      description: sanitizeNullableText(document.seo.description),
    },
    blocks: document.blocks.map((block) => {
      if (block.type === "hero") {
        return {
          ...block,
          title: sanitizeText(block.title),
          eyebrow: sanitizeNullableText(block.eyebrow),
          description: sanitizeNullableText(block.description),
          ctaLabel: sanitizeNullableText(block.ctaLabel),
          ctaHref: sanitizeNullableText(block.ctaHref),
          imageUrl: sanitizeNullableText(block.imageUrl),
        };
      }

      if (block.type === "rich-text") {
        return {
          ...block,
          title: sanitizeText(block.title),
          body: sanitizeText(block.body),
        };
      }

      if (block.type === "feature-list") {
        return {
          ...block,
          title: sanitizeText(block.title),
          items: block.items.map((item) => sanitizeText(item)).filter(Boolean),
        };
      }

      if (block.type === "gallery") {
        return {
          ...block,
          title: sanitizeText(block.title),
          images: block.images.map((image) => ({
            src: sanitizeText(image.src),
            alt: sanitizeText(image.alt),
          })),
        };
      }

      if (block.type === "faq") {
        return {
          ...block,
          title: sanitizeText(block.title),
          items: block.items.map((item) => ({
            question: sanitizeText(item.question),
            answer: sanitizeText(item.answer),
          })),
        };
      }

      return {
        ...block,
        title: sanitizeText(block.title),
        description: sanitizeNullableText(block.description),
        ctaLabel: sanitizeText(block.ctaLabel),
        ctaHref: sanitizeText(block.ctaHref),
      };
    }),
  };
}
