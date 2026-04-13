'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Lock, ShieldCheck, Zap, ArrowRight, BrainCircuit } from 'lucide-react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      Cookies.set('atlas_admin', '1', { expires: 7 });
      router.push('/admin');
      router.refresh();
    } else {
      setError('Neural Key Mismatch. Access Denied.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background-dark overflow-hidden font-display">
      {/* Background Aesthetic */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
        <div className="absolute inset-0 bg-noise opacity-[0.03]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6 animate-in zoom-in-95 duration-1000">
        <div className="glass-card !p-8 border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
          <div className="absolute -right-10 -top-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <BrainCircuit size={160} />
          </div>

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-white/5 border border-white/10 mb-6 group-hover:rotate-6 transition-transform">
              <ShieldCheck className="text-primary size-8" />
            </div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">VaseLabs Portal</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] italic">Secure Access Terminal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-1">Authentication Vector (Password)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 size-4 group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Neural Key..."
                  className="w-full bg-background-dark/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white text-sm outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-700 font-medium"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-[10px] font-black uppercase text-center tracking-widest animate-shake">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="glow-button w-full !py-4 text-[10px] uppercase tracking-[0.3em]"
            >
              {loading ? (
                <div className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>Connect Terminal <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Global Encryption Active</p>
            </div>
            <p className="text-[8px] text-slate-700 font-bold uppercase tracking-[0.2em]">Authorized Personnel Only. Unauthorized access attempts are monitored and logged.</p>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center px-4">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic flex items-center gap-2">
            <Zap size={10} /> v4.0.2 Stable
          </span>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">
            VaseLabs AI Research
          </span>
        </div>
      </div>
    </div>
  );
}
