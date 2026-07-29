import type { RolUsuario } from '@/types/usuario';

export const ROL_LABELS: Record<RolUsuario, string> = {
  admin: 'Administrador',
  mozo: 'Mozo',
  cocina: 'Cocinero',
  cajero: 'Cajero',
};

export const ROL_COLORS: Record<RolUsuario, string> = {
  admin: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  mozo: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cocina: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  cajero: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export function obtenerMensajeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function RolBadge({ rol }: { rol: RolUsuario }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${ROL_COLORS[rol]}`}>
      {ROL_LABELS[rol]}
    </span>
  );
}
