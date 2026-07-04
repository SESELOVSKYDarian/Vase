// app/layout.tsx
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Toaster } from '@/components/ui/Toaster'
import { MotionProvider } from '@/components/layout/MotionProvider'
import { IBM_Plex_Mono, Manrope, Newsreader } from 'next/font/google'
import '@/styles/globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  adjustFontFallback: false,
})
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: {
    default: 'Vase Management | Gestión empresarial',
    template: '%s | Vase Management',
  },
  description: 'Sistema de gestión empresarial para empresas argentinas. Facturación AFIP, stock, ventas, compras y más.',
  keywords: ['ERP', 'facturación', 'Argentina', 'AFIP', 'sistema de gestión', 'SaaS'],
  authors: [{ name: 'Vase Management' }],
  icons: { icon: '/vasecolorlogo.ico' },
  robots: 'noindex,nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head />
      <body className={`${manrope.variable} ${newsreader.variable} ${ibmPlexMono.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <MotionProvider>
            {children}
            <Toaster />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
