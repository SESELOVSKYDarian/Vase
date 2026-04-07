"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Bot, ChartSpline, Globe2, MessageSquareMore, Server, Store } from "lucide-react";
import { FeatureTabs } from "./feature-tabs";

interface UnifiedFeaturesProps {
  locale: string;
  t: any;
}

gsap.registerPlugin(ScrollTrigger);

export function UnifiedFeatures({ locale, t }: UnifiedFeaturesProps) {
  const [activeTab, setActiveTab] = useState<"business" | "labs">("business");
  const sectionRef = useRef<HTMLElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const background = backgroundRef.current;
    const shell = shellRef.current;
    const content = contentRef.current;
    if (!section || !background || !shell || !content) return;

    const ctx = gsap.context(() => {
      gsap.set(background, { opacity: 0.36, scale: 0.9, y: 140, transformOrigin: "50% 100%" });
      gsap.set(shell, { opacity: 0.22, scale: 0.88, y: 110, transformOrigin: "50% 50%" });
      gsap.set(content, { opacity: 0, y: 72 });

      ScrollTrigger.create({
        trigger: section,
        start: "top 82%",
        end: "bottom top",
        onToggle: (self) => {
          window.dispatchEvent(
            new CustomEvent("vase:features-visibility", {
              detail: { hideHeader: self.isActive },
            }),
          );
        },
      });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 94%",
          end: "top 4%",
          scrub: 2.4,
        },
      });

      timeline
        .to(background, { opacity: 1, scale: 1, y: 0, ease: "none", duration: 1 }, 0)
        .to(shell, { opacity: 1, scale: 1, y: 0, ease: "none", duration: 1 }, 0.08)
        .to(content, { opacity: 1, y: 0, ease: "none", duration: 0.2 }, 1.04);
    }, section);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent("vase:features-visibility", {
          detail: { hideHeader: false },
        }),
      );
    };
  }, []);

  const businessFeatures = [
    {
      id: "base-launch",
      badge: t.businessCards[0][0],
      title: t.businessCards[0][1],
      description:
        locale === "es"
          ? "Lanza tu tienda rápidamente con plantillas de alto impacto y un setup pensado para empezar sin fricción."
          : "Launch quickly with high-impact templates and a setup designed to get started without friction.",
      imageOrNode: <Store className="size-32 text-[var(--accent)] opacity-20" strokeWidth={1} />,
    },
    {
      id: "custom",
      badge: t.businessCards[1][0],
      title: t.businessCards[1][1],
      description:
        locale === "es"
          ? "Si necesitas una experiencia más diferencial, Vase también resuelve ecommerce mucho más personalizado con costo adicional."
          : "If you need a more differentiated experience, Vase also delivers a much more custom ecommerce with additional cost.",
      imageOrNode: <ChartSpline className="size-32 text-[var(--accent)] opacity-20" strokeWidth={1} />,
    },
    {
      id: "api-ready",
      badge: t.businessCards[2][0],
      title: t.businessCards[2][1],
      description:
        locale === "es"
          ? "Conecta catálogo, stock, precios y ventas con tu operación actual para escalar con más control."
          : "Connect catalog, stock, prices and sales to your current operations to scale with more control.",
      imageOrNode: <Globe2 className="size-32 text-[var(--accent)] opacity-20" strokeWidth={1} />,
    },
  ];

  const labsFeatures = [
    {
      id: "assist",
      badge: t.labsCards[0][0],
      title: t.labsCards[0][1],
      description:
        locale === "es"
          ? "Atiende a tus usuarios de forma casi humana y resuelve preguntas frecuentes al instante."
          : "Support your users in an almost human way and resolve common questions instantly.",
      imageOrNode: <Bot className="size-32 text-[var(--accent)] opacity-20" strokeWidth={1} />,
    },
    {
      id: "escalamiento",
      badge: t.labsCards[1][0],
      title: t.labsCards[1][1],
      description:
        locale === "es"
          ? "Cuando la conversación lo requiere, Vase deriva automáticamente a soporte humano sin fricción."
          : "When the conversation requires it, Vase automatically hands off to human support without friction.",
      imageOrNode: <MessageSquareMore className="size-32 text-[var(--accent)] opacity-20" strokeWidth={1} />,
    },
    {
      id: "canales",
      badge: t.labsCards[2][0],
      title: t.labsCards[2][1],
      description:
        locale === "es"
          ? "Centraliza web, WhatsApp e Instagram en una sola operación para ganar velocidad y trazabilidad."
          : "Centralize web, WhatsApp and Instagram in one operation to gain speed and traceability.",
      imageOrNode: <Server className="size-32 text-[var(--accent)] opacity-20" strokeWidth={1} />,
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative left-1/2 right-1/2 z-20 min-h-[180svh] w-screen -translate-x-1/2 sm:min-h-[190svh] lg:min-h-[210svh]"
    >
      <div
        ref={backgroundRef}
        className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#5E7F60_0%,#4E704F_42%,#476847_100%)]"
      >
        <div className="pointer-events-none absolute left-[-8rem] top-16 h-72 w-72 rounded-full bg-[rgba(255,255,255,0.08)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-8 right-[-7rem] h-80 w-80 rounded-full bg-[rgba(31,53,33,0.18)] blur-3xl" />
      </div>

      <div ref={shellRef} className="sticky top-0 z-10 mx-auto flex min-h-screen w-full max-w-[92rem] items-center px-6 py-24 lg:px-10 lg:py-28">
        <div ref={contentRef} className="w-full">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/62">
            {locale === "es" ? "Características" : "Capabilities"}
          </p>
          <h2 className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl lg:text-[4.5rem] lg:leading-[0.98]">
            {activeTab === "business"
              ? locale === "es"
                ? "Comercio flexible, claro y listo para crecer."
                : "Flexible commerce, clear and ready to scale."
              : locale === "es"
                ? "Asistencia inteligente, automatizada y humana cuando hace falta."
                : "Intelligent support, automated and human when needed."}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
            {activeTab === "business"
              ? locale === "es"
                ? "Vase Business ordena la operación digital para lanzar rápido, vender mejor y conectar sistemas sin complejidad innecesaria."
                : "Vase Business organizes your digital operation to launch fast, sell better and connect systems without unnecessary complexity."
              : locale === "es"
                ? "Vase Labs responde, automatiza y escala conversaciones con una experiencia más natural, más útil y más precisa."
                : "Vase Labs responds, automates and scales conversations with a more natural, useful and precise experience."}
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="relative inline-flex rounded-full bg-white/12 p-1.5 ring-1 ring-white/16 backdrop-blur-md">
            <motion.div
              className="absolute inset-y-1.5 rounded-full bg-white shadow-[0_10px_24px_rgba(17,31,18,0.16)]"
              initial={false}
              animate={{
                x: activeTab === "business" ? 0 : "100%",
                width: "50%",
              }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              style={{ left: 0, width: "calc(50% - 6px)", margin: "0 6px" }}
            />
            <button
              onClick={() => setActiveTab("business")}
              className={`relative z-10 min-w-36 px-6 py-3 text-sm font-semibold transition-colors duration-300 ${activeTab === "business" ? "text-[#1c2a1d]" : "text-white/88 hover:text-white"}`}
            >
              Vase Business
            </button>
            <button
              onClick={() => setActiveTab("labs")}
              className={`relative z-10 min-w-36 px-6 py-3 text-sm font-semibold transition-colors duration-300 ${activeTab === "labs" ? "text-[#1c2a1d]" : "text-white/88 hover:text-white"}`}
            >
              Vase Labs
            </button>
          </div>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-[2.75rem] bg-[rgba(248,250,248,0.97)] px-4 py-5 shadow-[0_28px_80px_rgba(17,31,18,0.16)] ring-1 ring-[rgba(255,255,255,0.32)] sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.52),transparent_72%)]" />
          <div className="pointer-events-none absolute right-0 top-10 h-40 w-40 rounded-full bg-[rgba(115,147,116,0.1)] blur-3xl" />

          <div className="relative min-h-[520px] lg:min-h-[560px]">
            {activeTab === "business" ? (
              <FeatureTabs
                badge="Vase Business"
                title={
                  locale === "es"
                    ? "Crea tu web gratis y escala cuando tu negocio lo necesite"
                    : "Create your site for free and scale when your business needs it"
                }
                body={
                  locale === "es"
                    ? "Puedes crear tu web gratis con opciones limitadas. Tienes 30 días para conectarla a un dominio real, una opción paga. Si pasan esos 30 días sin activarla, la página temporal se elimina."
                    : "You can create your site for free with limited options. You have 30 days to connect it to a real domain, which is a paid option. If those 30 days pass without activation, the temporary page is removed."
                }
                plansLabel={locale === "es" ? "Ver Planes" : "View Plans"}
                features={businessFeatures}
              />
            ) : (
              <FeatureTabs
                badge="Vase Labs"
                title={t.labsTitle}
                plansLabel={locale === "es" ? "Ver Planes" : "View Plans"}
                features={labsFeatures}
              />
            )}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
