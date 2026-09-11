import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "min-h-11 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-9 text-sm outline-none transition-[border-color,box-shadow] duration-150",
          "focus-visible:border-vase-green focus-visible:ring-4 focus-visible:ring-vase-green/10",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
);
Select.displayName = "Select";

