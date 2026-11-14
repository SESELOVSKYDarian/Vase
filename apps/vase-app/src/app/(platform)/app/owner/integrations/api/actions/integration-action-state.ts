// Parte de actions.ts: IntegrationActionState, fieldValueList.

export type IntegrationActionState = {
  success?: string;
  error?: string;
  secret?: string;
  compatibilitySecret?: string;
};

export function fieldValueList(formData: FormData, fieldName: string) {
  return formData
    .getAll(fieldName)
    .map((value) => String(value))
    .filter(Boolean);
}
