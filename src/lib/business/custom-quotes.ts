export const quoteTemplateKeys = [
  "STANDARD",
  "PREMIUM_BRAND",
  "INTEGRATION_HEAVY",
] as const;

export type QuoteTemplateKey = (typeof quoteTemplateKeys)[number];

export type QuoteLineDraft = {
  lineType: "BASE_TEMPLATE" | "FEATURE" | "DESIGN" | "INTEGRATION" | "SERVICE";
  label: string;
  description?: string;
  quantity?: number;
  amountUnits: number;
  sortOrder: number;
};

export function getQuoteTemplateLabel(templateKey: string) {
  switch (templateKey) {
    case "PREMIUM_BRAND":
      return "Premium Brand";
    case "INTEGRATION_HEAVY":
      return "Integration Heavy";
    default:
      return "Standard";
  }
}

export function getQuoteStatusLabel(status: string) {
  switch (status) {
    case "PENDING_CLIENT":
      return "Pendiente de cliente";
    case "ACCEPTED":
      return "Aceptado";
    case "REJECTED":
      return "Rechazado";
    case "EXPIRED":
      return "Vencido";
    default:
      return "Borrador";
  }
}

export function getQuoteStatusTone(status: string) {
  switch (status) {
    case "ACCEPTED":
      return "success" as const;
    case "REJECTED":
    case "EXPIRED":
      return "danger" as const;
    case "PENDING_CLIENT":
      return "premium" as const;
    default:
      return "info" as const;
  }
}

export function formatMoneyFromCents(amountCents: number, currency: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function amountUnitsToCents(amountUnits: number) {
  return Math.max(0, Math.trunc(amountUnits)) * 100;
}

export function buildQuoteLineItems(input: {
  baseTemplateAmountUnits: number;
  featureExtraAmountUnits: number;
  designExtraAmountUnits: number;
  integrationExtraAmountUnits: number;
  serviceExtraAmountUnits: number;
}) {
  const lines: QuoteLineDraft[] = [
    {
      lineType: "BASE_TEMPLATE",
      label: "Valor base de plantilla",
      description: "Base funcional Vase Business sobre plantilla editable y mantenible.",
      amountUnits: input.baseTemplateAmountUnits,
      sortOrder: 0,
    },
    {
      lineType: "FEATURE",
      label: "Extras por funcionalidades",
      description: "Flujos especiales, reglas comerciales o componentes fuera de base.",
      amountUnits: input.featureExtraAmountUnits,
      sortOrder: 1,
    },
    {
      lineType: "DESIGN",
      label: "Extras por diseño",
      description: "Trabajo visual adicional, personalización de identidad y ajuste fino de UX.",
      amountUnits: input.designExtraAmountUnits,
      sortOrder: 2,
    },
    {
      lineType: "INTEGRATION",
      label: "Extras por integraciones",
      description: "Conexiones con ERP, stock, pricing, pedidos u otros sistemas externos.",
      amountUnits: input.integrationExtraAmountUnits,
      sortOrder: 3,
    },
    {
      lineType: "SERVICE",
      label: "Extras por implementación",
      description: "Coordinación, setup adicional, QA operativo y acompañamiento comercial.",
      amountUnits: input.serviceExtraAmountUnits,
      sortOrder: 4,
    },
  ];

  return lines.map((line) => {
    const quantity = line.quantity ?? 1;
    const unitAmountCents = amountUnitsToCents(line.amountUnits);

    return {
      ...line,
      quantity,
      unitAmountCents,
      totalAmountCents: unitAmountCents * quantity,
    };
  });
}

export function calculateQuoteTotals(lineItems: Array<{ totalAmountCents: number; lineType: string }>) {
  const baseAmountCents = lineItems
    .filter((item) => item.lineType === "BASE_TEMPLATE")
    .reduce((sum, item) => sum + item.totalAmountCents, 0);
  const totalAmountCents = lineItems.reduce((sum, item) => sum + item.totalAmountCents, 0);

  return {
    baseAmountCents,
    extrasAmountCents: totalAmountCents - baseAmountCents,
    totalAmountCents,
  };
}

export function buildQuoteSnapshot(input: {
  templateKey: string;
  currency: string;
  estimatedDeliveryDays: number;
  validUntil: Date | null;
  clientSummary: string;
  internalSummary: string | null;
  observations: string | null;
  lineItems: Array<{
    lineType: string;
    label: string;
    description?: string | null;
    quantity: number;
    unitAmountCents: number;
    totalAmountCents: number;
    sortOrder: number;
  }>;
  totals: {
    baseAmountCents: number;
    extrasAmountCents: number;
    totalAmountCents: number;
  };
}) {
  return {
    templateKey: input.templateKey,
    currency: input.currency,
    estimatedDeliveryDays: input.estimatedDeliveryDays,
    validUntil: input.validUntil?.toISOString() ?? null,
    clientSummary: input.clientSummary,
    internalSummary: input.internalSummary,
    observations: input.observations,
    lineItems: input.lineItems,
    totals: input.totals,
  };
}
