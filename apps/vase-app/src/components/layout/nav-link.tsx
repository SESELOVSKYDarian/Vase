"use client";

import Link from "next/link";
import type { Route } from "next";
import { useSyncExternalStore, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import {
  requiresFullDocumentNavigation,
  resolveNavigationHrefForHost,
} from "@/lib/navigation/document-navigation";

function subscribeToRuntimeHost() {
  return () => {};
}

function getRuntimeHostSnapshot() {
  return typeof window === "undefined" ? null : window.location.host;
}

function getServerRuntimeHostSnapshot() {
  return null;
}

export function NavLink({
  href,
  className,
  style,
  title,
  onClick,
  forceDocumentNavigation = false,
  children,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  forceDocumentNavigation?: boolean;
  children: ReactNode;
}) {
  const runtimeHost = useSyncExternalStore(
    subscribeToRuntimeHost,
    getRuntimeHostSnapshot,
    getServerRuntimeHostSnapshot,
  );
  const resolvedHref = resolveNavigationHrefForHost(href, runtimeHost);
  const isExternalHref = /^https?:\/\//i.test(resolvedHref);

  if (isExternalHref || forceDocumentNavigation || requiresFullDocumentNavigation(resolvedHref)) {
    return (
      <a
        href={resolvedHref}
        className={className}
        style={style}
        title={title}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          if (forceDocumentNavigation && typeof window !== "undefined") {
            event.preventDefault();
            window.location.assign(resolvedHref);
          }
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={resolvedHref as Route} className={className} style={style} title={title} onClick={onClick}>
      {children}
    </Link>
  );
}
