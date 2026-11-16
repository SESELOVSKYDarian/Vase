"use client";

// Parte de team-board.tsx: TeamBoard.
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { removeMemberAction, revokeInvitationAction, updateInvitationAction, updateMemberAction } from "@/app/(platform)/app/team/actions";
import { PANEL_PRODUCTS } from "@/components/panel/products";
import { TEAM_ROLE_LABEL, assignableModuleIds, type TeamRole } from "@/lib/team/team-access";
import { Contracted, InviteModal, ROLE_OPTIONS, RoleHelp, TeamEntry } from "./InviteModal";

export function TeamBoard({
  entries,
  contracted,
  limitText,
  canInvite,
}: {
  entries: TeamEntry[];
  contracted: Contracted[];
  limitText: string;
  canInvite: boolean;
}) {
  const [menu, setMenu] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<TeamEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const contractedIds = contracted.map((item) => item.id as string);

  const save = (entry: TeamEntry, role: TeamRole, moduleIds: string[]) => {
    startTransition(async () => {
      const result =
        entry.kind === "member"
          ? await updateMemberAction({ membershipId: entry.id, role, moduleIds })
          : await updateInvitationAction({ invitationId: entry.id, role, moduleIds });
      setError(result.error ?? null);
    });
  };

  const remove = (entry: TeamEntry) => {
    startTransition(async () => {
      const result = entry.kind === "member" ? await removeMemberAction(entry.id) : await revokeInvitationAction(entry.id);
      setError(result.error ?? null);
      setConfirmRemove(null);
    });
  };

  return (
    <>
      <section className="vpa-card" aria-label="Personas">
        <div className="vpa-sech">
          <div>
            <h3>Personas de tu equipo</h3>
            <p>{limitText}</p>
          </div>
          <button
            type="button"
            className="vpa-btn acc"
            disabled={!canInvite}
            title={canInvite ? undefined : "Llegaste al límite de personas de tu cuenta"}
            onClick={() => setInviting(true)}
          >
            Invitar persona
          </button>
        </div>
        {error ? <p role="alert" style={{ color: "var(--red)", marginBottom: 10 }}>{error}</p> : null}
        <div className="vpa-tw free">
          <table className="vpa-tbl">
            <thead>
              <tr>
                <th>Persona</th>
                <th>
                  <RoleHelp />
                </th>
                <th>Productos</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const owner = entry.role === "OWNER";
                const roleKey = `role:${entry.id}`;
                const accessKey = `access:${entry.id}`;
                const teamRole = entry.role as TeamRole;
                const allowed = owner ? contractedIds : assignableModuleIds(teamRole, contractedIds);
                return (
                  <tr key={`${entry.kind}:${entry.id}`}>
                    <td>
                      <div className="vpa-person">
                        <span className="vpa-ava" aria-hidden="true">
                          {entry.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={entry.avatarUrl} alt="" />
                          ) : (
                            entry.initials
                          )}
                        </span>
                        <div className="vpa-g1">
                          <b>{entry.name}</b>
                          <span>{entry.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {owner ? (
                        <span className="vpa-mut">{TEAM_ROLE_LABEL.OWNER}</span>
                      ) : (
                        <div className="vpa-fwrap">
                          <button
                            type="button"
                            className="vpa-rolebtn"
                            aria-haspopup="listbox"
                            aria-expanded={menu === roleKey}
                            onClick={() => setMenu(menu === roleKey ? null : roleKey)}
                          >
                            {TEAM_ROLE_LABEL[entry.role]} <span aria-hidden="true">▾</span>
                          </button>
                          {menu === roleKey ? (
                            <div className="vpa-fmenu" role="listbox" aria-label="Rol">
                              {ROLE_OPTIONS.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  role="option"
                                  aria-selected={entry.role === option.id}
                                  className={entry.role === option.id ? "vpa-fopt on" : "vpa-fopt"}
                                  disabled={isPending}
                                  onClick={() => {
                                    setMenu(null);
                                    save(entry, option.id, entry.moduleIds);
                                  }}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td>
                      {owner ? (
                        <span className="vpa-mut">Todos</span>
                      ) : (
                        <div className="vpa-fwrap">
                          <button
                            type="button"
                            className="vpa-rolebtn"
                            aria-haspopup="true"
                            aria-expanded={menu === accessKey}
                            onClick={() => setMenu(menu === accessKey ? null : accessKey)}
                          >
                            {entry.moduleIds.length === 0 ? <span className="vpa-mut">Sin productos</span> : null}
                            {contracted
                              .filter((item) => entry.moduleIds.includes(item.id))
                              .map((item) => {
                                const product = PANEL_PRODUCTS[item.key];
                                return (
                                  <span key={item.id} className="vpa-pchip" style={{ background: product.artBg, color: product.artFg }}>
                                    {product.name.replace("Vase ", "")}
                                  </span>
                                );
                              })}{" "}
                            <span aria-hidden="true">▾</span>
                          </button>
                          {menu === accessKey ? (
                            <div className="vpa-fmenu wide">
                              <div className="vpa-fnote">A qué productos puede entrar</div>
                              {contracted.map((item) => {
                                const product = PANEL_PRODUCTS[item.key];
                                const on = entry.moduleIds.includes(item.id);
                                const enabled = allowed.includes(item.id);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={on}
                                    className="vpa-fopt"
                                    disabled={!enabled || isPending}
                                    onClick={() =>
                                      save(
                                        entry,
                                        teamRole,
                                        on ? entry.moduleIds.filter((id) => id !== item.id) : [...entry.moduleIds, item.id],
                                      )
                                    }
                                  >
                                    <span className={on ? "vpa-cbx on" : "vpa-cbx"} aria-hidden="true">
                                      <Check size={12} strokeWidth={3.5} />
                                    </span>
                                    <span className="vpa-g1">
                                      <b>{product.name}</b>
                                      <span>{enabled ? product.short : "Solo para Encargado"}</span>
                                    </span>
                                  </button>
                                );
                              })}
                              <div className="vpa-fnote">Solo aparecen los productos que tenés contratados.</div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={entry.pending ? "vpa-tag y" : "vpa-tag g"}>
                        <i />
                        {entry.pending ? "Pendiente" : "Activo"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {owner ? null : (
                        <button type="button" className="vpa-btn soft sm" onClick={() => setConfirmRemove(entry)}>
                          {entry.pending ? "Cancelar" : "Quitar"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {menu ? <div className="vpa-menuscrim" onClick={() => setMenu(null)} /> : null}
      {inviting ? <InviteModal contracted={contracted} onClose={() => setInviting(false)} /> : null}

      {confirmRemove ? (
        <div className="vpa-dialog">
          <div role="dialog" aria-label="Confirmar">
            <h3>{confirmRemove.pending ? "¿Cancelar la invitación?" : `¿Quitar a ${confirmRemove.name}?`}</h3>
            <p>{confirmRemove.pending ? "El enlace del correo deja de funcionar." : "Deja de poder entrar a tu cuenta."}</p>
            <div className="row">
              <button type="button" className="vpa-btn soft" onClick={() => setConfirmRemove(null)}>
                Volver
              </button>
              <button type="button" className="vpa-btn ink" disabled={isPending} onClick={() => remove(confirmRemove)}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
