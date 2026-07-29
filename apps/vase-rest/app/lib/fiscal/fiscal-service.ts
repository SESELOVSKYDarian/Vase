import { z } from "zod";
import type { ArcaAuthorizationResult, ArcaCredentials } from "./arca-types";

type PreparedFiscalDocument = {
  documentId: string;
  connectionId: string;
  pointOfSale: number;
  voucherType: number;
  request: Record<string, unknown>;
};

type FiscalRepository = {
  findReceipt(globalTenantId: string, commandId: string): Promise<unknown | null>;
  prepare(input: Record<string, unknown>): Promise<PreparedFiscalDocument>;
  credentials(prepared: PreparedFiscalDocument): Promise<ArcaCredentials>;
  lastAuthorized(prepared: PreparedFiscalDocument, credentials: ArcaCredentials): Promise<number>;
  authorize(
    prepared: PreparedFiscalDocument,
    credentials: ArcaCredentials,
    voucherNumber: number,
  ): Promise<ArcaAuthorizationResult>;
  consult(
    prepared: PreparedFiscalDocument,
    voucherNumber: number,
    credentials?: ArcaCredentials,
  ): Promise<ArcaAuthorizationResult | null>;
  save(value: Record<string, unknown>): Promise<unknown>;
  withSequenceLock<T>(
    prepared: PreparedFiscalDocument,
    operation: () => Promise<T>,
  ): Promise<T>;
};

export function createFiscalService(repository: FiscalRepository) {
  return {
    async issue(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1),
        branchId: z.string().min(1),
        orderId: z.string().min(1),
        documentType: z.enum([
          "INVOICE_A", "INVOICE_B", "INVOICE_C",
          "CREDIT_NOTE_A", "CREDIT_NOTE_B", "CREDIT_NOTE_C",
          "DEBIT_NOTE_A", "DEBIT_NOTE_B", "DEBIT_NOTE_C",
        ]),
        commandId: z.string().min(1),
        actorId: z.string().min(1),
        recipientDocType: z.number().int().positive(),
        recipientDocNumber: z.string().regex(/^\d{1,11}$/),
      }).strict().parse(raw);
      const receipt = await repository.findReceipt(input.globalTenantId, input.commandId);
      if (receipt) return receipt;
      const prepared = await repository.prepare(input);
      return repository.withSequenceLock(prepared, async () => {
        const credentials = await repository.credentials(prepared);
        const voucherNumber = await repository.lastAuthorized(prepared, credentials) + 1;
        let authorization: ArcaAuthorizationResult | null;
        try {
          authorization = await repository.authorize(
            prepared,
            credentials,
            voucherNumber,
          );
        } catch (error) {
          if (!(error instanceof Error) ||
            error.message !== "REST_ARCA_RESPONSE_AMBIGUOUS") throw error;
          authorization = await repository.consult(
            prepared,
            voucherNumber,
            credentials,
          );
          if (!authorization) throw error;
        }
        const status = authorization.result === "A" && authorization.cae
          ? "AUTHORIZED" : "REJECTED";
        return repository.save({
          ...input,
          documentId: prepared.documentId,
          voucherNumber,
          status,
          ...(authorization.cae ? {
            cae: authorization.cae,
            caeExpiresAt: authorization.caeExpiresAt,
          } : {}),
          observations: authorization.observations ?? [],
        });
      });
    },
  };
}
