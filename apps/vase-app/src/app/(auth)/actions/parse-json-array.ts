// Parte de actions.ts: AuthActionState, parseJsonArray, validationErrorState, databaseUnavailableState.

export type AuthActionState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export function parseJsonArray(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== "string" || rawValue.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function validationErrorState(error: Record<string, string[]>) {
  return {
    error: "Revisa los campos marcados y vuelve a intentar.",
    fieldErrors: error,
  } satisfies AuthActionState;
}

export function databaseUnavailableState(): AuthActionState {
  return {
    error:
      "La base de datos no está configurada todavía en este entorno. Define DATABASE_URL para registrar o iniciar sesión.",
  };
}
