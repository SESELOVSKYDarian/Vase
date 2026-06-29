"use client";

import type { PropsWithChildren } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = PropsWithChildren<{
  pendingLabel: string;
  className?: string;
}>;

export function SubmitButton({
  pendingLabel,
  className,
  children,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
