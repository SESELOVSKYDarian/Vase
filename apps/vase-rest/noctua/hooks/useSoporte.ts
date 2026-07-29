'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { toast } from '@/components/ui/Toast';
import { supabase } from '@/hooks/lib/supabaseClient';
import {
  createTicket,
  getAllTickets,
  getMyTickets,
} from '@/services/soporteService';
import { useAuthStore } from '@/store/authStore';

import type {
  CreateTicketPayload,
  TicketEstado,
  TicketSoporte,
} from '@/types/soporte';

interface UseSoporteReturn {
  tickets: TicketSoporte[];
  loading: boolean;
  error: string | null;
  submitting: boolean;

  crearTicket: (
    payload: CreateTicketPayload
  ) => Promise<boolean>;

  actualizarEstado: (
    id: string,
    estado: TicketEstado,
    respuesta?: string
  ) => Promise<void>;

  eliminarTicket: (
    id: string
  ) => Promise<boolean>;

  refetch: () => void;
}

type UsuarioActual = {
  nombre: string;
  rol: string;
};

type IdentidadUsuario = {
  dbUserId: string | null;
  authUserId: string | null;
  nombre: string;
  rol: string;
};

/**
 * Obtiene los identificadores reales del usuario desde
 * la sesión de Supabase.
 *
 * No intenta leer id o auth_user_id desde authStore,
 * porque AuthUser actualmente solamente contiene
 * nombre y rol.
 */
async function obtenerIdentidadUsuario(
  usuario: UsuarioActual
): Promise<IdentidadUsuario> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.warn(
      'No se pudo obtener la sesión de Supabase:',
      sessionError.message
    );
  }

  const authUserId =
    session?.user?.id ?? null;

  let dbUserId: string | null = null;

  if (authUserId) {
    const {
      data: usuarioDb,
      error: usuarioError,
    } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (usuarioError) {
      console.warn(
        'No se pudo obtener el usuario de la base de datos:',
        usuarioError.message
      );
    }

    dbUserId = usuarioDb?.id ?? null;
  }

  return {
    dbUserId,
    authUserId,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };
}

export function useSoporte(): UseSoporteReturn {
  const usuario = useAuthStore(
    (state) => state.usuario
  );

  const isAdmin =
    usuario?.rol === 'admin';

  const isDeveloper =
    usuario?.rol === 'desarrollador';

  const [tickets, setTickets] =
    useState<TicketSoporte[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  /**
   * Carga los tickets correspondientes
   * según el rol del usuario.
   */
  const fetchTickets =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        if (!usuario) {
          setTickets([]);
          return;
        }

        let data: TicketSoporte[] = [];

        if (isDeveloper) {
          data = await getAllTickets();
        } else if (isAdmin) {
          data = await getMyTickets();
        }

        setTickets(data);
      } catch (err) {
        const mensaje =
          err instanceof Error
            ? err.message
            : 'Error al cargar tickets';

        setError(mensaje);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    }, [
      isAdmin,
      isDeveloper,
      usuario,
    ]);

/**
 * Carga inicial de tickets.
 *
 * Se utiliza setTimeout para evitar actualizar
 * estados de forma sincrónica dentro del efecto.
 */
