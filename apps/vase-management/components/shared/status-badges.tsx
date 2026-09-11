import { Badge } from "@/components/ui/badge";
import type {
  QuoteStatus,
  WorkOrderStatus,
  DeliveryStatus,
  InvoiceStatus,
  TipoFacturacion,
} from "@/types/industrial";

const quoteMap: Record<QuoteStatus, { label: string; variant: any }> = {
  BORRADOR: { label: "Borrador", variant: "neutral" },
  ENVIADO: { label: "Enviado", variant: "info" },
  APROBADO: { label: "Aprobado", variant: "success" },
  RECHAZADO: { label: "Rechazado", variant: "danger" },
  VENCIDO: { label: "Vencido", variant: "warning" },
  ANULADO: { label: "Anulado", variant: "neutral" },
};

const workOrderMap: Record<WorkOrderStatus, { label: string; variant: any }> = {
  PENDIENTE: { label: "Pendiente", variant: "neutral" },
  EN_PROCESO: { label: "En proceso", variant: "info" },
  TERMINADA: { label: "Terminada", variant: "success" },
  ANULADA: { label: "Anulada", variant: "danger" },
};

const deliveryMap: Record<DeliveryStatus, { label: string; variant: any }> = {
  SIN_ENTREGAR: { label: "Sin entregar", variant: "neutral" },
  ENTREGA_PARCIAL: { label: "Entrega parcial", variant: "warning" },
  ENTREGA_COMPLETA: { label: "Entrega completa", variant: "success" },
};

const invoiceMap: Record<InvoiceStatus, { label: string; variant: any }> = {
  SIN_FACTURAR: { label: "Sin facturar", variant: "neutral" },
  FACTURADA_PARCIAL: { label: "Facturada parcial", variant: "warning" },
  FACTURADA: { label: "Facturada", variant: "success" },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const m = quoteMap[status];
  return <Badge variant={m.variant} dot>{m.label}</Badge>;
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const m = workOrderMap[status];
  return <Badge variant={m.variant} dot>{m.label}</Badge>;
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const m = deliveryMap[status];
  return <Badge variant={m.variant} dot>{m.label}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const m = invoiceMap[status];
  return <Badge variant={m.variant} dot>{m.label}</Badge>;
}

export function TipoFacturacionBadge({ tipo }: { tipo: TipoFacturacion }) {
  return tipo === "A" ? (
    <Badge variant="success">Tipo A · Fiscal ARCA</Badge>
  ) : (
    <Badge variant="outline">Tipo N · Interno</Badge>
  );
}

