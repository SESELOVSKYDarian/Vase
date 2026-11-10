"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  deleteBranchAction,
  saveBranchAction,
  saveBusinessLogoAction,
  updateBusinessProfileAction,
} from "@/app/(platform)/app/settings/business-actions";
import { PROFILE_USES } from "@/lib/business/business-profile";
import { MAX_IMAGE_INPUT_BYTES, toSquareWebp, uploadPublicImage } from "@/components/panel/upload-image";

export type ProfileValues = {
  name: string;
  industry: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
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

const USE_COLORS: Record<string, [string, string]> = {
  Business: ["#0d3b2a", "#7ff0bd"],
  Labs: ["#241a5c", "#b9a7ff"],
  Management: ["#f6dfae", "#7c2d12"],
  Rest: ["#7a2e1d", "#ffe6d9"],
  "Tus facturas": ["#eceef0", "#111418"],
};

function Uses({ list }: { list: readonly string[] }) {
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

function Field({
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

function LogoPicker({ name, logoUrl, readOnly }: { name: string; logoUrl: string | null; readOnly: boolean }) {
  const router = useRouter();
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
        const result = await saveBusinessLogoAction(url);
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

function BranchDialog({ branch, onClose }: { branch: ProfileBranch | null; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isMain, setIsMain] = useState(branch?.isMain ?? false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const data = new FormData(formRef.current!);
    setError(null);
    startTransition(async () => {
      const result = await saveBranchAction({
        id: branch?.id,
        name: String(data.get("name") ?? ""),
        address: String(data.get("address") ?? ""),
        phone: String(data.get("phone") ?? ""),
        hours: String(data.get("hours") ?? ""),
        isMain,
      });
      if (result.ok) onClose();
      else setError(result.message);
    });
  };

  return (
    <div className="vpa-dialog">
      <form ref={formRef} onSubmit={submit} role="dialog" aria-label={branch ? "Editar sucursal" : "Nueva sucursal"} style={{ width: 520 }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div>
            <h3>{branch ? "Editar sucursal" : "Nueva sucursal"}</h3>
            <p>Aparece en tu tienda, tu asistente y tus locales.</p>
          </div>
          <button type="button" className="vpa-x" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <label className="vpa-fld">
          <span>Nombre</span>
          <input className="vpa-inp" name="name" required minLength={2} maxLength={120} defaultValue={branch?.name} placeholder="Por ejemplo: Local Palermo" />
        </label>
        <label className="vpa-fld">
          <span>Dirección</span>
          <input className="vpa-inp" name="address" required minLength={3} maxLength={191} defaultValue={branch?.address} placeholder="Calle, número y ciudad" />
        </label>
        <div className="vpa-form">
          <label className="vpa-fld">
            <span>Teléfono</span>
            <input className="vpa-inp" name="phone" maxLength={40} defaultValue={branch?.phone} />
          </label>
          <label className="vpa-fld">
            <span>Horarios</span>
            <input className="vpa-inp" name="hours" maxLength={120} defaultValue={branch?.hours} placeholder="Lunes a viernes de 9 a 18" />
          </label>
        </div>
        <button type="button" className="vpa-nall" role="checkbox" aria-checked={isMain} onClick={() => setIsMain(!isMain)}>
          <span className={isMain ? "vpa-cbx on" : "vpa-cbx"} aria-hidden="true">
            ✓
          </span>
          Es la sucursal principal
        </button>
        {error ? <p role="alert" style={{ color: "var(--red)" }}>{error}</p> : null}
        <div className="row">
          <button type="button" className="vpa-btn soft" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="vpa-btn acc" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar sucursal"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function BusinessProfile({
  values,
  logoUrl,
  branches,
  canEdit,
}: {
  values: ProfileValues;
  logoUrl: string | null;
  branches: ProfileBranch[];
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateBusinessProfileAction, null);
  const [editing, setEditing] = useState<ProfileBranch | null | "new">(null);
  const [confirmDelete, setConfirmDelete] = useState<ProfileBranch | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const readOnly = !canEdit;

  return (
    <>
      <div className="vpa-notice2">
        <b>Lo cargás una vez y lo usan todos tus productos.</b>
        <span>{canEdit ? "Si cambiás algo acá, se actualiza en todos lados." : "Solo el Dueño de la cuenta puede cambiar estos datos."}</span>
      </div>

      <form action={formAction} className="vpa-bizgrid">
        <section className="vpa-card vpa-span2" aria-label="Identidad">
          <div className="vpa-cardh">
            <h3>Identidad</h3>
            <Uses list={PROFILE_USES.identity} />
          </div>
          <div className="vpa-idrow">
            <LogoPicker name={values.name} logoUrl={logoUrl} readOnly={readOnly} />
            <div className="vpa-form3">
              <Field label="Nombre del negocio" name="name" value={values.name} readOnly={readOnly} />
              <Field label="Rubro" name="industry" value={values.industry} readOnly={readOnly} />
              <Field label="Tu negocio en una frase" name="tagline" value={values.tagline} readOnly={readOnly} placeholder="Qué hacés, en pocas palabras" />
            </div>
          </div>
        </section>

        <section className="vpa-card" aria-label="Contacto">
          <div className="vpa-cardh">
            <h3>Contacto</h3>
            <Uses list={PROFILE_USES.contact} />
          </div>
          <div className="vpa-form">
            <Field label="Teléfono" name="phone" value={values.phone} readOnly={readOnly} />
            <Field label="WhatsApp" name="whatsapp" value={values.whatsapp} readOnly={readOnly} />
            <Field label="Correo" name="email" type="email" value={values.email} readOnly={readOnly} />
            <Field label="Sitio web" name="website" value={values.website} readOnly={readOnly} />
            <Field label="Instagram" name="instagram" value={values.instagram} readOnly={readOnly} placeholder="@tu-negocio" />
            <Field label="Facebook" name="facebook" value={values.facebook} readOnly={readOnly} />
          </div>
        </section>

        <section className="vpa-card" aria-label="Datos fiscales">
          <div className="vpa-cardh">
            <h3>Datos fiscales</h3>
            <Uses list={PROFILE_USES.fiscal} />
          </div>
          <div className="vpa-form">
            <Field label="Razón social" name="legalName" value={values.legalName} readOnly={readOnly} />
            <Field label="CUIT" name="taxId" value={values.taxId} readOnly={readOnly} />
            <Field label="Condición frente al IVA" name="taxCondition" value={values.taxCondition} readOnly={readOnly} />
            <Field label="Domicilio fiscal" name="fiscalAddress" value={values.fiscalAddress} readOnly={readOnly} />
          </div>
        </section>

        {canEdit ? (
          <div className="vpa-savebar vpa-span2">
            {state ? (
              <span role="status" style={{ color: state.ok ? "var(--acc-tx)" : "var(--red)" }}>
                {state.message}
              </span>
            ) : (
              <span className="vpa-mut">Los cambios se guardan cuando tocás Guardar.</span>
            )}
            <button type="submit" className="vpa-btn acc" disabled={pending}>
              {pending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        ) : null}
      </form>

      <section className="vpa-card" aria-label="Sucursales">
        <div className="vpa-cardh">
          <h3>Sucursales</h3>
          <Uses list={PROFILE_USES.branches} />
          <div className="vpa-sp" />
          {canEdit ? (
            <button type="button" className="vpa-btn line sm" onClick={() => setEditing("new")}>
              Agregar sucursal
            </button>
          ) : null}
        </div>
        {branchError ? <p role="alert" style={{ color: "var(--red)" }}>{branchError}</p> : null}
        {branches.length === 0 ? <p>Todavía no cargaste sucursales.</p> : null}
        <div className="vpa-branches">
          {branches.map((branch) => (
            <article className="vpa-branch" key={branch.id}>
              <div className="vpa-g1">
                <b>
                  {branch.name}
                  {branch.isMain ? (
                    <span className="vpa-tag g" style={{ marginLeft: 8 }}>
                      <i />
                      Principal
                    </span>
                  ) : null}
                </b>
                <span>{branch.address}</span>
                {branch.hours || branch.phone ? <span>{[branch.hours, branch.phone].filter(Boolean).join(" · ")}</span> : null}
              </div>
              {canEdit ? (
                <div className="vpa-branch-acts">
                  <button type="button" className="vpa-btn soft sm" onClick={() => setEditing(branch)}>
                    Editar
                  </button>
                  <button type="button" className="vpa-btn soft sm danger" aria-label={`Eliminar ${branch.name}`} onClick={() => setConfirmDelete(branch)}>
                    Eliminar
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {editing ? <BranchDialog branch={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      {confirmDelete ? (
        <div className="vpa-dialog">
          <div role="dialog" aria-label="Eliminar sucursal">
            <h3>¿Eliminar {confirmDelete.name}?</h3>
            <p>Deja de aparecer en tus productos.</p>
            <div className="row">
              <button type="button" className="vpa-btn soft" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="vpa-btn ink"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteBranchAction(confirmDelete.id);
                    setBranchError(result.ok ? null : result.message);
                    setConfirmDelete(null);
                  })
                }
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
