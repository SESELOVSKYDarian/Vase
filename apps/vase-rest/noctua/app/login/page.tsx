'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard/mesas');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (error) setShakeKey((k) => k + 1);
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(usuario, password);
    if (success) {
      router.push('/dashboard/mesas');
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
      {/* Background grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      {/* Glow accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl" aria-hidden="true" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-8xl font-black tracking-[0.2em] text-white leading-none">
            NOCTUA
          </h1>
          <p className="text-[#676B67] text-xs tracking-[0.4em] mt-2 uppercase">
            Sistema de Gestión
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          key={shakeKey}
          initial={{ opacity: 0, y: 20 }}
          animate={
            shakeKey > 0
              ? { x: [-8, 8, -6, 6, -4, 4, 0], opacity: 1, y: 0 }
              : { opacity: 1, y: 0 }
          }
          transition={
            shakeKey > 0
              ? { duration: 0.4, ease: 'easeOut' }
              : { duration: 0.4, delay: 0.1, ease: 'easeOut' }
          }
          className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-8"
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Usuario */}
            <div className="space-y-1.5">
              <label htmlFor="login-usuario" className="text-xs font-semibold text-[#BCB9B9] tracking-widest uppercase">
                Usuario
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#676B67]" aria-hidden="true" />
                <input
                  id="login-usuario"
                  type="text"
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => { setUsuario(e.target.value); clearError(); }}
                  placeholder="admin"
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-3 text-sm text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#676B67] transition-colors"
                  aria-label="Nombre de usuario"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-semibold text-[#BCB9B9] tracking-widest uppercase">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#676B67]" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  placeholder="••••"
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg pl-9 pr-10 py-3 text-sm text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#676B67] transition-colors"
                  aria-label="Contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#676B67] hover:text-white transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-xs font-medium py-2 px-3 bg-red-500/10 rounded-lg border border-red-500/20"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <Button
              type="submit"
              loading={isLoading}
              disabled={!usuario || !password}
              className="w-full py-3 text-sm font-bold tracking-widest uppercase"
              aria-label="Iniciar sesión"
            >
              {isLoading ? 'Verificando...' : 'Ingresar'}
            </Button>
          </form>

          {/* Hint */}
          <p className="text-center text-[#2a2a2a] text-xs mt-6 font-mono">
            admin / 1234
          </p>
        </motion.div>
      </div>
    </main>
  );
}
