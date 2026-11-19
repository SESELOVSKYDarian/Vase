"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveTransferReceiptAction, rejectTransferReceiptAction } from "@/app/(platform)/app/admin/actions/transfer-receipts";

export type PendingReceipt = {
  id: string;
  tenantName: string;
  concept: string;
  due: number;
  fileName: string;
  isPdf: boolean;
  note: string | null;
  createdAt: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(value);

const when = (value: string) =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value));

function ReceiptRow({ receipt }: { receipt: PendingReceipt }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(receipt.due));
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileUrl = `/api/admin/billing-receipts/${receipt.id}`;

  const approve = () =>
    startTransition(async () => {
      const value = Number(amount.replace(",", "."));
      const result = await approveTransferReceiptAction(receipt.id, Number.isFinite(value) ? value : null);
      setMessage({ ok: result.ok, text: result.ok ? "Aprobado. Le avisamos al cliente." : result.message });
      if (result.ok) router.refresh();
    });

  const reject = () =>
    startTransition(async () => {
      const result = await rejectTransferReceiptAction(receipt.id, reason);
      setMessage({ ok: result.ok, text: result.ok ? "Rechazado. Le avisamos al cliente." : result.message });
      if (result.ok) router.refresh();
    });

  return (
    <li className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 md:grid-cols-[160px_minmax(0,1fr)]">
      <a href={fileUrl} target="_blank" rel="noreferrer" className="grid h-40 place-items-center overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] text-sm font-semibold">
        {receipt.isPdf ? (
          "Ver PDF"
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl} alt={`Comprobante de ${receipt.tenantName}`} className="h-full w-full object-contain" />
        )}
      </a>
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <p className="text-base font-semibold">{receipt.tenantName}</p>
          <p className="text-sm text-[var(--muted)]">
            {receipt.concept} · debe {money(receipt.due)} · subido {when(receipt.createdAt)}
          </p>
          {receipt.note ? <p className="mt-1 text-sm">“{receipt.note}”</p> : null}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
            Monto recibido
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              className="h-10 w-36 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm text-[var(--foreground)]"
            />
          </label>
          <button type="button" disabled={pending} onClick={approve} className="h-10 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-60">
            Aprobar
          </button>
          <button type="button" disabled={pending} onClick={() => setRejecting((value) => !value)} className="h-10 rounded-xl border border-[var(--border-subtle)] px-4 text-sm font-semibold">
            Rechazar
          </button>
          <a href={fileUrl} target="_blank" rel="noreferrer" className="h-10 content-center px-2 text-sm font-semibold text-[var(--accent)]">
            Abrir {receipt.fileName}
          </a>
        </div>
        {rejecting ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-60 flex-1 flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
              Motivo (le llega al cliente)
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ej: el monto no coincide, o no se ve la fecha"
                className="h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm text-[var(--foreground)]"
              />
            </label>
            <button type="button" disabled={pending} onClick={reject} className="h-10 rounded-xl bg-[var(--danger)] px-4 text-sm font-semibold text-white disabled:opacity-60">
              Confirmar rechazo
            </button>
          </div>
        ) : null}
        {message ? (
          <p role="status" className={`text-sm font-semibold ${message.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {message.text}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function TransferReceiptsReview({ receipts }: { receipts: PendingReceipt[] }) {
  if (receipts.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No hay comprobantes para revisar.</p>;
  }
  return (
    <ul className="grid gap-3">
      {receipts.map((receipt) => (
        <ReceiptRow key={receipt.id} receipt={receipt} />
      ))}
    </ul>
  );
}
