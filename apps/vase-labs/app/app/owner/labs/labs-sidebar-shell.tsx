"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, FlaskConical, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X } from "lucide-react";
import { labsNavigationItems } from "./labs-owner-nav";

const sidebarStorageKey = "vase-labs-sidebar-pinned";
const themeStorageKey = "vase-labs-theme";

type ShellProps = { sidebar: ReactNode; mobileNav: ReactNode; children: ReactNode; tenantName: string; tenantInitials: string; plan: string };

export function LabsSidebarShell({ sidebar, mobileNav, children, tenantName, tenantInitials, plan }: ShellProps) {
  const [pinned, setPinned] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setPinned(localStorage.getItem(sidebarStorageKey) === "true");
    const saved = localStorage.getItem(themeStorageKey);
    setTheme(saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light");
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? labsNavigationItems.filter((item) => item.label.toLocaleLowerCase().includes(normalized)) : labsNavigationItems;
  }, [query]);
  function toggleSidebar() {
    setPinned((current) => { const next = !current; localStorage.setItem(sidebarStorageKey, String(next)); return next; });
  }
  function closeSearch() { setSearchOpen(false); setQuery(""); }
  function closeMobileMenu() { setMobileMenuOpen(false); }

  return <div className={`labs-shell overflow-x-hidden ${pinned ? "labs-sidebar-pinned" : ""}`}>
    <aside className="labs-sidebar labs-sidebar-frame fixed left-0 top-0 z-40 hidden h-screen flex-col px-2 py-3 lg:flex">
      <div className="labs-sidebar-head">
        <Link href="/owner" className="labs-sidebar-head-brand"><FlaskConical /><span>Vase Labs</span></Link>
        <button className="labs-sidebar-toggle" type="button" onClick={toggleSidebar} aria-expanded={pinned} aria-label={pinned ? "Contraer navegación" : "Expandir navegación"} title={pinned ? "Contraer navegación" : "Expandir navegación"}>{pinned ? <PanelLeftClose /> : <PanelLeftOpen />}</button>
      </div>
      {sidebar}
    </aside>
    <main className="labs-shell-main min-h-screen px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-5"><div className="w-full">
      <header className="labs-mobile-topbar mb-5 flex items-center gap-2 lg:hidden">
        <button type="button" className="labs-mobile-action" onClick={() => setMobileMenuOpen((current) => !current)} aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? "Cerrar navegación" : "Abrir navegación"}>{mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        <Link href="/owner" aria-label="Vase Labs" className="labs-mobile-mark"><FlaskConical className="size-4" /></Link>
        <div className="labs-mobile-search-wrap">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-soft)]" />
          <input aria-label="Buscar en Labs" className="labs-mobile-search" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") closeSearch(); }} placeholder="Buscar" />
          {searchOpen ? <div className="labs-search-results">{results.length ? results.map((item) => { const Icon = item.icon; return <Link onMouseDown={closeSearch} key={item.href} href={item.href as never} className="labs-search-result"><span><Icon className="size-4" /></span><strong>{item.label}</strong></Link>; }) : <p>No encontramos una sección con “{query}”.</p>}</div> : null}
        </div>
        <button type="button" className="labs-mobile-action" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label="Cambiar tema">{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</button>
        <div className="relative">
          <button type="button" className="labs-mobile-account" onClick={() => setAccountOpen((current) => !current)} aria-expanded={accountOpen} aria-label="Abrir menú de cuenta">{tenantInitials}</button>
          {accountOpen ? <div className="labs-account-menu"><div className="labs-account-summary"><span>{tenantInitials}</span><div><strong>{tenantName}</strong><small>Cuenta de Vase Labs</small></div></div><a href="https://app.vase.ar/app">Volver a Vase</a><a className="labs-account-signout" href="/api/labs/signout"><LogOut className="size-4" /> Cerrar sesión</a></div> : null}
        </div>
      </header>
      <header className="labs-topbar mb-6 hidden items-center gap-4 lg:flex">
        <div className="labs-topbar-search-wrap relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-soft)]" />
          <input aria-label="Buscar en Labs" className="labs-topbar-search" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") closeSearch(); }} placeholder="Buscar en Labs" />
          {searchOpen ? <div className="labs-search-results">{results.length ? results.map((item) => { const Icon = item.icon; return <Link onMouseDown={closeSearch} key={item.href} href={item.href as never} className="labs-search-result"><span><Icon className="size-4" /></span><strong>{item.label}</strong></Link>; }) : <p>No encontramos una sección con “{query}”.</p>}</div> : null}
        </div>
        <div className="labs-topbar-spacer" />
        <button type="button" className="labs-topbar-icon" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label="Cambiar tema" title="Cambiar tema">{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</button>
        <div className="relative">
          <button type="button" className="labs-account-button" onClick={() => setAccountOpen((current) => !current)} aria-expanded={accountOpen} aria-label="Abrir menú de cuenta"><span>{tenantInitials}</span><div><strong>{tenantName}</strong><small>{plan}</small></div><ChevronDown className="size-4" /></button>
          {accountOpen ? <div className="labs-account-menu"><div className="labs-account-summary"><span>{tenantInitials}</span><div><strong>{tenantName}</strong><small>Cuenta de Vase Labs</small></div></div><a href="https://app.vase.ar/app">Volver a Vase</a><a className="labs-account-signout" href="/api/labs/signout"><LogOut className="size-4" /> Cerrar sesión</a></div> : null}
        </div>
      </header>
      <div className="labs-shell-content"><div className="hidden">{mobileNav}</div>{children}</div>
    </div></main>
    {mobileMenuOpen ? <div className="labs-mobile-menu lg:hidden" role="dialog" aria-modal="true" aria-label="Navegación de Labs">
      <button type="button" className="labs-mobile-menu-backdrop" onClick={closeMobileMenu} aria-label="Cerrar navegación" />
      <aside className="labs-mobile-menu-panel">
        <div className="labs-mobile-menu-heading"><div><FlaskConical className="size-4" /><strong>Vase Labs</strong></div><button type="button" onClick={closeMobileMenu} aria-label="Cerrar navegación"><X className="size-5" /></button></div>
        <nav className="labs-mobile-menu-links">{labsNavigationItems.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href as never} onClick={closeMobileMenu}><Icon className="size-5" /><span>{item.label}</span></Link>; })}</nav>
        <div className="labs-mobile-menu-account"><span>{tenantInitials}</span><div><strong>{tenantName}</strong><small>{plan}</small></div></div>
      </aside>
    </div> : null}
    <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-56 border-b border-[var(--border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent-soft)_70%,transparent),transparent)]" />
  </div>;
}
