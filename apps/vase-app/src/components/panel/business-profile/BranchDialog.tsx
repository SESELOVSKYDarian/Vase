"use client";

// Parte de business-profile.tsx: BranchDialog.
import { useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { saveBranchAction } from "@/app/(platform)/app/settings/business-actions";
import { ProfileBranch } from "./LogoPicker";

export function BranchDialog({ branch, onClose }: { branch: ProfileBranch | null; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isMain, setIsMain] = useState(branch?.isMain ?? false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const data = new FormData(formRef.current!);
    setError(null);
    startTransition(async () => {
      const result = await saveBranchAction({
        id: branch?.id,
        name: String(data.get("name") ?? ""),
        address: String(data.get("address") ?? ""),
        phone: String(data.get("phone") ?? ""),
        hours: String(data.get("hours") ?? ""),
        isMain,
      });
      if (result.ok) onClose();
      else setError(result.message);
    });
  };

  return (
    <div className="vpa-dialog">
      <form ref={formRef} onSubmit={submit} role="dialog" aria-label={branch ? "Editar sucursal" : "Nueva sucursal"} style={{ width: 520 }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div>
            <h3>{branch ? "Editar sucursal" : "Nueva sucursal"}</h3>
            <p>Aparece en tu tienda, tu asistente y tus locales.</p>
          </div>
          <button type="button" className="vpa-x" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <label className="vpa-fld">
          <span>Nombre</span>
          <input className="vpa-inp" name="name" required minLength={2} maxLength={120} defaultValue={branch?.name} placeholder="Por ejemplo: Local Palermo" />
        </label>
        <label className="vpa-fld">
          <span>Dirección</span>
          <input className="vpa-inp" name="address" required minLength={3} maxLength={191} defaultValue={branch?.address} placeholder="Calle, número y ciudad" />
        </label>
        <div className="vpa-form">
          <label className="vpa-fld">
            <span>Teléfono</span>
            <input className="vpa-inp" name="phone" maxLength={40} defaultValue={branch?.phone} />
          </label>
          <label className="vpa-fld">
            <span>Horarios</span>
            <input className="vpa-inp" name="hours" maxLength={120} defaultValue={branch?.hours} placeholder="Lunes a viernes de 9 a 18" />
          </label>
        </div>
        <button type="button" className="vpa-nall" role="checkbox" aria-checked={isMain} onClick={() => setIsMain(!isMain)}>
          <span className={isMain ? "vpa-cbx on" : "vpa-cbx"} aria-hidden="true">
            ✓
          </span>
          Es la sucursal principal
        </button>
        {error ? <p role="alert" style={{ color: "var(--red)" }}>{error}</p> : null}
        <div className="row">
          <button type="button" className="vpa-btn soft" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="vpa-btn acc" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar sucursal"}
          </button>
        </div>
      </form>
    </div>
  );
}
