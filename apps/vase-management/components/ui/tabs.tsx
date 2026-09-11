"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface TabsProps {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === t.value ? "text-white" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {value === t.value && (
            <motion.div
              layoutId={`tabs-active-${tabs.map((x) => x.value).join("-")}`}
              className="absolute inset-0 rounded-md bg-vase-green"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

