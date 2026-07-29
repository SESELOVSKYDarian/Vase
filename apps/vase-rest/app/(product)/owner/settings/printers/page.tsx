"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";

type Route = { type: "STATION" | "CATEGORY" | "RECEIPT"; value: string };
type Printer = {
  id: string;
  name: string;
  enabled: boolean;
  connection:
    | { type: "NETWORK"; host: string; port: number }
    | { type: "WINDOWS_SPOOLER"; printerName: string };
  routes: Route[];
};
type Job = {
  id: string;
  printer_id: string;
  state: string;
  attempts: number;
  last_error: string | null;
};
type Option = { id: string; name: string };

export default function PrinterSettingsPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stations, setStations] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [editing, setEditing] = useState<Printer | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const client = readLocalEdgeClient();
    const [printerPayload, jobPayload, catalogPayload] = await Promise.all([
      client.printers(),
      client.printJobs(),
      client.state("CATALOG"),
    ]);
    const catalog = catalogPayload.aggregates[0]?.state ?? {};
    setPrinters(printerPayload.printers);
    setJobs(jobPayload.jobs);
    setStations(catalog.stations ?? []);
    setCategories(catalog.categories ?? []);
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
    const routes: Route[] = [
      ...form.getAll("stationRoute").map((value) => ({
        type: "STATION" as const, value: String(value),
      })),
      ...form.getAll("categoryRoute").map((value) => ({
        type: "CATEGORY" as const, value: String(value),
      })),
      ...(form.get("receiptRoute")
        ? [{ type: "RECEIPT" as const, value: "SALE_RECEIPT" }]
        : []),
    ];
    if (!routes.length) {
      setError("Seleccioná al menos una ruta de impresión.");
      return;
    }
    try {
      await readLocalEdgeClient().savePrinter({
        id: editing?.id ?? crypto.randomUUID(),
        name: String(form.get("name")),
        enabled: form.get("enabled") === "on",
        connection: type === "NETWORK"
          ? {
              type,
              host: String(form.get("endpoint")),
              port: Number(form.get("port") || 9100),
            }
          : { type, printerName: String(form.get("endpoint")) },
        routes,
      });
      event.currentTarget.reset();
      setEditing(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la impresora.");
    }
  }

  async function saveEnabled(printer: Printer, enabled: boolean) {
    setError("");
    try {
      await readLocalEdgeClient().savePrinter({ ...printer, enabled });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la impresora.");
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

  const routeLabel = (route: Route) => route.type === "RECEIPT"
    ? "Comprobante no fiscal"
    : (route.type === "STATION" ? stations : categories)
      .find((option) => option.id === route.value)?.name ?? route.value;

  return (
    <main className="product-content">
      <p className="eyebrow">Configuración local · Edge</p>
      <h1>Impresoras ESC/POS</h1>
      <p>
        La impresión se confirma únicamente cuando la impresora acepta los bytes.
        Los fallos permanecen en una cola durable.
      </p>
      <form className="inline-form" key={editing?.id ?? "new"} onSubmit={submit}>
        <label>Nombre
          <input name="name" defaultValue={editing?.name ?? ""} required />
        </label>
        <label>Conexión
          <select name="type" defaultValue={editing?.connection.type ?? "NETWORK"}>
            <option value="NETWORK">Red TCP</option>
            <option value="WINDOWS_SPOOLER">USB / Windows</option>
          </select>
        </label>
        <label>IP o nombre de impresora
          <input name="endpoint" required defaultValue={editing
            ? editing.connection.type === "NETWORK"
              ? editing.connection.host : editing.connection.printerName
            : ""} />
        </label>
        <label>Puerto TCP
          <input name="port" type="number" min="1" max="65535"
            defaultValue={editing?.connection.type === "NETWORK"
              ? editing.connection.port : 9100} />
        </label>
        <fieldset>
          <legend>Estaciones</legend>
          {stations.map((option) => <label key={option.id}>
            <input type="checkbox" name="stationRoute" value={option.id}
              defaultChecked={editing?.routes.some((route) =>
                route.type === "STATION" && route.value === option.id)} />
            {option.name}
          </label>)}
        </fieldset>
        <fieldset>
          <legend>Categorías</legend>
          {categories.map((option) => <label key={option.id}>
            <input type="checkbox" name="categoryRoute" value={option.id}
              defaultChecked={editing?.routes.some((route) =>
                route.type === "CATEGORY" && route.value === option.id)} />
            {option.name}
          </label>)}
        </fieldset>
        <label>
          <input type="checkbox" name="receiptRoute"
            defaultChecked={editing?.routes.some((route) =>
              route.type === "RECEIPT" && route.value === "SALE_RECEIPT")} />
          Comprobantes no fiscales
        </label>
        <label>
          <input type="checkbox" name="enabled" defaultChecked={editing?.enabled ?? true} />
          Habilitada
        </label>
        <button className="button button-primary">
          {editing ? "Guardar cambios" : "Guardar impresora"}
        </button>
        {editing
          ? <button type="button" className="button" onClick={() => setEditing(null)}>
              Cancelar edición
            </button>
          : null}
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">
        {printers.map((printer) => (
          <article className="ui-card" key={printer.id}>
            <h2>{printer.name}</h2>
            <strong>{printer.enabled ? "Habilitada" : "Deshabilitada"}</strong>
            <p>{printer.connection.type === "NETWORK"
              ? `${printer.connection.host}:${printer.connection.port}`
              : printer.connection.printerName}</p>
            <p>{printer.routes.map(routeLabel).join(" · ")}</p>
            <button className="button" onClick={() => setEditing(printer)}>Editar</button>
            <button className="button" onClick={() =>
              void saveEnabled(printer, !printer.enabled)}>
              {printer.enabled ? "Deshabilitar" : "Habilitar"}
            </button>
            <button className="button" disabled={!printer.enabled}
              onClick={() => void testPrinter(printer.id)}>
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
            {job.state === "FAILED"
              ? <button className="button" onClick={() =>
                  void readLocalEdgeClient().retryPrintJob(job.id)
                    .then(refresh)
                    .catch((cause) => setError(
                      cause instanceof Error ? cause.message : "No se pudo reintentar.",
                    ))}>
                  Reintentar
                </button>
              : null}
          </article>
        ))}
      </section>
    </main>
  );
}
