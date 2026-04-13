'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // 1. Authenticate
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.error('Login error:', error)
        return { error: 'Credenciales inválidas. Verifica tu correo y contraseña.' }
    }

    if (!data.session) {
        return { error: 'No se pudo iniciar sesión.' }
    }

    // 2. Refresh session to ensure cookies are set
    //   const {
    //     data: { user },
    //   } = await supabase.auth.getUser()

    // 3. Get User Role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single()

    let redirectPath = '/admin'

    if (profile && !profileError) {
        if (profile.role === 'super_admin') redirectPath = '/super-admin'
        else if (profile.role === 'support') redirectPath = '/support'
    } else {
        console.warn('Profile fetch error or missing profile, defaulting to /admin', profileError)
    }

    console.log(`[Server Action] Redirecting user ${email} to ${redirectPath}`)

    // 4. Redirect (throws, so must be last)
    revalidatePath('/', 'layout')
    redirect(redirectPath)
}
