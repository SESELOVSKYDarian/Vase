"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { RestStaffRole } from "@vase/contracts";
import { navigationForRole } from "./navigation";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";
import type { EdgeConnectionKind } from "@/lib/edge/connection-state";

export function RestShell(props: {
  children: ReactNode;
  role: RestStaffRole;
  branchName: string;
  actorName: string;
  pendingOperations?: number;
  branches?: Array<{ id: string; name: string }>;
  activeBranchId?: string;
  onBranchChange?: (branchId: string) => void;
}) {
  const [online, setOnline] = useState(true);
  const [edgeState, setEdgeState] = useState<EdgeConnectionKind | null>(null);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (props.role === "OWNER") return;
    let active = true;
    const probe = async () => {
      try {
        const state = await readLocalEdgeClient().probe();
        if (active) setEdgeState(state.kind);
      } catch {
        if (active) setEdgeState("UNAVAILABLE");
      }
    };
    void probe();
    const interval = setInterval(() => void probe(), 5_000);
    return () => { active = false; clearInterval(interval); };
  }, [props.role]);

  return (
    <div className="product-shell">
      <aside className="product-sidebar">
        <a className="brand" href="/owner"><span className="brand-mark"><span /></span>vase <em>rest</em></a>
        <div className="branch-context">
          <small>Sucursal activa</small>
          {props.branches?.length ? (
            <select
              aria-label="Sucursal activa"
              value={props.activeBranchId}
              onChange={(event) => props.onBranchChange?.(event.target.value)}
            >
              {props.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          ) : <strong>{props.branchName}</strong>}
        </div>
        <nav aria-label="Módulos operativos">
          {navigationForRole(props.role).map((item) => (
            <a key={item.key} href={item.href}>{item.label}</a>
          ))}
        </nav>
        <footer><span>{props.actorName}</span><small>{props.role}</small></footer>
      </aside>
      <div className="product-stage">
        {edgeState === "UNAVAILABLE" || edgeState === "CERTIFICATE_MISMATCH" || edgeState === "IDENTITY_MISMATCH" ? (
          <div className="connectivity-banner" role="alert">
            <strong>Edge no autenticado</strong>
            <span>La operación está bloqueada para evitar dividir el estado de la sucursal.</span>
          </div>
        ) : edgeState === "STALE" ? (
          <div className="connectivity-banner pending" role="status">
            <strong>Cloud desactualizado</strong>
            <span>La sucursal continúa en Edge y conserva datos pendientes de sincronización.</span>
          </div>
        ) : !online ? (
          <div className="connectivity-banner" role="status">
            <strong>Sin conexión</strong>
            <span>La operación continúa en Edge. Se sincronizará al volver la red.</span>
          </div>
        ) : props.pendingOperations ? (
          <div className="connectivity-banner pending" role="status">
            <strong>Datos pendientes</strong>
            <span>{props.pendingOperations} operaciones esperando confirmación cloud.</span>
          </div>
        ) : null}
        {props.children}
      </div>
    </div>
  );
}
