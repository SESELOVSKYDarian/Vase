import {
  BarChart3,
  Bike,
  BookOpen,
  CalendarDays,
  ChefHat,
  CircleHelp,
  Home,
  LayoutGrid,
  Package,
  ReceiptText,
  Settings2,
  TicketPercent,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { NavigationIcon } from "./navigation";

// Un ícono por sección del menú. Mismo trazo (lucide, 2px) que el panel de Vase Business.
export const NAV_ICONS: Record<NavigationIcon, LucideIcon> = {
  home: Home,
  chart: BarChart3,
  salon: LayoutGrid,
  orders: ReceiptText,
  calendar: CalendarDays,
  kitchen: ChefHat,
  delivery: Bike,
  cash: Wallet,
  catalog: BookOpen,
  promo: TicketPercent,
  inventory: Package,
  team: Users,
  settings: Settings2,
  support: CircleHelp,
};
