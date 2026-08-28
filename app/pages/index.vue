<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { importScriptableProject } from '~/domain/widget/importer'
import { cloneWidgetProject } from '~/domain/widget/clone'
import { applyWidgetOperation } from '~/domain/widget/operations'
import { resolveDesignScope } from '~/domain/widget/schema'
import { useWidgetProjects } from '~/composables/useWidgetProjects'
import { generateScriptableCode } from '~/domain/widget/scriptable'
import { WIDGET_SIZES } from '~/types/widget'
import type {
  OperationResult,
  WidgetOperation,
  WidgetProject,
  WidgetSelection,
  WidgetSize
} from '~/types/widget'

useHead({
  title: 'Widgetr local editor',
  meta: [
    {
      name: 'description',
      content: 'A local-first visual editor for building Scriptable widgets.'
    }
  ]
})

const {
  project,
  projects,
  isLoading,
  persistenceState,
  persistenceError,
  replaceProject,
  persistProject,
  openProject,
  createProject,
  duplicateProject,
  deleteProject,
  saveReference,
  getReference,
  deleteReference
} = useWidgetProjects()

const lastResult = ref<OperationResult | null>(null)
const historyPast = ref<WidgetProject[]>([])
const historyFuture = ref<WidgetProject[]>([])
const structureSize = ref<WidgetSize>('small')
const sourceOpen = ref(false)
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')

const newProjectOpen = ref(false)
const newProjectName = ref('')
const renameProjectOpen = ref(false)
const renameProjectName = ref('')
const renameTarget = ref<WidgetProject | null>(null)
const deleteProjectOpen = ref(false)
const deleteTarget = ref<WidgetProject | null>(null)
const importOpen = ref(false)
const importSource = ref('')
const importError = ref<string | null>(null)
const referenceUpload = ref<File | null | undefined>()
const referenceUrl = ref<string | null>(null)
const referenceError = ref<string | null>(null)

const activeSizes = computed(() => resolveDesignScope(project.value.designScope))
const exportResult = computed(() => generateScriptableCode(project.value))
const generatedSource = computed(() => exportResult.value.code ?? '')
const blockingIssues = computed(() => exportResult.value.issues.filter(issue => issue.severity === 'blocking'))
const warningIssues = computed(() => exportResult.value.issues.filter(issue => issue.severity === 'warning'))
const exportReady = computed(() => generatedSource.value.length > 0)

const scopeLabel = computed(() => {
  if (activeSizes.value.length === WIDGET_SIZES.length) {
    return 'All sizes'
  }
  return activeSizes.value
    .map(size => size[0]!.toUpperCase() + size.slice(1))
    .join(' + ')
})

const importReportSections = computed(() => {
  const report = project.value.importReport
  if (!report) {
    return []
  }

  return [
    { key: 'reproduced', label: 'Recreated or detected', items: report.reproduced },
    { key: 'approximated', label: 'Approximated', items: report.approximated },
    { key: 'unsupported', label: 'Unsupported behavior', items: report.unsupported },
    { key: 'data-calls', label: 'Data calls detected', items: report.dataCalls },
    { key: 'required-input', label: 'Input still needed', items: report.requiredUserInput },
    { key: 'next-steps', label: 'Next corrections', items: report.nextSteps }
  ].filter(section => section.items.length > 0)
})

const exportStatusColor = computed(() => {
  if (blockingIssues.value.length > 0) {
    return 'error'
  }
  if (warningIssues.value.length > 0) {
    return 'warning'
  }
  return 'success'
})

const exportStatusLabel = computed(() => {
  if (blockingIssues.value.length > 0) {
    return `${blockingIssues.value.length} blocker${blockingIssues.value.length === 1 ? '' : 's'}`
  }
  if (warningIssues.value.length > 0) {
    return `${warningIssues.value.length} warning${warningIssues.value.length === 1 ? '' : 's'}`
  }
  return 'Ready to export'
})

const blockingDescription = computed(() => blockingIssues.value
  .map(issue => `${issue.message} ${issue.recovery}`)
  .join(' '))

const warningDescription = computed(() => warningIssues.value
  .map(issue => `${issue.message} ${issue.recovery}`)
  .join(' '))

