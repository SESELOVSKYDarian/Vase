"use client";

// Parte de business-profile.tsx: ProfileValues, ProfileBranch, USE_COLORS, Uses, Field, Select y más.
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBusinessLogoAction } from "@/app/(platform)/app/settings/business-actions";
import { ChevronDown } from "lucide-react";
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

export const USE_COLORS: Record<string, [string, string]> = {
  Business: ["#0d3b2a", "#7ff0bd"],
  Labs: ["#241a5c", "#b9a7ff"],
  Management: ["#f6dfae", "#7c2d12"],
  Rest: ["#7a2e1d", "#ffe6d9"],
  "Tus facturas": ["#eceef0", "#111418"],
};

export function Uses({ list }: { list: readonly string[] }) {
  return (
    <div className="vpa-uses" aria-label="Dónde se usa">
      {list.map((name) => (
        <span key={name} className="vpa-usec" style={{ background: USE_COLORS[name][0], color: USE_COLORS[name][1] }}>
          {name}
        </span>
      ))}
    </div>
  );
}

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

/** Sección que arranca cerrada: muestra un resumen y se abre al tocarla. Sus campos se envían igual. */
export function Section({
  title,
  summary,
  uses,
  children,
  wide = false,
  action,
}: {
  title: string;
  summary: string;
  uses: readonly string[];
  children: React.ReactNode;
  wide?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <details className={wide ? "vpa-acc2 vpa-span2" : "vpa-acc2"}>
      <summary>
        <span className="vpa-g1">
          <b>{title}</b>
          <span>{summary}</span>
        </span>
        <Uses list={uses} />
        <ChevronDown size={18} className="vpa-chev2" aria-hidden="true" />
      </summary>
      <div className="vpa-acc2-body">
        {action ? <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>{action}</div> : null}
        {children}
      </div>
    </details>
  );
}

export function LogoPicker({ name, logoUrl, readOnly }: { name: string; logoUrl: string | null; readOnly: boolean }) {
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

  return (
    <div className="vpa-logoup-wrap">
      <button
        type="button"
        className="vpa-logoup"
        disabled={readOnly || isPending}
        aria-label={logoUrl ? "Cambiar logo" : "Subir logo"}
        onClick={() => inputRef.current?.click()}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" />
        ) : (
          <b>{name.trim().charAt(0).toUpperCase() || "?"}</b>
        )}
        {readOnly ? null : <span>{isPending ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}</span>}
      </button>
      {error ? <small role="alert">{error}</small> : null}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => pick(event.target.files?.[0])} />
    </div>
  );
}
