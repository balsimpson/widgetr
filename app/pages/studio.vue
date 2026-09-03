<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { cloneWidgetProject } from '~/domain/widget/clone'
import { isBitcoinDataAdapter } from '~/domain/widget/crypto'
import { applyWidgetOperation } from '~/domain/widget/operations'
import { resolveDesignScope } from '~/domain/widget/schema'
import { getWidgetStarter } from '~/domain/widget/starters'
import {
  createStarterWebMcpToolCatalog,
  createWebMcpToolCatalog
} from '~/domain/widget/webmcp'
import { findWidgetElement, widgetElementLabel } from '~/domain/widget/tree'
import {
  VISUAL_DATA_ELEMENT_OPTIONS,
  createVisualDataElement
} from '~/domain/widget/visual-data'
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
  WidgetSize,
  WidgetElement,
  VisualDataElementType
} from '~/types/widget'
import type { WebMcpConfirmationRequest } from '~/types/webmcp'

const {
  project,
  projects,
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
} = useWidgetProjects()

const route = useRoute()
const router = useRouter()
const requestUrl = useRequestURL()
const canonicalUrl = computed(() => new URL('/studio', requestUrl.origin).toString())

useSeoMeta({
  title: 'Widgetr Studio | Build a Scriptable widget',
  description: 'Design, review, and export your Scriptable widget in Widgetr.',
  ogTitle: 'Widgetr Studio | Build a Scriptable widget',
  ogDescription: 'Design, review, and export your Scriptable widget in Widgetr.',
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  ogSiteName: 'Widgetr',
  twitterCard: 'summary',
  twitterTitle: 'Widgetr Studio | Build a Scriptable widget',
  twitterDescription: 'Design, review, and export your Scriptable widget in Widgetr.'
})

useHead({
  link: [
    {
      rel: 'canonical',
      href: canonicalUrl
    }
  ]
})

const forcedNewProject = computed(() => route.query.new === '1')

function currentStudioUrl(): string {
  if (import.meta.client) {
    return new URL('/studio', window.location.origin).toString()
  }
  return '/studio'
}

function clearForcedNewQuery(): void {
  if (route.query.new !== '1') {
    return
  }

  const query = { ...route.query }
  delete query.new
  void router.replace({ path: '/studio', query })
}

const lastResult = ref<OperationResult | null>(null)
const lastChangeReceiptMessage = ref<string | null>(null)
type HistoryEntry = {
  snapshot: WidgetProject
  message: string
}

const historyPast = ref<HistoryEntry[]>([])
const historyFuture = ref<HistoryEntry[]>([])
const structureSize = ref<WidgetSize>('medium')
const previewView = ref<WidgetSize | 'all'>('medium')
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')

type NavigationMode = 'projects' | 'layers' | 'reference'

const navigationModes: Array<{ label: string, value: NavigationMode, icon: string }> = [
  { label: 'Projects', value: 'projects', icon: 'i-lucide-folder-kanban' },
  { label: 'Layers', value: 'layers', icon: 'i-lucide-layers-2' },
  { label: 'Reference', value: 'reference', icon: 'i-lucide-image-plus' }
]

const navigationMode = ref<NavigationMode>('projects')
const toolsOpen = ref(false)
const projectsOpen = ref(false)
const layersOpen = ref(false)
const settingsOpen = ref(false)
const referenceOpen = ref(false)
const exportOpen = ref(false)
const inspectorWasOpenBeforeExport = ref(false)
const agentOpen = ref(false)
const inspectorPinned = ref(false)
const previewScrollRef = ref<HTMLElement | null>(null)
const canvasPanX = ref(0)
const canvasPanY = ref(0)
const isCanvasPanning = ref(false)
const suppressNextCanvasClick = ref(false)
let panPointerId: number | null = null
let panStartX = 0
let panStartY = 0
let panStartOffsetX = 0
let panStartOffsetY = 0
let panMoved = false

const renameProjectOpen = ref(false)
const renameProjectName = ref('')
const renameTarget = ref<WidgetProject | null>(null)
const deleteProjectOpen = ref(false)
const deleteTarget = ref<WidgetProject | null>(null)
const removeElementOpen = ref(false)
const removeElementTarget = ref<WidgetSelection | null>(null)
const referenceUpload = ref<File | null | undefined>()
const referenceUrl = ref<string | null>(null)
const referenceError = ref<string | null>(null)
const agentConfirmation = ref<WebMcpConfirmationRequest | null>(null)
const starterBusy = ref(false)
const starterModalOpen = ref(false)
const starterModalDismissed = ref(false)
let pendingAgentConfirmation: {
  resolve: (confirmed: boolean) => void
  cleanup: () => void
} | null = null

const activeSizes = computed(() => resolveDesignScope(project.value.designScope))
const showStarter = computed(() => isLoading.value || projects.value.length === 0 || forcedNewProject.value)
const isEmptyStudio = computed(() => isHydrated.value && projects.value.length === 0)
const shouldShowStarterModal = computed(() => isHydrated.value && (projects.value.length === 0 || forcedNewProject.value))
const isCryptoProject = computed(() => isBitcoinDataAdapter(project.value.dataSource.adapter))
const exportResult = computed(() => generateScriptableCode(project.value))
const generatedSource = computed(() => exportResult.value.code ?? '')
const blockingIssues = computed(() => exportResult.value.issues.filter(issue => issue.severity === 'blocking'))
const warningIssues = computed(() => exportResult.value.issues.filter(issue => issue.severity === 'warning'))
const exportReady = computed(() => generatedSource.value.length > 0)
const previewPanStyle = computed(() => ({
  transform: `translate3d(${canvasPanX.value}px, ${canvasPanY.value}px, 0)`
}))

watch(
  shouldShowStarterModal,
  shouldShow => {
    if (shouldShow && !starterModalDismissed.value) {
      starterModalOpen.value = true
    } else if (!shouldShow) {
      starterModalOpen.value = false
      starterModalDismissed.value = false
    }
  },
  { immediate: true }
)

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
    ? WIDGET_SIZES
    : [previewView.value]
))

