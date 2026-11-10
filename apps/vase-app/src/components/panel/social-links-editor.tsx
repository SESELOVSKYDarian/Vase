"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { SocialIcon } from "@/components/panel/social-icon";
import { MAX_IMAGE_INPUT_BYTES, toSquareWebp, uploadPublicImage } from "@/components/panel/upload-image";
import { MAX_SOCIAL_LINKS, SOCIAL_NETWORKS, type SocialLink, type SocialNetworkId } from "@/lib/business/social-links";

function newId() {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function AddSocialDialog({ onAdd, onClose }: { onAdd: (link: SocialLink) => void; onClose: () => void }) {
  const [network, setNetwork] = useState<SocialNetworkId | null>(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const meta = SOCIAL_NETWORKS.find((item) => item.id === network);

  const uploadIcon = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_INPUT_BYTES) {
      setError("Elegí una imagen de hasta 8 MB.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        setIconUrl(await uploadPublicImage(await toSquareWebp(file, 128, "contain", "red")));
      } catch {
        setError("No pudimos subir el logo.");
      }
    });
  };

  return (
    <div className="vpa-dialog">
      <div role="dialog" aria-label="Agregar red social" style={{ width: 540 }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div>
            <h3>{meta ? meta.label : "Agregar red social"}</h3>
            <p>{meta ? "Pegá el link de tu perfil." : "Elegí la red."}</p>
          </div>
          <button type="button" className="vpa-x" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {!meta ? (
          <div className="vpa-netgrid" role="listbox" aria-label="Redes">
            {SOCIAL_NETWORKS.map((item) => (
              <button key={item.id} type="button" role="option" aria-selected={false} className="vpa-netopt" onClick={() => setNetwork(item.id)}>
                <SocialIcon network={item.id} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            {network === "custom" ? (
              <div className="vpa-form">
                <label className="vpa-fld">
                  <span>Nombre de la red</span>
                  <input className="vpa-inp" value={label} maxLength={40} onChange={(event) => setLabel(event.target.value)} />
                </label>
                <div className="vpa-fld">
                  <span>Logo</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <SocialIcon network="custom" iconUrl={iconUrl} label={label} />
                    <button type="button" className="vpa-btn line sm" disabled={isPending} onClick={() => fileRef.current?.click()}>
                      {isPending ? "Subiendo..." : iconUrl ? "Cambiar" : "Subir logo"}
                    </button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => uploadIcon(event.target.files?.[0])} />
                </div>
              </div>
            ) : null}
            <label className="vpa-fld">
              <span>Link</span>
              <input className="vpa-inp" value={url} autoFocus placeholder={meta.placeholder} onChange={(event) => setUrl(event.target.value)} />
            </label>
            {error ? <p role="alert" style={{ color: "var(--red)" }}>{error}</p> : null}
            <div className="row">
              <button type="button" className="vpa-btn soft" style={{ marginRight: "auto" }} onClick={() => setNetwork(null)}>
                Volver
              </button>
              <button
                type="button"
                className="vpa-btn acc"
                disabled={!url.trim() || isPending}
                onClick={() => {
                  onAdd({ id: newId(), network: meta.id, url: url.trim(), label: network === "custom" ? label.trim() || null : null, iconUrl });
                  onClose();
                }}
              >
                Agregar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function SocialLinksEditor({
  links,
  readOnly,
  onChange,
}: {
  links: SocialLink[];
  readOnly: boolean;
  onChange: (links: SocialLink[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const labelOf = (link: SocialLink) =>
    link.network === "custom" ? link.label || "Mi red" : SOCIAL_NETWORKS.find((item) => item.id === link.network)?.label;

  return (
    <div className="vpa-fld" style={{ gridColumn: "1 / -1" }}>
      <span>Redes sociales</span>
      <div className="vpa-socials">
        {links.map((link) => (
          <div className="vpa-social" key={link.id}>
            <SocialIcon network={link.network} iconUrl={link.iconUrl} label={link.label} />
            <div className="vpa-g1">
              <b>{labelOf(link)}</b>
              <input
                className="vpa-inp"
                value={link.url}
                readOnly={readOnly}
                aria-label={`Link de ${labelOf(link)}`}
                onChange={(event) => onChange(links.map((item) => (item.id === link.id ? { ...item, url: event.target.value } : item)))}
              />
            </div>
            {readOnly ? null : (
              <button type="button" className="vpa-x" aria-label={`Quitar ${labelOf(link)}`} onClick={() => onChange(links.filter((item) => item.id !== link.id))}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        {readOnly || links.length >= MAX_SOCIAL_LINKS ? null : (
          <button type="button" className="vpa-addsocial" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden="true" />
            Agregar red social
          </button>
        )}
      </div>
      {adding ? <AddSocialDialog onAdd={(link) => onChange([...links, link])} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
