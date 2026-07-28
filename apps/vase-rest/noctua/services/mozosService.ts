
import { supabase } from '@/hooks/lib/supabaseClient';
import type { Mozo } from '@/types/mozos';
import type { RealtimeChannel } from '@supabase/supabase-js';

type MozoRow = {
  id: string;
  nombre: string;
  apellido: string;
  zona: string;
  posicion_ciclo: number;
  activo: boolean;
  creado_en: string | null;
};

function mapMozo(row: MozoRow): Mozo {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    zona: row.zona as any,
    posicionCiclo: row.posicion_ciclo,
    activo: row.activo,
    creadoEn: row.creado_en ? new Date(row.creado_en) : new Date(),
  };
}

export async function obtenerMozos(): Promise<Mozo[]> {
  const { data, error } = await supabase
    .from('mozos')
    .select('id, nombre, apellido, zona, posicion_ciclo, activo, creado_en')
    .order('posicion_ciclo', { ascending: true });

  if (error) {
    console.error('Error al obtener mozos:', error);
    throw new Error('No se pudieron cargar los mozos.');
  }

  return ((data ?? []) as MozoRow[]).map(mapMozo);
}

export function suscribirCambiosMozos(
  onInsert: (mozo: Mozo) => void,
  onUpdate: (mozo: Mozo) => void,
  onDelete: (id: string) => void
): RealtimeChannel {
  return supabase
    .channel('mozos-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mozos' },
      (payload) => {
        onInsert(mapMozo(payload.new as MozoRow));
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'mozos' },
      (payload) => {
        onUpdate(mapMozo(payload.new as MozoRow));
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'mozos' },
      (payload) => {
        onDelete((payload.old as { id: string }).id);
      }
    )
    .subscribe();
}

export async function crearMozo(data: Omit<Mozo, 'id' | 'creadoEn'>): Promise<void> {
  const response = await fetch('/api/admin/mozos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accion: 'crear',
      nombre: data.nombre,
      apellido: data.apellido,
      zona: data.zona,
      posicion_ciclo: data.posicionCiclo,
      activo: data.activo,
    }),
  });
  const resultado = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(resultado.error ?? 'No se pudo crear el mozo.');
  }
}

export async function actualizarMozo(id: string, cambios: Partial<Omit<Mozo, 'id' | 'creadoEn'>>): Promise<void> {
  const response = await fetch('/api/admin/mozos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accion: 'actualizar',
      id,
      nombre: cambios.nombre,
      apellido: cambios.apellido,
      zona: cambios.zona,
      posicion_ciclo: cambios.posicionCiclo,
      activo: cambios.activo,
    }),
  });
  const resultado = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(resultado.error ?? 'No se pudo actualizar el mozo.');
  }
}

export async function eliminarMozo(id: string): Promise<void> {
  const response = await fetch('/api/admin/mozos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'eliminar', id }),
  });
  const resultado = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(resultado.error ?? 'No se pudo eliminar el mozo.');
  }
}
