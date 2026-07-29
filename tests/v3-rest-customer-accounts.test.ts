import { describe, expect, it, vi } from "vitest";
import { createCustomerAccountService } from "../apps/vase-rest/app/lib/accounts/customer-account-service";

function repository() {
  return {
    findReceipt: vi.fn(async () => null),
    getAccount: vi.fn(async () => ({
      id: "account_1",
      globalTenantId: "tenant_1",
      status: "ACTIVE",
      balance: "500.00",
      creditLimit: "2000.00",
    })),
    getMovement: vi.fn(async () => ({
      id: "movement_1",
      accountId: "account_1",
      amount: "250.00",
      reversed: false,
    })),
    append: vi.fn(async (value) => value),
  };
}

describe("Rest customer accounts", () => {
  it("records charges and payments as signed append-only movements", async () => {
    const repo = repository();
    const service = createCustomerAccountService(repo);
    await service.charge({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      accountId: "account_1",
      amount: "300.00",
      reason: "Orden 123",
      commandId: "charge_1",
      actorId: "cashier_1",
    });
    await service.payment({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      accountId: "account_1",
      amount: "100.00",
      reason: "Cobro",
      commandId: "payment_1",
      actorId: "cashier_1",
    });
    expect(repo.append).toHaveBeenNthCalledWith(1, expect.objectContaining({
      type: "CHARGE",
      signedAmount: "300.00",
    }));
    expect(repo.append).toHaveBeenNthCalledWith(2, expect.objectContaining({
      type: "PAYMENT",
      signedAmount: "-100.00",
    }));
  });

  it("creates one opposite movement when reversing and rejects a second reversal", async () => {
    const repo = repository();
    const service = createCustomerAccountService(repo);
    await service.reverse({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      accountId: "account_1",
      movementId: "movement_1",
      reason: "Error de carga",
      commandId: "reverse_1",
      actorId: "manager_1",
    });
    expect(repo.append).toHaveBeenCalledWith(expect.objectContaining({
      type: "REVERSAL",
      signedAmount: "-250.00",
      reversalOfId: "movement_1",
    }));
    repo.getMovement.mockResolvedValueOnce({
      id: "movement_1",
      accountId: "account_1",
      amount: "250.00",
      reversed: true,
    });
    await expect(service.reverse({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      accountId: "account_1",
      movementId: "movement_1",
      reason: "Otra vez",
      commandId: "reverse_2",
      actorId: "manager_1",
    })).rejects.toThrow("REST_ACCOUNT_MOVEMENT_ALREADY_REVERSED");
  });

  it("enforces the configured credit limit before a new charge", async () => {
    const repo = repository();
    repo.getAccount.mockResolvedValueOnce({
      id: "account_1",
      globalTenantId: "tenant_1",
      status: "ACTIVE",
      balance: "1900.00",
      creditLimit: "2000.00",
    });
    await expect(createCustomerAccountService(repo).charge({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      accountId: "account_1",
      amount: "150.00",
      reason: "Orden",
      commandId: "charge_limit",
      actorId: "cashier_1",
    })).rejects.toThrow("REST_ACCOUNT_CREDIT_LIMIT_EXCEEDED");
  });
});
