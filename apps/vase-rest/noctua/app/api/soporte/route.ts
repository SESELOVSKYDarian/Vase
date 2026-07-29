import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const COLORES_CATEGORIA: Record<string, string> = {
  bug:      '#ef4444',
  consulta: '#3b82f6',
  mejora:   '#a855f7',
  urgente:  '#f97316',
};

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  bug:      '🐛 Bug',
  consulta: '💬 Consulta',
  mejora:   '✨ Mejora',
  urgente:  '🚨 Urgente',
};

function buildEmailHtml(body: {
  ticketId: string;
  asunto: string;
  categoria: string;
  descripcion: string;
  nombreUsuario: string;
  rolUsuario: string;
  creadoEn: string;
}): string {
  const categoriaColor  = COLORES_CATEGORIA[body.categoria] ?? '#6b7280';
  const categoriaLabel  = ETIQUETAS_CATEGORIA[body.categoria] ?? body.categoria;
  const fechaFormateada = new Date(body.creadoEn).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ticket de Soporte — NOCTUA</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #222222;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#0d0d0d;padding:28px 32px;border-bottom:1px solid #1e1e1e;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:28px;font-weight:900;letter-spacing:0.15em;color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;">NOCTUA</span>
              <p style="margin:4px 0 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#4a4a4a;">Sistema de Soporte</p></td>
              <td align="right"><span style="background:${categoriaColor}22;border:1px solid ${categoriaColor};color:${categoriaColor};padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.05em;">${categoriaLabel}</span></td>
            </tr>
          </table>
        </td></tr>

        <!-- Ticket ID Banner -->
        <tr><td style="background:#161616;padding:14px 32px;border-bottom:1px solid #1e1e1e;">
          <p style="margin:0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#4a4a4a;">Ticket ID</p>
          <p style="margin:2px 0 0;font-size:13px;font-family:'Courier New',monospace;color:#7c7c7c;">${body.ticketId}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">

          <!-- Asunto -->
          <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">${body.asunto}</h1>

          <!-- Meta grid -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="width:50%;padding-right:12px;">
                <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#4a4a4a;">Usuario</p>
                <p style="margin:0;font-size:14px;color:#e5e5e5;font-weight:600;">${body.nombreUsuario}</p>
              </td>
              <td style="width:50%;">
                <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#4a4a4a;">Rol</p>
                <p style="margin:0;font-size:14px;color:#e5e5e5;font-weight:600;text-transform:capitalize;">${body.rolUsuario}</p>
              </td>
            </tr>
            <tr><td colspan="2" style="padding-top:16px;">
              <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#4a4a4a;">Fecha y hora</p>
              <p style="margin:0;font-size:14px;color:#e5e5e5;">${fechaFormateada}</p>
            </td></tr>
          </table>

          <!-- Descripcion -->
          <div style="background:#0d0d0d;border:1px solid #1e1e1e;border-left:3px solid ${categoriaColor};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#4a4a4a;">Descripción</p>
            <p style="margin:0;font-size:14px;line-height:1.65;color:#bcb9b9;white-space:pre-wrap;">${body.descripcion.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>

          <!-- CTA -->
          <p style="margin:0;font-size:13px;color:#676b67;text-align:center;">
            Ingresá al panel de NOCTUA para responder este ticket.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0d0d0d;padding:18px 32px;border-top:1px solid #1e1e1e;text-align:center;">
          <p style="margin:0;font-size:11px;color:#333333;letter-spacing:0.05em;">
            Este es un mensaje automático del sistema NOCTUA. No respondas este email directamente.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      ticketId?: string;
      asunto?: string;
      categoria?: string;
      descripcion?: string;
      nombreUsuario?: string;
      rolUsuario?: string;
      creadoEn?: string;
    };

    // Validación de campos requeridos
    const camposFaltantes = (
      ['ticketId', 'asunto', 'categoria', 'descripcion', 'nombreUsuario', 'rolUsuario', 'creadoEn'] as const
    ).filter((campo) => !body[campo]);

    if (camposFaltantes.length > 0) {
      return NextResponse.json(
        { success: false, error: `Campos requeridos faltantes: ${camposFaltantes.join(', ')}` },
        { status: 400 }
      );
    }

    const supportEmail = process.env.RESEND_SUPPORT_EMAIL;
    const fromEmail    = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

    if (!supportEmail) {
      console.warn('[soporte/route] RESEND_SUPPORT_EMAIL no configurado. Email no enviado.');
      return NextResponse.json({ success: true, ticketId: body.ticketId, emailSkipped: true });
    }

    const validBody = body as Required<typeof body>;

    const { error: resendError } = await resend.emails.send({
      from: `NOCTUA Soporte <${fromEmail}>`,
      to:   [supportEmail],
      subject: `[NOCTUA Soporte] ${validBody.categoria.toUpperCase()} — ${validBody.asunto}`,
      html: buildEmailHtml(validBody),
    });

    if (resendError) {
      console.error('[soporte/route] Error de Resend:', resendError);
      // No falla la respuesta — el ticket ya está en BD
      return NextResponse.json(
        { success: true, ticketId: validBody.ticketId, emailError: resendError.message },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, ticketId: validBody.ticketId });
  } catch (err) {
    console.error('[soporte/route] Error inesperado:', err);
    return NextResponse.json(
      { success: false, error: 'Error interno al procesar la solicitud.' },
      { status: 500 }
    );
  }
}
