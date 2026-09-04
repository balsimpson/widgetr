import { validateWidgetProject } from './schema'
import { cloneWidgetProject } from './clone'
import type { WidgetProject } from '~/types/widget'
import { parseWidgetHistoryEntry } from './history'
import type { WidgetHistoryEntry } from '~/types/widget-history'

const DATABASE_NAME = 'widgetr-local'
const DATABASE_VERSION = 2
const PROJECTS_STORE = 'projects'
const REFERENCES_STORE = 'references'
const WORKSPACE_STORE = 'workspace'
const HISTORY_STORE = 'history'
const ACTIVE_PROJECT_KEY = 'active-project'

interface StoredReference {
  storageKey: string
  blob: Blob
}

interface StoredWorkspace {
  key: string
  projectId: string | null
}

export interface WidgetProjectRepository {
  listProjects(): Promise<WidgetProject[]>
  saveProject(project: WidgetProject, historyEntry?: WidgetHistoryEntry): Promise<void>
  deleteProject(projectId: string): Promise<void>
  listHistory(projectId: string): Promise<WidgetHistoryEntry[]>
  getActiveProjectId(): Promise<string | null>
  setActiveProjectId(projectId: string | null): Promise<void>
  saveReference(storageKey: string, blob: Blob): Promise<void>
  getReference(storageKey: string): Promise<Blob | null>
  deleteReference(storageKey: string): Promise<void>
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser does not provide IndexedDB.'))
      return
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(PROJECTS_STORE)) {
        database.createObjectStore(PROJECTS_STORE, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(REFERENCES_STORE)) {
        database.createObjectStore(REFERENCES_STORE, { keyPath: 'storageKey' })
      }
      if (!database.objectStoreNames.contains(WORKSPACE_STORE)) {
        database.createObjectStore(WORKSPACE_STORE, { keyPath: 'key' })
      }
      if (!database.objectStoreNames.contains(HISTORY_STORE)) {
        database.createObjectStore(HISTORY_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB.'))
  })
}

