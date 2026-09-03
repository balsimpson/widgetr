import { describe, expect, it } from 'vitest'
import { createSampleWidgetProject } from '~/domain/widget/fixture'
import {
  barChartBars,
  createVisualDataElement,
  limitedSeries,
  progressRingGeometry,
  resolveNumericSource,
  resolveSeriesSource,
  sparklinePoints
} from '~/domain/widget/visual-data'

describe('visual-data geometry and source helpers', () => {
  it('resolves typed bindings and keeps the latest points within density limits', () => {
    const project = createSampleWidgetProject()

    expect(resolveNumericSource({
      kind: 'binding',
      bindingId: 'temperature',
      fallback: 0
    }, project)).toBe(29)
    expect(resolveSeriesSource({
      kind: 'literal',
      value: [1, 2, 3]
    }, project)).toEqual([1, 2, 3])
    expect(limitedSeries(
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      'small',
      'balanced'
    )).toEqual([2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('normalizes progress rings and chart geometry deterministically', () => {
    const project = createSampleWidgetProject()
    const ring = createVisualDataElement('progress-ring', 'geometry-ring')
    if (ring.type !== 'progress-ring') {
      throw new Error('Progress ring fixture was not created')
    }
    ring.rings[0]!.value = { kind: 'literal', value: 1.5 }

    expect(progressRingGeometry(ring, project)[0]?.ratio).toBe(1)
    expect(sparklinePoints([1, 3, 2], 100, 42)).toEqual([
      { x: 0, y: 42 },
      { x: 50, y: 0 },
      { x: 100, y: 21 }
    ])

    const bars = barChartBars([1, 2, 3, 4], 100, 48, 12)
    const lastBar = bars.at(-1)!
    expect(lastBar.x + lastBar.width).toBeLessThanOrEqual(100)
  })
})
