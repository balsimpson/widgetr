<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { cloneWidgetProject } from '~/domain/widget/clone'
import { applyWidgetOperation } from '~/domain/widget/operations'
import { resolveDesignScope } from '~/domain/widget/schema'
import { getWidgetStarter } from '~/domain/widget/starters'
import { findWidgetElement, widgetElementLabel } from '~/domain/widget/tree'
import { useWidgetProjects } from '~/composables/useWidgetProjects'
import { useWidgetWebMcp } from '~/composables/useWidgetWebMcp'
import { generateScriptableCode } from '~/domain/widget/scriptable'
import { WIDGET_SIZES } from '~/types/widget'
import type {
  OperationResult,
  WidgetOperation,
  WidgetProject,
  WidgetSelection,
  WidgetStarterId,
  WidgetSize
} from '~/types/widget'
import type { WebMcpConfirmationRequest } from '~/types/webmcp'

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
  createExampleProject,
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
const previewView = ref<WidgetSize | 'all'>('all')
const sourceOpen = ref(false)
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')

const projectsOpen = ref(false)
const layersOpen = ref(false)
const settingsOpen = ref(false)
const referenceOpen = ref(false)
const exportOpen = ref(false)
const agentOpen = ref(false)

const newProjectOpen = ref(false)
const newProjectName = ref('')
const renameProjectOpen = ref(false)
const renameProjectName = ref('')
const renameTarget = ref<WidgetProject | null>(null)
const deleteProjectOpen = ref(false)
const deleteTarget = ref<WidgetProject | null>(null)
const referenceUpload = ref<File | null | undefined>()
const referenceUrl = ref<string | null>(null)
const referenceError = ref<string | null>(null)
const agentConfirmation = ref<WebMcpConfirmationRequest | null>(null)
const starterBusy = ref(false)
let pendingAgentConfirmation: {
  resolve: (confirmed: boolean) => void
  cleanup: () => void
} | null = null

const activeSizes = computed(() => resolveDesignScope(project.value.designScope))
const showStarter = computed(() => isLoading.value || projects.value.length === 0)
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

const blockingDescription = computed(() => [...new Set(blockingIssues.value
  .map(issue => `${issue.message} ${issue.recovery}`))]
  .join(' '))

const warningDescription = computed(() => [...new Set(warningIssues.value
  .map(issue => `${issue.message} ${issue.recovery}`))]
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
  label: size[0]!.toUpperCase() + size.slice(1),
  value: size
}))

const previewViewOptions = [
  { label: 'All sizes', value: 'all' },
  ...WIDGET_SIZES.map(size => ({
    label: size[0]!.toUpperCase() + size.slice(1),
    value: size
  }))
]

const visiblePreviewSizes = computed(() => (
  previewView.value === 'all' ? WIDGET_SIZES : [previewView.value]
))

const activeProject = computed(() => projects.value.find(item => item.id === project.value.id) ?? project.value)

const selectedElementTitle = computed(() => {
  const selection = project.value.selection
  if (!selection) {
    return 'Edit selection'
  }

  const element = findWidgetElement(
    project.value.layouts[selection.size].root,
    selection.elementId
  )
  return element ? widgetElementLabel(element) : 'Edit selection'
})

const inspectorOpen = computed({
  get: () => project.value.selection !== null,
  set: (open: boolean) => {
    if (!open) {
      clearSelection()
    }
  }
})

const agentConfirmationOpen = computed({
  get: () => agentConfirmation.value !== null,
  set: (open: boolean) => {
    if (!open) {
      finishAgentConfirmation(false)
    }
  }
})

const {
  status: webmcpStatus,
  context: webmcpContext,
  registeredToolNames: webmcpRegisteredToolNames,
  error: webmcpError
} = useWidgetWebMcp({
  enabled: computed(() => !showStarter.value),
  project,
  commitOperation,
  createProject: createAgentProject,
  getExport: () => exportResult.value,
  requestConfirmation: requestAgentConfirmation
})

const agentStatusLabel = computed(() => {
  switch (webmcpStatus.value) {
    case 'registered':
      return 'Agent ready'
    case 'registering':
      return 'Connecting'
    case 'error':
      return 'Agent issue'
    default:
      return 'Agent unavailable'
  }
})

