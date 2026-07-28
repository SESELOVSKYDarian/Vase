const voucherTypes: Record<string, number> = {
  INVOICE_A: 1,
  DEBIT_NOTE_A: 2,
  CREDIT_NOTE_A: 3,
  INVOICE_B: 6,
  DEBIT_NOTE_B: 7,
  CREDIT_NOTE_B: 8,
  INVOICE_C: 11,
  DEBIT_NOTE_C: 12,
  CREDIT_NOTE_C: 13,
};

const vatRateIds: Record<string, number> = {
  "0.00": 3,
  "10.50": 4,
  "21.00": 5,
  "27.00": 6,
  "5.00": 8,
  "2.50": 9,
};

export function arcaVoucherType(documentType: string) {
  const value = voucherTypes[documentType];
  if (!value) throw new Error("REST_ARCA_DOCUMENT_TYPE_INVALID");
  return value;
}

export function arcaVatRateId(rate: string) {
  const normalized = Number(rate).toFixed(2);
  const value = vatRateIds[normalized];
  if (!value) throw new Error("REST_ARCA_VAT_RATE_UNSUPPORTED");
  return value;
}

export function arcaDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}${part("month")}${part("day")}`;
}

export function parseArcaDate(value: string) {
  if (!/^\d{8}$/.test(value)) throw new Error("REST_ARCA_DATE_INVALID");
  const result = new Date(
    `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T23:59:59-03:00`,
  );
  if (Number.isNaN(result.getTime())) throw new Error("REST_ARCA_DATE_INVALID");
  return result;
}

export function fiscalQrPayload(input: {
  date: string;
  cuit: string;
  pointOfSale: number;
  voucherType: number;
  voucherNumber: number;
  total: string;
  currency: string;
  currencyRate: string;
  recipientDocType: number;
  recipientDocNumber: string;
  cae: string;
}) {
  return {
    ver: 1,
    fecha: `${input.date.slice(0, 4)}-${input.date.slice(4, 6)}-${input.date.slice(6, 8)}`,
    cuit: Number(input.cuit),
    ptoVta: input.pointOfSale,
    tipoCmp: input.voucherType,
    nroCmp: input.voucherNumber,
    importe: Number(input.total),
    moneda: input.currency,
    ctz: Number(input.currencyRate),
    tipoDocRec: input.recipientDocType,
    nroDocRec: Number(input.recipientDocNumber),
    tipoCodAut: "E",
    codAut: Number(input.cae),
  };
}

export function fiscalQrUrl(payload: Record<string, unknown>) {
  return `https://www.afip.gob.ar/fe/qr/?p=${
    Buffer.from(JSON.stringify(payload)).toString("base64")
  }`;
}
