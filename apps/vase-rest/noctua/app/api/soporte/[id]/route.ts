import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Crea el cliente administrativo de Supabase.
 *
 * Esta función solamente se ejecuta en el servidor.
 * La service role key nunca debe enviarse al frontend.
 */
function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Faltan variables de entorno de Supabase.'
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Obtiene los datos del usuario enviados
 * desde el frontend.
 *
 * Esta solución sirve para el desarrollo local.
 * Para producción debe validarse una sesión real.
 */
function getActor(req: NextRequest) {
  return {
    rol: (
      req.headers.get('x-noctua-role') ?? ''
    )
      .trim()
      .toLowerCase(),

    userId: (
      req.headers.get('x-noctua-user-id') ??
      ''
    ).trim(),

    authUserId: (
      req.headers.get(
        'x-noctua-auth-user-id'
      ) ?? ''
    ).trim(),

    nombre: (
      req.headers.get(
        'x-noctua-user-name'
      ) ?? ''
    ).trim(),
  };
}

/**
 * Permite que el desarrollador responda
 * o cambie el estado de un ticket.
 */
export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    /*
     * El actor se declara una sola vez.
     * Esto corrige el error:
     * Cannot redeclare block-scoped variable 'actor'.
     */
    const actor = getActor(req);

    if (actor.rol !== 'desarrollador') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Solo un desarrollador puede responder tickets.',
        },
        {
          status: 403,
        }
      );
    }

    const { id: ticketId } = await params;

    if (!ticketId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de ticket requerido.',
        },
        {
          status: 400,
        }
      );
    }

    const body = (await req.json()) as {
      estado?: string;
      respuesta_interna?: string;
    };

    if (!body.estado) {
      return NextResponse.json(
        {
          success: false,
          error:
            'El campo "estado" es requerido.',
        },
        {
          status: 400,
        }
      );
    }

    const ESTADOS_VALIDOS = [
      'abierto',
      'en_revision',
      'resuelto',
      'cerrado',
    ];

    if (
      !ESTADOS_VALIDOS.includes(body.estado)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Estado inválido: ${body.estado}`,
        },
        {
          status: 400,
        }
      );
    }

    const supabase = getSupabaseAdmin();

    /*
     * Consultamos primero el ticket para comprobar
     * que exista y conservar una respuesta anterior.
     */
    const {
      data: ticketExistente,
      error: ticketError,
    } = await supabase
      .from('tickets_soporte')
      .select(
        `
          id,
          estado,
          respuesta_interna,
          resuelto_en
        `
      )
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketError) {
      console.error(
        '[soporte/[id]] Error al buscar ticket:',
        ticketError.message
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'No se pudo consultar el ticket.',
        },
        {
          status: 500,
        }
      );
    }

    if (!ticketExistente) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ticket no encontrado.',
        },
        {
          status: 404,
        }
      );
    }

    const respuestaNueva =
      body.respuesta_interna !== undefined
        ? body.respuesta_interna.trim()
        : null;

    const respuestaFinal =
      respuestaNueva !== null
        ? respuestaNueva
        : (
            ticketExistente.respuesta_interna ??
            ''
          ).trim();

    /*
     * Un ticket no puede marcarse como resuelto
     * o cerrado sin una respuesta.
     */
    const requiereRespuesta =
      body.estado === 'resuelto' ||
      body.estado === 'cerrado';

    if (
      requiereRespuesta &&
      !respuestaFinal
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Debés escribir una respuesta antes de resolver o cerrar el ticket.',
        },
        {
          status: 400,
        }
      );
    }

    const ahora = new Date().toISOString();

    const cambios: Record<
      string,
      unknown
    > = {
      estado: body.estado,
      actualizado_en: ahora,
    };

    /*
     * Solo actualizamos la respuesta cuando
     * fue incluida en la solicitud.
     */
    if (
      body.respuesta_interna !== undefined
    ) {
      cambios.respuesta_interna =
        respuestaNueva;
    }

    /*
     * Al resolver el ticket guardamos la fecha.
     * Al cerrarlo conservamos la fecha de resolución
     * o colocamos una nueva si todavía no existía.
     */
    if (body.estado === 'resuelto') {
      cambios.resuelto_en = ahora;
    } else if (body.estado === 'cerrado') {
      cambios.resuelto_en =
        ticketExistente.resuelto_en ?? ahora;
    } else {
      cambios.resuelto_en = null;
    }

    const {
      data: ticketActualizado,
      error: updateError,
    } = await supabase
      .from('tickets_soporte')
      .update(cambios)
      .eq('id', ticketId)
      .select(
        `
          id,
          estado,
          respuesta_interna,
          actualizado_en,
          resuelto_en
        `
      )
      .maybeSingle();

    if (updateError) {
      console.error(
        '[soporte/[id]] Error al actualizar:',
        updateError.message
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'No se pudo actualizar el ticket.',
        },
        {
          status: 500,
        }
      );
    }

    if (!ticketActualizado) {
      return NextResponse.json(
        {
          success: false,
          error:
            'El ticket no pudo actualizarse.',
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      mensaje:
        'Ticket actualizado correctamente.',
      ticket: ticketActualizado,
    });
  } catch (error) {
    console.error(
      '[soporte/[id]] Error inesperado al actualizar:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          'Error interno al actualizar el ticket.',
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * Permite que el administrador propietario
 * elimine un ticket que ya fue respondido.
 */
export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const actor = getActor(req);
    const { id: ticketId } = await params;

    if (!ticketId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de ticket requerido.',
        },
        {
          status: 400,
        }
      );
    }

    if (actor.rol !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Solo un administrador puede eliminar tickets.',
        },
        {
          status: 403,
        }
      );
    }

    const supabase = getSupabaseAdmin();

    const {
      data: ticket,
      error: ticketError,
    } = await supabase
      .from('tickets_soporte')
      .select(
        `
          id,
          usuario_id,
          auth_user_id,
          nombre_usuario,
          estado,
          respuesta_interna
        `
      )
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketError) {
      console.error(
        '[soporte/[id]] Error al consultar ticket:',
        ticketError.message
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'No se pudo consultar el ticket.',
        },
        {
          status: 500,
        }
      );
    }

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ticket no encontrado.',
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Comprobamos que el administrador que intenta
     * eliminarlo sea quien creó el ticket.
     */
    const coincideUsuarioId =
      Boolean(actor.userId) &&
      Boolean(ticket.usuario_id) &&
      actor.userId === ticket.usuario_id;

    const coincideAuthUserId =
      Boolean(actor.authUserId) &&
      Boolean(ticket.auth_user_id) &&
      actor.authUserId ===
        ticket.auth_user_id;

    /*
     * Respaldo para tickets antiguos que no tengan
     * usuario_id ni auth_user_id.
     */
    const coincideNombre =
      !ticket.usuario_id &&
      !ticket.auth_user_id &&
      Boolean(actor.nombre) &&
      actor.nombre ===
        ticket.nombre_usuario;

    const esPropietario =
      coincideUsuarioId ||
      coincideAuthUserId ||
      coincideNombre;

    if (!esPropietario) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No podés eliminar un ticket creado por otro usuario.',
        },
        {
          status: 403,
        }
      );
    }

    const tieneRespuesta =
      typeof ticket.respuesta_interna ===
        'string' &&
      ticket.respuesta_interna.trim()
        .length > 0;

    const estadoRespondido =
      ticket.estado === 'resuelto' ||
      ticket.estado === 'cerrado';

    if (
      !tieneRespuesta ||
      !estadoRespondido
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'El ticket solamente puede eliminarse después de ser respondido y resuelto.',
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: ticketEliminado,
      error: deleteError,
    } = await supabase
      .from('tickets_soporte')
      .delete()
      .eq('id', ticketId)
      .select('id')
      .maybeSingle();

    if (deleteError) {
      console.error(
        '[soporte/[id]] Error al eliminar:',
        deleteError.message
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'No se pudo eliminar el ticket.',
        },
        {
          status: 500,
        }
      );
    }

    if (!ticketEliminado) {
      return NextResponse.json(
        {
          success: false,
          error:
            'El ticket no existe o ya fue eliminado.',
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      mensaje:
        'Ticket eliminado correctamente.',
      ticketId,
    });
  } catch (error) {
    console.error(
      '[soporte/[id]] Error inesperado al eliminar:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          'Error interno al eliminar el ticket.',
      },
      {
        status: 500,
      }
    );
  }
}
