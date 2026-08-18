import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('warehouse pages', () => {
  it('do not use native alert or light-only panel classes', () => {
    const root = 'apps/vase-management/app/dashboard/deposito-ia'
    const files = [
      `${root}/page.tsx`,
      `${root}/productos/page.tsx`,
      `${root}/ia/page.tsx`,
      `${root}/racks/page.tsx`,
      `${root}/dispositivos/page.tsx`,
      `${root}/canales/page.tsx`,
    ]
    const source = files.map((file) => readFileSync(file, 'utf8')).join('\n')

    expect(source).not.toMatch(/\balert\s*\(/)
    expect(source).not.toMatch(/bg-white\s+rounded/)
    expect(source).not.toMatch(/text-gray-[3-9]00/)
  })
})
