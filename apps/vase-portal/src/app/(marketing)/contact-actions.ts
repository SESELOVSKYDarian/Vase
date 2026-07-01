"use server";

import { headers } from "next/headers";
import {
  PortalAppRequestError,
  portalAppClient,
} from "@/lib/app-client";
import { contactInquirySchema } from "@/lib/validators/contact";

export type ContactActionState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitContactInquiry(
  _: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const parsed = contactInquirySchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  });

  if (!parsed.success) {
    return {
      error: "Revisa los campos marcados y vuelve a intentar.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const requestHeaders = await headers();

  try {
    await portalAppClient.submitContact(parsed.data, {
      ipAddress:
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        requestHeaders.get("x-real-ip") ??
        "unknown",
      userAgent: requestHeaders.get("user-agent"),
    });
  } catch (error) {
    if (error instanceof PortalAppRequestError && error.status === 429) {
      return {
        error:
          "Recibimos muchas consultas seguidas desde este origen. Intenta nuevamente en unos minutos.",
      };
    }

    return {
      error:
        "No pudimos enviar tu consulta ahora. Intenta nuevamente en unos minutos.",
    };
  }

  return {
    success: "Recibimos tu consulta. Te vamos a responder por email pronto.",
  };
}
