import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={clsx("ui-card", className)} {...props} />;
}
