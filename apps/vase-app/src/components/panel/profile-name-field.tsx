"use client";

import { useCallback } from "react";
import { updateProfileNameAction } from "@/app/(platform)/app/settings/actions";
import { useAutosave } from "@/components/layout/save-status";

export function ProfileNameField({ name, email }: { name: string; email: string }) {
  const save = useCallback(async (value: string) => {
    if (value.trim().length < 1) return { ok: false, message: "Escribí tu nombre." };
    const data = new FormData();
    data.set("name", value);
    await updateProfileNameAction(data);
    return { ok: true };
  }, []);
  const schedule = useAutosave(save);

  return (
    <div className="vpa-form">
      <label className="vpa-fld">
        <span>Nombre</span>
        <input className="vpa-inp" name="name" required maxLength={120} defaultValue={name} onChange={(event) => schedule(event.target.value)} />
      </label>
      <label className="vpa-fld">
        <span>Correo</span>
        <input className="vpa-inp" readOnly value={email} />
      </label>
    </div>
  );
}
