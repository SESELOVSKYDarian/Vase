"use client";

import { createContext, useContext, type ReactNode } from "react";

// Logo del negocio (Ajustes › Mi negocio). El botón de la cuenta lo muestra igual que en Business.
const TenantLogoContext = createContext<string | null>(null);

export function TenantLogoProvider({ logoUrl, children }: { logoUrl: string | null; children: ReactNode }) {
  return <TenantLogoContext.Provider value={logoUrl}>{children}</TenantLogoContext.Provider>;
}

export function useTenantLogo() {
  return useContext(TenantLogoContext);
}
