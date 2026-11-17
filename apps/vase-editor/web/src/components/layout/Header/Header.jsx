// Parte de Header.jsx: Header.
// partes: ./PiquimHeader.jsx, ./HeaderMobileMenu.jsx, ./StoreHeader.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTenant } from "../../../context/TenantContext";
import { useStore } from "../../../context/StoreContext";
import { useAuth } from "../../../context/AuthContext";
import { isExternalPath, navigate, normalizeInternalPath } from "../../../utils/navigation";
import { isExtraNavLink, storeText } from "../../../utils/storeTexts";
import { getApiBase, getTenantHeaders } from "../../../utils/api";
import { isPiquimTenantIdentity } from "../../../utils/tenantBranding";
import { buildCategorySuggestionHref } from "../../../utils/piquimCatalogCategories";
import { BrandMark, CartIcon, ChevronDown, CloseIcon, DEFAULT_PLACEHOLDER, HIDDEN_TOPICS, HeartIcon, MenuAnchor, MenuIcon, SEARCH_HISTORY_LIMIT, SearchIcon, UserIcon, formatSearchTerm, matchesQuery, normalizeCompact, normalizeLabel, readSearchHistory, writeSearchHistory } from "./MenuAnchor.jsx";

import PiquimHeader from './PiquimHeader.jsx';
import HeaderMobileMenu from './HeaderMobileMenu.jsx';
import StoreHeader from './StoreHeader.jsx';
export default function Header({
  navLinks = [],
  searchPlaceholder: searchPlaceholderProp = DEFAULT_PLACEHOLDER,
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
  const navbarTexts = settings?.branding?.navbar || {};
  const searchPlaceholder = String(navbarTexts.search_placeholder || "").trim() || searchPlaceholderProp;
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
  const piquimHeaderRef = useRef(null);
  const [piquimHeaderHeight, setPiquimHeaderHeight] = useState(0);

  // Con overlay el contenido (hero) sube por debajo del header. El desplazamiento se mide en vez de
  // fijarlo a mano: un valor fijo dejaba una franja de ~3 px del color del tema sobre el hero.
  useEffect(() => {
    const element = piquimHeaderRef.current;
    if (!overlay || !element || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => setPiquimHeaderHeight(Math.ceil(element.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [overlay]);

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
        // Solo nombres: el listado completo de productos pesa cientos de MB por las imagenes.
        const response = await fetch(`${getApiBase()}/public/products/names`, {
          headers: getTenantHeaders(),
          signal: controller.signal,
        });
        if (!response.ok || !active) return;
        const data = await response.json();
        const names = Array.isArray(data?.names)
          ? [...new Set(data.names.map((name) => String(name || "").trim()).filter(Boolean))]
          : [];
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
    .filter((item) => item?.custom || !HIDDEN_TOPICS.has(normalizeLabel(item?.label)));

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

  const isPiquimPreset = typeof isPiquimPresetProp === "boolean"
    ? isPiquimPresetProp
    : isPiquimTenantIdentity({ tenant, settings });

  // Cada sugerencia lleva su link: al tocarla se abre la categoria, no se busca el texto.
  const categorySuggestions = useMemo(() => {
    const q = formatSearchTerm(search);
    if (!q) return [];
    const entries = categoryTree.flatMap((parent) => [
      { label: parent.name, href: buildCategorySuggestionHref({ category: parent, isPiquim: isPiquimPreset }) },
      ...parent.children.map((child) => ({
        label: `${parent.name} / ${child.name}`,
        href: buildCategorySuggestionHref({ category: child, parent, isPiquim: isPiquimPreset }),
      })),
    ]);
    const seen = new Set();
    return entries
      .filter((entry) => matchesQuery(entry.label, q))
      .filter((entry) => !seen.has(entry.label) && seen.add(entry.label))
      .slice(0, 6);
  }, [categoryTree, isPiquimPreset, search]);

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

  const applyCategorySuggestion = useCallback((entry) => {
    setSearch("");
    setSearchSuggestionsOpen(false);
    setTimeout(() => navigate(entry.href), 0);
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
        href: buildCategorySuggestionHref({ category: parent, isPiquim: isPiquimPreset }),
      });
      parent.children.forEach((child) => {
        next.push({
          label: `${parent.name} / ${child.name}`,
          href: buildCategorySuggestionHref({ category: child, parent, isPiquim: isPiquimPreset }),
        });
      });
    });
    return next;
  }, [categoryTree, isPiquimPreset]);

  const brandLinks = catalogBrands.slice(0, 10).map((brand) => ({
    label: brand,
    href: `/catalog?brand=${encodeURIComponent(brand)}`,
  }));

  const aboutHref = navbarTexts.about_href || "/about";
  const staticLinks = navbarTexts.show_about === false ? [] : [
    { label: storeText("header", "about_label", navbarTexts), href: aboutHref, external: isExternalPath(aboutHref) },
  ];

  const extraLinks = links.filter(isExtraNavLink);

  const productsActive = activeRoute.startsWith("/catalog");
  const accountLabel = user ? "Mi cuenta" : "Ingresar";

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
       <PiquimHeader activeRoute={activeRoute} applyCategorySuggestion={applyCategorySuggestion} applySuggestion={applySuggestion} cartCount={cartCount} desktopSearchError={desktopSearchError} desktopSearchInputRef={desktopSearchInputRef} handleAccountClick={handleAccountClick} handleMobileNavigate={handleMobileNavigate} handleSearchKey={handleSearchKey} isDesktopSearchHovered={isDesktopSearchHovered} isDesktopSearchPinned={isDesktopSearchPinned} logoUrl={logoUrl} mobileMenuOpen={mobileMenuOpen} normalizeRoute={normalizeRoute} overlay={overlay} piquimHeaderHeight={piquimHeaderHeight} piquimHeaderRef={piquimHeaderRef} primaryLinks={primaryLinks} productsActive={productsActive} registerHref={registerHref} registerLabel={registerLabel} resolvedBrand={resolvedBrand} search={search} searchBoxRef={searchBoxRef} searchPlaceholder={searchPlaceholder} searchSuggestionsOpen={searchSuggestionsOpen} setDesktopSearchError={setDesktopSearchError} setIsDesktopSearchHovered={setIsDesktopSearchHovered} setIsDesktopSearchPinned={setIsDesktopSearchPinned} setMobileMenuOpen={setMobileMenuOpen} setSearch={setSearch} setSearchSuggestionsOpen={setSearchSuggestionsOpen} showAccount={showAccount} showCart={showCart} showSearch={showSearch} showWishlist={showWishlist} suggestionItems={suggestionItems} user={user} />
      </>
    );
  }

  return (
    <StoreHeader accountLabel={accountLabel} activeMobileTab={activeMobileTab} activeRoute={activeRoute} applyCategorySuggestion={applyCategorySuggestion} applySuggestion={applySuggestion} brandLinks={brandLinks} brandUppercase={brandUppercase} cartCount={cartCount} categoryTree={categoryTree} containerClassName={containerClassName} expandedMobileCategories={expandedMobileCategories} extraLinks={extraLinks} handleAccountClick={handleAccountClick} handleMobileNavigate={handleMobileNavigate} handleSearchKey={handleSearchKey} logoUrl={logoUrl} mobileMenuOpen={mobileMenuOpen} mobilePrimaryLinks={mobilePrimaryLinks} navbarTexts={navbarTexts} normalizeRoute={normalizeRoute} productsActive={productsActive} resolvedBrand={resolvedBrand} search={search} searchBoxRef={searchBoxRef} searchPlaceholder={searchPlaceholder} searchSuggestionsOpen={searchSuggestionsOpen} setActiveMobileTab={setActiveMobileTab} setExpandedMobileCategories={setExpandedMobileCategories} setMobileMenuOpen={setMobileMenuOpen} setSearch={setSearch} setSearchSuggestionsOpen={setSearchSuggestionsOpen} showAccount={showAccount} showCart={showCart} showSearch={showSearch} staticLinks={staticLinks} suggestionItems={suggestionItems} whatsappHref={whatsappHref} />
  );
}
