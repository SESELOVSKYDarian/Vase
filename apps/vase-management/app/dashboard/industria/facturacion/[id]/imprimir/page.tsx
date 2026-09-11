"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatARS, formatDate } from "@/lib/format";
export default function ImprimirFactura() {
  const params = useParams<{ id: string }>(),
    [invoice, setInvoice] = useState<any>(null),
    [settings, setSettings] = useState<any>(null),
    [format, setFormat] = useState<"A4" | "TICKET">("A4");
  useEffect(() => {
    if (!params.id) return;
    Promise.all([
      fetch(`/api/industria/invoices/${params.id}`).then((r) => r.json()),
      fetch("/api/industria/company-settings").then((r) => r.json()),
    ]).then(([i, s]) => {
      setInvoice(i.data);
      setSettings(s.data);
    });
  }, [params.id]);
  if (!invoice) return <p className="p-8">Cargando factura…</p>;
  const fiscal = invoice.tipoFacturacion === "A";
  const displayNumber = (document: any) =>
    document.arcaNumero
      ? `${String(document.puntoVenta).padStart(5, "0")}-${String(document.arcaNumero).padStart(8, "0")}`
      : document.numero;
  const documentLabel = invoice.documentType === "NOTA_CREDITO" ? `NOTA DE CRÉDITO ${invoice.tipoFacturacion}` : invoice.documentType === "NOTA_DEBITO" ? `NOTA DE DÉBITO ${invoice.tipoFacturacion}` : `FACTURA ${invoice.tipoFacturacion}`;
  return (
    <main className="print-page mx-auto max-w-4xl space-y-5 p-6">
      <div className="print-toolbar flex justify-between print:hidden">
        <Button variant="outline" onClick={() => history.back()}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <div className="flex gap-2">
          <Button variant={format === "A4" ? "default" : "outline"} onClick={() => setFormat("A4")}>A4</Button>
          <Button variant={format === "TICKET" ? "default" : "outline"} onClick={() => setFormat("TICKET")}>Ticket 80 mm</Button>
          <Button onClick={() => print()}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button variant="outline" onClick={() => print()}>
            <Download className="h-4 w-4" /> Guardar como PDF
          </Button>
        </div>
      </div>
      <Card className={`print-document ${format === "TICKET" ? "ticket-document" : ""} print:border-0 print:shadow-none`}>
        <div className="flex items-start justify-between border-b p-6">
          {settings?.logoData ? (
            <img
              src={settings.logoData}
              alt="Logo"
              className="max-h-16 max-w-48 object-contain"
            />
          ) : (
            <div>
              <p className="font-semibold">
                {settings?.razonSocial || "Vase CRM"}
              </p>
              <p className="text-xs">
              {fiscal ? "Comprobante fiscal" : "Comprobante interno"}
              </p>
            </div>
          )}
          <div className="text-right">
            <h1 className="text-2xl font-bold">
              {documentLabel}
            </h1>
            <p className="font-semibold">{displayNumber(invoice)}</p>
            <p>{formatDate(invoice.fecha)}</p>
          </div>
        </div>
        <div className="grid gap-4 border-b p-6 text-sm sm:grid-cols-2">
          <div>
            <p>Cliente</p>
            <p className="font-semibold">{invoice.client?.razonSocial}</p>
            <p>CUIT: {invoice.cuit}</p>
          </div>
          <div>
            <p>Condición IVA: {invoice.condicionIva}</p>
            <p>Punto de venta: {invoice.puntoVenta}</p>
            {fiscal && (
              <>
                <p>
                  CAE: <b>{invoice.cae || "Pendiente de autorización ARCA"}</b>
                </p>
                {invoice.vencimientoCae && (
                  <p>Vencimiento CAE: {formatDate(invoice.vencimientoCae)}</p>
                )}
              </>
            )}
          </div>
        </div>
        {invoice.originalInvoice && <div className="border-b p-6 text-sm"><p className="font-semibold">COMPROBANTE ASOCIADO</p><p className="mt-1">{invoice.originalInvoice.arcaVoucherType?.replaceAll("_", " ") || "Factura"} · PV {String(invoice.originalInvoice.puntoVenta).padStart(5, "0")} · N° {invoice.originalInvoice.numero}</p><p className="text-muted-foreground">Fecha {formatDate(invoice.originalInvoice.fecha)}</p></div>}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3">Descripción</th>
              <th className="p-3 text-right">Cantidad</th>
              <th className="p-3 text-right">Precio unitario</th>
              <th className="p-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((x: any) => (
              <tr key={x.id} className="border-b">
                <td className="p-3">{x.descripcion}</td>
                <td className="p-3 text-right">{x.cantidad}</td>
                <td className="p-3 text-right">
                  {formatARS(Number(x.precioUnitario))}
                </td>
                <td className="p-3 text-right">
                  {formatARS(Number(x.subtotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto max-w-xs space-y-2 p-6 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <b>{formatARS(Number(invoice.subtotal))}</b>
          </div>
          <div className="flex justify-between">
            <span>IVA</span>
            <b>{formatARS(Number(invoice.iva))}</b>
          </div>
          <div className="flex justify-between border-t pt-2 text-lg">
            <span>Total</span>
            <b>{formatARS(Number(invoice.total))}</b>
          </div>
        </div>
        <p className="border-t p-6 text-xs">
          {fiscal
            ? invoice.cae
              ? "Comprobante autorizado por ARCA."
              : "Factura A pendiente de autorización ARCA. No es válida como comprobante fiscal hasta obtener CAE."
            : "Comprobante interno no fiscal."}
        </p>
      </Card>
    </main>
  );
}
