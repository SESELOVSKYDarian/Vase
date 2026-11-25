"use server";

// Disponibilidad, estado y cambio de clave de un usuario.
import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { sanitizeNullableText } from "@/lib/security/sanitize";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState } from "./shared";

export type AdminPasswordResetActionState = AdminGovernanceActionState & {
  generatedPassword?: string;
};
