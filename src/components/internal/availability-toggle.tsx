"use client";

import { useState } from "react";

const statuses = [
  { key: "ONLINE", label: "Online" },
  { key: "BUSY", label: "Ocupado" },
  { key: "OFFLINE", label: "Offline" },
] as const;

export function AvailabilityToggle({ current }: { current: "ONLINE" | "OFFLINE" | "BUSY" }) {
  const [status, setStatus] = useState(current);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: "ONLINE" | "OFFLINE" | "BUSY") {
    setStatus(next);
    setSaving(true);
    try {
      await fetch("/api/internal/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => handleChange(item.key)}
          disabled={saving}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status === item.key
              ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)]"
              : "border border-[var(--border-subtle)] text-[var(--foreground)]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
