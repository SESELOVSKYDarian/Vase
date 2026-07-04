/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite validar producción mientras `next dev` sigue abierto sin que
  // ambos procesos compitan por los mismos chunks en `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

module.exports = nextConfig
