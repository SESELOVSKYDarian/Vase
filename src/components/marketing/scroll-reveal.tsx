"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

type ScrollRevealVariant = "section" | "text" | "card" | "hero";

const variantMap: Record<
  ScrollRevealVariant,
  { y: number; scale: number; blur: number; duration: number }
> = {
  section: { y: 40, scale: 0.97, blur: 4, duration: 0.8 },
  text: { y: 22, scale: 0.995, blur: 2, duration: 0.65 },
  card: { y: 30, scale: 0.985, blur: 3, duration: 0.75 },
  hero: { y: 48, scale: 0.96, blur: 4, duration: 0.9 },
};

export function ScrollReveal({
  children,
  delay = 0,
  className = "",
  variant = "section",
  amount = 0.2,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  variant?: ScrollRevealVariant;
  amount?: number;
}) {
  const reduceMotion = useReducedMotion();
  const selected = variantMap[variant];

  return (
    <motion.div
      initial={
        reduceMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              y: selected.y,
              scale: selected.scale,
              filter: `blur(${selected.blur}px)`,
            }
      }
      whileInView={
        reduceMotion
          ? { opacity: 1 }
          : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
      }
      viewport={{ once: true, amount, margin: "-6%" }}
      transition={{ duration: selected.duration, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
