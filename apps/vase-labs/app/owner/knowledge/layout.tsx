import Link from "next/link";
import type { ReactNode } from "react";

export default function KnowledgeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-5">
      <nav className="labs-knowledge-tabs" aria-label="Secciones de conocimiento">
        <Link href="/owner/knowledge">Documentos</Link>
        <Link href="/owner/knowledge/catalog">Catalogo</Link>
        <Link href="/owner/settings">Configuracion</Link>
      </nav>
      {children}
    </div>
  );
}
