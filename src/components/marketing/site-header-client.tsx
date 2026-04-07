"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { StaggeredMenu } from "./staggered-menu";

interface SiteHeaderClientProps {
  copy: {
    nav: {
      home: string;
      features: string;
      about: string;
      pricing: string;
      login: string;
      register: string;
      business: string;
      labs: string;
      integrations: string;
    };
  };
}

export function SiteHeaderClient({ copy }: SiteHeaderClientProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [featuresSectionActive, setFeaturesSectionActive] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const handleFeaturesVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{ hideHeader?: boolean }>;
      setFeaturesSectionActive(Boolean(customEvent.detail?.hideHeader));
    };

    window.addEventListener("vase:features-visibility", handleFeaturesVisibility as EventListener);

    return () => {
      window.removeEventListener("vase:features-visibility", handleFeaturesVisibility as EventListener);
    };
  }, []);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-out",
        featuresSectionActive ? "pointer-events-none -translate-y-5 opacity-0" : "translate-y-0 opacity-100",
      ].join(" ")}
    >
      {mobileMenuVisible ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[5.8rem] bg-[rgba(248,250,249,0.94)] backdrop-blur-xl lg:h-[6.5rem]"
        />
      ) : null}

      <div className="mx-auto flex w-full max-w-[96rem] items-center justify-center px-6 pt-7 transition-all duration-300 lg:px-10 lg:pt-8">
        <div
          className={[
            "relative flex min-h-16 w-full items-center justify-between gap-4 transition-all duration-300",
            scrolled
              ? mobileMenuVisible
                ? "max-w-[92rem] rounded-full border border-transparent bg-[rgba(248,250,249,0.94)] px-4 shadow-none backdrop-blur-xl"
                : "max-w-[92rem] rounded-full border border-white/60 bg-[rgba(255,255,255,0.58)] px-4 shadow-[0_20px_50px_rgba(47,48,48,0.08)] backdrop-blur-xl"
              : "max-w-[92rem] px-0",
          ].join(" ")}
        >
          <div className="flex items-center gap-2">
            <StaggeredMenu
              displaySocials
              displayItemNumbering={false}
              accentColor="#3B633D"
              loginLabel={copy.nav.login}
              registerLabel={copy.nav.register}
              socialItems={[
                { label: "Instagram", link: "https://instagram.com" },
                { label: "LinkedIn", link: "https://linkedin.com" },
                { label: "X", link: "https://x.com" },
              ]}
              items={[
                {
                  label: copy.nav.home,
                  ariaLabel: copy.nav.home,
                  link: "/",
                },
                {
                  label: copy.nav.business,
                  ariaLabel: copy.nav.business,
                  link: "/vase-business",
                },
                {
                  label: copy.nav.labs,
                  ariaLabel: copy.nav.labs,
                  link: "/vaselabs",
                },
                {
                  label: copy.nav.integrations,
                  ariaLabel: copy.nav.integrations,
                  link: "/integraciones",
                },
                {
                  label: copy.nav.about,
                  ariaLabel: copy.nav.about,
                  link: "/que-es-vase",
                },
                {
                  label: copy.nav.pricing,
                  ariaLabel: copy.nav.pricing,
                  link: "/precios",
                },
              ]}
              onMenuVisibilityChange={setMobileMenuVisible}
            />
          </div>

          <Link
            href="/"
            className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center text-lg font-semibold tracking-[-0.04em] text-[var(--foreground)] transition-opacity duration-200"
            aria-label="Vase"
          >
            <Image
              src="/vasecolorlogo.png"
              alt="Vase"
              width={46}
              height={46}
              className="h-[46px] w-[46px] object-contain"
              priority
            />
          </Link>

          <div className="ml-auto flex items-center gap-5 transition-opacity duration-200">
            <Link href="/signin" className="hidden text-sm font-medium text-[var(--foreground)] md:inline-flex">
              {copy.nav.login}
            </Link>
            <Link href="/register" className={buttonStyles({ tone: "primary", size: "sm", className: "min-w-28" })}>
              {copy.nav.register}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
