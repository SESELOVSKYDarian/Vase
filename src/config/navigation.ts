import type { Route } from "next";
import {
  Building2,
  ChartNoAxesCombined,
  Headset,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export const marketingHighlights = [
  {
    title: "Seguridad alineada a OWASP ASVS",
    description:
      "Autorización en backend, hardening por defecto, rate limiting, auditoría y validación estricta.",
    icon: ShieldCheck,
  },
  {
    title: "Multi-tenant desde el núcleo",
    description:
      "Aislamiento por tenant, roles claros y rutas preparadas para escalar organizaciones y productos.",
    icon: Building2,
  },
  {
    title: "Operación premium para equipos reales",
    description:
      "Paneles claros para usuarios no técnicos con experiencia moderna, accesible y lista para i18n.",
    icon: Sparkles,
  },
  {
    title: "Base lista para crecer",
    description:
      "Feature flags, pagos, APIs documentadas y módulos desacoplados para roadmap enterprise.",
    icon: ChartNoAxesCombined,
  },
] as const;

export const rolePanels: ReadonlyArray<{
  href: Route;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    href: "/app/admin",
    label: "Platform Admin",
    description: "Gobierno, soporte, observabilidad y seguridad transversal.",
    icon: ShieldCheck,
  },
  {
    href: "/app/owner",
    label: "Tenant Owner",
    description: "Configuración del negocio, billing y control de acceso.",
    icon: Building2,
  },
  {
    href: "/app/support" as Route,
    label: "Support",
    description: "Tickets humanos, cola, asignación y seguimiento auditado.",
    icon: Headset,
  },
  {
    href: "/app/manager",
    label: "Manager",
    description: "Operación diaria, coordinación y visibilidad de KPIs.",
    icon: Users,
  },
  {
    href: "/app/member",
    label: "Member",
    description: "Trabajo operativo simple, enfocado y accesible.",
    icon: Sparkles,
  },
] as const;
