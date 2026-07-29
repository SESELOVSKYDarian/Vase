"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Branch = { id: string; name: string };
type Device = {
  id: string; branchId: string; name: string; kind?: string; status: string;
  agentVersion?: string | null; pendingEventCount?: number; failedPrintJobCount?: number;
};
type Enrollment = {
  id: string; branchId: string; kind: string; name: string; expiresAt: string;
};

export default function DeviceSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [edges, setEdges] = useState<Device[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [issued, setIssued] = useState<{ code: string; expiresAt: string } | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const [branchResponse, deviceResponse] = await Promise.all([
      fetch("/api/v1/branches", { cache: "no-store" }),
      fetch("/api/v1/devices/enrollments", { cache: "no-store" }),
    ]);
    const [branchPayload, devicePayload] = await Promise.all([
      branchResponse.json(), deviceResponse.json(),
    ]);
    if (!branchResponse.ok) throw new Error(branchPayload.error);
    if (!deviceResponse.ok) throw new Error(devicePayload.error);
    setBranches(branchPayload.branches);
    setDevices(devicePayload.devices);
    setEdges(devicePayload.edges);
    setEnrollments(devicePayload.enrollments);
  }, []);
  useEffect(() => { void load().catch((cause) => setError(String(cause))); }, [load]);

  async function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/devices/enrollments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branchId: form.get("branchId"),
        kind: form.get("kind"),
        name: form.get("name"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    setIssued(payload.enrollment);
    await load();
  }

  async function revoke(target: "DEVICE" | "EDGE" | "ENROLLMENT", id: string) {
    if (!confirm("¿Revocar este acceso? La acción bloquea futuras conexiones.")) return;
    const response = await fetch("/api/v1/devices/enrollments", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target, id }),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    await load();
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Seguridad local</p><h1>Dispositivos y Vase Rest Edge</h1>
      <form className="inline-form" onSubmit={issue}>
        <label>Nombre<input name="name" minLength={2} required /></label>
        <label>Sucursal<select name="branchId" required><option value="">Seleccionar</option>
          {branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}
        </select></label>
        <label>Tipo<select name="kind"><option value="EDGE">Servidor Edge</option><option value="DEVICE">Terminal</option></select></label>
        <button className="button button-primary">Generar código de 10 minutos</button>
      </form>
      {issued ? <section className="ui-card" role="status">
        <h2>Código de enrolamiento</h2><code>{issued.code}</code>
        <p>Vence {new Date(issued.expiresAt).toLocaleString("es-AR")}. No se volverá a mostrar.</p>
      </section> : null}
      {error ? <p role="alert">{error}</p> : null}
      <h2>Edges</h2>
      <div className="catalog-grid">{edges.map((edge) => <article className="ui-card" key={edge.id}>
        <strong>{edge.name}</strong><span>{edge.status} · agente {edge.agentVersion ?? "sin heartbeat"}</span>
        <small>{edge.pendingEventCount ?? 0} eventos · {edge.failedPrintJobCount ?? 0} impresiones fallidas</small>
        {edge.status === "ACTIVE" ? <button className="button" onClick={() => void revoke("EDGE", edge.id)}>Revocar Edge</button> : null}
      </article>)}</div>
      <h2>Terminales</h2>
      <div className="catalog-grid">{devices.map((device) => <article className="ui-card" key={device.id}>
        <strong>{device.name}</strong><span>{device.kind} · {device.status}</span>
        {device.status === "ACTIVE" ? <button className="button" onClick={() => void revoke("DEVICE", device.id)}>Revocar terminal</button> : null}
      </article>)}</div>
      <h2>Códigos pendientes</h2>
      <div className="branch-list">{enrollments.map((enrollment) => <article key={enrollment.id}>
        <strong>{enrollment.name}</strong><span>{enrollment.kind} · vence {new Date(enrollment.expiresAt).toLocaleString("es-AR")}</span>
        <button className="button" onClick={() => void revoke("ENROLLMENT", enrollment.id)}>Revocar código</button>
      </article>)}</div>
    </main>
  );
}
