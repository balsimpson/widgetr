import { describe, expect, it } from 'vitest'
import { createSampleWidgetProject } from '~/domain/widget/fixture'
import { applyWidgetOperation } from '~/domain/widget/operations'
import { createVisualDataElement } from '~/domain/widget/visual-data'
import type { WidgetElement, WidgetProject, WidgetSize } from '~/types/widget'

const fixedClock = () => '2026-08-28T06:00:00.000Z'

function findElement(project: WidgetProject, size: WidgetSize, elementId: string): WidgetElement {
  function visit(element: WidgetElement): WidgetElement | null {
    if (element.id === elementId) {
      return element
    }
    if (element.type === 'group' || element.type === 'repeat') {
      for (const child of element.children) {
        const match = visit(child)
        if (match) {
          return match
        }
      }
    }
    return null
  }

  const match = visit(project.layouts[size].root)
  if (!match) {
    throw new Error(`${elementId} is missing in ${size}`)
  }
  return match
}

function textColor(project: WidgetProject, size: WidgetSize, elementId: string): string {
  const element = findElement(project, size, elementId)
  if (element.type !== 'text' && element.type !== 'date') {
    throw new Error(`${elementId} is not text in ${size}`)
  }
  return element.textStyle.color
}

describe('shared widget operations', () => {
  it('saves bounded public data through the shared revision-checked operation', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'set-public-data-source',
      expectedRevision: 0,
      source: {
        kind: 'public-api',
        url: 'https://api.example.test/weather',
        method: 'GET',
        parameters: [],
        headers: [],
        refreshMinutes: 30,
        secretPlaceholders: []
      },
      data: {
        kind: 'live',
        label: 'Live data from api.example.test',
        capturedAt: fixedClock(),
        value: { current: { temperature: 29 } }
      }
    }, { now: fixedClock })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.revision).toBe(1)
    expect(result.changedSizes).toEqual(['small', 'medium', 'large'])
    expect(result.state.dataSource.kind).toBe('public-api')
    expect(result.state.data.value).toEqual({ current: { temperature: 29 } })
  })

  it('rejects a public source that includes a browser secret or header', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'set-public-data-source',
      expectedRevision: 0,
      source: {
        kind: 'public-api',
        url: 'https://api.example.test/weather',
        method: 'GET',
        parameters: [],
        headers: [{ key: 'Authorization', value: 'secret' }],
        refreshMinutes: 30,
        secretPlaceholders: []
      },
      data: {
        kind: 'live',
        label: 'Live data',
        capturedAt: fixedClock(),
        value: {}
      }
    }, { now: fixedClock })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INVALID_OPERATION')
    }
  })

  it('replaces data bindings through the shared revision-checked operation', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'set-data-bindings',
      expectedRevision: 0,
      bindings: [{
        id: 'temperature',
        label: 'Current temperature',
        path: ['current', 'temperature_2m'],
        valueType: 'number'
      }]
    }, { now: fixedClock })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.bindings).toEqual([{
        id: 'temperature',
        label: 'Current temperature',
        path: ['current', 'temperature_2m'],
        valueType: 'number'
      }])
    }
  })

  it('updates only one requested size', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'update-text-style',
      expectedRevision: 0,
      scope: { kind: 'one', size: 'small' },
      elementId: 'temperature',
      patch: { color: '#F6C453' }
    }, { now: fixedClock })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.changedSizes).toEqual(['small'])
    expect(result.revision).toBe(1)
    expect(textColor(result.state, 'small', 'temperature')).toBe('#F6C453')
    expect(textColor(result.state, 'medium', 'temperature')).toBe('#172033')
    expect(textColor(result.state, 'large', 'temperature')).toBe('#FFFFFF')
  })

  it('updates exactly two requested sizes', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'update-element-style',
      expectedRevision: 0,
      scope: { kind: 'several', sizes: ['small', 'medium'] },
      elementId: 'temperature',
      patch: { opacity: 0.42 }
    }, { now: fixedClock })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.changedSizes).toEqual(['small', 'medium'])
    expect(findElement(result.state, 'small', 'temperature').style.opacity).toBe(0.42)
    expect(findElement(result.state, 'medium', 'temperature').style.opacity).toBe(0.42)
    expect(findElement(result.state, 'large', 'temperature').style.opacity).toBe(1)
  })

  it('uses the canonical all-size scope when an operation omits one', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'update-element-style',
      expectedRevision: 0,
      elementId: 'temperature',
      patch: { opacity: 0.8 }
    }, { now: fixedClock })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.changedSizes).toEqual(['small', 'medium', 'large'])
    expect(findElement(result.state, 'small', 'temperature').style.opacity).toBe(0.8)
    expect(findElement(result.state, 'medium', 'temperature').style.opacity).toBe(0.8)
    expect(findElement(result.state, 'large', 'temperature').style.opacity).toBe(0.8)
  })

  it('rejects a stale revision and preserves the newest state', () => {
    const project = createSampleWidgetProject()
    const firstResult = applyWidgetOperation(project, {
      type: 'update-element-style',
      expectedRevision: 0,
      elementId: 'temperature',
      patch: { opacity: 0.8 }
    }, { now: fixedClock })

    if (!firstResult.ok) {
      throw new Error(firstResult.message)
    }

    const staleResult = applyWidgetOperation(firstResult.state, {
      type: 'update-element-style',
      expectedRevision: 0,
      elementId: 'temperature',
      patch: { opacity: 0.1 }
    }, { now: fixedClock })

    expect(staleResult.ok).toBe(false)
    if (staleResult.ok) {
      return
    }
    expect(staleResult.code).toBe('STALE_REVISION')
    expect(staleResult.revision).toBe(1)
    expect(staleResult.state).toBe(firstResult.state)
    expect(findElement(staleResult.state, 'small', 'temperature').style.opacity).toBe(0.8)
  })

  it('rejects an operation that exceeds a style constraint', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'update-element-style',
      expectedRevision: 0,
      elementId: 'temperature',
      patch: { opacity: 2 }
    }, { now: fixedClock })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INVALID_OPERATION')
      expect(result.state).toBe(project)
    }
  })

  it('updates element content through the shared scoped operation', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'update-element-content',
      expectedRevision: 0,
      scope: { kind: 'one', size: 'small' },
      elementId: 'temperature',
      patch: {
        value: { kind: 'literal', value: '31°' },
        visible: false
      }
    }, { now: fixedClock })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const smallTemperature = findElement(result.state, 'small', 'temperature')
    expect(smallTemperature.type).toBe('text')
    if (smallTemperature.type !== 'text') {
      return
    }
    expect(smallTemperature.value).toEqual({ kind: 'literal', value: '31°' })
    expect(smallTemperature.visible).toBe(false)
    expect(findElement(result.state, 'medium', 'temperature').visible).toBe(true)
    expect(findElement(project, 'small', 'temperature').visible).toBe(true)
  })

  it('rejects content fields that do not belong to the selected element type', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'update-element-content',
      expectedRevision: 0,
      scope: { kind: 'one', size: 'medium' },
      elementId: 'weather-image',
      patch: { value: { kind: 'literal', value: 'not an image source' } }
    }, { now: fixedClock })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('TARGET_TYPE_MISMATCH')
      expect(result.state).toBe(project)
    }
  })

  it('updates project metadata without bypassing the operation path', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'update-project-metadata',
      expectedRevision: 0,
      patch: { name: 'Morning commute' }
    }, { now: fixedClock })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.state.name).toBe('Morning commute')
    expect(result.changedSizes).toEqual([])
    expect(result.revision).toBe(1)
  })

  it('restores a history snapshot with a new monotonic revision', () => {
    const project = createSampleWidgetProject()
    const edited = applyWidgetOperation(project, {
      type: 'update-element-style',
      expectedRevision: 0,
      elementId: 'temperature',
      patch: { opacity: 0.4 }
    }, { now: fixedClock })

    expect(edited.ok).toBe(true)
    if (!edited.ok) {
      return
    }

    const restored = applyWidgetOperation(edited.state, {
      type: 'restore-snapshot',
      expectedRevision: edited.state.revision,
      snapshot: project
    }, { now: fixedClock })

    expect(restored.ok).toBe(true)
    if (!restored.ok) {
      return
    }
    expect(restored.state.revision).toBe(2)
    expect(findElement(restored.state, 'small', 'temperature').style.opacity).toBe(1)
  })

  it('reorders children through the shared scoped operation', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'reorder-children',
      expectedRevision: 0,
      scope: { kind: 'one', size: 'large' },
      elementId: 'header',
      childId: 'location',
      toIndex: 2
    }, { now: fixedClock })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const header = findElement(result.state, 'large', 'header')
    expect(header.type).toBe('group')
    if (header.type !== 'group') {
      return
    }
    expect(header.children.map(child => child.id)).toEqual([
      'header-spacer',
      'updated',
      'location'
    ])
    expect(result.changedSizes).toEqual(['large'])
    expect(result.revision).toBe(1)
  })

  it('rejects child ordering when the target index is outside the group', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'reorder-children',
      expectedRevision: 0,
      scope: { kind: 'one', size: 'large' },
      elementId: 'header',
      childId: 'location',
      toIndex: 8
    }, { now: fixedClock })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INVALID_OPERATION')
      expect(result.revision).toBe(0)
      expect(result.state).toBe(project)
    }
  })

  it('inserts, updates, and removes visual-data elements through canonical operations', () => {
    const project = createSampleWidgetProject()
    const element = createVisualDataElement('progress-bar', 'daily-progress')

    const inserted = applyWidgetOperation(project, {
      type: 'insert-element',
      expectedRevision: 0,
      scope: { kind: 'all' },
      parentId: 'root',
      element
    }, { now: fixedClock })

    expect(inserted.ok).toBe(true)
    if (!inserted.ok) {
      return
    }
    expect(inserted.changedSizes).toEqual(['small', 'medium', 'large'])
    expect(inserted.selection).toEqual({ size: 'small', elementId: 'daily-progress' })

    const updated = applyWidgetOperation(inserted.state, {
      type: 'update-element-content',
      expectedRevision: 1,
      scope: { kind: 'all' },
      elementId: 'daily-progress',
      patch: {
        numericValue: { kind: 'literal', value: 0.92 },
        min: 0,
        max: 1
      }
    }, { now: fixedClock })

    expect(updated.ok).toBe(true)
    if (!updated.ok) {
      return
    }
    const progress = findElement(updated.state, 'medium', 'daily-progress')
    expect(progress.type).toBe('progress-bar')
    if (progress.type === 'progress-bar') {
      expect(progress.value).toEqual({ kind: 'literal', value: 0.92 })
    }
    const smallProgress = findElement(updated.state, 'small', 'daily-progress')
    const mediumProgress = findElement(updated.state, 'medium', 'daily-progress')
    if (smallProgress.type === 'progress-bar' && mediumProgress.type === 'progress-bar') {
      expect(smallProgress.value).not.toBe(mediumProgress.value)
    }

    const removed = applyWidgetOperation(updated.state, {
      type: 'remove-element',
      expectedRevision: 2,
      scope: { kind: 'all' },
      elementId: 'daily-progress'
    }, { now: fixedClock })

    expect(removed.ok).toBe(true)
    if (!removed.ok) {
      return
    }
    expect(removed.selection).toBeNull()
    expect(() => findElement(removed.state, 'small', 'daily-progress')).toThrow()
  })

  it('keeps progress-ring size changes aligned with rendered dimensions', () => {
    const project = createSampleWidgetProject()
    const element = createVisualDataElement('progress-ring', 'daily-ring')
    project.layouts.small.root.children.push(element)

    const result = applyWidgetOperation(project, {
      type: 'update-element-content',
      expectedRevision: 0,
      scope: { kind: 'one', size: 'small' },
      elementId: 'daily-ring',
      patch: { size: 112 }
    }, { now: fixedClock })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const ring = findElement(result.state, 'small', 'daily-ring')
    expect(ring.type).toBe('progress-ring')
    if (ring.type === 'progress-ring') {
      expect(ring.size).toBe(112)
      expect(ring.style.width).toBe(112)
      expect(ring.style.height).toBe(112)
    }
  })

  it('does not remove a layout root', () => {
    const project = createSampleWidgetProject()
    const result = applyWidgetOperation(project, {
      type: 'remove-element',
      expectedRevision: 0,
      scope: { kind: 'one', size: 'small' },
      elementId: 'root'
    }, { now: fixedClock })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('TARGET_TYPE_MISMATCH')
      expect(result.state).toBe(project)
    }
  })
})
