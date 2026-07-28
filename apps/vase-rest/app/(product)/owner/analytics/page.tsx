"use client";

import { useCallback, useEffect, useState } from "react";
import { readCloudStaffToken } from "@/lib/edge/local-edge-client";

type BranchAnalytics = {
  id: string;
  name: string;
  orders: number;
  collected: string;
  refunded: string;
  netCollected: string;
  fiscalAuthorized: string;
  customerAccountBalance: string;
  edgeState: string;
};

type Report = {
  totals: Omit<BranchAnalytics, "id" | "name" | "edgeState"> & {
    unresolvedEdges: number;
  };
  branches: BranchAnalytics[];
};

export default function AnalyticsPage() {
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA").format(new Date()));
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const token = readCloudStaffToken();
    const response = await fetch(`/api/v1/analytics?date=${encodeURIComponent(date)}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setReport(payload.report);
  }, [date]);

  useEffect(() => {
    void load().catch((cause) => setError(String(cause)));
  }, [load]);

  async function download() {
    const token = readCloudStaffToken();
    const response = await fetch(
      `/api/v1/analytics?date=${encodeURIComponent(date)}&format=csv`,
      { headers: token ? { authorization: `Bearer ${token}` } : {} },
    );
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error);
      return;
    }
    const href = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `vase-rest-analytics-${date}.csv`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Analítica conciliada</p>
      <h1>Rendimiento operativo</h1>
      <div className="inline-form">
        <label>Fecha<input type="date" value={date}
          onChange={(event) => setDate(event.target.value)} /></label>
        <button className="button" type="button" onClick={() => void download()}>
          Exportar CSV
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {report ? (
        <>
          <div className="metric-grid">
            <article><span>Ventas netas</span><strong>ARS {report.totals.netCollected}</strong></article>
            <article><span>Facturación autorizada</span><strong>ARS {report.totals.fiscalAuthorized}</strong></article>
            <article><span>Órdenes</span><strong>{report.totals.orders}</strong></article>
            <article><span>Edges con atención</span><strong>{report.totals.unresolvedEdges}</strong></article>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sucursal</th><th>Órdenes</th><th>Neto</th><th>Reintegros</th><th>Fiscal</th><th>Cuenta corriente</th><th>Edge</th></tr></thead>
              <tbody>{report.branches.map((branch) => (
                <tr key={branch.id}>
                  <td>{branch.name}</td><td>{branch.orders}</td>
                  <td>ARS {branch.netCollected}</td><td>ARS {branch.refunded}</td>
                  <td>ARS {branch.fiscalAuthorized}</td>
                  <td>ARS {branch.customerAccountBalance}</td><td>{branch.edgeState}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}
