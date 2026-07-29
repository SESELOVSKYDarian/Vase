'use client';

import { cn } from '@/hooks/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  className,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer', disabled && 'opacity-40 cursor-not-allowed', className)}>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
          checked ? 'bg-green-500' : 'bg-[#2a2a2a]'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
      {label && <span className="text-xs text-[#BCB9B9]">{label}</span>}
    </label>
  );
}
