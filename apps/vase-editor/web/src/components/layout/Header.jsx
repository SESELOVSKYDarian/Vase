import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search as LucideSearch,
  ShoppingCart as LucideShoppingCart,
  Heart as LucideHeart,
  User as LucideUser,
  ChevronDown as LucideChevronDown,
  Menu as LucideMenu,
  X as LucideX,
} from "lucide-react";
import { useTenant } from "../../context/TenantContext";
import { useStore } from "../../context/StoreContext";
import { useAuth } from "../../context/AuthContext";
import { isExternalPath, navigate, normalizeInternalPath } from "../../utils/navigation";
import { getApiBase, getTenantHeaders } from "../../utils/api";
import { isPiquimTenantIdentity } from "../../utils/tenantBranding";

const DEFAULT_PLACEHOLDER = "Busca productos, categorias o marcas";
const HIDDEN_TOPICS = new Set(["buscador de tapas", "donde comprar", "mis proyectos", "messi"]);
const SEARCH_HISTORY_KEY = "piquim_search_terms_v1";
const SEARCH_HISTORY_LIMIT = 12;

const normalizeLabel = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const formatSearchTerm = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeCompact = (value) =>
  normalizeLabel(value).replace(/[^a-z0-9]/g, "");

const matchesQuery = (candidate, query) => {
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

const readSearchHistory = () => {
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

const writeSearchHistory = (items) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items.slice(0, SEARCH_HISTORY_LIMIT)));
  } catch {
    // ignore
  }
};

