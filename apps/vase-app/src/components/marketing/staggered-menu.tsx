"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { gsap } from "gsap";
import "./staggered-menu.css";

export interface StaggeredMenuItem {
  label: string;
  ariaLabel: string;
  link: Route;
}

export interface StaggeredMenuSocialItem {
  label: string;
  link: string;
}

interface StaggeredMenuProps {
  items?: StaggeredMenuItem[];
  socialItems?: StaggeredMenuSocialItem[];
  displaySocials?: boolean;
  displayItemNumbering?: boolean;
  accentColor?: string;
  closeOnClickAway?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
  onMenuVisibilityChange?: (visible: boolean) => void;
  loginLabel?: string;
  registerLabel?: string;
  loginHref?: Route;
  registerHref?: Route;
}

function MenuGlyph({ open }: { open: boolean }) {
  return (
    <span className="relative flex w-5 flex-col gap-[4.5px]">
      <span
        className="block h-[1.5px] w-full rounded-full bg-black origin-center transition-all duration-300"
        style={{ transform: open ? "translateY(6px) rotate(45deg)" : "none" }}
      />
      <span
        className="block h-[1.5px] rounded-full bg-black transition-all duration-300"
        style={{
          width: open ? "100%" : "65%",
          opacity: open ? 0 : 1,
        }}
      />
      <span
        className="block h-[1.5px] w-full rounded-full bg-black origin-center transition-all duration-300"
        style={{ transform: open ? "translateY(-6px) rotate(-45deg)" : "none" }}
      />
    </span>
  );
}

