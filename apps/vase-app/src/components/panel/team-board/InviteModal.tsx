"use client";

// Parte de team-board.tsx: TeamEntry, Contracted, ROLE_OPTIONS, initialInviteState, RoleHelp, InviteModal.
import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import { inviteTeamMemberAction, type TeamActionState } from "@/app/(platform)/app/team/actions";
import { PANEL_PRODUCTS } from "@/components/panel/products";
import { type PlatformModuleId, type PlatformModuleKey } from "@/config/modules";
import { assignableModuleIds, type TeamRole } from "@/lib/team/team-access";

export type TeamEntry = {
  kind: "member" | "invite";
  id: string;
  initials: string;
  avatarUrl: string | null;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "MEMBER";
  moduleIds: string[];
  pending: boolean;
};

export type Contracted = { id: PlatformModuleId; key: PlatformModuleKey };

export const ROLE_OPTIONS: Array<{ id: TeamRole; label: string; desc: string }> = [
  { id: "MANAGER", label: "Encargado", desc: "Usa sus productos y maneja consultas y reuniones." },
  { id: "MEMBER", label: "Miembro", desc: "Solo usa los productos que le asignes." },
];

export const initialInviteState: TeamActionState = {};

export function RoleHelp() {
  return (
    <span className="vpa-th-i">
      Rol{" "}
      <button type="button" className="vpa-info" aria-label="Qué puede hacer cada rol">
        i
      </button>
      <span className="vpa-tip" role="tooltip">
        <span>
          <b>Dueño</b>
          <small>Todo: productos, pagos, equipo y datos del negocio.</small>
        </span>
        <span>
          <b>Encargado</b>
          <small>Usa sus productos y maneja consultas y reuniones. No ve pagos ni equipo.</small>
        </span>
        <span>
          <b>Miembro</b>
          <small>Solo usa los productos que le asignes.</small>
        </span>
      </span>
    </span>
  );
}

export function InviteModal({ contracted, onClose }: { contracted: Contracted[]; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(inviteTeamMemberAction, initialInviteState);
  const [role, setRole] = useState<TeamRole>("MANAGER");
  const [selected, setSelected] = useState<string[]>(contracted.map((item) => item.id));
  const contractedIds = contracted.map((item) => item.id as string);
  const allowed = assignableModuleIds(role, contractedIds);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="vpa-dialog">
      <div role="dialog" aria-label="Invitar persona" style={{ width: 560 }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div>
            <h3>Invitar persona</h3>
            <p>Le llega un correo para crear su acceso.</p>
          </div>
          <button type="button" className="vpa-x" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label className="vpa-fld">
            <span>Correo</span>
            <input className="vpa-inp" name="email" type="email" required placeholder="nombre@tunegocio.com" />
          </label>
          <input type="hidden" name="role" value={role} />
          <div className="vpa-fld">
            <span>Rol</span>
            <div className="vpa-two">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={role === option.id ? "vpa-choice on" : "vpa-choice"}
                  aria-pressed={role === option.id}
                  onClick={() => setRole(option.id)}
                >
                  <b>{option.label}</b>
                  <span>{option.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="vpa-fld">
            <span>A qué productos puede entrar</span>
            <div className="vpa-two">
              {contracted.map((item) => {
                const product = PANEL_PRODUCTS[item.key];
                const enabled = allowed.includes(item.id);
                const on = enabled && selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    disabled={!enabled}
                    className={on ? "vpa-choice on" : "vpa-choice"}
                    onClick={() => setSelected(on ? selected.filter((id) => id !== item.id) : [...selected, item.id])}
                  >
                    <b>{product.name}</b>
                    <span>{enabled ? product.short : "Solo para Encargado"}</span>
                  </button>
                );
              })}
            </div>
            {selected.filter((id) => allowed.includes(id)).map((id) => (
              <input key={id} type="hidden" name="moduleIds" value={id} />
            ))}
          </div>
          {state.error ? <p role="alert" style={{ color: "var(--red)" }}>{state.error}</p> : null}
          <div className="row">
            <button type="button" className="vpa-btn soft" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="vpa-btn acc" disabled={pending}>
              Enviar invitación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
