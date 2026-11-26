// Encabezado común de las tiendas: logo, buscador, carrito y cuenta.
import HeaderMobileMenu from './HeaderMobileMenu.jsx';
import { BrandMark } from './MenuAnchor.jsx';
import { CartIcon } from './MenuAnchor.jsx';
import { ChevronDown } from './MenuAnchor.jsx';
import { CloseIcon } from './MenuAnchor.jsx';
import { MenuAnchor } from './MenuAnchor.jsx';
import { MenuIcon } from './MenuAnchor.jsx';
import { SearchIcon } from './MenuAnchor.jsx';
import { UserIcon } from './MenuAnchor.jsx';
import { isExternalPath } from '../../../utils/navigation';
import { navigate } from '../../../utils/navigation';
import { storeText } from '../../../utils/storeTexts';
import StoreLogo from '../StoreLogo.jsx';

export default function StoreHeader({ accountLabel, activeMobileTab, activeRoute, applyCategorySuggestion, applySuggestion, brandLinks, brandUppercase, cartCount, categoryTree, containerClassName, expandedMobileCategories, extraLinks, handleAccountClick, handleMobileNavigate, handleSearchKey, logoUrl, mobileMenuOpen, mobilePrimaryLinks, navbarTexts, normalizeRoute, productsActive, resolvedBrand, search, searchBoxRef, searchPlaceholder, searchSuggestionsOpen, setActiveMobileTab, setExpandedMobileCategories, setMobileMenuOpen, setSearch, setSearchSuggestionsOpen, showAccount, showCart, showSearch, staticLinks, suggestionItems, whatsappHref }) {
    const navProps = { activeRoute, brandLinks, categoryTree, extraLinks, navbarTexts, normalizeRoute, productsActive, staticLinks, whatsappHref };
    return (
        <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 bg-white/70 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-[#120c08]/70">
          <div className={`relative mx-auto ${containerClassName}`}>
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:flex-nowrap md:gap-8 md:px-10 md:py-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex items-center gap-3 text-[color:var(--color-primary,#0099e5)]"
                aria-label="Ir a inicio"
              >
                {logoUrl ? (
                  <StoreLogo src={logoUrl} alt={resolvedBrand} className="h-11 w-auto max-w-[180px] md:h-14 md:max-w-[230px]" />
                ) : (
                  <>
                    <BrandMark className="size-9" />
                    <h2 className={`text-2xl font-black leading-none tracking-tighter sm:text-3xl font-['Manrope'] ${brandUppercase ? "uppercase" : ""}`}>
                      {resolvedBrand}
                    </h2>
                  </>
                )}
              </button>

              <nav className="hidden h-12 items-center gap-7 lg:flex">
                <DesktopNavLinks {...navProps} />
              </nav>

              {showSearch ? (
                <label ref={searchBoxRef} className="relative order-3 w-full md:order-none md:flex-1 md:max-w-[520px] lg:max-w-[420px]">
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
                              <button key={`std-category-${item.href}`} type="button" onClick={() => applyCategorySuggestion(item)} className="rounded-lg px-2 py-1.5 text-left text-sm text-[#1A1614] hover:bg-[#FFF5ED]">
                                {item.label}
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

            <div className="border-t border-[#e4e9ef] dark:border-[#3d2f21] lg:border-t-0">
              {/* En pantallas medianas el menú va en una segunda fila; en grandes va arriba, al lado del logo. */}
              <nav className="hidden h-12 items-center justify-center gap-9 px-4 md:flex lg:hidden">
                <DesktopNavLinks {...navProps} />
              </nav>


              <HeaderMobileMenu activeMobileTab={activeMobileTab} brandLinks={brandLinks} categoryTree={categoryTree} expandedMobileCategories={expandedMobileCategories} handleMobileNavigate={handleMobileNavigate} mobileMenuOpen={mobileMenuOpen} mobilePrimaryLinks={mobilePrimaryLinks} navbarTexts={navbarTexts} setActiveMobileTab={setActiveMobileTab} setExpandedMobileCategories={setExpandedMobileCategories} setMobileMenuOpen={setMobileMenuOpen} whatsappHref={whatsappHref} />
            </div>
          </div>
        </header>
    );
}

/** Links del menú (Productos con su desplegable, páginas fijas, links extra y Contacto). Se usa en las dos filas del encabezado. */
function DesktopNavLinks({ activeRoute, brandLinks, categoryTree, extraLinks, navbarTexts, normalizeRoute, productsActive, staticLinks, whatsappHref }) {
    return (
      <>
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
        {storeText("header", "products_label", navbarTexts)}
        <ChevronDown className="size-3" />
      </button>

      <div className="invisible absolute left-1/2 top-full z-50 mt-1 w-[min(95vw,1080px)] -translate-x-1/2 before:absolute before:inset-x-0 before:-top-10 before:h-10 before:content-[''] rounded-md border border-[#e4e9ef] bg-white p-6 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100 dark:border-[#3d2f21] dark:bg-[#1a130c]">
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

    {whatsappHref && navbarTexts.show_contact !== false ? (
      <MenuAnchor
        href={whatsappHref}
        label={storeText("header", "contact_label", navbarTexts)}
        external
        className="h-full"
      />
    ) : null}
      </>
    );
}