const agentStatusColor = computed(() => {
  switch (webmcpStatus.value) {
    case 'registered':
      return 'success'
    case 'registering':
      return 'warning'
    case 'error':
      return 'error'
    default:
      return 'neutral'
  }
})

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
  closeContextualSurfaces()
  structureSize.value = selection.size

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

function clearSelection(): void {
  if (!project.value.selection) {
    return
  }

  commitOperation({
    type: 'set-selection',
    expectedRevision: project.value.revision,
    selection: null
  }, { recordHistory: false })
}

function closeContextualSurfaces(): void {
  projectsOpen.value = false
  layersOpen.value = false
  settingsOpen.value = false
  referenceOpen.value = false
  exportOpen.value = false
  agentOpen.value = false
}

function openProjects(): void {
  closeContextualSurfaces()
  projectsOpen.value = true
}

function openLayers(): void {
  closeContextualSurfaces()
  layersOpen.value = true
}

function openWidgetSettings(): void {
  closeContextualSurfaces()
  settingsOpen.value = true
}

function openReference(): void {
  closeContextualSurfaces()
  referenceOpen.value = true
}

function openExport(): void {
  closeContextualSurfaces()
  exportOpen.value = true
}

function finishAgentConfirmation(confirmed: boolean): void {
  const pending = pendingAgentConfirmation
  pendingAgentConfirmation = null
  agentConfirmation.value = null
  pending?.cleanup()
  pending?.resolve(confirmed)
}

function requestAgentConfirmation(
  request: WebMcpConfirmationRequest,
  signal: AbortSignal
): Promise<boolean> {
  if (signal.aborted) {
    return Promise.resolve(false)
  }

  if (pendingAgentConfirmation) {
    finishAgentConfirmation(false)
  }

  return new Promise(resolve => {
    const abort = () => finishAgentConfirmation(false)
    const cleanup = () => signal.removeEventListener('abort', abort)
    pendingAgentConfirmation = { resolve, cleanup }
    agentConfirmation.value = request
    signal.addEventListener('abort', abort, { once: true })
  })
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
  closeContextualSurfaces()
  await openProject(projectId)
  historyPast.value = []
  historyFuture.value = []
  lastResult.value = null
  referenceError.value = null
  await loadReferenceImage()
}

function openNewProject(): void {
  closeContextualSurfaces()
  newProjectName.value = ''
  newProjectOpen.value = true
}

async function submitNewProject(): Promise<void> {
  const name = newProjectName.value.trim()
  if (!name) {
    return
  }
  await createAgentProject(name)
  newProjectOpen.value = false
}

async function createAgentProject(name: string): Promise<WidgetProject> {
  const created = await createProject(name)
  historyPast.value = []
  historyFuture.value = []
  lastResult.value = null
  referenceError.value = null
  await loadReferenceImage()
  return created
}

async function startFromStarter(starterId: WidgetStarterId): Promise<void> {
  if (starterBusy.value) {
    return
  }

  starterBusy.value = true

  try {
    const starter = getWidgetStarter(starterId)
    closeContextualSurfaces()

    if (starter.action === 'example') {
      await createExampleProject()
    } else {
      await createProject(starter.projectName ?? 'New widget', starter.id)
    }

    historyPast.value = []
    historyFuture.value = []
    lastResult.value = null
    referenceError.value = null
    await loadReferenceImage()

    if (starter.action === 'reference') {
      referenceOpen.value = true
    }
  } finally {
    starterBusy.value = false
  }
}

