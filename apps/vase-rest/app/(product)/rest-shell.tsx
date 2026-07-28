"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { RestStaffRole } from "@vase/contracts";
import { navigationForRole } from "./navigation";

export function RestShell(props: {
  children: ReactNode;
  role: RestStaffRole;
  branchName: string;
  actorName: string;
  pendingOperations?: number;
}) {
  const [online, setOnline] = useState(true);
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

  return (
    <div className="product-shell">
      <aside className="product-sidebar">
        <a className="brand" href="/owner"><span className="brand-mark"><span /></span>vase <em>rest</em></a>
        <div className="branch-context">
          <small>Sucursal activa</small>
          <strong>{props.branchName}</strong>
        </div>
        <nav aria-label="Módulos operativos">
          {navigationForRole(props.role).map((item) => (
            <a key={item.key} href={item.href}>{item.label}</a>
          ))}
        </nav>
        <footer><span>{props.actorName}</span><small>{props.role}</small></footer>
      </aside>
      <div className="product-stage">
        {!online ? (
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
