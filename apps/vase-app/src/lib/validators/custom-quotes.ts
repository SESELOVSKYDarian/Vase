import { z } from "zod";
import { quoteTemplateKeys } from "@/lib/business/custom-quotes";

const amountField = z.coerce.number().int().min(0).max(500000000);

export const upsertCustomizationQuoteSchema = z.object({
  requestId: z.string().trim().cuid(),
  templateKey: z.enum(quoteTemplateKeys),
  currency: z.enum(["USD", "ARS"]),
  baseTemplateAmountUnits: amountField.min(1),
  featureExtraAmountUnits: amountField,
  designExtraAmountUnits: amountField,
  integrationExtraAmountUnits: amountField,
  serviceExtraAmountUnits: amountField,
  estimatedDeliveryDays: z.coerce.number().int().min(3).max(365),
  validUntil: z
    .string()
    .trim()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha invalida."),
  clientSummary: z.string().trim().min(20).max(600),
  internalSummary: z.string().trim().max(600).optional(),
  observations: z.string().trim().max(600).optional(),
});

export const sendCustomizationQuoteSchema = z.object({
  quoteId: z.string().trim().cuid(),
});

export const respondCustomizationQuoteSchema = z.object({
  quoteId: z.string().trim().cuid(),
  decision: z.enum(["ACCEPT", "REJECT"]),
  responseMessage: z.string().trim().max(400).optional(),
});
