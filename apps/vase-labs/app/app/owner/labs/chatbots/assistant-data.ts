import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

/** Sesión del Asistente: si no hay, vuelve a iniciar sesión en Vase. */
export async function resolveAssistantContext(returnTo: string) {
  const requestHeaders = await headers();
  try {
    return await resolveLabsRequestContext(requestHeaders.get("cookie"));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect(`https://app.vase.ar/signin?redirectTo=${encodeURIComponent(returnTo)}`);
    }
    if (error instanceof Error && error.message === "LABS_TENANT_FORBIDDEN") redirect("https://app.vase.ar/app?labs=required");
    redirect("https://app.vase.ar/app");
  }
}