const layerPreviewSize = computed<WidgetSize>(() => (
  previewView.value === 'all' ? structureSize.value : previewView.value
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

const selectedSizeLabel = computed(() => {
  const size = project.value.selection?.size
    ?? (previewView.value === 'all' ? structureSize.value : previewView.value)
  return size[0]!.toUpperCase() + size.slice(1)
})

const agentHistory = computed(() => [
  ...historyFuture.value.slice().reverse().map((entry, index) => ({
    id: `future-${entry.snapshot.revision}-${index}`,
    message: entry.message,
    detail: 'Redo available',
    direction: 'future' as const
  })),
  ...historyPast.value.slice().reverse().map((entry, index) => ({
    id: `past-${entry.snapshot.revision}-${index}`,
    message: entry.message,
    detail: 'Undo available',
    direction: 'past' as const
  }))
])

const changeReceiptMessage = computed(() => (
  lastChangeReceiptMessage.value
))

const inspectorOpen = computed({
  get: () => !(
    exportOpen.value
    && inspectorWasOpenBeforeExport.value
  ) && (inspectorPinned.value || project.value.selection !== null),
  set: (open: boolean) => {
    if (!open) {
      inspectorPinned.value = false
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
  error: webmcpError,
  refresh: refreshWebMcp
} = useWidgetWebMcp({
  enabled: computed(() => true),
  project,
  commitOperation,
  createProject: createAgentProject,
  getExport: () => exportResult.value,
  requestConfirmation: requestAgentConfirmation,
  catalogKey: computed(() => showStarter.value ? 'starter' : 'active'),
  catalog: () => showStarter.value
    ? createStarterWebMcpToolCatalog(currentStudioUrl())
    : createWebMcpToolCatalog(project.value)
})

const agentStatusLabel = computed(() => {
  switch (webmcpStatus.value) {
    case 'checking':
      return 'Checking page actions'
    case 'registered':
      return 'Ready for your assistant'
    case 'working':
      return 'Your assistant is working'
    case 'registering':
      return 'Preparing page actions'
    case 'error':
      return 'Assistant actions unavailable'
    default:
      return 'Assistant unavailable'
  }
})

const statusDockMessage = computed(() => {
  if (dataRefreshState.value === 'error') {
    return 'Bitcoin data unavailable'
  }
  if (dataRefreshState.value === 'refreshing') {
    return 'Refreshing Bitcoin data…'
  }
  if (persistenceState.value === 'error') {
    return 'Could not save locally'
  }
  if (persistenceState.value === 'saving') {
    return 'Saving locally…'
  }
  if (changeReceiptMessage.value) {
    return changeReceiptMessage.value
  }
  if (project.value.selection) {
    return `Selected ${selectedElementTitle.value} in the ${selectedSizeLabel.value.toLowerCase()} layout.`
  }
  return agentStatusLabel.value
})

const statusDockColor = computed(() => {
  if (dataRefreshState.value === 'error' || persistenceState.value === 'error' || webmcpStatus.value === 'error') {
    return 'error'
  }
  if (dataRefreshState.value === 'refreshing' || persistenceState.value === 'saving' || webmcpStatus.value === 'registering' || webmcpStatus.value === 'working') {
    return 'warning'
  }
  if (webmcpStatus.value === 'registered') {
    return 'success'
  }
  if (webmcpStatus.value === 'checking') {
    return 'neutral'
  }
  return 'error'
})

function commitOperation(
  operation: WidgetOperation,
  options: { recordHistory?: boolean } = {}
): OperationResult {
  const previousState = cloneWidgetProject(project.value)
  const result = applyWidgetOperation(project.value, operation)
  lastResult.value = result
  lastChangeReceiptMessage.value = result.ok
    && operation.type !== 'set-selection'
    && result.changedSizes.length > 0
    ? result.message
    : null

  if (!result.ok) {
    return result
  }

  const recordHistory = options.recordHistory ?? operation.type !== 'set-selection'
  if (recordHistory) {
    historyPast.value = [...historyPast.value, { snapshot: previousState, message: result.message }]
    historyFuture.value = []
  }

  replaceProject(result.state)
  void persistProject(result.state)
  return result
}

function selectElement(selection: WidgetSelection, options: { keepLayers?: boolean } = {}): void {
  if (isEmptyStudio.value) {
    return
  }

  closeContextualSurfaces(options)
  structureSize.value = selection.size
  if (previewView.value !== 'all') {
    previewView.value = selection.size
  }

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

function selectElementFromLayers(selection: WidgetSelection): void {
  selectElement(selection, { keepLayers: true })
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

function findWidgetParent(root: WidgetElement, elementId: string): WidgetElement | null {
  if (root.type !== 'group' && root.type !== 'repeat') {
    return null
  }
  if (root.children.some(child => child.id === elementId)) {
    return root
  }
  for (const child of root.children) {
    const parent = findWidgetParent(child, elementId)
    if (parent) {
      return parent
    }
  }
  return null
}

function nextVisualElementId(type: VisualDataElementType): string {
  const base = `visual-${type}`
  let suffix = 1
  let candidate = `${base}-${suffix}`
  while (WIDGET_SIZES.some(size => findWidgetElement(project.value.layouts[size].root, candidate))) {
    suffix += 1
    candidate = `${base}-${suffix}`
  }
  return candidate
}

function addVisualDataElement(type: VisualDataElementType): void {
  if (isEmptyStudio.value) {
    openNewProject()
    return
  }

  const targetSize = project.value.selection?.size
    ?? (previewView.value === 'all' ? structureSize.value : previewView.value)
  const root = project.value.layouts[targetSize].root
  const selected = project.value.selection?.size === targetSize
    ? findWidgetElement(root, project.value.selection.elementId)
    : null
  const parent = selected && (selected.type === 'group' || selected.type === 'repeat')
    ? selected
    : selected
      ? findWidgetParent(root, selected.id)
      : root
  const element = createVisualDataElement(type, nextVisualElementId(type))

  toolsOpen.value = false
  commitOperation({
    type: 'insert-element',
    expectedRevision: project.value.revision,
    parentId: parent?.id ?? root.id,
    element
  })
}

async function refreshLiveData(): Promise<void> {
  if (!isCryptoProject.value || dataRefreshState.value === 'refreshing') {
    return
  }

  closeContextualSurfaces()
  await refreshProjectData()
}

const removeElementLabel = computed(() => {
  const target = removeElementTarget.value
  if (!target) {
    return 'this element'
  }
  const element = findWidgetElement(
    project.value.layouts[target.size].root,
    target.elementId
  )
  return element ? widgetElementLabel(element) : target.elementId
})

function requestRemoveElement(selection: WidgetSelection): void {
  removeElementTarget.value = selection
  removeElementOpen.value = true
}

function cancelRemoveElement(): void {
  removeElementOpen.value = false
  removeElementTarget.value = null
}

function confirmRemoveElement(): void {
  const target = removeElementTarget.value
  if (!target) {
    return
  }

  const result = commitOperation({
    type: 'remove-element',
    expectedRevision: project.value.revision,
    elementId: target.elementId
  })
  if (result.ok) {
    cancelRemoveElement()
  }
}

function closeContextualSurfaces(options: { keepLayers?: boolean } = {}): void {
  projectsOpen.value = false
  if (!options.keepLayers) {
    layersOpen.value = false
  }
  settingsOpen.value = false
  referenceOpen.value = false
  exportOpen.value = false
  agentOpen.value = false
  toolsOpen.value = false
}

function startCanvasPan(event: PointerEvent): void {
  if (event.button !== 0 || panPointerId !== null) {
    return
  }

  const target = event.target instanceof Element ? event.target : null
  if (target?.closest('input, textarea, select, [contenteditable="true"], .widget-node, .preview-caption-button')) {
    return
  }

  const viewport = previewScrollRef.value
  if (!viewport) {
    return
  }

  panPointerId = event.pointerId
  panStartX = event.clientX
  panStartY = event.clientY
  panStartOffsetX = canvasPanX.value
  panStartOffsetY = canvasPanY.value
  panMoved = false
  viewport.setPointerCapture(event.pointerId)
}

function moveCanvasPan(event: PointerEvent): void {
  if (panPointerId !== event.pointerId) {
    return
  }

  const deltaX = event.clientX - panStartX
  const deltaY = event.clientY - panStartY
  if (!panMoved && Math.hypot(deltaX, deltaY) < 4) {
    return
  }

  panMoved = true
  isCanvasPanning.value = true
  canvasPanX.value = panStartOffsetX + deltaX
  canvasPanY.value = panStartOffsetY + deltaY
  event.preventDefault()
}

function finishCanvasPan(event: PointerEvent): void {
  if (panPointerId !== event.pointerId) {
    return
  }

  const viewport = previewScrollRef.value
  const didPan = panMoved
  panPointerId = null
  panMoved = false
  isCanvasPanning.value = false

  if (viewport?.hasPointerCapture(event.pointerId)) {
    viewport.releasePointerCapture(event.pointerId)
  }

  if (!didPan) {
    return
  }

  suppressNextCanvasClick.value = true
  window.setTimeout(() => {
    suppressNextCanvasClick.value = false
  }, 0)
}

function handleCanvasClickCapture(event: MouseEvent): void {
  if (suppressNextCanvasClick.value) {
    event.preventDefault()
    event.stopPropagation()
    suppressNextCanvasClick.value = false
    return
  }

  const target = event.target instanceof Element ? event.target : null
  if (!target?.closest('.widget-preview, .preview-caption-button')) {
    clearSelection()
  }
}

function selectNavigationMode(mode: NavigationMode): void {
  if (isEmptyStudio.value && mode !== 'projects') {
    openNewProject()
    return
  }

  navigationMode.value = mode
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
  if (isEmptyStudio.value) {
    openNewProject()
    return
  }

  closeContextualSurfaces()
  const keepPinnedInspector = inspectorPinned.value
  clearSelection()
  if (!keepPinnedInspector) {
    settingsOpen.value = true
  }
}

function openReference(): void {
  selectNavigationMode('reference')
}

function openExport(): void {
  if (isEmptyStudio.value) {
    return
  }

  inspectorWasOpenBeforeExport.value = inspectorOpen.value
  closeContextualSurfaces()
  exportOpen.value = true
}

function focusPreview(size: WidgetSize): void {
  if (isEmptyStudio.value) {
    return
  }

  structureSize.value = size
  if (previewView.value !== 'all') {
    previewView.value = size
  }

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
  if (isEmptyStudio.value) {
    return
  }

  previewView.value = value
  if (value !== 'all') {
    structureSize.value = value
  }
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
  historyFuture.value = [...historyFuture.value, {
    snapshot: cloneWidgetProject(project.value),
    message: previous.message
  }]
  const result = commitOperation({
    type: 'restore-snapshot',
    expectedRevision: project.value.revision,
    snapshot: previous.snapshot
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
  historyPast.value = [...historyPast.value, {
    snapshot: cloneWidgetProject(project.value),
    message: next.message
  }]
  const result = commitOperation({
    type: 'restore-snapshot',
    expectedRevision: project.value.revision,
    snapshot: next.snapshot
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
  starterModalDismissed.value = false
  starterModalOpen.value = true
  void router.push({
    path: '/studio',
    query: { ...route.query, new: '1' }
  })
}

function cancelNewProject(): void {
  if (starterBusy.value) {
    return
  }
  starterModalDismissed.value = true
  starterModalOpen.value = false
  clearForcedNewQuery()
}

function updateStarterModal(open: boolean): void {
  if (open) {
    starterModalDismissed.value = false
    starterModalOpen.value = true
    return
  }

  cancelNewProject()
}

async function createAgentProject(name: string, startingIntent?: WidgetStarterId): Promise<WidgetProject> {
  const created = await createProject(name, startingIntent)
  historyPast.value = []
  historyFuture.value = []
  lastResult.value = null
  referenceError.value = null
  await loadReferenceImage()
  clearForcedNewQuery()
  return created
}

async function startFromStarter(starterId: WidgetStarterId, referenceFile?: File): Promise<void> {
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
    if (starter.action === 'reference' && referenceFile) {
      await handleReferenceUpload(referenceFile)
    } else {
      await loadReferenceImage()
    }
    clearForcedNewQuery()

    if (starter.action === 'reference') {
      referenceOpen.value = true
    }
  } finally {
    starterBusy.value = false
  }
}

async function startFromReference(file: File): Promise<void> {
  await startFromStarter('reference-image', file)
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
  const target = deleteTarget.value
  if (!target) {
    return
  }
  deleteProjectOpen.value = false
  await deleteProject(target)
  historyPast.value = []
  historyFuture.value = []
  lastResult.value = null
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

let previewMediaQuery: MediaQueryList | null = null

function syncPreviewView(event?: MediaQueryList | MediaQueryListEvent): void {
  const isNarrow = event ? event.matches : previewMediaQuery?.matches ?? false
  if (isNarrow) {
    previewView.value = 'medium'
    structureSize.value = 'medium'
  }
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
    if (starterModalOpen.value || forcedNewProject.value) {
      cancelNewProject()
      return
    }
    if (projectsOpen.value || layersOpen.value || settingsOpen.value || referenceOpen.value || exportOpen.value || agentOpen.value || toolsOpen.value) {
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
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  previewMediaQuery?.removeEventListener('change', syncPreviewView)
  window.removeEventListener('keydown', handleKeydown)
  if (referenceUrl.value) {
    URL.revokeObjectURL(referenceUrl.value)
  }
})
</script>

<template>
  <main class="studio-shell">
      <header class="studio-topbar">
        <div class="topbar-leading">
          <UButton
            icon="i-lucide-panels-top-left"
            color="neutral"
            variant="ghost"
            size="sm"
            class="topbar-projects-trigger"
            aria-label="Projects"
            title="Projects"
            @click="openProjects"
          />
          <UColorModeImage
            light="/widgetr-logo-light.svg"
            dark="/widgetr-logo-dark.svg"
            alt="Widgetr"
            class="topbar-brand-logo"
            draggable="false"
          />
        </div>

        <div class="topbar-trailing">
          <div class="history-actions" aria-label="Session history">
            <UButton
              icon="i-lucide-undo-2"
              color="neutral"
              variant="ghost"
              :disabled="historyPast.length === 0"
              aria-label="Undo"
              title="Undo"
              @click="undo"
            />
            <UButton
              icon="i-lucide-redo-2"
              color="neutral"
              variant="ghost"
              :disabled="historyFuture.length === 0"
              aria-label="Redo"
              title="Redo"
              @click="redo"
            />
          </div>
          <UButton
            label="Export"
            icon="i-lucide-download"
            color="primary"
            size="sm"
            class="topbar-export"
            aria-label="Export"
            title="Export"
            :disabled="isLoading || isEmptyStudio"
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
            <span class="navigation-brand-name">Widget editor</span>
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
                <span class="panel-count">{{ layerPreviewSize }}</span>
              </div>
              <UFormField label="Preview size">
                <USelect
                  class="w-full"
                  :model-value="layerPreviewSize"
                  :items="structureSizeOptions"
                  value-key="value"
                  aria-label="Layer preview size"
                  @update:model-value="value => focusPreview(value as WidgetSize)"
                />
              </UFormField>
              <ul class="structure-tree">
                <WidgetStructureTree
                  :element="project.layouts[layerPreviewSize].root"
                  :size="layerPreviewSize"
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
          <h1 id="canvas-heading" class="sr-only">Canvas</h1>

          <div class="canvas-control-stack">
            <div class="canvas-project-title" aria-label="Current project">
              <h2 id="canvas-project-title-heading">{{ isLoading ? 'Loading workspace…' : isEmptyStudio ? 'No widget yet' : project.name }}</h2>
            </div>

            <div class="canvas-floating-controls" aria-label="Canvas controls">
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
                :disabled="isLoading || isEmptyStudio"
                @click="focusPreview(size)"
              />
              <UButton
                label="All"
                color="neutral"
                variant="ghost"
                size="sm"
                class="size-control size-control-all"
                :class="{ 'size-control-active': previewView === 'all' }"
                aria-label="All sizes"
                title="All sizes"
                :aria-pressed="previewView === 'all'"
                :disabled="isLoading || isEmptyStudio"
                @click="setPreviewView('all')"
              />
            </div>

            <UPopover
              v-model:open="toolsOpen"
              :content="{ align: 'center', sideOffset: 8 }"
              :ui="{ content: 'w-64 max-w-[calc(100vw-2rem)] bg-transparent p-0 shadow-none ring-0' }"
            >
              <UButton
                icon="i-lucide-sliders-vertical"
                color="neutral"
                variant="ghost"
                size="sm"
                class="floating-tools-trigger"
                aria-label="Tools"
                title="Tools"
              />
              <template #content>
                <div class="tools-menu">
                  <UButton label="Projects" icon="i-lucide-folder-kanban" color="neutral" variant="ghost" block @click="openProjects" />
                  <UButton label="Layers" icon="i-lucide-layers-2" color="neutral" variant="ghost" block @click="openLayers" />
                  <UButton label="Reference" icon="i-lucide-image-plus" color="neutral" variant="ghost" block @click="openReference" />
                  <UButton label="Widget settings" icon="i-lucide-settings-2" color="neutral" variant="ghost" block @click="openWidgetSettings" />
                  <UButton
                    v-if="isCryptoProject"
                    :label="dataRefreshState === 'refreshing' ? 'Refreshing Bitcoin data…' : 'Refresh live data'"
                    icon="i-lucide-refresh-cw"
                    color="neutral"
                    variant="ghost"
                    block
                    :disabled="dataRefreshState === 'refreshing'"
                    @click="refreshLiveData"
                  />
                  <div class="tools-menu-divider" aria-hidden="true" />
                  <span class="tools-menu-label">Add visual data</span>
                  <UButton
                    v-for="option in VISUAL_DATA_ELEMENT_OPTIONS"
                    :key="option.value"
                    :label="option.label"
                    :icon="option.value === 'progress-ring' ? 'i-lucide-circle-gauge' : option.value === 'progress-bar' ? 'i-lucide-rectangle-horizontal' : option.value === 'sparkline' ? 'i-lucide-chart-spline' : 'i-lucide-chart-no-axes-column'"
                    color="neutral"
                    variant="ghost"
                    block
                    @click="addVisualDataElement(option.value)"
                  />
                </div>
              </template>
            </UPopover>
            </div>
          </div>

          <div class="canvas-stage">
            <div v-if="isCryptoProject && dataRefreshState === 'error'" class="crypto-data-recovery">
              <UAlert
                color="warning"
                variant="subtle"
                icon="i-lucide-wifi-off"
                title="Bitcoin live data unavailable"
                :description="dataRefreshError ?? 'The saved preview is still available.'"
              />
              <UButton
                label="Try again"
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="outline"
                size="sm"
                @click="refreshLiveData"
              />
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

            <div v-if="isLoading" class="canvas-empty-state canvas-empty-state-loading" aria-live="polite">
              <USkeleton class="canvas-empty-icon-skeleton" />
              <USkeleton class="canvas-empty-heading-skeleton" />
              <USkeleton class="canvas-empty-copy-skeleton" />
            </div>

            <div v-else-if="isEmptyStudio" class="canvas-empty-state">
              <span class="canvas-empty-icon" aria-hidden="true">
                <UIcon name="i-lucide-panels-top-left" />
              </span>
              <h2>No widgets yet</h2>
              <p>Choose a starting point to begin designing.</p>
              <UButton
                label="Create new widget"
                icon="i-lucide-plus"
                color="primary"
                @click="openNewProject"
              />
            </div>

            <div
              v-else
              ref="previewScrollRef"
              class="preview-scroll"
              :class="{ 'is-panning': isCanvasPanning }"
              aria-label="Canvas surface. Drag to pan."
              @pointerdown="startCanvasPan"
              @pointermove="moveCanvasPan"
              @pointerup="finishCanvasPan"
              @pointercancel="finishCanvasPan"
              @lostpointercapture="finishCanvasPan"
              @click.capture="handleCanvasClickCapture"
            >
              <div
                class="preview-grid"
                :class="{ 'preview-grid-single': visiblePreviewSizes.length === 1 }"
                :style="previewPanStyle"
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
          <div v-if="isLoading || isEmptyStudio" class="empty-inspector-state">
            <UIcon name="i-lucide-panels-top-left" aria-hidden="true" />
            <p>{{ isLoading ? 'Loading your workspace.' : 'Create a widget to edit its settings.' }}</p>
          </div>
          <WidgetInspector
            v-else
            class="studio-inspector-content"
            :mode="project.selection ? 'element' : 'widget'"
            embedded
            :project="project"
            :selection="project.selection"
            :focused-size="previewView === 'all' ? structureSize : previewView"
            @operation="commitOperation"
            @remove="requestRemoveElement"
          />
        </aside>
      </section>

      <Teleport to="body">
        <div
          class="canvas-status-dock-shell"
        >
          <UPopover
            v-model:open="agentOpen"
            :content="{ align: 'center', side: 'top', sideOffset: 12 }"
            :ui="{ content: 'w-96 max-w-[calc(100vw-2rem)] bg-transparent p-0 shadow-none ring-0' }"
          >
            <button
              type="button"
              class="canvas-status-trigger"
              :class="`canvas-status-trigger-${statusDockColor}`"
              :aria-label="agentStatusLabel"
              :title="agentStatusLabel"
            >
              <span class="status-dock-icon" aria-hidden="true">
                <UIcon name="i-lucide-bot" />
                <span class="status-dock-dot" />
              </span>
              <span class="status-dock-copy" aria-live="polite">
                <Transition name="status-dock-message" mode="out-in">
                  <span :key="statusDockMessage" class="status-dock-message">{{ statusDockMessage }}</span>
                </Transition>
              </span>
            </button>
            <template #content>
              <WidgetAgentToolsPanel
                :open="agentOpen"
                :status="webmcpStatus"
                :context="webmcpContext"
                :tool-names="webmcpRegisteredToolNames"
                :error="webmcpError"
                :history="agentHistory"
              />
            </template>
          </UPopover>
        </div>
      </Teleport>

    <USlideover
      v-model:open="projectsOpen"
      side="left"
      :overlay="false"
      :dismissible="false"
      :modal="false"
      inset
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
      :overlay="false"
      :dismissible="false"
      :modal="false"
      inset
      title="Layers"
      description="Select an element to edit it."
      class="layers-slideover"
      :ui="{ content: 'sm:max-w-sm', body: 'p-0 sm:p-0' }"
    >
      <template #body>
        <div class="layers-drawer">
          <UFormField label="Preview size">
            <USelect
              class="w-full"
              :model-value="layerPreviewSize"
              :items="structureSizeOptions"
              value-key="value"
              aria-label="Layer preview size"
              @update:model-value="value => focusPreview(value as WidgetSize)"
            />
          </UFormField>

          <ul class="structure-tree">
            <WidgetStructureTree
              :element="project.layouts[layerPreviewSize].root"
              :size="layerPreviewSize"
              :selection="project.selection"
              @select="selectElementFromLayers"
            />
          </ul>
        </div>
      </template>
    </USlideover>

    <USlideover
      v-model:open="settingsOpen"
      :overlay="false"
      :dismissible="false"
      :modal="false"
      inset
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
      :overlay="false"
      :dismissible="false"
      :modal="false"
      inset
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

    <UModal
      v-model:open="exportOpen"
      :overlay="true"
      class="export-modal-content"
      title="Export your widget"
      description="Take this generated Scriptable file to your iPhone or iPad."
      :ui="{ body: 'p-0', footer: 'export-modal-footer' }"
    >
      <template #body>
        <section class="export-modal-body" aria-labelledby="export-heading">
          <div class="export-intro">
            <div>
              <h2 id="export-heading">Ready to take with you</h2>
              <p>Download the file or copy it into Scriptable. It includes all three widget sizes from this project.</p>
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
            title="Ready with review notes"
            :description="warningDescription"
          />

          <section class="export-next-steps" aria-labelledby="export-next-steps-heading">
            <h3 id="export-next-steps-heading">Next steps</h3>
            <ol>
              <li>Copy the source below or download the <strong>.js</strong> file.</li>
              <li>Open Scriptable on your iPhone or iPad, create a script, and paste it in.</li>
              <li>Run it once, then add a Scriptable widget and choose that script.</li>
            </ol>
          </section>

          <section class="export-code-panel" aria-labelledby="export-code-heading">
            <div class="export-code-heading">
              <div>
                <h3 id="export-code-heading">Scriptable source</h3>
                <p>{{ generatedSource.length.toLocaleString() }} characters</p>
              </div>
              <UIcon name="i-lucide-code-2" aria-hidden="true" />
            </div>
            <pre class="export-code" tabindex="0"><code>{{ generatedSource }}</code></pre>
          </section>
        </section>
      </template>
      <template #footer>
        <div class="export-actions">
          <UButton
            label="Download .js"
            icon="i-lucide-download"
            color="primary"
            :disabled="!exportReady"
            @click="downloadExport"
          />
          <UButton
            :label="copyButtonLabel"
            icon="i-lucide-copy"
            color="neutral"
            variant="outline"
            :disabled="!exportReady"
            @click="copyExport"
          />
        </div>
      </template>
    </UModal>

    <USlideover
      v-model:open="inspectorOpen"
      :overlay="false"
      :dismissible="false"
      :modal="false"
      inset
      :title="project.selection ? selectedElementTitle : 'Widget inspector'"
      :description="project.selection ? 'Edit the selected element and choose where changes apply.' : 'Adjust widget settings while you work.'"
      :ui="{ content: 'sm:max-w-md', body: 'p-0 sm:p-0' }"
    >
      <template #actions>
        <UButton
          :icon="inspectorPinned ? 'i-lucide-pin-off' : 'i-lucide-pin'"
          :color="inspectorPinned ? 'primary' : 'neutral'"
          :variant="inspectorPinned ? 'soft' : 'ghost'"
          size="sm"
          class="inspector-pin-button"
          :aria-label="inspectorPinned ? 'Unpin inspector' : 'Pin inspector'"
          :title="inspectorPinned ? 'Unpin inspector' : 'Pin inspector'"
          :aria-pressed="inspectorPinned"
          @click="inspectorPinned = !inspectorPinned"
        />
      </template>
      <template #body>
        <WidgetInspector
          class="slideover-inspector"
          embedded
          :mode="project.selection ? 'element' : 'widget'"
          :project="project"
          :selection="project.selection"
          :focused-size="previewView === 'all' ? structureSize : previewView"
          @operation="commitOperation"
          @remove="requestRemoveElement"
        />
      </template>
      <template #footer v-if="project.selection">
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
      v-model:open="removeElementOpen"
      title="Remove element"
      description="This removes the selected element from the active design scope."
    >
      <template #body>
        <p class="modal-copy">
          Remove <strong>{{ removeElementLabel }}</strong>? This cannot be undone except with Undo.
        </p>
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton
            label="Keep element"
            color="neutral"
            variant="outline"
            @click="cancelRemoveElement"
          />
          <UButton
            label="Remove element"
            color="error"
            @click="confirmRemoveElement"
          />
        </div>
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

    <UModal
      :open="starterModalOpen"
      class="starter-modal-content"
      title="Start a widget"
      description="Choose a template or bring a visual reference."
      :ui="{ body: 'p-0 sm:p-0' }"
      @update:open="updateStarterModal"
    >
      <template #body>
        <WidgetProjectStarter
          :is-loading="isLoading"
          :persistence-error="persistenceError"
          :disabled="starterBusy"
          :open="starterModalOpen"
          @start="startFromStarter"
          @reference="startFromReference"
        />
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
.canvas-footer,
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

:global(.dark) .size-control-active {
  color: var(--widgetr-stage) !important;
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

.compact-actions-menu {
  display: grid;
  gap: 0.35rem;
  padding: 0.65rem;
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

.canvas-empty-state {
  display: grid;
  min-height: 100%;
  align-content: center;
  justify-items: center;
  gap: 0.7rem;
  padding: 2rem;
  color: var(--widgetr-muted);
  text-align: center;
}

.canvas-empty-icon {
  display: grid;
  width: 2.8rem;
  height: 2.8rem;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--widgetr-accent) 30%, var(--widgetr-border));
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--widgetr-accent) 9%, transparent);
  color: var(--widgetr-accent);
}

.canvas-empty-icon .i-lucide {
  width: 1.25rem;
  height: 1.25rem;
}

.canvas-empty-state h2 {
  margin: 0;
  color: var(--widgetr-ink);
  font-size: 1.05rem;
  font-weight: 650;
  letter-spacing: -0.025em;
}

.canvas-empty-state p {
  max-width: 34ch;
  margin: 0;
  font-size: 0.74rem;
  line-height: 1.5;
}

.empty-inspector-state {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.65rem;
  min-height: 12rem;
  padding: 1rem;
  color: var(--widgetr-muted);
  font-size: 0.7rem;
  line-height: 1.45;
  text-align: center;
}

.empty-inspector-state .i-lucide {
  width: 1.2rem;
  height: 1.2rem;
  color: var(--widgetr-accent);
}

.empty-inspector-state p {
  max-width: 22ch;
  margin: 0;
}

.operation-result {
  margin: 0.75rem 0.9rem 0;
}

.crypto-data-recovery {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: 0.75rem 0.9rem 0;
}

.crypto-data-recovery > :first-child {
  min-width: 0;
  flex: 1 1 auto;
}

.crypto-data-recovery > :last-child {
  flex: 0 0 auto;
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
  width: 1.6rem;
  height: 1.6rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--widgetr-accent) 14%, transparent);
  color: var(--widgetr-accent);
}

.receipt-icon .i-lucide-bot {
  width: 0.9rem;
  height: 0.9rem;
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
  overscroll-behavior: contain;
  padding: clamp(1rem, 4vw, 2.75rem);
  cursor: grab;
  touch-action: none;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, max-content);
  gap: clamp(1.1rem, 3vw, 2.4rem);
  align-items: start;
  justify-content: center;
  width: max-content;
  min-width: min(100%, 10rem);
  will-change: transform;
}

.preview-scroll.is-panning {
  cursor: grabbing;
  user-select: none;
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

.assistant-inline-status-saving .status-dot {
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

:global(body > [data-slot="content"][data-side="right"] > [data-slot="header"]) {
  position: relative;
}

:global(.inspector-pin-button) {
  position: absolute;
  top: 1rem;
  right: 3.5rem;
  width: 2rem;
  min-width: 2rem;
  height: 2rem;
  min-height: 2rem;
  margin: 0;
  padding: 0;
  border-radius: 999px;
  justify-content: center;
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

.layers-drawer {
  padding: 1rem;
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

.export-actions,
.modal-actions {
  flex-wrap: wrap;
  gap: 0.45rem;
}

.project-modal-actions {
  width: 100%;
  justify-content: flex-start;
}

.project-modal-actions :deep(button) {
  min-height: 2rem;
}

@media (min-width: 48rem) {
  .project-modal-actions {
    justify-content: space-between;
  }
}

.export-actions {
  align-items: stretch;
}

.modal-copy {
  margin: 0;
}

.export-modal-body {
  display: grid;
  gap: 1.15rem;
  padding: 1.35rem 1.5rem 1.5rem;
}

.export-intro,
.export-code-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.export-intro h2,
.export-next-steps h3,
.export-code-heading h3 {
  margin: 0;
  color: var(--widgetr-ink);
  font-weight: 650;
  letter-spacing: -0.02em;
}

.export-intro h2 {
  font-size: 1.05rem;
}

.export-intro p,
.export-code-heading p,
.export-next-steps li {
  color: var(--widgetr-muted);
  font-size: 0.74rem;
  line-height: 1.5;
}

.export-intro p {
  max-width: 54ch;
  margin: 0.35rem 0 0;
}

.export-next-steps {
  display: grid;
  gap: 0.45rem;
  padding: 0.85rem 1rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-accent) 20%, var(--widgetr-border));
  border-radius: 1rem;
  background: color-mix(in srgb, var(--widgetr-accent) 6%, transparent);
}

.export-next-steps h3,
.export-code-heading h3 {
  font-size: 0.8rem;
}

.export-next-steps ol {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding-left: 1.15rem;
  list-style: decimal;
}

.export-next-steps li {
  padding-left: 0.15rem;
}

.export-next-steps strong {
  color: var(--widgetr-ink);
  font-weight: 650;
}

.export-code-panel {
  display: grid;
  min-height: 0;
  gap: 0.55rem;
}

.export-code-heading {
  align-items: center;
}

.export-code-heading p {
  margin: 0.2rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.62rem;
}

.export-code-heading > .i-lucide-code-2 {
  flex: 0 0 auto;
  width: 1rem;
  height: 1rem;
  color: var(--widgetr-muted);
}

.export-code {
  box-sizing: border-box;
  width: 100%;
  max-height: min(34dvh, 22rem);
  margin: 0;
  overflow: auto;
  padding: 0.9rem 1rem;
  border: 1px solid var(--widgetr-border);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--widgetr-stage) 78%, var(--widgetr-pane-solid));
  color: var(--widgetr-ink);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  line-height: 1.55;
  tab-size: 2;
  white-space: pre;
}

.export-code:focus-visible {
  outline: 2px solid var(--widgetr-accent);
  outline-offset: 2px;
}

:global(body > [data-slot="content"].export-modal-content) {
  width: min(58rem, calc(100vw - 2rem)) !important;
  max-width: none !important;
  max-height: calc(100dvh - 2rem) !important;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 14%, transparent);
  border-radius: 1.5rem;
  background: color-mix(in srgb, var(--widgetr-pane-solid) 92%, transparent);
  box-shadow: 0 28px 90px rgb(0 0 0 / 25%), 0 0 0 1px color-mix(in srgb, var(--widgetr-ink) 5%, transparent);
  backdrop-filter: blur(28px) saturate(1.2);
  -webkit-backdrop-filter: blur(28px) saturate(1.2);
}

:global(body > [data-slot="content"].export-modal-content > [data-slot="header"]) {
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--widgetr-border);
  background: transparent;
}

:global(body > [data-slot="content"].export-modal-content > [data-slot="footer"]) {
  justify-content: flex-end;
  padding: 0.95rem 1.5rem 1.2rem;
  border-top: 1px solid var(--widgetr-border);
  background: transparent;
}

:global(body > [data-slot="content"].starter-modal-content) {
  width: min(34rem, calc(100vw - 2rem)) !important;
  max-width: none !important;
  max-height: min(calc(100dvh - 2rem), 48rem) !important;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 14%, transparent);
  border-radius: 1.5rem;
  background: color-mix(in srgb, var(--widgetr-pane-solid) 92%, transparent);
  box-shadow: 0 28px 90px rgb(0 0 0 / 25%), 0 0 0 1px color-mix(in srgb, var(--widgetr-ink) 5%, transparent);
  backdrop-filter: blur(28px) saturate(1.2);
  -webkit-backdrop-filter: blur(28px) saturate(1.2);
}

:global(body > [data-slot="content"].starter-modal-content > [data-slot="header"]) {
  padding: 1.15rem 1.25rem 0.9rem;
  border-bottom: 1px solid var(--widgetr-border);
  background: transparent;
}

:global(body > [data-slot="content"].starter-modal-content > [data-slot="body"]) {
  overflow: hidden;
}

.export-actions {
  justify-content: flex-end;
  width: 100%;
  gap: 0.65rem;
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

  .topbar-center {
    gap: 0.2rem;
  }

  .size-control {
    min-width: 3.15rem;
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
  .assistant-status-button,
  .topbar-export,
  .compact-actions,
  .history-actions :deep(button),
  .compact-actions :deep(button),
  .canvas-actions :deep(button) {
    min-height: var(--widgetr-touch-target);
  }

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

  .crypto-data-recovery {
    align-items: stretch;
    flex-direction: column;
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
    font-size: 0.75rem;
  }

  .topbar-export :deep(svg) {
    width: 1rem;
    height: 1rem;
  }

  :global(body > [data-slot="content"].starter-modal-content) {
    width: calc(100vw - 1rem) !important;
    max-height: calc(100dvh - 1rem) !important;
    border-radius: 1.25rem;
  }

  :global(body > [data-slot="content"].starter-modal-content > [data-slot="header"]) {
    padding: 1rem 1rem 0.8rem;
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

  .canvas-actions :deep(button) {
    min-height: var(--widgetr-touch-target);
  }
}

/* Canvas-first revision: the document owns the viewport; controls recede into glass. */
.studio-shell {
  position: relative;
  height: 100dvh;
  min-height: 100dvh;
  background: var(--widgetr-stage);
}

.studio-topbar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 30;
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem max(1rem, env(safe-area-inset-right)) 0.55rem max(1rem, env(safe-area-inset-left));
  border: 0;
  background: transparent;
  pointer-events: none;
}

.studio-topbar > * {
  pointer-events: auto;
}

.topbar-leading,
.topbar-trailing {
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 10%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--widgetr-pane-solid) 62%, transparent);
  box-shadow: 0 12px 30px rgb(29 29 31 / 8%);
  backdrop-filter: blur(22px) saturate(1.2);
  -webkit-backdrop-filter: blur(22px) saturate(1.2);
}

.topbar-leading {
  max-width: none;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.topbar-trailing {
  gap: 0.5rem;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.topbar-projects-trigger,
.history-actions :deep(button),
.topbar-export {
  min-height: 2.25rem;
}

.topbar-projects-trigger,
.history-actions :deep(button) {
  width: 2.25rem;
  min-width: 2.25rem;
  min-height: 2.25rem;
  padding: 0;
  border-radius: 999px;
  justify-content: center;
}

.topbar-export {
  min-width: 0;
  padding: 0 0.75rem;
  border-radius: 999px;
}

.assistant-status-button {
  width: auto;
  min-width: 0;
  min-height: 2.25rem;
  max-width: 12rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  justify-content: center;
}

.topbar-projects-trigger {
  width: 2.25rem;
  min-width: 2.25rem;
  min-height: 2.25rem;
  padding: 0;
  color: var(--widgetr-ink);
  background: transparent !important;
  box-shadow: none !important;
}

.topbar-leading :deep(.topbar-brand-logo) {
  width: auto;
  height: 1.35rem;
  max-width: none;
  flex: 0 0 auto;
}

.topbar-projects-trigger :deep([data-slot="leadingIcon"]),
.topbar-export :deep([data-slot="leadingIcon"]) {
  width: 1.125rem;
  height: 1.125rem;
}

.topbar-projects-trigger :deep(span:not([class*="icon"])) {
  display: none;
}

.assistant-status-button :deep([data-slot="label"]) {
  display: inline-flex;
}

.topbar-divider {
  display: none;
}

.project-identity {
  gap: 0.4rem;
  padding: 0 0.55rem 0 0.35rem;
}

.wordmark {
  color: var(--widgetr-muted);
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.history-actions {
  box-sizing: border-box;
  gap: 0.1rem;
  height: 2.25rem;
  min-height: 2.25rem;
  padding: 0 0.25rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 11%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--widgetr-pane-solid) 62%, transparent);
  box-shadow: 0 12px 30px rgb(29 29 31 / 8%);
  backdrop-filter: blur(22px) saturate(1.2);
  -webkit-backdrop-filter: blur(22px) saturate(1.2);
}

.history-actions :deep(button) {
  height: 2.25rem;
  background: transparent;
}

.history-actions :deep(button:not(:disabled):hover) {
  background: color-mix(in srgb, var(--widgetr-ink) 8%, transparent);
}

.assistant-status-button {
  max-width: none;
  padding-right: 0.35rem;
  padding-left: 0.35rem;
  border-color: transparent !important;
  border-radius: 0.75rem;
  background: transparent !important;
  box-shadow: none !important;
}

.assistant-status-button :deep([data-slot="leadingIcon"]) {
  display: none;
}

.assistant-status-button:hover {
  background: color-mix(in srgb, var(--widgetr-ink) 6%, transparent) !important;
}

.topbar-export {
  background: var(--widgetr-accent) !important;
  color: white !important;
}

.studio-workspace {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.studio-navigation,
.studio-inspector {
  display: none;
}

.studio-shell :deep([data-slot="content"][data-side="left"]),
.studio-shell :deep([data-slot="content"][data-side="right"]) {
  border-color: color-mix(in srgb, var(--widgetr-ink) 12%, transparent);
  background: var(--widgetr-pane-solid);
  background: color-mix(in srgb, var(--widgetr-pane-solid) 88%, transparent);
  box-shadow: 0 20px 64px rgb(29 29 31 / 18%);
  backdrop-filter: blur(28px) saturate(1.2);
  -webkit-backdrop-filter: blur(28px) saturate(1.2);
}

/* Slideover surfaces are temporary tools, not a second app shell. */
:global(body > [data-slot="content"][data-side="left"]),
:global(body > [data-slot="content"][data-side="right"]) {
  top: calc(var(--widgetr-topbar-height) + 0.75rem) !important;
  right: 1rem !important;
  bottom: auto !important;
  left: auto !important;
  width: min(26rem, calc(100vw - 2rem)) !important;
  max-width: min(26rem, calc(100vw - 2rem)) !important;
  height: auto !important;
  max-height: calc(100dvh - var(--widgetr-topbar-height) - 1.5rem) !important;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 14%, transparent) !important;
  border-radius: 1.5rem !important;
  background: color-mix(in srgb, var(--widgetr-pane-solid) 82%, transparent) !important;
  box-shadow: 0 24px 70px rgb(0 0 0 / 22%), 0 0 0 1px color-mix(in srgb, var(--widgetr-ink) 5%, transparent);
  backdrop-filter: blur(28px) saturate(1.25);
  -webkit-backdrop-filter: blur(28px) saturate(1.25);
}

:global(body > [data-slot="content"][data-side="left"]) {
  right: auto !important;
  left: 1rem !important;
  width: min(22rem, calc(100vw - 2rem)) !important;
  max-width: min(22rem, calc(100vw - 2rem)) !important;
}

:global(body > [data-slot="content"][data-side] > [data-slot="header"]) {
  min-height: auto !important;
  padding: 1rem 1.15rem 0.85rem !important;
  border-bottom: 1px solid var(--widgetr-border);
  background: transparent;
}

:global(body > [data-slot="content"].layers-slideover > [data-slot="header"]) {
  padding: 1rem !important;
}

:global(body > [data-slot="content"][data-side] > [data-slot="body"]) {
  min-height: 0;
  background: transparent;
}

:global(body > [data-slot="content"][data-side] > [data-slot="footer"]) {
  padding: 0.8rem 1.15rem 1rem !important;
  border-top: 1px solid var(--widgetr-border);
  background: transparent;
}

.canvas-panel {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  isolation: isolate;
  overflow: hidden;
  background: var(--widgetr-stage);
}

.canvas-panel::before,
.canvas-panel::after {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  content: "";
}

.canvas-panel::before {
  background-image:
    linear-gradient(to right, color-mix(in srgb, var(--widgetr-ink) 5%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--widgetr-ink) 5%, transparent) 1px, transparent 1px);
  background-position: center;
  background-size: 4rem 4rem;
  opacity: 0.55;
}

.canvas-panel::after {
  background: radial-gradient(circle at 50% 44%, color-mix(in srgb, var(--widgetr-accent) 6%, transparent), transparent 42%);
  opacity: 0.65;
}

.canvas-toolbar {
  display: none;
}

.canvas-control-stack {
  position: absolute;
  top: 4rem;
  left: 50%;
  z-index: 15;
  display: flex;
  width: max-content;
  max-width: calc(100vw - 1rem);
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  transform: translateX(-50%);
  pointer-events: none;
}

.canvas-project-title {
  position: static;
  width: min(24rem, calc(100vw - 2rem));
  max-width: 100%;
  pointer-events: none;
  text-align: center;
}

.canvas-project-title h2 {
  margin: 0;
  color: var(--widgetr-ink);
  font-size: clamp(0.95rem, 1.45vw, 1.2rem);
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.15;
  overflow-wrap: anywhere;
  text-wrap: balance;
  text-shadow: 0 8px 22px color-mix(in srgb, var(--widgetr-stage) 72%, transparent);
}

.canvas-floating-controls {
  position: static;
  display: flex;
  width: max-content;
  max-width: calc(100vw - 1rem);
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 11%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--widgetr-pane-solid) 62%, transparent);
  box-shadow: 0 16px 40px rgb(29 29 31 / 10%);
  backdrop-filter: blur(24px) saturate(1.25);
  -webkit-backdrop-filter: blur(24px) saturate(1.25);
  pointer-events: auto;
}

