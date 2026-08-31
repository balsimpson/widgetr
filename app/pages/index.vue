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
  DesignScope,
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
const previewView = ref<WidgetSize | 'all'>('medium')
const previewVisibility = ref<Record<WidgetSize, boolean>>({
  small: true,
  medium: true,
  large: true
})
const sourceOpen = ref(false)
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')

type NavigationMode = 'projects' | 'layers' | 'reference'

const navigationModes: Array<{ label: string, value: NavigationMode, icon: string }> = [
  { label: 'Projects', value: 'projects', icon: 'i-lucide-folder-kanban' },
  { label: 'Layers', value: 'layers', icon: 'i-lucide-layers-2' },
  { label: 'Reference', value: 'reference', icon: 'i-lucide-image-plus' }
]

const navigationMode = ref<NavigationMode>('projects')
const compactActionsOpen = ref(false)
const visibilityOpen = ref(false)
const isSheetViewport = ref(false)
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

const scopeControlLabel = computed(() => {
  if (activeSizes.value.length === 1) {
    return 'This size'
  }
  if (activeSizes.value.length === WIDGET_SIZES.length) {
    return 'All sizes'
  }
  return 'Selected sizes'
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

const visiblePreviewSizes = computed(() => (
  previewView.value === 'all'
    ? WIDGET_SIZES.filter(size => previewVisibility.value[size])
    : [previewView.value]
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

const selectedElement = computed(() => {
  const selection = project.value.selection
  if (!selection) {
    return null
  }
  return findWidgetElement(project.value.layouts[selection.size].root, selection.elementId)
})

const selectedElementType = computed(() => selectedElement.value?.type ?? 'element')
const selectedElementVisible = computed(() => selectedElement.value?.visible ?? true)
const selectedSizeLabel = computed(() => {
  const size = project.value.selection?.size
    ?? (previewView.value === 'all' ? structureSize.value : previewView.value)
  return size[0]!.toUpperCase() + size.slice(1)
})

const hasChangeReceipt = computed(() => Boolean(
  lastResult.value?.ok && lastResult.value.changedSizes.length > 0
))

const changeReceiptMessage = computed(() => (
  hasChangeReceipt.value && lastResult.value?.ok
    ? lastResult.value.message
    : null
))

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
      return 'Ready for your assistant'
    case 'registering':
      return 'Preparing assistant tools'
    case 'error':
      return 'Assistant tools unavailable'
    default:
      return 'Assistant unavailable'
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
  previewView.value = selection.size

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
  compactActionsOpen.value = false
  visibilityOpen.value = false
}

function selectNavigationMode(mode: NavigationMode): void {
  navigationMode.value = mode
  if (!isSheetViewport.value) {
    closeContextualSurfaces()
    return
  }

  closeContextualSurfaces()
  if (mode === 'projects') {
    projectsOpen.value = true
  } else if (mode === 'layers') {
    layersOpen.value = true
  } else {
    referenceOpen.value = true
  }
}

function openProjects(): void {
  selectNavigationMode('projects')
}

function openLayers(): void {
  selectNavigationMode('layers')
}

function openWidgetSettings(): void {
  closeContextualSurfaces()
  if (isSheetViewport.value) {
    settingsOpen.value = true
    return
  }
  clearSelection()
}

function openReference(): void {
  selectNavigationMode('reference')
}

function openExport(): void {
  closeContextualSurfaces()
  exportOpen.value = true
}

function focusPreview(size: WidgetSize): void {
  structureSize.value = size
  previewView.value = size

  const currentSelection = project.value.selection
  if (!currentSelection || currentSelection.size === size) {
    return
  }

  const matchingElement = findWidgetElement(project.value.layouts[size].root, currentSelection.elementId)
  if (!matchingElement) {
    clearSelection()
    return
  }

  commitOperation({
    type: 'set-selection',
    expectedRevision: project.value.revision,
    selection: {
      size,
      elementId: currentSelection.elementId
    }
  }, { recordHistory: false })
}

function setPreviewView(value: WidgetSize | 'all'): void {
  previewView.value = value
  if (value !== 'all') {
    structureSize.value = value
  }
}

function showAllSizes(): void {
  setPreviewView('all')
  visibilityOpen.value = false
}

function setVisibility(size: WidgetSize, visible: boolean): void {
  const next = { ...previewVisibility.value, [size]: visible }
  if (!Object.values(next).some(Boolean)) {
    return
  }
  previewVisibility.value = next
}

function handleVisibilityChange(size: WidgetSize, event: Event): void {
  const target = event.target
  if (target instanceof HTMLInputElement) {
    setVisibility(size, target.checked)
  }
}

function setDesignScope(scope: DesignScope): void {
  commitOperation({
    type: 'set-design-scope',
    expectedRevision: project.value.revision,
    scope
  })
}

function setFocusedScope(): void {
  const size = previewView.value === 'all' ? structureSize.value : previewView.value
  setDesignScope({ kind: 'one', size })
}

function setAllScope(): void {
  setDesignScope({ kind: 'all' })
}

function toggleSelectedVisibility(): void {
  const selection = project.value.selection
  if (!selection || !selectedElement.value) {
    return
  }
  commitOperation({
    type: 'update-element-content',
    expectedRevision: project.value.revision,
    elementId: selection.elementId,
    patch: { visible: !selectedElementVisible.value }
  })
}

function enterSelectedGroup(): void {
  const selection = project.value.selection
  const element = selectedElement.value
  const child = element && (element.type === 'group' || element.type === 'repeat')
    ? element.children[0]
    : null
  if (!selection || !child) {
    return
  }
  selectElement({ size: selection.size, elementId: child.id })
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
  if (isNarrow) {
    previewView.value = 'medium'
  }
}

function syncSheetViewport(): void {
  isSheetViewport.value = window.matchMedia('(max-width: 56.25rem)').matches
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

function handleKeydown(event: KeyboardEvent): void {
  if (isEditableTarget(event.target)) {
    return
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) {
      redo()
    } else {
      undo()
    }
    return
  }

  if (event.key === 'Escape') {
    if (projectsOpen.value || layersOpen.value || settingsOpen.value || referenceOpen.value || exportOpen.value || agentOpen.value || visibilityOpen.value) {
      closeContextualSurfaces()
      return
    }
    if (project.value.selection) {
      clearSelection()
    }
  }
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
  syncSheetViewport()
  window.addEventListener('resize', syncSheetViewport)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  previewMediaQuery?.removeEventListener('change', syncPreviewView)
  window.removeEventListener('resize', syncSheetViewport)
  window.removeEventListener('keydown', handleKeydown)
  if (referenceUrl.value) {
    URL.revokeObjectURL(referenceUrl.value)
  }
})
</script>

<template>
  <main class="studio-shell" :class="{ 'studio-shell-starter': showStarter }">
    <WidgetProjectStarter
      v-if="showStarter"
      :is-loading="isLoading"
      :persistence-error="persistenceError"
      :disabled="starterBusy"
      @start="startFromStarter"
    />

    <template v-else>
      <header class="studio-topbar">
        <div class="topbar-leading">
          <UButton
            label="Projects"
            icon="i-lucide-panels-top-left"
            color="neutral"
            variant="ghost"
            size="sm"
            class="topbar-projects-trigger"
            @click="openProjects"
          />
          <span class="topbar-divider" aria-hidden="true" />
          <div class="project-identity">
            <span class="wordmark">Widgetr</span>
            <span class="project-name" :title="project.name">{{ project.name }}</span>
          </div>
        </div>

        <div class="topbar-center">
          <div class="size-controls" role="group" aria-label="Widget sizes">
            <UButton
              v-for="size in WIDGET_SIZES"
              :key="size"
              :label="size[0]!.toUpperCase() + size.slice(1)"
              color="neutral"
              variant="ghost"
              size="sm"
              class="size-control"
              :class="{ 'size-control-active': previewView === size }"
              :aria-pressed="previewView === size"
              @click="focusPreview(size)"
            />
            <UPopover v-model:open="visibilityOpen" :content="{ align: 'center', sideOffset: 8 }">
              <UButton
                label="Visibility"
                icon="i-lucide-sliders-horizontal"
                color="neutral"
                variant="soft"
                size="sm"
                class="visibility-control"
              />
              <template #content>
                <div class="visibility-popover">
                  <div class="visibility-popover-heading">
                    <strong>Visible in all-sizes view</strong>
                    <span>Hidden sizes remain available above.</span>
                  </div>
                  <label v-for="size in WIDGET_SIZES" :key="size" class="visibility-row">
                    <input
                      type="checkbox"
                      :checked="previewVisibility[size]"
                      @change="handleVisibilityChange(size, $event)"
                    >
                    <span>{{ size[0]!.toUpperCase() + size.slice(1) }}</span>
                  </label>
                  <UButton
                    label="Show all sizes"
                    icon="i-lucide-layout-grid"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    block
                    @click="showAllSizes"
                  />
                </div>
              </template>
            </UPopover>
          </div>
          <span class="scope-summary" :title="`Changes currently apply to ${scopeLabel.toLowerCase()}`">
            <UIcon name="i-lucide-target" aria-hidden="true" />
            {{ scopeControlLabel }}
          </span>
        </div>

        <div class="topbar-trailing">
          <div class="history-actions" aria-label="Session history">
          <UButton
            icon="i-lucide-undo-2"
            color="neutral"
            variant="ghost"
            :disabled="historyPast.length === 0"
            aria-label="Undo"
            @click="undo"
          />
          <UButton
            icon="i-lucide-redo-2"
            color="neutral"
            variant="ghost"
            :disabled="historyFuture.length === 0"
            aria-label="Redo"
            @click="redo"
          />
          </div>
          <UButton
            label="New project"
            icon="i-lucide-plus"
            color="neutral"
            variant="ghost"
            size="sm"
            class="topbar-new-project"
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
              class="assistant-status-button"
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
          <UPopover
            v-model:open="compactActionsOpen"
            :content="{ align: 'end', sideOffset: 8 }"
            :ui="{ content: 'w-64 max-w-[calc(100vw-2rem)] p-2' }"
            class="compact-actions"
          >
            <UButton
              icon="i-lucide-ellipsis"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="More actions"
            />
            <template #content>
              <div class="compact-actions-menu">
                <UButton label="New project" icon="i-lucide-plus" color="neutral" variant="ghost" block @click="openNewProject" />
                <UButton label="Widget settings" icon="i-lucide-settings-2" color="neutral" variant="ghost" block @click="openWidgetSettings" />
                <UButton label="Layers" icon="i-lucide-layers-2" color="neutral" variant="ghost" block @click="openLayers" />
                <UButton label="Reference" icon="i-lucide-image-plus" color="neutral" variant="ghost" block @click="openReference" />
              </div>
            </template>
          </UPopover>
          <UButton
            label="Export"
            icon="i-lucide-download"
            color="primary"
            size="sm"
            class="topbar-export"
            @click="openExport"
          />
        </div>
      </header>

      <UAlert
        v-if="persistenceError"
        class="studio-alert"
        color="error"
        variant="subtle"
        icon="i-lucide-database-zap"
        title="Browser storage needs attention"
        :description="`${persistenceError} The current session remains available, but it may not survive a refresh.`"
      />

      <section class="studio-workspace" aria-label="Widget editor">
        <aside class="studio-navigation" aria-label="Workspace navigation">
          <div class="navigation-brand">
            <span class="navigation-mark" aria-hidden="true"><UIcon name="i-lucide-panels-top-left" /></span>
            <span class="navigation-brand-name">Studio</span>
          </div>
          <nav class="navigation-modes" aria-label="Document views">
            <button
              v-for="mode in navigationModes"
              :key="mode.value"
              type="button"
              class="navigation-mode"
              :class="{ active: navigationMode === mode.value }"
              :aria-pressed="navigationMode === mode.value"
              :aria-label="mode.label"
              :title="mode.label"
              @click="selectNavigationMode(mode.value)"
            >
              <UIcon :name="mode.icon" aria-hidden="true" />
              <span>{{ mode.label }}</span>
            </button>
          </nav>

          <div class="navigation-body">
            <WidgetProjectList
              v-if="navigationMode === 'projects'"
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

            <section v-else-if="navigationMode === 'layers'" class="navigation-section" aria-labelledby="layers-panel-heading">
              <div class="navigation-section-heading">
                <div>
                  <span class="panel-kicker">OUTLINE</span>
                  <h2 id="layers-panel-heading">Layers</h2>
                </div>
                <span class="panel-count">{{ structureSize }}</span>
              </div>
              <UFormField label="Preview size">
                <USelect
                  class="w-full"
                  :model-value="structureSize"
                  :items="structureSizeOptions"
                  value-key="value"
                  aria-label="Layer preview size"
                  @update:model-value="value => focusPreview(value as WidgetSize)"
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
            </section>

            <section v-else class="navigation-section reference-panel" aria-labelledby="reference-panel-heading">
              <div class="navigation-section-heading">
                <div>
                  <span class="panel-kicker">LOCAL ASSET</span>
                  <h2 id="reference-panel-heading">Reference</h2>
                </div>
                <UIcon name="i-lucide-image-plus" aria-hidden="true" />
              </div>
              <p class="navigation-copy">Keep a visual direction nearby while you design. The file stays in this browser.</p>
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
                <img :src="referenceUrl" :alt="`Local reference for ${project.name}`">
                <div class="reference-meta">
                  <span>{{ activeProject.localReference.fileName }}</span>
                  <span>{{ activeProject.localReference.width }} × {{ activeProject.localReference.height }}</span>
                </div>
                <UButton label="Remove reference" icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click="removeReference" />
              </div>
            </section>
          </div>

          <div class="navigation-footer">
            <span>Local workspace</span>
            <UBadge
              :color="persistenceState === 'error' ? 'error' : persistenceState === 'saving' ? 'warning' : 'success'"
              variant="soft"
              :label="persistenceState === 'saving' ? 'Saving' : persistenceState === 'error' ? 'Needs attention' : 'Saved'"
            />
          </div>
        </aside>

        <section class="canvas-panel" aria-labelledby="canvas-heading">
          <div class="canvas-toolbar">
            <div>
              <span class="panel-kicker">LIVE DOCUMENT</span>
              <h2 id="canvas-heading">Canvas</h2>
              <p class="canvas-subtitle">The preview is the document. Select an element to edit it.</p>
            </div>
            <div class="canvas-actions">
              <UButton label="Widget settings" icon="i-lucide-settings-2" color="neutral" variant="ghost" size="sm" @click="openWidgetSettings" />
              <UButton label="Layers" icon="i-lucide-layers-2" color="neutral" variant="ghost" size="sm" @click="openLayers" />
              <UButton label="Reference" icon="i-lucide-image-plus" color="neutral" variant="ghost" size="sm" @click="openReference" />
            </div>
          </div>

          <div class="canvas-stage">
            <div class="stage-toolbar">
              <div class="stage-view-label">
                <UIcon name="i-lucide-scan" aria-hidden="true" />
                <span>{{ previewView === 'all' ? 'All sizes' : `${selectedSizeLabel} focused` }}</span>
              </div>
              <span class="stage-size-note">{{ visiblePreviewSizes.length }} visible output{{ visiblePreviewSizes.length === 1 ? '' : 's' }}</span>
            </div>

            <div v-if="project.selection" class="selection-context" aria-live="polite">
              <div class="selection-context-copy">
                <span class="selection-label">Selection</span>
                <strong>{{ selectedElementTitle }}</strong>
                <span>{{ selectedSizeLabel }} · {{ selectedElementType }}</span>
              </div>
              <div class="selection-actions">
                <UButton label="Open inspector" icon="i-lucide-panel-right" color="neutral" variant="soft" size="sm" @click="inspectorOpen = true" />
                <UButton :label="selectedElementVisible ? 'Hide' : 'Show'" :icon="selectedElementVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'" color="neutral" variant="ghost" size="sm" @click="toggleSelectedVisibility" />
                <UPopover :content="{ align: 'end', sideOffset: 8 }">
                  <UButton label="Scope" icon="i-lucide-target" color="neutral" variant="ghost" size="sm" />
                  <template #content>
                    <div class="scope-popover">
                      <span class="panel-kicker">APPLY CHANGES TO</span>
                      <UButton label="This size" :variant="activeSizes.length === 1 ? 'soft' : 'ghost'" color="primary" block @click="setFocusedScope" />
                      <UButton label="All sizes" :variant="activeSizes.length === WIDGET_SIZES.length ? 'soft' : 'ghost'" color="primary" block @click="setAllScope" />
                      <span v-if="activeSizes.length === 2" class="scope-popover-note">Selected sizes: {{ scopeLabel }}</span>
                    </div>
                  </template>
                </UPopover>
                <UButton v-if="selectedElement && (selectedElement.type === 'group' || selectedElement.type === 'repeat')" label="Enter group" icon="i-lucide-corner-down-right" color="neutral" variant="ghost" size="sm" @click="enterSelectedGroup" />
                <UButton label="Clear" icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="clearSelection" />
              </div>
            </div>

            <UAlert
              v-if="lastResult && !lastResult.ok"
              class="operation-result"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :title="lastResult.code === 'STALE_REVISION' ? 'That change was based on an older version' : 'Change not applied'"
              :description="lastResult.message"
            />

            <div v-if="changeReceiptMessage" class="change-receipt" aria-live="polite">
              <span class="receipt-icon"><UIcon name="i-lucide-check" aria-hidden="true" /></span>
              <span class="receipt-copy">{{ changeReceiptMessage }}</span>
              <UButton v-if="historyPast.length" label="Undo" color="neutral" variant="ghost" size="xs" @click="undo" />
            </div>

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
          </div>

          <footer class="canvas-footer">
            <span class="assistant-inline-status" :class="`assistant-inline-status-${webmcpStatus}`" aria-live="polite">
              <span class="status-dot" aria-hidden="true" />
              {{ agentStatusLabel }}
            </span>
            <span class="canvas-footer-separator" aria-hidden="true" />
            <span>{{ persistenceState === 'saving' ? 'Saving locally…' : persistenceState === 'error' ? 'Could not save locally' : 'Saved locally' }}</span>
            <span class="canvas-footer-scope">{{ scopeControlLabel }} · {{ scopeLabel }}</span>
          </footer>
        </section>

        <aside class="studio-inspector" aria-label="Inspector">
          <div class="inspector-shell-heading">
            <div>
              <span class="panel-kicker">INSPECTOR</span>
              <h2 id="studio-inspector-heading">{{ project.selection ? selectedElementTitle : 'Widget settings' }}</h2>
              <p>{{ project.selection ? 'Edit the selected object.' : 'Set the surface and size scope.' }}</p>
            </div>
            <UBadge
              :color="project.selection ? 'primary' : 'neutral'"
              variant="soft"
              :label="project.selection ? selectedSizeLabel : 'Project'"
            />
          </div>
          <div v-if="project.selection" class="inspector-breadcrumb" aria-label="Selection path">
            <span>Canvas</span>
            <UIcon name="i-lucide-chevron-right" aria-hidden="true" />
            <strong>{{ selectedElementTitle }}</strong>
          </div>
          <WidgetInspector
            class="studio-inspector-content"
            :mode="project.selection ? 'element' : 'widget'"
            embedded
            :project="project"
            :selection="project.selection"
            :focused-size="previewView === 'all' ? structureSize : previewView"
            @operation="commitOperation"
          />
        </aside>
      </section>
    </template>

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
          :focused-size="previewView === 'all' ? structureSize : previewView"
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
      v-if="project.selection && isSheetViewport"
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
  </main>
</template>

<style scoped>
.studio-shell {
  display: flex;
  width: 100%;
  height: 100vh;
  min-height: 100dvh;
  flex-direction: column;
  overflow: hidden;
  background: var(--widgetr-app);
  color: var(--widgetr-ink);
}

.studio-shell-starter {
  overflow: auto;
}

.studio-topbar {
  display: grid;
  min-height: var(--widgetr-topbar-height);
  grid-template-columns: minmax(13rem, 1fr) auto minmax(18rem, 1fr);
  align-items: center;
  gap: 1rem;
  padding: 0 max(1rem, env(safe-area-inset-right)) 0 max(1rem, env(safe-area-inset-left));
  border-bottom: 1px solid var(--widgetr-border);
  background: var(--widgetr-pane);
  backdrop-filter: blur(18px) saturate(1.15);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
  z-index: 10;
}

.topbar-leading,
.topbar-center,
.topbar-trailing,
.project-identity,
.size-controls,
.scope-summary,
.history-actions,
.canvas-actions,
.selection-actions,
.canvas-footer,
.stage-toolbar,
.stage-view-label,
.assistant-inline-status,
.navigation-section-heading,
.inspector-breadcrumb,
.export-actions,
.modal-actions {
  display: flex;
  align-items: center;
}

.topbar-leading,
.topbar-center,
.topbar-trailing {
  min-width: 0;
  gap: 0.5rem;
}

.topbar-leading {
  overflow: hidden;
}

.topbar-center {
  justify-content: center;
}

.topbar-trailing {
  justify-content: flex-end;
}

.topbar-divider {
  width: 1px;
  height: 1.25rem;
  flex: 0 0 auto;
  background: var(--widgetr-border);
}

.project-identity {
  min-width: 0;
  gap: 0.65rem;
}

.wordmark {
  color: var(--widgetr-ink);
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.project-name {
  min-width: 0;
  overflow: hidden;
  color: var(--widgetr-muted);
  font-size: 0.78rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.size-controls {
  gap: 0.15rem;
  padding: 0.15rem;
  border: 1px solid var(--widgetr-border);
  border-radius: 0.65rem;
  background: color-mix(in srgb, var(--widgetr-pane-solid) 58%, transparent);
}

.size-control {
  min-width: 3.8rem;
}

.size-control-active {
  background: var(--widgetr-accent) !important;
  color: white !important;
  box-shadow: 0 1px 2px rgb(29 29 31 / 18%);
}

.visibility-control {
  margin-left: 0.15rem;
  border-left: 1px solid var(--widgetr-border);
  border-radius: 0 0.5rem 0.5rem 0;
}

.scope-summary {
  gap: 0.35rem;
  padding-left: 0.35rem;
  color: var(--widgetr-muted);
  font-size: 0.69rem;
  white-space: nowrap;
}

.scope-summary .i-lucide-target {
  width: 0.85rem;
  height: 0.85rem;
  color: var(--widgetr-accent);
}

.history-actions {
  gap: 0.1rem;
  padding-right: 0.2rem;
  border-right: 1px solid var(--widgetr-border);
}

.assistant-status-button {
  max-width: 12rem;
}

.compact-actions {
  display: none;
}

.compact-actions-menu,
.visibility-popover,
.scope-popover {
  display: grid;
  gap: 0.35rem;
  padding: 0.65rem;
}

.visibility-popover {
  min-width: 14rem;
}

.visibility-popover-heading {
  display: grid;
  gap: 0.15rem;
  padding: 0.2rem 0.25rem 0.45rem;
  border-bottom: 1px solid var(--widgetr-border);
}

.visibility-popover-heading strong,
.scope-popover-note {
  color: var(--widgetr-ink);
  font-size: 0.72rem;
  font-weight: 600;
}

.visibility-popover-heading span,
.scope-popover-note {
  color: var(--widgetr-muted);
  font-size: 0.65rem;
  line-height: 1.4;
}

.visibility-row {
  display: flex;
  min-height: var(--widgetr-touch-target);
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.25rem;
  color: var(--widgetr-ink);
  font-size: 0.75rem;
}

.visibility-row input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--widgetr-accent);
}

.studio-alert {
  margin: 0.65rem 1rem 0;
  flex: 0 0 auto;
}

.studio-workspace {
  display: grid;
  min-height: 0;
  flex: 1 1 auto;
  grid-template-columns: var(--widgetr-pane-width) minmax(0, 1fr) var(--widgetr-inspector-width);
  overflow: hidden;
}

.studio-navigation,
.studio-inspector {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--widgetr-pane);
}

.studio-navigation {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  border-right: 1px solid var(--widgetr-border);
}

.studio-inspector {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  border-left: 1px solid var(--widgetr-border);
}

.navigation-brand {
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  gap: 0.6rem;
  padding: 0 1rem;
  border-bottom: 1px solid var(--widgetr-border);
}

.navigation-mark {
  display: grid;
  width: 1.65rem;
  height: 1.65rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--widgetr-accent) 32%, var(--widgetr-border));
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--widgetr-accent) 12%, transparent);
  color: var(--widgetr-accent);
}

