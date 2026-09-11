import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-150",
        "focus-visible:border-vase-green focus-visible:ring-4 focus-visible:ring-vase-green/10 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("mb-1.5 block text-xs font-medium text-muted-foreground", className)} {...props} />
);

