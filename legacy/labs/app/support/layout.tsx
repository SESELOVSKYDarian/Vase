'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LifeBuoy, MessageSquare, History, Search,
    Settings, LogOut, Bell, Menu, X,
    Activity, ShieldCheck, Zap, Database
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SupportLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const pathname = usePathname();
    const router = useRouter();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const isActive = (path: string) => pathname === path;

    const NavLink = ({ href, icon: Icon, children }: any) => (
        <Link
            href={href}
            className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive(href)
                ? 'bg-secondary/10 text-white border border-secondary/20 shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
        >
            <Icon size={18} className={isActive(href) ? 'text-secondary' : 'group-hover:text-secondary transition-colors'} />
            <span className="text-xs font-black uppercase tracking-widest">{children}</span>
            {isActive(href) && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_10px_#06b6d4]"></div>
            )}
        </Link>
    );

    return (
        <div className="flex min-h-screen bg-[#05060d] font-body text-slate-100 selection:bg-secondary/20">
            {/* Background elements */}
            <div className="fixed inset-0 bg-noise pointer-events-none z-0 opacity-20"></div>

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-full flex flex-col bg-[#0a0b14]/90 backdrop-blur-2xl border-r border-white/5 p-6">
                    <div className="flex items-center gap-3 px-2 mb-10">
                        <div className="size-10 rounded-xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center shadow-[0_0_20px_-5px_#06b6d4]">
                            <LifeBuoy size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Vase<span className="text-secondary">Support</span></h2>
                            <span className="text-[9px] uppercase tracking-[0.3em] font-black text-secondary opacity-80 mt-1 block">Agent Command</span>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-2">
                        <div className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-600 px-4 mb-4">Operations</div>
                        <NavLink href="/support" icon={MessageSquare}>Active Lobby</NavLink>
                        <NavLink href="/support/queue" icon={Activity}>Ticket Queue</NavLink>
                        <NavLink href="/support/history" icon={History}>Archives</NavLink>

                        <div className="pt-8 text-[10px] uppercase tracking-[0.3em] font-black text-slate-600 px-4 mb-4">Resources</div>
                        <NavLink href="/support/kb" icon={Database}>Knowledge Base</NavLink>
                        <NavLink href="/support/search" icon={Search}>Cerebro Search</NavLink>
                        <NavLink href="/support/settings" icon={Settings}>Profile Config</NavLink>
                    </nav>

                    <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary font-black uppercase text-xs italic">SP</div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white uppercase tracking-wider leading-none">Agent Delta</span>
                                <span className="text-[9px] text-secondary font-black uppercase tracking-widest mt-1 opacity-70 italic">Active Hub</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSignOut}
                            className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200"
                        >
                            <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
                            <span className="text-xs font-black uppercase tracking-widest">Detach Session</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-72 relative z-10">
                {/* Top Navbar */}
                <header className="h-20 border-b border-white/5 bg-[#05060d]/60 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden text-slate-400" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                            <Menu size={24} />
                        </button>
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20">
                            <div className="size-1.5 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_#06b6d4]"></div>
                            <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Protocol Response Active</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex items-center gap-2 text-slate-500">
                            <Zap size={14} className="text-orange-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest italic">SLA Status: 100% Correct</span>
                        </div>
                        <button className="relative p-2 text-slate-400 hover:text-white transition group">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 size-2 bg-secondary rounded-full border-2 border-[#05060d] shadow-[0_0_10px_#06b6d4]"></span>
                        </button>
                        <div className="h-6 w-px bg-white/5"></div>
                        <Link href="/admin" className="text-[10px] font-black uppercase text-slate-500 hover:text-secondary transition tracking-widest italic border border-white/10 px-3 py-1.5 rounded-lg transition-all">
                            Client Portal
                        </Link>
                    </div>
                </header>

                <div className="min-h-[calc(100vh-80px)] overflow-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
}
