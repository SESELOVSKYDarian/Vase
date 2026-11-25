"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, Moon, Sun } from "lucide-react";

type Props = { newsOrigin: string; site: string; app: string };

const THEME_KEY = "vase-news-theme";

/** Lee si Novedades está en modo claro u oscuro. */
function readTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.vnTheme === "dark" ? "dark" : "light";
}

/** Avisa cada vez que cambia el modo claro/oscuro. Devuelve la función para dejar de escuchar. */
function subscribeTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-vn-theme"] });
  return () => observer.disconnect();
}

// Barra fija de news.vase.ar: transparente sobre la portada, sólida al bajar.
export function NewsNav({ newsOrigin, site, app }: Props) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.vnTheme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  };

  const products = [
    { label: "Vase Business", text: "Tu tienda online", href: `${site}/vase-business` },
    { label: "Vase Labs", text: "Tu asistente de WhatsApp e Instagram", href: `${site}/vaselabs` },
    { label: "Vase Management", text: "Gestión de tu negocio", href: `${site}/vase-management` },
  ];

  return (
    <header className={`vn-nav${scrolled ? " solid" : ""}`}>
      <a href={newsOrigin} className="vn-logo" aria-label="Novedades de Vase, portada">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="w" src="/brand/vase-logo-white.png" alt="" width={28} height={28} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="g" src="/brand/vase-logo-green.png" alt="" width={28} height={28} />
        vase
      </a>

      <nav aria-label="Principal" className="vn-center">
        <a href={site} className="vn-nl">
          Inicio
        </a>
        <div className="vn-drop" ref={menuRef} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
          <button type="button" className="vn-nl" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((value) => !value)}>
            Productos
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </button>
          <div className={`vn-menu${open ? " open" : ""}`}>
            {products.map((product) => (
              <a key={product.label} href={product.href} tabIndex={open ? 0 : -1}>
                <b>{product.label}</b>
                <span>{product.text}</span>
              </a>
            ))}
          </div>
        </div>
        <a href={newsOrigin} className="vn-nl" aria-current="page">
          Novedades
        </a>
      </nav>

      <div className="vn-right">
        <button type="button" className="vn-icon" onClick={toggleTheme} aria-label={theme === "dark" ? "Pasar a modo claro" : "Pasar a modo oscuro"}>
          {theme === "dark" ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
        </button>
        <a href={`${app}/signin`} className="vn-nl vn-hide-sm">
          Iniciar sesión
        </a>
        <a href={`${app}/register`} className="vn-pill solid">
          Registrarse
        </a>
      </div>
    </header>
  );
}