function openRenameProject(target: WidgetProject): void {
  closeContextualSurfaces()
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
  closeContextualSurfaces()
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

function openSourceViewer(): void {
  exportOpen.value = false
  sourceOpen.value = true
}

function downloadAndClose(): void {
  downloadExport()
  if (exportReady.value) {
    exportOpen.value = false
  }
}

let previewMediaQuery: MediaQueryList | null = null

function syncPreviewView(event?: MediaQueryList | MediaQueryListEvent): void {
  const isNarrow = event ? event.matches : previewMediaQuery?.matches ?? false
  previewView.value = isNarrow ? 'medium' : 'all'
}

watch(
  () => project.value.localReference?.storageKey,
  () => {
    void loadReferenceImage()
  }
)

onMounted(() => {
  previewMediaQuery = window.matchMedia('(max-width: 58rem)')
  syncPreviewView()
  previewMediaQuery.addEventListener('change', syncPreviewView)
})

onBeforeUnmount(() => {
  previewMediaQuery?.removeEventListener('change', syncPreviewView)
  if (referenceUrl.value) {
    URL.revokeObjectURL(referenceUrl.value)
  }
})
</script>

<template>
  <main class="editor-shell">
    <WidgetProjectStarter
      v-if="showStarter"
      :is-loading="isLoading"
      :persistence-error="persistenceError"
      :disabled="starterBusy"
      @start="startFromStarter"
    />

    <template v-else>
      <header class="editor-header">
      <div class="editor-title-block">
        <div class="editor-context">
          <UButton
            label="Projects"
            icon="i-lucide-panels-top-left"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="openProjects"
          />
          <span class="editor-context-divider" aria-hidden="true">/</span>
          <UBadge
            :color="persistenceState === 'error' ? 'error' : persistenceState === 'saving' ? 'warning' : 'success'"
            variant="soft"
            :label="persistenceState === 'saving' ? 'Saving' : persistenceState === 'error' ? 'Storage issue' : 'Saved locally'"
          />
        </div>
        <h1>{{ project.name }}</h1>
      </div>

      <div class="editor-header-actions">
        <div
          v-if="historyPast.length || historyFuture.length"
          class="history-actions"
          aria-label="Session history"
        >
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
        <UButton
          label="New project"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          size="sm"
          @click="openNewProject"
        />
        <UPopover
          v-model:open="agentOpen"
          :content="{ align: 'end', sideOffset: 8 }"
          :ui="{ content: 'w-96 max-w-[calc(100vw-2rem)] p-0' }"
        >
          <UButton
            :label="agentStatusLabel"
            icon="i-lucide-bot"
            :color="agentStatusColor"
            variant="soft"
            size="sm"
          />
          <template #content>
            <WidgetAgentToolsPanel
              :status="webmcpStatus"
              :context="webmcpContext"
              :tool-names="webmcpRegisteredToolNames"
              :error="webmcpError"
            />
          </template>
        </UPopover>
        <UButton
          label="Export"
          icon="i-lucide-download"
          color="primary"
          size="sm"
          @click="openExport"
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

    <section class="workspace" aria-label="Widget editor">
      <section class="canvas-panel" aria-labelledby="canvas-heading">
        <div class="canvas-toolbar">
          <div>
            <h2 id="canvas-heading">Preview</h2>
            <p class="canvas-subtitle">Shape the widget visually across every size.</p>
          </div>
          <div class="canvas-actions">
            <UButton
              label="Widget settings"
              icon="i-lucide-settings-2"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="openWidgetSettings"
            />
            <UButton
              label="Layers"
              icon="i-lucide-layers-2"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="openLayers"
            />
            <UButton
              label="Reference"
              icon="i-lucide-image-plus"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="openReference"
            />
          </div>
        </div>

        <div class="preview-controls">
          <UFormField label="Show" class="preview-view-field">
            <USelect
              :model-value="previewView"
              :items="previewViewOptions"
              value-key="value"
              aria-label="Preview sizes"
              @update:model-value="value => previewView = value as WidgetSize | 'all'"
            />
          </UFormField>
          <div class="scope-readout">
            <span>Edits affect</span>
            <UBadge color="primary" variant="soft" :label="scopeLabel" />
          </div>
        </div>

        <UAlert
          v-if="lastResult && !lastResult.ok"
          class="operation-result"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="lastResult.code"
          :description="lastResult.message"
        />

        <div class="preview-scroll">
          <div
            class="preview-grid"
            :class="{ 'preview-grid-single': visiblePreviewSizes.length === 1 }"
          >
            <WidgetPreview
              v-for="size in visiblePreviewSizes"
              :key="size"
              :project="project"
              :size="size"
              @select="selectElement"
            />
          </div>
        </div>
      </section>
    </section>

    <USlideover
      v-model:open="projectsOpen"
      side="left"
      title="Projects"
      description="Switch between projects saved in this browser."
      :ui="{ content: 'sm:max-w-sm', body: 'p-0 sm:p-0' }"
    >
      <template #body>
        <WidgetProjectList
          class="slideover-projects"
          :projects="projects"
          :active-project-id="project.id"
          :is-loading="isLoading"
          :persistence-state="persistenceState"
          @create="openNewProject"
          @open="selectProject"
          @rename="openRenameProject"
          @duplicate="duplicateSelectedProject"
          @delete="openDeleteProject"
        />
      </template>
    </USlideover>

    <USlideover
      v-model:open="layersOpen"
      side="left"
      title="Layers"
      description="Select an element to edit it."
      :ui="{ content: 'sm:max-w-sm' }"
    >
      <template #body>
        <div class="layers-drawer">
          <UFormField label="Preview size">
            <USelect
              class="w-full"
              :model-value="structureSize"
              :items="structureSizeOptions"
              value-key="value"
              aria-label="Layer preview size"
              @update:model-value="value => structureSize = value as WidgetSize"
            />
          </UFormField>

          <ul class="structure-tree">
            <WidgetStructureTree
              :element="project.layouts[structureSize].root"
              :size="structureSize"
              :selection="project.selection"
              @select="selectElement"
            />
          </ul>
        </div>
      </template>
    </USlideover>

    <USlideover
      v-model:open="settingsOpen"
      title="Widget settings"
      description="Set the surface and size scope for this widget."
      :ui="{ content: 'sm:max-w-md', body: 'p-0 sm:p-0' }"
    >
      <template #body>
        <WidgetInspector
          class="slideover-inspector"
          mode="widget"
          embedded
          :project="project"
          :selection="null"
          @operation="commitOperation"
        />
      </template>
    </USlideover>

    <USlideover
      v-model:open="referenceOpen"
      title="Reference"
      description="Keep a local visual direction nearby while you design."
      :ui="{ content: 'sm:max-w-md' }"
    >
      <template #body>
        <section class="drawer-section reference-panel" aria-labelledby="reference-heading">
          <div class="drawer-intro">
            <UIcon name="i-lucide-image-plus" aria-hidden="true" />
            <h2 id="reference-heading">Reference image</h2>
            <p>Optional. The file stays in this browser.</p>
          </div>

          <UFormField label="Add an image">
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
        </section>
      </template>
    </USlideover>

    <USlideover
      v-model:open="exportOpen"
      title="Export widget"
      description="One standalone Scriptable file for all three sizes."
      :ui="{ content: 'sm:max-w-md' }"
    >
      <template #body>
        <section class="drawer-section export-panel" aria-labelledby="export-heading">
          <div class="export-status-row">
            <span>Export status</span>
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
            title="Ready with review notes"
            :description="warningDescription"
          />

          <p class="export-note">
            {{ generatedSource.length.toLocaleString() }} characters. The preview, copy, and download use the same generated source.
          </p>
        </section>
      </template>
      <template #footer>
        <div class="export-actions">
          <UButton
            label="Download .js"
            icon="i-lucide-download"
            color="primary"
            :disabled="!exportReady"
            @click="downloadAndClose"
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
            label="View source"
            icon="i-lucide-code-2"
            color="neutral"
            variant="outline"
            :disabled="!exportReady"
            @click="openSourceViewer"
          />
        </div>
      </template>
    </USlideover>

    <USlideover
      v-if="project.selection"
      v-model:open="inspectorOpen"
      :title="selectedElementTitle"
      description="Edit the selected element and choose where changes apply."
      :ui="{ content: 'sm:max-w-md', body: 'p-0 sm:p-0' }"
    >
      <template #body>
        <WidgetInspector
          class="slideover-inspector"
          embedded
          :project="project"
          :selection="project.selection"
          @operation="commitOperation"
        />
      </template>
      <template #footer>
        <UButton
          label="Clear selection"
          icon="i-lucide-x"
          color="neutral"
          variant="outline"
          block
          @click="clearSelection"
        />
      </template>
    </USlideover>

    <UModal
      v-model:open="newProjectOpen"
      title="Create a local project"
      description="Start with a neutral widget, then shape it in the editor."
    >
      <template #body>
        <UFormField label="Project name">
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
            label="Create project"
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

    <UModal
      v-model:open="agentConfirmationOpen"
      :title="agentConfirmation?.title"
      description="Widgetr will not apply this agent-requested change until you confirm it."
    >
      <template #body>
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-shield-alert"
          title="A destructive change needs your approval"
          :description="agentConfirmation?.description"
        />
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="finishAgentConfirmation(false)"
          />
          <UButton
            :label="agentConfirmation?.actionLabel ?? 'Confirm change'"
            color="error"
            @click="finishAgentConfirmation(true)"
          />
        </div>
      </template>
    </UModal>
    </template>
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
  padding: 0.25rem 0 1.25rem;
}

