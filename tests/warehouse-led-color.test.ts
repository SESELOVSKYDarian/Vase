import { describe, expect, it } from 'vitest'
import { getLedColor } from '../apps/vase-management/components/warehouse/led-color'

describe('LED color', () => {
  it('returns stable accessible palette entries', () => {
    expect(getLedColor(14)).toEqual(getLedColor(14))
    expect(getLedColor(14)).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('returns a neutral color for unassigned LEDs', () => {
    expect(getLedColor(null)).toBe('#64748B')
  })
})
