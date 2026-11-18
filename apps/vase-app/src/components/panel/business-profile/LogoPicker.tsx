"use client";

// Parte de business-profile.tsx: ProfileValues, ProfileBranch, USE_COLORS, Uses, Field, Select y más.
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBusinessLogoAction } from "@/app/(platform)/app/settings/business-actions";
import { ImagePlus, Loader2, Pencil } from "lucide-react";
import { useSaveStatus } from "@/components/layout/save-status";
import { MAX_IMAGE_INPUT_BYTES, toSquareWebp, uploadPublicImage } from "@/components/panel/upload-image";

export type ProfileValues = {
  name: string;
  industry: string;
  tagline: string;
  timezone: string;
  currency: string;
  hours: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  legalName: string;
  taxId: string;
  taxCondition: string;
  fiscalAddress: string;
};

export type ProfileBranch = {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  isMain: boolean;
};

export function Field({
  label,
  name,
  value,
  readOnly,
  type = "text",
  wide = false,
  placeholder,
}: {
  label: string;
  name: keyof ProfileValues;
  value: string;
  readOnly: boolean;
  type?: string;
  wide?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="vpa-fld" style={wide ? { gridColumn: "1 / -1" } : undefined}>
      <span>{label}</span>
      <input className="vpa-inp" name={name} type={type} defaultValue={value} readOnly={readOnly} placeholder={placeholder} />
    </label>
  );
}

export function Select({
  label,
  name,
  value,
  readOnly,
  options,
}: {
  label: string;
  name: keyof ProfileValues;
  value: string;
  readOnly: boolean;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="vpa-fld">
      <span>{label}</span>
      <select className="vpa-inp" name={name} defaultValue={value} disabled={readOnly}>
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
      {readOnly ? <input type="hidden" name={name} value={value} /> : null}
    </label>
  );
}

/** Una parte de Mi negocio: tarjeta con ícono, título y resumen, siempre a la vista. Sus campos se envían igual. */
export function Section({
  title,
  summary,
  icon,
  children,
  wide = false,
  action,
}: {
  title: string;
  summary: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <section className={wide ? "vpa-nsec vpa-span2" : "vpa-nsec"}>
      <header>
        {icon ? (
          <span className="ic" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="vpa-g1">
          <b>{title}</b>
          <span>{summary}</span>
        </span>
        {action ? <span className="act">{action}</span> : null}
      </header>
      {children}
    </section>
  );
}

/** Subir el logo de Mi negocio: lo usan el recuadro de Identidad y la cabecera de Mi negocio. */
function useLogoUpload() {
  const router = useRouter();
  const { report } = useSaveStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pick = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_INPUT_BYTES) {
      setError("Hasta 8 MB");
      return;
    }
    startTransition(async () => {
      try {
        const url = await uploadPublicImage(await toSquareWebp(file, 512, "contain", "logo"));
        report("saving");
        const result = await saveBusinessLogoAction(url);
        report(result.ok ? "saved" : "error", result.ok ? null : result.message);
        if (!result.ok) setError(result.message);
        router.refresh();
      } catch {
        setError("No se pudo subir");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  };

  const input = <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => pick(event.target.files?.[0])} />;
  return { open: () => inputRef.current?.click(), input, error, isPending };
}

export function LogoPicker({ name, logoUrl, readOnly }: { name: string; logoUrl: string | null; readOnly: boolean }) {
  const { open, input, error, isPending } = useLogoUpload();
  return (
    <div className="vpa-logoup-wrap">
      <button type="button" className="vpa-logoup" disabled={readOnly || isPending} aria-label={logoUrl ? "Cambiar logo" : "Subir logo"} onClick={open}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" />
        ) : (
          <b>{name.trim().charAt(0).toUpperCase() || "?"}</b>
        )}
        {readOnly ? null : <span>{isPending ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}</span>}
      </button>
      {error ? <small role="alert">{error}</small> : null}
      {input}
    </div>
  );
}

/** El logo grande de la cabecera de Mi negocio: al pasar el mouse aparece el lápiz para cambiarlo. */
export function HeroLogo({ name, logoUrl, readOnly }: { name: string; logoUrl: string | null; readOnly: boolean }) {
  const { open, input, error, isPending } = useLogoUpload();
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (readOnly) {
    return (
      <span className="vpa-nlogo">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo subido por el cliente */}
        {logoUrl ? <img src={logoUrl} alt="" /> : initial}
      </span>
    );
  }
  return (
    <span className="vpa-nlogo-wrap">
      <button type="button" className="vpa-nlogo edit" onClick={open} disabled={isPending} aria-label={logoUrl ? "Cambiar logo" : "Subir logo"}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo subido por el cliente */}
        {logoUrl ? <img src={logoUrl} alt="" /> : initial}
        <span className="pen" aria-hidden="true">
          {isPending ? <Loader2 size={18} className="spin" /> : logoUrl ? <Pencil size={18} /> : <ImagePlus size={18} />}
        </span>
      </button>
      {error ? <small role="alert">{error}</small> : null}
      {input}
    </span>
  );
}