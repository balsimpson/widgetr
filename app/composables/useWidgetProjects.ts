import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  createExampleWidgetProject,
  createNewWidgetProject,
  duplicateWidgetProject
} from '~/domain/widget/projects'
import { cloneWidgetProject } from '~/domain/widget/clone'
import { createNeutralWidgetProject } from '~/domain/widget/fixture'
import {
  createMemoryProjectRepository,
  createWidgetProjectRepository
} from '~/domain/widget/storage'
import type { WidgetProject } from '~/types/widget'
import type { WidgetStarterId } from '~/types/widget'
import type { WidgetProjectRepository } from '~/domain/widget/storage'

export type PersistenceState = 'idle' | 'saving' | 'saved' | 'error'

function sortProjects(projects: WidgetProject[]): WidgetProject[] {
  return [...projects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export function useWidgetProjects() {
  const project = ref(createNeutralWidgetProject())
  const projects = ref<WidgetProject[]>([])
  const isLoading = ref(true)
  const isHydrated = ref(false)
  const persistenceState = ref<PersistenceState>('idle')
  const persistenceError = ref<string | null>(null)

  let repository: WidgetProjectRepository = createWidgetProjectRepository()
  let saveQueue: Promise<void> = Promise.resolve()
  let disposed = false

  function setPersistenceError(error: unknown): void {
    persistenceState.value = 'error'
    persistenceError.value = error instanceof Error ? error.message : 'Local storage is unavailable.'
  }

  function useMemoryFallback(error: unknown): void {
    setPersistenceError(error)
    repository = createMemoryProjectRepository()
  }

  function replaceProject(nextProject: WidgetProject): void {
    project.value = cloneWidgetProject(nextProject)
    projects.value = sortProjects([
      ...projects.value.filter(item => item.id !== nextProject.id),
      cloneWidgetProject(nextProject)
    ])
  }

  async function hydrate(): Promise<void> {
    isLoading.value = true
    try {
      const storedProjects = await repository.listProjects()
      if (storedProjects.length === 0) {
        projects.value = []
        project.value = createNeutralWidgetProject()
        await repository.setActiveProjectId(null)
      } else {
        projects.value = storedProjects
        const activeProjectId = await repository.getActiveProjectId()
        const activeProject = storedProjects.find(item => item.id === activeProjectId) ?? storedProjects[0]!
        project.value = cloneWidgetProject(activeProject)
        await repository.setActiveProjectId(activeProject.id)
      }
      persistenceState.value = 'saved'
      persistenceError.value = null
    } catch (error) {
      useMemoryFallback(error)
      projects.value = []
      project.value = createNeutralWidgetProject()
      try {
        await repository.setActiveProjectId(null)
      } catch (fallbackError) {
        setPersistenceError(fallbackError)
      }
    } finally {
      isHydrated.value = true
      isLoading.value = false
    }
  }

  function persistProject(nextProject: WidgetProject): Promise<void> {
    if (!isHydrated.value) {
      return Promise.resolve()
    }

    persistenceState.value = 'saving'
    persistenceError.value = null
    saveQueue = saveQueue
      .catch(() => undefined)
      .then(async () => {
        await repository.saveProject(nextProject)
        await repository.setActiveProjectId(nextProject.id)
        if (!disposed) {
          persistenceState.value = 'saved'
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setPersistenceError(error)
        }
      })
    return saveQueue
  }

  async function openProject(projectId: string): Promise<void> {
    const nextProject = projects.value.find(item => item.id === projectId)
    if (!nextProject) {
      return
    }
    project.value = cloneWidgetProject(nextProject)
    try {
      await repository.setActiveProjectId(nextProject.id)
    } catch (error) {
      setPersistenceError(error)
    }
  }

  async function createProject(
    name: string,
    startingIntent?: WidgetStarterId
  ): Promise<WidgetProject> {
    const nextProject = createNewWidgetProject(undefined, name, startingIntent)
    replaceProject(nextProject)
    await persistProject(nextProject)
    return nextProject
  }

  async function createExampleProject(): Promise<WidgetProject> {
    const nextProject = createExampleWidgetProject()
    replaceProject(nextProject)
    await persistProject(nextProject)
    return nextProject
  }

  async function duplicateProject(source: WidgetProject): Promise<WidgetProject> {
    const nextProject = duplicateWidgetProject(source)
    replaceProject(nextProject)
    await persistProject(nextProject)
    return nextProject
  }

  async function deleteProject(target: WidgetProject): Promise<void> {
    const oldReference = target.localReference?.storageKey
    try {
      await repository.deleteProject(target.id)
      if (oldReference) {
        await repository.deleteReference(oldReference)
      }
      projects.value = projects.value.filter(item => item.id !== target.id)
      if (project.value.id === target.id) {
        const nextProject = projects.value[0]
        if (nextProject) {
          project.value = cloneWidgetProject(nextProject)
          await repository.setActiveProjectId(nextProject.id)
        } else {
          project.value = createNeutralWidgetProject()
          await repository.setActiveProjectId(null)
        }
      }
      persistenceState.value = 'saved'
      persistenceError.value = null
    } catch (error) {
      setPersistenceError(error)
    }
  }

  async function saveReference(storageKey: string, blob: Blob): Promise<void> {
    await repository.saveReference(storageKey, blob)
  }

  async function getReference(storageKey: string): Promise<Blob | null> {
    return repository.getReference(storageKey)
  }

  async function deleteReference(storageKey: string): Promise<void> {
    await repository.deleteReference(storageKey)
  }

  onMounted(() => {
    void hydrate()
  })

  onBeforeUnmount(() => {
    disposed = true
  })

  return {
    project,
    projects,
    isLoading,
    isHydrated,
    persistenceState,
    persistenceError,
    replaceProject,
    persistProject,
    openProject,
    createProject,
    createExampleProject,
    duplicateProject,
    deleteProject,
    saveReference,
    getReference,
    deleteReference
  }
}
