export const vaseDesignSystem = {
  brand: {
    principles: ["moderna", "simple", "premium", "confiable", "cercana", "digital-first"],
    voice:
      "Vase comunica tecnologia clara con una estetica sobria, global y confiable, pensada para negocios reales que quieren crecer sin complejidad.",
  },
  palette: {
    background: "#0D1117",
    surface: "#1F2937",
    foreground: "#F8FAFC",
    accent: "#18C37E",
    accentStrong: "#0E9F6E",
    muted: "#94A3B8",
  },
  typography: {
    display: "Manrope",
    support: "IBM Plex Mono",
    scale: {
      hero: "clamp(2.75rem, 5vw, 4.75rem)",
      title: "clamp(1.625rem, 2vw, 2.375rem)",
      body: "0.95rem / 1.8",
      caption: "0.78rem / 1.5",
    },
  },
  spacing: {
    section: "3rem",
    card: "1.5rem",
    compact: "1rem",
  },
  surfaces: {
    light: "airy translucent layers on soft white backgrounds with restrained jade accents",
    dark: "charcoal glass surfaces with jade highlights, clear hierarchy and operational readability",
  },
  components: {
    buttons: ["primary", "secondary", "ghost", "quiet"],
    tables: "rounded glass containers, executive contrast, low-noise row scanning",
    forms: "clear labels, translucent fields, generous spacing, low-cognitive-load feedback",
    emptyStates: "action-oriented, reassuring, premium and business-readable",
    dashboards: "executive summary first, operational detail second, with restrained glass depth",
    onboarding: "step-by-step, guided, low jargon, strong defaults and clear visual reassurance",
  },
} as const;