.navigation-mark .i-lucide-panels-top-left {
  width: 0.9rem;
  height: 0.9rem;
}

.navigation-brand-name {
  color: var(--widgetr-ink);
  font-size: 0.78rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.navigation-modes {
  display: grid;
  gap: 0.15rem;
  padding: 0.65rem;
  border-bottom: 1px solid var(--widgetr-border);
}

.navigation-mode {
  display: flex;
  min-height: 2.2rem;
  align-items: center;
  gap: 0.65rem;
  padding: 0 0.7rem;
  border-radius: var(--widgetr-radius-control);
  color: var(--widgetr-muted);
  font-size: 0.76rem;
  font-weight: 550;
  text-align: left;
  transition: background-color 120ms ease-out, color 120ms ease-out;
}

.navigation-mode:hover {
  background: color-mix(in srgb, var(--widgetr-ink) 6%, transparent);
  color: var(--widgetr-ink);
}

.navigation-mode.active {
  background: color-mix(in srgb, var(--widgetr-accent) 13%, transparent);
  color: var(--widgetr-accent-strong);
}

.navigation-mode .i-lucide,
.navigation-mode > span:first-of-type {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
}

.navigation-body {
  min-height: 0;
  overflow-y: auto;
}

.navigation-footer {
  display: flex;
  min-height: 3rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0 0.9rem;
  border-top: 1px solid var(--widgetr-border);
  color: var(--widgetr-muted);
  font-size: 0.65rem;
}

.navigation-section {
  display: grid;
  align-content: start;
  gap: 0.9rem;
  padding: 1rem;
}

.navigation-section-heading {
  justify-content: space-between;
  gap: 0.75rem;
}

.navigation-section-heading h2,
.inspector-shell-heading h2 {
  margin: 0.2rem 0 0;
  color: var(--widgetr-ink);
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: -0.025em;
}

.navigation-section-heading > .i-lucide-image-plus {
  width: 1rem;
  height: 1rem;
  color: var(--widgetr-accent);
}

.panel-kicker {
  color: var(--widgetr-muted);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  font-weight: 600;
  letter-spacing: 0.11em;
  line-height: 1;
  text-transform: uppercase;
}

.panel-count {
  color: var(--widgetr-muted);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  text-transform: uppercase;
}

.navigation-copy {
  margin: 0;
  color: var(--widgetr-muted);
  font-size: 0.72rem;
  line-height: 1.5;
}

.canvas-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  background: var(--widgetr-stage);
}

