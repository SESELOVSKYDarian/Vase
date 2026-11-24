import { EmbeddedAnnouncements } from "@/components/announcements/announcement-modal";
import { isAnnouncementSurface } from "@/lib/announcements";
import { auth } from "@/auth";
import { listAnnouncementsFor } from "@/server/services/announcements";

export const dynamic = "force-dynamic";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vase.ar").replace(/\/+$/, "");

/**
 * Anuncios para mostrar adentro de Business, Labs, Management y Rest. El producto pone esta página en un
 * iframe invisible que ocupa toda la pantalla y lo muestra solo si hay algo (mensaje "vase-announcements").
 */
export default async function EmbeddedAnnouncementsPage({ searchParams }: { searchParams: Promise<{ surface?: string | string[]; theme?: string | string[] }> }) {
  const query = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const surface = one(query.surface);
  const theme = one(query.theme) === "dark" ? "dark" : "light";
  const session = await auth().catch(() => null);
  const items = session?.user?.id && isAnnouncementSurface(surface) ? await listAnnouncementsFor(surface, session.user.id).catch(() => []) : [];
  return <EmbeddedAnnouncements items={items} linkBase={APP_URL} theme={theme} />;
}
