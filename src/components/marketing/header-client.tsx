"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X, ArrowRight } from "lucide-react";

interface HeaderClientProps {
  copy: any;
  featureDescriptions: {
    business: string;
    labs: string;
  };
}

export function HeaderClient({ copy, featureDescriptions }: HeaderClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav aria-label="Primary navigation" className="hidden items-center gap-2 lg:flex">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-black transition hover:bg-white/50"
        >
          {copy.nav.home}
        </Link>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`inline-flex min-h-10 items-center gap-1 rounded-full px-4 text-sm font-medium transition hover:bg-white/50 ${
              isDropdownOpen ? "text-black bg-white/50" : "text-black/70"
            }`}
          >
            {copy.nav.features}
            <ChevronDown className={`size-4 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-1/2 top-[calc(100%+0.85rem)] z-50 w-72 -translate-x-1/2 rounded-[28px] bg-white/90 p-3 shadow-[0_32px_64px_rgba(0,0,0,0.12)] backdrop-blur-2xl border border-black/5">
              <Link
                href="/vase-business"
                onClick={() => setIsDropdownOpen(false)}
                className="group block rounded-[20px] px-5 py-4 text-sm text-black transition hover:bg-black/[0.03]"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-base tracking-tight">{copy.nav.business}</p>
                  <ArrowRight className="size-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-black/60 font-medium">
                  {featureDescriptions.business}
                </p>
              </Link>
              <Link
                href="/vaselabs"
                onClick={() => setIsDropdownOpen(false)}
                className="group mt-1 block rounded-[20px] px-5 py-4 text-sm text-black transition hover:bg-black/[0.03]"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-base tracking-tight">{copy.nav.labs}</p>
                  <ArrowRight className="size-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-black/60 font-medium">
                  {featureDescriptions.labs}
                </p>
              </Link>
            </div>
          )}
        </div>

        <Link
          href="/que-es-vase"
          className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-black transition hover:bg-white/50"
        >
          {copy.nav.about}
        </Link>
        <Link
          href="/precios"
          className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-black transition hover:bg-white/50"
        >
          {copy.nav.pricing}
        </Link>
      </nav>

      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="flex size-11 items-center justify-center rounded-full bg-white/50 backdrop-blur-md border border-black/5 lg:hidden text-black shadow-sm active:scale-95 transition-transform"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white p-6 lg:hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-12">
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-bold tracking-tight">Vase</Link>
            <button onClick={() => setIsMobileMenuOpen(false)} className="size-11 flex items-center justify-center rounded-full bg-black/5">
              <X className="size-6" />
            </button>
          </div>
          
          <div className="flex flex-col gap-6">
            <Link 
              href="/" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-4xl font-bold tracking-tighter hover:text-[var(--accent)] transition-colors"
            >
              {copy.nav.home}
            </Link>
            <div className="flex flex-col gap-4 pl-2 border-l-2 border-black/5">
              <p className="text-xs font-bold uppercase tracking-widest text-black/40">{copy.nav.features}</p>
              <Link 
                href="/vase-business" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-bold tracking-tight"
              >
                {copy.nav.business}
              </Link>
              <Link 
                href="/vaselabs" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-bold tracking-tight"
              >
                {copy.nav.labs}
              </Link>
            </div>
            <Link 
              href="/que-es-vase" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-4xl font-bold tracking-tighter hover:text-[var(--accent)] transition-colors"
            >
              {copy.nav.about}
            </Link>
            <Link 
              href="/precios" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-4xl font-bold tracking-tighter hover:text-[var(--accent)] transition-colors"
            >
              {copy.nav.pricing}
            </Link>
          </div>

          <div className="mt-auto flex flex-col gap-4">
            <Link 
              href="/register" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex h-16 items-center justify-center rounded-2xl bg-black text-white text-lg font-bold shadow-lg active:scale-[0.98] transition-transform"
            >
              {copy.nav.register}
            </Link>
            <Link 
              href="/signin" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex h-16 items-center justify-center rounded-2xl bg-black/5 text-black text-lg font-bold active:scale-[0.98] transition-transform"
            >
              {copy.nav.login}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
