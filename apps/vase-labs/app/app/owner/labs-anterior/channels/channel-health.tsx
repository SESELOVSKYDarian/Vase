import { Check, CircleAlert, Clock3 } from "lucide-react";

export type ChannelHealth = {
  webhookVerified: boolean;
  credentialsPresent: boolean;
  assetVerified: boolean;
  subscriptionActive: boolean;
};

const checks: Array<[keyof ChannelHealth, string]> = [
  ["credentialsPresent", "Credenciales"],
  ["assetVerified", "Activo Meta"],
  ["webhookVerified", "Webhook"],
  ["subscriptionActive", "Suscripción"],
];

export function ChannelHealthList({ health, compact = false }: { health: ChannelHealth; compact?: boolean }) {
  return <ul className={compact ? "labs-channel-health is-compact" : "labs-channel-health"} aria-label="Estado de la conexión">
    {checks.map(([key, label]) => {
      const valid = health[key];
      return <li key={key} className={valid ? "is-valid" : "is-invalid"}>
        {valid ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
        <span>{label}</span><span className="sr-only">: {valid ? "correcto" : "requiere atención"}</span>
      </li>;
    })}
  </ul>;
}

export function ChannelStatusSummary({ status, health, lastCheckedAt }: { status: string; health: ChannelHealth; lastCheckedAt?: string | null }) {
  const failed = Object.values(health).filter((value) => !value).length;
  const copy = status === "ERROR" ? ["Se detectaron problemas", "danger"] : failed ? ["El canal necesita atención", "warning"] : ["Todo funciona correctamente", "success"];
  return <section className={`labs-channel-status-summary is-${copy[1]}`} aria-label="Resumen del estado">
    {copy[1] === "success" ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
    <div><strong>{copy[0]}</strong><span><Clock3 aria-hidden="true" /> {lastCheckedAt ? `Última comprobación: ${formatChannelDate(lastCheckedAt)}` : "Nunca comprobado"}</span></div>
  </section>;
}

export function formatChannelDate(value: string | null | undefined) {
  if (!value) return "Nunca comprobado";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
