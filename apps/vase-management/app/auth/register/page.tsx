// app/auth/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
  companyName: z.string().min(2, 'Nombre de empresa requerido'),
  cuit: z.string().min(11, 'CUIT inválido'),
}).refine((d) => d.password === d.confirmPassword, { message: 'Las contraseñas no coinciden', path: ['confirmPassword'] })

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push('/auth/login?registered=1')
    } catch (err: any) {
      setError(err.message ?? 'Error al registrar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-3xl font-semibold text-gray-900 dark:text-white">Crear cuenta</h2>
        <p className="mt-1 text-sm text-gray-500">Comenzá a usar Vase Management gratis</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tu nombre</label>
            <input {...register('name')} className="w-full px-3.5 py-2.5 text-sm" placeholder="Juan García" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
            <input {...register('email')} type="email" className="w-full px-3.5 py-2.5 text-sm" placeholder="vos@empresa.com" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contraseña</label>
            <div className="relative">
              <input {...register('password')} type={showPass ? 'text' : 'password'} className="w-full px-3.5 py-2.5 pr-10 text-sm" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirmar</label>
            <input {...register('confirmPassword')} type="password" className="w-full px-3.5 py-2.5 text-sm" placeholder="••••••••" />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Datos de la empresa</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre de la empresa</label>
              <input {...register('companyName')} className="w-full px-3.5 py-2.5 text-sm" placeholder="Mi Empresa SA" />
              {errors.companyName && <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">CUIT</label>
              <input {...register('cuit')} className="w-full px-3.5 py-2.5 font-mono text-sm" placeholder="30-71234567-0" />
              {errors.cuit && <p className="mt-1 text-xs text-red-600">{errors.cuit.message}</p>}
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="ui-button ui-button-primary w-full">
          {loading ? <><Loader2 size={16} className="animate-spin" />Creando cuenta...</> : <><UserPlus size={16} />Crear cuenta gratis</>}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        ¿Ya tenés cuenta?{' '}
        <Link href="/auth/login" className="font-semibold text-primary hover:text-primary/80">Iniciá sesión</Link>
      </p>
    </div>
  )
}
