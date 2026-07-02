import Link from "next/link";
import { CtaBand } from "@/components/marketing/cta-band";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

const sections: readonly LegalSection[] = [
  {
    title: "1. Enfoque de seguridad",
    body: [
      "Vase está diseñado con una base multi-tenant, controles de acceso en backend, validaciones estrictas, auditoría operativa, rate limiting y capas de separación entre dominios del producto.",
      "La seguridad forma parte del diseño del sistema y no solo de una etapa posterior. Esto incluye identidad, autorización, aislamiento de tenants, manejo de secretos y monitoreo operativo.",
    ],
  },
  {
    title: "2. Controles aplicados",
    body: [
      "La plataforma aplica medidas para reducir riesgos de abuso, acceso indebido y exposición de datos, aunque dichas medidas pueden evolucionar con el producto y con el entorno técnico de despliegue.",
    ],
    items: [
      "Autenticación y verificación de email para acceso a paneles.",
      "Autorización por roles de plataforma y por roles de tenant.",
      "Rate limiting y controles de request en puntos sensibles.",
      "Registro de eventos, actividad administrativa y acciones críticas.",
      "Separación lógica de funciones entre Business, Labs, soporte e integraciones.",
      "Uso de HTTPS y despliegues orientados a producción.",
    ],
  },
  {
    title: "3. Responsabilidades del cliente",
    body: [
      "La seguridad también depende de la operación del cliente. Es responsabilidad del titular proteger credenciales, administrar accesos internos, revisar integraciones activas, limitar usuarios innecesarios y reportar incidentes o comportamientos sospechosos.",
    ],
    items: [
      "No compartir usuarios y contraseñas.",
      "Revocar accesos de personas que ya no deben operar el sistema.",
      "Configurar correctamente dominios, canales, webhooks y credenciales externas.",
      "Evitar cargar contenido inseguro o datos excesivos en módulos de IA o automatización.",
    ],
  },
  {
    title: "4. Integraciones, pagos y terceros",
    body: [
      "Cuando Vase se integra con proveedores externos, APIs, pagos, ERP, mensajería o IA, parte del riesgo operativo depende también de la seguridad, disponibilidad y políticas de dichos terceros. Vase procura desacoplar y auditar esos puntos, pero no controla integralmente plataformas ajenas.",
    ],
  },
  {
    title: "5. Reporte responsable",
    body: [
      "Si detectas una vulnerabilidad, exposición de datos, comportamiento anómalo o una posible debilidad de seguridad, debes reportarla por un canal responsable y sin explotar el hallazgo más allá de lo necesario para demostrarlo.",
      "Vase puede priorizar, investigar y mitigar reportes según severidad, impacto, evidencia y contexto operativo.",
    ],
  },
  {
    title: "6. Respuesta y continuidad",
    body: [
      "Ante incidentes relevantes, Vase puede limitar accesos, pausar funciones, rotar credenciales, desactivar integraciones, aplicar hardening adicional o ejecutar medidas operativas urgentes para proteger la plataforma y sus tenants.",
    ],
  },
] as const;

export default function SecurityPage() {
  return (
    <LegalPage
      eyebrow="Seguridad"
      title="Política de seguridad"
      description="Principios y controles generales con los que Vase protege acceso, operación, integraciones y datos dentro de la plataforma."
      updatedAt="10 de abril de 2026"
      sections={sections}
      footer={
        <div className="space-y-6">
          <CtaBand
            title="¿Necesitas una revisión técnica de seguridad o integraciones?"
            description="Podemos revisar arquitectura, despliegue, credenciales, webhooks, aislamiento multi-tenant y flujos operativos antes de salir a producción."
          />
          <div className="flex justify-center">
            <Link
              href="/developers/api"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#006d43] px-6 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Ver documentación técnica
            </Link>
          </div>
        </div>
      }
    />
  );
}
