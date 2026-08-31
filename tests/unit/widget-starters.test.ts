import { describe, expect, it } from 'vitest'
import {
  createExampleWidgetProject,
  createNewWidgetProject
} from '~/domain/widget/projects'
import { createNeutralWidgetProject } from '~/domain/widget/fixture'
import { getWidgetStarter, WIDGET_STARTERS } from '~/domain/widget/starters'
import { validateWidgetProject } from '~/domain/widget/schema'

const fixedTimestamp = '2026-08-31T06:00:00.000Z'

describe('Widgetr starting paths', () => {
  it('defines the intentional starting choices in display order', () => {
    expect(WIDGET_STARTERS.map(starter => starter.id)).toEqual([
      'weather',
      'cryptocurrency',
      'daily-agenda',
      'own-idea',
      'reference-image',
      'example'
    ])
    expect(getWidgetStarter('weather').action).toBe('create')
    expect(getWidgetStarter('reference-image').action).toBe('reference')
    expect(getWidgetStarter('example').action).toBe('example')
  })

  it('creates a valid neutral project with a recorded starting intent', () => {
    const project = createNewWidgetProject(fixedTimestamp, 'Weather widget', 'weather')

    expect(project.startingIntent).toBe('weather')
    expect(project.dataSource.kind).toBe('none')
    expect(project.data.value).toEqual({})
    expect(project.bindings).toEqual([])
    expect(JSON.stringify(project)).not.toContain('Kochi')
    expect(validateWidgetProject(project).ok).toBe(true)
  })

  it.each(['weather', 'cryptocurrency', 'daily-agenda', 'own-idea'] as const)(
    'creates a valid neutral project for the %s starting path',
    (starterId) => {
      const starter = getWidgetStarter(starterId)
      const project = createNewWidgetProject(
        fixedTimestamp,
        starter.projectName ?? 'New widget',
        starterId
      )

      expect(project.name).toBe(starter.projectName)
      expect(project.startingIntent).toBe(starterId)
      expect(project.dataSource.kind).toBe('none')
      expect(validateWidgetProject(project).ok).toBe(true)
    }
  )

  it('keeps the complete example separate from a neutral project', () => {
    const neutral = createNeutralWidgetProject()
    const example = createExampleWidgetProject(fixedTimestamp)

    expect(neutral.name).toBe('New widget')
    expect(neutral.startingIntent).toBeUndefined()
    expect(example.name).toBe('Kochi monsoon example')
    expect(example.startingIntent).toBe('example')
    expect(example.data.value.location).toBe('Kochi')
    expect(neutral.layouts.small.root.children).not.toEqual(example.layouts.small.root.children)
  })
})
