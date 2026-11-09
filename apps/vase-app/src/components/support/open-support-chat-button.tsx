"use client";

import { CircleHelp } from "lucide-react";
import { useSupportChat } from "@/components/support/support-chat-context";

export function OpenSupportChatButton({ className, label }: { className?: string; label?: string }) {
  const { openSupportChat } = useSupportChat();

  return (
    <button
      type="button"
      onClick={openSupportChat}
      className={
        className ??
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)]"
      }
    >
      {label ?? (
        <>
          <CircleHelp className="size-4" />
          Abrir ayuda
        </>
      )}
    </button>
  );
}

