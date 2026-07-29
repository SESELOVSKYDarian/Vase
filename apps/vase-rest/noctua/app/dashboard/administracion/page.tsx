'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Shield } from 'lucide-react';
import { ConfirmarEliminarUsuario } from '@/components/administracion/ConfirmarEliminarUsuario';
import { UsuarioModal } from '@/components/administracion/UsuarioModal';
import { UsuariosTable } from '@/components/administracion/UsuariosTable';
import { obtenerMensajeError } from '@/components/administracion/usuariosHelpers';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { eliminarUsuario, obtenerUsuarios } from '@/services/usuariosService';
import { eliminarAuthUsuario } from '@/services/authService';
import type { Usuario } from '@/types/usuario';

export default function AdministracionPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await obtenerUsuarios();
      setUsuarios(data);
    } catch {
      toast.error('No se pudieron cargar los usuarios.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void cargar();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [cargar]);

  const abrirCrear = useCallback(() => {
    setUsuarioSeleccionado(null);
    setModalFormAbierto(true);
  }, []);

  const cerrarFormulario = useCallback(() => {
    setModalFormAbierto(false);
  }, []);

  const abrirEditar = useCallback((usuario: Usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalFormAbierto(true);
  }, []);

  const abrirEliminar = useCallback((usuario: Usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalEliminarAbierto(true);
  }, []);

  const cerrarEliminar = useCallback(() => {
    setModalEliminarAbierto(false);
  }, []);

  const confirmarEliminar = useCallback(async () => {
    if (!usuarioSeleccionado) return;

    setEliminando(true);
    try {
      await eliminarAuthUsuario(usuarioSeleccionado.auth_user_id);
      await eliminarUsuario(usuarioSeleccionado.id);
      toast.success('Usuario eliminado');
      await cargar();
      setModalEliminarAbierto(false);
    } catch (err) {
      toast.error(obtenerMensajeError(err, 'No se pudo eliminar el usuario.'));
    } finally {
      setEliminando(false);
    }
  }, [cargar, usuarioSeleccionado]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-[#676B67]" />
          <div>
            <h1 className="text-white font-bold text-xl">Administración</h1>
            <p className="text-[#676B67] text-xs mt-0.5">Gestión de usuarios - {usuarios.length} usuarios registrados</p>
          </div>
        </div>
        <Button onClick={abrirCrear} className="flex items-center gap-2">
          <Plus size={15} />
          Nuevo usuario
        </Button>
      </div>

      <UsuariosTable
        usuarios={usuarios}
        cargando={cargando}
        onCrear={abrirCrear}
        onEditar={abrirEditar}
        onEliminar={abrirEliminar}
      />

      <UsuarioModal
        isOpen={modalFormAbierto}
        onClose={cerrarFormulario}
        usuarioEditar={usuarioSeleccionado}
        onSuccess={cargar}
      />

      <ConfirmarEliminarUsuario
        isOpen={modalEliminarAbierto}
        usuario={usuarioSeleccionado}
        onClose={cerrarEliminar}
        onConfirm={confirmarEliminar}
        eliminando={eliminando}
      />
    </div>
  );
}
