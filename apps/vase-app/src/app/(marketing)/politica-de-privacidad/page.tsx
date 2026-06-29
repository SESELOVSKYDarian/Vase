import Link from "next/link";
import { CtaBand } from "@/components/marketing/cta-band";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

const sections: readonly LegalSection[] = [
  {
    title: "1. Qué datos podemos tratar",
    body: [
      "Vase puede tratar datos de contacto, datos de cuenta, datos operativos del tenant, registros de uso, tickets de soporte, conocimiento cargado para IA, datos de integraciones y metadatos técnicos necesarios para operar la plataforma.",
      "La información tratada dependerá del producto utilizado, del flujo de onboarding, de las integraciones activadas y del alcance contratado por cada cliente.",
    ],
    items: [
      "Datos de identidad y contacto del titular o usuarios autorizados.",
      "Datos comerciales y operativos vinculados al tenant.",
      "Eventos de seguridad, auditoría y actividad técnica.",
      "Contenidos cargados para soporte, automatización o IA, siempre dentro del contexto del servicio.",
    ],
  },
  {
    title: "2. Finalidades del tratamiento",
    body: [
      "Utilizamos la información para crear y administrar cuentas, operar el servicio, habilitar módulos, prestar soporte, mejorar estabilidad, detectar riesgos, procesar solicitudes comerciales, responder consultas y mantener seguridad, trazabilidad y cumplimiento operacional.",
      "En algunos casos también podemos usar datos para comunicaciones transaccionales, verificaciones de identidad, prevención de abuso, métricas de producto e informes internos de servicio.",
    ],
  },
  {
    title: "3. Base operativa y minimización",
    body: [
      "Vase procura tratar solamente la información necesaria para la finalidad correspondiente y durante el tiempo razonable para prestar el servicio, cumplir obligaciones técnicas, contractuales, operativas o responder a incidentes.",
      "Cuando un cliente incorpora datos de terceros a la plataforma, ese cliente es responsable de contar con base legal suficiente para hacerlo.",
    ],
  },
  {
    title: "4. Compartición con terceros",
    body: [
      "Podemos compartir datos con proveedores de infraestructura, email, mensajería, seguridad, analítica, integraciones, IA y pagos, exclusivamente en la medida necesaria para operar funciones del servicio. Cada proveedor puede tener sus propios términos y políticas.",
      "No vendemos información personal como modelo principal del negocio.",
    ],
  },
  {
    title: "5. Seguridad y conservación",
    body: [
      "Aplicamos controles técnicos y operativos para reducir riesgos de acceso no autorizado, pérdida, alteración o exposición indebida. No obstante, ningún sistema conectado a internet puede garantizar seguridad absoluta.",
      "La retención de información puede variar según obligaciones contractuales, operativas, legales, contables, de auditoría o soporte.",
    ],
  },
  {
    title: "6. Derechos y solicitudes",
    body: [
      "Los titulares pueden solicitar actualización, corrección o revisión de ciertos datos de cuenta y contacto, según el rol, la relación contractual y la normativa aplicable. Algunas solicitudes pueden depender de verificaciones previas, legitimación o restricciones técnicas y legales.",
      "Las consultas relacionadas con privacidad pueden canalizarse por los medios de contacto publicados por Vase.",
    ],
  },
  {
    title: "7. IA, FAQs y automatizaciones",
    body: [
      "Cuando el cliente utiliza funciones de IA, soporte automatizado, base de conocimiento o prompting, Vase puede procesar información contextual para mejorar la respuesta del sistema dentro del entorno contratado. El cliente debe evitar cargar datos innecesarios o especialmente sensibles sin evaluación previa.",
    ],
  },
  {
    title: "8. Cambios en esta política",
    body: [
      "Esta política puede actualizarse por cambios regulatorios, técnicos, operativos o por evolución del producto. La versión publicada en el sitio será la referencia vigente, salvo que un contrato específico disponga otra cosa.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacidad"
      title="Política de privacidad"
      description="Resumen operativo sobre el tratamiento de datos dentro de Vase, sus productos, módulos, integraciones y flujos de soporte."
      updatedAt="10 de abril de 2026"
      sections={sections}
      footer={
        <div className="space-y-6">
          <CtaBand
            title="Si tu operación requiere una revisión específica de datos, podemos evaluarla."
            description="En implementaciones con integraciones, IA o datos sensibles conviene revisar alcance, base legal y medidas de seguridad antes del despliegue."
          />
          <div className="flex justify-center">
            <Link
              href="/demo"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[rgba(108,123,112,0.16)] bg-white px-6 text-sm font-semibold text-[#191c1b] transition hover:text-[#006d43]"
            >
              Hablar con Vase
            </Link>
          </div>
        </div>
      }
    />
  );
}
