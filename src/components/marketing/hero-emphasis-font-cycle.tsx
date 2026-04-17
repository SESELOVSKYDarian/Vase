"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const FINAL_FONT = "var(--font-newsreader), serif";
const FONT_ROTATION = [
  'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
  '"Courier New", Courier, monospace',
  '"Brush Script MT", "Segoe Script", cursive',
  '"Arial Black", Gadget, sans-serif',
  '"Lucida Console", Monaco, monospace',
  '"Franklin Gothic Medium", "Arial Narrow", Arial, sans-serif',
  '"Segoe Print", "Bradley Hand", cursive',
  '"Bodoni MT", Didot, serif',
  '"Copperplate Gothic Bold", Copperplate, serif',
  '"Comic Sans MS", "Comic Sans", cursive',
  '"OCR A Std", "Courier New", monospace',
  'Verdana, Geneva, sans-serif',
] as const;
const STEP_MS = 500;

type HeroEmphasisFontCycleProps = {
  text: string;
};

export function HeroEmphasisFontCycle({ text }: HeroEmphasisFontCycleProps) {
  const [fontIndex, setFontIndex] = useState(0);

  useEffect(() => {
    setFontIndex(0);

    const intervalId = window.setInterval(() => {
      setFontIndex((currentIndex) => {
        return (currentIndex + 1) % FONT_ROTATION.length;
      });
    }, STEP_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeFontFamily = useMemo(() => {
    return FONT_ROTATION[fontIndex] ?? FINAL_FONT;
  }, [fontIndex]);

  return (
    <span className="inline-grid min-w-[14ch] place-items-center align-baseline whitespace-nowrap text-center leading-[0.95]">
      <span
        aria-hidden="true"
        className="col-start-1 row-start-1 invisible inline-block italic font-medium tracking-[-0.055em]"
        style={{ fontFamily: FINAL_FONT }}
      >
        {text}
      </span>
      <span
        className="col-start-1 row-start-1 inline-flex items-center justify-center italic font-medium tracking-[-0.055em] text-[#1c2a1d]"
        style={{ fontFamily: activeFontFamily }}
      >
        {text}
      </span>
    </span>
  );
}
