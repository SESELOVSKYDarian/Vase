"use client";

import Image from "next/image";
import { useActionState } from "react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { checkOpenWaConnectionAction, refreshOpenWaQrAction } from "@/app/(platform)/app/owner/labs/actions";

const initialState: LabsActionState = {};

type OpenWaQrCardProps = {
  channelId: string;
  accountLabel: string;
  qrImageDataUrl?: string;
  connectionState?: string;
  failureReason?: string;
};

export function OpenWaQrCard({ channelId, accountLabel, qrImageDataUrl, connectionState, failureReason }: OpenWaQrCardProps) {
  const [qrState, qrAction] = useActionState(refreshOpenWaQrAction, initialState);
  const [statusState, statusAction] = useActionState(checkOpenWaConnectionAction, initialState);

  return (
    <div className="rounded-lg border border-[color-mix(in_srgb,var(--danger)_26%,var(--border-subtle))] bg-[var(--danger-soft)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">Baileys QR - {accountLabel}</p>
        <p className="text-xs text-[var(--muted)]">Estado: {connectionState ?? "SIN_VERIFICAR"}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={qrAction}>
          <input type="hidden" name="channelId" value={channelId} />
          <button className="labs-button bg-[var(--danger)] text-[var(--background)]">
            Generar / Refrescar QR
          </button>
        </form>
        <form action={statusAction}>
          <input type="hidden" name="channelId" value={channelId} />
          <button className="labs-button labs-button-secondary">
            Verificar conexion
          </button>
        </form>
      </div>

      <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
        {qrImageDataUrl ? (
          <Image src={qrImageDataUrl} alt="QR de conexion Baileys" width={224} height={224} className="mx-auto rounded-xl border border-[var(--border-subtle)]" />
        ) : (
          <p className="text-sm text-[var(--muted)]">Aun no hay QR generado. Usa el boton para crear uno y escanearlo.</p>
        )}
      </div>

      {qrState.success ? <p className="mt-3 text-sm text-[var(--success)]">{qrState.success}</p> : null}
      {qrState.info ? <p className="mt-3 text-sm text-[var(--muted)]">{qrState.info}</p> : null}
      {qrState.error ? <p className="mt-3 text-sm text-[var(--danger)]">{qrState.error}</p> : null}
      {statusState.success ? <p className="mt-2 text-sm text-[var(--success)]">{statusState.success}</p> : null}
      {statusState.info ? <p className="mt-2 text-sm text-[var(--muted)]">{statusState.info}</p> : null}
      {statusState.error ? <p className="mt-2 text-sm text-[var(--danger)]">{statusState.error}</p> : null}
      {failureReason ? <p className="mt-2 text-xs text-[var(--danger)]">Detalle tecnico: {failureReason}</p> : null}
    </div>
  );
}
