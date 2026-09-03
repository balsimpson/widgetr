import { describe, expect, it } from 'vitest'
import { createSampleWidgetProject } from '~/domain/widget/fixture'
import { validateWidgetProject } from '~/domain/widget/schema'
import { createVisualDataElement } from '~/domain/widget/visual-data'
import type { WidgetElement } from '~/types/widget'

function collectTypes(element: WidgetElement, types = new Set<string>()): Set<string> {
  types.add(element.type)
  if (element.type === 'group' || element.type === 'repeat') {
    element.children.forEach(child => collectTypes(child, types))
  }
  return types
}

describe('canonical widget schema', () => {
  it('accepts the fixed Phase 1 fixture', () => {
    const result = validateWidgetProject(createSampleWidgetProject())

    expect(result.ok).toBe(true)
  })

  it('accepts projects created before starting intents were stored', () => {
    const project = createSampleWidgetProject()
    delete project.startingIntent

    const result = validateWidgetProject(project)

    expect(result.ok).toBe(true)
  })

  it('uses separate trees while keeping one shared data model', () => {
    const project = createSampleWidgetProject()

    expect(project.layouts.small.root).not.toBe(project.layouts.medium.root)
    expect(project.layouts.medium.root).not.toBe(project.layouts.large.root)
    expect(project.layouts.small.root).not.toEqual(project.layouts.medium.root)
    expect(project.layouts.medium.root).not.toEqual(project.layouts.large.root)
    expect(project.data.value.forecast).toHaveLength(5)
  })

  it('demonstrates every supported Phase 1 element type', () => {
    const project = createSampleWidgetProject()
    const types = new Set<string>()

    collectTypes(project.layouts.small.root, types)
    collectTypes(project.layouts.medium.root, types)
    collectTypes(project.layouts.large.root, types)

    expect(types).toEqual(new Set([
      'text',
      'date',
      'image',
      'symbol',
      'group',
      'spacer',
      'repeat'
    ]))
  })

  it('rejects duplicate element ids inside one layout', () => {
    const project = createSampleWidgetProject()
    project.layouts.small.root.children[1]!.id = project.layouts.small.root.children[0]!.id

    const result = validateWidgetProject(project)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some(issue => issue.message.includes('duplicated'))).toBe(true)
    }
  })

  it('rejects styles outside the supported constraints', () => {
    const project = createSampleWidgetProject()
    const temperature = project.layouts.small.root.children.find(element => element.id === 'temperature')
    if (!temperature || temperature.type !== 'text') {
      throw new Error('Small temperature fixture is missing')
    }
    temperature.textStyle.fontSize = 57

    const result = validateWidgetProject(project)

    expect(result.ok).toBe(false)
  })

  it('accepts all four bounded visual-data element types', () => {
    const project = createSampleWidgetProject()
    const visualTypes = ['progress-ring', 'progress-bar', 'sparkline', 'bar-chart'] as const

    visualTypes.forEach((type, index) => {
      project.layouts.small.root.children.push(
        createVisualDataElement(type, `schema-${type}-${index}`)
      )
    })

    const result = validateWidgetProject(project)

    expect(result.ok).toBe(true)
  })

  it('requires numeric and series bindings to use the matching data types', () => {
    const project = createSampleWidgetProject()
    const progressBar = createVisualDataElement('progress-bar', 'schema-progress-bar')
    if (progressBar.type !== 'progress-bar') {
      throw new Error('Progress bar fixture was not created')
    }
    progressBar.value = {
      kind: 'binding',
      bindingId: 'condition',
      fallback: 0.5
    }
    project.layouts.small.root.children.push(progressBar)

    const result = validateWidgetProject(project)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some(issue => issue.message.includes('value type "number"'))).toBe(true)
    }
  })

  it('caps nested progress rings at three', () => {
    const project = createSampleWidgetProject()
    const ring = createVisualDataElement('progress-ring', 'schema-progress-ring')
    if (ring.type !== 'progress-ring') {
      throw new Error('Progress ring fixture was not created')
    }
    ring.rings.push(
      { ...ring.rings[0]!, id: 'ring-2' },
      { ...ring.rings[0]!, id: 'ring-3' },
      { ...ring.rings[0]!, id: 'ring-4' }
    )
    project.layouts.small.root.children.push(ring)

    const result = validateWidgetProject(project)

    expect(result.ok).toBe(false)
  })

  it('drops removed import metadata while loading older projects', () => {
    const project = createSampleWidgetProject()
    const result = validateWidgetProject({
      ...project,
      startingIntent: 'scriptable-import',
      importReport: {
        reproduced: ['Legacy metadata'],
        omitted: ['No longer used'],
        nextSteps: ['Start a new project']
      }
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value).not.toHaveProperty('importReport')
    expect(result.value.startingIntent).toBeUndefined()
  })
})
