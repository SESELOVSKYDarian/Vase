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

/** Recibe el formulario de contacto: valida los datos y se la pasa a la app. Avisa si hubo demasiados intentos seguidos. */
export async function submitContactInquiry(
  _: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const parsed = contactInquirySchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
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
