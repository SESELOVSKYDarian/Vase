import { ChannelConnectionForm } from "@/components/labs/channel-connection-form";
import { KnowledgeUrlForm } from "@/components/labs/knowledge-url-form";
import { StatusBadge } from "@/components/business/status-badge";
import { PanelCard } from "@/components/ui/panel-card";
import { channelTone, getLabsOwnerPageData, trainingTone } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsIntegrationsPage() {
  const { dashboard, labsEnabled } = await getLabsOwnerPageData();

  return (
    <div className="space-y-8">
      <header className="max-w-4xl">
        <h2 className="text-4xl tracking-[-0.04em] text-[#191c1b]">Integraciones</h2>
        <p className="mt-3 text-lg text-[#4b5b52]">
          Conecta canales y fuentes de conocimiento con estados visibles por cada integracion.
        </p>
      </header>

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <PanelCard
              eyebrow="URLs"
              title="Scraping controlado"
              description="Registra URLs del sitio y limita rutas permitidas para entrenamiento de contenido publico permitido."
            >
              <KnowledgeUrlForm />
              <div className="mt-6 grid gap-3">
                {dashboard.urls.length === 0 ? (
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                    Aun no hay URLs registradas.
                  </div>
                ) : (
                  dashboard.urls.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">{item.title}</p>
                        <StatusBadge tone={trainingTone(item.status)} label={item.status} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.sourceUrl}</p>
                    </div>
                  ))
                )}
              </div>
            </PanelCard>

            <PanelCard
              eyebrow="Canales"
              title="WhatsApp, Instagram y webchat"
              description="Conecta canales con estados visibles y limites por plan."
            >
              <ChannelConnectionForm canUseInstagram={dashboard.limits.canUseInstagram} />
              <div className="mt-6 grid gap-3">
                {dashboard.channels.length === 0 ? (
                  <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                    Todavia no hay canales registrados.
                  </div>
                ) : (
                  dashboard.channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">
                          {channel.channelType} - {channel.accountLabel}
                        </p>
                        <StatusBadge tone={channelTone(channel.status)} label={channel.status} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {channel.externalHandle ?? "Sin handle registrado"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </PanelCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <PanelCard
              eyebrow="Meta"
              title="Como conectar tus aplicaciones de Meta con Vase"
              description="Guia operativa para WhatsApp Business e Instagram usando Meta for Developers."
            >
              <div className="grid gap-4 text-sm leading-7 text-[var(--muted)]">
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">1. Crear app en Meta for Developers</p>
                  <p className="mt-2">
                    Crea una app tipo Business, agrega los productos WhatsApp e Instagram Graph API, y vincula un
                    Business Manager con permisos de administracion.
                  </p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">2. Recolectar credenciales clave</p>
                  <p className="mt-2">
                    Necesitas al menos: <span className="font-medium">Access Token</span>,{" "}
                    <span className="font-medium">Phone Number ID</span> (WhatsApp) y secretos de app para validar
                    firmas de webhook.
                  </p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">3. Configurar webhook en Meta</p>
                  <p className="mt-2">
                    Define callback URL publica HTTPS y verify token. Vase valida integridad con firma{" "}
                    <code className="rounded bg-black/5 px-1 py-0.5 text-xs">sha256</code> en el header de Meta y
                    procesa eventos de mensajes entrantes.
                  </p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">4. Registrar el canal en esta pantalla</p>
                  <p className="mt-2">
                    Carga canal, cuenta y handle/telefono con el formulario superior. El estado queda en{" "}
                    <span className="font-medium">PENDING</span> hasta la validacion tecnica final.
                  </p>
                </div>
              </div>
            </PanelCard>

            <PanelCard
              eyebrow="Checklist tecnico"
              title="Datos que debes tener listos"
              description="Esto evita bloqueos durante la activacion de Meta dentro de Vase Labs."
            >
              <div className="grid gap-3 text-sm leading-7 text-[var(--muted)]">
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                  <p className="font-semibold text-[var(--foreground)]">WhatsApp Cloud API</p>
                  <p className="mt-1">Access token vigente y Phone Number ID correcto para envio de mensajes.</p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                  <p className="font-semibold text-[var(--foreground)]">Permisos y productos</p>
                  <p className="mt-1">App con productos habilitados y permisos de negocio aprobados en Meta.</p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                  <p className="font-semibold text-[var(--foreground)]">Seguridad</p>
                  <p className="mt-1">Secret de app para verificar firma de webhook y endpoint HTTPS publico.</p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                  <p className="font-semibold text-[var(--foreground)]">Pruebas</p>
                  <p className="mt-1">Mensaje de prueba, evento recibido, y respuesta saliente confirmada en Graph.</p>
                </div>
              </div>
            </PanelCard>
          </section>
        </>
      )}
    </div>
  );
}
