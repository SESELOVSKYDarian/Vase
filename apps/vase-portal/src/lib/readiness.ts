export async function checkPortalAppReadiness(input: {
  baseUrl: string;
  fetcher?: typeof fetch;
}) {
  try {
    const response = await (input.fetcher ?? fetch)(
      `${input.baseUrl}/api/health/ready`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      return {
        ok: false as const,
        checks: { app: "unavailable" },
      };
    }

    return {
      ok: true as const,
      checks: { app: "ok" },
    };
  } catch {
    return {
      ok: false as const,
      checks: { app: "unavailable" },
    };
  }
}
