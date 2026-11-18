"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Download, ImagePlus, Package, RefreshCw, Search, Sparkles, X } from "lucide-react";

type Product = { id: string; name: string; price: number | null; imageUrl: string | null };
type Format = "story" | "post" | "banner";

type Turn = {
  id: string;
  prompt: string;
  format: Format;
  product: Product | null;
  status: "loading" | "done" | "error";
  image?: string;
  error?: string;
};

const FORMATS: Array<{ id: Format; label: string; detail: string }> = [
  { id: "post", label: "Post", detail: "Cuadrado" },
  { id: "story", label: "Historia", detail: "Vertical" },
  { id: "banner", label: "Banner", detail: "Horizontal" },
];

const IDEAS = [
  "Promo de fin de semana con 10% de descuento",
  "Posteo para el Día del Padre",
  "Aviso de nuevos horarios de atención",
  "Banner de envíos gratis a todo el país",
  "Historia presentando un producto nuevo",
];

const MAX = 600;

function errorText(code: string | undefined) {
  switch (code) {
    case "AI_BUDGET_UNAVAILABLE":
      return "Se terminó el uso de IA de tu plan este mes. Podés sumar más desde Configuraciones.";
    case "TOO_MANY_IMAGES":
      return "Hiciste muchas imágenes en la última hora. Probá de nuevo en un rato.";
    case "OPENAI_API_KEY_MISSING":
      return "La IA todavía no está configurada en tu cuenta. Escribinos a soporte@vase.ar.";
    case "UNAUTHORIZED":
      return "Se cerró tu sesión. Volvé a entrar a Vase.";
    default:
      return "No pudimos crear la imagen. Probá de nuevo o cambiá un poco el pedido.";
  }
}

function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

