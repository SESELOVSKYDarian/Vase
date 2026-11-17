// Encabezado de la tienda de Piquim (buscador, categorías y cuenta).
import { CartIcon } from './MenuAnchor.jsx';
import { CloseIcon } from './MenuAnchor.jsx';
import { HeartIcon } from './MenuAnchor.jsx';
import { MenuIcon } from './MenuAnchor.jsx';
import { SearchIcon } from './MenuAnchor.jsx';
import { isExternalPath } from '../../../utils/navigation';
import { navigate } from '../../../utils/navigation';

export default function PiquimHeader({ activeRoute, applyCategorySuggestion, applySuggestion, cartCount, desktopSearchError, desktopSearchInputRef, handleAccountClick, handleMobileNavigate, handleSearchKey, isDesktopSearchHovered, isDesktopSearchPinned, logoUrl, mobileMenuOpen, normalizeRoute, overlay, piquimHeaderHeight, piquimHeaderRef, primaryLinks, productsActive, registerHref, registerLabel, resolvedBrand, search, searchBoxRef, searchPlaceholder, searchSuggestionsOpen, setDesktopSearchError, setIsDesktopSearchHovered, setIsDesktopSearchPinned, setMobileMenuOpen, setSearch, setSearchSuggestionsOpen, showAccount, showCart, showSearch, showWishlist, suggestionItems, user }) {
    return (
        <header
         ref={piquimHeaderRef}
         className={`sticky top-0 z-[1000] isolate w-full font-[var(--font-family)] ${overlay ? '-mt-[6px] -mb-[116px] max-md:-mb-[96px]' : ''}`}
         style={overlay && piquimHeaderHeight ? { marginBottom: `-${piquimHeaderHeight - 6}px` } : undefined}
        >
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
                               <button key={`category-${item.href}`} type="button" onClick={() => applyCategorySuggestion(item)} className="rounded-lg px-2 py-1.5 text-left text-sm text-[var(--store-text)] hover:bg-[var(--store-surface-soft)]">
                                 {item.label}
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
    );
}
