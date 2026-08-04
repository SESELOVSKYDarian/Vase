export function isRestContractEntitled(status: unknown): status is "ACTIVE" | "TRIAL" {
  return status === "ACTIVE" || status === "TRIAL";
}
