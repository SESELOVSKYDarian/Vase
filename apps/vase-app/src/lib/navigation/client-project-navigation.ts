type ClientProjectModule = {
  key: "business" | "labs" | "management" | "rest";
  isActive: boolean;
};

type ClientProjectLinks = {
  businessHref: string;
  labsHref: string;
  managementHref: string;
  restHref: string;
};

export type ClientProjectNavigation = {
  href: string;
  children: Array<{
    id: string;
    href: string;
    label: string;
    forceDocumentNavigation?: boolean;
  }>;
};

export function buildClientProjectNavigation(
  modules: readonly ClientProjectModule[],
  links: ClientProjectLinks,
): ClientProjectNavigation {
  const active = new Set(modules.filter((module) => module.isActive).map((module) => module.key));
  const businessActive = active.has("business");
  const labsActive = active.has("labs");
  const managementActive = active.has("management");
  const restActive = active.has("rest");

  return {
    href: businessActive
      ? links.businessHref
      : labsActive
        ? links.labsHref
        : managementActive
          ? links.managementHref
          : restActive
            ? links.restHref
            : "/app",
    children: [
      businessActive ? { id: "projects-business", href: links.businessHref, label: "Vase Business" } : null,
      labsActive ? { id: "projects-labs", href: links.labsHref, label: "Vase Labs", forceDocumentNavigation: true } : null,
      managementActive ? { id: "projects-management", href: links.managementHref, label: "Vase Management", forceDocumentNavigation: true } : null,
      restActive ? { id: "projects-rest", href: links.restHref, label: "Vase Rest", forceDocumentNavigation: true } : null,
    ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
  };
}
