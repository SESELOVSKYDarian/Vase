'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function verifyPin(formData: FormData) {
  const pin = formData.get('pin') as string;
  const expectedPin = process.env.SUPERADM_PIN || '123456';

  console.log('Verificando PIN:', { recibido: pin, esperado: expectedPin, coincide: pin === expectedPin });

  if (pin === expectedPin) {
    const cookieStore = await cookies(); // AWAIT here!
    cookieStore.set('superadm_session', 'valid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4, // 4 hours
      path: '/superadm'
    });
    return { success: true };
  }

  return { success: false };
}

export async function logout() {
  const cookieStore = await cookies(); // AWAIT here!
  cookieStore.delete('superadm_session');
  redirect('/superadm/login');
}