.canvas-toolbar {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem 1.35rem 1rem;
  border-bottom: 1px solid var(--widgetr-border);
  background: color-mix(in srgb, var(--widgetr-pane) 48%, transparent);
}

.canvas-toolbar h2 {
  margin: 0.25rem 0 0;
  color: var(--widgetr-ink);
  font-size: 1.2rem;
  font-weight: 650;
  letter-spacing: -0.035em;
}

.canvas-subtitle {
  max-width: 42ch;
  margin: 0.35rem 0 0;
  color: var(--widgetr-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.canvas-actions {
  justify-content: flex-end;
  gap: 0.25rem;
}

.canvas-stage {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  margin: 0.85rem;
  overflow: hidden;
  border: 1px solid var(--widgetr-border);
  border-radius: var(--widgetr-radius-stage);
  background: color-mix(in srgb, var(--widgetr-stage) 88%, var(--widgetr-pane-solid));
}

.stage-toolbar {
  min-height: 2.75rem;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0 0.9rem;
  border-bottom: 1px solid var(--widgetr-border);
  color: var(--widgetr-muted);
  font-size: 0.65rem;
}

.stage-view-label {
  gap: 0.4rem;
  color: var(--widgetr-ink);
  font-weight: 600;
}

.stage-view-label .i-lucide-scan {
  width: 0.9rem;
  height: 0.9rem;
  color: var(--widgetr-accent);
}

.stage-size-note {
  color: var(--widgetr-muted);
}

.selection-context {
  display: flex;
  min-height: 3.7rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
  padding: 0.65rem 0.9rem;
  border-bottom: 1px solid color-mix(in srgb, var(--widgetr-accent) 25%, var(--widgetr-border));
  background: color-mix(in srgb, var(--widgetr-accent) 7%, transparent);
}

.selection-context-copy {
  display: grid;
  min-width: 0;
  gap: 0.18rem;
}

.selection-label {
  color: var(--widgetr-accent-strong);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.selection-context-copy strong {
  overflow: hidden;
  color: var(--widgetr-ink);
  font-size: 0.78rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-context-copy > span:last-child {
  color: var(--widgetr-muted);
  font-size: 0.64rem;
  text-transform: capitalize;
}

.selection-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.15rem;
}

.operation-result {
  margin: 0.75rem 0.9rem 0;
}

.change-receipt {
  display: flex;
  min-height: 2.6rem;
  align-items: center;
  gap: 0.55rem;
  margin: 0.7rem 0.9rem 0;
  padding: 0.45rem 0.6rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-success) 28%, var(--widgetr-border));
  border-radius: var(--widgetr-radius-control);
  background: color-mix(in srgb, var(--widgetr-success) 9%, transparent);
  animation: receipt-in 160ms ease-out;
}

.receipt-icon {
  display: grid;
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: var(--widgetr-success);
  color: white;
}

.receipt-icon .i-lucide-check {
  width: 0.8rem;
  height: 0.8rem;
}

.receipt-copy {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  color: var(--widgetr-ink);
  font-size: 0.67rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-scroll {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: clamp(1rem, 4vw, 2.75rem);
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, max-content);
  gap: clamp(1.1rem, 3vw, 2.4rem);
  align-items: start;
  justify-content: center;
  width: max-content;
  min-width: min(100%, 10rem);
}

.preview-grid-single {
  width: 100%;
  justify-items: center;
}

.canvas-footer {
  min-height: 2.5rem;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0 1.35rem;
  border-top: 1px solid var(--widgetr-border);
  color: var(--widgetr-muted);
  font-size: 0.63rem;
}

.canvas-footer-separator {
  width: 1px;
  height: 0.85rem;
  background: var(--widgetr-border);
}

.canvas-footer-scope {
  margin-left: auto;
  color: var(--widgetr-muted);
}

.assistant-inline-status {
  gap: 0.4rem;
  color: var(--widgetr-ink);
  font-weight: 550;
}

.status-dot {
  width: 0.42rem;
  height: 0.42rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--widgetr-muted);
}

