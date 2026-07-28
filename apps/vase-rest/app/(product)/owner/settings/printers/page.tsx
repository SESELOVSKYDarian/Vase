"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";

type Printer = {
  id: string;
  name: string;
  enabled: boolean;
  connection:
    | { type: "NETWORK"; host: string; port: number }
    | { type: "WINDOWS_SPOOLER"; printerName: string };
  routes: Array<{ type: "STATION" | "CATEGORY" | "RECEIPT"; value: string }>;
};
type Job = {
  id: string;
  printer_id: string;
  state: string;
  attempts: number;
  last_error: string | null;
};

export default function PrinterSettingsPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const client = readLocalEdgeClient();
    const [printerPayload, jobPayload] = await Promise.all([
      client.printers(),
      client.printJobs(),
    ]);
    setPrinters(printerPayload.printers);
    setJobs(jobPayload.jobs);
  }, []);
  useEffect(() => {
    void refresh().catch((cause) => setError(
      cause instanceof Error ? cause.message : "No se pudo acceder a Edge.",
    ));
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const type = String(form.get("type"));
    const routeType = String(form.get("routeType")) as "STATION" | "CATEGORY" | "RECEIPT";
    try {
      await readLocalEdgeClient().savePrinter({
        id: crypto.randomUUID(),
        name: String(form.get("name")),
        enabled: true,
        connection: type === "NETWORK"
          ? {
              type,
              host: String(form.get("endpoint")),
              port: Number(form.get("port") || 9100),
            }
          : { type, printerName: String(form.get("endpoint")) },
        routes: [{ type: routeType, value: String(form.get("routeValue")) }],
      });
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la impresora.");
    }
  }

  async function testPrinter(id: string) {
    setError("");
    try {
      await readLocalEdgeClient().testPrinter(id, crypto.randomUUID());
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo encolar la prueba.");
    }
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Configuración local · Edge</p>
      <h1>Impresoras ESC/POS</h1>
      <p>La impresión se confirma únicamente cuando la impresora acepta los bytes. Los fallos quedan en cola.</p>
      <form className="inline-form" onSubmit={submit}>
        <label>Nombre<input name="name" required /></label>
        <label>Conexión
          <select name="type">
            <option value="NETWORK">Red TCP</option>
            <option value="WINDOWS_SPOOLER">USB / Windows</option>
          </select>
        </label>
        <label>IP o nombre de impresora<input name="endpoint" required /></label>
        <label>Puerto TCP<input name="port" type="number" min="1" max="65535" defaultValue="9100" /></label>
        <label>Tipo de ruta
          <select name="routeType">
            <option value="STATION">Estación</option>
            <option value="CATEGORY">Categoría</option>
            <option value="RECEIPT">Comprobante</option>
          </select>
        </label>
        <label>ID de ruta<input name="routeValue" required /></label>
        <button className="button button-primary">Guardar impresora</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">
        {printers.map((printer) => (
          <article className="ui-card" key={printer.id}>
            <h2>{printer.name}</h2>
            <p>{printer.connection.type === "NETWORK"
              ? `${printer.connection.host}:${printer.connection.port}`
              : printer.connection.printerName}</p>
            <p>{printer.routes.map((route) => `${route.type}: ${route.value}`).join(" · ")}</p>
            <button className="button" onClick={() => void testPrinter(printer.id)}>
              Imprimir prueba real
            </button>
          </article>
        ))}
      </div>
      <section className="ui-card">
        <h2>Cola de impresión</h2>
        {jobs.length === 0 ? <p>Sin trabajos registrados.</p> : jobs.map((job) => (
          <article key={job.id}>
            <strong>{job.state}</strong> · {job.printer_id} · intento {job.attempts}
            {job.last_error ? <code>{job.last_error}</code> : null}
            {job.state === "FAILED" ? (
              <button className="button" onClick={() =>
                void readLocalEdgeClient().retryPrintJob(job.id).then(refresh).catch((cause) =>
                  setError(cause instanceof Error ? cause.message : "No se pudo reintentar."))}>
                Reintentar
              </button>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
