import { z } from "zod";

export const labsOrderChannelSchema = z.enum(["WEB", "WHATSAPP", "INSTAGRAM", "MESSENGER"]);

export const labsOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(999),
});

export const labsOrderCustomerSchema = z.object({
  name: z.string().trim().min(1).max(160).nullable().optional(),
  email: z.email().nullable().optional(),
  phone: z.string().trim().min(3).max(80).nullable().optional(),
  shippingLocation: z.object({
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
  }).nullable().optional(),
  shippingLatitude: z.number().min(-90).max(90).nullable().optional(),
  shippingLongitude: z.number().min(-180).max(180).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  billing: z.record(z.string(), z.unknown()).optional(),
});

export const labsOrderFulfillmentSchema = z.object({
  type: z.enum(["DELIVERY", "PICKUP"]).default("DELIVERY"),
  branchId: z.string().trim().min(1).nullable().optional(),
});

const noCallerBusinessUrl = z.object({
  businessUrl: z.never().optional(),
  apiUrl: z.never().optional(),
  upstreamUrl: z.never().optional(),
});

export const labsOrderQuoteRequestSchema = noCallerBusinessUrl.extend({
  globalTenantId: z.string().trim().min(1),
  channel: labsOrderChannelSchema.default("WEB"),
  items: z.array(labsOrderItemSchema).min(1).max(100),
  customer: labsOrderCustomerSchema.default({}),
  fulfillment: labsOrderFulfillmentSchema.optional(),
  customerType: z.enum(["retail", "wholesale"]).optional(),
});

export const labsOrderCreateRequestSchema = labsOrderQuoteRequestSchema.extend({
  idempotencyKey: z.string().trim().min(8).max(160),
  quoteHash: z.string().trim().min(8).max(128),
  quoteVersion: z.number().int().positive(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const labsFulfillmentRequestSchema = z.object({
  globalTenantId: z.string().trim().min(1),
});

export const labsOrderSnapshotRequestSchema = z.object({
  globalTenantId: z.string().trim().min(1),
  since: z.iso.datetime().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

export type LabsOrderChannel = z.infer<typeof labsOrderChannelSchema>;
export type LabsOrderQuoteRequest = z.infer<typeof labsOrderQuoteRequestSchema>;
export type LabsOrderCreateRequest = z.infer<typeof labsOrderCreateRequestSchema>;
export type LabsFulfillmentRequest = z.infer<typeof labsFulfillmentRequestSchema>;
export type LabsOrderSnapshotRequest = z.infer<typeof labsOrderSnapshotRequestSchema>;
