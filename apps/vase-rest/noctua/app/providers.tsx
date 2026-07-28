'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/hooks/lib/queryClient';
import { ToastContainer } from '@/components/ui/Toast';
import { useSuperAdmStore } from '@/store/superadmStore';
import { useEffect } from 'react';

function ThemeApplier() {
  const { config, initializeConfig } = useSuperAdmStore();
  
  useEffect(() => {
    initializeConfig();
  }, [initializeConfig]);

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply colors
    Object.entries(config.theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Apply typography
    root.style.setProperty('--font-family', config.theme.typography.fontFamily);
    root.style.setProperty('--font-size-base', `${config.theme.typography.baseSize}px`);
    root.style.setProperty('--heading-weight', `${config.theme.typography.headingWeight}`);
  }, [config.theme]);

  return null;
}

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      {children}
      <ToastContainer />
    </QueryClientProvider>
  );
}
