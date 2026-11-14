// Parte de actions.ts: CustomProjectMeetingTypeInput, customProjectMeetingTypes, defaultProjectProcessTypes, ensureProjectCreatedFromAcceptedQuote, validationErrorState.
import { Prisma } from "@prisma/client";
import { type AuthActionState } from "@/app/(auth)/actions";

export type CustomProjectMeetingTypeInput =
  | "DEFINITION"
  | "DESIGN"
  | "MID_DEVELOPMENT"
  | "FINAL_DELIVERY"
  | "FOLLOW_UP";

export const customProjectMeetingTypes = new Set<CustomProjectMeetingTypeInput>([
  "DEFINITION",
  "DESIGN",
  "MID_DEVELOPMENT",
  "FINAL_DELIVERY",
  "FOLLOW_UP",
]);

export const defaultProjectProcessTypes = [
  "DISCOVERY",
  "DESIGN",
  "FRONTEND",
  "BACKEND",
  "INTEGRATIONS",
  "TESTING",
  "DEPLOYMENT",
] as const;

export async function ensureProjectCreatedFromAcceptedQuote(params: {
  tx: Prisma.TransactionClient;
  tenantId: string;
  customPageRequestId: string;
  actorUserId: string;
  moduleId?: string | null;
  submoduleId?: string | null;
  projectNameSeed?: string | null;
}) {
  const slug = `custom-${params.customPageRequestId.slice(-10).toLowerCase()}`;
  const projectName =
    params.projectNameSeed?.trim() || `Proyecto personalizado ${params.customPageRequestId.slice(-6)}`;

  const existing = await params.tx.project.findUnique({
    where: {
      tenantId_slug: {
        tenantId: params.tenantId,
        slug,
      },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await params.tx.project.create({
    data: {
      tenantId: params.tenantId,
      name: projectName,
      slug,
      status: "DISCOVERY",
      moduleId: params.moduleId ?? null,
      submoduleId: params.submoduleId ?? null,
      description: "Proyecto generado automaticamente al aceptar presupuesto.",
      createdById: params.actorUserId,
    },
    select: { id: true },
  });

  await params.tx.projectProcess.createMany({
    data: defaultProjectProcessTypes.map((processType) => ({
      projectId: created.id,
      processType,
      status: processType === "DISCOVERY" ? "IN_PROGRESS" : "PENDING",
      progressPercent: processType === "DISCOVERY" ? 5 : 0,
    })),
  });

  return created.id;
}

export function validationErrorState(error: Record<string, string[]>) {
  return {
    error: "Revisa los campos marcados y vuelve a intentar.",
    fieldErrors: error,
  } satisfies AuthActionState;
}
