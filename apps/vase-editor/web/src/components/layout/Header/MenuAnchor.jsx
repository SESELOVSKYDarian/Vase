// Parte de Header.jsx: DEFAULT_PLACEHOLDER, HIDDEN_TOPICS, SEARCH_HISTORY_KEY, SEARCH_HISTORY_LIMIT, normalizeLabel, formatSearchTerm y más.
import { ChevronDown as LucideChevronDown, Heart as LucideHeart, Menu as LucideMenu, Search as LucideSearch, ShoppingCart as LucideShoppingCart, User as LucideUser, X as LucideX } from "lucide-react";
import { navigate } from "../../../utils/navigation";

export const DEFAULT_PLACEHOLDER = "Busca productos, categorias o marcas";
export const HIDDEN_TOPICS = new Set(["buscador de tapas", "donde comprar", "mis proyectos", "messi"]);
export const SEARCH_HISTORY_KEY = "piquim_search_terms_v1";
export const SEARCH_HISTORY_LIMIT = 12;

export const normalizeLabel = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const formatSearchTerm = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

export const normalizeCompact = (value) =>
  normalizeLabel(value).replace(/[^a-z0-9]/g, "");

export const matchesQuery = (candidate, query) => {
  const normalizedCandidate = normalizeLabel(candidate);
  const normalizedQuery = normalizeLabel(query);
  if (!normalizedQuery) return true;
  if (normalizedCandidate.includes(normalizedQuery)) return true;

  const compactCandidate = normalizeCompact(candidate);
  const compactQuery = normalizeCompact(query);
  if (compactQuery && compactCandidate.includes(compactQuery)) return true;

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  if (!tokens.length) return false;
  return tokens.every((token) => normalizedCandidate.includes(token) || compactCandidate.includes(token));
};

export const readSearchHistory = () => {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        term: formatSearchTerm(item?.term || item),
        count: Number(item?.count || 0) || 0,
      }))
      .filter((item) => item.term);
  } catch {
    return [];
  }
};

export const writeSearchHistory = (items) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items.slice(0, SEARCH_HISTORY_LIMIT)));
  } catch {
    // ignore
  }
};

export const BrandMark = ({ className = "size-8" }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="2" width="28" height="28" rx="8" stroke="currentColor" strokeWidth="2.5" />
    <path d="M10 8.5h6.8c3.98 0 6.7 2.25 6.7 5.75 0 3.74-2.72 6.05-6.96 6.05H15V24h-5V8.5Zm5 4.1v3.7h1.3c1.44 0 2.26-.58 2.26-1.83 0-1.18-.82-1.87-2.26-1.87H15Z" fill="currentColor" />
  </svg>
);

export const SearchIcon = ({ className = "size-5" }) => (
  <LucideSearch className={className} strokeWidth={2.7} />
);

export const CartIcon = ({ className = "size-5" }) => (
  <LucideShoppingCart className={className} strokeWidth={2.6} />
);

export const HeartIcon = ({ className = "size-5" }) => (
  <LucideHeart className={className} strokeWidth={2.6} />
);

export const UserIcon = ({ className = "size-5" }) => (
  <LucideUser className={className} strokeWidth={2.6} />
);

export const ChevronDown = ({ className = "size-3" }) => (
  <LucideChevronDown className={className} strokeWidth={2.2} />
);

export const MenuIcon = ({ className = "size-5" }) => (
  <LucideMenu className={className} strokeWidth={2.8} />
);

export const CloseIcon = ({ className = "size-5" }) => (
  <LucideX className={className} strokeWidth={2.8} />
);

export function MenuAnchor({ href, label, active = false, external = false, className = "" }) {
  const finalClass = `inline-flex items-center gap-1 border-b-2 text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors ${
    active
      ? "border-[color:var(--color-primary,#0099e5)] text-[color:var(--color-primary,#0099e5)]"
      : "border-transparent text-[#1f2937] hover:text-[color:var(--color-primary,#0099e5)] dark:text-[#e7ddd3]"
  } ${className}`;

  if (external) {
    return (
      <a className={finalClass} href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }

  return (
    <a
      className={finalClass}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        navigate(href);
      }}
    >
      {label}
    </a>
  );
}
