"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { clients, balanceForClient } from "@/lib/mock-data";
import { formatARS } from "@/lib/format";

export default function ClientesPage() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ razonSocial: "", cuit: "", condicionIva: "RESPONSABLE_INSCRIPTO", domicilio: "", telefono: "", email: "", contacto: "" });
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) { e.preventDefault(); setError(""); const response = await fetch("/api/industria/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (!response.ok) { setError((await response.json()).error ?? "No se pudo crear el cliente"); return; } setOpen(false); setForm({ razonSocial: "", cuit: "", condicionIva: "RESPONSABLE_INSCRIPTO", domicilio: "", telefono: "", email: "", contacto: "" }); }

  const filtered = clients.filter((c) =>
    [c.razonSocial, c.cuit, c.codigoCliente].join(" ").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clients.length} clientes registrados</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      <Input
        placeholder="Buscar por razón social, CUIT o código…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No se encontraron clientes" description="Probá con otro término de búsqueda o creá un cliente nuevo." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">CUIT</th>
                <th className="px-4 py-3">Condición IVA</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3 text-right">Saldo cta. cte.</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const saldo = balanceForClient(c.id);
                return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/industria/clientes/${c.id}`} className="font-medium text-foreground hover:text-vase-green">
                        {c.razonSocial}
                      </Link>
                      <p className="text-xs text-muted-foreground">{c.codigoCliente}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{c.cuit}</td>
                    <td className="px-4 py-3 text-muted-foreground">{condicionLabel(c.condicionIva)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.contacto}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      <span className={saldo > 0 ? "text-red-500" : "text-vase-green"}>{formatARS(saldo)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.estado === "ACTIVO" ? "success" : "neutral"}>{c.estado}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right"><Link href={`/dashboard/industria/clientes/${c.id}`}><Button size="sm" variant="outline">Ver más información</Button></Link></td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo cliente" description="Completá los datos básicos del cliente." footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button form="client-form" type="submit">Guardar cliente</Button></>}>
        <form id="client-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor="client-name">Razón social</Label><Input id="client-name" required value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} /></div>
          <div><Label htmlFor="client-cuit">CUIT</Label><Input id="client-cuit" required value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} /></div>
          <div><Label htmlFor="client-iva">Condición IVA</Label><Select id="client-iva" value={form.condicionIva} onChange={(e) => setForm({ ...form, condicionIva: e.target.value })}><option>RESPONSABLE_INSCRIPTO</option><option>MONOTRIBUTO</option><option>EXENTO</option><option>CONSUMIDOR_FINAL</option></Select></div>
          <div className="sm:col-span-2"><Label htmlFor="client-address">Domicilio</Label><Input id="client-address" required value={form.domicilio} onChange={(e) => setForm({ ...form, domicilio: e.target.value })} /></div>
          <div><Label htmlFor="client-contact">Contacto</Label><Input id="client-contact" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} /></div>
          <div><Label htmlFor="client-phone">Teléfono</Label><Input id="client-phone" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label htmlFor="client-email">Email</Label><Input id="client-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}

function condicionLabel(v: string) {
  const map: Record<string, string> = {
    RESPONSABLE_INSCRIPTO: "Resp. Inscripto",
    MONOTRIBUTO: "Monotributo",
    EXENTO: "Exento",
    CONSUMIDOR_FINAL: "Consumidor Final",
  };
  return map[v] ?? v;
}