const copyButtonLabel = computed(() => {
  if (copyState.value === 'copied') {
    return 'Copied source'
  }
  if (copyState.value === 'failed') {
    return 'Copy failed'
  }
  return 'Copy source'
})

const structureSizeOptions = WIDGET_SIZES.map(size => ({
  label: `${size[0]!.toUpperCase()}${size.slice(1)} structure`,
  value: size
}))

const activeProject = computed(() => projects.value.find(item => item.id === project.value.id) ?? project.value)

function commitOperation(
  operation: WidgetOperation,
  options: { recordHistory?: boolean } = {}
): OperationResult {
  const previousState = cloneWidgetProject(project.value)
  const result = applyWidgetOperation(project.value, operation)
  lastResult.value = result

  if (!result.ok) {
    return result
  }

  const recordHistory = options.recordHistory ?? operation.type !== 'set-selection'
  if (recordHistory) {
    historyPast.value = [...historyPast.value, previousState]
    historyFuture.value = []
  }

  replaceProject(result.state)
  void persistProject(result.state)
  return result
}

function selectElement(selection: WidgetSelection): void {
  if (
    project.value.selection?.size === selection.size
    && project.value.selection.elementId === selection.elementId
  ) {
    return
  }

  commitOperation({
    type: 'set-selection',
    expectedRevision: project.value.revision,
    selection
  }, { recordHistory: false })
}

function undo(): void {
  const previous = historyPast.value.at(-1)
  if (!previous) {
    return
  }

  historyPast.value = historyPast.value.slice(0, -1)
  historyFuture.value = [...historyFuture.value, cloneWidgetProject(project.value)]
  const result = commitOperation({
    type: 'restore-snapshot',
    expectedRevision: project.value.revision,
    snapshot: previous
  }, { recordHistory: false })

  if (!result.ok) {
    historyPast.value = [...historyPast.value, previous]
    historyFuture.value = historyFuture.value.slice(0, -1)
  }
}

function redo(): void {
  const next = historyFuture.value.at(-1)
  if (!next) {
    return
  }

  historyFuture.value = historyFuture.value.slice(0, -1)
  historyPast.value = [...historyPast.value, cloneWidgetProject(project.value)]
  const result = commitOperation({
    type: 'restore-snapshot',
    expectedRevision: project.value.revision,
    snapshot: next
  }, { recordHistory: false })

  if (!result.ok) {
    historyPast.value = historyPast.value.slice(0, -1)
    historyFuture.value = [...historyFuture.value, next]
  }
}

async function selectProject(projectId: string): Promise<void> {
  await openProject(projectId)
  historyPast.value = []
  historyFuture.value = []
  lastResult.value = null
  referenceError.value = null
  await loadReferenceImage()
}

function openNewProject(): void {
  newProjectName.value = ''
  newProjectOpen.value = true
}

async function submitNewProject(): Promise<void> {
  const name = newProjectName.value.trim()
  if (!name) {
    return
  }
  await createProject(name)
  historyPast.value = []
  historyFuture.value = []
  lastResult.value = null
  newProjectOpen.value = false
  await loadReferenceImage()
}

function openRenameProject(target: WidgetProject): void {
  renameTarget.value = target
  renameProjectName.value = target.name
  renameProjectOpen.value = true
}

function submitRenameProject(): void {
  const name = renameProjectName.value.trim()
  if (!name || !renameTarget.value) {
    return
  }

  const result = commitOperation({
    type: 'update-project-metadata',
    expectedRevision: project.value.revision,
    patch: { name }
  })
  if (result.ok) {
    renameProjectOpen.value = false
    renameTarget.value = null
  }
}

async function duplicateSelectedProject(target: WidgetProject): Promise<void> {
  await duplicateProject(target)
  historyPast.value = []
  historyFuture.value = []
  lastResult.value = null
  await loadReferenceImage()
}

function openDeleteProject(target: WidgetProject): void {
  deleteTarget.value = target
  deleteProjectOpen.value = true
}

