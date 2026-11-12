"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark";
const THEME_KEY = "vase-rest-theme";

// El tema vive en <html data-theme>: lo pone el script del layout antes de pintar
// (lo guardado o el del sistema). Los botones lo leen de ahí y lo cambian.
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
const currentTheme = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export function useTheme() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);
  const setTheme = (next: Theme) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // sin almacenamiento (modo privado): el tema dura hasta recargar
    }
  };
  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}

// Logo de Vase con la palabra del producto. Cambia de color solo con el tema (por CSS).
export function BrandLogo({ href = "/", product = "rest", compact = false }: {
  href?: string;
  product?: string;
  compact?: boolean;
}) {
  return (
    <a className="vr-logo" href={href} aria-label={`Vase ${product}, inicio`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="vr-logo-light" src="/brand/vase-logo-green.png" alt="" width={26} height={26} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="vr-logo-dark" src="/brand/vase-logo-white.png" alt="" width={26} height={26} />
      {compact ? null : <b>{product}</b>}
    </a>
  );
}

export function ThemeButton({ withLabel = true }: { withLabel?: boolean }) {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Modo claro" : "Modo oscuro";
  return (
    <button
      type="button"
      className={withLabel ? "vr-btn line sm" : "vr-ibtn"}
      onClick={toggle}
      aria-label={theme ? `Cambiar a ${label.toLowerCase()}` : "Cambiar tema"}
      title={label}
      style={{ visibility: theme ? "visible" : "hidden" }}
    >
      {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
      {withLabel ? label : null}
    </button>
  );
}
