"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { RestStaffRole } from "@vase/contracts";
import {
  ChevronDown,
  ChevronsUpDown,
  CircleHelp,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { NAVIGATION_GROUPS, activeNavigation, navigationForRole } from "./navigation";
import { NAV_ICONS as ICONS } from "./nav-icons";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";
import type { EdgeConnectionKind } from "@/lib/edge/connection-state";
import { BrandLogo, useTheme } from "@/components/brand";


export const ROLE_LABELS: Record<RestStaffRole, string> = {
  OWNER: "Dueño",
  MANAGER: "Encargado",
  CASHIER: "Caja",
  WAITER: "Mozo",
  KITCHEN: "Cocina",
  STOCK: "Depósito",
  DELIVERY: "Delivery",
};

const MINI_KEY = "vase-rest-mini";
const VASE_APP_URL = "https://app.vase.ar/app";

function readMini() {
  try {
    return localStorage.getItem(MINI_KEY) === "1";
  } catch {
    return false;
  }
}

// Celular o tablet vertical (hasta 900 px): el menú pasa a abrirse con un botón.
function useIsPhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => setPhone(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return phone;
}

type Connection = { tone: "ok" | "warn" | "bad"; text: string };

export function RestShell(props: {
  children: ReactNode;
  role: RestStaffRole;
  branchName: string;
  actorName: string;
  pendingOperations?: number;
  branches?: Array<{ id: string; name: string }>;
  activeBranchId?: string;
  onBranchChange?: (branchId: string) => void;
}) {
  const pathname = usePathname();
  const isPhone = useIsPhone();
  const { theme, toggle: toggleTheme } = useTheme();
  const [online, setOnline] = useState(true);
  const [edgeState, setEdgeState] = useState<EdgeConnectionKind | null>(null);
  const [mini, setMini] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [accOpen, setAccOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const accRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMini(readMini()), []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (props.role === "OWNER") return;
    let active = true;
    const probe = async () => {
      try {
        const state = await readLocalEdgeClient().probe();
        if (active) setEdgeState(state.kind);
      } catch {
        if (active) setEdgeState("UNAVAILABLE");
      }
    };
    void probe();
    const interval = setInterval(() => void probe(), 5_000);
    return () => { active = false; clearInterval(interval); };
  }, [props.role]);

  // Cerrar el menú de la cuenta al tocar afuera o con Escape; y el cajón del celular al navegar.
  useEffect(() => {
    if (!accOpen) return;
    const onDown = (event: MouseEvent) => {
      if (accRef.current && !accRef.current.contains(event.target as Node)) setAccOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setAccOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [accOpen]);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setNavOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);
  useEffect(() => setNavOpen(false), [pathname]);

  const items = navigationForRole(props.role);
  const { section, child } = activeNavigation(items, pathname);
  const title = child && child.href !== section?.href ? child.label : section?.label ?? "Vase Rest";
  const subtitle = child?.subtitle ?? section?.subtitle ?? "";
  const crumb = child && child.href !== section?.href ? section?.label : null;
  const compact = mini && !isPhone;

  useEffect(() => {
    document.title = `${title} · ${props.branchName} | Vase Rest`;
  }, [title, props.branchName]);

  const toggleMini = () => setMini((value) => {
    try {
      localStorage.setItem(MINI_KEY, value ? "0" : "1");
    } catch {
      // sin almacenamiento: el menú vuelve a su tamaño al recargar
    }
    return !value;
  });

  const edgeBlocked = edgeState === "UNAVAILABLE" || edgeState === "CERTIFICATE_MISMATCH" || edgeState === "IDENTITY_MISMATCH";
  const connection: Connection = edgeBlocked
    ? { tone: "bad", text: "Sucursal desconectada" }
    : edgeState === "STALE"
      ? { tone: "warn", text: "Trabajando en la sucursal" }
      : !online
        ? { tone: "warn", text: "Sin conexión" }
        : props.pendingOperations
          ? { tone: "warn", text: `${props.pendingOperations} por sincronizar` }
          : { tone: "ok", text: "Todo sincronizado" };

  const isOwner = props.role === "OWNER";
  const closeShift = () => {
    try {
      sessionStorage.removeItem("vase-rest-staff-session");
    } catch {
      // nada que borrar
    }
    window.location.assign("/staff/login");
  };

  return (
    <div className="vr-app">
      {isPhone && navOpen ? <div className="vr-mscrim" onClick={() => setNavOpen(false)} aria-hidden="true" /> : null}
      <aside
        className={`vr-side ${compact ? "mini" : ""} ${isPhone ? "phone" : ""} ${navOpen ? "m-open" : ""}`}
        aria-label="Menú de Vase Rest"
        aria-hidden={isPhone && !navOpen ? true : undefined}
      >
        {isPhone ? (
          <button type="button" className="vr-mclose" onClick={() => setNavOpen(false)} aria-label="Cerrar el menú"><X size={18} /></button>
        ) : (
          <button type="button" className="vr-coll" onClick={toggleMini} aria-label={compact ? "Agrandar el menú" : "Achicar el menú"}>
            <ChevronDown size={14} className={compact ? "vr-rot-r" : "vr-rot-l"} aria-hidden="true" />
          </button>
        )}
        <div className="vr-side-logo"><BrandLogo href={isOwner ? "/owner" : "/staff"} compact={compact} /></div>

        <div className="vr-branch">
          <small>Sucursal activa</small>
          {props.branches?.length ? (
            <label className="vr-branch-sel">
              <select
                aria-label="Sucursal activa"
                value={props.activeBranchId}
                onChange={(event) => props.onBranchChange?.(event.target.value)}
              >
                {props.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
              <ChevronsUpDown size={14} aria-hidden="true" />
            </label>
          ) : <strong>{props.branchName}</strong>}
        </div>

        <nav aria-label="Secciones">
          {NAVIGATION_GROUPS.map((group) => {
            const groupItems = items.filter((item) => item.group === group);
            if (!groupItems.length) return null;
            return (
              <div key={group}>
                <div className="vr-grp">{group}</div>
                {groupItems.map((item) => {
                  const Icon = ICONS[item.icon];
                  const on = section?.key === item.key;
                  const expanded = Boolean(item.children) && (openGroups[item.key] ?? on);
                  return (
                    <div key={item.key}>
                      <div className="vr-nbrow">
                        <a
                          className={`vr-nb ${on ? "on" : ""}`}
                          href={item.href}
                          aria-current={on && !child ? "page" : undefined}
                          title={compact ? item.label : undefined}
                        >
                          <Icon size={18} aria-hidden="true" />
                          <span className="vr-lbl">{item.label}</span>
                        </a>
                        {item.children && !compact ? (
                          <button
                            type="button"
                            className={`vr-chev ${expanded ? "open" : ""}`}
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Ocultar" : "Ver"} opciones de ${item.label}`}
                            onClick={() => setOpenGroups((state) => ({ ...state, [item.key]: !expanded }))}
                          >
                            <ChevronDown size={14} aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                      {expanded && !compact ? (
                        <div className="vr-subnav">
                          {item.children!.map((sub) => (
                            <a
                              key={sub.key}
                              href={sub.href}
                              className={`vr-sn ${child?.key === sub.key ? "on" : ""}`}
                              aria-current={child?.key === sub.key ? "page" : undefined}
                            >
                              {sub.label}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="vr-acc" ref={accRef}>
          {accOpen ? (
            <div className="vr-accmenu" role="menu">
              <div className="vr-am-h">{props.actorName} · {ROLE_LABELS[props.role]}</div>
              <button type="button" className="vr-am" role="menuitem" onClick={toggleTheme}>
                {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
                {theme === "dark" ? "Modo claro" : "Modo oscuro"}
              </button>
              <a className="vr-am" role="menuitem" href="/support"><CircleHelp size={15} aria-hidden="true" />Ayuda y soporte</a>
              {isOwner ? (
                <a className="vr-am" role="menuitem" href={VASE_APP_URL}>← Volver a Vase</a>
              ) : (
                <button type="button" className="vr-am out" role="menuitem" onClick={closeShift}>
                  <LogOut size={15} aria-hidden="true" />Cerrar turno
                </button>
              )}
            </div>
          ) : null}
          <button
            type="button"
            className="vr-accbtn"
            onClick={() => setAccOpen((open) => !open)}
            aria-expanded={accOpen}
            aria-haspopup="menu"
            title={compact ? props.actorName : undefined}
          >
            <span className="vr-acc-ini">{props.actorName.trim().charAt(0).toUpperCase() || "V"}</span>
            <span className="vr-acc-text"><b>{props.actorName}</b><small>{ROLE_LABELS[props.role]}</small></span>
            <ChevronsUpDown size={15} className="vr-acc-chev" aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="vr-main">
        <header className="vr-top">
          {isPhone ? (
            <button type="button" className="vr-ibtn" onClick={() => setNavOpen(true)} aria-label="Abrir el menú"><Menu size={18} /></button>
          ) : null}
          <div className="vr-top-title">
            {crumb ? <div className="vr-crumb"><a href={section?.href}>{crumb}</a><span aria-hidden="true">›</span><span>{title}</span></div> : null}
            <div className="vr-ttl">{title}</div>
            {subtitle ? <div className="vr-sub">{subtitle}</div> : null}
          </div>
          <div className="vr-sp" />
          <span className="vr-status" role="status"><i className={connection.tone} />{connection.text}</span>
          <a className="vr-ibtn" href="/support" aria-label="Ayuda y soporte" title="Ayuda y soporte">?</a>
        </header>

        {edgeBlocked ? (
          <div className="connectivity-banner" role="alert">
            <strong>La sucursal no responde</strong>
            <span>Frenamos la operación para no mezclar datos. Revisá que el servidor de la sucursal esté prendido y conectado.</span>
          </div>
        ) : edgeState === "STALE" ? (
          <div className="connectivity-banner pending" role="status">
            <strong>Trabajando en la sucursal</strong>
            <span>La nube está desactualizada. Todo se guarda en la sucursal y se sube solo cuando vuelva la conexión.</span>
          </div>
        ) : !online ? (
          <div className="connectivity-banner" role="status">
            <strong>Sin conexión</strong>
            <span>Podés seguir trabajando: la sucursal guarda todo y lo sincroniza cuando vuelva internet.</span>
          </div>
        ) : props.pendingOperations ? (
          <div className="connectivity-banner pending" role="status">
            <strong>Datos pendientes</strong>
            <span>{props.pendingOperations} operaciones esperando confirmación de la nube.</span>
          </div>
        ) : null}

        <div className="vr-body" data-head={section ? undefined : "show"}>{props.children}</div>
      </div>
    </div>
  );
}
