type AuthNoticeProps = {
  kind: "error" | "success" | "info";
  message?: string;
};

export function AuthNotice({ kind, message }: AuthNoticeProps) {
  if (!message) {
    return null;
  }

  const styles =
    kind === "error"
      ? "border-[#E6C1B8] bg-[#FFF4F1] text-[#8A3C2B]"
      : kind === "success"
        ? "border-[#C6D9C9] bg-[#F3FAF4] text-[#305A36]"
        : "border-[#D9D1C7] bg-[#F7F3EE] text-[var(--muted)]";

  return <div className={`rounded-2xl border px-4 py-3 text-sm leading-7 ${styles}`}>{message}</div>;
}