.canvas-floating-controls .size-controls {
  flex: 0 0 auto;
  padding: 0.1rem;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.canvas-floating-controls .size-control {
  min-width: 3.5rem;
  justify-content: center;
}

.floating-tools-trigger {
  width: 2.25rem;
  min-width: 2.25rem;
  min-height: 2.25rem;
  margin-left: 0.15rem;
  padding: 0;
  border-left: 1px solid color-mix(in srgb, var(--widgetr-ink) 12%, transparent);
  border-radius: 0 999px 999px 0;
  justify-content: center;
}

.tools-menu {
  min-width: 15rem;
  padding: 0.55rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 12%, transparent);
  border-radius: var(--widgetr-radius-panel);
  background: color-mix(in srgb, var(--widgetr-pane-solid) 78%, transparent);
  box-shadow: 0 18px 44px rgb(29 29 31 / 14%);
  backdrop-filter: blur(24px) saturate(1.25);
  -webkit-backdrop-filter: blur(24px) saturate(1.25);
}

.tools-menu {
  display: grid;
  gap: 0.2rem;
}

.tools-menu :deep(button) {
  justify-content: flex-start;
  text-align: left;
}

.tools-menu-divider {
  height: 1px;
  margin: 0.35rem 0;
  background: var(--widgetr-border);
}

