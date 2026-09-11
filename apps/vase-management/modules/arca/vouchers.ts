import type { ArcaVoucherType } from "./types";

export type ArcaVoucherOperation = "FACTURA" | "NOTA_DEBITO" | "NOTA_CREDITO";
export type ArcaVoucherDefinition = { key: ArcaVoucherType; code: number; label: string; group: "A" | "B" | "C" | "M" | "FCE MiPyME"; operation: ArcaVoucherOperation; testEnabled: boolean; disabledReason?: string };

/** Catálogo de respaldo. El endpoint lo enriquece con WSFEv1 cuando ARCA responde. */
export const ARCA_VOUCHER_TYPES: ArcaVoucherDefinition[] = [
  { key: "FACTURA_A", code: 1, label: "Factura A", group: "A", operation: "FACTURA", testEnabled: true },
  { key: "NOTA_DEBITO_A", code: 2, label: "Nota de débito A", group: "A", operation: "NOTA_DEBITO", testEnabled: true },
  { key: "NOTA_CREDITO_A", code: 3, label: "Nota de crédito A", group: "A", operation: "NOTA_CREDITO", testEnabled: true },
  { key: "FACTURA_B", code: 6, label: "Factura B", group: "B", operation: "FACTURA", testEnabled: true },
  { key: "NOTA_DEBITO_B", code: 7, label: "Nota de débito B", group: "B", operation: "NOTA_DEBITO", testEnabled: true },
  { key: "NOTA_CREDITO_B", code: 8, label: "Nota de crédito B", group: "B", operation: "NOTA_CREDITO", testEnabled: true },
  { key: "FACTURA_C", code: 11, label: "Factura C", group: "C", operation: "FACTURA", testEnabled: true },
  { key: "NOTA_DEBITO_C", code: 12, label: "Nota de débito C", group: "C", operation: "NOTA_DEBITO", testEnabled: true },
  { key: "NOTA_CREDITO_C", code: 13, label: "Nota de crédito C", group: "C", operation: "NOTA_CREDITO", testEnabled: true },
  { key: "FACTURA_M", code: 51, label: "Factura M", group: "M", operation: "FACTURA", testEnabled: true },
  { key: "NOTA_DEBITO_M", code: 52, label: "Nota de débito M", group: "M", operation: "NOTA_DEBITO", testEnabled: true },
  { key: "NOTA_CREDITO_M", code: 53, label: "Nota de crédito M", group: "M", operation: "NOTA_CREDITO", testEnabled: true },
  { key: "FCE_FACTURA_A", code: 201, label: "Factura de Crédito Electrónica MiPyME A", group: "FCE MiPyME", operation: "FACTURA", testEnabled: false, disabledReason: "Requiere implementación FCE MiPyME específica." },
  { key: "FCE_NOTA_DEBITO_A", code: 202, label: "Nota de débito electrónica MiPyME A", group: "FCE MiPyME", operation: "NOTA_DEBITO", testEnabled: false, disabledReason: "Requiere implementación FCE MiPyME específica." },
  { key: "FCE_NOTA_CREDITO_A", code: 203, label: "Nota de crédito electrónica MiPyME A", group: "FCE MiPyME", operation: "NOTA_CREDITO", testEnabled: false, disabledReason: "Requiere implementación FCE MiPyME específica." },
  { key: "FCE_FACTURA_B", code: 206, label: "Factura de Crédito Electrónica MiPyME B", group: "FCE MiPyME", operation: "FACTURA", testEnabled: false, disabledReason: "Requiere implementación FCE MiPyME específica." },
  { key: "FCE_NOTA_DEBITO_B", code: 207, label: "Nota de débito electrónica MiPyME B", group: "FCE MiPyME", operation: "NOTA_DEBITO", testEnabled: false, disabledReason: "Requiere implementación FCE MiPyME específica." },
  { key: "FCE_NOTA_CREDITO_B", code: 208, label: "Nota de crédito electrónica MiPyME B", group: "FCE MiPyME", operation: "NOTA_CREDITO", testEnabled: false, disabledReason: "Requiere implementación FCE MiPyME específica." },
  { key: "FCE_FACTURA_C", code: 211, label: "Factura de Crédito Electrónica MiPyME C", group: "FCE MiPyME", operation: "FACTURA", testEnabled: false, disabledReason: "Requiere implementación FCE MiPyME específica." },
  { key: "FCE_NOTA_DEBITO_C", code: 212, label: "Nota de débito electrónica MiPyME C", group: "FCE MiPyME", operation: "NOTA_DEBITO", testEnabled: false, disabledReason: "Requiere implementación FCE MiPyME específica." },
  { key: "FCE_NOTA_CREDITO_C", code: 213, label: "Nota de crédito electrónica MiPyME C", group: "FCE MiPyME", operation: "NOTA_CREDITO", testEnabled: false, disabledReason: "Requiere implementación FCE MiPyME específica." },
];
export const ARCA_VOUCHER_CODE_BY_KEY = Object.fromEntries(ARCA_VOUCHER_TYPES.map((v) => [v.key, v.code])) as Record<ArcaVoucherType, number>;
export const getArcaVoucher = (key: ArcaVoucherType) => ARCA_VOUCHER_TYPES.find((voucher) => voucher.key === key);
export const requiresAssociatedVoucher = (key: ArcaVoucherType) => getArcaVoucher(key)?.operation !== "FACTURA";
export const ARCA_DOCUMENT_TYPES = [{ key: "CUIT", code: 80, label: "CUIT" }, { key: "CUIL", code: 86, label: "CUIL" }, { key: "DNI", code: 96, label: "DNI" }, { key: "CONSUMIDOR_FINAL", code: 99, label: "Consumidor final" }];
export const ARCA_IVA_TYPES = [{ code: 5, label: "IVA 21 %" }];

