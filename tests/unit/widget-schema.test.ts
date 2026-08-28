import { describe, expect, it } from 'vitest'
import { createSampleWidgetProject } from '~/domain/widget/fixture'
import { validateWidgetProject } from '~/domain/widget/schema'
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

  it('normalizes the earlier compact import report shape', () => {
    const project = createSampleWidgetProject()
    const result = validateWidgetProject({
      ...project,
      importReport: {
        reproduced: ['Read the source safely.'],
        omitted: ['Interactive behavior was not imported.'],
        nextSteps: ['Review the editable starting point.']
      }
    })

    expect(result.ok).toBe(true)
    if (!result.ok || !result.value.importReport) {
      return
    }
    expect(result.value.importReport.unsupported).toEqual(['Interactive behavior was not imported.'])
    expect(result.value.importReport.approximated).toEqual([])
    expect(result.value.importReport.dataCalls).toEqual([])
    expect(result.value.importReport.requiredUserInput).toEqual([])
  })
})
