import { createElementStyle } from './defaults'
import { getValueAtPath, resolveBindingValue } from './values'
import { WIDGET_CONSTRAINTS } from './constraints'
import type {
  BarChartElement,
  JsonObject,
  NumericSource,
  ProgressBarElement,
  ProgressRingDatum,
  ProgressRingElement,
  SeriesSource,
  SparklineElement,
  VisualDataDensity,
  VisualDataElement,
  VisualDataElementType,
  WidgetProject,
  WidgetSize
} from '~/types/widget'

export const VISUAL_DATA_ELEMENT_TYPES = [
  'progress-ring',
  'progress-bar',
  'sparkline',
  'bar-chart'
] as const satisfies readonly VisualDataElementType[]

export const VISUAL_DATA_DENSITIES: VisualDataDensity[] = [
  'compact',
  'balanced',
  'detailed'
]

export const VISUAL_DATA_ELEMENT_OPTIONS: Array<{ label: string, value: VisualDataElementType }> = [
  { label: 'Progress ring', value: 'progress-ring' },
  { label: 'Progress bar', value: 'progress-bar' },
  { label: 'Sparkline', value: 'sparkline' },
  { label: 'Bar chart', value: 'bar-chart' }
]

export const VISUAL_DATA_DENSITY_OPTIONS: Array<{ label: string, value: VisualDataDensity }> = [
  { label: 'Compact', value: 'compact' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Detailed', value: 'detailed' }
]

export function isVisualDataElement(element: VisualDataElement | { type: string }): element is VisualDataElement {
  return VISUAL_DATA_ELEMENT_TYPES.includes(element.type as VisualDataElementType)
}

export function visualDataPointLimit(size: WidgetSize, density: VisualDataDensity): number {
  return WIDGET_CONSTRAINTS.visualData.pointLimits[density][size]
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizeProgressValue(value: number | null, min: number, max: number): number | null {
  if (value === null || !Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return null
  }
  return clamp((value - min) / (max - min), 0, 1)
}

function rawSourceValue(
  source: NumericSource | SeriesSource,
  project: WidgetProject,
  item: JsonObject | null
): unknown {
  if (source.kind === 'literal') {
    return source.value
  }
  if (source.kind === 'binding') {
    return resolveBindingValue(project, source.bindingId)
  }
  return getValueAtPath(item, source.path)
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export interface NumericSourceResolution {
  value: number | null
  rawValue: unknown
  usedFallback: boolean
}

export function resolveNumericSourceDetails(
  source: NumericSource,
  project: WidgetProject,
  item: JsonObject | null = null
): NumericSourceResolution {
  const rawValue = rawSourceValue(source, project, item)
  const parsed = finiteNumber(rawValue)
  if (parsed !== null) {
    return {
      value: parsed,
      rawValue,
      usedFallback: false
    }
  }

  return {
    value: source.kind === 'literal' ? null : source.fallback,
    rawValue,
    usedFallback: source.kind !== 'literal'
  }
}

export function resolveNumericSource(
  source: NumericSource,
  project: WidgetProject,
  item: JsonObject | null = null
): number | null {
  return resolveNumericSourceDetails(source, project, item).value
}

export interface SeriesSourceResolution {
  values: number[]
  rawLength: number
  invalidCount: number
  usedFallback: boolean
}

export function resolveSeriesSourceDetails(
  source: SeriesSource,
  project: WidgetProject,
  item: JsonObject | null = null
): SeriesSourceResolution {
  const rawValue = rawSourceValue(source, project, item)
  const sourceValues = Array.isArray(rawValue)
    ? rawValue
    : source.kind === 'literal'
      ? []
      : source.fallback
  const values = sourceValues.flatMap(value => {
    const parsed = finiteNumber(value)
    return parsed === null ? [] : [parsed]
  })

  return {
    values,
    rawLength: Array.isArray(rawValue) ? rawValue.length : sourceValues.length,
    invalidCount: Array.isArray(rawValue)
      ? rawValue.length - values.length
      : 0,
    usedFallback: !Array.isArray(rawValue) && source.kind !== 'literal'
  }
}

export function resolveSeriesSource(
  source: SeriesSource,
  project: WidgetProject,
  item: JsonObject | null = null
): number[] {
  return resolveSeriesSourceDetails(source, project, item).values
}

export function limitedSeries(
  values: number[],
  size: WidgetSize,
  density: VisualDataDensity
): number[] {
  return values.slice(-visualDataPointLimit(size, density))
}

export interface ProgressRingGeometry {
  radius: number
  strokeWidth: number
  ratio: number
  circumference: number
}

export function progressRingGeometry(
  element: ProgressRingElement,
  project: WidgetProject,
  item: JsonObject | null = null
): ProgressRingGeometry[] {
  const outerRadius = 42
  const minimumRadius = Math.max(8, element.thickness / 2 + 2)
  const step = element.rings.length > 1
    ? Math.min(18, (outerRadius - minimumRadius) / (element.rings.length - 1))
    : 0

  return element.rings.map((ring, index) => {
    const radius = Math.max(minimumRadius, outerRadius - index * step)
    const ratio = normalizeProgressValue(
      resolveNumericSource(ring.value, project, item),
      ring.min,
      ring.max
    )

    return {
      radius,
      strokeWidth: Math.min(element.thickness, radius * 0.75),
      ratio: ratio ?? 0,
      circumference: 2 * Math.PI * radius
    }
  })
}

export interface SeriesDomain {
  min: number
  max: number
  range: number
}

export function seriesDomain(values: number[]): SeriesDomain | null {
  if (values.length === 0) {
    return null
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  return {
    min,
    max,
    range: max - min
  }
}

export interface ChartPoint {
  x: number
  y: number
}

export function sparklinePoints(values: number[], width = 100, height = 42): ChartPoint[] {
  const domain = seriesDomain(values)
  if (!domain) {
    return []
  }
  if (values.length === 1) {
    return [{ x: width / 2, y: height / 2 }]
  }
  return values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: domain.range === 0
      ? height / 2
      : height - ((value - domain.min) / domain.range) * height
  }))
}

export interface BarChartBar extends ChartPoint {
  width: number
  height: number
  value: number
}

export function boundedBarGap(pointCount: number, width: number, gap: number): number {
  if (pointCount <= 1) {
    return 0
  }
  return Math.min(gap, Math.max(0, (width - pointCount) / (pointCount - 1)))
}

export function barChartBars(values: number[], width = 100, height = 48, gap = 3): BarChartBar[] {
  const domain = seriesDomain(values)
  if (!domain) {
    return []
  }
  const boundedGap = boundedBarGap(values.length, width, gap)
  const barWidth = Math.max(0.5, (width - boundedGap * Math.max(0, values.length - 1)) / values.length)
  const valueY = (value: number): number => {
    if (domain.range === 0) {
      return height / 2
    }
    return height - ((value - domain.min) / domain.range) * height
  }
  const baseline = domain.min < 0 && domain.max > 0
    ? valueY(0)
    : domain.min >= 0
      ? height
      : 0

  return values.map((value, index) => {
    const y = valueY(value)
    return {
      x: index * (barWidth + boundedGap),
      y: Math.min(y, baseline),
      width: barWidth,
      height: Math.max(1, Math.abs(baseline - y)),
      value
    }
  })
}

export function formatProgressPercent(value: number | null, min: number, max: number): string {
  const ratio = normalizeProgressValue(value, min, max)
  return ratio === null ? 'No data' : `${Math.round(ratio * 100)}%`
}

export function createProgressRingDatum(
  id: string,
  value = 0.68,
  fillColor = '#6D5BD0'
): ProgressRingDatum {
  return {
    id,
    value: { kind: 'literal', value },
    min: 0,
    max: 1,
    trackColor: '#D9D6EA',
    fillColor
  }
}

export function createVisualDataElement(
  type: VisualDataElementType,
  id = `visual-${type}`
): VisualDataElement {
  if (type === 'progress-ring') {
    const element: ProgressRingElement = {
      id,
      type,
      visible: true,
      style: createElementStyle({
        width: 84,
        height: 84,
        alignSelf: 'center'
      }),
      rings: [createProgressRingDatum('ring-1')],
      size: 84,
      thickness: 9,
      centerLabel: { kind: 'literal', value: '68%' }
    }
    return element
  }

  if (type === 'progress-bar') {
    const element: ProgressBarElement = {
      id,
      type,
      visible: true,
      style: createElementStyle({ width: 'fill', height: 18 }),
      value: { kind: 'literal', value: 0.68 },
      min: 0,
      max: 1,
      trackColor: '#D9D6EA',
      fillColor: '#6D5BD0',
      thickness: 12
    }
    return element
  }

  if (type === 'sparkline') {
    const element: SparklineElement = {
      id,
      type,
      visible: true,
      style: createElementStyle({ width: 'fill', height: 54 }),
      values: { kind: 'literal', value: [0.24, 0.38, 0.3, 0.62, 0.56, 0.82, 0.74] },
      lineColor: '#6D5BD0',
      fillColor: '#6D5BD0',
      thickness: 3,
      density: 'balanced'
    }
    return element
  }

  const element: BarChartElement = {
    id,
    type,
    visible: true,
    style: createElementStyle({ width: 'fill', height: 62 }),
    values: { kind: 'literal', value: [0.32, 0.58, 0.44, 0.76, 0.64, 0.9] },
    barColor: '#6D5BD0',
    gap: 4,
    density: 'balanced'
  }
  return element
}
