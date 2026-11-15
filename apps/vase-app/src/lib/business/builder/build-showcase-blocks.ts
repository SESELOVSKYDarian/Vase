// Parte de builder.ts: buildStarterBlocks, buildShowcaseBlocks, buildCatalogBlocks, createInitialBuilderDocument, getBuilderCapabilities.
import { BuilderBlock, BuilderCapabilities, BuilderCapabilityInput, BuilderDocument, BuilderTemplateKey, builderBlockTypes, createBuilderId } from "./create-block-from-type";

export function buildStarterBlocks(): BuilderBlock[] {
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

export function buildShowcaseBlocks(): BuilderBlock[] {
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

export function buildCatalogBlocks(): BuilderBlock[] {
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
      keyword: null,
      secondaryKeywords: [],
      canonicalPath: null,
      indexable: true,
      ogTitle: null,
      ogDescription: null,
      tracking: {
        googleTagManagerContainerId: null,
        enabled: false,
        notes: null,
      },
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
