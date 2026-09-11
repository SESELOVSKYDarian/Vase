import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-vase-green-soft text-vase-green-dark",
        neutral: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success: "border-transparent bg-vase-green-soft text-vase-green-dark",
        warning: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        danger: "border-transparent bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
        info: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

