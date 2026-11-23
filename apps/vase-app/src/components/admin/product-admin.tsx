"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setFeatureForEveryoneAction, setPlanPriceAction, setProductPriceAction, type ProductActionResult } from "@/app/(platform)/app/admin/actions/product-admin";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ProductActionResult | null>(null);
  const run = (call: () => Promise<ProductActionResult>) => {
    setResult(null);
    start(async () => {
      const next = await call().catch(() => ({ ok: false, message: "No pudimos guardar." }));
      setResult(next);
      if (next.ok) router.refresh();
    });
  };
  return { pending, result, run };
}

const TYPE_LABEL: Record<string, string> = { MONTHLY: "por mes", YEARLY: "por año", ONE_TIME: "una vez" };

/** Precio de un plan (o del producto si no tiene planes), editable en el lugar. */
export function PriceEditor({
  productId,
  submoduleId,
  price,
  type,
}: {
  productId: string;
  submoduleId: string | null;
  price: number | null;
  type: string | null;
}) {
  const { pending, result, run } = useRun();
  const [value, setValue] = useState(price === null ? "" : String(price));
  const [kind, setKind] = useState(type ?? "MONTHLY");
  const changed = value !== (price === null ? "" : String(price)) || kind !== (type ?? "MONTHLY");
  return (
    <form
      className="adm-price"
      onSubmit={(event) => {
        event.preventDefault();
        const amount = Number(value.replace(/\./g, "").replace(",", "."));
        run(() =>
          submoduleId
            ? setPlanPriceAction({ productId, submoduleId, price: amount, type: kind })
            : setProductPriceAction({ productId, price: amount, type: kind }),
        );
      }}
    >
      <input className="vpa-inp" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Precio" aria-label="Precio en pesos" />
      <select className="vpa-inp" style={{ width: 120 }} value={kind} onChange={(event) => setKind(event.target.value)} aria-label="Cada cuánto">
        {Object.entries(TYPE_LABEL).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <button type="submit" className="vpa-btn line sm" disabled={pending || !changed || !value}>
        {pending ? "…" : "Guardar"}
      </button>
      {result ? <span className={result.ok ? "vpa-mut" : "low"} style={{ fontSize: 12 }}>{result.ok ? "Guardado" : result.message}</span> : null}
    </form>
  );
}

/** Interruptor "para todos" de una característica. */
export function FeatureSwitch({ productId, featureKey, active }: { productId: string; featureKey: string; active: boolean }) {
  const { pending, result, run } = useRun();
  const [on, setOn] = useState(active);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        className={`vpa-tog${on ? "" : " off"}`}
        aria-pressed={on}
        aria-label={on ? "Apagar para todos" : "Prender para todos"}
        disabled={pending}
        onClick={() => {
          const next = !on;
          setOn(next);
          run(() => setFeatureForEveryoneAction({ productId, key: featureKey, active: next }));
        }}
      />
      {result && !result.ok ? <span className="low" style={{ fontSize: 12 }}>{result.message}</span> : null}
    </span>
  );
}