function sortProjects(projects: WidgetProject[]): WidgetProject[] {
  return projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function cloneHistoryEntry(entry: WidgetHistoryEntry): WidgetHistoryEntry {
  return {
    ...entry,
    targetIds: [...entry.targetIds],
    changedFields: [...entry.changedFields],
    changedSizes: [...entry.changedSizes],
    selection: entry.selection ? { ...entry.selection } : null,
    warnings: [...entry.warnings]
  }
}

export function createIndexedDbProjectRepository(): WidgetProjectRepository {
  const database = openDatabase()

  return {
    async listProjects() {
      const db = await database
      const transaction = db.transaction(PROJECTS_STORE, 'readonly')
      const records = await requestResult<unknown[]>(transaction.objectStore(PROJECTS_STORE).getAll())
      await transactionComplete(transaction)

      const projects = records.flatMap((record) => {
        const result = validateWidgetProject(record)
        return result.ok ? [result.value] : []
      })
      return sortProjects(projects)
    },

    async saveProject(project, historyEntry) {
      const validation = validateWidgetProject(project)
      if (!validation.ok) {
        throw new Error('The project could not be saved because its state is invalid.')
      }

      const normalizedHistory = historyEntry ? parseWidgetHistoryEntry(historyEntry) : null
      if (historyEntry && !normalizedHistory) {
        throw new Error('The project history entry is invalid.')
      }

      const db = await database
      const stores = normalizedHistory
        ? [PROJECTS_STORE, HISTORY_STORE]
        : [PROJECTS_STORE]
      const transaction = db.transaction(stores, 'readwrite')
      transaction.objectStore(PROJECTS_STORE).put(validation.value)
      if (normalizedHistory) {
        transaction.objectStore(HISTORY_STORE).put(normalizedHistory)
      }
      await transactionComplete(transaction)
    },

    async deleteProject(projectId) {
      const db = await database
      const transaction = db.transaction([PROJECTS_STORE, HISTORY_STORE], 'readwrite')
      transaction.objectStore(PROJECTS_STORE).delete(projectId)
      const historyStore = transaction.objectStore(HISTORY_STORE)
      const records = await requestResult<unknown[]>(historyStore.getAll())
      for (const record of records) {
        const entry = parseWidgetHistoryEntry(record)
        if (entry?.projectId === projectId) {
          historyStore.delete(entry.id)
        }
      }
      await transactionComplete(transaction)
    },

    async listHistory(projectId) {
      const db = await database
      const transaction = db.transaction(HISTORY_STORE, 'readonly')
      const records = await requestResult<unknown[]>(transaction.objectStore(HISTORY_STORE).getAll())
      await transactionComplete(transaction)

      return records
        .flatMap(record => {
          const entry = parseWidgetHistoryEntry(record)
          return entry?.projectId === projectId ? [entry] : []
        })
        .sort((left, right) => left.revision - right.revision)
    },

    async getActiveProjectId() {
      const db = await database
      const transaction = db.transaction(WORKSPACE_STORE, 'readonly')
      const record = await requestResult<StoredWorkspace | undefined>(
        transaction.objectStore(WORKSPACE_STORE).get(ACTIVE_PROJECT_KEY)
      )
      await transactionComplete(transaction)
      return record?.projectId ?? null
    },

    async setActiveProjectId(projectId) {
      const db = await database
      const transaction = db.transaction(WORKSPACE_STORE, 'readwrite')
      transaction.objectStore(WORKSPACE_STORE).put({
        key: ACTIVE_PROJECT_KEY,
        projectId
      } satisfies StoredWorkspace)
      await transactionComplete(transaction)
    },

    async saveReference(storageKey, blob) {
      const db = await database
      const transaction = db.transaction(REFERENCES_STORE, 'readwrite')
      transaction.objectStore(REFERENCES_STORE).put({ storageKey, blob } satisfies StoredReference)
      await transactionComplete(transaction)
    },

    async getReference(storageKey) {
      const db = await database
      const transaction = db.transaction(REFERENCES_STORE, 'readonly')
      const record = await requestResult<StoredReference | undefined>(
        transaction.objectStore(REFERENCES_STORE).get(storageKey)
      )
      await transactionComplete(transaction)
      return record?.blob ?? null
    },

    async deleteReference(storageKey) {
      const db = await database
      const transaction = db.transaction(REFERENCES_STORE, 'readwrite')
      transaction.objectStore(REFERENCES_STORE).delete(storageKey)
      await transactionComplete(transaction)
    }
  }
}

export function createMemoryProjectRepository(): WidgetProjectRepository {
  const projects = new Map<string, WidgetProject>()
  const references = new Map<string, Blob>()
  const history = new Map<string, WidgetHistoryEntry>()
  let activeProjectId: string | null = null

  return {
    async listProjects() {
      return sortProjects([...projects.values()].map(project => cloneWidgetProject(project)))
    },

    async saveProject(project, historyEntry) {
      const validation = validateWidgetProject(project)
      if (!validation.ok) {
        throw new Error('The project could not be saved because its state is invalid.')
      }
      const normalizedHistory = historyEntry ? parseWidgetHistoryEntry(historyEntry) : null
      if (historyEntry && !normalizedHistory) {
        throw new Error('The project history entry is invalid.')
      }
      projects.set(project.id, cloneWidgetProject(validation.value))
      if (normalizedHistory) {
        history.set(normalizedHistory.id, cloneHistoryEntry(normalizedHistory))
      }
    },

    async deleteProject(projectId) {
      projects.delete(projectId)
      for (const [entryId, entry] of history) {
        if (entry.projectId === projectId) {
          history.delete(entryId)
        }
      }
      if (activeProjectId === projectId) {
        activeProjectId = null
      }
    },

    async listHistory(projectId) {
      return [...history.values()]
        .filter(entry => entry.projectId === projectId)
        .sort((left, right) => left.revision - right.revision)
        .map(cloneHistoryEntry)
    },

    async getActiveProjectId() {
      return activeProjectId
    },

    async setActiveProjectId(projectId) {
      activeProjectId = projectId
    },

    async saveReference(storageKey, blob) {
      references.set(storageKey, blob)
    },

    async getReference(storageKey) {
      return references.get(storageKey) ?? null
    },

    async deleteReference(storageKey) {
      references.delete(storageKey)
    }
  }
}

export function createWidgetProjectRepository(): WidgetProjectRepository {
  return typeof indexedDB === 'undefined'
    ? createMemoryProjectRepository()
    : createIndexedDbProjectRepository()
}
