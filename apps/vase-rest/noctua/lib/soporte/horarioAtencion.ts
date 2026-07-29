export const ZONA_HORARIA_SOPORTE =
  'America/Argentina/Buenos_Aires';

type HorarioDia = {
  apertura: number;
  cierre: number;
};

const HORARIOS: Record<number, HorarioDia | null> = {
  0: null,
  1: { apertura: 9 * 60, cierre: 18 * 60 },
  2: { apertura: 9 * 60, cierre: 18 * 60 },
  3: { apertura: 9 * 60, cierre: 18 * 60 },
  4: { apertura: 9 * 60, cierre: 18 * 60 },
  5: { apertura: 9 * 60, cierre: 18 * 60 },
  6: { apertura: 9 * 60, cierre: 13 * 60 },
};

const DIAS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

const INDICE_DIA: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function obtenerPartes(fecha: Date) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA_SOPORTE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);

  const valores = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value])
  );

  return {
    dia: INDICE_DIA[valores.weekday],
    hora: Number(valores.hour),
    minuto: Number(valores.minute),
  };
}

function formatearMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;

  return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function obtenerEstadoHorarioSoporte(
  fecha = new Date()
) {
  const { dia, hora, minuto } = obtenerPartes(fecha);
  const minutosActuales = hora * 60 + minuto;
  const horarioActual = HORARIOS[dia];

  const abierto =
    Boolean(horarioActual) &&
    minutosActuales >= horarioActual!.apertura &&
    minutosActuales < horarioActual!.cierre;

  let proximaApertura: string | null = null;

  if (!abierto) {
    for (let desplazamiento = 0; desplazamiento <= 7; desplazamiento++) {
      const diaEvaluado = (dia + desplazamiento) % 7;
      const horario = HORARIOS[diaEvaluado];

      if (!horario) continue;

      if (
        desplazamiento === 0 &&
        minutosActuales < horario.apertura
      ) {
        proximaApertura = `Hoy a las ${formatearMinutos(
          horario.apertura
        )}`;
        break;
      }

      if (desplazamiento === 0) continue;

      const etiqueta =
        desplazamiento === 1
          ? 'Mañana'
          : DIAS[diaEvaluado][0].toUpperCase() +
            DIAS[diaEvaluado].slice(1);

      proximaApertura = `${etiqueta} a las ${formatearMinutos(
        horario.apertura
      )}`;
      break;
    }
  }

  return {
    abierto,
    estado: abierto ? 'En línea' : 'Fuera de horario',
    proximaApertura,
    zonaHoraria: ZONA_HORARIA_SOPORTE,
  };
}