const BrandMark = ({ className = "size-8" }) => (
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

const SearchIcon = ({ className = "size-5" }) => (
  <LucideSearch className={className} strokeWidth={2.7} />
);

const CartIcon = ({ className = "size-5" }) => (
  <LucideShoppingCart className={className} strokeWidth={2.6} />
);

const HeartIcon = ({ className = "size-5" }) => (
  <LucideHeart className={className} strokeWidth={2.6} />
);

const UserIcon = ({ className = "size-5" }) => (
  <LucideUser className={className} strokeWidth={2.6} />
);

const ChevronDown = ({ className = "size-3" }) => (
  <LucideChevronDown className={className} strokeWidth={2.2} />
);

const MenuIcon = ({ className = "size-5" }) => (
  <LucideMenu className={className} strokeWidth={2.8} />
);

const CloseIcon = ({ className = "size-5" }) => (
  <LucideX className={className} strokeWidth={2.8} />
);

function MenuAnchor({ href, label, active = false, external = false, className = "" }) {
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

export default function Header({
  navLinks = [],
  searchPlaceholder = DEFAULT_PLACEHOLDER,
  brandName,
  brandUppercase = false,
  isPiquimPreset: isPiquimPresetProp,
  overlay = false,
  showSearch = true,
  showWishlist = true,
  showCart = true,
  showAccount = true,
  registerLabel = "Registrarse",
  registerHref = "/signup",
  containerClassName = "max-w-[1408px]",
}) {
  const { tenant, settings } = useTenant();
  const { search, setSearch, cartCount } = useStore();
  const { user, isAdmin } = useAuth();
  const [activeRoute, setActiveRoute] = useState(() => `${window.location.pathname}${window.location.search || ""}${window.location.hash || ""}`);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogBrands, setCatalogBrands] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileCategories, setExpandedMobileCategories] = useState({});
  const [activeMobileTab, setActiveMobileTab] = useState("menu"); // menu, categories, brands
  const [isDesktopSearchPinned, setIsDesktopSearchPinned] = useState(false);
  const [isDesktopSearchHovered, setIsDesktopSearchHovered] = useState(false);
  const [desktopSearchError, setDesktopSearchError] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [productIndex, setProductIndex] = useState([]);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const desktopSearchInputRef = useRef(null);
  const searchBoxRef = useRef(null);

  const resolvedBrand = brandName || settings?.branding?.name || tenant?.name || "Mi Negocio";
  const logoUrl = settings?.branding?.logo_url;

  useEffect(() => {
    const handleLocationChange = () => {
      setActiveRoute(`${window.location.pathname}${window.location.search || ""}${window.location.hash || ""}`);
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("navigate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("navigate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  useEffect(() => {
    setSearchHistory(readSearchHistory());
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setIsDesktopSearchPinned(false);
    setDesktopSearchError(false);
    setSearchSuggestionsOpen(false);
  }, [activeRoute]);

  useEffect(() => {
    if (!searchSuggestionsOpen) return undefined;
    const handleClickOutside = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setSearchSuggestionsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [searchSuggestionsOpen]);

  useEffect(() => {
    const term = formatSearchTerm(search);
    if (!term || term.length < 2) {
      setProductSuggestions([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url = new URL(`${getApiBase()}/public/products`);
        url.searchParams.set("q", term);
        url.searchParams.set("limit", "6");
        url.searchParams.set("page", "1");
        url.searchParams.set("grouped", "true");

        const response = await fetch(url.toString(), { headers: getTenantHeaders(), signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const fromApi = [...new Set(items.map((item) => String(item?.name || "").trim()).filter(Boolean))];
        const compactTerm = normalizeCompact(term);
        const fromIndex = productIndex.filter((name) => normalizeCompact(name).includes(compactTerm));
        setProductSuggestions([...new Set([...fromApi, ...fromIndex])].slice(0, 6));
      } catch (error) {
        if (error?.name !== "AbortError") {
          const compactTerm = normalizeCompact(term);
          const fromIndex = productIndex.filter((name) => normalizeCompact(name).includes(compactTerm));
          setProductSuggestions(fromIndex.slice(0, 6));
        }
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, productIndex]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadProductIndex = async () => {
      try {
        const url = new URL(`${getApiBase()}/public/products`);
        url.searchParams.set("limit", "200");
        url.searchParams.set("page", "1");
        url.searchParams.set("grouped", "true");
        const response = await fetch(url.toString(), { headers: getTenantHeaders(), signal: controller.signal });
        if (!response.ok || !active) return;
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const names = [...new Set(items.map((item) => String(item?.name || "").trim()).filter(Boolean))];
        setProductIndex(names);
      } catch {
        // ignore index load failures
      }
    };

    loadProductIndex();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!desktopSearchError) return undefined;
    const timer = setTimeout(() => setDesktopSearchError(false), 1800);
    return () => clearTimeout(timer);
  }, [desktopSearchError]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadCatalogMeta = async () => {
      try {
        const [categoriesRes, brandsRes] = await Promise.all([
          fetch(`${getApiBase()}/public/categories`, {
            headers: getTenantHeaders(),
            signal: controller.signal,
          }),
          fetch(`${getApiBase()}/public/brands`, {
            headers: getTenantHeaders(),
            signal: controller.signal,
          }),
        ]);

        if (active && categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          const normalizedCategories = Array.isArray(categoriesData)
            ? categoriesData
                .filter((item) => item && item.id && item.name)
                .filter((item) => !HIDDEN_TOPICS.has(normalizeLabel(item.name)))
                .map((item) => ({
                  id: item.id,
                  name: item.name,
                  slug: item.slug || null,
                  parent_id: item.parent_id || null,
                  parent_name: item.parent_name || null,
                }))
            : [];
          setCatalogCategories(normalizedCategories);
        }

        if (active && brandsRes.ok) {
          const brandsData = await brandsRes.json();
          const normalizedBrands = Array.isArray(brandsData)
            ? brandsData
                .filter((item) => typeof item === "string" && item.trim())
                .filter((item) => !HIDDEN_TOPICS.has(normalizeLabel(item)))
                .map((item) => item.trim())
            : [];
          setCatalogBrands(normalizedBrands);
        }
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error("No se pudo cargar metadata del navbar", error);
        }
      }
    };

    loadCatalogMeta();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const links = navLinks
    .map((link) => {
      if (typeof link === "string") {
        return { label: link, href: normalizeInternalPath(link, "/catalog") };
      }
      const fallbackByLabel = normalizeInternalPath(link?.label || "", "/");
      const rawHref = link?.href || link?.path || fallbackByLabel;
      return {
        ...link,
        href: normalizeInternalPath(rawHref, fallbackByLabel),
      };
    })
    .filter((item) => !HIDDEN_TOPICS.has(normalizeLabel(item?.label)));

  const normalizeRoute = (value) => {
    if (!value) return "/";
    if (isExternalPath(value)) return value;
    const normalizedValue = normalizeInternalPath(value, "/");
    const [rawPath, rawHash] = normalizedValue.split("#");
    let normalizedPath = rawPath || "/";
    if (normalizedPath === "/sobre-nosotros") normalizedPath = "/about";
    const hash = rawHash ? `#${rawHash}` : "";
    return `${normalizedPath}${hash}`;
  };

  const handleSearchKey = (event) => {
    if (event.key === "Enter") {
      const term = formatSearchTerm(search);
      if (term) {
        const next = readSearchHistory();
        const idx = next.findIndex((item) => normalizeLabel(item.term) === normalizeLabel(term));
        if (idx >= 0) {
          next[idx] = { ...next[idx], count: next[idx].count + 1, term };
        } else {
          next.push({ term, count: 1 });
        }
        const sorted = next.sort((a, b) => b.count - a.count).slice(0, SEARCH_HISTORY_LIMIT);
        writeSearchHistory(sorted);
        setSearchHistory(sorted);
      }
      setSearchSuggestionsOpen(false);
      navigate("/catalog");
    }
    if (event.key === "Escape") {
      setIsDesktopSearchPinned(false);
      setSearchSuggestionsOpen(false);
    }
  };

  const topSearches = useMemo(
    () => searchHistory.slice().sort((a, b) => b.count - a.count).map((item) => item.term).slice(0, 6),
    [searchHistory]
  );

  const categoryTree = useMemo(() => {
    if (!Array.isArray(catalogCategories) || !catalogCategories.length) return [];

    const byId = new Map();
    catalogCategories.forEach((item) => {
      byId.set(item.id, {
        id: item.id,
        slug: item.slug || null,
        name: item.name,
        parent_id: item.parent_id || null,
        children: [],
      });
    });

    const roots = [];
    byId.forEach((node) => {
      if (node.parent_id && byId.has(node.parent_id)) {
        byId.get(node.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sorter = (a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    roots.sort(sorter);
    roots.forEach((item) => item.children.sort(sorter));
    return roots;
  }, [catalogCategories]);

  const categorySuggestions = useMemo(() => {
    const q = formatSearchTerm(search);
    if (!q) return [];
    const names = categoryTree.flatMap((parent) => [parent.name, ...parent.children.map((child) => `${parent.name} / ${child.name}`)]);
    return [...new Set(names.filter((name) => matchesQuery(name, q)))].slice(0, 6);
  }, [categoryTree, search]);

  const suggestionItems = useMemo(() => {
    const q = formatSearchTerm(search);
    const popular = topSearches.filter((item) => !q || matchesQuery(item, q));
    const products = productSuggestions.filter((item) => !q || matchesQuery(item, q));
    return {
      popular: popular.slice(0, 6),
      products: products.slice(0, 6),
      categories: categorySuggestions.slice(0, 6),
    };
  }, [categorySuggestions, productSuggestions, search, topSearches]);

  const applySuggestion = useCallback((value) => {
    setSearch(value);
    setSearchSuggestionsOpen(false);
    setTimeout(() => navigate("/catalog"), 0);
  }, [setSearch]);

  const handleAccountClick = () => {
    if (user) {
      navigate(isAdmin ? "/admin" : "/profile");
    } else {
      navigate("/login");
    }
  };

  const handleMobileNavigate = (href) => {
    setMobileMenuOpen(false);
    navigate(href);
  };

  const whatsappRaw = settings?.branding?.footer?.socials?.whatsapp || settings?.commerce?.whatsapp_number || "";
  const whatsappCleaned = String(whatsappRaw).replace(/\D/g, "");
  const whatsappHref = whatsappCleaned ? `https://wa.me/${whatsappCleaned}` : null;

  useEffect(() => {
    setExpandedMobileCategories((prev) => {
      const next = {};
      categoryTree.forEach((parent) => {
        next[parent.id] = typeof prev[parent.id] === "boolean" ? prev[parent.id] : false;
      });
      return next;
    });
  }, [categoryTree]);

  const categoryLinks = useMemo(() => {
    const next = [];
    categoryTree.forEach((parent) => {
      next.push({
        label: parent.name,
        href: `/catalog?category=${encodeURIComponent(parent.id)}`,
      });
      parent.children.forEach((child) => {
        next.push({
          label: `${parent.name} / ${child.name}`,
          href: `/catalog?category=${encodeURIComponent(child.id)}`,
        });
      });
    });
    return next;
  }, [categoryTree]);

  const brandLinks = catalogBrands.slice(0, 10).map((brand) => ({
    label: brand,
    href: `/catalog?brand=${encodeURIComponent(brand)}`,
  }));

  const staticLinks = [
    { label: "Sobre nosotros", href: "/about", external: false },
  ];

  const extraLinks = links.filter((item) => {
    const key = normalizeLabel(item?.label);
    return !["inicio", "home", "catalogo", "catalog", "productos", "sobre nosotros", "nosotros", "contactanos", "contacto", "whatsapp", "ofertas"].includes(key);
  });

  const productsActive = activeRoute.startsWith("/catalog");
  const accountLabel = user ? "Mi cuenta" : "Ingresar";
  const isPiquimPreset = typeof isPiquimPresetProp === "boolean"
    ? isPiquimPresetProp
    : isPiquimTenantIdentity({ tenant, settings });

  const mobilePrimaryLinks = useMemo(() => {
    const seen = new Set();
    const entries = [
      { label: "Catalogo completo", href: "/catalog", external: false },
      ...staticLinks,
      ...extraLinks.map((item) => ({ label: item.label, href: item.href || "/", external: isExternalPath(item.href || "/") })),
    ];

    return entries.filter((item) => {
      const key = `${item.label}-${item.href}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [extraLinks, staticLinks]);

  if (isPiquimPreset) {
    const primaryLinks = links.length
      ? links
      : [
          { label: "Inicio", href: "/" },
          { label: "Catalogo", href: "/catalog" },
          { label: "Nosotros", href: "/about" },
        ];

    return (
      <>
       <header className={`sticky top-0 z-[1000] isolate w-full font-[var(--font-family)] ${overlay ? '-mt-[6px] -mb-[113px] max-md:-mb-[93px]' : ''}`}>
        <div className="w-full px-[60px] py-[18px] max-md:px-4">
          <div className="relative flex min-h-[68px] items-center gap-3 overflow-visible rounded-[30px] border border-[var(--store-border)] bg-[var(--store-header-bg)] px-[60px] py-[18px] shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition-colors duration-300 max-md:px-5">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex shrink-0 items-center gap-3 text-[var(--store-primary)]"
              aria-label="Ir a inicio"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={resolvedBrand} className="h-10 w-auto max-w-[150px] object-contain" />
              ) : (
                <img src="/piquim/catalogo/logo-navbar.png" alt={resolvedBrand} className="h-[31px] w-[108px] object-contain" />
              )}
            </button>

            <nav className={`hidden min-w-0 flex-1 items-center justify-center gap-2 pl-[160px] pr-2 py-1 transition-transform duration-300 lg:flex ${
              isDesktopSearchPinned || isDesktopSearchHovered ? "xl:translate-x-1 2xl:translate-x-3" : "xl:translate-x-3 2xl:translate-x-5"
            }`}>
              {primaryLinks.slice(0, 5).map((item) => {
                const target = item.href || "/";
                const isExternalTarget = isExternalPath(target);
                const normalizedTarget = isExternalTarget ? target : normalizeRoute(target);
                const active = !isExternalTarget && (normalizeRoute(activeRoute) === normalizedTarget || (target === "/catalog" && productsActive));
                return (
                  <a
                    key={`${item.label}-${target}`}
                    href={target}
                    onClick={(event) => {
                      if (isExternalTarget) return;
                      event.preventDefault();
                      navigate(target);
                    }}
                    target={isExternalTarget ? "_blank" : undefined}
                    rel={isExternalTarget ? "noopener noreferrer" : undefined}
                    className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
                      active ? "bg-[var(--store-primary)] text-white" : "text-[var(--store-text)] hover:bg-[var(--store-surface-elevated)]"
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>

            <div className="hidden min-w-0 shrink-0 justify-end gap-2 md:flex">
              {showSearch ? (
                <div
                  ref={searchBoxRef}
                  onMouseEnter={() => setIsDesktopSearchHovered(true)}
                  onMouseLeave={() => setIsDesktopSearchHovered(false)}
                  className={`group relative hidden h-12 items-center overflow-visible rounded-full transition-all duration-300 xl:flex ${
                    isDesktopSearchPinned ? "w-[320px] bg-[var(--store-input-bg)]" : "w-11 bg-transparent hover:w-[320px] hover:bg-[var(--store-input-bg)]"
                  } ${
                    desktopSearchError ? "ring-2 ring-[#ff4d00] ring-offset-2 ring-offset-transparent" : ""
                  }`}
                >
                  <input
                    ref={desktopSearchInputRef}
                    className={`h-11 w-full bg-transparent pl-4 pr-11 text-sm font-semibold text-[var(--store-text)] placeholder:text-[var(--store-muted-text)] focus:outline-none ${
                      isDesktopSearchPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    placeholder={searchPlaceholder}
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={handleSearchKey}
                    onFocus={() => {
                      setIsDesktopSearchPinned(true);
                      setDesktopSearchError(false);
                      setSearchSuggestionsOpen(true);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDesktopSearchPinned) {
                        setIsDesktopSearchPinned(true);
                        setTimeout(() => desktopSearchInputRef.current?.focus(), 0);
                        return;
                      }
                      if (!String(search || "").trim()) {
                        setDesktopSearchError(true);
                        desktopSearchInputRef.current?.focus();
                        return;
                      }
                      setDesktopSearchError(false);
                      navigate("/catalog");
                    }}
                    className="absolute right-0.5 top-0.5 flex h-10 w-10 items-center justify-center text-[var(--store-text)]"
                    aria-label="Buscar"
                  >
                    <SearchIcon />
                  </button>
                  {searchSuggestionsOpen && (suggestionItems.popular.length || suggestionItems.products.length || suggestionItems.categories.length) ? (
                    <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-[320px] rounded-2xl border border-[var(--store-border)] bg-[var(--store-surface)] p-3 text-[var(--store-text)] shadow-xl">
                      {suggestionItems.popular.length ? (
                        <div className="mb-2">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--store-primary)]">Mas buscados</p>
                          <div className="flex flex-wrap gap-2">
                            {suggestionItems.popular.map((item) => (
                              <button key={`popular-${item}`} type="button" onClick={() => applySuggestion(item)} className="rounded-full bg-[var(--store-surface-soft)] px-2.5 py-1 text-xs text-[var(--store-secondary)] hover:text-[var(--store-text)]">
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {suggestionItems.products.length ? (
                        <div>
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--store-primary)]">Autocompletar</p>
                          <div className="flex flex-col gap-1">
                            {suggestionItems.products.map((item) => (
                              <button key={`product-${item}`} type="button" onClick={() => applySuggestion(item)} className="rounded-lg px-2 py-1.5 text-left text-sm text-[var(--store-text)] hover:bg-[var(--store-surface-soft)]">
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {suggestionItems.categories.length ? (
                        <div className="mt-2">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--store-primary)]">Categorias</p>
                          <div className="flex flex-col gap-1">
                            {suggestionItems.categories.map((item) => (
                              <button key={`category-${item}`} type="button" onClick={() => applySuggestion(item)} className="rounded-lg px-2 py-1.5 text-left text-sm text-[var(--store-text)] hover:bg-[var(--store-surface-soft)]">
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {desktopSearchError ? (
                    <span className="pointer-events-none absolute left-4 top-[calc(100%+2px)] text-[11px] font-bold text-[#b42318]">
                      Escribi algo para buscar
                    </span>
                  ) : null}
                </div>
              ) : null}

              {showWishlist ? (
                <button
                  type="button"
                  onClick={() => navigate(user ? "/profile" : "/login")}
                  className="flex h-12 w-12 items-center justify-center text-[var(--store-text)] transition-colors hover:text-[var(--store-primary)]"
                  aria-label="Guardados"
                >
                  <HeartIcon />
                </button>
              ) : null}

              {showCart ? (
                <button
                  type="button"
                  onClick={() => navigate("/cart")}
                  className="relative flex h-12 w-12 items-center justify-center text-[var(--store-text)] transition-colors hover:text-[var(--store-primary)]"
                  aria-label="Carrito"
                >
                  <CartIcon />
                  {cartCount > 0 ? (
                    <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#ff4d00] px-1.5 text-center text-[10px] font-black leading-[18px] text-white">
                      {cartCount}
                    </span>
                  ) : null}
                </button>
              ) : null}

              {showAccount ? (
                <button
                  type="button"
                  onClick={() => (user ? handleAccountClick() : navigate(registerHref || "/signup"))}
                  className="hidden items-center justify-center rounded-full bg-[#ff4d00] px-5 py-3 text-center text-sm font-black leading-none text-white shadow-[0_12px_28px_rgba(255,77,0,0.24)] transition-transform hover:-translate-y-0.5 xl:inline-flex"
                >
                  {user ? "Mi cuenta" : registerLabel}
                </button>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-1.5 rounded-full border border-[var(--store-border)] bg-[var(--store-surface)] px-1.5 py-1 lg:hidden">
              {showWishlist ? (
                <button
                  type="button"
                  onClick={() => navigate(user ? "/profile" : "/login")}
                  className="group relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--store-text)] transition-colors hover:bg-[var(--store-surface-elevated)] hover:text-[var(--store-primary)]"
                  aria-label="Favoritos"
                  title="Favoritos"
                >
                  <HeartIcon className="size-5 transition-transform group-active:scale-90" />
                </button>
              ) : null}
              {showCart ? (
                <button
                  type="button"
                  onClick={() => navigate("/cart")}
                  className="group relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--store-text)] transition-colors hover:bg-[var(--store-surface-elevated)] hover:text-[var(--store-primary)]"
                  aria-label="Carrito"
                >
                  <CartIcon className="size-5 transition-transform group-active:scale-90" />
                  {cartCount > 0 ? (
                    <span className="absolute -right-1 -top-1 min-w-[16px] rounded-full bg-[#ff4d00] px-1 text-center text-[9px] font-bold leading-[16px] text-white shadow-[0_6px_14px_rgba(255,77,0,0.35)]">
                      {cartCount}
                    </span>
                  ) : null}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((current) => !current)}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  mobileMenuOpen ? "bg-[var(--store-primary)] text-white" : "text-[var(--store-text)] hover:bg-[var(--store-surface-elevated)] hover:text-[var(--store-primary)]"
                }`}
                aria-label={mobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
              >
                {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>

          {mobileMenuOpen ? (
            <div className="mt-3 rounded-[24px] border border-[var(--store-border)] bg-[var(--store-surface)] p-4 text-[var(--store-text)] shadow-2xl lg:hidden">
              {showSearch ? (
                <label className="relative block">
                  <input
                    className="h-11 w-full rounded-full border border-[var(--store-border)] bg-[var(--store-input-bg)] pl-4 pr-11 text-sm font-semibold text-[var(--store-text)] placeholder:text-[var(--store-muted-text)] focus:border-[var(--store-primary)] focus:outline-none"
                    placeholder={searchPlaceholder}
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={handleSearchKey}
                  />
                  <button
                    type="button"
                    onClick={() => navigate("/catalog")}
                    className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--store-primary)] text-white"
                    aria-label="Buscar"
                  >
                    <SearchIcon />
                  </button>
                </label>
              ) : null}

              <div className="mt-4 grid gap-2">
                {primaryLinks.map((item) => (
                  <button
                    key={`mobile-${item.label}-${item.href}`}
                    type="button"
                    onClick={() => handleMobileNavigate(item.href || "/")}
                    className="rounded-2xl bg-[var(--store-surface-soft)] px-4 py-3 text-left text-sm font-black text-[var(--store-text)]"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleAccountClick}
                  className="rounded-2xl bg-[var(--store-primary)] px-4 py-3 text-left text-sm font-black text-white"
                >
                  {user ? "Mi cuenta" : "Registrarse"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>
      {!overlay ? <div className="h-[113px] max-md:h-[93px]" aria-hidden="true" /> : null}
      </>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 bg-white/70 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-[#120c08]/70">
      <div className={`mx-auto ${containerClassName}`}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:flex-nowrap md:gap-8 md:px-10 md:py-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-[color:var(--color-primary,#0099e5)]"
            aria-label="Ir a inicio"
          >
            {logoUrl ? (
              <img src={logoUrl} alt={resolvedBrand} className="h-10 w-auto max-w-[160px] object-contain" />
            ) : (
              <>
                <BrandMark className="size-9" />
                <h2 className={`text-2xl font-black leading-none tracking-tighter sm:text-3xl font-['Manrope'] ${brandUppercase ? "uppercase" : ""}`}>
                  {resolvedBrand}
                </h2>
              </>
            )}
          </button>

          {showSearch ? (
            <label ref={searchBoxRef} className="relative order-3 w-full md:order-none md:flex-1 md:max-w-[520px]">
              <input
                className="h-11 w-full rounded-none border border-[#e4e9ef] bg-[#f7f8fa] pl-4 pr-12 text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[color:var(--color-primary,#0099e5)] focus:outline-none dark:border-[#3d2f21] dark:bg-[#1a130c] dark:text-[#f8f7f5] dark:placeholder:text-[#a59280]"
                placeholder={searchPlaceholder}
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={handleSearchKey}
                onFocus={() => setSearchSuggestionsOpen(true)}
              />
              <button
                type="button"
                onClick={() => navigate("/catalog")}
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-[color:var(--color-primary,#0099e5)]"
                aria-label="Buscar"
              >
                <SearchIcon />
              </button>
              {searchSuggestionsOpen && (suggestionItems.popular.length || suggestionItems.products.length || suggestionItems.categories.length) ? (
                <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full rounded-xl border border-[#E8DFD8] bg-white p-3 shadow-xl">
                  {suggestionItems.popular.length ? (
                    <div className="mb-2">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#A04100]">Mas buscados</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestionItems.popular.map((item) => (
                          <button key={`std-popular-${item}`} type="button" onClick={() => applySuggestion(item)} className="rounded-full bg-[#FFEDDE] px-2.5 py-1 text-xs text-[#5A4136] hover:bg-[#FFDCC1]">
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {suggestionItems.products.length ? (
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#A04100]">Autocompletar</p>
                      <div className="flex flex-col gap-1">
                        {suggestionItems.products.map((item) => (
                          <button key={`std-product-${item}`} type="button" onClick={() => applySuggestion(item)} className="rounded-lg px-2 py-1.5 text-left text-sm text-[#1A1614] hover:bg-[#FFF5ED]">
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {suggestionItems.categories.length ? (
                    <div className="mt-2">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#A04100]">Categorias</p>
                      <div className="flex flex-col gap-1">
                        {suggestionItems.categories.map((item) => (
                          <button key={`std-category-${item}`} type="button" onClick={() => applySuggestion(item)} className="rounded-lg px-2 py-1.5 text-left text-sm text-[#1A1614] hover:bg-[#FFF5ED]">
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </label>
          ) : (
            <div className="hidden md:block md:flex-1" />
          )}

          <div className="ml-auto hidden items-center gap-7 text-[10px] font-semibold uppercase text-[#4a4a4a] dark:text-[#cdbca9] lg:flex">
            {showCart ? (
              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="relative inline-flex flex-col items-center gap-0.5 hover:text-[color:var(--color-primary,#0099e5)]"
                title="Carrito"
              >
                <CartIcon className="size-5 text-[color:var(--color-primary,#0099e5)]" />
                <span>Carrito</span>
                {cartCount > 0 ? (
                  <span className="absolute -right-3 -top-2 min-w-[16px] rounded-full bg-[#ef4444] px-1.5 text-center text-[10px] font-bold leading-[16px] text-white">
                    {cartCount}
                  </span>
                ) : null}
              </button>
            ) : null}

            {showAccount ? (
              <button
                type="button"
                onClick={handleAccountClick}
                className="inline-flex flex-col items-center gap-0.5 hover:text-[color:var(--color-primary,#0099e5)]"
                title={accountLabel}
              >
                <UserIcon className="size-5 text-[color:var(--color-primary,#0099e5)]" />
                <span>{accountLabel}</span>
              </button>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2 lg:hidden">
            {showCart ? (
              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="relative flex h-9 w-9 items-center justify-center rounded-md border border-[#e4e9ef] text-[color:var(--color-primary,#0099e5)] dark:border-[#3d2f21] dark:bg-[#1a130c]"
                aria-label="Carrito"
              >
                <CartIcon />
                {cartCount > 0 ? (
                  <span className="absolute -right-1 -top-1 min-w-[14px] rounded-full bg-[#ef4444] px-1 text-center text-[9px] font-bold leading-[14px] text-white">
                    {cartCount}
                  </span>
                ) : null}
              </button>
            ) : null}
            {showAccount ? (
              <button
                type="button"
                onClick={handleAccountClick}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e4e9ef] text-[color:var(--color-primary,#0099e5)] dark:border-[#3d2f21] dark:bg-[#1a130c]"
                aria-label="Cuenta"
              >
                <UserIcon />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e4e9ef] text-[color:var(--color-primary,#0099e5)] dark:border-[#3d2f21] dark:bg-[#1a130c]"
              aria-label={mobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        <div className="border-t border-[#e4e9ef] dark:border-[#3d2f21]">
          <nav className="relative hidden h-12 items-center justify-center gap-9 px-4 md:flex">
            <div className="group h-full">
              <button
                type="button"
                onClick={() => navigate("/catalog")}
                className={`inline-flex h-full items-center gap-1 border-b-2 text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors ${
                  productsActive
                    ? "border-[color:var(--color-primary,#0099e5)] text-[color:var(--color-primary,#0099e5)]"
                    : "border-transparent text-[#1f2937] hover:text-[color:var(--color-primary,#0099e5)] dark:text-[#e7ddd3]"
                }`}
              >
                Productos
                <ChevronDown className="size-3" />
              </button>

              <div className="invisible absolute left-1/2 top-full z-50 mt-2 w-[min(95vw,1080px)] -translate-x-1/2 rounded-md border border-[#e4e9ef] bg-white p-6 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100 dark:border-[#3d2f21] dark:bg-[#1a130c]">
                <div className="max-h-[68vh] overflow-y-auto pr-1">
                  {categoryTree.length ? (
                    <div className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                      {categoryTree.map((parent) => (
                        <div key={`parent-${parent.id}`}>
                          <a
                            href={`/catalog?category=${encodeURIComponent(parent.id)}`}
                            onClick={(event) => {
                              event.preventDefault();
                              navigate(`/catalog?category=${encodeURIComponent(parent.id)}`);
                            }}
                            className="block text-[12px] font-black uppercase tracking-[0.08em] text-[color:var(--color-primary,#0099e5)] hover:opacity-80"
                          >
                            {parent.name}
                          </a>
                          <div className="mt-2 space-y-1.5">
                            {parent.children.length ? (
                              parent.children.map((child) => (
                                <a
                                  key={`child-${child.id}`}
                                  href={`/catalog?category=${encodeURIComponent(child.id)}`}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    navigate(`/catalog?category=${encodeURIComponent(child.id)}`);
                                  }}
                                  className="block text-[15px] leading-tight text-[#4b5563] hover:text-[color:var(--color-primary,#0099e5)] dark:text-[#cdbca9]"
                                >
                                  {child.name}
                                </a>
                              ))
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6b7280] dark:text-[#a59280]">No hay categorias disponibles.</p>
                  )}

                  {brandLinks.length ? (
                    <div className="mt-6 border-t border-[#eef2f7] pt-4 dark:border-[#3d2f21]">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6b7280] dark:text-[#a59280]">Marcas</p>
                      <div className="flex flex-wrap gap-2">
                        {brandLinks.map((item) => (
                          <a
                            key={`brand-${item.href}`}
                            href={item.href}
                            onClick={(event) => {
                              event.preventDefault();
                              navigate(item.href);
                            }}
                            className="rounded-full border border-[#dbe2ea] px-2.5 py-1 text-[12px] text-[#1f2937] hover:border-[color:var(--color-primary,#0099e5)] hover:text-[color:var(--color-primary,#0099e5)] dark:border-[#3d2f21] dark:text-[#e7ddd3]"
                          >
                            {item.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {staticLinks.map((item) => {
              const normalizedTarget = item.external ? item.href : normalizeRoute(item.href);
              const isActive = !item.external && normalizeRoute(activeRoute) === normalizedTarget;
              return (
                <MenuAnchor
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  label={item.label}
                  active={isActive}
                  external={item.external}
                  className="h-full"
                />
              );
            })}

            {extraLinks.map((item) => {
              const target = item.href || "/";
              const isExternalTarget = isExternalPath(target);
              const normalizedTarget = isExternalTarget ? target : normalizeRoute(target);
              const isActive = !isExternalTarget && normalizeRoute(activeRoute) === normalizedTarget;
              return (
                <MenuAnchor
                  key={`${item.label}-${target}`}
                  href={target}
                  label={item.label}
                  active={isActive}
                  external={isExternalTarget}
                  className="h-full"
                />
              );
            })}

            {whatsappHref ? (
              <MenuAnchor
                href={whatsappHref}
                label="Contactanos"
                external
                className="h-full"
              />
            ) : null}
          </nav>


          <div className="lg:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1f2937] dark:text-[#e7ddd3]">
              <button type="button" onClick={() => handleMobileNavigate("/catalog")} className="text-left">
                Catalogo
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((current) => !current)}
                className="inline-flex items-center gap-2 text-[color:var(--color-primary,#0099e5)]"
              >
                {mobileMenuOpen ? "Cerrar menu" : "Explorar menu"}
                <ChevronDown className={`size-3 transition-transform ${mobileMenuOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {mobileMenuOpen ? (
              <div className="flex flex-col h-full bg-white dark:bg-[#120c08]">
                {/* Tabs Selector */}
                <div className="flex border-b border-[#e4e9ef] dark:border-[#3d2f21]">
                  <button
                    onClick={() => setActiveMobileTab("menu")}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                      activeMobileTab === "menu"
                        ? "border-b-2 border-[color:var(--color-primary,#0099e5)] text-[color:var(--color-primary,#0099e5)]"
                        : "text-[#8a7560] hover:text-[#1f2937] dark:hover:text-[#f8f7f5]"
                    }`}
                  >
                    Explorar
                  </button>
                  <button
                    onClick={() => setActiveMobileTab("categories")}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                      activeMobileTab === "categories"
                        ? "border-b-2 border-[color:var(--color-primary,#0099e5)] text-[color:var(--color-primary,#0099e5)]"
                        : "text-[#8a7560] hover:text-[#1f2937] dark:hover:text-[#f8f7f5]"
                    }`}
                  >
                    Categorias
                  </button>
                  <button
                    onClick={() => setActiveMobileTab("brands")}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                      activeMobileTab === "brands"
                        ? "border-b-2 border-[color:var(--color-primary,#0099e5)] text-[color:var(--color-primary,#0099e5)]"
                        : "text-[#8a7560] hover:text-[#1f2937] dark:hover:text-[#f8f7f5]"
                    }`}
                  >
                    Marcas
                  </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-4 py-6 custom-scrollbar">
                  {activeMobileTab === "menu" && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <p className="mb-4 text-[11px] font-black uppercase tracking-[0.14em] text-[#8a7560]">Accesos directos</p>
                      <div className="grid grid-cols-1 gap-2">
                        {mobilePrimaryLinks.map((item) => (
                          <button
                            key={`mobile-p-${item.label}`}
                            type="button"
                            onClick={() => (item.external ? window.open(item.href, '_blank') : handleMobileNavigate(item.href))}
                            className="flex items-center justify-between rounded-xl border border-[#dbe2ea] bg-slate-50/50 px-5 py-4 text-left text-sm font-bold text-[#1f2937] transition-all active:scale-95 dark:border-[#3d2f21] dark:bg-[#1a130c] dark:text-[#e7ddd3]"
                          >
                            {item.label}
                            <svg className="size-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {activeMobileTab === "categories" && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8a7560]">Catalogo por rubro</p>
                        <button onClick={() => handleMobileNavigate("/catalog")} className="text-[10px] font-bold text-[color:var(--color-primary,#0099e5)] underline underline-offset-2">Ver todo</button>
                      </div>

                      {categoryTree.length ? (
                        <div className="grid grid-cols-2 gap-3">
                          {categoryTree.map((parent) => (
                            <div key={`mobile-cat-grid-${parent.id}`} className="group flex flex-col">
                              <button
                                type="button"
                                onClick={() => handleMobileNavigate(`/catalog?category=${encodeURIComponent(parent.id)}`)}
                                className="flex flex-col items-start rounded-2xl border border-[#e6ecf2] bg-[#f8fafc] p-4 text-left transition-all active:bg-[#e4e9ef] dark:border-[#2c1f16] dark:bg-[#1a130c]"
                              >
                                <span className="text-[13px] font-black leading-tight text-[color:var(--color-primary,#0099e5)]">{parent.name}</span>
                                <span className="mt-1 text-[10px] font-semibold text-[#8a7560]">{parent.children.length} subrubros</span>
                              </button>

                              {parent.children.length > 0 && (
                                <button
                                  onClick={() => setExpandedMobileCategories(prev => ({ ...prev, [parent.id]: !prev[parent.id] }))}
                                  className="mt-1 flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-[#64748b] hover:text-[#1f2937] dark:text-[#a59280]"
                                >
                                  {expandedMobileCategories[parent.id] ? "Ocultar detalles" : "Ver subrubros"}
                                  <ChevronDown className={`size-2.5 transition-transform ${expandedMobileCategories[parent.id] ? "rotate-180" : ""}`} />
                                </button>
                              )}

                              {expandedMobileCategories[parent.id] && parent.children.length > 0 && (
                                <div className="mt-2 flex flex-col gap-1 border-l-2 border-[#e6ecf2] pl-3 animate-in fade-in slide-in-from-top-2 dark:border-[#2c1f16]">
                                  {parent.children.map((child) => (
                                    <button
                                      key={`mob-sub-${child.id}`}
                                      onClick={() => handleMobileNavigate(`/catalog?category=${encodeURIComponent(child.id)}`)}
                                      className="py-1.5 text-left text-[12px] font-medium text-[#4b5563] active:text-[color:var(--color-primary,#0099e5)] dark:text-[#cdbca9]"
                                    >
                                      {child.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border-2 border-dashed border-[#e6ecf2] p-8 text-center text-[#8a7560] dark:border-[#2c1f16]">
                          Cargando categorias...
                        </div>
                      )}
                    </section>
                  )}

                  {activeMobileTab === "brands" && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <p className="mb-4 text-[11px] font-black uppercase tracking-[0.14em] text-[#8a7560]">Nuestras marcas</p>
                      {brandLinks.length ? (
                        <div className="grid grid-cols-2 gap-2">
                          {brandLinks.map((item) => (
                            <button
                              key={`mobile-br-${item.label}`}
                              type="button"
                              onClick={() => handleMobileNavigate(item.href)}
                              className="rounded-xl border border-[#dbe2ea] bg-white px-4 py-3 text-left text-xs font-bold text-[#1f2937] shadow-sm transition-all active:scale-95 dark:border-[#3d2f21] dark:bg-[#1a130c] dark:text-[#e7ddd3]"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="py-10 text-center text-sm text-[#8a7560]">No hay marcas disponibles.</p>
                      )}
                    </section>
                  )}
                </div>

                {/* Footer simple for mobile menu */}
                <div className="mt-auto border-t border-[#e4e9ef] bg-[#f8fafc] p-6 dark:border-[#3d2f21] dark:bg-[#1a130c]/50">
                   <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#8a7560]">¿Necesitas ayuda?</p>
                        <p className="text-xs font-bold text-[#1f2937] dark:text-[#e7ddd3]">Escribenos por WhatsApp</p>
                      </div>
                      {whatsappHref && (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex size-10 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-green-500/20 active:scale-90 transition-transform"
                        >
                          <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-2.335 0-4.241 1.906-4.241 4.241 0 .741.194 1.436.53 2.031l-.564 2.057 2.106-.552c.571.31 1.221.495 1.914.495 2.335 0 4.241-1.906 4.241-4.241 0-2.335-1.906-4.241-4.241-4.241zm3.11 5.617c-.126.126-.541.313-.746.331-.205.018-.466.014-.766-.082-.3-.096-.65-.213-1.071-.397-.421-.184-.791-.453-1.109-.771-.318-.318-.587-.688-.771-1.109-.184-.421-.301-.771-.397-1.071-.096-.3-.1-.561-.082-.766.018-.205.205-.62.331-.746.126-.126.21-.157.283-.157.073 0 .147.009.215.013.068.004.142.008.201.12.059.112.184.449.201.487.017.038.026.084.004.131-.022.047-.047.073-.094.131l-.141.164c-.047.054-.097.113-.041.21.056.097.248.409.533.662.285.253.525.333.622.378.097.045.153.037.21-.028.057-.065.244-.285.309-.383.065-.098.131-.082.22-.047.089.035.565.267.663.316.098.049.164.073.188.113.024.04.024.234-.102.36zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.658 1.438 5.161l-1.438 5.243 5.362-1.407C8.749 21.65 10.309 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.558 0-3.007-.432-4.241-1.178l-3.041.798.814-2.964C4.782 15.656 4 14.075 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>
                        </a>
                      )}
                   </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
