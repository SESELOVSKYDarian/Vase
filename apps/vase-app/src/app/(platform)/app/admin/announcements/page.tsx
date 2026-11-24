import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AnnouncementCard, NewAnnouncementButton, type AdminAnnouncementRow } from "@/components/admin/announcements-admin";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

function stateOf(row: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }, now: Date) {
  if (!row.isActive) return { label: "Pausado", tone: "" };
  if (row.startsAt && row.startsAt > now) return { label: "Programado", tone: "b" };
  if (row.endsAt && row.endsAt < now) return { label: "Terminado", tone: "" };
  return { label: "Activo", tone: "g" };
}

export default async function AdminAnnouncementsPage() {
  try {
    await requireAdminPermission(adminPermissions.NOTIFICATIONS);
  } catch {
    forbidden();
  }

  const [rows, dismissals, withImage] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        title: true,
        body: true,
        ctaLabel: true,
        ctaUrl: true,
        icon: true,
        accent: true,
        surfaces: true,
        targetUserIds: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        sendEmail: true,
        emailSentAt: true,
        emailCount: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.announcementDismissal.groupBy({ by: ["announcementId"], _count: { _all: true } }),
    prisma.announcement.findMany({ where: { imageData: { not: null } }, select: { id: true } }),
  ]);
  const closedBy = new Map(dismissals.map((row) => [row.announcementId, row._count._all]));
  const images = new Set(withImage.map((row) => row.id));
  const now = new Date();

  const list: AdminAnnouncementRow[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
    icon: row.icon,
    accent: row.accent,
    imageUrl: images.has(row.id) ? `/api/announcements/${row.id}/image?v=${row.updatedAt.getTime()}` : null,
    audience: Array.isArray(row.targetUserIds) && row.targetUserIds.length ? row.targetUserIds.length : null,
    surfaces: Array.isArray(row.surfaces) ? row.surfaces.filter((item): item is string => typeof item === "string") : [],
    state: stateOf(row, now),
    dates:
      row.startsAt || row.endsAt
        ? `${row.startsAt ? fmt.format(row.startsAt) : "Ya"} → ${row.endsAt ? fmt.format(row.endsAt) : "sin fin"}`
        : `Desde el ${fmt.format(row.createdAt)}`,
    dismissed: closedBy.get(row.id) ?? 0,
    isActive: row.isActive,
    email: row.emailSentAt ? "sent" : row.sendEmail ? "pending" : "off",
    emailCount: row.emailCount,
  }));
  const active = list.filter((row) => row.state.label === "Activo").length;

  return (
    <AppShell title="Anuncios" subtitle="Novedades que ven los clientes en Vase, en una ventana y en sus notificaciones" tenantLabel="Admin">
      <section className="adm-hero">
        <div className="vpa-g1">
          <b>{active ? `${active} ${active === 1 ? "anuncio activo" : "anuncios activos"}` : "Sin anuncios activos"}</b>
          <span>Si hay varios, se ven juntos en un carrusel. Cada persona los ve hasta que los cierra.</span>
        </div>
        <span style={{ flex: 1 }} />
        <NewAnnouncementButton />
      </section>

      {list.length ? (
        <div className="ann-list">
          {list.map((row) => (
            <AnnouncementCard key={row.id} row={row} />
          ))}
        </div>
      ) : (
        <div className="vpa-card vpa-empty" style={{ padding: "48px 20px" }}>
          Todavía no publicaste anuncios. Tocá <b>Nuevo anuncio</b> para contar una novedad.
        </div>
      )}
    </AppShell>
  );
}
