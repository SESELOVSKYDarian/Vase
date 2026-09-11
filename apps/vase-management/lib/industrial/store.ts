import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  accountMovements,
  clients,
  deliveryNotes,
  invoices,
  payments,
  priceList,
  quotes,
  workOrders,
} from '@/lib/mock-data'

export type IndustrialPayload = Record<string, unknown> & { id: string }

const demo: Record<string, IndustrialPayload[]> = {
  clients: clients as unknown as IndustrialPayload[],
  quotes: quotes as unknown as IndustrialPayload[],
  'work-orders': workOrders as unknown as IndustrialPayload[],
  'delivery-notes': deliveryNotes as unknown as IndustrialPayload[],
  invoices: invoices as unknown as IndustrialPayload[],
  payments: payments as unknown as IndustrialPayload[],
  'account-movements': accountMovements as unknown as IndustrialPayload[],
  products: priceList.map((item) => ({
    ...item,
    nombre: item.producto,
    activo: true,
  })) as unknown as IndustrialPayload[],
}

export async function listIndustrialRecords(companyId: string, entity: string) {
  const stored = await prisma.industrialRecord.findMany({
    where: { companyId, entity },
    orderBy: { updatedAt: 'desc' },
  })
  const byId = new Map((demo[entity] ?? []).map((item) => [item.id, item]))
  for (const record of stored) {
    byId.set(record.externalId, record.data as IndustrialPayload)
  }
  return [...byId.values()]
}

export async function getIndustrialRecord(companyId: string, entity: string, id: string) {
  const stored = await prisma.industrialRecord.findUnique({
    where: { companyId_entity_externalId: { companyId, entity, externalId: id } },
  })
  if (stored) return stored.data as IndustrialPayload
  return (demo[entity] ?? []).find((item) => item.id === id) ?? null
}

export async function saveIndustrialRecord(
  companyId: string,
  entity: string,
  payload: IndustrialPayload,
) {
  await prisma.industrialRecord.upsert({
    where: {
      companyId_entity_externalId: {
        companyId,
        entity,
        externalId: payload.id,
      },
    },
    create: {
      companyId,
      entity,
      externalId: payload.id,
      data: payload as Prisma.InputJsonValue,
    },
    update: { data: payload as Prisma.InputJsonValue },
  })
  return payload
}

export async function deleteIndustrialRecord(companyId: string, entity: string, id: string) {
  const current = await getIndustrialRecord(companyId, entity, id)
  if (!current) return false
  const tombstone = { ...current, id, deleted: true, estado: 'ANULADO' }
  await saveIndustrialRecord(companyId, entity, tombstone)
  return true
}
