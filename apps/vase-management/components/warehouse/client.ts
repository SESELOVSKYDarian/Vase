export class WarehouseApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'WarehouseApiError'
  }
}

export async function warehouseRequest<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok || data?.error) {
    throw new WarehouseApiError(
      data?.error || 'No se pudo completar la operación',
      response.status,
    )
  }

  return data as T
}

export function buildWarehouseProductUrl(filters: {
  query?: string
  sectorId?: string
  rack?: string
}) {
  const params = new URLSearchParams()
  if (filters.query?.trim()) params.set('q', filters.query.trim())
  if (filters.sectorId?.trim()) params.set('sectorId', filters.sectorId.trim())
  if (filters.rack?.trim()) params.set('rack', filters.rack.trim())
  const suffix = params.toString()
  return `/api/warehouse/products${suffix ? `?${suffix}` : ''}`
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'No se pudo completar la operación'
}
