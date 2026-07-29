'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/hooks/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold tracking-wide transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none';

    const variants = {
      primary: 'bg-white text-black hover:bg-[#D9D9D9] active:scale-[0.97]',
      secondary: 'bg-[#1a1a1a] text-[#D9D9D9] border border-[#2a2a2a] hover:bg-[#222] hover:border-[#3a3a3a] active:scale-[0.97]',
      ghost: 'text-[#BCB9B9] hover:text-white hover:bg-white/5 active:scale-[0.97]',
      danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.97]',
      success: 'bg-green-500 text-black hover:bg-green-400 active:scale-[0.97]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded',
      md: 'px-4 py-2 text-sm rounded-md',
      lg: 'px-6 py-3 text-base rounded-md',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
