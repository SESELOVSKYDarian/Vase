
export type NombreZona = 'Zona Terraza' | 'Zona Principal' | 'Zona Cava' | 'Zona Privada';

export const ZONAS: NombreZona[] = ['Zona Terraza', 'Zona Principal', 'Zona Cava', 'Zona Privada'];

export type NombreTurno = 'Turno Mañana' | 'Turno Tarde' | 'Turno Vespertino';

export const TURNOS: NombreTurno[] = ['Turno Mañana', 'Turno Tarde', 'Turno Vespertino'];

export const HORARIOS_TURNOS: Record<NombreTurno, { inicio: number; fin: number }> = {
  'Turno Mañana': { inicio: 8, fin: 13 },
  'Turno Tarde': { inicio: 13, fin: 19 },
  'Turno Vespertino': { inicio: 19, fin: 22 },
};

export interface Mozo {
  id: string;
  nombre: string;
  apellido: string;
  zona: NombreZona;
  posicionCiclo: number; // 0-11, 4 per turno
  activo: boolean;
  creadoEn: Date;
}

export interface AsignacionTurno {
  turno: NombreTurno;
  zona: NombreZona;
  mozo: Mozo;
}