.tools-menu-label {
  padding: 0.25rem 0.7rem 0.1rem;
  color: var(--widgetr-muted);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.canvas-stage {
  position: absolute;
  inset: 0;
  display: flex;
  z-index: 1;
  margin: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.preview-scroll {
  position: absolute;
  inset: 0;
  align-items: center;
  justify-content: center;
  padding: 7.8rem 2rem 4.8rem;
}

.operation-result,
.change-receipt {
  position: absolute;
  left: 50%;
  z-index: 16;
  width: min(32rem, calc(100vw - 2rem));
  margin: 0;
  transform: translateX(-50%);
}

.operation-result {
  bottom: 5.2rem;
}

.change-receipt {
  bottom: 5.2rem;
  width: max-content;
  min-width: 0;
  max-width: min(28rem, calc(100vw - 2rem));
  padding: 0.38rem 0.45rem 0.38rem 0.4rem;
  background: color-mix(in srgb, var(--widgetr-pane-solid) 68%, transparent);
  box-shadow: 0 14px 32px rgb(29 29 31 / 10%);
  backdrop-filter: blur(22px) saturate(1.2);
  -webkit-backdrop-filter: blur(22px) saturate(1.2);
}

.change-receipt {
  border-color: color-mix(in srgb, var(--widgetr-ink) 12%, transparent);
}

.change-receipt :deep(button) {
  min-height: 2rem;
  border-radius: 999px;
  padding-right: 0.55rem;
  padding-left: 0.55rem;
}

.canvas-footer {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  left: 1rem;
  z-index: 12;
  width: max-content;
  min-height: 0;
  padding: 0.45rem 0.7rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 10%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--widgetr-pane-solid) 58%, transparent);
  box-shadow: 0 10px 26px rgb(29 29 31 / 8%);
  backdrop-filter: blur(18px) saturate(1.15);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
}

