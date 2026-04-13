'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Clock, Lock, Smartphone, Settings, Menu, Rocket, Bot, History as HistoryIcon, Bell, LogOut, User, ShieldCheck, LifeBuoy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import ModalPortal from '@/components/modal-portal';
import SupportWidget from '@/components/SupportWidget';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
      }
    };
    getData();
  }, []);

  const handleSignOut = () => {
    setShowLogoutConfirm(true);
  };

  const confirmSignOut = async () => {
    console.log("SuperAdmin: Terminating session...");
    await supabase.auth.signOut();
    // Force a hard reload to ensure session is cleared and redirect takes effect
    window.location.href = '/login';
  };

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin';
    return pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-background-dark font-body text-slate-100 transition-colors duration-300 selection:bg-primary/20">
      {/* Background Noise & Gradients */}
      <div className="fixed inset-0 bg-noise pointer-events-none z-0"></div>

      {/* Sidebar Navigation */}
      <aside className="w-72 border-r border-white/5 bg-surface-dark/40 glass-blur flex flex-col fixed h-full z-20 hidden lg:flex">
        <div className="p-8">
          <div className="flex items-center gap-3 group px-2">
            <div className="size-10 relative overflow-hidden rounded-xl glass-card !p-0 flex items-center justify-center bg-white/5">
              <span className="text-2xl font-black text-white">V</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold tracking-tight text-white group-hover:text-primary-light transition-colors">VaseLabs</h2>
              <span className="text-[10px] uppercase tracking-widest text-primary font-black opacity-80">Technology</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-1.5 mt-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black px-4 mb-4">Plataforma</div>

          <Link href="/admin" className={`group premium-sidebar-link ${isActive('/admin') ? 'active' : ''} hover:bg-white/5`}>
            <LayoutDashboard size={20} className={`group-hover:text-primary-light transition ${isActive('/admin') ? 'text-primary-light' : ''}`} />
            <span className="text-sm font-bold">Inicio</span>
          </Link>

          <Link href="/admin/appointments" className={`group premium-sidebar-link ${isActive('/admin/appointments') ? 'active' : ''} hover:bg-white/5`}>
            <Calendar size={20} className={`group-hover:text-secondary transition ${isActive('/admin/appointments') ? 'text-secondary' : ''}`} />
            <span className="text-sm font-bold">Agenda</span>
          </Link>

          <Link href="/admin/services" className={`group premium-sidebar-link ${isActive('/admin/services') ? 'active' : ''} hover:bg-white/5`}>
            <Rocket size={20} className={`group-hover:text-amber-400 transition ${isActive('/admin/services') ? 'text-amber-400' : ''}`} />
            <span className="text-sm font-bold">Servicios</span>
          </Link>

          <div className="pt-10 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black px-4 mb-4">Inteligencia</div>

          <Link href="/admin/connection" className={`group premium-sidebar-link ${isActive('/admin/connection') ? 'active' : ''} hover:bg-white/5`}>
            <Smartphone size={20} className={`group-hover:text-primary transition ${isActive('/admin/connection') ? 'text-primary' : ''}`} />
            <span className="text-sm font-bold">Conexión Bot</span>
          </Link>

          <Link href="/admin/training" className={`group premium-sidebar-link ${isActive('/admin/training') ? 'active' : ''} hover:bg-white/5`}>
            <Bot size={20} className={`group-hover:text-primary-light transition ${isActive('/admin/training') ? 'text-primary-light' : ''}`} />
            <span className="text-sm font-bold">Entrenamiento</span>
          </Link>

          <Link href="/admin/history" className={`group premium-sidebar-link ${isActive('/admin/history') ? 'active' : ''} hover:bg-white/5`}>
            <HistoryIcon size={20} className={`group-hover:text-accent transition ${isActive('/admin/history') ? 'text-accent' : ''}`} />
            <span className="text-sm font-bold">Historia Clínica</span>
          </Link>

          <div className="pt-10 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black px-4 mb-4">Sistema</div>

          <Link href="/admin/availability" className={`group premium-sidebar-link ${isActive('/admin/availability') ? 'active' : ''} hover:bg-white/5`}>
            <Clock size={20} className={`group-hover:text-white transition ${isActive('/admin/availability') ? 'text-white' : ''}`} />
            <span className="text-sm font-bold">Disponibilidad</span>
          </Link>

          <Link href="/admin/blocks" className={`group premium-sidebar-link ${isActive('/admin/blocks') ? 'active' : ''} hover:bg-white/5`}>
            <Lock size={20} className={`group-hover:text-white transition ${isActive('/admin/blocks') ? 'text-white' : ''}`} />
            <span className="text-sm font-bold">Bloqueos</span>
          </Link>

          {(profile?.role === 'super_admin' || profile?.role === 'support') && (
            <div className="pt-10">
              <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-black px-4 mb-4 flex items-center gap-2">
                <ShieldCheck size={12} /> Gestión Staff
              </div>

              {profile?.role === 'super_admin' && (
                <Link href="/super-admin" className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/5 border border-transparent">
                  <ShieldCheck size={20} className="group-hover:text-primary transition-colors text-primary/70" />
                  <span className="text-sm font-bold">Super Admin</span>
                </Link>
              )}

              {(profile?.role === 'support' || profile?.role === 'super_admin') && (
                <Link href="/support" className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/5 border border-transparent">
                  <LifeBuoy size={20} className="group-hover:text-secondary transition-colors text-secondary/70" />
                  <span className="text-sm font-bold">Panel Soporte</span>
                </Link>
              )}
            </div>
          )}

        </nav>

        <div className="p-6 border-t border-white/5">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 glass-blur group hover:border-red-500/30 hover:bg-red-500/5 transition-all text-left"
          >
            <div className="size-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-black text-xs shadow-lg group-hover:scale-105 transition-transform">
              {user?.email?.[0].toUpperCase() || 'V'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black text-white truncate group-hover:text-red-400 transition-colors">
                {user?.email?.split('@')[0] || 'Admin'}
              </p>
              <p className="text-[10px] text-slate-500 font-bold truncate group-hover:text-red-500/70">Cerrar Sesión</p>
            </div>
            <LogOut size={16} className="text-slate-500 group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col relative z-10">
        {/* Header / Top Bar */}
        <header className="h-20 border-b border-white/5 bg-background-dark/40 glass-blur sticky top-0 z-10 px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="lg:hidden size-10 mr-2">
              <span className="text-xl font-black text-white">V</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase italic">Centro de Comando</h1>
            <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
            <span className="hidden sm:flex px-3 py-1 rounded-full text-[10px] bg-green-500/10 text-green-400 font-black uppercase tracking-widest border border-green-500/20">
              Sistema Online
            </span>
          </div>
          <div className="flex items-center gap-6">
            <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
              <div className="size-2 bg-primary rounded-full absolute top-2 right-2 border-2 border-background-dark"></div>
              <Bell size={20} />
            </button>
            <div className="h-6 w-px bg-white/10"></div>
            <button className="lg:hidden p-2 text-white"><Menu /></button>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-black text-white">VaseLabs</span>
              <span className="text-xs text-slate-500 flex items-center gap-1 font-bold uppercase tracking-wider"><span className="size-1.5 rounded-full bg-emerald-500"></span> Production</span>
            </div>
          </div>
        </header>

        <div className="p-10 max-w-[1400px] mx-auto w-full space-y-10">
          {children}
        </div>

      </main>

      {/* Render SupportWidget for everyone (including Admin/Staff) */}
      <SupportWidget />

      {/* LOGOUT CONFIRMATION MODAL */}
      {
        showLogoutConfirm && (
          <ModalPortal>
            <div className="modal-overlay">
              <div className="modal-content !max-w-sm">
                <div className="flex flex-col items-center text-center space-y-6 p-2 relative z-10">
                  <div className="size-20 rounded-full bg-white/5 flex items-center justify-center text-slate-400 mb-2 border border-white/10 shadow-inner">
                    <LogOut size={32} />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase text-white tracking-widest leading-none">¿Cerrar Sesión?</h3>
                    <p className="text-slate-500 text-xs font-bold leading-relaxed px-4">
                      Estás a punto de desconectarte del sistema de administración.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full pt-4">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all cursor-pointer z-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmSignOut}
                      className="w-full py-4 rounded-2xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 cursor-pointer z-50"
                    >
                      Salir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ModalPortal>
        )
      }
    </div >
  );
}

