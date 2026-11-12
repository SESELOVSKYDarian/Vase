import { redirect } from "next/navigation";

// Canales vive en Ajustes › Labs. Se mantiene la ruta para los enlaces viejos y la vuelta de Meta.
export default async function LabsChannelsPage({ searchParams }: { searchParams: Promise<{ attempt?: string }> }) {
  const { attempt } = await searchParams;
  redirect(attempt ? `/owner/settings?attempt=${encodeURIComponent(attempt)}#canales` : "/owner/settings#canales");
}
