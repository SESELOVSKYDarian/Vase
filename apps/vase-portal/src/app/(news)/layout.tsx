import type { PropsWithChildren } from "react";
import { CustomCursor } from "@/components/ui/custom-cursor";
import { NEWS_ORIGIN } from "@/config/news";
import { portalOrigins } from "@/config/origins";
import { NewsNav } from "./news-nav";
import "./news.css";

// Tema sin parpadeo: lo guardado o, si no hay, el del sistema.
const themeScript = `try{var t=localStorage.getItem("vase-news-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.vnTheme=t}catch(e){document.documentElement.dataset.vnTheme="light"}`;

export default function NewsLayout({ children }: PropsWithChildren) {
  return (
    <div className="vn">
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <CustomCursor />
      <NewsNav newsOrigin={NEWS_ORIGIN} site={portalOrigins.publicSite} app={portalOrigins.app} />
      {children}
    </div>
  );
}
