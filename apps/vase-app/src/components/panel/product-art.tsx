import type { ReactNode } from "react";
import type { PlatformModuleKey } from "@/config/modules";

// Ilustraciones de cada producto. "tile" es la tarjeta grande de Inicio; "card", la de Mis productos.
const tile: Record<PlatformModuleKey, ReactNode> = {
  business: (
    <svg viewBox="0 0 310 264" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"><rect x="44" y="48" width="320" height="260" rx="18" fill="#ffffff" /><rect x="44" y="48" width="320" height="34" rx="17" fill="#d9f7e9" /><circle cx="66" cy="65" r="5.5" fill="#0d3b2a" /><rect x="84" y="60" width="96" height="10" rx="5" fill="#0d3b2a" opacity=".35" /><rect x="66" y="102" width="100" height="92" rx="12" fill="#7ff0bd" /><rect x="182" y="102" width="100" height="92" rx="12" fill="#d9f7e9" /><rect x="298" y="102" width="100" height="92" rx="12" fill="#7ff0bd" /><rect x="66" y="206" width="70" height="10" rx="5" fill="#0d3b2a" /><rect x="182" y="206" width="70" height="10" rx="5" fill="#0d3b2a" /><rect x="66" y="224" width="44" height="8" rx="4" fill="#0d3b2a" opacity=".35" /><rect x="182" y="224" width="44" height="8" rx="4" fill="#0d3b2a" opacity=".35" /><circle cx="48" cy="158" r="30" fill="#0d3b2a" stroke="#7ff0bd" strokeWidth="3" /><g transform="translate(-414 106)"><path d="M449 44h5l3.5 15h13l3-11h-18" fill="none" stroke="#7ff0bd" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="459" cy="65" r="2.5" fill="#7ff0bd" /><circle cx="470" cy="65" r="2.5" fill="#7ff0bd" /></g></svg>
  ),
  labs: (
    <svg viewBox="0 0 310 264" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"><rect x="28" y="40" width="222" height="58" rx="22" fill="#ffffff" /><rect x="50" y="58" width="150" height="10" rx="5" fill="#241a5c" /><rect x="50" y="76" width="96" height="8" rx="4" fill="#241a5c" opacity=".4" /><rect x="84" y="114" width="260" height="58" rx="22" fill="#b9a7ff" /><rect x="106" y="132" width="170" height="10" rx="5" fill="#241a5c" /><rect x="106" y="150" width="120" height="8" rx="4" fill="#241a5c" opacity=".5" /><rect x="28" y="188" width="100" height="42" rx="20" fill="#ffffff" /><circle cx="56" cy="209" r="5.5" fill="#241a5c" /><circle cx="78" cy="209" r="5.5" fill="#241a5c" opacity=".6" /><circle cx="100" cy="209" r="5.5" fill="#241a5c" opacity=".3" /><path d="M274 24l5.5 14 14 5.5-14 5.5-5.5 14-5.5-14-14-5.5 14-5.5z" fill="#b9a7ff" /></svg>
  ),
  management: (
    <svg viewBox="0 0 310 264" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"><rect x="60" y="176" width="44" height="88" rx="10" fill="#b45309" /><rect x="118" y="134" width="44" height="130" rx="10" fill="#d97706" /><rect x="176" y="96" width="44" height="168" rx="10" fill="#b45309" /><rect x="234" y="50" width="44" height="214" rx="10" fill="#7c2d12" /></svg>
  ),
  rest: (
    <svg viewBox="0 0 310 264" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"><circle cx="150" cy="132" r="96" fill="#ffffff" /><circle cx="150" cy="132" r="66" fill="none" stroke="#f3c7b4" strokeWidth="4" /><rect x="232" y="40" width="110" height="184" rx="12" fill="#ffe6d9" /><rect x="250" y="62" width="70" height="11" rx="5" fill="#7a2e1d" /><rect x="250" y="90" width="60" height="8" rx="4" fill="#7a2e1d" opacity=".5" /><rect x="250" y="110" width="70" height="8" rx="4" fill="#7a2e1d" opacity=".5" /></svg>
  ),
};

