"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { WorkerSelector, type ProductionWorker } from "./worker-selector";

export type AssignmentOrder = { id: string; numero: string; obra: string; categoria: string; fechaEntrega: string; estadoProductivo: string; client?: { razonSocial?: string }; corteUsuarioId?: string | null; armadoUsuarioId?: string | null };

export function AssignmentDialog({ order, open, onClose, onSaved }: { order: AssignmentOrder | null; open: boolean; onClose: () => void; onSaved: (order: any) => void }) {
  const [workers, setWorkers] = useState<{ cortadores: ProductionWorker[]; armadores: ProductionWorker[] }>({ cortadores: [], armadores: [] });
  const [corteUsuarioId, setCorte] = useState<string | null>(null); const [armadoUsuarioId, setArmado] = useState<string | null>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  useEffect(() => { const currentOrder = order; if (!open || !currentOrder) return; setCorte(currentOrder.corteUsuarioId ?? null); setArmado(currentOrder.armadoUsuarioId ?? null); setError(""); fetch("/api/industria/users/production-workers").then((r) => r.ok ? r.json() : Promise.reject()).then(setWorkers).catch(() => setError("No se pudo cargar la disponibilidad de operarios.")); }, [open, order]);
  if (!order) return null;
  const selectedOrder = order; const needsAssembly = selectedOrder.categoria === "DVH";
  async function save() { setSaving(true); setError(""); try { const response = await fetch(`/api/industria/work-orders/${selectedOrder.id}/assignments`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ corteUsuarioId, armadoUsuarioId: needsAssembly ? armadoUsuarioId : null }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); onSaved(payload.data); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la asignación."); } finally { setSaving(false); } }
  return <Modal open={open} onClose={onClose} title={`Asignar ${selectedOrder.numero}`} description={`${selectedOrder.client?.razonSocial ?? "Cliente"} · ${selectedOrder.obra}`} size="md" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar asignación</Button></>}>
    <div className="space-y-5"><div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-secondary/60 p-4 text-xs"><span className="text-muted-foreground">Tipo</span><span className="font-medium">{selectedOrder.categoria}</span><span className="text-muted-foreground">Entrega</span><span className="font-medium">{new Date(selectedOrder.fechaEntrega).toLocaleDateString("es-AR")}</span></div>
      {selectedOrder.estadoProductivo === "EN_PROCESO" && <div className="flex gap-2 rounded-xl border border-amber-300/70 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/25 dark:text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />Esta OT ya está en proceso. Cambiar el operario puede afectar el seguimiento.</div>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      <WorkerSelector label="Corte" value={corteUsuarioId} workers={workers.cortadores} onChange={setCorte} />
      {needsAssembly && <WorkerSelector label="Armado" value={armadoUsuarioId} workers={workers.armadores} onChange={setArmado} />}
    </div>
  </Modal>;
}
