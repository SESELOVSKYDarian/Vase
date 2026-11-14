"use client";

// Parte de business-profile.tsx: BusinessProfile.
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { deleteBranchAction, updateBusinessProfileAction } from "@/app/(platform)/app/settings/business-actions";
import { CURRENCIES, PROFILE_USES, TIMEZONES, sectionSummary } from "@/lib/business/business-profile";
import { useAutosave, useSaveStatus } from "@/components/layout/save-status";
import { SocialLinksEditor } from "@/components/panel/social-links-editor";
import { type SocialLink } from "@/lib/business/social-links";
import { Field, LogoPicker, ProfileBranch, ProfileValues, Section, Select } from "./LogoPicker";
import { BranchDialog } from "./BranchDialog";

export function BusinessProfile({
  values,
  logoUrl,
  socialLinks,
  branches,
  canEdit,
}: {
  values: ProfileValues;
  logoUrl: string | null;
  socialLinks: SocialLink[];
  branches: ProfileBranch[];
  canEdit: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [links, setLinks] = useState<SocialLink[]>(socialLinks);
  const linksTouched = useRef(false);
  const { state: cloudState, message: cloudMessage } = useSaveStatus();
  const save = useCallback(async (data: FormData) => (await updateBusinessProfileAction(null, data)) ?? { ok: false }, []);
  const schedule = useAutosave(save);
  const queueSave = useCallback(() => {
    if (!canEdit || !formRef.current) return;
    schedule(new FormData(formRef.current));
  }, [canEdit, schedule]);

  // Las redes no son campos del formulario: al cambiarlas también se guarda solo.
  useEffect(() => {
    if (!linksTouched.current) return;
    queueSave();
  }, [links, queueSave]);
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

      {canEdit && cloudState === "error" && cloudMessage ? (
        <p role="alert" className="vpa-saveerr">
          No se guardó: {cloudMessage}
        </p>
      ) : null}
      <form ref={formRef} className="vpa-bizlist" onChange={queueSave} onSubmit={(event) => event.preventDefault()}>
        <input type="hidden" name="socialLinks" value={JSON.stringify(links)} />
        <Section
          wide
          title="Identidad"
          summary={sectionSummary([values.name, values.industry])}
          uses={PROFILE_USES.identity}
        >
          <div className="vpa-idrow">
            <LogoPicker name={values.name} logoUrl={logoUrl} readOnly={readOnly} />
            <div className="vpa-form3">
              <Field label="Nombre del negocio" name="name" value={values.name} readOnly={readOnly} />
              <Field label="Rubro" name="industry" value={values.industry} readOnly={readOnly} />
              <Field label="Tu negocio en una frase" name="tagline" value={values.tagline} readOnly={readOnly} placeholder="Qué hacés, en pocas palabras" />
              <Select label="Zona horaria" name="timezone" value={values.timezone} readOnly={readOnly} options={TIMEZONES} />
              <Select label="Moneda" name="currency" value={values.currency} readOnly={readOnly} options={CURRENCIES} />
            </div>
          </div>
        </Section>

        <Section
          title="Contacto y redes"
          summary={sectionSummary([values.phone || values.whatsapp, values.email, links.length ? `${links.length} red${links.length === 1 ? "" : "es"}` : null])}
          uses={PROFILE_USES.contact}
        >
          <div className="vpa-form">
            <Field label="Teléfono" name="phone" value={values.phone} readOnly={readOnly} />
            <Field label="WhatsApp" name="whatsapp" value={values.whatsapp} readOnly={readOnly} />
            <Field label="Correo" name="email" type="email" value={values.email} readOnly={readOnly} />
            <Field label="Sitio web" name="website" value={values.website} readOnly={readOnly} />
            <Field label="Horario de atención" name="hours" value={values.hours} readOnly={readOnly} wide placeholder="Lunes a viernes de 9 a 18" />
            <SocialLinksEditor
              links={links}
              readOnly={readOnly}
              onChange={(next) => {
                linksTouched.current = true;
                setLinks(next);
              }}
            />
          </div>
        </Section>

        <Section
          title="Datos fiscales"
          summary={sectionSummary([values.legalName, values.taxId ? `CUIT ${values.taxId}` : null])}
          uses={PROFILE_USES.fiscal}
        >
          <div className="vpa-form">
            <Field label="Razón social" name="legalName" value={values.legalName} readOnly={readOnly} />
            <Field label="CUIT" name="taxId" value={values.taxId} readOnly={readOnly} />
            <Field label="Condición frente al IVA" name="taxCondition" value={values.taxCondition} readOnly={readOnly} />
            <Field label="Domicilio fiscal" name="fiscalAddress" value={values.fiscalAddress} readOnly={readOnly} />
            <Field label="Localidad" name="city" value={values.city} readOnly={readOnly} />
            <Field label="Provincia" name="province" value={values.province} readOnly={readOnly} />
            <Field label="Código postal" name="postalCode" value={values.postalCode} readOnly={readOnly} />
          </div>
        </Section>

      </form>

      <Section
        wide
        title="Sucursales"
        summary={branches.length === 0 ? "Sin cargar" : branches.length === 1 ? "1 sucursal" : `${branches.length} sucursales`}
        uses={PROFILE_USES.branches}
        action={
          canEdit ? (
            <button type="button" className="vpa-btn line sm" onClick={() => setEditing("new")}>
              Agregar sucursal
            </button>
          ) : null
        }
      >
        {branchError ? <p role="alert" style={{ color: "var(--red)" }}>{branchError}</p> : null}
        {branches.length === 0 ? <p className="vpa-mut">Todavía no cargaste sucursales.</p> : null}
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
      </Section>

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
