import { createSampleWidgetProject } from './fixture'
import { cloneWidgetProject } from './clone'
import { parseWidgetProject } from './schema'
import type { WidgetProject } from '~/types/widget'

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
  project.selection = null
  project.styleProvenance = null
  project.localReference = null
  project.importReport = null
  project.diagnostics = []

  return parseWidgetProject(project)
}

export function createNewWidgetProject(now?: string, name = 'New widget'): WidgetProject {
  return createProjectFromTemplate(createSampleWidgetProject(), { now, name })
}

export function duplicateWidgetProject(
  project: WidgetProject,
  now?: string
): WidgetProject {
  return createProjectFromTemplate(project, {
    name: `Copy of ${project.name}`,
    now
  })
}

export function createImportedProject(
  project: WidgetProject,
  report: WidgetProject['importReport'],
  now?: string
): WidgetProject {
  const imported = createProjectFromTemplate(project, {
    name: `${project.name} import`,
    now
  })

  imported.importReport = report
  return parseWidgetProject(imported)
}
