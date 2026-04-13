import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client (para insertar en verification_codes)
// Fallback al anon key si no hay service role key configurado
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Email y userId son requeridos' },
        { status: 400 }
      );
    }

    // Generar código OTP
    const code = generateOTP();

    // Guardar en DB con expiración de 15 minutos
    const { error: dbError } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        user_id: userId,
        code,
        type: 'email',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });

    if (dbError) {
      console.error('Error guardando OTP:', dbError);
      return NextResponse.json(
        { error: 'Error al generar código de verificación' },
        { status: 500 }
      );
    }

    // Enviar email con Resend
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      try {
        await resend.emails.send({
          from: process.env.VERIFICATION_EMAIL_FROM || 'onboarding@vaselabs.ai',
          to: email,
          subject: 'Código de Verificación - VaseLabs',
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #6366f1; font-size: 28px; font-weight: 800; margin: 0;">VaseLabs</h1>
                <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Neural Command Center</p>
              </div>
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Tu Código de Verificación</p>
                <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 12px; padding: 20px; margin: 0 auto; display: inline-block;">
                  <p style="color: white; font-size: 36px; font-weight: 900; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${code}</p>
                </div>
              </div>
              
              <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                  Este código expira en <strong style="color: #6366f1;">15 minutos</strong>. 
                  Si no solicitaste este código, puedes ignorar este mensaje de forma segura.
                </p>
              </div>
              
              <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} VaseLabs. Todos los derechos reservados.
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Error enviando email:', emailError);
        // No fallar si el email no se envía, el código sigue siendo válido
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Código enviado exitosamente',
      // En desarrollo, devolver el código para facilitar testing
      ...(process.env.NODE_ENV === 'development' && { code })
    });

  } catch (error) {
    console.error('Error en send-otp:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
