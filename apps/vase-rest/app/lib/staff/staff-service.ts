import { hash } from "bcryptjs";
import { restStaffRoleSchema, type RestServiceStatus, type RestStaffRole } from "@vase/contracts";
import { z } from "zod";

const roleSchema = z.object({
  branchId: z.string().min(1),
  role: restStaffRoleSchema,
}).strict();
const createSchema = z.object({
  employeeCode: z.string().trim().min(2).max(20)
    .transform((value) => value.toUpperCase()),
  displayName: z.string().trim().min(2).max(100),
  pin: z.string().regex(/^\d{4,8}$/),
  roles: z.array(roleSchema).min(1),
}).strict();
const updateSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  active: z.boolean().optional(),
  pin: z.string().regex(/^\d{4,8}$/).optional(),
  roles: z.array(roleSchema).min(1).optional(),
}).strict();

type RoleAssignment = { branchId: string; role: RestStaffRole };
export type PublicStaff = {
  id: string;
  employeeCode: string;
  displayName: string;
  active: boolean;
  roles: RoleAssignment[];
};
type StaffContext = {
  globalTenantId: string;
  employeeLimit: number;
  status: RestServiceStatus | string;
  actorId: string;
};

export interface StaffRepository {
  countActive(globalTenantId: string): Promise<number>;
  employeeCodeExists(globalTenantId: string, employeeCode: string): Promise<boolean>;
  create(input: {
    globalTenantId: string;
    employeeCode: string;
    displayName: string;
    pinHash: string;
    roles: RoleAssignment[];
    actorId: string;
  }): Promise<PublicStaff>;
  update(globalTenantId: string, staffId: string, input: {
    displayName?: string;
    active?: boolean;
    pinHash?: string;
    roles?: RoleAssignment[];
    actorId: string;
  }): Promise<PublicStaff | null>;
  revokeSessions(globalTenantId: string, staffId: string): Promise<unknown>;
}

function assertActive(context: StaffContext) {
  if (!["ACTIVE", "TRIAL"].includes(context.status)) {
    throw new Error("REST_CONTRACT_INACTIVE");
  }
}

export function createStaffService(repository: StaffRepository) {
  return {
    async create(context: StaffContext, raw: unknown): Promise<PublicStaff> {
      assertActive(context);
      const input = createSchema.parse(raw);
      if (await repository.employeeCodeExists(context.globalTenantId, input.employeeCode)) {
        throw new Error("REST_EMPLOYEE_CODE_DUPLICATE");
      }
      if (await repository.countActive(context.globalTenantId) >= context.employeeLimit) {
        throw new Error("REST_EMPLOYEE_LIMIT_REACHED");
      }
      return repository.create({
        globalTenantId: context.globalTenantId,
        employeeCode: input.employeeCode,
        displayName: input.displayName,
        pinHash: await hash(input.pin, 12),
        roles: input.roles,
        actorId: context.actorId,
      });
    },
    async update(context: StaffContext, staffId: string, raw: unknown): Promise<PublicStaff> {
      assertActive(context);
      const input = updateSchema.parse(raw);
      const result = await repository.update(context.globalTenantId, staffId, {
        displayName: input.displayName,
        active: input.active,
        pinHash: input.pin ? await hash(input.pin, 12) : undefined,
        roles: input.roles,
        actorId: context.actorId,
      });
      if (!result) throw new Error("REST_EMPLOYEE_NOT_FOUND");
      if (input.active === false || input.pin) {
        await repository.revokeSessions(context.globalTenantId, staffId);
      }
      return result;
    },
  };
}