.canvas-footer-scope,
.canvas-footer-separator {
  display: none;
}

.canvas-status-dock-shell {
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1rem, env(safe-area-inset-bottom));
  left: max(1rem, env(safe-area-inset-left));
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.4rem;
  pointer-events: none;
}

.canvas-status-dock-shell :deep([data-slot="trigger"]),
.canvas-status-dock-shell :deep(button) {
  pointer-events: auto;
}

.canvas-status-trigger {
  --status-dock-width: min(22rem, calc(100vw - 2rem));
  box-sizing: border-box;
  display: inline-flex;
  width: var(--status-dock-width);
  min-width: var(--status-dock-width);
  max-width: var(--status-dock-width);
  min-height: 2.65rem;
  align-items: center;
  justify-content: flex-start;
  gap: 0.55rem;
  padding: 0.4rem 0.55rem;
  padding-left: 0.6rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 15%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--widgetr-pane-solid) 76%, transparent);
  box-shadow: 0 14px 34px rgb(0 0 0 / 18%), 0 0 0 1px color-mix(in srgb, var(--widgetr-ink) 4%, transparent);
  color: var(--widgetr-ink);
  cursor: pointer;
  overflow: hidden;
  backdrop-filter: blur(24px) saturate(1.25);
  -webkit-backdrop-filter: blur(24px) saturate(1.25);
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease;
}