const card: Record<PlatformModuleKey, ReactNode> = {
  business: (
    <svg viewBox="0 0 560 196" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="110" y="34" width="340" height="190" rx="16" fill="#ffffff" /><rect x="110" y="34" width="340" height="30" rx="15" fill="#d9f7e9" /><circle cx="130" cy="49" r="5" fill="#0d3b2a" /><rect x="148" y="44" width="110" height="10" rx="5" fill="#0d3b2a" opacity=".35" /><rect x="128" y="80" width="90" height="74" rx="10" fill="#7ff0bd" /><rect x="235" y="80" width="90" height="74" rx="10" fill="#d9f7e9" /><rect x="342" y="80" width="90" height="74" rx="10" fill="#7ff0bd" /><rect x="128" y="164" width="60" height="9" rx="4.5" fill="#0d3b2a" /><rect x="235" y="164" width="60" height="9" rx="4.5" fill="#0d3b2a" /><rect x="342" y="164" width="60" height="9" rx="4.5" fill="#0d3b2a" /><circle cx="462" cy="52" r="30" fill="#7ff0bd" /><path d="M449 44h5l3.5 15h13l3-11h-18" fill="none" stroke="#0d3b2a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="459" cy="65" r="2.5" fill="#0d3b2a" /><circle cx="470" cy="65" r="2.5" fill="#0d3b2a" /></svg>
  ),
  labs: (
    <svg viewBox="0 0 560 196" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="92" y="30" width="238" height="50" rx="18" fill="#ffffff" /><rect x="112" y="46" width="150" height="9" rx="4.5" fill="#241a5c" /><rect x="112" y="60" width="96" height="7" rx="3.5" fill="#241a5c" opacity=".4" /><rect x="232" y="92" width="238" height="50" rx="18" fill="#b9a7ff" /><rect x="252" y="108" width="176" height="9" rx="4.5" fill="#241a5c" /><rect x="252" y="122" width="120" height="7" rx="3.5" fill="#241a5c" opacity=".5" /><rect x="92" y="154" width="92" height="36" rx="16" fill="#ffffff" /><circle cx="118" cy="172" r="5" fill="#241a5c" /><circle cx="138" cy="172" r="5" fill="#241a5c" opacity=".6" /><circle cx="158" cy="172" r="5" fill="#241a5c" opacity=".3" /><path d="M484 28l5.5 14 14 5.5-14 5.5-5.5 14-5.5-14-14-5.5 14-5.5z" fill="#b9a7ff" /></svg>
  ),
  management: (
    <svg viewBox="0 0 560 196" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="120" y="116" width="44" height="80" rx="10" fill="#b45309" /><rect x="184" y="84" width="44" height="112" rx="10" fill="#d97706" /><rect x="248" y="104" width="44" height="92" rx="10" fill="#b45309" /><rect x="312" y="58" width="44" height="138" rx="10" fill="#d97706" /><rect x="376" y="30" width="44" height="166" rx="10" fill="#7c2d12" /><path d="M112 92 180 58l66 22 66-46 84-22" fill="none" stroke="#3b1a06" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="396" cy="12" r="8" fill="#3b1a06" /></svg>
  ),
  rest: (
    <svg viewBox="0 0 560 196" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><circle cx="230" cy="100" r="78" fill="#ffffff" /><circle cx="230" cy="100" r="54" fill="none" stroke="#f3c7b4" strokeWidth="4" /><path d="M122 54v34a12 12 0 0 0 12 12v62M112 54v22M132 54v22M146 54v22" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" transform="translate(-34 0)" /><path d="M338 54c-14 8-18 28-18 46h18v62" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><rect x="384" y="30" width="108" height="150" rx="10" fill="#ffe6d9" /><rect x="400" y="48" width="76" height="10" rx="5" fill="#7a2e1d" /><rect x="400" y="72" width="60" height="7" rx="3.5" fill="#7a2e1d" opacity=".5" /><rect x="400" y="90" width="72" height="7" rx="3.5" fill="#7a2e1d" opacity=".5" /><rect x="400" y="108" width="50" height="7" rx="3.5" fill="#7a2e1d" opacity=".5" /><rect x="400" y="140" width="76" height="24" rx="8" fill="#7a2e1d" /></svg>
  ),
};

export function ProductArt({ product, variant }: { product: PlatformModuleKey; variant: "tile" | "card" }) {
  return <>{(variant === "tile" ? tile : card)[product]}</>;
}