.assistant-inline-status-registered .status-dot {
  background: var(--widgetr-success);
}

.assistant-inline-status-registering .status-dot {
  background: var(--widgetr-warning);
  animation: status-pulse 1.4s ease-in-out infinite;
}

.assistant-inline-status-error .status-dot {
  background: var(--widgetr-danger);
}

.inspector-shell-heading {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.2rem 1rem 0.9rem;
  border-bottom: 1px solid var(--widgetr-border);
}

.inspector-shell-heading h2 {
  max-width: 18ch;
  overflow-wrap: anywhere;
}

.inspector-shell-heading p {
  margin: 0.35rem 0 0;
  color: var(--widgetr-muted);
  font-size: 0.68rem;
  line-height: 1.45;
}

.inspector-breadcrumb {
  min-height: 2.2rem;
  gap: 0.35rem;
  padding: 0 1rem;
  border-bottom: 1px solid var(--widgetr-border);
  color: var(--widgetr-muted);
  font-size: 0.64rem;
}

.inspector-breadcrumb .i-lucide-chevron-right {
  width: 0.75rem;
  height: 0.75rem;
}

.inspector-breadcrumb strong {
  overflow: hidden;
  color: var(--widgetr-ink);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-inspector-content {
  min-height: 0;
  overflow-y: auto;
}

.layers-drawer,
.drawer-section {
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

.drawer-intro {
  display: grid;
  gap: 0.35rem;
}

.drawer-intro > .i-lucide-image-plus {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--widgetr-accent);
}

.drawer-intro h2 {
  margin: 0;
  color: var(--widgetr-ink);
  font-size: 0.95rem;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.drawer-intro p,
.export-note,
.modal-copy {
  color: var(--widgetr-muted);
  font-size: 0.72rem;
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
  border: 1px solid var(--widgetr-border);
  border-radius: var(--widgetr-radius-control);
}

.reference-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  overflow-wrap: anywhere;
  color: var(--widgetr-muted);
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
  color: var(--widgetr-muted);
  font-size: 0.75rem;
}

.export-note {
  margin: 0;
}

.export-actions,
.modal-actions {
  flex-wrap: wrap;
  gap: 0.45rem;
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
  margin: 0;
}

@keyframes receipt-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes status-pulse {
  0%,
  100% { opacity: 0.45; }
  50% { opacity: 1; }
}

@media (min-width: 56.25rem) and (max-width: 74.999rem) {
  .studio-topbar {
    grid-template-columns: minmax(9rem, 1fr) auto minmax(12rem, 1fr);
    gap: 0.35rem;
    padding-right: 0.65rem;
    padding-left: 0.65rem;
  }

  .topbar-new-project {
    display: none;
  }

  .compact-actions {
    display: inline-flex;
  }

  .assistant-status-button {
    max-width: 2.5rem;
    overflow: hidden;
    padding-right: 0.45rem;
    padding-left: 0.45rem;
  }

  .assistant-status-button :deep(span:not([class*="icon"])) {
    display: none;
  }

  .project-name {
    max-width: 8rem;
  }

  .topbar-center {
    gap: 0.2rem;
  }

  .size-control {
    min-width: 3.15rem;
    padding-right: 0.45rem;
    padding-left: 0.45rem;
  }

  .visibility-control {
    padding-right: 0.45rem;
    padding-left: 0.45rem;
  }

  .studio-workspace {
    grid-template-columns: var(--widgetr-rail-width) minmax(0, 1fr) var(--widgetr-inspector-min-width);
  }

  .studio-navigation {
    position: relative;
    overflow: visible;
  }

  .navigation-brand {
    justify-content: center;
    padding: 0;
  }

  .navigation-brand-name,
  .navigation-mode > span:last-child {
    display: none;
  }

  .navigation-modes {
    padding: 0.5rem 0.35rem;
  }

  .navigation-mode {
    justify-content: center;
    padding: 0;
  }

  .navigation-body {
    position: absolute;
    top: 0;
    left: var(--widgetr-rail-width);
    z-index: 4;
    width: 17.5rem;
    height: 100%;
    border-right: 1px solid var(--widgetr-border);
    background: var(--widgetr-pane-solid);
    box-shadow: 14px 0 30px rgb(29 29 31 / 10%);
  }

  .navigation-footer {
    display: none;
  }

  .scope-summary {
    display: none;
  }
}

@media (max-width: 56.249rem) {
  .studio-topbar {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: minmax(3.25rem, auto) auto;
    gap: 0.45rem;
    padding: 0.35rem max(0.65rem, env(safe-area-inset-right)) 0.45rem max(0.65rem, env(safe-area-inset-left));
  }

  .studio-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .studio-navigation,
  .studio-inspector {
    display: none;
  }

  .topbar-leading {
    grid-column: 1;
    grid-row: 1;
    gap: 0.35rem;
  }

  .topbar-center {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
    padding: 0 0.15rem 0.1rem;
  }

  .size-controls {
    flex: 0 0 auto;
  }

  .topbar-projects-trigger,
  .size-control,
  .visibility-control,
  .assistant-status-button,
  .topbar-export,
  .compact-actions,
  .history-actions :deep(button),
  .compact-actions :deep(button),
  .canvas-actions :deep(button),
  .selection-actions :deep(button) {
    min-height: var(--widgetr-touch-target);
  }

  .visibility-control,
  .assistant-status-button,
  .history-actions :deep(button),
  .compact-actions,
  .compact-actions :deep(button),
  .topbar-export {
    min-width: var(--widgetr-touch-target);
  }

  .topbar-projects-trigger {
    min-width: 2.5rem;
    padding-right: 0.45rem;
    padding-left: 0.45rem;
  }

  .topbar-divider,
  .wordmark {
    display: none;
  }

  .project-identity {
    gap: 0;
  }

  .size-control {
    min-width: 3.4rem;
  }

  .scope-summary,
  .topbar-new-project {
    display: none;
  }

  .compact-actions {
    display: inline-flex;
  }

  .assistant-status-button {
    max-width: 2.5rem;
    overflow: hidden;
    padding-right: 0.45rem;
    padding-left: 0.45rem;
  }

  .assistant-status-button :deep(span:not([class*="icon"])) {
    display: none;
  }

  .canvas-toolbar {
    align-items: flex-start;
    flex-direction: column;
    padding: 0.95rem 1rem 0.8rem;
  }

  .canvas-actions {
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
  }

  .canvas-stage {
    margin: 0.55rem;
  }

  .selection-context {
    align-items: flex-start;
    flex-direction: column;
  }

  .selection-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .preview-scroll {
    align-items: flex-start;
    padding: 1.25rem 0.8rem 2rem;
  }

  .preview-grid-single {
    min-width: 100%;
  }

  .canvas-footer {
    padding: 0 1rem;
  }

  .canvas-footer-scope {
    width: 100%;
    margin-left: 0;
    padding-bottom: 0.35rem;
  }

  .studio-alert {
    margin-right: 0.6rem;
    margin-left: 0.6rem;
  }
}

@media (max-width: 30rem) {
  .studio-topbar {
    min-height: 3.25rem;
  }

  .topbar-trailing {
    gap: 0.15rem;
  }

  .history-actions {
    padding-right: 0;
    border-right: 0;
  }

  .history-actions :deep(button),
  .compact-actions :deep(button),
  .topbar-export {
    min-width: var(--widgetr-touch-target);
  }

  .topbar-export {
    padding-right: 0.45rem;
    padding-left: 0.45rem;
    font-size: 0;
  }

  .topbar-export :deep(svg) {
    width: 1rem;
    height: 1rem;
  }

  .topbar-center {
    min-width: 0;
  }

  .size-controls {
    max-width: 100%;
  }

  .size-control {
    min-width: 3rem;
    padding-right: 0.45rem;
    padding-left: 0.45rem;
  }

  .size-control :deep(span:not([class*="icon"])) {
    font-size: 0.68rem;
  }

  .visibility-control {
    min-width: var(--widgetr-touch-target);
    padding-right: 0.4rem;
    padding-left: 0.4rem;
    font-size: 0;
  }

  .visibility-control :deep(svg) {
    width: 0.9rem;
    height: 0.9rem;
  }

  .stage-toolbar {
    padding: 0 0.7rem;
  }

  .stage-size-note {
    display: none;
  }

  .canvas-actions :deep(button) {
    min-height: var(--widgetr-touch-target);
  }
}
</style>
