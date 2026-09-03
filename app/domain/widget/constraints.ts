export const WIDGET_CONSTRAINTS = {
  elementTypes: [
    'text',
    'date',
    'image',
    'symbol',
    'group',
    'spacer',
    'repeat',
    'progress-ring',
    'progress-bar',
    'sparkline',
    'bar-chart'
  ],
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
  visualData: {
    maxRings: 3,
    ringSize: { min: 32, max: 128 },
    ringThickness: { min: 2, max: 14 },
    progressBarThickness: { min: 4, max: 28 },
    chartThickness: { min: 1, max: 8 },
    chartGap: { min: 0, max: 12 },
    maxSeriesPoints: 48,
    pointLimits: {
      compact: { small: 6, medium: 10, large: 14 },
      balanced: { small: 8, medium: 16, large: 24 },
      detailed: { small: 10, medium: 20, large: 28 }
    }
  },
  tree: { maxDepth: 12, maxElementsPerLayout: 120 }
} as const

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/
