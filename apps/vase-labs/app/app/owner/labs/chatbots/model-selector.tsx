"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { OpenAiModelProfile, OpenAiModelProfileId } from "../../../../lib/openai-reply-generator";

type ModelSelectorProps = {
  profiles: OpenAiModelProfile[];
  currentModel: string;
};

export function ModelSelector({ profiles, currentModel }: ModelSelectorProps) {
  const router = useRouter();
  const initialProfileId = useMemo(
    () => profiles.find((profile) => profile.model === currentModel)?.id ?? null,
    [currentModel, profiles],
  );
  const [selected, setSelected] = useState<OpenAiModelProfileId | null>(initialProfileId);
  const [busy, setBusy] = useState<OpenAiModelProfileId | null>(null);
  const [message, setMessage] = useState("");

  async function choose(profileId: OpenAiModelProfileId) {
    setSelected(profileId);
    setBusy(profileId);
    setMessage("");

    try {
      const response = await fetch("/api/labs/assistant/model", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? "ASSISTANT_MODEL_UPDATE_FAILED");
      }

      setMessage("Modelo actualizado.");
      router.refresh();
    } catch {
      setSelected(initialProfileId);
      setMessage("No pudimos actualizar el modelo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="labs-panel p-5">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="vase-kicker">ChatGPT</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--foreground)]">Modelo del chatbot</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Elegi el perfil que va a usar este asistente para responder en los canales conectados.
          </p>
        </div>
        <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--muted)]">
          Actual: {currentModel}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {profiles.map((profile) => {
          const isSelected = selected === profile.id || (!selected && profile.model === currentModel);
          const isBusy = busy === profile.id;

          return (
            <button
              key={profile.id}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void choose(profile.id)}
              aria-pressed={isSelected}
              className={`labs-provider-option ${isSelected ? "is-active" : ""}`}
            >
              <span>
                <strong>{profile.label}</strong>
                <small>{profile.description}</small>
                <code className="labs-model-id">{profile.model}</code>
              </span>
              {isBusy ? <Loader2 className="size-5 animate-spin" /> : isSelected ? <CheckCircle2 className="size-5" /> : null}
            </button>
          );
        })}
      </div>

      {message ? <p className="mt-4 text-xs font-bold text-[var(--muted)]" aria-live="polite">{message}</p> : null}
    </section>
  );
}
