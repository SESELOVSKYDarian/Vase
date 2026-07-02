import { type Route } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight, LockKeyhole } from "lucide-react";

// The primary legal sections updated to 2026
const sections = [
  {
    id: "aceptacion",
    num: "01",
    title: "Alcance del servicio",
    content: (
      <>
        <p>
          Vase ofrece una plataforma SaaS orientada a ecommerce, integraciones, automatización, inteligencia aplicada y
          operación multi-tenant. El alcance exacto contratado depende del producto, plan, implementación y módulos
          activos del cliente.
        </p>
        <p>
          El uso de la plataforma implica aceptar que algunas capacidades pueden requerir configuración adicional,
          integraciones de terceros, validaciones técnicas o aprobación comercial antes de estar plenamente operativas.
        </p>
      </>
    ),
  },
  {
    id: "cuentas",
    num: "02",
    title: "Registro y cuenta",
    content: (
      <>
        <p>
          Para acceder a ciertas funciones, el usuario debe crear una cuenta con datos verdaderos, completos y
          actualizados. El titular de la cuenta es responsable de custodiar sus credenciales, aprobar accesos internos y
          mantener segura la información de ingreso.
        </p>
        <p>
          Vase puede suspender o limitar accesos cuando detecte uso indebido, fraude, incumplimiento contractual,
          actividad riesgosa o violación de políticas operativas y de seguridad.
        </p>
      </>
    ),
  },
  {
    id: "servicio",
    num: "03",
    title: "Contratación y módulos",
    content: (
      <>
        <p>
          Los productos, planes, módulos, integraciones y desarrollos personalizados pueden tener condiciones comerciales
          distintas, incluyendo suscripciones mensuales y costos de infraestructura.
        </p>
        <ul className="mt-4 space-y-3">
          <li className="flex gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-[var(--m3-primary)]" />
            <span>Vase Business incluye storefront, catálogo y dominios.</span>
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-[var(--m3-primary)]" />
            <span>Vase Labs opera mediante planes de IA y canales de atención.</span>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "conducta",
    num: "04",
    title: "Uso permitido",
    content: (
      <>
        <p>
          El cliente y sus usuarios no deben usar Vase para actividades ilegales, envío de contenido malicioso, scraping
          abusivo, spam, fraude o acciones que puedan afectar a otros tenants.
        </p>
        <p>
          Tampoco está permitido usar la plataforma para procesar datos sin base legal suficiente, ni para vulnerar
          derechos de terceros, propiedad intelectual o privacidad.
        </p>
      </>
    ),
  },
  {
    id: "terceros",
    num: "05",
    title: "Integraciones y terceros",
    content: (
      <>
        <p>
          Vase puede integrarse con proveedores externos como hosting, mensajería, email y pasarelas de pago. El cliente
          reconoce que el funcionamiento de esas integraciones depende de la disponibilidad de terceros.
        </p>
        <p>
          Vase no garantiza la continuidad absoluta de servicios externos ni se responsabiliza por caídas o cambios de
          API en plataformas ajenas.
        </p>
      </>
    ),
  },
  {
    id: "propiedad",
    num: "06",
    title: "Propiedad intelectual",
    content: (
      <>
        <p>
          Todo el contenido, marcas y software presentes en la plataforma son propiedad exclusiva de Vase o de sus
          licenciantes y están protegidos por leyes internacionales.
        </p>
        <p>
          El usuario conserva los derechos sobre sus propios datos y contenidos cargados, otorgando a Vase una licencia
          limitada para operar el servicio.
        </p>
      </>
    ),
  },
  {
    id: "pagos",
    num: "07",
    title: "Términos de Pago",
    content: (
      <>
        <p>
          Vase ofrece planes gratuitos y de pago. Las suscripciones se facturan por adelantado. Las tarifas son no
          reembolsables, salvo disposición legal en contrario.
        </p>
        <div className="mt-6 border-l-4 border-[var(--m3-primary)] bg-[var(--m3-surface-container)] p-6 rounded-lg">
          <p className="text-sm font-medium italic italic">
            Nota: La falta de pago resultará en la suspensión del acceso premium tras un periodo de gracia de 7 días.
          </p>
        </div>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <div
      className="selection:bg-[var(--m3-primary-container)] selection:text-[var(--m3-on-primary-container)]"
      style={{
        // Material 3 Color Palette (Custom per page for the new design)
        "--m3-primary": "#006d43",
        "--m3-on-primary": "#ffffff",
        "--m3-primary-container": "#18c37e",
        "--m3-on-primary-container": "#004a2c",
        "--m3-surface": "#f8faf8",
        "--m3-on-surface": "#191c1b",
        "--m3-surface-variant": "#e1e3e1",
        "--m3-on-surface-variant": "#3c4a40",
        "--m3-surface-container": "#eceeec",
        "--m3-surface-container-low": "#f2f4f2",
        "--m3-outline": "#6c7b70",
        "--m3-outline-variant": "#bbcabe",
      } as React.CSSProperties}
    >
      <main className="mx-auto max-w-7xl px-6 py-12 md:px-12 md:py-24">
        {/* Header Section */}
        <header className="mx-auto mb-20 max-w-4xl text-center">
          <div className="mb-6 inline-block rounded-full bg-[var(--m3-surface-container-low)] px-4 py-1.5 font-sans text-xs font-bold uppercase tracking-[0.2em] text-[var(--m3-primary)]">
            Aviso Legal
          </div>
          <h1 className="mb-8 font-serif text-5xl leading-tight md:text-7xl">
            Términos y <span className="italic text-[var(--m3-primary)]">Condiciones</span>
          </h1>
          <p className="mx-auto max-w-xl font-sans text-lg leading-relaxed text-[var(--m3-on-surface-variant)]">
            Última actualización: 10 de abril del 2026. Le agradecemos por confiar en Vase para la gestión de su
            ecosistema digital.
          </p>
        </header>

        <div className="relative grid grid-cols-1 gap-16 lg:grid-cols-12">
          {/* Quick Nav / TOC */}
          <aside className="sticky top-32 h-fit hidden lg:col-span-3 lg:block">
            <nav className="flex flex-col gap-4 border-l border-[var(--m3-outline-variant)]/30 py-2 pl-6">
              <span className="mb-2 font-sans text-xs uppercase tracking-widest text-[var(--m3-outline)]">
                Contenido
              </span>
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-sm font-medium transition-colors hover:text-[var(--m3-primary)]"
                >
                  {section.num}. {section.title}
                </a>
              ))}
              <a href="#contacto" className="text-sm font-medium transition-colors hover:text-[var(--m3-primary)]">
                Contacto
              </a>
            </nav>
          </aside>

          {/* Content Area */}
          <article className="max-w-[800px] lg:col-span-9">
            <div className="space-y-16">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-32">
                  <div className="flex items-start gap-6">
                    <span className="mt-1 font-serif text-3xl italic text-[var(--m3-primary)] opacity-40">
                      {section.num}
                    </span>
                    <div>
                      <h2 className="mb-6 font-serif text-3xl text-[var(--m3-on-surface)]">{section.title}</h2>
                      <div className="space-y-4 font-sans text-lg leading-relaxed text-[var(--m3-on-surface-variant)]">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </section>
              ))}

              {/* Security Inset Card */}
              <div className="overflow-hidden rounded-xl bg-[var(--m3-surface-container-low)] p-8 md:p-12">
                <div className="flex flex-col items-center gap-8 md:flex-row">
                  <div className="w-full md:w-1/2">
                    <h3 className="mb-4 font-serif text-2xl italic">Seguridad por diseño</h3>
                    <p className="font-sans text-base leading-relaxed text-[var(--m3-on-surface-variant)]">
                      En Vase, la transparencia es un valor fundamental. Nuestro departamento legal trabaja continuamente
                      para asegurar que nuestros términos sean comprensibles y protejan los intereses de nuestra comunidad.
                    </p>
                  </div>
                  <div className="w-full md:w-1/2">
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-[var(--m3-outline-variant)]/20 shadow-xl">
                      <img
                        src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800"
                        alt="Oficina moderna"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact / CTA Section */}
              <section
                id="contacto"
                className="scroll-mt-32 rounded-2xl border border-[var(--m3-primary)]/10 bg-[var(--m3-primary-container)]/5 p-10"
              >
                <div className="max-w-2xl">
                  <h2 className="mb-4 font-serif text-3xl text-[var(--m3-on-primary-container)]">
                    ¿Necesita aclaraciones?
                  </h2>
                  <p className="mb-8 font-sans text-[var(--m3-on-primary-container)] opacity-80">
                    Nuestro equipo legal está disponible para resolver cualquier duda que pueda surgir respecto a estos
                    términos. No dude en contactarnos para una asistencia personalizada.
                  </p>
                  <Link
                    href="mailto:legal@vase.ar"
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--m3-primary)] px-8 py-3 font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Contactar Soporte Legal
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </section>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
