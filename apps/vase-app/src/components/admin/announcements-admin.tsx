"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, ImagePlus, Mail, MailCheck, Pause, Play, Plus, Search, Trash2, X } from "lucide-react";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  searchAnnouncementUsersAction,
  sendAnnouncementEmailNowAction,
  sendAnnouncementTestAction,
  setAnnouncementActiveAction,
  type AnnouncementUserOption,
} from "@/app/(platform)/app/admin/actions/announcements";
import { AdminModal } from "@/components/admin/client-ficha";
import { AnnouncementIcon, AnnouncementModal } from "@/components/announcements/announcement-modal";
import { ANNOUNCEMENT_ACCENTS, ANNOUNCEMENT_ICONS, ANNOUNCEMENT_SURFACES, accentOf, type AnnouncementView } from "@/lib/announcements";

/** Achica la imagen en el navegador (máx. 1200 px de ancho) y la pasa a webp. */
async function shrinkImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("No pudimos leer la imagen."));
      node.src = url;
    });
    const scale = Math.min(1, 1200 / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Elegir personas puntuales: buscador por nombre, mail o negocio, y las elegidas como chips. */
function PeoplePicker({ value, onChange }: { value: AnnouncementUserOption[]; onChange: (next: AnnouncementUserOption[]) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnnouncementUserOption[]>([]);
  const [searching, startSearch] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chosen = new Set(value.map((user) => user.id));

  const onQuery = (next: string) => {
    setQuery(next);
    if (timer.current) clearTimeout(timer.current);
    if (next.trim().length < 2) return setResults([]);
    timer.current = setTimeout(() => {
      startSearch(async () => setResults(await searchAnnouncementUsersAction(next)));
    }, 250);
  };

  return (
    <div className="ann-people">
      {value.length ? (
        <div className="ann-picked">
          {value.map((user) => (
            <span key={user.id} className="ann-pill">
              {user.name}
              <button type="button" aria-label={`Quitar a ${user.name}`} onClick={() => onChange(value.filter((item) => item.id !== user.id))}>
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <label className="ann-search">
        <Search size={15} aria-hidden="true" />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Buscá por nombre, mail o negocio" aria-label="Buscar personas" />
      </label>
      {query.trim().length >= 2 ? (
        <ul className="ann-results" role="listbox" aria-label="Personas encontradas">
          {results.length ? (
            results.map((user) => {
              const on = chosen.has(user.id);
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    className={on ? "on" : undefined}
                    onClick={() => onChange(on ? value.filter((item) => item.id !== user.id) : [...value, user])}
                  >
                    <span className="vpa-g1">
                      <b>{user.name}</b>
                      <span>
                        {user.email}
                        {user.detail ? ` · ${user.detail}` : ""}
                      </span>
                    </span>
                    {on ? <Check size={15} aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })
          ) : (
            <li className="ann-none">{searching ? "Buscando…" : "No encontramos a nadie con eso."}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function NewAnnouncementButton() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"icon" | "image">("icon");
  const [icon, setIcon] = useState<string>("sparkles");
  const [image, setImage] = useState<string | null>(null);
  const [accent, setAccent] = useState<string>("green");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [surfaces, setSurfaces] = useState<string[]>(["app"]);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [audience, setAudience] = useState<"all" | "people">("all");
  const [people, setPeople] = useState<AnnouncementUserOption[]>([]);

  const reset = () => {
    setAudience("all");
    setPeople([]);
    setTitle("");
    setBody("");
    setMode("icon");
    setIcon("sparkles");
    setImage(null);
    setAccent("green");
    setCtaLabel("");
    setCtaUrl("");
    setSurfaces(["app"]);
    setStartsAt("");
    setEndsAt("");
    setSendEmail(false);
    setError(null);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Elegí una imagen (JPG, PNG o WebP).");
    try {
      setImage(await shrinkImage(file));
      setError(null);
    } catch {
      setError("No pudimos leer esa imagen. Probá con otra.");
    }
  };

  const preview: AnnouncementView = {
    id: "preview",
    title: title.trim() || "Título del anuncio",
    body: body.trim() || "Acá va el texto. Contá la novedad en dos o tres líneas.",
    ctaLabel: ctaUrl.trim() ? ctaLabel.trim() || "Ver más" : null,
    ctaUrl: ctaUrl.trim() || null,
    icon: mode === "icon" ? icon : null,
    accent,
    imageUrl: mode === "image" ? image : null,
  };

  const submit = () =>
    start(async () => {
      if (audience === "people" && !people.length) return setError("Elegí al menos una persona, o marcá Todos.");
      const result = await createAnnouncementAction({
        userIds: audience === "people" ? people.map((user) => user.id) : [],
        title,
        body,
        ctaLabel,
        ctaUrl,
        icon: mode === "icon" ? icon : null,
        accent,
        imageData: mode === "image" ? image : null,
        surfaces,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        sendEmail,
      });
      if (!result.ok) return setError(result.message ?? "No pudimos publicarlo.");
      reset();
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <button type="button" className="vpa-btn acc" onClick={() => setOpen(true)}>
        <Plus size={15} aria-hidden="true" />
        Nuevo anuncio
      </button>
      {open ? (
        <AdminModal
          title="Nuevo anuncio"
          subtitle="Sale como ventana en los productos que elijas y en las notificaciones."
          onClose={() => setOpen(false)}
          footer={
            <>
              {error ? (
                <p className="adm-msg err" role="alert">
                  {error}
                </p>
              ) : null}
              <span style={{ flex: 1 }} />
              <button type="button" className="vpa-btn soft" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="vpa-btn acc" onClick={submit} disabled={pending}>
                <Check size={14} aria-hidden="true" />
                {pending ? "Publicando…" : "Publicar"}
              </button>
            </>
          }
        >
          <div className="ann-compose">
            <div className="ann-form">
              <label className="vpa-fld">
                <span>Título</span>
                <input className="vpa-inp" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Ej.: Llegó el catálogo con IA" autoFocus />
              </label>
              <label className="vpa-fld">
                <span>Texto</span>
                <textarea className="vpa-inp adm-area" rows={3} value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} placeholder="Qué cambia y por qué le sirve." />
              </label>

              <div className="vpa-fld">
                <span>Imagen</span>
                <div className="adm-choice">
                  <button type="button" className={mode === "icon" ? "on" : undefined} onClick={() => setMode("icon")}>
                    <b>Ícono</b>
                  </button>
                  <button type="button" className={mode === "image" ? "on" : undefined} onClick={() => setMode("image")}>
                    <b>Foto propia</b>
                  </button>
                </div>
                {mode === "icon" ? (
                  <div className="ann-icons" role="radiogroup" aria-label="Ícono">
                    {ANNOUNCEMENT_ICONS.map((name) => (
                      <button key={name} type="button" role="radio" aria-checked={icon === name} className={icon === name ? "on" : undefined} onClick={() => setIcon(name)} aria-label={name}>
                        <AnnouncementIcon name={name} size={18} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="ann-drop">
                    {image ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt="" />
                        <button type="button" className="vpa-btn soft sm" onClick={() => setImage(null)}>
                          Quitar
                        </button>
                      </>
                    ) : (
                      <button type="button" className="ann-drop-btn" onClick={() => fileRef.current?.click()}>
                        <ImagePlus size={20} aria-hidden="true" />
                        <b>Subir desde el dispositivo</b>
                        <span>JPG, PNG o WebP. La achicamos sola.</span>
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} />
                  </div>
                )}
              </div>

              <div className="vpa-fld">
                <span>Color</span>
                <div className="ann-swatches" role="radiogroup" aria-label="Color">
                  {Object.entries(ANNOUNCEMENT_ACCENTS).map(([id, value]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={accent === id}
                      title={value.label}
                      aria-label={value.label}
                      className={accent === id ? "on" : undefined}
                      style={{ background: `linear-gradient(135deg, ${value.from}, ${value.to})` }}
                      onClick={() => setAccent(id)}
                    />
                  ))}
                </div>
              </div>

              <div className="vpa-form">
                <label className="vpa-fld">
                  <span>Botón (opcional)</span>
                  <input className="vpa-inp" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} maxLength={60} placeholder="Probalo" />
                </label>
                <label className="vpa-fld">
                  <span>Link del botón</span>
                  <input className="vpa-inp" value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} placeholder="https://… o /app/catalogo" />
                </label>
              </div>

              <div className="vpa-fld">
                <span>Dónde se muestra</span>
                <div className="adm-choice" role="group" aria-label="Dónde se muestra">
                  {ANNOUNCEMENT_SURFACES.map((surface) => {
                    const on = surfaces.includes(surface.id);
                    return (
                      <button
                        key={surface.id}
                        type="button"
                        aria-pressed={on}
                        className={on ? "on" : undefined}
                        onClick={() => setSurfaces((prev) => (on ? prev.filter((id) => id !== surface.id) : [...prev, surface.id]))}
                      >
                        <b>{surface.label}</b>
                        <span>{surface.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="vpa-fld">
                <span>Para quién</span>
                <div className="adm-choice" role="radiogroup" aria-label="Para quién">
                  <button type="button" role="radio" aria-checked={audience === "all"} className={audience === "all" ? "on" : undefined} onClick={() => setAudience("all")}>
                    <b>Todos</b>
                    <span>Todas las personas con cuenta</span>
                  </button>
                  <button type="button" role="radio" aria-checked={audience === "people"} className={audience === "people" ? "on" : undefined} onClick={() => setAudience("people")}>
                    <b>Personas puntuales</b>
                    <span>{people.length ? `${people.length} elegida${people.length === 1 ? "" : "s"}` : "Elegís a quién"}</span>
                  </button>
                </div>
                {audience === "people" ? <PeoplePicker value={people} onChange={setPeople} /> : null}
              </div>

              <div className="vpa-form">
                <label className="vpa-fld">
                  <span>Desde (opcional)</span>
                  <input className="vpa-inp" type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
                </label>
                <label className="vpa-fld">
                  <span>Hasta (opcional)</span>
                  <input className="vpa-inp" type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
                </label>
              </div>

              <button type="button" className={`adm-feat${sendEmail ? " on" : ""}`} onClick={() => setSendEmail((value) => !value)} aria-pressed={sendEmail}>
                <span className={`vpa-tog${sendEmail ? " on" : ""}`} aria-hidden="true" />
                <span className="vpa-g1">
                  <b>Mandar también por mail</b>
                  <span>
                    Sale desde novedades@vase.ar {audience === "people" ? "solo a las personas elegidas" : "a todas las personas con cuenta activa"}. Antes podés mandarte una prueba
                    desde la lista.
                  </span>
                </span>
              </button>
            </div>

            <div className="ann-preview" aria-label="Vista previa">
              <small>Así se ve</small>
              <AnnouncementModal key={JSON.stringify(preview)} items={[preview]} preview />
            </div>
          </div>
        </AdminModal>
      ) : null}
    </>
  );
}

export type AdminAnnouncementRow = AnnouncementView & {
  surfaces: string[];
  /** Null = todos; si no, cuántas personas puntuales. */
  audience: number | null;
  state: { label: string; tone: string };
  dates: string;
  dismissed: number;
  isActive: boolean;
  email: "off" | "pending" | "sent";
  emailCount: number;
};

export function AnnouncementCard({ row }: { row: AdminAnnouncementRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const accent = accentOf(row.accent);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const result = await fn();
      setMessage(result.message ?? null);
      router.refresh();
    });

  return (
    <article className="ann-card">
      <div className="ann-thumb" style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}>
        {row.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.imageUrl} alt="" />
        ) : (
          <AnnouncementIcon name={row.icon} size={26} />
        )}
      </div>
      <div className="ann-info">
        <div className="ann-top">
          <b>{row.title}</b>
          <span className={`vpa-tag ${row.state.tone}`}>
            <i />
            {row.state.label}
          </span>
        </div>
        <p>{row.body}</p>
        <div className="ann-meta">
          {row.surfaces.map((id) => (
            <span key={id} className="ann-chip">
              {ANNOUNCEMENT_SURFACES.find((surface) => surface.id === id)?.label ?? id}
            </span>
          ))}
          <span className="ann-chip">{row.audience ? `${row.audience} persona${row.audience === 1 ? "" : "s"}` : "Todos"}</span>
          <span>{row.dates}</span>
          <span>· {row.dismissed} lo cerraron</span>
          {row.email === "sent" ? <span>· mail a {row.emailCount}</span> : null}
          {row.email === "pending" ? <span>· mail pendiente</span> : null}
        </div>
        {message ? <p className="adm-msg ok">{message}</p> : null}
      </div>
      <div className="ann-actions">
        <button type="button" className="vpa-btn line sm" onClick={() => setPreviewing(true)}>
          <Eye size={14} aria-hidden="true" /> Ver
        </button>
        <button type="button" className="vpa-btn line sm" disabled={pending} onClick={() => run(() => setAnnouncementActiveAction(row.id, !row.isActive))}>
          {row.isActive ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {row.isActive ? "Pausar" : "Activar"}
        </button>
        <button type="button" className="vpa-btn line sm" disabled={pending} onClick={() => run(() => sendAnnouncementTestAction(row.id))} title="Te llega solo a vos">
          <MailCheck size={14} aria-hidden="true" /> Probar mail
        </button>
        {row.email !== "sent" ? (
          <button
            type="button"
            className="vpa-btn line sm"
            disabled={pending}
            onClick={() => {
              const who = row.audience ? `a las ${row.audience} personas elegidas` : "a todas las personas con cuenta activa";
              if (window.confirm(`¿Mandar este anuncio por mail ${who}?`)) run(() => sendAnnouncementEmailNowAction(row.id));
            }}
          >
            <Mail size={14} aria-hidden="true" /> Enviar mail
          </button>
        ) : null}
        <button
          type="button"
          className="vpa-btn soft sm"
          disabled={pending}
          aria-label="Borrar anuncio"
          onClick={() => {
            if (window.confirm("¿Borrar este anuncio? Deja de verse y sale de las notificaciones.")) run(() => deleteAnnouncementAction(row.id));
          }}
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
      {previewing ? <AnnouncementModal items={[row]} save={false} onClose={() => setPreviewing(false)} /> : null}
    </article>
  );
}
