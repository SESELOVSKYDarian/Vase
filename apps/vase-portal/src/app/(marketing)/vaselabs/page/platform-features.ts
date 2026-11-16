// Parte de page.tsx: channelCards, platformFeatures, outcomes, leadRows.
import { BarChart3, BrainCircuit, LayoutDashboard, MessageCircleMore, Orbit, Workflow, type LucideIcon } from "lucide-react";

export const channelCards: ReadonlyArray<{
  title: string;
  body: string;
  icon: LucideIcon;
  accent?: boolean;
}> = [
  {
    title: "WhatsApp, Instagram y Facebook",
    body: "Centralizá la atención en una sola lógica conversacional para responder, derivar y vender con criterio.",
    icon: MessageCircleMore,
  },
  {
    title: "Sincronización inmediata",
    body: "Cada ajuste de tono, flujo o automatización impacta en todos los canales sin tiempos muertos ni reconfiguraciones manuales.",
    icon: Orbit,
    accent: true,
  },
] as const;

export const platformFeatures = [
  {
    title: "Panel unificado",
    body: "Un centro de control para revisar conversaciones, respuestas, métricas y automatizaciones sin abrir veinte herramientas distintas.",
    icon: LayoutDashboard,
  },
  {
    title: "Automatización con criterio",
    body: "Clasificá consultas, resumí conversaciones y dispará acciones útiles sin perder contexto comercial ni operativo.",
    icon: Workflow,
  },
  {
    title: "IA aplicada a negocio",
    body: "Vase Labs no se vende como humo. Se diseña para ayudar a vender mejor, responder más rápido y ordenar trabajo real.",
    icon: BrainCircuit,
  },
  {
    title: "Métricas accionables",
    body: "Seguí leads, tiempos de respuesta, conversiones y señales de intención para mejorar el desempeño del equipo.",
    icon: BarChart3,
  },
];

export const outcomes = [
  "Calificación automática de leads",
  "Historial de conversaciones en tiempo real",
  "Integración con CRM, ecommerce o gestión",
] as const;

export const leadRows = [
  { initials: "JD", name: "Juliana Díaz", source: "Instagram Direct", status: "Calificando", tone: "text-[#006d43]" },
  { initials: "MR", name: "Marcos Rivas", source: "WhatsApp Business", status: "Convertido", tone: "text-[#006d43]" },
  { initials: "SL", name: "Sofía López", source: "Facebook Messenger", status: "En espera", tone: "text-[#36684c]" },
] as const;