async function confirmDeleteProject(): Promise<void> {
  if (!deleteTarget.value) {
    return
  }
  await deleteProject(deleteTarget.value)
  historyPast.value = []
  historyFuture.value = []
  lastResult.value = null
  deleteProjectOpen.value = false
  deleteTarget.value = null
  await loadReferenceImage()
}

function openImport(): void {
  importSource.value = ''
  importError.value = null
  importOpen.value = true
}

async function submitImport(): Promise<void> {
  if (!importSource.value.trim()) {
    importError.value = 'Paste a Scriptable file before importing it.'
    return
  }

  try {
    const imported = importScriptableProject(importSource.value)
    replaceProject(imported.project)
    await persistProject(imported.project)
    historyPast.value = []
    historyFuture.value = []
    lastResult.value = null
    importOpen.value = false
    importError.value = null
    await loadReferenceImage()
  } catch (error) {
    importError.value = error instanceof Error ? error.message : 'The Scriptable source could not be imported.'
  }
}

function readImageDimensions(file: Blob): Promise<{ width: number, height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The selected image could not be read.'))
    }
    image.src = url
  })
}

async function handleReferenceUpload(value: File | null | undefined): Promise<void> {
  const file = value
  referenceUpload.value = undefined
  if (!file) {
    return
  }
  if (!file.type.startsWith('image/')) {
    referenceError.value = 'Choose an image file for the local reference.'
    return
  }

  referenceError.value = null
  const oldReference = project.value.localReference?.storageKey
  const storageKey = `${project.value.id}/${Date.now()}-${file.name}`

  try {
    const dimensions = await readImageDimensions(file)
    await saveReference(storageKey, file)
    const result = commitOperation({
      type: 'update-project-metadata',
      expectedRevision: project.value.revision,
      patch: {
        localReference: {
          storageKey,
          fileName: file.name,
          mimeType: file.type,
          width: dimensions.width,
          height: dimensions.height,
          addedAt: new Date().toISOString()
        }
      }
    })

    if (!result.ok) {
      await deleteReference(storageKey)
      referenceError.value = result.message
      return
    }

    if (oldReference) {
      await deleteReference(oldReference)
    }
    await loadReferenceImage()
  } catch (error) {
    await deleteReference(storageKey).catch(() => undefined)
    referenceError.value = error instanceof Error ? error.message : 'The reference image could not be saved.'
  }
}

async function loadReferenceImage(): Promise<void> {
  referenceError.value = null
  if (referenceUrl.value) {
    URL.revokeObjectURL(referenceUrl.value)
    referenceUrl.value = null
  }

  const storageKey = project.value.localReference?.storageKey
  if (!storageKey) {
    return
  }

  try {
    const blob = await getReference(storageKey)
    if (project.value.localReference?.storageKey !== storageKey) {
      return
    }
    if (!blob) {
      referenceError.value = 'The local reference metadata exists, but its image data is unavailable.'
      return
    }
    referenceUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    if (project.value.localReference?.storageKey === storageKey) {
      referenceError.value = error instanceof Error ? error.message : 'The local reference image could not be loaded.'
    }
  }
}

async function removeReference(): Promise<void> {
  const storageKey = project.value.localReference?.storageKey
  if (!storageKey) {
    return
  }

  const result = commitOperation({
    type: 'update-project-metadata',
    expectedRevision: project.value.revision,
    patch: { localReference: null }
  })
  if (result.ok) {
    await deleteReference(storageKey)
    await loadReferenceImage()
  }
}

async function copyExport(): Promise<void> {
  if (!exportReady.value || !navigator.clipboard) {
    copyState.value = 'failed'
    return
  }

  try {
    await navigator.clipboard.writeText(generatedSource.value)
    copyState.value = 'copied'
    window.setTimeout(() => {
      copyState.value = 'idle'
    }, 1800)
  } catch {
    copyState.value = 'failed'
  }
}

