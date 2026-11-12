import { Suspense, type ReactNode } from "react";
import { ProductShellBoundary } from "./product-shell-boundary";

export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main className="vr-loading"><span className="vr-spinner" aria-hidden="true" /><p>Validando acceso…</p></main>}>
      <ProductShellBoundary>{children}</ProductShellBoundary>
    </Suspense>
  );
}
