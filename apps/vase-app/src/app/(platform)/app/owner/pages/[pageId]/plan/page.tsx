// "Tu plan" de una web: cuánto espacio usa, hasta dónde llega el plan y la copia de seguridad.
import Link from "next/link";
import type { Route } from "next";
import { forbidden, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BackupPanel, type BackupView } from "@/components/panel/web-plan/BackupPanel";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { getPlanLabel } from "@/lib/business/plans";
import { STORAGE_ALERT_PERCENT, formatBytes, formatCount, percentOf } from "@/lib/business/storage";
import { getStorefrontBuilderData } from "@/server/queries/builder";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { getBusinessStorage } from "@/server/services/business-storage";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const dayLabel = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeLabel = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" });

const BREAKDOWN = [
  { key: "images", label: "Imágenes", color: "var(--acc)" },
  { key: "orders", label: "Pedidos y comprobantes", color: "#f79009" },
  { key: "catalog", label: "Catálogo y precios", color: "#7a5af8" },
  { key: "design", label: "Diseño y textos", color: "var(--mut)" },
] as const;

function Meter({ label, used, total, percent, hint }: { label: string; used: string; total: string; percent: number; hint: string }) {
  const tone = percent >= STORAGE_ALERT_PERCENT ? "warn" : "";
  return (
    <div className="vpa-tp-m">
      <div className="vpa-tp-mh">
        <span className="vpa-tp-ml">{label}</span>
        <span className={`vpa-tp-mp ${tone}`}>{percent}%</span>
      </div>
      <div className="vpa-tp-mv">
        <b>{used}</b>
        <span>de {total}</span>
      </div>
      <div className="vpa-tp-bar" role="img" aria-label={`${label}: ${percent}% usado`}>
        <i className={tone} style={{ width: `${percent}%` }} />
      </div>
      <small>{hint}</small>
    </div>
  );
}

export default async function WebPlanPage({ params }: { params: Promise<{ pageId: string }> }) {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const { pageId } = await params;
  const [builder, dashboard, storage] = await Promise.all([
    getStorefrontBuilderData(membership.tenantId, pageId),
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
    getBusinessStorage(membership.tenantId),
  ]);
  if (!builder) notFound();

  const { limits, usage } = storage;
  const imagePercent = percentOf(usage.imageCount, limits.maxImages);
  const spacePercent = percentOf(usage.totalBytes, limits.maxBytes);
  const topPercent = Math.max(imagePercent, spacePercent);
  const freeBytes = Math.max(0, limits.maxBytes - usage.totalBytes);
  const freeImages = Math.max(0, limits.maxImages - usage.imageCount);

  const main = storage.backups.find((backup) => backup.kind !== "pre_restore") ?? null;
  const mainDate = main ? new Date(main.createdAt) : null;
  const backupView: BackupView | null =
    main && mainDate
      ? {
          id: main.id,
          when: `${dayLabel.format(mainDate)}, ${timeLabel.format(mainDate)}`,
          detail: `Copia completa · ${formatBytes(main.sizeBytes)}`,
        }
      : null;
  const nextLabel = mainDate ? dayLabel.format(new Date(mainDate.getTime() + WEEK_MS)) : "Esta semana";
  const domain = builder.page.domainConnections[0]?.hostname ?? null;

  return (
    <AppShell
      title="Tu plan"
      subtitle={builder.page.name}
      tenantLabel={membership.tenant.name}
      modules={dashboard?.modules}
      notifications={dashboard?.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
    >
      <div className="vpa-tp-stack">
        <Link href={"/app/business" as Route} className="vpa-backl">
          ← Tus webs
        </Link>

        <div className="vpa-tp-plan">
          <div className="g">
            <small>Plan de esta web</small>
            <b>{getPlanLabel(builder.plan.plan)}</b>
            <span>{domain ? `${domain} · ` : ""}lo que usa esta web y hasta dónde llega</span>
          </div>
          <Link href={"/app/billing" as Route} className="vpa-btn acc">
            Mejorar plan
          </Link>
        </div>

        {storage.state === "offline" ? (
          <p className="vpa-tp-note">No pudimos actualizar los datos ahora. Te mostramos lo último que teníamos guardado.</p>
        ) : null}

        <div className="vpa-tp-ms">
          <Meter
            label="Imágenes"
            used={formatCount(usage.imageCount)}
            total={formatCount(limits.maxImages)}
            percent={imagePercent}
            hint={freeImages > 0 ? `Te quedan ${formatCount(freeImages)}.` : "Llegaste al tope de imágenes."}
          />
          <Meter
            label="Espacio total"
            used={formatBytes(usage.totalBytes)}
            total={formatBytes(limits.maxBytes)}
            percent={spacePercent}
            hint={freeBytes > 0 ? `Te quedan ${formatBytes(freeBytes)}. Al llegar al tope no se puede subir más.` : "Llegaste al tope de espacio."}
          />
        </div>

        <section className="vpa-tp-box" aria-label="En qué se va el espacio">
          <div>
            <h3>En qué se va el espacio</h3>
            <p className="sub">Todo lo que ocupa esta web suma para el tope de {formatBytes(limits.maxBytes)}.</p>
          </div>
          <div className="vpa-tp-split" aria-hidden="true">
            {BREAKDOWN.map((part) => (
              <i key={part.key} style={{ width: `${percentOf(usage.breakdown[part.key], limits.maxBytes)}%`, background: part.color }} />
            ))}
          </div>
          <div className="vpa-tp-leg">
            {BREAKDOWN.map((part) => (
              <div key={part.key}>
                <i style={{ background: part.color }} />
                {part.label}
                <span>{formatBytes(usage.breakdown[part.key])}</span>
              </div>
            ))}
            <div>
              <i style={{ background: "var(--line2)" }} />
              Libre
              <span>{formatBytes(freeBytes)}</span>
            </div>
          </div>
        </section>

        {topPercent >= STORAGE_ALERT_PERCENT ? (
          <div className="vpa-alert" style={{ flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <b>Estás usando el {topPercent}% de tu plan</b>
              <span className="t">Podés borrar imágenes que ya no usás o pasar a un plan con más lugar.</span>
            </div>
          </div>
        ) : null}

        <BackupPanel pageId={pageId} backup={backupView} nextLabel={nextLabel} canRestore={storage.restoreEnabled} />
      </div>
    </AppShell>
  );
}
