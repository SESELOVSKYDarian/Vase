"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const KEY = "vase-help-theme";

// El tema vive en <html data-theme>: lo pone el script del layout antes de pintar
// (lo guardado o el del sistema). El botón lo lee de ahí y lo cambia.
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
const current = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export default function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, current, () => null);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch {}
  };

  const label = theme === "dark" ? "Modo claro" : "Modo oscuro";
  return (
    <button type="button" className="theme-btn" onClick={toggle} aria-label={theme ? `Cambiar a ${label.toLowerCase()}` : "Cambiar tema"} style={{ visibility: theme ? "visible" : "hidden" }}>
      {theme === "dark" ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
      )}
      {label}
    </button>
  );
}
