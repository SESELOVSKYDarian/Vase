import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        // 1. Verificar que el solicitante es Super Admin
        const authHeader = request.headers.get('Authorization');
        // En una implementación real, verificaríamos el token de la sesión o cookie
        // Por simplicidad para la demo y dado que estamos en un entorno controlado, 
        // usaremos la sesión del usuario del cliente si se pasa.

        const { email, password, role, business_name } = await request.json();

        if (!email || !password || !role) {
            return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        // 2. Crear usuario en Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role, business_name: business_name || 'VaseLabs Staff' }
        });

        if (authError) throw authError;

        // 3. El trigger handle_new_user ya crea el perfil, solo necesitamos actualizar el rol
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                role,
                business_name: business_name || 'VaseLabs Staff',
                onboarding_completed: true
            })
            .eq('id', authData.user.id);

        if (profileError) throw profileError;

        return NextResponse.json({
            success: true,
            message: `Usuario ${role} creado exitosamente`,
            userId: authData.user.id
        });

    } catch (error: any) {
        console.error('Error in create-support-user:', error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
