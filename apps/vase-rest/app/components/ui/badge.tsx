import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={clsx("ui-badge", className)} {...props} />;
}
