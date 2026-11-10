import type { SocialNetworkId } from "@/lib/business/social-links";

// Íconos simples dibujados para el panel, con el color de cada red.
const STYLE: Record<Exclude<SocialNetworkId, "custom">, { bg: string; glyph: React.ReactNode }> = {
  instagram: {
    bg: "linear-gradient(135deg, #f58529, #dd2a7b 55%, #8134af)",
    glyph: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17" cy="7" r="1" fill="#fff" stroke="none" />
      </svg>
    ),
  },
  facebook: { bg: "#1877f2", glyph: <b style={{ fontFamily: "Georgia, serif", fontSize: 19 }}>f</b> },
  tiktok: {
    bg: "#111111",
    glyph: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
        <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" stroke="#25f4ee" transform="translate(-0.8 0.6)" />
        <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" stroke="#fe2c55" transform="translate(0.8 -0.6)" />
        <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.6 2.3 2.2 3.6 4.5 3.8" />
      </svg>
    ),
  },
  youtube: {
    bg: "#ff0000",
    glyph: (
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M10 8.5v7l6-3.5z" fill="#fff" />
      </svg>
    ),
  },
  x: { bg: "#111111", glyph: <b style={{ fontSize: 15 }}>X</b> },
  linkedin: { bg: "#0a66c2", glyph: <b style={{ fontSize: 14 }}>in</b> },
  pinterest: { bg: "#e60023", glyph: <b style={{ fontFamily: "Georgia, serif", fontSize: 17 }}>P</b> },
  threads: { bg: "#111111", glyph: <b style={{ fontSize: 16 }}>@</b> },
  spotify: {
    bg: "#1db954",
    glyph: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round">
        <path d="M6.5 9.5c3.8-1.2 7.8-.9 11 1M7.2 12.6c3-.9 6.2-.6 8.8.8M8 15.5c2.3-.6 4.5-.4 6.4.6" />
      </svg>
    ),
  },
};

export function SocialIcon({ network, iconUrl, label }: { network: SocialNetworkId; iconUrl?: string | null; label?: string | null }) {
  if (network === "custom") {
    return (
      <span className="vpa-sicon custom" aria-hidden="true">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" />
        ) : (
          <b>{label?.trim().charAt(0).toUpperCase() || "+"}</b>
        )}
      </span>
    );
  }
  const style = STYLE[network];
  return (
    <span className="vpa-sicon" style={{ background: style.bg }} aria-hidden="true">
      {style.glyph}
    </span>
  );
}
