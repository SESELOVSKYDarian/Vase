const LED_COLORS = [
  '#22C55E',
  '#3B82F6',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
]

export function getLedColor(ledNumber: number | null) {
  if (ledNumber == null) return '#64748B'
  return LED_COLORS[Math.abs(ledNumber) % LED_COLORS.length]
}