useEffect(() => {
  const timer = window.setTimeout(() => {
    void fetchTickets();
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [fetchTickets]);
  /**
   * Crea un nuevo ticket.
   * Solamente puede hacerlo el administrador.
   */
  const crearTicket = useCallback(
    async (
      payload: CreateTicketPayload
    ): Promise<boolean> => {
      if (!usuario) {
        toast.error(
          'Error',
          'Debés estar autenticado para crear un ticket.'
        );

        return false;
      }

      if (!isAdmin) {
        toast.error(
          'Acceso denegado',
          'Solo el administrador puede crear tickets.'
        );

        return false;
      }

      if (submitting) {
        return false;
      }

      setSubmitting(true);

      try {
        const identidad =
          await obtenerIdentidadUsuario(
            usuario
          );

        const nuevoTicket =
          await createTicket(
            payload,
            {
              id: identidad.dbUserId,
              auth_user_id:
                identidad.authUserId,
              nombre:
                identidad.nombre,
              rol: identidad.rol,
            }
          );

        /**
         * Envía la notificación por correo.
         * Si falla, el ticket permanece guardado.
         */
        try {
          const emailResponse =
            await fetch('/api/soporte', {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                ticketId:
                  nuevoTicket.id,

                asunto:
                  nuevoTicket.asunto,

                categoria:
                  nuevoTicket.categoria,

                descripcion:
                  nuevoTicket.descripcion,

                nombreUsuario:
                  identidad.nombre,

                rolUsuario:
                  identidad.rol,

                creadoEn:
                  nuevoTicket.creado_en,
              }),
            });

          if (!emailResponse.ok) {
            const emailError =
              await emailResponse
                .json()
                .catch(() => ({}));

            console.warn(
              'El ticket fue guardado, pero el correo no pudo enviarse:',
              emailError.error ??
                emailError.message ??
                emailResponse.statusText
            );
          }
        } catch (emailError) {
          console.warn(
            'El ticket fue guardado, pero ocurrió un error al enviar el correo:',
            emailError
          );
        }

        setTickets((actuales) => [
          nuevoTicket,
          ...actuales,
        ]);

        toast.success(
          'Ticket enviado',
          'Tu solicitud fue registrada correctamente.'
        );

        return true;
      } catch (err) {
        const mensaje =
          err instanceof Error
            ? err.message
            : 'Error al crear el ticket';

        toast.error(
          'Error al enviar ticket',
          mensaje
        );

        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [
      isAdmin,
      submitting,
      usuario,
    ]
  );

  /**
   * Permite que el desarrollador responda
   * y cambie el estado del ticket.
   */
  const actualizarEstado =
    useCallback(
      async (
        id: string,
        estado: TicketEstado,
        respuesta?: string
      ): Promise<void> => {
        if (!usuario) {
          toast.error(
            'Error',
            'Debés estar autenticado.'
          );

          return;
        }

        if (!isDeveloper) {
          toast.error(
            'Acceso denegado',
            'Solo un desarrollador puede responder tickets.'
          );

          return;
        }

        if (!id) {
          toast.error(
            'Error',
            'El ID del ticket es obligatorio.'
          );

          return;
        }

        const requiereRespuesta =
          estado === 'resuelto' ||
          estado === 'cerrado';

        if (
          requiereRespuesta &&
          !respuesta?.trim()
        ) {
          toast.error(
            'Falta una respuesta',
            'Escribí una respuesta antes de resolver o cerrar el ticket.'
          );

          return;
        }

        try {
          const identidad =
            await obtenerIdentidadUsuario(
              usuario
            );

          const response = await fetch(
            `/api/soporte/${id}`,
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',

                'x-noctua-role':
                  identidad.rol,

                'x-noctua-user-id':
                  identidad.dbUserId ?? '',

                'x-noctua-auth-user-id':
                  identidad.authUserId ??
                  '',

                'x-noctua-user-name':
                  identidad.nombre,
              },

              body: JSON.stringify({
                estado,

                ...(respuesta !==
                  undefined && {
                  respuesta_interna:
                    respuesta.trim(),
                }),
              }),
            }
          );

          const resultado =
            await response
              .json()
              .catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              resultado.error ??
                'Error al actualizar el estado del ticket.'
            );
          }

          await fetchTickets();

          toast.success(
            'Ticket actualizado',
            estado === 'resuelto'
              ? 'El ticket fue respondido y marcado como resuelto.'
              : `Ticket marcado como "${estado}".`
          );
        } catch (err) {
          const mensaje =
            err instanceof Error
              ? err.message
              : 'Error al actualizar el ticket';

          toast.error(
            'Error al actualizar',
            mensaje
          );
        }
      },
      [
        fetchTickets,
        isDeveloper,
        usuario,
      ]
    );

  /**
   * Permite que el administrador elimine
   * un ticket respondido.
   */
  const eliminarTicket = useCallback(
    async (
      id: string
    ): Promise<boolean> => {
      if (!usuario) {
        toast.error(
          'Error',
          'Debés estar autenticado.'
        );

        return false;
      }

      if (!isAdmin) {
        toast.error(
          'Acceso denegado',
          'Solo el administrador propietario puede eliminar tickets.'
        );

        return false;
      }

      if (!id) {
        toast.error(
          'Error',
          'El ID del ticket es obligatorio.'
        );

        return false;
      }

      try {
        const identidad =
          await obtenerIdentidadUsuario(
            usuario
          );

        const response = await fetch(
          `/api/soporte/${id}`,
          {
            method: 'DELETE',

            headers: {
              'x-noctua-role':
                identidad.rol,

              'x-noctua-user-id':
                identidad.dbUserId ?? '',

              'x-noctua-auth-user-id':
                identidad.authUserId ?? '',

              'x-noctua-user-name':
                identidad.nombre,
            },
          }
        );

        const resultado =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            resultado.error ??
              'No se pudo eliminar el ticket.'
          );
        }

        setTickets((actuales) =>
          actuales.filter(
            (ticket) =>
              ticket.id !== id
          )
        );

        toast.success(
          'Ticket eliminado',
          'El ticket fue eliminado correctamente.'
        );

        return true;
      } catch (err) {
        const mensaje =
          err instanceof Error
            ? err.message
            : 'No se pudo eliminar el ticket';

        toast.error(
          'Error al eliminar',
          mensaje
        );

        return false;
      }
    },
    [
      isAdmin,
      usuario,
    ]
  );

  return {
    tickets,
    loading,
    error,
    submitting,
    crearTicket,
    actualizarEstado,
    eliminarTicket,

    refetch: () => {
      void fetchTickets();
    },
  };
}
