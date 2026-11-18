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
      ? "border-[#efcfc6] bg-[#fff6f3] text-[#8A3C2B]"
      : kind === "success"
        ? "border-[#cfe2d1] bg-[#f3faf4] text-[#2f5a35]"
        : "border-[#e3e9e5] bg-[#f7f9f7] text-[#4f5c55]";

  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm leading-6 ${styles}`}>
      {message}
    </div>
  );
}
