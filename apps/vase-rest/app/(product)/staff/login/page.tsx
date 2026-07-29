"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  authenticateLocalStaff,
  edgePairingSchema,
} from "@/lib/edge/local-edge-client";

export default function StaffLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const pairing = localStorage.getItem("vase-rest-device");
    if (!pairing) {
      setError("Este equipo todavía no fue enrolado por el dueño.");
      return;
    }
    let device;
    try {
      device = edgePairingSchema.parse(JSON.parse(pairing));
    } catch {
      setError("La configuración local del dispositivo es inválida.");
      return;
    }
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const payload = await authenticateLocalStaff({
        pairing: device,
        employeeCode: String(form.get("employeeCode") ?? ""),
        pin: String(form.get("pin") ?? ""),
      });
      sessionStorage.setItem("vase-rest-staff-session", JSON.stringify(payload));
      router.replace("/staff");
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "REST_EDGE_STAFF_LOGIN_FAILED";
      setError(code === "REST_PIN_INVALID"
        ? "Código o PIN incorrecto."
        : code === "REST_EDGE_UNAVAILABLE"
          ? "El servicio local de la sucursal no está disponible."
          : "No se pudo validar este equipo con el servicio local.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="staff-login">
      <section>
        <a className="brand" href="/"><span className="brand-mark"><span /></span>vase <em>rest</em></a>
        <p className="eyebrow">Acceso rápido de equipo</p>
        <h1>Entrá a tu turno</h1>
        <form onSubmit={submit}>
          <label>Código de empleado<input name="employeeCode" autoComplete="username" required /></label>
          <label>PIN individual<input name="pin" type="password" inputMode="numeric" autoComplete="current-password" minLength={4} maxLength={8} required /></label>
          <button className="button button-primary" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
          {error ? <p role="alert">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
