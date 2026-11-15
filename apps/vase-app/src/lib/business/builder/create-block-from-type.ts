// Parte de builder.ts: builderTemplateKeys, builderThemePalettes, builderButtonStyles, builderSurfaceStyles, builderSectionSpacing, builderBlockTypes y más.

export const builderTemplateKeys = ["STARTER", "SHOWCASE", "CATALOG"] as const;
export const builderThemePalettes = ["linen", "graphite", "forest", "midnight"] as const;
export const builderButtonStyles = ["solid", "outline", "soft"] as const;
export const builderSurfaceStyles = ["airy", "framed", "contrast"] as const;
export const builderSectionSpacing = ["compact", "comfortable", "spacious"] as const;
export const builderBlockTypes = [
  "hero",
  "rich-text",
  "feature-list",
  "gallery",
  "faq",
  "cta",
] as const;

export type BuilderTemplateKey = (typeof builderTemplateKeys)[number];
export type BuilderThemePalette = (typeof builderThemePalettes)[number];
export type BuilderButtonStyle = (typeof builderButtonStyles)[number];
export type BuilderSurfaceStyle = (typeof builderSurfaceStyles)[number];
export type BuilderSectionSpacing = (typeof builderSectionSpacing)[number];
export type BuilderBlockType = (typeof builderBlockTypes)[number];
export type BuilderPlan = "START" | "PREMIUM";

export type BuilderBaseBlock = {
  id: string;
  type: BuilderBlockType;
  enabled: boolean;
  title: string;
};

export type BuilderHeroBlock = BuilderBaseBlock & {
  type: "hero";
  eyebrow?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  imageUrl?: string | null;
};

export type BuilderRichTextBlock = BuilderBaseBlock & {
  type: "rich-text";
  body: string;
};

export type BuilderFeatureListBlock = BuilderBaseBlock & {
  type: "feature-list";
  items: string[];
};

export type BuilderGalleryBlock = BuilderBaseBlock & {
  type: "gallery";
  images: Array<{
    src: string;
    alt: string;
  }>;
};

export type BuilderFaqBlock = BuilderBaseBlock & {
  type: "faq";
  items: Array<{
    question: string;
    answer: string;
  }>;
};

export type BuilderCtaBlock = BuilderBaseBlock & {
  type: "cta";
  description?: string | null;
  ctaLabel: string;
  ctaHref: string;
};

export type BuilderBlock =
  | BuilderHeroBlock
  | BuilderRichTextBlock
  | BuilderFeatureListBlock
  | BuilderGalleryBlock
  | BuilderFaqBlock
  | BuilderCtaBlock;

export type BuilderDocument = {
  schemaVersion: 1;
  templateKey: BuilderTemplateKey;
  customStaticSite?: {
    siteId: string;
    entryPath: string;
    sourceType: "zip" | "github" | "generic";
    repositoryUrl?: string | null;
    packageFileName?: string | null;
    packageSha256?: string | null;
    fileCount: number;
    totalBytes: number;
    importedAt: string;
    publicBasePath: string;
  } | null;
  theme: {
    palette: BuilderThemePalette;
    buttonStyle: BuilderButtonStyle;
    surfaceStyle: BuilderSurfaceStyle;
    sectionSpacing: BuilderSectionSpacing;
  };
  seo: {
    title: string;
    description?: string | null;
    keyword?: string | null;
    secondaryKeywords?: string[];
    canonicalPath?: string | null;
    indexable?: boolean;
    ogTitle?: string | null;
    ogDescription?: string | null;
    tracking?: {
      googleTagManagerContainerId?: string | null;
      enabled?: boolean;
      notes?: string | null;
    } | null;
  };
  blocks: BuilderBlock[];
};

export type BuilderCapabilities = {
  availableTemplates: BuilderTemplateKey[];
  availablePalettes: BuilderThemePalette[];
  availableBlockTypes: BuilderBlockType[];
  canUseAdvancedLayout: boolean;
  canRequestFullCustomization: boolean;
  maxSavedVersions: number;
  helperText: string;
};

export const builderBlockLabels: Record<BuilderBlockType, string> = {
  hero: "Hero",
  "rich-text": "Texto",
  "feature-list": "Beneficios",
  gallery: "Galeria",
  faq: "FAQ",
  cta: "CTA",
};

export type BuilderCapabilityInput = {
  isTemporary: boolean;
  plan: BuilderPlan;
};

export const builderTemplateCatalog: Record<
  BuilderTemplateKey,
  {
    label: string;
    description: string;
  }
> = {
  STARTER: {
    label: "Starter Commerce",
    description: "Portada clara para lanzar rapido una pagina con foco en producto y confianza.",
  },
  SHOWCASE: {
    label: "Showcase Brand",
    description: "Narrativa visual mas editorial para negocios que quieren cuidar marca y producto.",
  },
  CATALOG: {
    label: "Catalog Flow",
    description: "Estructura orientada a catalogo, bloques visuales y una operacion paga mas completa.",
  },
};

export function createBuilderId() {
  return crypto.randomUUID().slice(0, 12);
}

export function createBlockFromType(type: BuilderBlockType): BuilderBlock {
  const id = createBuilderId();

  if (type === "hero") {
    return {
      id,
      type,
      enabled: true,
      title: "Nueva portada",
      eyebrow: "Presentacion",
      description: "Resume tu propuesta principal en una frase clara.",
      ctaLabel: "Comprar ahora",
      ctaHref: "#comprar",
      imageUrl: null,
    };
  }

  if (type === "rich-text") {
    return {
      id,
      type,
      enabled: true,
      title: "Nuevo texto",
      body: "Describe una parte importante de tu negocio, producto o servicio.",
    };
  }

  if (type === "feature-list") {
    return {
      id,
      type,
      enabled: true,
      title: "Beneficios clave",
      items: ["Beneficio 1", "Beneficio 2", "Beneficio 3"],
    };
  }

  if (type === "gallery") {
    return {
      id,
      type,
      enabled: true,
      title: "Galeria",
      images: [
        {
          src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
          alt: "Imagen principal del negocio",
        },
      ],
    };
  }

  if (type === "faq") {
    return {
      id,
      type,
      enabled: true,
      title: "Preguntas frecuentes",
      items: [
        {
          question: "Que incluye este servicio?",
          answer: "Aclaralo aqui con lenguaje simple y comercial.",
        },
      ],
    };
  }

  return {
    id,
    type,
    enabled: true,
    title: "Nuevo cierre comercial",
    description: "Invita al cliente a avanzar con una accion simple.",
    ctaLabel: "Contactar",
    ctaHref: "#contacto",
  };
}
