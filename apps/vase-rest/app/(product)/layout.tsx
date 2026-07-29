import { Suspense, type ReactNode } from "react";
import { ProductShellBoundary } from "./product-shell-boundary";

export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main className="staff-login"><p>Validando accesoâ€¦</p></main>}>
      <ProductShellBoundary>{children}</ProductShellBoundary>
    </Suspense>
  );
}
