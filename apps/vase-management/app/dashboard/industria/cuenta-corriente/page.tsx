"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { clients, accountMovements, getClient, balanceForClient } from "@/lib/mock-data";
import { formatARS, formatDate } from "@/lib/format";
import { motion } from "motion/react";

export default function CuentaCorrientePage() {
  const [clienteId, setClienteId] = useState("TODOS");

  const movements = clienteId === "TODOS" ? accountMovements : accountMovements.filter((m) => m.clienteId === clienteId);

  const totalDeuda = clients.reduce((acc, c) => acc + Math.max(balanceForClient(c.id), 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Cuenta corriente</h1>
          <p className="text-sm text-muted-foreground">Extracto cronológico por cliente</p>
        </div>
        <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="max-w-xs">
          <option value="TODOS">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.razonSocial}</option>
          ))}
        </Select>
      </div>

      <Card className="p-4 border-vase-green/30 bg-vase-green-soft/30 max-w-sm">
        <p className="text-xs text-muted-foreground">Deuda total de clientes</p>
        <p className="mt-1 text-xl font-bold tabular-nums">{formatARS(totalDeuda)}</p>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3 text-right">Debe</th>
              <th className="px-4 py-3 text-right">Haber</th>
              <th className="px-4 py-3 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m, i) => (
              <motion.tr
                key={m.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="border-b border-border last:border-0 hover:bg-secondary/40"
              >
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(m.fecha)}</td>
                <td className="px-4 py-2.5 font-medium">{getClient(m.clienteId)?.razonSocial}</td>
                <td className="px-4 py-2.5">{m.tipo}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{m.referencia}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.debe ? formatARS(m.debe) : "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-vase-green">{m.haber ? formatARS(m.haber) : "—"}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatARS(m.saldo)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

