import { z } from "zod";

export const SOCIAL_NETWORKS = [
  { id: "instagram", label: "Instagram", placeholder: "instagram.com/tu-negocio" },
  { id: "facebook", label: "Facebook", placeholder: "facebook.com/tu-negocio" },
  { id: "tiktok", label: "TikTok", placeholder: "tiktok.com/@tu-negocio" },
  { id: "youtube", label: "YouTube", placeholder: "youtube.com/@tu-negocio" },
  { id: "x", label: "X", placeholder: "x.com/tu-negocio" },
  { id: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/company/tu-negocio" },
  { id: "pinterest", label: "Pinterest", placeholder: "pinterest.com/tu-negocio" },
  { id: "threads", label: "Threads", placeholder: "threads.net/@tu-negocio" },
  { id: "spotify", label: "Spotify", placeholder: "open.spotify.com/…" },
  { id: "custom", label: "Otra", placeholder: "https://…" },
] as const;

export type SocialNetworkId = (typeof SOCIAL_NETWORKS)[number]["id"];

export type SocialLink = {
  id: string;
  network: SocialNetworkId;
  url: string;
  label?: string | null;
  iconUrl?: string | null;
};

export const MAX_SOCIAL_LINKS = 12;

const networkIds = SOCIAL_NETWORKS.map((network) => network.id) as [SocialNetworkId, ...SocialNetworkId[]];

/** Agrega https:// si falta y rechaza cualquier cosa que no sea una dirección web. */
export function normalizeSocialUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function socialLinksSchema(isAllowedIcon: (value: string) => boolean) {
  return z
    .array(
      z.object({
        id: z.string().trim().min(1).max(40),
        network: z.enum(networkIds),
        url: z.string().max(300),
        label: z.string().trim().max(40).nullish(),
        iconUrl: z.string().nullish(),
      }),
    )
    .max(MAX_SOCIAL_LINKS)
    .transform((links, context) =>
      links.map((link) => {
        const url = normalizeSocialUrl(link.url);
        if (!url) {
          context.addIssue({ code: "custom", message: "Revisá el link de tus redes." });
        }
        const iconUrl = link.network === "custom" && link.iconUrl && isAllowedIcon(link.iconUrl) ? link.iconUrl : null;
        return {
          id: link.id,
          network: link.network,
          url: url ?? "",
          label: link.network === "custom" ? link.label?.trim() || "Mi red" : null,
          iconUrl,
        };
      }),
    );
}

/** Las redes de antes (columnas sueltas) pasan a la lista nueva sin perder nada. */
export function legacySocialLinks(input: Partial<Record<"instagram" | "facebook" | "tiktok" | "youtube", string | null>>) {
  return (["instagram", "facebook", "tiktok", "youtube"] as const)
    .filter((network) => input[network]?.trim())
    .map((network) => ({ id: network, network, url: input[network]!.trim() }) as SocialLink);
}

/** Para los productos que todavía leen las columnas sueltas: el primer link de cada red común. */
export function socialColumns(links: ReadonlyArray<Pick<SocialLink, "network" | "url">>) {
  const first = (network: SocialNetworkId) => links.find((link) => link.network === network)?.url ?? null;
  return {
    instagram: first("instagram"),
    facebook: first("facebook"),
    tiktok: first("tiktok"),
    youtube: first("youtube"),
  };
}
