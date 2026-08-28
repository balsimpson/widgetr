export const WIDGET_CONSTRAINTS = {
  elementTypes: ['text', 'date', 'image', 'symbol', 'group', 'spacer', 'repeat'],
  fontSize: { min: 8, max: 56 },
  symbolSize: { min: 8, max: 64 },
  padding: { min: 0, max: 40 },
  spacing: { min: 0, max: 32 },
  borderWidth: { min: 0, max: 8 },
  cornerRadius: { min: 0, max: 48 },
  opacity: { min: 0, max: 1 },
  minimumScaleFactor: { min: 0.5, max: 1 },
  lineLimit: { min: 1, max: 8 },
  repeatLimit: { min: 1, max: 12 },
  imageCrop: { min: 0, max: 100 },
  refreshMinutes: { min: 1, max: 1440 },
  gradientColors: { min: 2, max: 4 },
  tree: { maxDepth: 12, maxElementsPerLayout: 120 }
} as const

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/