.editor-context {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  color: var(--ui-text-muted);
}

.editor-context-divider {
  color: var(--ui-text-dimmed);
}

.editor-title-block h1 {
  max-width: 32ch;
  margin-top: 0.45rem;
  color: var(--ui-text-highlighted);
  font-size: clamp(1.55rem, 3vw, 2.35rem);
  font-weight: 750;
  letter-spacing: -0.055em;
  line-height: 1;
  overflow-wrap: anywhere;
}

.editor-header-actions,
.history-actions,
.canvas-actions,
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

.workspace {
  min-height: calc(100vh - 8rem);
  overflow: hidden;
  border: 1px solid var(--ui-border-muted);
  border-radius: 1rem;
  background: var(--ui-bg);
  box-shadow: 0 20px 70px rgb(23 32 51 / 8%);
}

.canvas-panel {
  display: grid;
  align-content: start;
  min-width: 0;
}

.canvas-toolbar,
.preview-controls {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.canvas-toolbar {
  padding: 1.5rem;
  border-bottom: 1px solid var(--ui-border-muted);
}

.canvas-toolbar h2 {
  color: var(--ui-text-highlighted);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.canvas-subtitle {
  margin-top: 0.35rem;
  color: var(--ui-text-muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.canvas-actions {
  justify-content: flex-end;
}

.preview-controls {
  align-items: flex-end;
  padding: 1.25rem 1.5rem 0;
}

.preview-view-field {
  width: 11rem;
}

.scope-readout {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  color: var(--ui-text-muted);
  font-size: 0.72rem;
  white-space: nowrap;
}

.operation-result {
  margin: 1rem 1.5rem 0;
}

.preview-scroll {
  min-width: 0;
  margin: 0;
  padding: 1.5rem;
  overflow-x: auto;
}

.preview-grid {
  display: grid;
  grid-template-columns: 158px 338px 338px;
  gap: 1.25rem;
  width: max-content;
  align-items: start;
}

.preview-grid-single {
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  justify-items: center;
}

.layers-drawer {
  display: grid;
  align-content: start;
  gap: 1rem;
  padding: 1.25rem;
}

.structure-tree {
  margin: 0;
  padding: 0;
  list-style: none;
}

.drawer-section {
  display: grid;
  align-content: start;
  gap: 1rem;
  padding: 1.25rem;
}

.drawer-intro {
  display: grid;
  gap: 0.35rem;
}

.drawer-intro > .i-lucide-image-plus {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--widgetr-cobalt);
}

.drawer-intro h2 {
  color: var(--ui-text-highlighted);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.drawer-intro p {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  line-height: 1.5;
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
  color: var(--ui-text-muted);
  font-family: var(--font-mono);
  font-size: 0.58rem;
}

.export-panel {
  gap: 1rem;
}

.export-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}

.export-note {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.72rem;
  line-height: 1.5;
}

.export-actions {
  align-items: stretch;
}

.export-code :deep(textarea) {
  min-height: 34rem;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  line-height: 1.5;
  white-space: pre;
}

.modal-copy {
  color: var(--ui-text-toned);
  font-size: 0.9rem;
  line-height: 1.55;
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
    width: 100%;
    justify-content: space-between;
  }

  .canvas-toolbar {
    flex-direction: column;
  }

  .canvas-actions {
    justify-content: flex-start;
  }

  .preview-controls {
    align-items: flex-start;
    flex-direction: column;
  }

  .preview-view-field {
    width: min(100%, 18rem);
  }

  .scope-readout {
    justify-content: flex-start;
  }

  .preview-scroll {
    padding: 1rem;
  }

  .operation-result {
    margin-right: 1rem;
    margin-left: 1rem;
  }
}

@media (max-width: 30rem) {
  .editor-shell {
    padding: 0.75rem;
  }

  .editor-header-actions {
    align-items: stretch;
  }

  .history-actions {
    order: 2;
  }

  .editor-header-actions > :last-child {
    order: 1;
  }

  .canvas-toolbar,
  .preview-controls {
    padding-right: 1rem;
    padding-left: 1rem;
  }

  .canvas-actions {
    width: 100%;
  }

  .canvas-actions > :deep(button) {
    flex: 1 1 auto;
  }

  .preview-view-field {
    width: 100%;
  }
}
</style>
