'use client';

import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { obtenerEstadoHorarioSoporte } from '@/lib/soporte/horarioAtencion';

export function HorarioSoporteCard() {
  const [horario, setHorario] = useState(
    obtenerEstadoHorarioSoporte
  );

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setHorario(obtenerEstadoHorarioSoporte());
    }, 60_000);

    return () => window.clearInterval(intervalo);
  }, []);

  return (
    <section
      className={`rounded-xl border p-4 ${
        horario.abierto
          ? 'border-green-500/30 bg-green-500/10'
          : 'border-yellow-500/30 bg-yellow-500/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <Clock3
          size={20}
          className={
            horario.abierto
              ? 'text-green-400'
              : 'text-yellow-400'
          }
        />

        <div>
          <p className="font-bold text-white">
            Soporte: {horario.estado}
          </p>

          <p className="mt-1 text-sm text-zinc-400">
            Lunes a viernes de 09:00 a 18:00 · Sábados de
            09:00 a 13:00 · Domingos cerrado.
          </p>

          {!horario.abierto && horario.proximaApertura && (
            <p className="mt-2 text-sm text-yellow-300">
              Próxima atención: {horario.proximaApertura}.
            </p>
          )}

          <p className="mt-1 text-xs text-zinc-600">
            Hora de Argentina
          </p>
        </div>
      </div>
    </section>
  );
}