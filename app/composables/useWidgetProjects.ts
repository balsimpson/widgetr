import { onBeforeUnmount, onMounted, ref } from 'vue'
import { applyWidgetOperation } from '~/domain/widget/operations'
import {
  createBitcoinDataSource,
  fetchBitcoinMarketData,
  isBitcoinDataAdapter
} from '~/domain/widget/crypto'
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
import type { WidgetHistoryEntry } from '~/types/widget-history'

export type PersistenceState = 'idle' | 'saving' | 'saved' | 'error'
export type DataRefreshState = 'idle' | 'refreshing' | 'error'

function sortProjects(projects: WidgetProject[]): WidgetProject[] {
  return [...projects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export function useWidgetProjects() {
  const project = ref(createNeutralWidgetProject())
  const projects = ref<WidgetProject[]>([])
  const historyEntries = ref<WidgetHistoryEntry[]>([])
  const isLoading = ref(true)
  const isHydrated = ref(false)
  const persistenceState = ref<PersistenceState>('idle')
  const persistenceError = ref<string | null>(null)
  const dataRefreshState = ref<DataRefreshState>('idle')
  const dataRefreshError = ref<string | null>(null)

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
        historyEntries.value = []
        await repository.setActiveProjectId(null)
      } else {
        projects.value = storedProjects
        const activeProjectId = await repository.getActiveProjectId()
        const activeProject = storedProjects.find(item => item.id === activeProjectId) ?? storedProjects[0]!
        project.value = cloneWidgetProject(activeProject)
        historyEntries.value = await repository.listHistory(activeProject.id)
        await repository.setActiveProjectId(activeProject.id)
      }
      dataRefreshState.value = 'idle'
      dataRefreshError.value = null
      persistenceState.value = 'saved'
      persistenceError.value = null
    } catch (error) {
      useMemoryFallback(error)
      projects.value = []
      project.value = createNeutralWidgetProject()
      historyEntries.value = []
      dataRefreshState.value = 'idle'
      dataRefreshError.value = null
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

  function persistProject(
    nextProject: WidgetProject,
    historyEntry?: WidgetHistoryEntry
  ): Promise<void> {
    if (historyEntry && !historyEntries.value.some(entry => entry.id === historyEntry.id)) {
      historyEntries.value = [...historyEntries.value, historyEntry]
    }

    if (!isHydrated.value) {
      return Promise.resolve()
    }

    persistenceState.value = 'saving'
    persistenceError.value = null
    saveQueue = saveQueue
      .catch(() => undefined)
      .then(async () => {
        await repository.saveProject(nextProject, historyEntry)
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
    historyEntries.value = []
    dataRefreshState.value = 'idle'
    dataRefreshError.value = null
    try {
      await repository.setActiveProjectId(nextProject.id)
      historyEntries.value = await repository.listHistory(nextProject.id)
    } catch (error) {
      setPersistenceError(error)
    }
  }

  async function createProject(
    name: string,
    startingIntent?: WidgetStarterId
  ): Promise<WidgetProject> {
    dataRefreshState.value = 'idle'
    dataRefreshError.value = null
    const nextProject = createNewWidgetProject(undefined, name, startingIntent)
    replaceProject(nextProject)
    historyEntries.value = []
    await persistProject(nextProject)
    if (startingIntent === 'cryptocurrency') {
      return refreshProjectData(nextProject)
    }
    return nextProject
  }

  async function createExampleProject(): Promise<WidgetProject> {
    dataRefreshState.value = 'idle'
    dataRefreshError.value = null
    const nextProject = createExampleWidgetProject()
    replaceProject(nextProject)
    historyEntries.value = []
    await persistProject(nextProject)
    return nextProject
  }

  async function duplicateProject(source: WidgetProject): Promise<WidgetProject> {
    dataRefreshState.value = 'idle'
    dataRefreshError.value = null
    const nextProject = duplicateWidgetProject(source)
    replaceProject(nextProject)
    historyEntries.value = []
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
          historyEntries.value = await repository.listHistory(nextProject.id)
          await repository.setActiveProjectId(nextProject.id)
        } else {
          project.value = createNeutralWidgetProject()
          historyEntries.value = []
          await repository.setActiveProjectId(null)
        }
      }
      dataRefreshState.value = 'idle'
      dataRefreshError.value = null
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

  async function refreshProjectData(target = project.value): Promise<WidgetProject> {
    if (!isBitcoinDataAdapter(target.dataSource.adapter)) {
      return target
    }

    dataRefreshState.value = 'refreshing'
    dataRefreshError.value = null
    const response = await fetchBitcoinMarketData()
    if (!response.ok) {
      dataRefreshState.value = 'error'
      dataRefreshError.value = `${response.message} ${response.recovery}`
      return target
    }

    const result = applyWidgetOperation(target, {
      type: 'set-public-data-source',
      expectedRevision: target.revision,
      source: createBitcoinDataSource(),
      data: {
        kind: 'live',
        label: 'Live Bitcoin data from CoinGecko',
        capturedAt: response.capturedAt,
        value: response.data
      }
    })
    if (!result.ok) {
      dataRefreshState.value = 'error'
      dataRefreshError.value = result.message
      return target
    }

    replaceProject(result.state)
    await persistProject(result.state)
    dataRefreshState.value = 'idle'
    dataRefreshError.value = null
    return result.state
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
    historyEntries,
    isLoading,
    isHydrated,
    persistenceState,
    persistenceError,
    dataRefreshState,
    dataRefreshError,
    replaceProject,
    persistProject,
    refreshProjectData,
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
