'use client';

import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { toast } from '@/components/ui/Toast';
import {
  actualizarUsuario,
  crearUsuario,
} from '@/services/usuariosService';
import {
  actualizarAuthUsuario,
  crearAuthUsuario,
} from '@/services/authService';
import type { RolUsuario, Usuario } from '@/types/usuario';
import { obtenerMensajeError } from './usuariosHelpers';

interface FormUsuario {
  nombre: string;
  username: string;
  password: string;
  rol: RolUsuario;
  activo: boolean;
}

const FORM_INICIAL: FormUsuario = {
  nombre: '',
  username: '',
  password: '',
  rol: 'mozo',
  activo: true,
};

interface UsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioEditar: Usuario | null;
  onSuccess: () => void;
}

function UsuarioModalBase({
  isOpen,
  onClose,
  usuarioEditar,
  onSuccess,
}: UsuarioModalProps) {
  const esEdicion = !!usuarioEditar;
  const [form, setForm] = useState<FormUsuario>(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const timer = window.setTimeout(() => {
      setForm(
        usuarioEditar
          ? {
              nombre: usuarioEditar.nombre,
              username: usuarioEditar.username,
              password: '',
              rol: usuarioEditar.rol,
              activo: usuarioEditar.activo,
            }
          : FORM_INICIAL
      );
      setError(null);
      setShowPass(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOpen, usuarioEditar]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    if (!form.username.trim() || form.username.includes('@') || form.username.includes(' ')) {
      setError('Usuario inválido. No debe contener espacios ni el símbolo @.');
      return;
    }

    if (!esEdicion && form.password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (esEdicion && form.password && form.password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    setGuardando(true);

    try {
      const fakeEmail = `${form.username.toLowerCase().trim()}@noctua.local`;

      if (esEdicion && usuarioEditar) {
        await actualizarUsuario(usuarioEditar.id, {
          nombre: form.nombre.trim(),
          username: form.username.trim(),
          rol: form.rol,
          activo: form.activo,
        });

        const authCambios: { email?: string; password?: string } = {};
        if (form.username.trim() !== usuarioEditar.username) authCambios.email = fakeEmail;
        if (form.password) authCambios.password = form.password;

        if (Object.keys(authCambios).length > 0) {
          await actualizarAuthUsuario(usuarioEditar.auth_user_id, authCambios);
        }

        toast.success('Usuario actualizado correctamente');
      } else {
        const authUser = await crearAuthUsuario({
          email: fakeEmail,
          password: form.password,
        });

        await crearUsuario({
          auth_user_id: authUser.id,
          nombre: form.nombre.trim(),
          username: form.username.trim(),
          rol: form.rol,
          activo: form.activo,
        });

        toast.success('Usuario creado correctamente');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(obtenerMensajeError(err, 'Ocurrió un error. Intentá de nuevo.'));
    } finally {
      setGuardando(false);
    }
  };

  const inputCls = 'w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#3a3a3a] focus:outline-none focus:border-[#555] transition-colors';
  const labelCls = 'block text-xs text-[#676B67] font-semibold tracking-widest uppercase mb-1.5';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={esEdicion ? `Editar - ${usuarioEditar?.nombre}` : 'Nuevo Usuario'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="form-nombre" className={labelCls}>Nombre</label>
          <input id="form-nombre" value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} placeholder="Nombre completo" className={inputCls} />
        </div>

        <div>
          <label htmlFor="form-username" className={labelCls}>Usuario</label>
          <input id="form-username" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} placeholder="Ej: juan, pedro, admin" className={inputCls} />
        </div>

        <div>
          <label htmlFor="form-password" className={labelCls}>
            Contraseña {esEdicion && <span className="text-[#444] font-normal normal-case tracking-normal">(dejar vacío para no cambiar)</span>}
          </label>
          <div className="relative">
            <input
              id="form-password"
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder={esEdicion ? '********' : 'Mínimo 4 caracteres'}
              className={`${inputCls} pr-10`}
            />
            <button type="button" onClick={() => setShowPass((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#676B67] hover:text-white transition-colors" aria-label="Mostrar u ocultar contraseña">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="form-rol" className={labelCls}>Rol</label>
          <select id="form-rol" value={form.rol} onChange={(event) => setForm((current) => ({ ...current, rol: event.target.value as RolUsuario }))} className={inputCls}>
            <option value="mozo">Mozo</option>
            <option value="cocina">Cocinero</option>
            <option value="cajero">Cajero</option>
            <option value="admin">Administrador</option>
            <option value="desarrollador">Desarrollador</option>

          </select>
        </div>

        <div className="flex items-center justify-between bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
          <span className="text-sm text-[#BCB9B9] font-medium">Cuenta activa</span>
          <Toggle checked={form.activo} onChange={() => setForm((current) => ({ ...current, activo: !current.activo }))} aria-label="Activar o desactivar cuenta" />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-400 text-xs font-medium py-2 px-3 bg-red-500/10 rounded-lg border border-red-500/20" role="alert">
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={guardando} className="flex-1">Cancelar</Button>
          <Button type="submit" loading={guardando} className="flex-1">{esEdicion ? 'Guardar cambios' : 'Crear usuario'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export const UsuarioModal = memo(UsuarioModalBase);