/** Marketing con IA, como un chat: pedís lo que quieras, elegís el formato y, si querés, un producto. */
export function MarketingStudio({ businessName, products }: { businessName: string; products: Product[] }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<Format>("post");
  const [product, setProduct] = useState<Product | null>(null);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const seq = useRef(0);
  const busy = turns.some((turn) => turn.status === "loading");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const found = useMemo(() => {
    const text = query.trim().toLowerCase();
    return (text ? products.filter((item) => item.name.toLowerCase().includes(text)) : products).slice(0, 40);
  }, [products, query]);

  async function run(turn: Turn) {
    try {
      const response = await fetch("/api/v1/marketing/images", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: turn.prompt, format: turn.format, productId: turn.product?.id ?? null }),
      });
      const payload = (await response.json().catch(() => ({}))) as { image?: string; error?: string };
      setTurns((list) =>
        list.map((item) =>
          item.id === turn.id
            ? response.ok && payload.image
              ? { ...item, status: "done", image: payload.image }
              : { ...item, status: "error", error: errorText(payload.error) }
            : item,
        ),
      );
    } catch {
      setTurns((list) => list.map((item) => (item.id === turn.id ? { ...item, status: "error", error: errorText(undefined) } : item)));
    }
  }

  function send(text = prompt, again?: Turn) {
    const value = text.trim().slice(0, MAX);
    if (value.length < 3 || busy) return;
    const turn: Turn = {
      id: `turn-${(seq.current += 1)}`,
      prompt: value,
      format: again?.format ?? format,
      product: again ? again.product : product,
      status: "loading",
    };
    setTurns((list) => [...list, turn]);
    if (!again) setPrompt("");
    void run(turn);
  }

  function download(turn: Turn) {
    if (!turn.image) return;
    const link = document.createElement("a");
    link.href = turn.image;
    const slug = turn.prompt.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "imagen";
    link.download = `${slug}-${turn.format}.png`;
    link.click();
  }

  return (
    <div className="lx-mk">
      <div className="lx-mk-thread" aria-live="polite">
        {turns.length === 0 ? (
          <div className="lx-mk-hello">
            <span className="ic" aria-hidden="true">
              <Sparkles size={26} />
            </span>
            <h2>¿Qué querés crear hoy?</h2>
            <p>Pedí lo que necesites para tus redes o tu tienda: una promo, un posteo de una fecha especial, un aviso o un producto. La IA lo arma con el nombre de {businessName}.</p>
            <div className="lx-mk-ideas">
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => {
                    setPrompt(idea);
                    inputRef.current?.focus();
                  }}
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn) => (
            <div className="lx-mk-turn" key={turn.id}>
              <div className="lx-mk-ask">
                <p>{turn.prompt}</p>
                <span>
                  {FORMATS.find((item) => item.id === turn.format)?.label}
                  {turn.product ? ` · ${turn.product.name}` : ""}
                </span>
              </div>
              <div className="lx-mk-out">
                {turn.status === "loading" ? (
                  <div className={`lx-mk-frame ${turn.format} loading`} role="status" aria-label="Creando la imagen">
                    <span>Creando tu imagen… puede tardar hasta un minuto</span>
                  </div>
                ) : turn.status === "error" ? (
                  <div className="lx-mk-err" role="alert">
                    {turn.error}
                    <button type="button" className="vpa-btn line sm" onClick={() => send(turn.prompt, turn)} disabled={busy}>
                      Probar de nuevo
                    </button>
                  </div>
                ) : (
                  <>
                    <figure className={`lx-mk-frame ${turn.format}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- imagen recién creada, viene como data URL */}
                      <img src={turn.image} alt={turn.prompt} />
                    </figure>
                    <div className="lx-mk-acts">
                      <button type="button" className="vpa-btn acc sm" onClick={() => download(turn)}>
                        <Download size={15} aria-hidden="true" /> Descargar
                      </button>
                      <button type="button" className="vpa-btn line sm" onClick={() => send(turn.prompt, turn)} disabled={busy}>
                        <RefreshCw size={15} aria-hidden="true" /> Otra versión
                      </button>
                      <button
                        type="button"
                        className="vpa-btn line sm"
                        onClick={() => {
                          setPrompt(turn.prompt);
                          setFormat(turn.format);
                          setProduct(turn.product);
                          inputRef.current?.focus();
                        }}
                      >
                        Cambiar el pedido
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        className="lx-mk-box"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <div className="lx-mk-opts">
          <div className="vpa-seg" role="radiogroup" aria-label="Formato">
            {FORMATS.map((item) => (
              <button key={item.id} type="button" role="radio" aria-checked={format === item.id} className={format === item.id ? "on" : undefined} onClick={() => setFormat(item.id)} title={item.detail}>
                {item.label}
              </button>
            ))}
          </div>
          {product ? (
            <span className="lx-mk-chip">
              <Package size={14} aria-hidden="true" />
              {product.name}
              <button type="button" aria-label="Quitar producto" onClick={() => setProduct(null)}>
                <X size={13} />
              </button>
            </span>
          ) : products.length > 0 ? (
            <button type="button" className="lx-mk-add" onClick={() => setPicker(true)}>
              <ImagePlus size={15} aria-hidden="true" /> Sumar un producto
            </button>
          ) : null}
        </div>
        <div className="lx-mk-write">
          <textarea
            ref={inputRef}
            value={prompt}
            maxLength={MAX}
            rows={2}
            placeholder="Ej: una historia para anunciar que este sábado abrimos hasta las 20 hs"
            aria-label="Qué imagen querés"
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
          />
          <button type="submit" className="lx-mk-send" aria-label="Crear imagen" disabled={busy || prompt.trim().length < 3}>
            <ArrowUp size={18} />
          </button>
        </div>
        <small className="lx-mk-hint">Cada imagen usa parte de la IA de tu plan. Descargala para guardarla: al salir de esta pantalla no queda guardada.</small>
      </form>

      {picker ? (
        <div className="vpa-dialog" onClick={() => setPicker(false)}>
          <div role="dialog" aria-label="Elegí un producto" onClick={(event) => event.stopPropagation()} className="lx-mk-pick">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3>Elegí un producto</h3>
              <button type="button" className="vpa-x" aria-label="Cerrar" onClick={() => setPicker(false)}>
                <X size={18} />
              </button>
            </div>
            <label className="lx-mk-search">
              <Search size={15} aria-hidden="true" />
              <input className="vpa-inp" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en tu catálogo" />
            </label>
            <div className="lx-mk-list">
              {found.length === 0 ? <p className="vpa-mut">No encontramos productos con ese nombre.</p> : null}
              {found.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setProduct(item);
                    setPicker(false);
                    setQuery("");
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto del catálogo, de cualquier origen */}
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="ph"><Package size={16} /></span>}
                  <span className="vpa-g1">
                    <b>{item.name}</b>
                    {item.price ? <span>{money(item.price)}</span> : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
