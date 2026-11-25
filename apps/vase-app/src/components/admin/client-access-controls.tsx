"use client";

// Botones de la ficha del cliente para el acceso: habilitar la cuenta a mano y marcarla como cuenta de prueba interna.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { activateClientAccountAction, setTestAccountAction } from "@/app/(platform)/app/admin/actions/client-access";
import type { ClientActionResult } from "@/app/(platform)/app/admin/actions/client-admin";

export function ClientAccessControls({
  tenantId,
  canActivate,
  isTestAccount,
}: {
  tenantId: string;
  /** Está en prueba (o con la prueba vencida): se puede habilitar sin esperar el pago. */
  canActivate: boolean;
  isTestAccount: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ClientActionResult | null>(null);

  // Corre la acción, muestra lo que respondió y recarga la ficha.
  const run = (call: () => Promise<ClientActionResult>) => {
    setResult(null);
    start(async () => {
      const next = await call().catch(() => ({ ok: false, message: "No pudimos guardar." }));
      setResult(next);
      if (next.ok) router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {canActivate && !isTestAccount ? (
        <button
          type="button"
          className="vpa-btn line sm"
          disabled={pending}
          title="Sale de la prueba y puede usar sus productos. El cobro lo cargás con Cargar cobro."
          onClick={() => run(() => activateClientAccountAction(tenantId))}
        >
          Habilitar cuenta
        </button>
      ) : null}
      <button
        type="button"
        className={`vpa-btn sm ${isTestAccount ? "ink" : "soft"}`}
        disabled={pending}
        title="Cuenta del equipo para probar: todos los productos y la prueba nunca vence."
        onClick={() => run(() => setTestAccountAction(tenantId, !isTestAccount))}
      >
        {isTestAccount ? "Cuenta de prueba ✓" : "Marcar como cuenta de prueba"}
      </button>
      {result?.message ? (
        <span role="status" style={{ fontSize: 12, color: result.ok ? "inherit" : "var(--bad, #c0392b)" }}>
          {result.message}
        </span>
      ) : null}
    </div>
  );
}
