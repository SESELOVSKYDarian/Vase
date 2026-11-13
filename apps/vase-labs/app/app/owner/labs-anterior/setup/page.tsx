import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

export const dynamic = "force-dynamic";

async function resolveSetupDestination() {
  const requestHeaders = await headers();
  let resolved: Awaited<ReturnType<typeof resolveLabsRequestContext>>;

  try {
    resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      return "https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Fsetup";
    }
    if (error instanceof Error && error.message === "LABS_TENANT_FORBIDDEN") {
      return "https://app.vase.ar/app?labs=required";
    }
    return "https://app.vase.ar/app";
  }

  const [knowledgeItems, connectedChannels] = await Promise.all([
    labsPrisma.knowledgeItem.count({
      where: { assistantId: resolved.assistant.id },
    }),
    labsPrisma.channel.count({
      where: {
        assistantId: resolved.assistant.id,
        status: "CONNECTED",
      },
    }),
  ]);

  if (knowledgeItems === 0) {
    return "/anterior/knowledge";
  }
  if (connectedChannels === 0) {
    return "/anterior/channels";
  }
  return "/anterior/settings";
}

export default async function LabsSetupPage() {
  const destination = await resolveSetupDestination();

  if (destination === "/anterior/knowledge") {
    redirect("/anterior/knowledge");
  }
  if (destination === "/anterior/channels") {
    redirect("/anterior/channels");
  }
  if (destination === "/anterior/settings") {
    redirect("/anterior/settings");
  }
  redirect(destination);
}