.canvas-status-trigger:hover {
  background: color-mix(in srgb, var(--widgetr-pane-solid) 88%, transparent);
  border-color: color-mix(in srgb, var(--widgetr-ink) 24%, transparent);
  box-shadow: 0 16px 38px rgb(0 0 0 / 20%), 0 0 0 1px color-mix(in srgb, var(--widgetr-ink) 8%, transparent);
}

.canvas-status-trigger:focus-visible {
  outline: 2px solid var(--widgetr-accent);
  outline-offset: 3px;
}

.status-dock-icon {
  position: relative;
  display: grid;
  width: 1.8rem;
  height: 1.8rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--widgetr-accent) 17%, transparent);
  color: var(--widgetr-accent-strong);
}

.status-dock-icon .i-lucide-bot {
  width: 0.95rem;
  height: 0.95rem;
}

.status-dock-copy {
  display: grid;
  width: auto;
  flex: 1 1 auto;
  min-width: 0;
  gap: 0.08rem;
  overflow: hidden;
  text-align: left;
}

.status-dock-message {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: normal;
  color: var(--widgetr-ink);
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.25;
}

.status-dock-message-enter-active,
.status-dock-message-leave-active {
  transition: opacity 140ms ease;
}

.status-dock-message-enter-from,
.status-dock-message-leave-to {
  opacity: 0;
}

