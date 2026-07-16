'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'

export default function ManagementSsoPage() {
  const params = useSearchParams()
  const [error, setError] = useState('')
  const ticket = params.get('ticket')
  const visibleError = error || (!ticket ? 'El acceso no contiene un ticket válido.' : '')
  useEffect(() => {
    if (!ticket) return
    void signIn('vase-sso', { ticket, callbackUrl: '/dashboard' }).catch(() => setError('No pudimos completar el acceso seguro.'))
  }, [ticket])
  return <main className="min-h-screen grid place-items-center bg-[#f4f6f2] px-6"><section className="w-full max-w-md rounded-[28px] border border-[#dce3dc] bg-white p-9 text-center shadow-[0_24px_80px_rgba(20,45,31,.08)]"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e7f4ec] text-[#087443]"><ShieldCheck /></div><h1 className="mt-5 font-display text-2xl font-semibold text-[#17231b]">Acceso seguro a Management</h1>{visibleError ? <p className="mt-3 text-sm text-red-600">{visibleError}</p> : <><p className="mt-2 text-sm text-[#66736b]">Estamos vinculando tu cuenta y preparando tu empresa.</p><Loader2 className="mx-auto mt-6 size-5 animate-spin text-[#087443]" /></>}</section></main>
}
