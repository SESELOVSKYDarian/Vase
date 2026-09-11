"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatARS, formatDate, formatM2 } from "@/lib/format";
import { ArrowLeft, Download, Printer } from "lucide-react";

export default function PrintQuotePage() {
  const params = useParams<{ id: string }>();
  const [quote, setQuote] = useState<any>(null);
  const [logo, setLogo] = useState("");
  useEffect(() => {
    if (!params.id) return;
    Promise.all([fetch(`/api/industria/quotes/${params.id}`).then((r) => r.json()), fetch("/api/industria/company-settings").then((r) => r.json())])
      .then(([q, s]) => { setQuote(q.data); setLogo(s.data?.logoData ?? ""); });
  }, [params.id]);
  if (!quote) return <p className="p-8">Cargando presupuesto…</p>;
  return <main className="print-page mx-auto max-w-4xl space-y-5 p-6">
    <div className="print-toolbar flex items-center justify-between print:hidden">
      <Button variant="outline" onClick={() => window.history.back()}><ArrowLeft className="h-4 w-4" /> Volver</Button>
      <div className="flex gap-2"><Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir</Button><Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" /> Descargar PDF</Button></div>
    </div>
    <Card className="print-document print:border-0 print:shadow-none">
      <div className="flex items-start justify-between border-b p-6">{logo ? <img src={logo} alt="Logo de la empresa" className="max-h-16 max-w-48 object-contain" /> : <div><p className="text-sm font-semibold">Vase CRM</p><p className="text-xs">Presupuesto comercial</p></div>}<div className="text-right"><h1 className="text-2xl font-bold">{quote.numero}</h1><p>{formatDate(quote.fecha)}</p><p>Válido hasta: {formatDate(quote.fechaEntrega)}</p></div></div>
      <div className="grid gap-4 border-b p-6 text-sm sm:grid-cols-2"><div><p>Cliente</p><p className="font-semibold">{quote.client?.razonSocial}</p><p>CUIT: {quote.client?.cuit}</p></div><div><p>Obra</p><p>{quote.obra?.trim() || "Sin obra especificada"}</p><p>Tipo: {quote.tipo}</p></div></div>
      <table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Producto</th><th className="p-3 text-right">Cantidad</th><th className="p-3 text-right">Medidas</th><th className="p-3 text-right">Subtotal</th></tr></thead><tbody>{quote.items.map((item: any) => <tr key={item.id} className="border-b"><td className="p-3">{item.productoNombre}</td><td className="p-3 text-right">{item.cantidad}</td><td className="p-3 text-right">{item.anchoMm} × {item.altoMm} mm</td><td className="p-3 text-right">{formatARS(Number(item.subtotalNeto))}</td></tr>)}</tbody></table>
      <div className="ml-auto max-w-xs space-y-2 p-6 text-sm"><div className="flex justify-between"><span>Subtotal</span><b>{formatARS(Number(quote.subtotalNeto))}</b></div><div className="flex justify-between"><span>IVA</span><b>{formatARS(Number(quote.iva))}</b></div><div className="flex justify-between border-t pt-2 text-lg"><span>Total</span><b>{formatARS(Number(quote.total))}</b></div><p>Superficie total: {formatM2(Number(quote.m2Total))}</p></div>
      <p className="border-t p-6 text-xs">Presupuesto sujeto a confirmación.</p>
    </Card>
  </main>;
}