function downloadExport(): void {
  if (!exportReady.value) {
    return
  }

  const blob = new Blob([generatedSource.value], { type: 'text/javascript;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = `widgetr-${project.value.id}.js`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(href)
}

function isActiveSize(size: WidgetSize): boolean {
  return activeSizes.value.includes(size)
}

watch(
  () => project.value.localReference?.storageKey,
  () => {
    void loadReferenceImage()
  }
)

onBeforeUnmount(() => {
  if (referenceUrl.value) {
    URL.revokeObjectURL(referenceUrl.value)
  }
})
</script>

<template>
  <main class="editor-shell">
    <header class="editor-header">
      <div class="editor-title-block">
        <p class="phase-label">Widgetr / phase 3</p>
        <h1>{{ project.name }}</h1>
        <p class="editor-summary">
          A local visual editor for one widget, three Scriptable sizes, and one export path.
        </p>
      </div>

      <div class="editor-header-actions">
        <div class="history-actions" aria-label="Session history">
          <UButton
            icon="i-lucide-undo-2"
            color="neutral"
            variant="outline"
            :disabled="historyPast.length === 0"
            aria-label="Undo"
            @click="undo"
          />
          <UButton
            icon="i-lucide-redo-2"
            color="neutral"
            variant="outline"
            :disabled="historyFuture.length === 0"
            aria-label="Redo"
            @click="redo"
          />
        </div>
        <UBadge
          color="neutral"
          variant="soft"
          :label="`Revision ${project.revision}`"
        />
        <UBadge
          :color="persistenceState === 'error' ? 'error' : persistenceState === 'saving' ? 'warning' : 'success'"
          variant="soft"
          :label="persistenceState === 'saving' ? 'Saving' : persistenceState === 'error' ? 'Storage issue' : 'Saved locally'"
        />
      </div>
    </header>

    <UAlert
      v-if="persistenceError"
      class="editor-alert"
      color="error"
      variant="subtle"
      icon="i-lucide-database-zap"
      title="Browser storage needs attention"
      :description="`${persistenceError} The current session remains available, but it may not survive a refresh.`"
    />

    <section class="workspace-grid" aria-label="Widget editor">
      <div class="workspace-left">
        <WidgetProjectList
          :projects="projects"
          :active-project-id="project.id"
          :is-loading="isLoading"
          :persistence-state="persistenceState"
          @create="openNewProject"
          @import="openImport"
          @open="selectProject"
          @rename="openRenameProject"
          @duplicate="duplicateSelectedProject"
          @delete="openDeleteProject"
        />

        <section class="reference-panel" aria-labelledby="reference-heading">
          <div class="panel-heading">
            <div>
              <p class="panel-kicker">Local reference</p>
              <h2 id="reference-heading">Visual direction</h2>
            </div>
            <UIcon name="i-lucide-image-plus" aria-hidden="true" />
          </div>

          <UFormField
            label="Add a local image"
            description="The file stays in this browser and is never uploaded by Widgetr."
          >
            <UFileUpload
              v-model="referenceUpload"
              class="w-full"
              accept="image/*"
              @update:model-value="handleReferenceUpload"
            />
          </UFormField>

          <UAlert
            v-if="referenceError"
            color="error"
            variant="subtle"
            icon="i-lucide-image-off"
            title="Reference image unavailable"
            :description="referenceError"
          />

          <div v-if="referenceUrl && activeProject.localReference" class="reference-preview">
            <img
              :src="referenceUrl"
              :alt="`Local reference for ${project.name}`"
            >
            <div class="reference-meta">
              <span>{{ activeProject.localReference.fileName }}</span>
              <span>{{ activeProject.localReference.width }} × {{ activeProject.localReference.height }}</span>
            </div>
            <UButton
              label="Remove reference"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="xs"
              @click="removeReference"
            />
          </div>
          <p v-else class="reference-empty">
            Add a screenshot or visual reference when you want the editor to keep a style nearby.
          </p>
        </section>

        <section
          v-if="project.importReport"
          class="import-report-panel"
          aria-labelledby="import-report-heading"
        >
          <div class="panel-heading">
            <div>
              <p class="panel-kicker">Import report</p>
              <h2 id="import-report-heading">What Widgetr kept</h2>
            </div>
            <UIcon name="i-lucide-file-check-2" aria-hidden="true" />
          </div>

          <div v-for="section in importReportSections" :key="section.key" class="report-group">
            <p class="report-label">{{ section.label }}</p>
            <ul>
              <li v-for="item in section.items" :key="`${section.key}-${item}`">{{ item }}</li>
            </ul>
          </div>
        </section>
      </div>

      <section class="canvas-panel" aria-labelledby="canvas-heading">
        <div class="canvas-toolbar">
          <div>
            <p class="panel-kicker">Preview</p>
            <h2 id="canvas-heading">Three layout trees, one project</h2>
          </div>
          <div class="scope-readout">
            <span>Editing scope</span>
            <UBadge color="primary" variant="soft" :label="scopeLabel" />
          </div>
        </div>

        <UAlert
          v-if="lastResult"
          class="operation-result"
          :color="lastResult.ok ? 'success' : 'error'"
          variant="subtle"
          :icon="lastResult.ok ? 'i-lucide-check-circle-2' : 'i-lucide-circle-alert'"
          :title="lastResult.ok ? `Revision ${lastResult.revision}` : lastResult.code"
          :description="lastResult.message"
        />

        <div class="preview-scroll">
          <div class="preview-grid">
            <WidgetPreview
              v-for="size in WIDGET_SIZES"
              :key="size"
              :project="project"
              :size="size"
              @select="selectElement"
            />
          </div>
        </div>

        <div class="structure-panel">
          <div class="panel-heading">
            <div>
              <p class="panel-kicker">Structure</p>
              <h2>Choose an element to inspect</h2>
            </div>
            <USelect
              class="structure-size-select"
              :model-value="structureSize"
              :items="structureSizeOptions"
              value-key="value"
              aria-label="Structure widget size"
              @update:model-value="value => structureSize = value as WidgetSize"
            />
          </div>

          <div class="structure-scroll">
            <ul class="structure-tree">
              <WidgetStructureTree
                :element="project.layouts[structureSize].root"
                :size="structureSize"
                :selection="project.selection"
                @select="selectElement"
              />
            </ul>
          </div>
        </div>

        <section class="export-panel" aria-labelledby="export-heading">
          <div class="panel-heading">
            <div>
              <p class="panel-kicker">Scriptable export</p>
              <h2 id="export-heading">One file for small, medium, and large</h2>
            </div>
            <UBadge
              :color="exportStatusColor"
              variant="soft"
              :label="exportStatusLabel"
            />
          </div>

          <UAlert
            v-if="blockingIssues.length"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            title="Export is blocked"
            :description="blockingDescription"
          />
          <UAlert
            v-else-if="warningIssues.length"
            color="warning"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            title="Export is ready with review notes"
            :description="warningDescription"
          />

          <div class="export-actions">
            <UButton
              label="View source"
              icon="i-lucide-code-2"
              color="primary"
              :disabled="!exportReady"
              @click="sourceOpen = true"
            />
            <UButton
              :label="copyButtonLabel"
              icon="i-lucide-copy"
              color="neutral"
              variant="outline"
              :disabled="!exportReady"
              @click="copyExport"
            />
            <UButton
              label="Download .js"
              icon="i-lucide-download"
              color="neutral"
              variant="outline"
              :disabled="!exportReady"
              @click="downloadExport"
            />
          </div>
          <p class="export-note">
            {{ generatedSource.length.toLocaleString() }} characters · source, Copy, and download use the same generated string.
          </p>
        </section>
      </section>

      <WidgetInspector
        :project="project"
        :selection="project.selection"
        @operation="commitOperation"
      />
    </section>

    <UModal
      v-model:open="newProjectOpen"
      title="Create a local widget"
      description="Start from Widgetr's editable three-size sample and make it yours."
    >
      <template #body>
        <UFormField label="Widget name">
          <UInput
            v-model="newProjectName"
            class="w-full"
            placeholder="e.g. Morning commute"
            autofocus
            @keyup.enter="submitNewProject"
          />
        </UFormField>
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="newProjectOpen = false"
          />
          <UButton
            label="Create widget"
            color="primary"
            :disabled="!newProjectName.trim()"
            @click="submitNewProject"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="renameProjectOpen"
      title="Rename project"
      description="The new name is saved with this local project."
    >
      <template #body>
        <UFormField label="Widget name">
          <UInput
            v-model="renameProjectName"
            class="w-full"
            placeholder="e.g. Evening forecast"
            autofocus
            @keyup.enter="submitRenameProject"
          />
        </UFormField>
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="renameProjectOpen = false"
          />
          <UButton
            label="Save name"
            color="primary"
            :disabled="!renameProjectName.trim()"
            @click="submitRenameProject"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="deleteProjectOpen"
      title="Delete local project"
      description="This removes the project and its locally stored reference image from this browser."
    >
      <template #body>
        <p class="modal-copy">
          Delete <strong>{{ deleteTarget?.name }}</strong>? This action cannot be undone from Widgetr.
        </p>
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton
            label="Keep project"
            color="neutral"
            variant="outline"
            @click="deleteProjectOpen = false"
          />
          <UButton
            label="Delete project"
            color="error"
            @click="confirmDeleteProject"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="importOpen"
      title="Import a Scriptable widget"
      description="Widgetr reads the source as text. It never executes pasted JavaScript in the app."
    >
      <template #body>
        <UFormField
          label="Scriptable source"
          description="Widgetr exports can be reconstructed exactly. Other scripts become a clearly labelled visual starting point."
        >
          <UTextarea
            v-model="importSource"
            class="w-full import-textarea"
            :rows="14"
            placeholder="Paste the Scriptable file here"
            spellcheck="false"
          />
        </UFormField>
        <UAlert
          v-if="importError"
          class="modal-alert"
          color="error"
          variant="subtle"
          icon="i-lucide-file-warning"
          title="Import needs another try"
          :description="importError"
        />
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="importOpen = false"
          />
          <UButton
            label="Import safely"
            icon="i-lucide-file-input"
            color="primary"
            :disabled="!importSource.trim()"
            @click="submitImport"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="sourceOpen"
      title="Generated Scriptable source"
      description="Read-only output from the current canonical widget state."
    >
      <template #body>
        <UTextarea
          :model-value="generatedSource"
          class="export-code w-full"
          aria-label="Generated Scriptable source"
          readonly
          :rows="24"
          wrap="off"
          spellcheck="false"
        />
      </template>
    </UModal>
  </main>
</template>

<style scoped>
.editor-shell {
  width: min(100%, 118rem);
  min-height: 100vh;
  margin: 0 auto;
  padding: 1.5rem;
}

.editor-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.5rem 0 1.25rem;
}

.phase-label,
.panel-kicker,
.scope-readout,
.reference-meta,
.export-note {
  color: var(--ui-text-muted);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.editor-title-block h1 {
  max-width: 25ch;
  margin-top: 0.35rem;
  color: var(--ui-text-highlighted);
  font-size: clamp(1.8rem, 3.5vw, 3.5rem);
  font-weight: 750;
  letter-spacing: -0.06em;
  line-height: 0.98;
  overflow-wrap: anywhere;
}

.editor-summary {
  max-width: 40rem;
  margin-top: 0.65rem;
  color: var(--ui-text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.editor-header-actions,
.history-actions,
.export-actions,
.modal-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.editor-header-actions {
  justify-content: flex-end;
}

.editor-alert {
  margin-bottom: 1rem;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(15rem, 18rem) minmax(0, 1fr) minmax(19rem, 24rem);
  min-height: calc(100vh - 9rem);
  overflow: hidden;
  border: 1px solid var(--ui-border-muted);
  border-radius: 1rem;
  background: var(--ui-bg);
  box-shadow: 0 20px 70px rgb(23 32 51 / 8%);
}

.workspace-left {
  display: grid;
  align-content: start;
  min-width: 0;
  border-right: 1px solid var(--ui-border-muted);
}

.reference-panel {
  display: grid;
  align-content: start;
  gap: 0.8rem;
  padding: 1.25rem;
  border-top: 1px solid var(--ui-border-muted);
}

.panel-heading,
.canvas-toolbar,
.scope-readout {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.panel-heading h2,
.canvas-toolbar h2 {
  margin-top: 0.2rem;
  color: var(--ui-text-highlighted);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.reference-preview {
  display: grid;
  gap: 0.55rem;
}

.reference-preview img {
  display: block;
  width: 100%;
  max-height: 12rem;
  object-fit: cover;
  border: 1px solid var(--ui-border-muted);
  border-radius: 0.6rem;
}

.reference-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  overflow-wrap: anywhere;
  font-size: 0.56rem;
}

.reference-empty {
  color: var(--ui-text-muted);
  font-size: 0.72rem;
  line-height: 1.5;
}

.import-report-panel {
  display: grid;
  align-content: start;
  gap: 0.9rem;
  padding: 1.25rem;
  border-top: 1px solid var(--ui-border-muted);
}

.report-group {
  display: grid;
  gap: 0.35rem;
}

.report-label {
  color: var(--ui-text-highlighted);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.report-group ul {
  display: grid;
  gap: 0.3rem;
  margin: 0;
  padding-left: 1rem;
  color: var(--ui-text-muted);
  font-size: 0.7rem;
  line-height: 1.45;
}

.canvas-panel {
  display: grid;
  align-content: start;
  min-width: 0;
  background:
    linear-gradient(var(--ui-border-muted) 1px, transparent 1px),
    linear-gradient(90deg, var(--ui-border-muted) 1px, transparent 1px);
  background-size: 24px 24px;
}

.canvas-toolbar,
.structure-panel,
.export-panel {
  background: color-mix(in srgb, var(--ui-bg) 94%, transparent);
}

.canvas-toolbar {
  padding: 1.25rem 1.5rem 0;
}

.operation-result {
  margin: 1rem 1.5rem 0;
}

.scope-readout {
  align-items: center;
  color: var(--ui-text-muted);
  font-size: 0.58rem;
  white-space: nowrap;
}

.preview-scroll {
  min-width: 0;
  margin-top: 1.25rem;
  padding: 0.75rem 1.5rem 1.5rem;
  overflow-x: auto;
}

.preview-grid {
  display: grid;
  grid-template-columns: 158px 338px 338px;
  gap: 1.5rem;
  width: max-content;
  align-items: start;
}

.structure-panel,
.export-panel {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--ui-border-muted);
}

.structure-size-select {
  width: 10rem;
}

.structure-scroll {
  max-height: 22rem;
  margin-top: 0.8rem;
  padding-right: 0.25rem;
  overflow: auto;
}

.structure-tree {
  margin: 0;
  padding: 0;
  list-style: none;
}

.export-panel {
  display: grid;
  align-content: start;
  gap: 0.9rem;
}

.export-actions {
  align-items: flex-start;
}

.export-note {
  margin: 0;
  font-size: 0.58rem;
  line-height: 1.5;
  text-transform: none;
}

.export-code :deep(textarea) {
  min-height: 34rem;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  line-height: 1.5;
  white-space: pre;
}

.import-textarea :deep(textarea) {
  min-height: 20rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  line-height: 1.5;
  white-space: pre;
}

.modal-alert {
  margin-top: 1rem;
}

.modal-copy {
  color: var(--ui-text-toned);
  font-size: 0.9rem;
  line-height: 1.55;
}

@media (max-width: 88rem) {
  .workspace-grid {
    grid-template-columns: minmax(14rem, 17rem) minmax(0, 1fr);
    grid-template-areas:
      "left canvas"
      "left inspector";
  }

  .workspace-left {
    grid-area: left;
  }

  .canvas-panel {
    grid-area: canvas;
  }

  .inspector-panel {
    grid-area: inspector;
    border-top: 1px solid var(--ui-border-muted);
  }
}

@media (max-width: 58rem) {
  .editor-shell {
    padding: 1rem;
  }

  .editor-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .editor-header-actions {
    justify-content: flex-start;
  }

  .workspace-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "left"
      "canvas"
      "inspector";
  }

  .workspace-left {
    border-right: 0;
  }

  .project-panel {
    border-right: 0;
  }

  .canvas-toolbar,
  .structure-panel,
  .export-panel {
    padding-right: 1rem;
    padding-left: 1rem;
  }

  .preview-scroll {
    padding-right: 1rem;
    padding-left: 1rem;
  }
}

@media (max-width: 30rem) {
  .canvas-toolbar,
  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .scope-readout {
    align-items: flex-start;
  }

  .structure-size-select {
    width: 100%;
  }
}
</style>
