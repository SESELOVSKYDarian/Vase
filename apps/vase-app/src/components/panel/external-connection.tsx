"use client";

import { useState, useTransition } from "react";
import { rotateConnectionTokenAction } from "@/app/(platform)/app/settings/product-source-actions";
import type { BusinessConnection } from "@/server/services/business-connection";

function when(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function CopyRow({ label, value, secret = false, note }: { label: string; value: string | null; secret?: boolean; note?: string }) {
  const [shown, setShown] = useState(!secret);
  const [copied, setCopied] = useState(false);
  const text = value ?? "No disponible";
  return (
    <div className="vpa-fld">
      <span>{label}</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="vpa-inp" readOnly value={shown || !value ? text : "••••••••••••••••••••"} aria-label={label} style={{ flex: "1 1 240px", minWidth: 0, fontFamily: "var(--font-ibm-plex-mono), ui-monospace, monospace", fontSize: 12.5 }} />
        {secret && value ? (
          <button type="button" className="vpa-btn line sm" onClick={() => setShown(!shown)}>
            {shown ? "Ocultar" : "Mostrar"}
          </button>
        ) : null}
        <button
          type="button"
          className="vpa-btn line sm"
          disabled={!value}
          onClick={() => {
            if (!value) return;
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            });
          }}
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      {note ? <small className="vpa-mut" style={{ fontSize: 12 }}>{note}</small> : null}
    </div>
  );
}

/**
 * Mi negocio › Tu sistema externo: estado de la conexión y los datos que necesita quien programa el
 * sistema de gestión. Los datos vienen de Business (ahí llegan los productos).
 */
export function ExternalConnection({ connection, canEdit, systemName }: { connection: BusinessConnection | null; canEdit: boolean; systemName: string }) {
  const [token, setToken] = useState(connection?.token ?? null);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!connection) {
    return (
      <div className="vpa-hubsend">
        <b>Estado de la conexión</b>
        <span className="vpa-mut" style={{ fontSize: 12.5 }}>
          No pudimos traer los datos de la conexión desde Vase Business. Si todavía no tenés Business, la conexión se arma cuando lo actives.
        </span>
      </div>
    );
  }

  const last = when(connection.stats.lastSyncAt);
  const receiving = connection.stats.products > 0;

  return (
    <div className="vpa-hubconn">
      <div className="vpa-hubsend">
        <b>Estado de la conexión</b>
        <div className="vpa-hrow" style={{ background: "var(--card)" }}>
          <span className={receiving ? "vpa-hubdot on" : "vpa-hubdot"} aria-hidden="true" />
          <div className="vpa-g1">
            <b>{receiving ? "Conectado · recibiendo productos" : "Esperando el primer envío de tu sistema"}</b>
            <span>{receiving ? `Última vez que ${systemName} mandó datos: ${last ?? "sin fecha"}` : "Cuando tu sistema mande productos, los vas a ver acá."}</span>
          </div>
          <span className={receiving ? "vpa-tag g" : "vpa-tag"}>{receiving ? "Al día" : "Sin datos"}</span>
        </div>
        <div className="vpa-kpis">
          <div className="vpa-kpi">
            <span className="vpa-kt">
              <small>Productos que llegan</small>
              <b>{connection.stats.products.toLocaleString("es-AR")}</b>
              <em>de {systemName}</em>
            </span>
          </div>
          <div className="vpa-kpi">
            <span className="vpa-kt">
              <small>Último envío</small>
              <b>{last ?? "—"}</b>
              <em>{receiving ? "precios y stock" : "todavía ninguno"}</em>
            </span>
          </div>
        </div>
        <span className="vpa-mut" style={{ fontSize: 12.5 }}>
          Si en Business marcás un producto con “No pisar mis cambios”, tu sistema no le cambia nombre, descripción, marca ni precio.
        </span>
      </div>

      <div className="vpa-hubsend">
        <b>Datos para quien programa tu sistema</b>
        <span className="vpa-mut" style={{ fontSize: 12.5 }}>Pasáselos a la persona o empresa que maneja {systemName}.</span>
        {canEdit ? (
          <>
            <CopyRow label="Dirección de conexión" value={connection.syncUrl} note={connection.pingUrl ? `Prueba: ${connection.pingUrl.replace(/^https?:\/\//, "")}` : undefined} />
            <CopyRow label="Clave para tu sistema" value={token} secret note="Es como una contraseña: pasásela solo a quien programa tu sistema." />
            {connection.compatibility.consumerKey ? (
              <details>
                <summary className="vpa-mut" style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}>Si tu sistema pide Dominio, Consumer Key y Consumer Secret</summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  <CopyRow label="Dominio" value={connection.compatibility.domain} />
                  <CopyRow label="Consumer Key" value={token} secret />
                  <CopyRow label="Consumer Secret" value={connection.compatibility.consumerSecret} secret />
                </div>
              </details>
            ) : null}
            {confirm ? (
              <div className="vpa-notice2" style={{ background: "var(--warnsoft)" }}>
                <b style={{ color: "var(--warn)" }}>¿Cambiar la clave?</b>
                <span>La clave actual deja de funcionar al instante. Tu sistema no va a poder mandar productos hasta que le carguen la nueva.</span>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button type="button" className="vpa-btn soft sm" disabled={pending} onClick={() => setConfirm(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="vpa-btn red sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await rotateConnectionTokenAction();
                        if (result.ok && result.token) setToken(result.token);
                        setMessage({ ok: result.ok, text: result.message });
                        setConfirm(false);
                      })
                    }
                  >
                    {pending ? "Cambiando…" : "Cambiar la clave"}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="vpa-btn line sm" style={{ alignSelf: "flex-start", color: "var(--red)" }} onClick={() => setConfirm(true)}>
                Cambiar la clave
              </button>
            )}
            {message ? (
              <span role="status" className="vpa-mut" style={{ fontSize: 12.5, color: message.ok ? undefined : "var(--red)" }}>
                {message.text}
              </span>
            ) : null}
          </>
        ) : (
          <span className="vpa-mut" style={{ fontSize: 12.5 }}>Solo el Dueño puede ver la dirección y la clave.</span>
        )}
      </div>
    </div>
  );
}
