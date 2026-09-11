"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatARS, formatDate } from "@/lib/format";
import { Wallet, Pencil, Trash2, History, Plus, Search } from "lucide-react";

const methods = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "CHEQUE_FISICO",
  "ECHEQ",
  "CHEQUE_TERCEROS",
  "DOLARES",
  "OTRO",
];
const labels: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  CHEQUE_FISICO: "Cheque físico",
  ECHEQ: "E-cheq",
  CHEQUE_TERCEROS: "Cheque de terceros",
  DOLARES: "Dólares",
  OTRO: "Otro",
};
type Split = { method: string; amount: string };

export default function CobrosPage() {
  const query = useSearchParams();
  const [pays, setPays] = useState<any[]>([]),
    [clients, setClients] = useState<any[]>([]),
    [invoices, setInvoices] = useState<any[]>([]);
  const [open, setOpen] = useState(false),
    [edit, setEdit] = useState<any>(null),
    [remove, setRemove] = useState<any>(null);
  const [search, setSearch] = useState(""),
    [clientId, setClientId] = useState(""),
    [receipt, setReceipt] = useState(""),
    [selected, setSelected] = useState<Record<string, string>>({}),
    [splits, setSplits] = useState<Split[]>([
      { method: "TRANSFERENCIA", amount: "" },
    ]),
    [currency, setCurrency] = useState("ARS"),
    [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [filterClientId, setFilterClientId] = useState(""); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const pageSize = 15;
  const load = () =>
    Promise.all([
      fetch(`/api/industria/payments/history?page=${page}&pageSize=${pageSize}${filterClientId ? `&clientId=${filterClientId}` : ""}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`).then((r) => r.json()),
      fetch("/api/industria/clients").then((r) => r.json()),
      fetch("/api/industria/invoices").then((r) => r.json()),
    ]).then(([p, c, i]) => {
      setPays(p.data ?? []);
      setTotal(p.count ?? 0);
      setClients(c.data ?? []);
      setInvoices(i.data ?? []);
    });
  useEffect(() => {
    load();
  }, [page, from, to, filterClientId]);
  useEffect(() => {
    const id = query.get("clientId"),
      invoiceId = query.get("invoiceId");
    if (id) start(id, invoiceId ?? undefined);
  }, [query]);
  const pending = useMemo(
    () =>
      invoices.filter(
        (i) =>
          i.clientId === clientId && Number(i.saldoPendiente ?? i.total) > 0,
      ),
    [invoices, clientId],
  );
  const matches = useMemo(
    () =>
      clients
        .filter((c) =>
          `${c.razonSocial} ${c.cuit} ${c.codigoCliente}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .slice(0, 7),
    [clients, search],
  );
  const applied = Object.values(selected).reduce(
      (s, v) => s + Number(v || 0),
      0,
    ),
    paid = splits.reduce((s, x) => s + Number(x.amount || 0), 0);
  function start(id = "", invoiceId?: string) {
    setError("");
    setClientId(id);
    setSearch(id ? (clients.find((c) => c.id === id)?.razonSocial ?? "") : "");
    setReceipt(`RC-${String(Date.now()).slice(-6)}`);
    setSelected(invoiceId ? { [invoiceId]: "" } : {});
    setSplits([{ method: "TRANSFERENCIA", amount: "" }]);
    setCurrency("ARS");
    setRate("");
    setOpen(true);
  }
  function choose(id: string) {
    setClientId(id);
    setSearch(clients.find((c) => c.id === id)?.razonSocial ?? "");
    setSelected({});
  }
  function toggle(id: string) {
    setSelected((current) => {
      const next = { ...current };
      if (id in next) delete next[id];
      else next[id] = "";
      return next;
    });
  }
  async function create() {
    if (!clientId) return setError("Seleccioná un cliente.");
    if (paid <= 0) return setError("Ingresá al menos un medio de pago.");
    if (applied > 0 && Math.abs(applied - paid) > 0.01)
      return setError(`Los medios deben sumar ${formatARS(applied)}.`);
    if (currency === "USD" && !Number(rate))
      return setError("Indicá el tipo de cambio para USD.");
    const allocations = Object.entries(selected)
      .filter(([, v]) => Number(v) > 0)
      .map(([invoiceId, monto]) => ({
        invoiceId,
        target: "OT_ESPECIFICA",
        monto: Number(monto),
      }));
    setBusy(true);
    setError("");
    try {
      for (const split of splits.filter((x) => Number(x.amount) > 0)) {
        const splitAmount = Number(split.amount),
          ratio = applied ? splitAmount / applied : 1;
        const response = await fetch("/api/industria/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            recibo: receipt,
            metodo: split.method,
            moneda: currency,
            importe: splitAmount,
            tipoCambio: currency === "USD" ? Number(rate) : undefined,
            allocations: allocations.length
              ? allocations.map((a) => ({
                  ...a,
                  monto: Number((a.monto * ratio).toFixed(2)),
                }))
              : [{ target: "CUENTA_CORRIENTE", monto: splitAmount }],
          }),
        });
        if (!response.ok)
          throw new Error(
            (await response.json().catch(() => null))?.error ??
              "No se pudo registrar el cobro",
          );
      }
      setOpen(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveEdit() {
    setBusy(true);
    const r = await fetch(`/api/industria/payments/${edit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recibo: edit.recibo,
        observaciones: edit.observaciones,
      }),
    });
    if (!r.ok)
      setError(
        (await r.json().catch(() => null))?.error ?? "No se pudo editar",
      );
    else {
      setEdit(null);
      load();
    }
    setBusy(false);
  }
  async function del() {
    setBusy(true);
    const r = await fetch(`/api/industria/payments/${remove.id}`, { method: "DELETE" });
    if (!r.ok)
      setError(
        (await r.json().catch(() => null))?.error ?? "No se pudo borrar",
      );
    else {
      setRemove(null);
      load();
    }
    setBusy(false);
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Cobros</h1>
          <p className="text-sm text-muted-foreground">
            Aplicá pagos parciales y combiná medios de pago.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { window.location.href = "/dashboard/industria/cobros/historial"; }}>
            <History className="h-4 w-4" /> Historial
          </Button>
          <Button onClick={() => start()}>
            <Wallet className="h-4 w-4" /> Nuevo cobro
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3"><div><Label>Desde</Label><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></div><div><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></div><div><Label>Cliente</Label><Select value={filterClientId} onChange={(e) => { setFilterClientId(e.target.value); setPage(1); }}><option value="">Todos los clientes</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}</Select></div>{(from || to || filterClientId) && <Button variant="outline" onClick={() => { setFrom(""); setTo(""); setFilterClientId(""); setPage(1); }}>Limpiar filtros</Button>}</div>
        {pays.map((p) => (
          <Card
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div>
              <b>
                {p.numero} · {p.client?.razonSocial}
              </b>
              <p className="text-xs text-muted-foreground">
                {formatDate(p.fecha)} · Recibo {p.recibo} ·{" "}
                {labels[p.metodo] ?? p.metodo}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <b className="text-vase-green">
                {p.moneda === "USD"
                  ? `US$ ${p.importe}`
                  : formatARS(Number(p.importe))}
              </b>
              <Button
                size="icon"
                variant="outline"
                title="Editar"
                onClick={() =>
                  setEdit({
                    id: p.id,
                    recibo: p.recibo,
                    observaciones: p.observaciones ?? "",
                  })
                }
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                title="Borrar"
                onClick={() => setRemove(p)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {!pays.length && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Todavía no hay cobros.
          </Card>
        )}
      </div>
      {total > pageSize && <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"><span className="text-sm text-muted-foreground">Página {page} de {Math.ceil(total / pageSize)}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button><Button size="sm" variant="outline" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)}>Siguiente</Button></div></div>}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo cobro"
        description="Elegí el cliente, imputá facturas y distribuí el pago entre uno o varios medios."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={busy || !clientId || paid <= 0} onClick={create}>
              {busy ? "Guardando…" : "Guardar cobro"}
            </Button>
          </>
        }
      >
        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          <div className="relative">
            <Label>Cliente</Label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setClientId("");
                }}
                placeholder="Buscar razón social, CUIT o código"
                className="pl-9"
              />
            </div>
            {search && !clientId && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-card shadow-lg">
                {matches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="block w-full px-3 py-3 text-left text-sm hover:bg-secondary"
                    onClick={() => choose(c.id)}
                  >
                    <b>{c.razonSocial}</b>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {c.cuit}
                    </span>
                  </button>
                ))}
                {!matches.length && (
                  <p className="p-3 text-sm text-muted-foreground">
                    No encontramos clientes.
                  </p>
                )}
              </div>
            )}
          </div>
          {clientId && (
            <div>
              <div className="mb-2 flex justify-between">
                <Label>Facturas pendientes</Label>
                <span className="text-xs text-muted-foreground">
                  Aplicado: {formatARS(applied)}
                </span>
              </div>
              {pending.length ? (
                pending.map((i) => {
                  const total = Number(i.total),
                    already = Number(i.importePagado ?? 0),
                    balance = Number(i.saldoPendiente ?? total);
                  return (
                    <div key={i.id} className="mb-2 rounded-xl border p-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={i.id in selected}
                          onChange={() => toggle(i.id)}
                        />
                        <b>
                          {i.numero} · {formatDate(i.fecha)}
                        </b>
                      </label>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <span>
                          Total<b className="block">{formatARS(total)}</b>
                        </span>
                        <span>
                          Pagado
                          <b className="block text-vase-green">
                            {formatARS(already)}
                          </b>
                        </span>
                        <span>
                          Pendiente
                          <b className="block text-amber-700">
                            {formatARS(balance)}
                          </b>
                        </span>
                      </div>
                      {i.id in selected && (
                        <Input
                          className="mt-3"
                          type="number"
                          min="0.01"
                          max={balance}
                          value={selected[i.id]}
                          onChange={(e) =>
                            setSelected({ ...selected, [i.id]: e.target.value })
                          }
                          placeholder="Importe a imputar (pago parcial)"
                        />
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
                  Este cliente no tiene facturas pendientes.
                </p>
              )}
            </div>
          )}
          <div>
            <Label>Recibo</Label>
            <Input
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Medios de pago</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setSplits([
                    ...splits,
                    { method: "TRANSFERENCIA", amount: "" },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Agregar medio
              </Button>
            </div>
            {splits.map((s, index) => (
              <div key={index} className="mb-2 flex gap-2">
                <Select
                  value={s.method}
                  onChange={(e) =>
                    setSplits(
                      splits.map((x, i) =>
                        i === index ? { ...x, method: e.target.value } : x,
                      ),
                    )
                  }
                >
                  {methods.map((m) => (
                    <option key={m} value={m}>
                      {labels[m]}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min="0.01"
                  value={s.amount}
                  onChange={(e) =>
                    setSplits(
                      splits.map((x, i) =>
                        i === index ? { ...x, amount: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Importe"
                />
                {splits.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setSplits(splits.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <p className="text-right text-xs text-muted-foreground">
              Total medios: {formatARS(paid)}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Moneda</Label>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </Select>
            </div>
            {currency === "USD" && (
              <div>
                <Label>Tipo de cambio</Label>
                <Input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
            )}
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </Modal>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Editar cobro"
        footer={
          <>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancelar
            </Button>
            <Button disabled={busy} onClick={saveEdit}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <Label>Recibo</Label>
        <Input
          value={edit?.recibo ?? ""}
          onChange={(e) => setEdit({ ...edit, recibo: e.target.value })}
        />
        <Label>Observaciones</Label>
        <Input
          value={edit?.observaciones ?? ""}
          onChange={(e) => setEdit({ ...edit, observaciones: e.target.value })}
        />
      </Modal>
      <Modal
        open={!!remove}
        onClose={() => setRemove(null)}
        title="¿Borrar cobro?"
        description="Se revertirá el movimiento de cuenta corriente y quedará registrado en auditoría."
        footer={
          <>
            <Button variant="outline" onClick={() => setRemove(null)}>
              Cancelar
            </Button>
            <Button disabled={busy} onClick={del}>
              Borrar cobro
            </Button>
          </>
        }
      />
    </div>
  );
}
