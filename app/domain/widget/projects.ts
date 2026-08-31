import { createNeutralWidgetProject, createSampleWidgetProject } from './fixture'
import { cloneWidgetProject } from './clone'
import { parseWidgetProject } from './schema'
import type { WidgetProject, WidgetStarterId } from '~/types/widget'

function createProjectId(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) {
    return `widget-${uuid.replaceAll('-', '')}`
  }

  return `widget-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export interface ProjectIdentityOptions {
  id?: string
  name?: string
  now?: string
  startingIntent?: WidgetStarterId | null
}

export function createProjectFromTemplate(
  template: WidgetProject,
  options: ProjectIdentityOptions = {}
): WidgetProject {
  const now = options.now ?? new Date().toISOString()
  const project = cloneWidgetProject(template)

  project.id = options.id ?? createProjectId()
  project.name = options.name ?? 'New widget'
  project.createdAt = now
  project.updatedAt = now
  project.revision = 0
  project.startingIntent = options.startingIntent ?? null
  project.selection = null
  project.styleProvenance = null
  project.localReference = null
  project.diagnostics = []

  return parseWidgetProject(project)
}

export function createNewWidgetProject(
  now?: string,
  name = 'New widget',
  startingIntent?: WidgetStarterId
): WidgetProject {
  return createProjectFromTemplate(createNeutralWidgetProject(), {
    now,
    name,
    startingIntent
  })
}

export function createExampleWidgetProject(now?: string): WidgetProject {
  return createProjectFromTemplate(createSampleWidgetProject(), {
    now,
    name: 'Kochi monsoon example',
    startingIntent: 'example'
  })
}

export function duplicateWidgetProject(
  project: WidgetProject,
  now?: string
): WidgetProject {
  return createProjectFromTemplate(project, {
    name: `Copy of ${project.name}`,
    now,
    startingIntent: project.startingIntent ?? null
  })
}
