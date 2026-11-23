"use client";

// Contraseña con botón de ojo y reglas que se van tildando mientras escribís.
import { Check, Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { authInput, authLabel } from "@/components/auth/auth-ui";
import { FieldError } from "@/components/auth/field-error";

export const PASSWORD_RULES = [
  { id: "len", label: "12 caracteres o más", test: (value: string) => value.length >= 12 },
  { id: "upper", label: "Una mayúscula", test: (value: string) => /[A-Z]/.test(value) },
  { id: "lower", label: "Una minúscula", test: (value: string) => /[a-z]/.test(value) },
  { id: "digit", label: "Un número", test: (value: string) => /[0-9]/.test(value) },
  { id: "symbol", label: "Un símbolo (!@#…)", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export function passwordScore(value: string) {
  return PASSWORD_RULES.filter((rule) => rule.test(value)).length;
}

type PasswordInputProps = {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  value?: string;
  onChange?: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  labelAside?: React.ReactNode;
};

/** Campo de contraseña con ojo para ver lo que escribís. */
export function PasswordInput({ id, name, label, autoComplete, value, onChange, invalid, describedBy, labelAside }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className={authLabel} htmlFor={id}>
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          maxLength={72}
          value={value}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`${authInput} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#66736b] transition-colors duration-200 hover:bg-[#f1f4f2] hover:text-[#191c1b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3B633D]/15"
        >
          <span key={visible ? "off" : "on"} className="vase-pop grid place-items-center">
            {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </span>
        </button>
      </div>
    </div>
  );
}

/** Las reglas de la contraseña, que se tildan en vivo. */
export function PasswordRules({ value, id }: { value: string; id?: string }) {
  const score = passwordScore(value);
  const tone = score <= 2 ? "#d9774b" : score < PASSWORD_RULES.length ? "#c9a227" : "#3B633D";
  return (
    <div id={id} className="space-y-2.5" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden="true">
        {PASSWORD_RULES.map((rule, index) => (
          <span
            key={rule.id}
            className="h-1.5 flex-1 rounded-full bg-[#e6ebe7] transition-colors duration-300"
            style={index < score ? { backgroundColor: tone } : undefined}
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li key={rule.id} className={`flex items-center gap-2 text-[13px] transition-colors duration-200 ${ok ? "text-[#2f5a35]" : "text-[#7b8780]"}`}>
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-all duration-200 ${
                  ok ? "scale-100 border-[#3B633D] bg-[#3B633D] text-white" : "scale-90 border-[#cfd8d2] bg-white text-transparent"
                }`}
                aria-hidden="true"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {rule.label}
              <span className="sr-only">{ok ? "(cumplida)" : "(falta)"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Contraseña nueva + repetirla, con chequeo en vivo. Los errores del servidor se muestran si no hay uno en vivo. */
export function NewPasswordFields({
  serverErrors,
  passwordLabel = "Nueva contraseña",
  confirmLabel = "Repetila",
}: {
  serverErrors?: { password?: string; confirmPassword?: string };
  passwordLabel?: string;
  confirmLabel?: string;
}) {
  const rulesId = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const mismatch = touchedConfirm && confirm.length > 0 && confirm !== password;
  const matches = confirm.length > 0 && confirm === password && passwordScore(password) === PASSWORD_RULES.length;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <PasswordInput
          id="password"
          name="password"
          label={passwordLabel}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          describedBy={rulesId}
          invalid={Boolean(serverErrors?.password) && passwordScore(password) < PASSWORD_RULES.length}
        />
        <PasswordRules value={password} id={rulesId} />
        {password ? null : <FieldError message={serverErrors?.password} />}
      </div>
      <div className="space-y-2">
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label={confirmLabel}
          autoComplete="new-password"
          value={confirm}
          onChange={(next) => {
            setConfirm(next);
            if (next.length >= password.length) setTouchedConfirm(true);
          }}
          invalid={mismatch}
        />
        {mismatch ? <FieldError message="No coincide con la de arriba." /> : null}
        {matches ? (
          <p className="vase-field-in flex items-center gap-2 text-[13px] font-medium text-[#2f5a35]">
            <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" /> Coinciden
          </p>
        ) : null}
        {!mismatch && !confirm ? <FieldError message={serverErrors?.confirmPassword} /> : null}
      </div>
    </div>
  );
}
