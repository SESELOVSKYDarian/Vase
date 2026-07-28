"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { RestStaffRole } from "@vase/contracts";
import { readCloudStaffToken } from "@/lib/edge/local-edge-client";

type Branch = { id: string; name: string };
type Staff = {
  id: string;
  employeeCode: string;
  displayName: string;
  active: boolean;
  roles: Array<{ branchId: string; role: RestStaffRole }>;
};
const roles: RestStaffRole[] = [
  "OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "STOCK", "DELIVERY",
];

export default function OwnerStaffPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const token = readCloudStaffToken();
    const headers: Record<string, string> = token
      ? { authorization: `Bearer ${token}` } : {};
    const [branchResponse, staffResponse] = await Promise.all([
      fetch("/api/v1/branches", { headers, cache: "no-store" }),
      fetch("/api/v1/staff", { headers, cache: "no-store" }),
    ]);
    const [branchPayload, staffPayload] = await Promise.all([
      branchResponse.json(), staffResponse.json(),
    ]);
    if (!branchResponse.ok) throw new Error(branchPayload.error);
    if (!staffResponse.ok) throw new Error(staffPayload.error);
    setBranches(branchPayload.branches);
    setStaff(staffPayload.staff);
  }, []);
  useEffect(() => { void load().catch((cause) => setError(String(cause))); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/staff", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(readCloudStaffToken()
          ? { authorization: `Bearer ${readCloudStaffToken()}` } : {}),
      },
      body: JSON.stringify({
        employeeCode: form.get("employeeCode"),
        displayName: form.get("displayName"),
        pin: form.get("pin"),
        roles: [{ branchId: form.get("branchId"), role: form.get("role") }],
      }),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    event.currentTarget.reset();
    await load();
  }

  async function patch(id: string, changes: Record<string, unknown>) {
    setError("");
    const response = await fetch(`/api/v1/staff/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...(readCloudStaffToken()
          ? { authorization: `Bearer ${readCloudStaffToken()}` } : {}),
      },
      body: JSON.stringify(changes),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    await load();
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Acceso rápido por sucursal</p>
      <h1>Equipo y permisos</h1>
      <p>Cada persona ingresa con su código y PIN en un dispositivo enrolado. Los cambios de PIN o baja revocan sus sesiones activas.</p>
      <form className="inline-form" onSubmit={create}>
        <label>Código<input name="employeeCode" minLength={2} maxLength={20} required /></label>
        <label>Nombre<input name="displayName" minLength={2} maxLength={100} required /></label>
        <label>PIN inicial<input name="pin" type="password" inputMode="numeric" pattern="\d{4,8}" required /></label>
        <label>Sucursal<select name="branchId" required>
          <option value="">Seleccionar</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select></label>
        <label>Rol<select name="role">{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
        <button className="button button-primary">Crear acceso</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">
        {staff.map((employee) => (
          <article className="ui-card" key={employee.id}>
            <code>{employee.employeeCode}</code><h2>{employee.displayName}</h2>
            <p>{employee.roles.map((assignment) =>
              `${branches.find((branch) => branch.id === assignment.branchId)?.name ?? assignment.branchId}: ${assignment.role}`)
              .join(" · ")}</p>
            <p>{employee.active ? "Activo" : "Deshabilitado"}</p>
            <form className="settings-form" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const assignments = branches.flatMap((branch) => {
                const role = String(form.get(`role:${branch.id}`));
                return role === "NONE" ? [] : [{ branchId: branch.id, role }];
              });
              if (!assignments.length) {
                setError("Cada persona debe conservar al menos una sucursal.");
                return;
              }
              void patch(employee.id, { roles: assignments });
            }}>
              {branches.map((branch) => <label key={branch.id}>{branch.name}
                <select name={`role:${branch.id}`} defaultValue={
                  employee.roles.find((item) => item.branchId === branch.id)?.role ?? "NONE"
                }>
                  <option value="NONE">Sin acceso</option>
                  {roles.map((role) => <option key={role}>{role}</option>)}
                </select>
              </label>)}
              <button className="button">Guardar roles por sucursal</button>
            </form>
            <form className="inline-form" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void patch(employee.id, { pin: form.get("pin") });
            }}>
              <label>Nuevo PIN<input name="pin" type="password" inputMode="numeric" pattern="\d{4,8}" required /></label>
              <button className="button">Rotar PIN</button>
            </form>
            <button className="button" onClick={() =>
              void patch(employee.id, { active: !employee.active })}>
              {employee.active ? "Deshabilitar y cerrar sesiones" : "Reactivar"}
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
