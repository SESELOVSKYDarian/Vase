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

type BuilderBaseBlock = {
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
  theme: {
    palette: BuilderThemePalette;
    buttonStyle: BuilderButtonStyle;
    surfaceStyle: BuilderSurfaceStyle;
    sectionSpacing: BuilderSectionSpacing;
  };
  seo: {
    title: string;
    description?: string | null;
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

type BuilderCapabilityInput = {
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

function buildStarterBlocks(): BuilderBlock[] {
  return [
    {
      id: createBuilderId(),
      type: "hero",
      enabled: true,
      title: "Hero principal",
      eyebrow: "Vase Business",
      description:
        "Presenta tu negocio con una portada clara, un mensaje fuerte y una llamada a la accion simple.",
      ctaLabel: "Comprar ahora",
      ctaHref: "#catalogo",
      imageUrl:
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: createBuilderId(),
      type: "rich-text",
      enabled: true,
      title: "Historia de marca",
      body:
        "Explica en pocas lineas que hace especial a tu negocio, como trabajas y por que tu propuesta genera confianza.",
    },
    {
      id: createBuilderId(),
      type: "feature-list",
      enabled: true,
      title: "Beneficios",
      items: ["Compra simple", "Atencion humana", "Entregas coordinadas"],
    },
    {
      id: createBuilderId(),
      type: "cta",
      enabled: true,
      title: "Cierre comercial",
      description: "Invita a tu cliente a comprar, pedir asesoramiento o escribir por WhatsApp.",
      ctaLabel: "Hablar con ventas",
      ctaHref: "#contacto",
    },
  ];
}

function buildShowcaseBlocks(): BuilderBlock[] {
  return [
    {
      id: createBuilderId(),
      type: "hero",
      enabled: true,
      title: "Hero editorial",
      eyebrow: "Coleccion destacada",
      description:
        "Ideal para marcas que necesitan una portada mas visual y una historia breve antes del catalogo.",
      ctaLabel: "Ver novedades",
      ctaHref: "#novedades",
      imageUrl:
        "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: createBuilderId(),
      type: "gallery",
      enabled: true,
      title: "Galeria de marca",
      images: [
        {
          src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
          alt: "Producto destacado sobre mesa clara",
        },
        {
          src: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80",
          alt: "Detalle de coleccion con identidad sobria",
        },
      ],
    },
    {
      id: createBuilderId(),
      type: "feature-list",
      enabled: true,
      title: "Lo que resuelve tu marca",
      items: ["Curaduria cuidada", "Compra guiada", "Envios a todo el pais"],
    },
    {
      id: createBuilderId(),
      type: "faq",
      enabled: true,
      title: "Preguntas frecuentes",
      items: [
        {
          question: "Como se coordinan los envios?",
          answer: "Puedes explicar tiempos, zonas, retiros y cualquier condicion comercial importante.",
        },
        {
          question: "Hay cambios o devoluciones?",
          answer: "Resume la politica de postventa con lenguaje claro para reducir dudas antes de comprar.",
        },
      ],
    },
  ];
}

function buildCatalogBlocks(): BuilderBlock[] {
  return [
    {
      id: createBuilderId(),
      type: "hero",
      enabled: true,
      title: "Portada de catalogo",
      eyebrow: "Venta directa",
      description:
        "Pensado para negocios pagos que necesitan presentar productos, categorias y argumentos comerciales con mas profundidad.",
      ctaLabel: "Explorar catalogo",
      ctaHref: "#catalogo",
      imageUrl:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: createBuilderId(),
      type: "gallery",
      enabled: true,
      title: "Destacados visuales",
      images: [
        {
          src: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
          alt: "Coleccion destacada con fondo neutro",
        },
        {
          src: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
          alt: "Fotografia de producto para ecommerce premium",
        },
        {
          src: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80",
          alt: "Curaduria visual de productos",
        },
      ],
    },
    {
      id: createBuilderId(),
      type: "rich-text",
      enabled: true,
      title: "Propuesta comercial",
      body:
        "Usa este bloque para explicar surtido, atencion, promociones o cualquier detalle operativo importante para tu ecommerce.",
    },
    {
      id: createBuilderId(),
      type: "cta",
      enabled: true,
      title: "Conversion final",
      description:
        "Cierra la pagina con una accion concreta: contacto comercial, compra, agenda o pedido personalizado.",
      ctaLabel: "Hablar con un asesor",
      ctaHref: "#asesoria",
    },
  ];
}

export function createInitialBuilderDocument(
  templateKey: BuilderTemplateKey = "STARTER",
): BuilderDocument {
  const blocks =
    templateKey === "SHOWCASE"
      ? buildShowcaseBlocks()
      : templateKey === "CATALOG"
        ? buildCatalogBlocks()
        : buildStarterBlocks();

  return {
    schemaVersion: 1,
    templateKey,
    theme: {
      palette: templateKey === "CATALOG" ? "forest" : "linen",
      buttonStyle: "solid",
      surfaceStyle: "airy",
      sectionSpacing: "comfortable",
    },
    seo: {
      title: "Nueva pagina Vase",
      description: "Pagina ecommerce editada desde Vase Business.",
    },
    blocks,
  };
}

export function getBuilderCapabilities({
  isTemporary,
  plan,
}: BuilderCapabilityInput): BuilderCapabilities {
  if (isTemporary) {
    return {
      availableTemplates: ["STARTER", "SHOWCASE"],
      availablePalettes: ["linen", "graphite"],
      availableBlockTypes: ["hero", "rich-text", "feature-list", "faq", "cta"],
      canUseAdvancedLayout: false,
      canRequestFullCustomization: true,
      maxSavedVersions: 5,
      helperText:
        "Las paginas temporales priorizan velocidad y simplicidad. Tienen estilos base y un set acotado de bloques.",
    };
  }

  if (plan === "PREMIUM") {
    return {
      availableTemplates: ["STARTER", "SHOWCASE", "CATALOG"],
      availablePalettes: ["linen", "graphite", "forest", "midnight"],
      availableBlockTypes: [...builderBlockTypes],
      canUseAdvancedLayout: true,
      canRequestFullCustomization: true,
      maxSavedVersions: 20,
      helperText:
        "Tu pagina paga premium habilita mas layouts, mejores presets visuales y mayor profundidad editorial.",
    };
  }

  return {
    availableTemplates: ["STARTER", "SHOWCASE", "CATALOG"],
    availablePalettes: ["linen", "graphite", "forest"],
    availableBlockTypes: [...builderBlockTypes],
    canUseAdvancedLayout: true,
    canRequestFullCustomization: true,
    maxSavedVersions: 12,
    helperText:
      "Tu pagina paga puede usar plantillas reutilizables, preview completo y bloques visuales ampliados.",
  };
}

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
    blocks: document.blocks.filter((block) =>
      capabilities.availableBlockTypes.includes(block.type),
    ),
  };
}
