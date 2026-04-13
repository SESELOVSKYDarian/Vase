import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client (bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const {
            email,
            password,
            business_name,
            business_type,
            phone,
            bot_tone,
            bot_objective,
            website_url,
            files_count
        } = await request.json();

        // 1. Crear usuario con signUp (mejor compatibilidad con passwords)
        const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: undefined,
                data: {
                    business_name,
                }
            }
        });

        if (authError) {
            console.error('Auth Error:', authError);
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: 'No se pudo crear el usuario' },
                { status: 500 }
            );
        }

        const userId = authData.user.id;

        // 2. Actualizar perfil
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                business_name,
                business_type,
                phone,
                phone_verified: true,
                email_verified_custom: true,
                onboarding_completed: true,
            })
            .eq('id', userId);

        if (profileError) {
            console.error('Profile Error:', profileError);
            // No fallar si el perfil no se actualiza
        }

        // 3. Crear configuración de IA
        const initialConfig = {
            system_prompt: `Eres un asistente de IA para ${business_name}. Tu tono es ${bot_tone} y tu objetivo principal es ${bot_objective}.`,
            temperature: bot_tone === 'formal' ? 0.4 : 0.8,
            knowledge_base: {
                services: [],
                prices: {},
                scraped_url: website_url,
                files_count: files_count || 0
            }
        };

        const { error: aiError } = await supabaseAdmin
            .from('ai_settings')
            .insert({
                user_id: userId,
                key: 'config',
                value: initialConfig
            });

        if (aiError) {
            console.error('AI Settings Error:', aiError);
            // No fallar si la configuración de IA no se guarda
        }

        return NextResponse.json({
            success: true,
            userId,
            message: 'Usuario creado exitosamente'
        });

    } catch (error) {
        console.error('Error en complete-signup:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
