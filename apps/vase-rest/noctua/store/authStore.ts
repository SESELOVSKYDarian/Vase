'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  nombre: string;
  rol: string;
}

interface AuthState {
  usuario: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (usuario: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (usuario: string, password: string) => {
        set({ isLoading: true, error: null });
        // Simulate network delay
        await new Promise((r) => setTimeout(r, 800));

        // TODO: Supabase — reemplazar con: supabase.auth.signInWithPassword({ email, password })
        if (usuario === 'admin' && password === '1234') {
          set({
            usuario: { nombre: 'Administrador', rol: 'admin' },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          // Set cookie for Next.js proxy middleware to read
          document.cookie = `noctua-auth=${JSON.stringify({ state: { isAuthenticated: true } })}; path=/; samesite=lax`;
          return true;
        }

        set({ isLoading: false, error: 'Usuario o contraseña incorrectos' });
        return false;
      },

      logout: () => {
        // TODO: Supabase — reemplazar con: supabase.auth.signOut()
        document.cookie = `noctua-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        set({ usuario: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'noctua-auth',
      partialize: (state) => ({
        usuario: state.usuario,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
