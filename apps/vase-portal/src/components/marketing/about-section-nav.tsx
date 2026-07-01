"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AboutSectionNavItem = {
  id: string;
  label: string;
};

type AboutSectionNavProps = {
  items: AboutSectionNavItem[];
};

export function AboutSectionNav({ items }: AboutSectionNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sectionElements = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!sectionElements.length) return;

    const updateActiveSection = () => {
      const viewportAnchor = window.innerHeight * 0.34;
      const closestSection = sectionElements
        .map((element) => ({
          id: element.id,
          distance: Math.abs(element.getBoundingClientRect().top - viewportAnchor),
        }))
        .sort((sectionA, sectionB) => sectionA.distance - sectionB.distance)[0];

      if (closestSection?.id) {
        setActiveId(closestSection.id);
      }
    };

    const observer = new IntersectionObserver(updateActiveSection, {
      rootMargin: "-18% 0px -55% 0px",
      threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
    });

    sectionElements.forEach((element) => observer.observe(element));
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [items]);

  return (
    <div className="fixed inset-x-0 top-[5.8rem] z-40 hidden justify-center px-6 md:flex lg:top-[6.4rem]">
      <div className="inline-flex items-center gap-8 rounded-full bg-white/72 px-7 py-3 text-sm text-[#191c1b] ring-1 ring-white/80 backdrop-blur-xl">
        {items.map((item) => {
          const isActive = activeId === item.id;

          return (
            <Link
              key={item.id}
              href={`#${item.id}`}
              className={[
                "border-b-2 pb-1 font-medium transition",
                isActive
                  ? "border-[#18C37E] text-[#18C37E]"
                  : "border-transparent text-[#191c1b]/75 hover:text-[#18C37E]",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
