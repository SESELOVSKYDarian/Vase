"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createExpenseAction } from "@/app/(platform)/app/admin/actions";
import { AdminModal } from "@/components/admin/client-ficha";

const FREQUENCY: Record<string, string> = { ONE_TIME: "Una vez", MONTHLY: "Por mes", YEARLY: "Por año", CUSTOM: "Otro" };
const STATUS: Record<string, string> = { PENDING: "Por pagar", PAID: "Pagado", OVERDUE: "Vencido" };

/** Botón "Nuevo gasto" que abre una ventana con el formulario. */
export function ExpenseCreateButton({ tenants, clients }: { tenants: Array<{ id: string; accountName: string }>; clients: Array<{ id: string; name: string; tenant: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" className="vpa-btn acc" onClick={() => setOpen(true)}>
        <Plus size={15} aria-hidden="true" />
        Nuevo gasto
      </button>
      {open ? (
        <form
          action={(formData) =>
            start(async () => {
              await createExpenseAction(formData);
              setOpen(false);
              router.refresh();
            })
          }
        >
          <AdminModal
            title="Nuevo gasto"
            subtitle="Algo que paga Vase: servidores, servicios, sueldos…"
            onClose={() => setOpen(false)}
            footer={
              <>
                <span style={{ flex: 1 }} />
                <button type="button" className="vpa-btn soft" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="vpa-btn acc" disabled={pending}>
                  {pending ? "Guardando…" : "Guardar gasto"}
                </button>
              </>
            }
          >
            <div className="vpa-form">
              <label className="vpa-fld">
                <span>Qué es</span>
                <input className="vpa-inp" name="name" required placeholder="Ej.: servidor de Easypanel" autoFocus />
              </label>
              <label className="vpa-fld">
                <span>Categoría</span>
                <input className="vpa-inp" name="category" required placeholder="Ej.: Infraestructura" />
              </label>
              <label className="vpa-fld">
                <span>Monto ($)</span>
                <input className="vpa-inp" name="amount" required type="number" min="1" step="0.01" />
              </label>
              <label className="vpa-fld">
                <span>Vence</span>
                <input className="vpa-inp" name="dueAt" type="date" />
              </label>
              <label className="vpa-fld">
                <span>Cada cuánto</span>
                <select className="vpa-inp" name="frequency" defaultValue="MONTHLY">
                  {Object.entries(FREQUENCY).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="vpa-fld">
                <span>Estado</span>
                <select className="vpa-inp" name="status" defaultValue="PENDING">
                  {Object.entries(STATUS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="vpa-fld">
                <span>Cuenta</span>
                <select className="vpa-inp" name="tenantId" required defaultValue={tenants[0]?.id ?? ""}>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.accountName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="vpa-fld">
                <span>Cliente (opcional)</span>
                <select className="vpa-inp" name="clientAccountId" defaultValue="">
                  <option value="">Ninguno</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} · {client.tenant}
                    </option>
                  ))}
                </select>
              </label>
              <label className="vpa-fld">
                <span>Quién lo paga</span>
                <input className="vpa-inp" name="responsible" />
              </label>
              <label className="vpa-fld">
                <span>Desde</span>
                <input className="vpa-inp" name="startsAt" type="date" />
              </label>
              <label className="vpa-fld vpa-span2">
                <span>Notas</span>
                <textarea className="vpa-inp" name="notes" rows={2} style={{ height: "auto", padding: "10px 12px" }} />
              </label>
            </div>
          </AdminModal>
        </form>
      ) : null}
    </>
  );
}
