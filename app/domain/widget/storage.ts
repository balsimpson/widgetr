import { validateWidgetProject } from './schema'
import { cloneWidgetProject } from './clone'
import type { WidgetProject } from '~/types/widget'

const DATABASE_NAME = 'widgetr-local'
const DATABASE_VERSION = 1
const PROJECTS_STORE = 'projects'
const REFERENCES_STORE = 'references'
const WORKSPACE_STORE = 'workspace'
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
  saveProject(project: WidgetProject): Promise<void>
  deleteProject(projectId: string): Promise<void>
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
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB.'))
  })
}

function sortProjects(projects: WidgetProject[]): WidgetProject[] {
  return projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
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

    async saveProject(project) {
      const validation = validateWidgetProject(project)
      if (!validation.ok) {
        throw new Error('The project could not be saved because its state is invalid.')
      }

      const db = await database
      const transaction = db.transaction(PROJECTS_STORE, 'readwrite')
      transaction.objectStore(PROJECTS_STORE).put(validation.value)
      await transactionComplete(transaction)
    },

    async deleteProject(projectId) {
      const db = await database
      const transaction = db.transaction(PROJECTS_STORE, 'readwrite')
      transaction.objectStore(PROJECTS_STORE).delete(projectId)
      await transactionComplete(transaction)
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
  let activeProjectId: string | null = null

  return {
    async listProjects() {
      return sortProjects([...projects.values()].map(project => cloneWidgetProject(project)))
    },

    async saveProject(project) {
      const validation = validateWidgetProject(project)
      if (!validation.ok) {
        throw new Error('The project could not be saved because its state is invalid.')
      }
      projects.set(project.id, cloneWidgetProject(validation.value))
    },

    async deleteProject(projectId) {
      projects.delete(projectId)
      if (activeProjectId === projectId) {
        activeProjectId = null
      }
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
