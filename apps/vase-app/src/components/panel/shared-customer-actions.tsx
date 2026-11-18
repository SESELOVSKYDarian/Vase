"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeCustomerAction } from "@/app/(platform)/app/pedidos/actions";

/** Clientes (Compartido): aprobar o cambiar entre mayorista y minorista, en la misma fila. */
export function SharedCustomerActions({ userId, pending, wholesale }: { userId: string; pending: boolean; wholesale: boolean }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (change: "approve" | "wholesale" | "retail") =>
    startTransition(async () => {
      const result = await changeCustomerAction({ userId, change });
      setError(result.ok ? null : result.message);
      if (result.ok) router.refresh();
    });

  return (
    <span className="vpa-rowacts">
      {pending ? (
        <button type="button" className="vpa-btn acc sm" disabled={busy} onClick={() => run("approve")}>
          Aprobar
        </button>
      ) : (
        <button type="button" className="vpa-btn line sm" disabled={busy} onClick={() => run(wholesale ? "retail" : "wholesale")} title={wholesale ? "Pasarlo a minorista" : "Pasarlo a mayorista"}>
          {wholesale ? "Pasar a minorista" : "Pasar a mayorista"}
        </button>
      )}
      {error ? (
        <small role="alert" style={{ color: "var(--red)" }}>
          {error}
        </small>
      ) : null}
    </span>
  );
}
