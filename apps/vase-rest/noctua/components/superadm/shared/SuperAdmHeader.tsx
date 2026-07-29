'use client';

import { useRouter } from 'next/navigation';
import { logout } from '@/app/superadm/login/actions';

export function SuperAdmHeader() {
  const router = useRouter();
  const isDev = process.env.NODE_ENV === 'development';

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="h-16 bg-[#101010] border-b border-[#252525] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-white">Super Admin</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400`}>
          {isDev ? 'DESARROLLO' : 'PRODUCCIÓN'}
        </span>
      </div>

      <button
        onClick={handleLogout}
        className="px-4 py-2 rounded-lg bg-[#1a1a1a] text-white hover:bg-[#252525] transition-colors"
      >
        Cerrar sesión
      </button>
    </header>
  );
}
