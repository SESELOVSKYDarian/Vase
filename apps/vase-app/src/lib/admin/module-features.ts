export const businessFeatureSubmoduleKeys = new Set(["plantilla", "personalizado"]);

export function isBusinessFeatureSubmoduleKey(key: string) {
  return businessFeatureSubmoduleKeys.has(key);
}
