'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/hooks/lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  comparison?: number;
  icon: LucideIcon;
  loading?: boolean;
  empty?: boolean;
}

export function KPICard({
  label,
  value,
  comparison = 0,
  icon: Icon,
  loading,
  empty,
}: KPICardProps) {
  const isPositive = comparison > 0;
  const isNegative = comparison < 0;
  const ComparisonIcon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : ArrowRight;

  if (loading) {
    return (
      <div className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-4 animate-pulse">
        <div className="h-4 w-24 rounded bg-[#1a1a1a]" />
        <div className="mt-4 h-8 w-32 rounded bg-[#1a1a1a]" />
        <div className="mt-3 h-5 w-20 rounded bg-[#1a1a1a]" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#080808] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#676B67]">{label}</p>
        <Icon size={18} className="text-[#676B67]" />
      </div>
      <p className="mt-4 text-2xl font-bold text-white">{empty ? '-' : value}</p>
      <div
        className={cn(
          'mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
          isPositive && 'bg-green-500/10 text-green-400',
          isNegative && 'bg-red-500/10 text-red-400',
          !isPositive && !isNegative && 'bg-white/5 text-[#676B67]'
        )}
      >
        <ComparisonIcon size={13} />
        {Math.abs(comparison).toFixed(1)}% vs período anterior
      </div>
    </div>
  );
}