.status-dock-dot {
  position: absolute;
  top: -0.08rem;
  right: -0.08rem;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: var(--widgetr-muted);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--widgetr-pane-solid) 88%, transparent);
}

.canvas-status-trigger-success .status-dock-dot {
  background: var(--widgetr-success);
}

.canvas-status-trigger-warning .status-dock-dot {
  background: var(--widgetr-warning);
  animation: status-pulse 1.4s ease-in-out infinite;
}

.canvas-status-trigger-error .status-dock-dot {
  background: var(--widgetr-danger);
}

@media (prefers-reduced-motion: reduce) {
  .canvas-status-trigger {
    transition: none;
  }

  .status-dock-message-enter-active,
  .status-dock-message-leave-active {
    transition: none;
  }

  .canvas-status-trigger-warning .status-dock-dot {
    animation: none;
  }
}

.studio-alert {
  position: absolute;
  top: 4.6rem;
  left: 1rem;
  z-index: 20;
  width: min(28rem, calc(100vw - 2rem));
  margin: 0;
}

@media (min-width: 56.25rem) and (max-width: 74.999rem) {
  .assistant-status-button :deep([data-slot="leadingIcon"]) {
    display: inline-flex;
  }
}

@media (max-width: 56.249rem) {
  :global(body > [data-slot="content"][data-side="left"]),
  :global(body > [data-slot="content"][data-side="right"]) {
    top: auto !important;
    right: 0.75rem !important;
    bottom: calc(max(0.75rem, env(safe-area-inset-bottom)) + 3.5rem) !important;
    left: 0.75rem !important;
    width: auto !important;
    max-width: none !important;
    max-height: min(calc(80dvh - 3.5rem), 42rem) !important;
    border-radius: 1.35rem !important;
  }

  .studio-topbar {
    min-height: 3.25rem;
    padding: 0.45rem max(0.65rem, env(safe-area-inset-right)) 0.45rem max(0.65rem, env(safe-area-inset-left));
  }

  .topbar-leading {
    max-width: calc(100vw - 10rem);
  }

  .topbar-leading :deep(.topbar-brand-logo) {
    height: 1.2rem;
  }

  .wordmark {
    display: none;
  }

  .canvas-floating-controls {
    width: max-content;
    max-width: calc(100vw - 1rem);
    overflow-x: auto;
  }

  .topbar-projects-trigger,
  .history-actions :deep(button) {
    width: var(--widgetr-touch-target);
    min-width: var(--widgetr-touch-target);
    min-height: var(--widgetr-touch-target);
  }

  .topbar-projects-trigger {
    width: var(--widgetr-touch-target);
    min-width: var(--widgetr-touch-target);
    min-height: var(--widgetr-touch-target);
  }

  .history-actions {
    height: var(--widgetr-touch-target);
    min-height: var(--widgetr-touch-target);
  }

  .canvas-floating-controls .floating-tools-trigger {
    width: var(--widgetr-touch-target);
    min-width: var(--widgetr-touch-target);
    min-height: var(--widgetr-touch-target);
  }

  .assistant-status-button {
    width: var(--widgetr-touch-target);
    min-width: var(--widgetr-touch-target);
    min-height: var(--widgetr-touch-target);
    padding-right: 0.45rem;
    padding-left: 0.45rem;
  }

  .assistant-status-button :deep([data-slot="label"]) {
    display: none;
  }

  .assistant-status-button :deep([data-slot="leadingIcon"]) {
    display: inline-flex;
  }

  .preview-caption-button {
    min-width: var(--widgetr-touch-target);
    min-height: var(--widgetr-touch-target);
  }

  .preview-scroll {
    padding: 11.5rem 0.75rem 4.8rem;
  }

  .canvas-footer {
    right: 0.75rem;
    bottom: 0.75rem;
    left: 0.75rem;
    justify-content: center;
    border-radius: 1rem;
  }

  .canvas-status-dock-shell {
    right: max(0.75rem, env(safe-area-inset-right));
    bottom: max(0.75rem, env(safe-area-inset-bottom));
    left: max(0.75rem, env(safe-area-inset-left));
  }

  .canvas-status-trigger {
    --status-dock-width: min(22rem, calc(100vw - 1.5rem));
    min-height: var(--widgetr-touch-target);
  }

  .studio-alert {
    top: 8rem;
    right: 0.75rem;
    left: 0.75rem;
    width: auto;
  }
}

@media (max-width: 30rem) {
  .topbar-trailing {
    gap: 0.55rem;
  }

  .topbar-leading {
    max-width: calc(100vw - 12rem);
  }

  .canvas-floating-controls {
    padding: 0.2rem;
  }

  .canvas-floating-controls .size-control {
    min-width: 3rem;
  }

  .canvas-status-trigger {
    padding-right: 0.45rem;
    padding-left: 0.4rem;
  }

  .status-dock-message {
    font-size: 0.66rem;
  }

  .canvas-project-title h2 {
    font-size: 0.98rem;
  }

}
</style>
