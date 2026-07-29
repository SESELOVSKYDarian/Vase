'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Pencil, Shield, Trash2, UserCheck, UserX } from 'lucide-react';
import type { Usuario } from '@/types/usuario';
import { RolBadge } from './usuariosHelpers';

interface UsuariosTableProps {
  usuarios: Usuario[];
  cargando: boolean;
  onCrear: () => void;
  onEditar: (usuario: Usuario) => void;
  onEliminar: (usuario: Usuario) => void;
}

function UsuariosTableBase({
  usuarios,
  cargando,
  onCrear,
  onEditar,
  onEliminar,
}: UsuariosTableProps) {
  if (cargando) {
    return (
      <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="flex items-center justify-center py-20 text-[#676B67] gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Cargando usuarios...</span>
        </div>
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Shield size={32} className="text-[#2a2a2a]" />
          <p className="text-[#3a3a3a] text-sm">No hay usuarios registrados</p>
          <button onClick={onCrear} className="text-xs text-[#676B67] underline hover:text-white transition-colors">Crear el primero</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              {['Nombre', 'Usuario', 'Rol', 'Estado', 'Creado', 'Acciones'].map((header) => (
                <th key={header} className="px-5 py-3 text-left text-xs font-semibold text-[#676B67] tracking-widest uppercase">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario, index) => (
              <motion.tr key={usuario.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="border-b border-[#0f0f0f] hover:bg-white/[0.02] transition-colors group">
                <td className="px-5 py-4"><p className="text-white text-sm font-semibold">{usuario.nombre}</p></td>
                <td className="px-5 py-4"><p className="text-[#BCB9B9] text-sm font-mono">{usuario.username}</p></td>
                <td className="px-5 py-4"><RolBadge rol={usuario.rol} /></td>
                <td className="px-5 py-4">
                  {usuario.activo ? (
                    <span className="inline-flex items-center gap-1.5 text-green-400 text-xs font-semibold"><UserCheck size={13} /> Activo</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[#676B67] text-xs font-semibold"><UserX size={13} /> Inactivo</span>
                  )}
                </td>
                <td className="px-5 py-4"><p className="text-[#676B67] text-xs">{usuario.created_at ? new Date(usuario.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEditar(usuario)} aria-label={`Editar ${usuario.nombre}`} className="p-2 rounded-lg text-[#676B67] hover:text-white hover:bg-white/5 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => onEliminar(usuario)} aria-label={`Eliminar ${usuario.nombre}`} className="p-2 rounded-lg text-[#676B67] hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-[#111]">
        {usuarios.map((usuario) => (
          <div key={usuario.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-semibold text-sm">{usuario.nombre}</p>
                <p className="text-[#676B67] text-xs font-mono mt-0.5">{usuario.username}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onEditar(usuario)} aria-label={`Editar ${usuario.nombre}`} className="p-2 rounded-lg text-[#676B67] hover:text-white hover:bg-white/5 transition-colors"><Pencil size={14} /></button>
                <button onClick={() => onEliminar(usuario)} aria-label={`Eliminar ${usuario.nombre}`} className="p-2 rounded-lg text-[#676B67] hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <RolBadge rol={usuario.rol} />
              {usuario.activo ? (
                <span className="inline-flex items-center gap-1 text-green-400 text-xs"><UserCheck size={11} /> Activo</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#676B67] text-xs"><UserX size={11} /> Inactivo</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const UsuariosTable = memo(UsuariosTableBase);
