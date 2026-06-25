import type { LabsAdminTenantControl, LabsChannel } from "@vase/contracts";
import { labsAdminTenantControlSchema } from "@vase/contracts";

const labsControls: LabsAdminTenantControl[] = [
  labsAdminTenantControlSchema.parse({
    globalTenantId: "tenant_norte",
    companyName: "Norte Equipos",
    labsActive: true,
    plan: "GROWTH",
    enabledChannels: ["WHATSAPP", "INSTAGRAM"],
    tokenPack: "BASIC",
    tokensIncluded: 250000,
    tokensUsed: 82000,
    extraTokens: 100000,
    serviceStatus: "ACTIVE",
    manualOverride: false,
  }),
  labsAdminTenantControlSchema.parse({
    globalTenantId: "tenant_sur",
    companyName: "Sur Moda",
    labsActive: true,
    plan: "PRO",
    enabledChannels: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
    tokenPack: "MEDIUM",
    tokensIncluded: 1000000,
    tokensUsed: 640000,
    extraTokens: 500000,
    serviceStatus: "ACTIVE",
    manualOverride: false,
  }),
  labsAdminTenantControlSchema.parse({
    globalTenantId: "tenant_demo",
    companyName: "Demo Pausado",
    labsActive: false,
    plan: "STARTER",
    enabledChannels: ["WHATSAPP"],
    tokenPack: null,
    tokensIncluded: 50000,
    tokensUsed: 50000,
    extraTokens: 0,
    serviceStatus: "PAUSED",
    manualOverride: true,
  }),
];

const allChannels: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];

function formatNumber(value: number) {
  return value.toLocaleString("es-AR");
}

function statusLabel(control: LabsAdminTenantControl) {
  if (control.manualOverride) {
    return "Bloqueo manual";
  }

  return control.serviceStatus;
}

export default function Page() {
  const activeLabsCount = labsControls.filter((control) => control.labsActive).length;
  const totalTokensUsed = labsControls.reduce((total, control) => total + control.tokensUsed, 0);
  const totalExtraTokens = labsControls.reduce((total, control) => total + control.extraTokens, 0);

  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <p className="eyebrow">Superadmin</p>
        <h1>Control operativo de Vase Labs por empresa.</h1>
        <p>
          Base para ver y ajustar Labs activo, plan, canales, token pack, consumo, estado de servicio y bloqueo manual.
          Billing automatico queda fuera de esta fase.
        </p>
      </section>

      <section className="admin-metrics" aria-label="Resumen Labs">
        <article>
          <span>Empresas con Labs activo</span>
          <strong>{activeLabsCount}</strong>
        </article>
        <article>
          <span>Tokens usados</span>
          <strong>{formatNumber(totalTokensUsed)}</strong>
        </article>
        <article>
          <span>Tokens extra asignados</span>
          <strong>{formatNumber(totalExtraTokens)}</strong>
        </article>
      </section>

      <section className="admin-panel">
        <div className="section-heading">
          <p className="eyebrow">Labs tenants</p>
          <h2>Planes, canales y control manual</h2>
        </div>

        <div className="labs-admin-list">
          {labsControls.map((control) => {
            const totalTokens = control.tokensIncluded + control.extraTokens;
            const usagePercent = totalTokens > 0 ? Math.round((control.tokensUsed / totalTokens) * 100) : 0;

            return (
              <article className="labs-admin-row" key={control.globalTenantId}>
                <div className="tenant-main">
                  <span className="tenant-id">{control.globalTenantId}</span>
                  <strong>{control.companyName}</strong>
                  <p>{control.plan} · {statusLabel(control)}</p>
                </div>

                <div className="channel-control" aria-label={`Canales de ${control.companyName}`}>
                  {allChannels.map((channel) => (
                    <span className={control.enabledChannels.includes(channel) ? "is-enabled" : ""} key={channel}>
                      {channel}
                    </span>
                  ))}
                </div>

                <div className="token-control">
                  <div>
                    <span>Pack</span>
                    <strong>{control.tokenPack ?? "Sin pack"}</strong>
                  </div>
                  <div>
                    <span>Incluidos</span>
                    <strong>{formatNumber(control.tokensIncluded)}</strong>
                  </div>
                  <div>
                    <span>Usados</span>
                    <strong>{formatNumber(control.tokensUsed)}</strong>
                  </div>
                  <div>
                    <span>Extra</span>
                    <strong>{formatNumber(control.extraTokens)}</strong>
                  </div>
                </div>

                <div className="usage-bar" aria-label={`Uso de tokens ${usagePercent}%`}>
                  <span style={{ width: `${Math.min(100, usagePercent)}%` }} />
                </div>

                <div className="admin-actions">
                  <button type="button">Editar Labs</button>
                  <button type="button">{control.manualOverride ? "Reactivar" : "Bloquear"}</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
