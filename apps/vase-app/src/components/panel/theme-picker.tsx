"use client";

import { usePanelTheme } from "@/components/layout/client-shell";

export function ThemePicker() {
  const { theme, setTheme } = usePanelTheme();

  return (
    <div className="vpa-themes" role="radiogroup" aria-label="Tema">
      <button
        type="button"
        role="radio"
        aria-checked={theme === "light"}
        className={theme === "light" ? "vpa-theme on" : "vpa-theme"}
        onClick={() => setTheme("light")}
      >
        <span className="vpa-tprev" style={{ background: "#ffffff" }} aria-hidden="true">
          <i style={{ width: "28%", background: "#eceef0" }} />
          <i style={{ flex: 1, background: "#f4f5f7" }} />
        </span>
        <b>Modo claro</b>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={theme === "dark"}
        className={theme === "dark" ? "vpa-theme on" : "vpa-theme"}
        onClick={() => setTheme("dark")}
      >
        <span className="vpa-tprev" style={{ background: "#000000" }} aria-hidden="true">
          <i style={{ width: "28%", background: "#1e1e1e" }} />
          <i style={{ flex: 1, background: "#121212" }} />
        </span>
        <b>Modo oscuro</b>
      </button>
    </div>
  );
}
