import { z } from "zod";
import { integrationScopes, webhookEventKeys } from "@/config/integrations";

export const createIntegrationCredentialSchema = z.object({
  name: z.string().trim().min(3).max(80),
  requestsPerMinute: z.coerce.number().int().min(30).max(2000),
  scopes: z
    .array(z.enum(integrationScopes))
    .min(1)
    .max(integrationScopes.length),
});

export const revokeIntegrationCredentialSchema = z.object({
  credentialId: z.string().trim().cuid(),
});

export const rotateIntegrationCredentialSchema = z.object({
  credentialId: z.string().trim().cuid(),
});

export const createIntegrationWebhookSchema = z.object({
  name: z.string().trim().min(3).max(80),
  url: z.url().max(500),
  eventTypes: z
    .array(z.enum(webhookEventKeys))
    .min(1),
});

export const pauseIntegrationWebhookSchema = z.object({
  webhookId: z.string().trim().cuid(),
});
