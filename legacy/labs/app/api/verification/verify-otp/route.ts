import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client
// Fallback al anon key si no hay service role key configurado
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { code, userId } = await request.json();

        if (!code || !userId) {
            return NextResponse.json(
                { error: 'Código y userId son requeridos' },
                { status: 400 }
            );
        }

        // Código maestro para desarrollo
        if (code === '123456' && process.env.NODE_ENV === 'development') {
            // Actualizar perfil como verificado
            await supabaseAdmin
                .from('profiles')
                .update({ email_verified_custom: true })
                .eq('id', userId);

            return NextResponse.json({
                success: true,
                message: 'Código maestro aceptado (modo desarrollo)'
            });
        }

        // Buscar código válido en la DB
        const { data: verificationData, error: fetchError } = await supabaseAdmin
            .from('verification_codes')
            .select('*')
            .eq('user_id', userId)
            .eq('code', code)
            .eq('type', 'email')
            .single();

        if (fetchError || !verificationData) {
            return NextResponse.json(
                { error: 'Código inválido o expirado' },
                { status: 400 }
            );
        }

        // Verificar expiración
        const expiresAt = new Date(verificationData.expires_at);
        if (expiresAt < new Date()) {
            // Eliminar código expirado
            await supabaseAdmin
                .from('verification_codes')
                .delete()
                .eq('id', verificationData.id);

            return NextResponse.json(
                { error: 'El código ha expirado. Solicita uno nuevo.' },
                { status: 400 }
            );
        }

        // Código válido: actualizar perfil
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ email_verified_custom: true })
            .eq('id', userId);

        if (updateError) {
            console.error('Error actualizando perfil:', updateError);
            return NextResponse.json(
                { error: 'Error al verificar la cuenta' },
                { status: 500 }
            );
        }

        // Eliminar código usado
        await supabaseAdmin
            .from('verification_codes')
            .delete()
            .eq('id', verificationData.id);

        return NextResponse.json({
            success: true,
            message: 'Email verificado exitosamente'
        });

    } catch (error) {
        console.error('Error en verify-otp:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
