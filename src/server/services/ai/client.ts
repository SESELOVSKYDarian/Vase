import { defaultModels, type AiTask, type TenantAiRuntimeConfig } from "@/server/services/ai/models";

export function resolveTenantModel(config: TenantAiRuntimeConfig, task: AiTask) {
  if (config.model) {
    return config.model;
  }
  return defaultModels[task];
}
