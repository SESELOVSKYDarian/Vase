"use client";

// Parte de app-shell.tsx: Shortcut, AppShellProps, NavItem, NavGroup, inferActiveSection, NotificationToneIcon y más.
import { usePathname } from "next/navigation";
import { type PropsWithChildren, type ReactNode } from "react";
import { Home, Info, TriangleAlert } from "lucide-react";
import { type PlatformModuleAccess } from "@/config/modules";
import { type ShellNotification } from "@/server/services/labs-notifications";
import { ClientShell } from "@/components/layout/client-shell";
import { toInternalAdminPath } from "@/lib/security/admin-host-routing";
import { AdminPanelShell } from "./AdminPanelShell";

export interface Shortcut {
  id: string;
  label: string;
  combo: string;
  action: "link" | "command";
  target: string;
}

export type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  tenantLabel?: string;
  supportWidget?: ReactNode;
  modules?: PlatformModuleAccess[];
  shortcuts?: Shortcut[];
  notifications?: ShellNotification[];
  currentUserName?: string;
  viewerRole?: "OWNER" | "MANAGER" | "MEMBER";
  projectCreation?: {
    business: { canCreate: boolean; remaining: number };
    labs: { canCreate: boolean; remaining: number };
  };
}>;

export type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: typeof Home;
  description?: string;
  forceDocumentNavigation?: boolean;
  children?: Array<{
    id: string;
    href: string;
    label: string;
    forceDocumentNavigation?: boolean;
  }>;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export function inferActiveSection(pathname: string) {
  if (pathname.startsWith("/app/help")) {
    return "tickets";
  }

  if (pathname.startsWith("/app/billing")) {
    return "payments";
  }

  if (pathname.startsWith("/app/owner/customizations")) {
    return "quotes";
  }

  if (pathname.startsWith("/app/settings")) {
    return "profile";
  }

  if (pathname.startsWith("/app/labs")) {
    return "projects";
  }

  if (pathname.startsWith("/app/business") || pathname.startsWith("/app/owner")) {
    return "projects";
  }

  return "home";
}

export function NotificationToneIcon({ tone }: { tone: "info" | "warning" | "danger" }) {
  if (tone === "danger") {
    return <TriangleAlert className="size-4 text-[var(--danger)]" />;
  }

  if (tone === "warning") {
    return <TriangleAlert className="size-4 text-[var(--warning)]" />;
  }

  return <Info className="size-4 text-[var(--info)]" />;
}

export function notificationSourceClass(sourceLabel?: string) {
  switch (sourceLabel) {
    case "Vase Labs":
      return "border-[color-mix(in_srgb,var(--success)_28%,var(--border-subtle))] bg-[var(--success-soft)] text-[var(--success)]";
    case "Vase Business":
      return "border-[color-mix(in_srgb,var(--info)_28%,var(--border-subtle))] bg-[var(--info-soft)] text-[var(--info)]";
    case "Billing":
      return "border-[color-mix(in_srgb,var(--warning)_28%,var(--border-subtle))] bg-[var(--warning-soft)] text-[var(--warning)]";
    default:
      return "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground)]";
  }
}

export function AppShell(props: AppShellProps) {
  const pathname = usePathname() ?? "/app";
  const isAdminShell = pathname.startsWith("/app/admin") || toInternalAdminPath(pathname) !== null;

  if (isAdminShell) {
    return <AdminPanelShell {...props} />;
  }

  return (
    <ClientShell
      title={props.title}
      subtitle={props.subtitle}
      tenantLabel={props.tenantLabel}
      notifications={props.notifications}
      currentUserName={props.currentUserName}
      viewerRole={props.viewerRole}
    >
      {props.children}
    </ClientShell>
  );
}
