// Parte de page.tsx: pillars, features, impactItems, businessSignals, getFeatureImageClass.
import { Bot, Boxes, Settings2, ShoppingBag, Store, Workflow } from "lucide-react";

export const pillars: Array<{
  icon: typeof Store;
  title: string;
  body: string;
  phase: string;
  accent?: boolean;
}> = [
  {
    icon: Store,
    title: "Presencia ecommerce",
    body: "Una base visual premium para lanzar rapido, ordenar catalogo y empezar a vender sin partir de cero.",
    phase: "01 Base",
  },
  {
    icon: Workflow,
    title: "Sincronizacion real",
    body: "Pedidos, clientes, catalogo y estados se conectan con tu operacion para que web y gestion hablen el mismo idioma.",
    phase: "02 Sync",
    accent: true,
  },
  {
    icon: Boxes,
    title: "Operacion conectada",
    body: "Stock, procesos internos, automatizaciones y logica comercial listos para crecer sin fragmentacion.",
    phase: "03 Ops",
  },
] as const;

export const features = [
  {
    title: "Plantilla editable premium",
    body: "Ideal para negocios que necesitan velocidad, claridad editorial y una base prolija para salir a mercado.",
    image: "/vase-business-dashboard.png",
  },
  {
    title: "Ecommerce personalizado",
    body: "Para marcas con requerimientos diferenciales de UX, branding, integraciones o recorridos comerciales mas complejos.",
    image: "/vase-business-ecommerce-personalizado.png",
  },
  {
    title: "Integracion con gestion",
    body: "Pensado para convivir con OpenSystemSoft y otros sistemas de negocio, conectando ecommerce con la realidad operativa.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBNykXDxHm3-ByO4CHlyAJjkhRqqhEpXL5wv2jZUcQcdDTQhiOzHC-uJcHc9y_9GSuAC-3VXO-ErBs6_N3DPiR9brso3bJe47DuO43fBd01ELkgKQAavE-XRMUK4e4b_DndrFhas1so2j0j6R_PzMCLouhK85x3RfOuwTiQUrKtWlG3nNtKIqjvr1JMFHolYMzxsrPfOA3FgEyaVMfAntk932rF-uWB6I8tGuv5RCWEyfkaQAX1U4MP2dpZzbfdbacp9PyNcCdIFjE",
  },
  {
    title: "Chatbots conectados",
    body: "La experiencia comercial puede complementarse con chatbots utiles para responder, asistir clientes y escalar soporte.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuACphy1zCiBWGKo9-ZuOTYzMGgcPlIrCf90VQuFijmt76iEvqiRWJc-hhtcchoRFZJu3R6rfMSe87DzeDIr4UpO5c4Lzr0_T5QUD8ahHl14eKXzg4p8b36ImfBWGV3u8KeeWRvqkKyxpyR4HHxPPbgb2rcxs73HjqYApwCI8ldpeDksas9bt8p1tmBWld-WuigzQVdybWydK9UGMP3D63m5sBbUtPshTRlBhDsiNU02YiyyUG0jnuNWRD910DkPMG4vTt-OO-76b0k",
  },
] as const;

export const impactItems = [
  {
    icon: ShoppingBag,
    title: "Base gratuita para empezar",
    body: "Puedes crear tu web con una base limitada y validarla rapido antes de pasar a un dominio real y a una operacion mas completa.",
  },
  {
    icon: Settings2,
    title: "Escala sin rehacer todo",
    body: "Vase Business te deja empezar simple y evolucionar a flujos mas avanzados, integraciones profundas o una capa custom cuando el negocio lo pide.",
  },
  {
    icon: Bot,
    title: "Listo para sumar IA",
    body: "La operacion comercial puede crecer junto a automatizaciones y chatbots sin separarse del ecommerce ni de la gestion.",
  },
] as const;

export const businessSignals = [
  { label: "Modelo", value: "Multi-sitio con dominio propio" },
  { label: "Integracion", value: "ERP, stock, pedidos y clientes" },
  { label: "Escalabilidad", value: "Base editable + capa custom" },
] as const;

export function getFeatureImageClass(image: string) {
  if (image === "/listo.png") {
    return "bg-black object-contain p-8";
  }

  if (image.startsWith("/vase-business-")) {
    return "bg-white object-contain p-2";
  }

  return "object-cover";
}