export function StaggeredMenu({
  items = [],
  socialItems = [],
  displaySocials = true,
  displayItemNumbering = true,
  accentColor = "#3B633D",
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose,
  onMenuVisibilityChange,
  loginLabel = "Iniciar sesión",
  registerLabel = "Registrarse",
  loginHref = "/signin",
  registerHref = "/register",
}: StaggeredMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [renderOverlay, setRenderOverlay] = useState(false);
  const openRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const preLayersRef = useRef<HTMLDivElement>(null);
  const preLayerElsRef = useRef<HTMLElement[]>([]);
  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Animation | null>(null);
  const busyRef = useRef(false);
  const pendingOpenRef = useRef(false);
  const colors = ["rgba(246, 249, 246, 0.98)", "rgba(238, 244, 238, 0.98)"];
  const currentItem =
    items.find((item) => {
      if (item.link === "/") {
        return pathname === "/";
      }

      return pathname === item.link || pathname.startsWith(`${item.link}/`);
    }) ?? items[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onMenuVisibilityChange?.(open);
  }, [onMenuVisibilityChange, open]);

  useEffect(() => {
    return () => {
      openTlRef.current?.kill();
      closeTweenRef.current?.kill();
    };
  }, []);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    closeTweenRef.current?.kill();

    const itemEls = Array.from(panel.querySelectorAll<HTMLElement>(".vm-nav-itemLabel"));
    const numberEls = Array.from(panel.querySelectorAll<HTMLElement>(".vm-nav-list[data-numbering] .vm-nav-item"));
    const bottomEl = panel.querySelector<HTMLElement>(".vm-panel-bottom");

    if (itemEls.length) gsap.set(itemEls, { yPercent: 120, rotate: 8 });
    if (numberEls.length) gsap.set(numberEls, { "--vm-num-opacity": 0 });
    if (bottomEl) gsap.set(bottomEl, { opacity: 0, y: 18 });

    const tl = gsap.timeline({ paused: true });

    layers.forEach((el, i) => {
      tl.fromTo(el, { yPercent: -100 }, { yPercent: 0, duration: 0.52, ease: "power4.out" }, i * 0.055);
    });

    const panelIn = (layers.length - 1) * 0.055 + 0.05;

    tl.fromTo(panel, { yPercent: -100 }, { yPercent: 0, duration: 0.6, ease: "power4.out" }, panelIn);

    if (itemEls.length) {
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 0.9,
          ease: "power4.out",
          stagger: { each: 0.07 },
        },
        panelIn + 0.14,
      );
    }

    if (numberEls.length) {
      tl.to(numberEls, { "--vm-num-opacity": 1, duration: 0.45, stagger: { each: 0.06 } }, panelIn + 0.18);
    }

    if (bottomEl) {
      tl.to(bottomEl, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, panelIn + 0.28);
    }

    openTlRef.current = tl;
    return tl;
  }, []);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    pendingOpenRef.current = true;
    setRenderOverlay(true);
  }, []);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    closeTweenRef.current?.kill();
    const closeTimeline = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        busyRef.current = false;
        setRenderOverlay(false);
      },
    });

    closeTimeline.to(panel, {
      yPercent: -100,
      duration: 0.42,
      ease: "power2.inOut",
    });

    if (layers.length) {
      closeTimeline.to(
        [...layers].reverse(),
        {
          yPercent: -100,
          duration: 0.46,
          ease: "power2.inOut",
          stagger: { each: 0.035 },
        },
        0.04,
      );
    }

    closeTweenRef.current = closeTimeline;
  }, []);

  useLayoutEffect(() => {
    if (!renderOverlay) return;

    const panel = panelRef.current;
    const preContainer = preLayersRef.current;
    if (!panel || !preContainer) return;

    const preLayers = Array.from(preContainer.querySelectorAll<HTMLElement>(".vm-prelayer"));
    preLayerElsRef.current = preLayers;
    gsap.set([panel, ...preLayers], { yPercent: -100 });

    if (!pendingOpenRef.current) return;
    pendingOpenRef.current = false;

    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback("onComplete", () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline, renderOverlay]);

  const toggleMenu = useCallback(() => {
    if (busyRef.current) return;

    const next = !openRef.current;
    openRef.current = next;
    setOpen(next);

    if (next) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }
  }, [onMenuClose, onMenuOpen, playClose, playOpen]);

  const closeMenu = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    onMenuClose?.();
    playClose();
  }, [onMenuClose, playClose]);

  useEffect(() => {
    if (!closeOnClickAway || !open) return;

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [closeMenu, closeOnClickAway, open]);

  return (
    <div
      className="vm-wrapper"
      style={accentColor ? ({ "--vm-accent": accentColor } as React.CSSProperties) : undefined}
      data-open={open || undefined}
      data-visible={renderOverlay || undefined}
    >
      <button
        ref={triggerRef}
        className="vm-trigger"
        aria-label={open ? "Cerrar menu" : "Abrir menu"}
        aria-expanded={open}
        onClick={toggleMenu}
        type="button"
      >
        <MenuGlyph open={open} />
        {currentItem && currentItem.link !== "/" ? (
          <span className="vm-trigger-label">{currentItem.label}</span>
        ) : null}
      </button>

      {mounted && renderOverlay
        ? createPortal(
            <>
              <div ref={preLayersRef} className="vm-prelayers" aria-hidden="true">
                {colors.map((color, index) => (
                  <div key={index} className="vm-prelayer" style={{ background: color }} />
                ))}
              </div>

              <aside ref={panelRef} className="vm-panel" aria-hidden={!open} aria-label="Menu de navegacion">
                <div className="vm-panel-inner">
                  <div className="vm-panel-scroll">
                    <nav aria-label="Navegacion principal">
                      <ul className="vm-nav-list" role="list" data-numbering={displayItemNumbering || undefined}>
                        {items.map((item, index) => (
                          <li className="vm-nav-itemWrap" key={item.label + index}>
                            <Link
                              className="vm-nav-item"
                              href={item.link}
                              aria-label={item.ariaLabel}
                              data-index={index + 1}
                              data-active={
                                item.link === "/"
                                  ? pathname === "/"
                                  : pathname === item.link || pathname.startsWith(`${item.link}/`)
                                    ? "true"
                                    : undefined
                              }
                              onClick={closeMenu}
                            >
                              <span className="vm-nav-itemLabel">{item.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>

                    <div className="vm-panel-bottom">
                      {displaySocials && socialItems.length > 0 ? (
                        <div className="vm-socials">
                          <p className="vm-socials-label">Redes</p>
                          <ul className="vm-socials-list" role="list">
                            {socialItems.map((social, index) => (
                              <li key={social.label + index}>
                                <a href={social.link} target="_blank" rel="noopener noreferrer" className="vm-socials-link">
                                  {social.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </aside>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
