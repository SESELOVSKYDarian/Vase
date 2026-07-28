"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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
    let device: { globalTenantId: string; branchId: string; deviceId: string };
    try {
      device = JSON.parse(pairing);
    } catch {
      setError("La configuración local del dispositivo es inválida.");
      return;
    }
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/access/pin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...device,
        employeeCode: form.get("employeeCode"),
        pin: form.get("pin"),
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error === "REST_PIN_INVALID"
        ? "Código o PIN incorrecto."
        : payload.error ?? "No se pudo iniciar el turno.");
      return;
    }
    sessionStorage.setItem("vase-rest-staff-session", JSON.stringify(payload));
    router.replace("/staff");
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
