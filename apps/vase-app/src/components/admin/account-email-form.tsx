"use client";

import { useActionState } from "react";
import {
  confirmAdminEmailChangeAction,
  requestAdminEmailChangeAction,
  type AccountEmailState,
} from "@/app/(platform)/app/admin/actions/account-email";

const initial: AccountEmailState = {};

function Status({ state }: { state: AccountEmailState }) {
  if (!state.message) return null;
  return (
    <p role="status" className={state.ok ? "vpa-notice" : "vpa-saveerr"} style={{ margin: 0 }}>
      {state.message}
    </p>
  );
}

/** Admin › Ajustes › Tu cuenta: pedir el cambio de correo (se confirma desde la casilla nueva). */
export function AccountEmailForm({ suggested }: { suggested: string }) {
  const [state, action, pending] = useActionState(requestAdminEmailChangeAction, initial);
  return (
    <form action={action} className="vpa-card stack">
      <div className="vpa-sech">
        <div className="vpa-g1">
          <h3>Cambiar el correo con el que entrás</h3>
          <p>Te mandamos un enlace a la casilla nueva. Hasta que lo abras, seguís entrando con el correo de siempre.</p>
        </div>
      </div>
      <div className="vpa-form">
        <label className="vpa-fld">
          <span>Correo nuevo</span>
          <input className="vpa-inp" name="email" type="email" required defaultValue={suggested} autoComplete="email" />
        </label>
        <label className="vpa-fld">
          <span>Tu contraseña actual</span>
          <input className="vpa-inp" name="password" type="password" required autoComplete="current-password" />
        </label>
      </div>
      <Status state={state} />
      <div>
        <button type="submit" className="vpa-btn acc" disabled={pending}>
          {pending ? "Enviando..." : "Mandar enlace de confirmación"}
        </button>
      </div>
    </form>
  );
}

/** Se muestra al abrir el enlace del correo: un botón para terminar el cambio. */
export function ConfirmAccountEmail({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(confirmAdminEmailChangeAction, initial);
  return (
    <form action={action} className="vpa-card stack">
      <input type="hidden" name="token" value={token} />
      <div className="vpa-sech">
        <div className="vpa-g1">
          <h3>Confirmar el correo nuevo</h3>
          <p>
            Vas a entrar al Admin con <b>{email}</b>.
          </p>
        </div>
      </div>
      <Status state={state} />
      {state.ok ? null : (
        <div>
          <button type="submit" className="vpa-btn acc" disabled={pending}>
            {pending ? "Confirmando..." : "Confirmar el cambio"}
          </button>
        </div>
      )}
    </form>
  );
}
