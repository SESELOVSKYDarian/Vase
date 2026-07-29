'use client';

import { SuperAdmSidebar } from '@/components/superadm/shared/SuperAdmSidebar';
import { SuperAdmHeader } from '@/components/superadm/shared/SuperAdmHeader';

export default function SuperAdmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <SuperAdmSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <SuperAdmHeader />
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
