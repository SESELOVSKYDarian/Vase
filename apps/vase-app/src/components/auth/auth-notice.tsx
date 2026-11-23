import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type AuthNoticeProps = {
  kind: "error" | "success" | "info";
  message?: string;
};

/** Aviso arriba del formulario, con ícono y entrada suave. */
export function AuthNotice({ kind, message }: AuthNoticeProps) {
  if (!message) {
    return null;
  }

  const styles =
    kind === "error"
      ? "border-[#f1d6cc] bg-[#fff7f4] text-[#8A3C2B]"
      : kind === "success"
        ? "border-[#cfe2d1] bg-[#f3faf4] text-[#2f5a35]"
        : "border-[#e3e9e5] bg-[#f7f9f7] text-[#4f5c55]";
  const Icon = kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Info;

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`vase-field-in flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm leading-6 ${styles}`}
    >
      <Icon className="mt-[3px] h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
