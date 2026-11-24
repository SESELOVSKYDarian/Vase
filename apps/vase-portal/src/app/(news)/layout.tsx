import type { PropsWithChildren } from "react";
import "./news.css";

// news.vase.ar: cada página trae su portada con la barra; acá solo va el contenedor.
export default function NewsLayout({ children }: PropsWithChildren) {
  return <div className="vn">{children}</div>;
}
