import React from "react";
import { navigate } from "../utils/navigation";

export default function PriceAccessPrompt({
  compact = false,
  align = "left",
  className = "",
}) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";
  const gapClass = compact ? "gap-1.5" : "gap-2";
  const textClass = compact ? "text-xs" : "text-sm";
  const buttonClass = compact ? "h-8 px-3 text-[11px]" : "h-9 px-4 text-xs";

  return (
    <div className={`flex flex-col ${alignClass} ${gapClass} ${className}`}>
      <span className={`${textClass} font-medium leading-snug text-[#8a7560]`}>
        Para ver los precios, inicia sesion.
      </span>
      <button
        type="button"
        onClick={() => navigate("/login")}
        className={`inline-flex items-center justify-center rounded-lg bg-primary text-white font-bold transition-colors hover:bg-primary/90 ${buttonClass}`}
      >
        Iniciar sesion
      </button>
    </div>
  );
}
