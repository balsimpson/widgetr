import { describe, expect, it } from 'vitest'
import { createNewWidgetProject, duplicateWidgetProject } from '~/domain/widget/projects'
import { createMemoryProjectRepository } from '~/domain/widget/storage'

const firstTimestamp = '2026-08-28T06:00:00.000Z'
const secondTimestamp = '2026-08-28T07:00:00.000Z'

describe('local widget project storage', () => {
  it('stores defensive project snapshots and tracks the active project', async () => {
    const repository = createMemoryProjectRepository()
    const project = createNewWidgetProject(firstTimestamp, 'Morning commute', 'daily-agenda')

    await repository.saveProject(project)
    await repository.setActiveProjectId(project.id)
    project.name = 'Mutated after save'

    const stored = await repository.listProjects()

    expect(stored).toHaveLength(1)
    expect(stored[0]?.name).toBe('Morning commute')
    expect(stored[0]?.startingIntent).toBe('daily-agenda')
    expect(stored[0]?.dataSource.kind).toBe('none')
    expect(await repository.getActiveProjectId()).toBe(project.id)
  })

  it('sorts projects by most recently updated and keeps references separate', async () => {
    const repository = createMemoryProjectRepository()
    const older = createNewWidgetProject(firstTimestamp, 'Older widget')
    const newer = createNewWidgetProject(secondTimestamp, 'Newer widget')
    const reference = new Blob(['<svg></svg>'], { type: 'image/svg+xml' })

    await repository.saveProject(older)
    await repository.saveProject(newer)
    await repository.saveReference('reference/newer', reference)

    const stored = await repository.listProjects()

    expect(stored.map(project => project.name)).toEqual(['Newer widget', 'Older widget'])
    expect(await repository.getReference('reference/newer')).toBe(reference)

    await repository.deleteReference('reference/newer')
    expect(await repository.getReference('reference/newer')).toBeNull()
  })

  it('creates a clean duplicate identity without copying session metadata', () => {
    const source = createNewWidgetProject(firstTimestamp, 'Weather')
    source.revision = 4
    source.selection = { size: 'small', elementId: 'welcome' }

    const duplicate = duplicateWidgetProject(source, secondTimestamp)

    expect(duplicate.id).not.toBe(source.id)
    expect(duplicate.name).toBe('Copy of Weather')
    expect(duplicate.createdAt).toBe(secondTimestamp)
    expect(duplicate.updatedAt).toBe(secondTimestamp)
    expect(duplicate.revision).toBe(0)
    expect(duplicate.selection).toBeNull()
    expect(duplicate.localReference).toBeNull()
  })
})
