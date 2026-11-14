"use server";

// Alta, edición y baja de usuarios con todos sus accesos.
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeText } from "@/lib/security/sanitize";
import { deleteMasterUserSchema, upsertMasterUserSchema } from "@/lib/validators/admin";
import { createAuditLog, emitAuditLogEvent, persistAuditLog } from "@/server/services/audit-log";
import { ensureModuleCatalogSynced } from "@/server/services/modules";
import { buildAdminCreatedUserVerification, getRoleMappingFromUiRole, shouldForceAdminCreatedUserPasswordReset } from "@/lib/admin/user-access";
import { buildClientProductAccessAuditChange, parseStoredClientProductAccess } from "@/lib/admin/client-product-access";
import { adaptLegacyClientProductAccessWithTx, applyClientProductAccess, lockClientOwnerWithTx } from "@/server/services/client-product-access";
import { AdminGovernanceActionState, generateTemporaryPassword } from "./shared";
import { parseClientAccessPayload, parseModuleIds } from "./access-sync";

export async function upsertMasterUserWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.USERS);
    await ensureModuleCatalogSynced();

    const parsed = upsertMasterUserSchema.safeParse({
      userId: String(formData.get("userId") ?? "").trim(),
      name: sanitizeText(String(formData.get("name") ?? "")),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      autoGeneratePassword: formData.get("autoGeneratePassword") === "true",
      temporaryPassword: formData.get("temporaryPassword") === "true",
      uiRole: String(formData.get("uiRole") ?? "").trim(),
      moduleIds: parseModuleIds(formData.get("moduleIds")),
      clientAccessConfig: String(formData.get("clientAccessConfig") ?? ""),
    });

    if (!parsed.success) {
      return { error: "Revisa nombre, email, rol y modulos." };
    }

    const roleMap = getRoleMappingFromUiRole(parsed.data.uiRole);
    const createFlow = !parsed.data.userId;
    const generatedPassword = createFlow && parsed.data.autoGeneratePassword ? generateTemporaryPassword() : null;
    const rawPassword = (parsed.data.password || generatedPassword || "").trim();

    if (createFlow && !rawPassword) {
      return { error: "Define una contrasena o usa generacion automatica." };
    }

    if (rawPassword.length > 0 && (rawPassword.length < 8 || rawPassword.length > 72)) {
      return { error: "La contrasena debe tener entre 8 y 72 caracteres." };
    }

    const passwordHash = rawPassword ? await hashPassword(rawPassword) : null;
    const shouldForcePasswordReset = shouldForceAdminCreatedUserPasswordReset({
      temporaryPassword: parsed.data.temporaryPassword,
      rawPassword,
    });
    const requestedModuleIds = parsed.data.moduleIds;
    const moduleIds = roleMap.appRole === "ADMIN" || parsed.data.uiRole === "cliente" ? [] : requestedModuleIds;
    const rawClientAccessPayload = String(formData.get("clientAccessConfig") ?? "").trim();
    const clientAccessPayload = parsed.data.uiRole === "cliente" && rawClientAccessPayload
      ? parseClientAccessPayload(rawClientAccessPayload)
      : null;

    if (parsed.data.uiRole === "cliente" && ((rawClientAccessPayload && !clientAccessPayload) || (createFlow && !clientAccessPayload))) {
      return { error: "La configuracion de productos del cliente no es valida." };
    }

    const selectedModules = moduleIds.length
      ? await prisma.module.findMany({
          where: { id: { in: moduleIds }, isActive: true },
          select: { id: true },
        })
      : [];

    if (moduleIds.length !== selectedModules.length) {
      return { error: "Uno o mas modulos seleccionados no son validos." };
    }

    const result = await prisma.$transaction(async (tx) => {
      if (!createFlow && clientAccessPayload && parsed.data.userId) {
        await lockClientOwnerWithTx(tx, parsed.data.userId);
      }
      const roleRecord = await tx.role.upsert({
        where: { key: roleMap.appRole },
        update: {
          name: roleMap.appRole,
          isSystem: true,
        },
        create: {
          key: roleMap.appRole,
          name: roleMap.appRole,
          isSystem: true,
        },
        select: { id: true },
      });

      const existingByEmail = await tx.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true },
      });
      const existingTargetUser = parsed.data.userId
        ? await tx.user.findUnique({
            where: { id: parsed.data.userId },
            select: {
              clientAccessConfig: true,
              primaryOwnedTenant: { select: { id: true } },
              memberships: {
                select: {
                  role: true,
                  tenant: { select: { primaryOwnerUserId: true } },
                },
              },
            },
          })
        : null;
      if (!createFlow && clientAccessPayload && existingTargetUser) {
        const legacyOwnerMemberships = existingTargetUser.memberships.filter((membership) =>
          membership.role === "OWNER" && membership.tenant.primaryOwnerUserId == null);
        const isExistingOwner = Boolean(existingTargetUser.primaryOwnedTenant) || legacyOwnerMemberships.length === 1;
        if (!isExistingOwner) throw new Error("CLIENT_TEAM_MEMBER_OWNER_PROVISIONING_FORBIDDEN");
      }
      const storedClientProductAccess = parseStoredClientProductAccess(existingTargetUser?.clientAccessConfig);

      const resolveClientProductAccess = async (ownerUserId: string) => {
        if (!clientAccessPayload) return null;
        if (clientAccessPayload.kind === "v2") return clientAccessPayload.access;
        return adaptLegacyClientProductAccessWithTx({
          tx,
          ownerUserId,
          moduleIds: requestedModuleIds,
          rawConfig: clientAccessPayload.rawConfig,
          storedAccess: storedClientProductAccess,
        });
      };

      if (createFlow) {
        if (existingByEmail) throw new Error("EMAIL_ALREADY_EXISTS");

        const now = new Date();
        const createdUser = await tx.user.create({
          data: {
            name: parsed.data.name,
            email: parsed.data.email,
            passwordHash: passwordHash ?? undefined,
            platformRole: roleMap.platformRole,
            locale: "es",
            clientAccessConfig: clientAccessPayload?.kind === "v2"
              ? ({ version: 2, productAccess: clientAccessPayload.access } as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            ...buildAdminCreatedUserVerification(now),
            forcePasswordChange: shouldForcePasswordReset,
            tempPasswordIssuedAt: shouldForcePasswordReset ? now : null,
            ...(parsed.data.uiRole === "soporte" || parsed.data.uiRole === "developer"
              ? {
                  internalProfile: {
                    create: {
                      type: parsed.data.uiRole === "soporte" ? "SUPPORT" : "DEVELOPER",
                      tempPasswordActive: shouldForcePasswordReset,
                      mustResetPassword: shouldForcePasswordReset,
                      tempPasswordExpiresAt: shouldForcePasswordReset
                        ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
                        : null,
                      availability: "OFFLINE",
                    },
                  },
                }
              : {}),
          },
          select: { id: true, email: true, name: true },
        });

        await tx.userRole.deleteMany({ where: { userId: createdUser.id } });
        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            roleId: roleRecord.id,
          },
        });

        if (selectedModules.length > 0) {
          await tx.userModuleAccess.createMany({
            data: selectedModules.map((module) => ({
              userId: createdUser.id,
              moduleId: module.id,
              isActive: true,
            })),
            skipDuplicates: true,
          });
        }

        const resolvedClientProductAccess = await resolveClientProductAccess(createdUser.id);
        if (resolvedClientProductAccess && clientAccessPayload?.kind === "legacy") {
          await tx.user.update({
            where: { id: createdUser.id },
            data: {
              clientAccessConfig: {
                version: 2,
                productAccess: resolvedClientProductAccess,
              } as Prisma.InputJsonValue,
            },
          });
        }
        const productAccessResult = resolvedClientProductAccess
          ? await applyClientProductAccess({
            tx,
            actorUserId: adminSession.user.id,
            ownerUserId: createdUser.id,
            ownerName: createdUser.name,
            ownerEmail: createdUser.email,
            access: resolvedClientProductAccess,
            businessFeatureMode: clientAccessPayload?.kind === "legacy" ? "PRESERVE" : "REPLACE",
            tenantSlugSeed: createdUser.name || createdUser.email.split("@")[0],
          })
          : null;
        const auditPayload = {
          action: "platform.master_user_created",
          targetType: "user",
          targetId: createdUser.id,
          actorUserId: adminSession.user.id,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          metadata: {
            uiRole: parsed.data.uiRole,
            moduleIds: productAccessResult?.activeModuleIds ?? moduleIds,
            clientProductAccessChange: buildClientProductAccessAuditChange(
              null,
              resolvedClientProductAccess,
            ),
          },
        };
        await persistAuditLog(tx, auditPayload);
        return { userId: createdUser.id, created: true as const, auditPayload };
      }

      if (existingByEmail && existingByEmail.id !== parsed.data.userId) {
        throw new Error("EMAIL_ALREADY_EXISTS");
      }

      if (!parsed.data.userId) throw new Error("CLIENT_USER_ID_REQUIRED");
      const resolvedClientProductAccess = await resolveClientProductAccess(parsed.data.userId);

      const updatedUser = await tx.user.update({
        where: { id: parsed.data.userId },
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          platformRole: roleMap.platformRole,
          ...(parsed.data.uiRole === "cliente"
            ? resolvedClientProductAccess
              ? { clientAccessConfig: { version: 2, productAccess: resolvedClientProductAccess } as Prisma.InputJsonValue }
              : {}
            : { clientAccessConfig: Prisma.JsonNull }),
          ...(!parsed.data.temporaryPassword
            ? {
                forcePasswordChange: false,
                tempPasswordIssuedAt: null,
              }
            : {}),
          ...(passwordHash
            ? {
                passwordHash,
                forcePasswordChange: shouldForcePasswordReset,
                tempPasswordIssuedAt: shouldForcePasswordReset ? new Date() : null,
                passwordChangedAt: new Date(),
              }
            : {}),
        },
        select: { id: true, email: true, name: true },
      });

      await tx.userRole.deleteMany({ where: { userId: updatedUser.id } });
      await tx.userRole.create({
        data: {
          userId: updatedUser.id,
          roleId: roleRecord.id,
        },
      });

      if (!resolvedClientProductAccess && parsed.data.uiRole !== "cliente") {
        await tx.userModuleAccess.deleteMany({ where: { userId: updatedUser.id } });
        if (selectedModules.length > 0) {
          await tx.userModuleAccess.createMany({
            data: selectedModules.map((module) => ({
              userId: updatedUser.id,
              moduleId: module.id,
              isActive: true,
            })),
            skipDuplicates: true,
          });
        }
      }

      const productAccessResult = resolvedClientProductAccess
        ? await applyClientProductAccess({
          tx,
          actorUserId: adminSession.user.id,
          ownerUserId: updatedUser.id,
          ownerName: updatedUser.name,
          ownerEmail: updatedUser.email,
          access: resolvedClientProductAccess,
          businessFeatureMode: clientAccessPayload?.kind === "legacy" ? "PRESERVE" : "REPLACE",
          tenantSlugSeed: updatedUser.name || updatedUser.email.split("@")[0],
        })
        : null;

      if (parsed.data.uiRole === "soporte" || parsed.data.uiRole === "developer") {
        await tx.internalUserProfile.upsert({
          where: { userId: updatedUser.id },
          update: {
            type: parsed.data.uiRole === "soporte" ? "SUPPORT" : "DEVELOPER",
            tempPasswordActive: passwordHash || !parsed.data.temporaryPassword ? shouldForcePasswordReset : undefined,
            mustResetPassword: passwordHash || !parsed.data.temporaryPassword ? shouldForcePasswordReset : undefined,
            tempPasswordExpiresAt: shouldForcePasswordReset
              ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
              : !parsed.data.temporaryPassword
                ? null
                : undefined,
          },
          create: {
            userId: updatedUser.id,
            tenantId: null,
            type: parsed.data.uiRole === "soporte" ? "SUPPORT" : "DEVELOPER",
            tempPasswordActive: shouldForcePasswordReset,
            mustResetPassword: shouldForcePasswordReset,
            tempPasswordExpiresAt: shouldForcePasswordReset
              ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
              : null,
            availability: "OFFLINE",
          },
        });
      } else {
        await tx.internalUserProfile.deleteMany({ where: { userId: updatedUser.id } });
      }

      const auditPayload = {
        action: "platform.master_user_updated",
        targetType: "user",
        targetId: updatedUser.id,
        actorUserId: adminSession.user.id,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: {
          uiRole: parsed.data.uiRole,
          moduleIds: productAccessResult?.activeModuleIds ?? moduleIds,
          clientProductAccessChange: buildClientProductAccessAuditChange(
            storedClientProductAccess,
            resolvedClientProductAccess,
          ),
        },
      };
      await persistAuditLog(tx, auditPayload);
      return { userId: updatedUser.id, created: false as const, auditPayload };
    });

    emitAuditLogEvent(result.auditPayload);

    revalidatePath("/app/admin/users");
    return { success: result.created ? "Usuario creado." : "Usuario actualizado." };
  } catch (error) {
    if (error instanceof Error && error.message === "ROLE_NOT_FOUND") {
      return { error: "No encontramos el rol seleccionado en el sistema." };
    }
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return { error: "Ya existe un usuario con ese email." };
    }
    if (error instanceof Error && error.message === "REST_PRICING_NOT_PUBLISHED") {
      return { error: "El precio de Vase Rest seleccionado no esta publicado." };
    }
    if (error instanceof Error && error.message === "CLIENT_LEGACY_REST_PLAN_REQUIRED") {
      return { error: "Para activar Vase Rest, elegí un plan Rest publicado." };
    }
    if (error instanceof Error && error.message === "CLIENT_LABS_PLAN_INVALID") {
      return { error: "El plan de Vase Labs no coincide con el submodulo seleccionado." };
    }
    if (error instanceof Error && error.message === "CLIENT_BUSINESS_SUBMODULE_INVALID") {
      return { error: "Uno de los submodulos de Vase Business no es valido." };
    }
    if (error instanceof Error && (error.message === "CLIENT_FEATURE_SCOPE_INVALID" || error.message === "CLIENT_FEATURE_VALUE_INVALID")) {
      return { error: "Una caracteristica de Vase Business no pertenece al alcance indicado o tiene un valor invalido." };
    }
    if (error instanceof Error && error.message === "CLIENT_MODULE_CATALOG_INVALID") {
      return { error: "Uno de los productos seleccionados no esta disponible." };
    }
    if (error instanceof Error && error.message === "CLIENT_TEAM_MEMBER_OWNER_PROVISIONING_FORBIDDEN") {
      return { error: "Los accesos comerciales se gestionan desde el Owner de la cuenta." };
    }
    return { error: "No pudimos guardar el usuario." };
  }
}

export async function deleteMasterUserWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.USERS);
    const parsed = deleteMasterUserSchema.safeParse({
      userId: formData.get("userId"),
    });
    if (!parsed.success) return { error: "Usuario invalido para eliminar." };
    if (parsed.data.userId === adminSession.user.id) return { error: "No puedes eliminar tu propia cuenta." };

    await prisma.$transaction(async (tx) => {
      await tx.userModuleAccess.deleteMany({ where: { userId: parsed.data.userId } });
      await tx.userRole.deleteMany({ where: { userId: parsed.data.userId } });
      await tx.adminAccessPolicy.deleteMany({ where: { userId: parsed.data.userId } });
      await tx.internalUserProfile.deleteMany({ where: { userId: parsed.data.userId } });
      await tx.membership.deleteMany({ where: { userId: parsed.data.userId } });
      await tx.session.deleteMany({ where: { userId: parsed.data.userId } });
      await tx.user.delete({ where: { id: parsed.data.userId } });
    });

    await createAuditLog({
      action: "platform.master_user_deleted",
      targetType: "user",
      targetId: parsed.data.userId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/admin/users");
    return { success: "Usuario eliminado definitivamente." };
  } catch {
    return { error: "No pudimos eliminar el usuario." };
  }
}
