import { supabase } from '@/hooks/lib/supabaseClient';
import type { Usuario, RolUsuario } from '@/types/usuario';

type UsuarioRow = {
  id: string;
  auth_user_id: string;
  nombre: string;
  username: string;
  rol: RolUsuario;
  activo: boolean;
  created_at?: string | null;
  creado_en?: string | null;
};

function mapUsuario(row: UsuarioRow): Usuario {
  const fechaCreacion = row.created_at ?? row.creado_en ?? '';

  return {
    id: row.id,
    auth_user_id: row.auth_user_id,
    nombre: row.nombre,
    username: row.username,
    rol: row.rol,
    activo: row.activo,
    created_at: fechaCreacion,
    creado_en: row.creado_en ?? fechaCreacion,
  };
}

function ordenarPorFechaDesc(a: Usuario, b: Usuario) {
  return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
}

export async function obtenerUsuarios(): Promise<Usuario[]> {
  const primary = await supabase
    .from('usuarios')
    .select('id, auth_user_id, nombre, username, rol, activo, created_at')
    .limit(100);

  if (!primary.error) {
    return ((primary.data ?? []) as UsuarioRow[]).map(mapUsuario).sort(ordenarPorFechaDesc);
  }

  const fallback = await supabase
    .from('usuarios')
    .select('id, auth_user_id, nombre, username, rol, activo, creado_en')
    .limit(100);

  if (fallback.error) {
    console.error('Error al obtener usuarios:', fallback.error);
    throw new Error('No se pudieron cargar los usuarios.');
  }

  return ((fallback.data ?? []) as UsuarioRow[]).map(mapUsuario).sort(ordenarPorFechaDesc);
}

export async function obtenerUsuarioPorAuthId(authUserId: string): Promise<Usuario | null> {
  const primary = await supabase
    .from('usuarios')
    .select('id, auth_user_id, nombre, username, rol, activo, created_at')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!primary.error) {
    return primary.data ? mapUsuario(primary.data as UsuarioRow) : null;
  }

  const fallback = await supabase
    .from('usuarios')
    .select('id, auth_user_id, nombre, username, rol, activo, creado_en')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (fallback.error) {
    console.error('Error al obtener usuario por auth_user_id:', fallback.error);
    return null;
  }

  return fallback.data ? mapUsuario(fallback.data as UsuarioRow) : null;
}

export async function crearUsuario(data: {
  auth_user_id: string;
  nombre: string;
  username: string;
  rol: RolUsuario;
  activo: boolean;
}): Promise<Usuario> {
  const response = await fetch('/api/admin/usuarios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accion: 'crearPerfil',
      ...data,
    }),
  });

  const resultado = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      resultado.error ??
        'No se pudo crear el usuario en la base de datos.'
    );
  }

  if (!resultado.usuario) {
    throw new Error(
      'El servidor no devolvió el usuario creado.'
    );
  }

  return mapUsuario(
    resultado.usuario as UsuarioRow
  );
}

export async function actualizarUsuario(
  id: string,
  cambios: Partial<Pick<Usuario, 'nombre' | 'username' | 'rol' | 'activo'>>
): Promise<void> {
  const { error } = await supabase.from('usuarios').update(cambios).eq('id', id);

  if (error) {
    console.error('Error al actualizar usuario en Supabase:', error);
    throw new Error('No se pudo actualizar el usuario.');
  }
}

export async function eliminarUsuario(id: string): Promise<void> {
  const { error } = await supabase.from('usuarios').delete().eq('id', id);

  if (error) {
    console.error('Error al eliminar usuario en Supabase:', error);
    throw new Error('No se pudo eliminar el usuario.');
  }
}
