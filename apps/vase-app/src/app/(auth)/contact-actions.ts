"use server";

import { contactInquirySchema } from "@/lib/validators/contact";
import { sanitizeText } from "@/lib/security/sanitize";
import { getRequestContext } from "@/lib/security/request";
import { deliverPortalContactInquiry } from "@/server/services/portal-content";

export type ContactActionState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function validationErrorState(error: Record<string, string[]>) {
  return {
    error: "Revisa los campos marcados y vuelve a intentar.",
    fieldErrors: error,
  } satisfies ContactActionState;
}

export async function submitContactInquiry(
  _: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const requestContext = await getRequestContext();
  const rawData = {
    fullName: sanitizeText(String(formData.get("fullName") ?? "")),
    email: String(formData.get("email") ?? ""),
    message: sanitizeText(String(formData.get("message") ?? "")),
  };

  const parsed = contactInquirySchema.safeParse(rawData);

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  try {
    await deliverPortalContactInquiry(parsed.data, {
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      return {
        error:
          "Recibimos muchas consultas seguidas desde este origen. Intenta nuevamente en unos minutos.",
      };
    }

    if (
      error instanceof Error &&
      error.message === "CONTACT_EMAIL_NOT_CONFIGURED"
    ) {
      return {
        error:
          "El canal de contacto no esta configurado todavia. Revisa las variables de entorno.",
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
