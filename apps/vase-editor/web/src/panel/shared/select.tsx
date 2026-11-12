"use client";

// Selector de todos los paneles de Vase: reemplaza al <select> del navegador con la estética del panel.
// Fuente única: Business recibe una copia exacta (scripts/sync-ui-to-business.mjs).
import { type CSSProperties, type KeyboardEvent, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string | number; label: string; depth?: number; hint?: string; disabled?: boolean };
type Place = { left: number; width: number; up: boolean; top?: number; bottom?: number; maxHeight: number };

const SEARCH_FROM = 10;
const normalize = (text: unknown) => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Chevron() {
  return (
    <svg className="ch" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Search() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/** La lista se abre fuera del panel (en el body): copia la clase y el tema del panel para que tenga sus colores. */
function panelRoot(trigger: HTMLElement | null) {
  const root = trigger?.closest(".vpa, .vp");
  const theme = trigger?.closest("[data-theme]")?.getAttribute("data-theme") || "light";
  return { className: root?.classList.contains("vp") ? "vp" : "vpa", theme };
}

export function Select({
  value,
  onChange,
  options = [],
  id,
  ariaLabel,
  variant = "inp",
  disabled = false,
  placeholder = "Elegí una opción",
  className = "",
  style,
}: {
  value: string | number | null | undefined;
  onChange?: (value: SelectOption["value"]) => void;
  options?: SelectOption[];
  id?: string;
  ariaLabel?: string;
  variant?: "inp" | "slot" | "fp";
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();

  const current = options.find((option) => String(option.value) === String(value ?? ""));
  const searchable = options.length >= SEARCH_FROM;
  const shown = useMemo(() => {
    const q = normalize(query.trim());
    return q ? options.filter((option) => normalize(option.label).includes(q)) : options;
  }, [options, query]);

  const close = (focus = true) => {
    setOpen(false);
    setQuery("");
    if (focus) triggerRef.current?.focus();
  };
  const choose = (option: SelectOption | undefined) => {
    if (!option || option.disabled) return;
    if (String(option.value) !== String(value ?? "")) onChange?.(option.value);
    close();
  };
  const openList = () => {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex((option) => String(option.value) === String(value ?? ""))));
    setOpen(true);
  };

  // Ubica la lista debajo del botón (o arriba si no entra) y la sigue si se mueve la pantalla.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const measure = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const wanted = Math.min(320, (shown.length || 1) * 40 + (searchable ? 52 : 0) + 12);
      const up = below < Math.min(wanted, 220) && above > below;
      const width = Math.max(rect.width, variant === "inp" ? 0 : 180);
      const left = Math.min(rect.left, window.innerWidth - width - 8);
      setPlace({
        left: Math.max(8, left),
        width,
        up,
        top: up ? undefined : rect.bottom + 6,
        bottom: up ? window.innerHeight - rect.top + 6 : undefined,
        maxHeight: Math.max(160, Math.min(320, up ? above : below)),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, shown.length, searchable, variant]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    const last = shown.length - 1;
    if (event.key === "Escape") { event.preventDefault(); close(); }
    else if (event.key === "Tab") close(false);
    else if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => Math.min(last, index + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
    else if (event.key === "Home") { event.preventDefault(); setActive(0); }
    else if (event.key === "End") { event.preventDefault(); setActive(last); }
    else if (event.key === "Enter" || (event.key === " " && !searchable)) { event.preventDefault(); choose(shown[active]); }
    else if (!searchable && event.key.length === 1) {
      // Escribir salta a la opción que empieza con esas letras.
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + normalize(event.key), at: now };
      const index = shown.findIndex((option) => normalize(option.label).trimStart().startsWith(typed.current.text));
      if (index >= 0) setActive(index);
    }
  };

  const root = panelRoot(triggerRef.current);

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`vase-sel ${variant} ${open ? "open" : ""} ${className}`}
        style={style}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
      >
        <span className={`v ${current ? "" : "ph"}`}>{current ? current.label : placeholder}</span>
        <Chevron />
      </button>
      {open && place
        ? createPortal(
            <div className={root.className} data-theme={root.theme} style={{ position: "static", background: "none", display: "contents" }}>
              <div
                ref={listRef}
                className={`vase-selpop ${place.up ? "up" : ""}`}
                style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }}
              >
                {searchable ? (
                  <div className="vase-selsearch">
                    <Search />
                    <input
                      autoFocus
                      aria-label="Buscar opción"
                      placeholder="Buscar…"
                      value={query}
                      onChange={(event) => { setQuery(event.target.value); setActive(0); }}
                      onKeyDown={onKeyDown}
                    />
                  </div>
                ) : null}
                <ul id={listId} role="listbox" aria-label={ariaLabel} tabIndex={-1}>
                  {shown.map((option, index) => {
                    const selected = String(option.value) === String(value ?? "");
                    return (
                      <li
                        key={`${option.value}`}
                        data-index={index}
                        role="option"
                        aria-selected={selected}
                        aria-disabled={option.disabled || undefined}
                        className={`${index === active ? "act" : ""} ${selected ? "sel" : ""} ${option.disabled ? "dis" : ""}`}
                        style={option.depth ? { paddingLeft: 12 + option.depth * 16 } : undefined}
                        onMouseEnter={() => setActive(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(option)}
                      >
                        <span className="l">{option.label}{option.hint ? <em>{option.hint}</em> : null}</span>
                        {selected ? (
                          <svg className="ck" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m5 12.5 4.5 4.5L19 7.5" />
                          </svg>
                        ) : null}
                      </li>
                    );
                  })}
                  {!shown.length ? <li className="none" role="presentation">No hay coincidencias</li> : null}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
