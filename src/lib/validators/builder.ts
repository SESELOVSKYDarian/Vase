import { z } from "zod";
import {
  builderBlockTypes,
  builderButtonStyles,
  builderSectionSpacing,
  builderSurfaceStyles,
  builderTemplateKeys,
  builderThemePalettes,
} from "@/lib/business/builder";

const shortText = z.string().trim().min(1).max(120);
const mediumText = z.string().trim().min(1).max(500);
const urlField = z.union([z.url().max(500), z.literal(""), z.null()]).optional();

const builderThemeSchema = z.object({
  palette: z.enum(builderThemePalettes),
  buttonStyle: z.enum(builderButtonStyles),
  surfaceStyle: z.enum(builderSurfaceStyles),
  sectionSpacing: z.enum(builderSectionSpacing),
});

const heroBlockSchema = z.object({
  id: z.string().trim().min(4).max(40),
  type: z.literal("hero"),
  enabled: z.boolean(),
  title: shortText,
  eyebrow: z.string().trim().max(80).nullish(),
  description: z.string().trim().max(300).nullish(),
  ctaLabel: z.string().trim().max(80).nullish(),
  ctaHref: z.string().trim().max(200).nullish(),
  imageUrl: urlField,
});

const richTextBlockSchema = z.object({
  id: z.string().trim().min(4).max(40),
  type: z.literal("rich-text"),
  enabled: z.boolean(),
  title: shortText,
  body: mediumText,
});

const featureListSchema = z.object({
  id: z.string().trim().min(4).max(40),
  type: z.literal("feature-list"),
  enabled: z.boolean(),
  title: shortText,
  items: z.array(z.string().trim().min(1).max(120)).min(1).max(6),
});

const gallerySchema = z.object({
  id: z.string().trim().min(4).max(40),
  type: z.literal("gallery"),
  enabled: z.boolean(),
  title: shortText,
  images: z
    .array(
      z.object({
        src: z.url().max(500),
        alt: z.string().trim().min(2).max(120),
      }),
    )
    .min(1)
    .max(6),
});

const faqSchema = z.object({
  id: z.string().trim().min(4).max(40),
  type: z.literal("faq"),
  enabled: z.boolean(),
  title: shortText,
  items: z
    .array(
      z.object({
        question: z.string().trim().min(3).max(140),
        answer: z.string().trim().min(5).max(300),
      }),
    )
    .min(1)
    .max(6),
});

const ctaSchema = z.object({
  id: z.string().trim().min(4).max(40),
  type: z.literal("cta"),
  enabled: z.boolean(),
  title: shortText,
  description: z.string().trim().max(240).nullish(),
  ctaLabel: z.string().trim().min(2).max(80),
  ctaHref: z.string().trim().min(1).max(200),
});

export const builderBlockSchema = z.discriminatedUnion("type", [
  heroBlockSchema,
  richTextBlockSchema,
  featureListSchema,
  gallerySchema,
  faqSchema,
  ctaSchema,
]);

export const builderDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  templateKey: z.enum(builderTemplateKeys),
  theme: builderThemeSchema,
  seo: z.object({
    title: z.string().trim().min(3).max(80),
    description: z.string().trim().max(200).nullish(),
  }),
  blocks: z.array(builderBlockSchema).min(1).max(16),
});

export const saveBuilderDraftSchema = z.object({
  pageId: z.string().trim().cuid(),
  document: builderDocumentSchema,
  changeSummary: z.string().trim().max(120).optional(),
});

export const publishBuilderSchema = z.object({
  pageId: z.string().trim().cuid(),
});

export const createBuilderVersionSchema = z.object({
  pageId: z.string().trim().cuid(),
  changeSummary: z.string().trim().min(3).max(120),
});

export const createFullCustomizationRequestSchema = z.object({
  pageId: z.string().trim().cuid(),
  businessDescription: z.string().trim().min(20).max(500),
  desiredColors: z.string().trim().min(3).max(200),
  brandStyle: z.string().trim().min(5).max(200),
  desiredFeatures: z.string().trim().min(10).max(400),
  visualReferences: z.string().trim().max(400).optional(),
  observations: z.string().trim().max(500).optional(),
});

export const reviewCustomizationRequestSchema = z.object({
  requestId: z.string().trim().cuid(),
  status: z.enum(["REVIEWING", "QUOTED", "IN_PROGRESS", "DELIVERED"]),
  quotedPriceLabel: z.string().trim().max(80).optional(),
  reviewNotes: z.string().trim().max(400).optional(),
});

export function isKnownBlockType(value: string): value is (typeof builderBlockTypes)[number] {
  return builderBlockTypes.includes(value as (typeof builderBlockTypes)[number]);
}
