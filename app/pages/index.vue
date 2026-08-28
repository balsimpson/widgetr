<script setup lang="ts">
import { computed, ref } from 'vue'
import { createSampleWidgetProject } from '~/domain/widget/fixture'
import { applyWidgetOperation } from '~/domain/widget/operations'
import { resolveDesignScope } from '~/domain/widget/schema'
import { generateScriptableCode } from '~/domain/widget/scriptable'
import { WIDGET_SIZES } from '~/types/widget'
import type {
  DesignScope,
  OperationResult,
  WidgetOperation,
  WidgetSize
} from '~/types/widget'

useHead({
  title: 'Widgetr export kernel',
  meta: [
    {
      name: 'description',
      content: 'Phase 2 developer harness for Widgetr canonical state, browser rendering, and Scriptable export.'
    }
  ]
})

const project = ref(createSampleWidgetProject())
const lastResult = ref<OperationResult | null>(null)

const scopeOptions: Array<{ key: string, label: string, scope: DesignScope }> = [
  {
    key: 'small',
    label: 'Small',
    scope: { kind: 'one', size: 'small' }
  },
  {
    key: 'small-medium',
    label: 'Small + medium',
    scope: { kind: 'several', sizes: ['small', 'medium'] }
  },
  {
    key: 'all',
    label: 'All sizes',
    scope: { kind: 'all' }
  }
]

function scopeKey(scope: DesignScope): string {
  if (scope.kind === 'all') {
    return 'all'
  }
  if (scope.kind === 'one') {
    return scope.size
  }
  return scope.sizes.join('-')
}

const activeScopeKey = computed(() => scopeKey(project.value.designScope))
const activeSizes = computed(() => resolveDesignScope(project.value.designScope))
const exportResult = computed(() => generateScriptableCode(project.value))
const generatedSource = computed(() => exportResult.value.code ?? '')
const blockingIssues = computed(() => exportResult.value.issues.filter(issue => issue.severity === 'blocking'))
const warningIssues = computed(() => exportResult.value.issues.filter(issue => issue.severity === 'warning'))
const exportReady = computed(() => generatedSource.value.length > 0)
const sourceOpen = ref(false)
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')

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

const resultColor = computed(() => {
  if (!lastResult.value) {
    return 'neutral'
  }
  return lastResult.value.ok ? 'success' : 'error'
})

const resultIcon = computed(() => (
  lastResult.value?.ok ? 'i-lucide-check-circle-2' : 'i-lucide-circle-alert'
))

function commitOperation(operation: WidgetOperation): void {
  const result = applyWidgetOperation(project.value, operation)
  lastResult.value = result
  if (result.ok) {
    project.value = result.state
  }
}

function setScope(scope: DesignScope): void {
  commitOperation({
    type: 'set-design-scope',
    expectedRevision: project.value.revision,
    scope
  })
}

function markTemperature(): void {
  commitOperation({
    type: 'update-text-style',
    expectedRevision: project.value.revision,
    elementId: 'temperature',
    patch: {
      color: '#F6C453'
    }
  })
}

function fadeTemperature(): void {
  commitOperation({
    type: 'update-element-style',
    expectedRevision: project.value.revision,
    elementId: 'temperature',
    patch: {
      opacity: 0.42
    }
  })
}

function tryStaleRevision(): void {
  const staleRevision = project.value.revision === 0
    ? project.value.revision + 1
    : project.value.revision - 1

  commitOperation({
    type: 'update-element-style',
    expectedRevision: staleRevision,
    elementId: 'temperature',
    scope: { kind: 'all' },
    patch: {
      opacity: 0.1
    }
  })
}

function isActiveSize(size: WidgetSize): boolean {
  return activeSizes.value.includes(size)
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
</script>

<template>
  <main class="kernel-shell">
    <header class="kernel-header">
      <div>
        <p class="phase-label">Kernel / phases 1 + 2</p>
        <h1>One state. Three honest layouts.</h1>
        <p class="kernel-summary">
          A fixed sample proves that shared data can drive intentionally different Scriptable widget sizes through one rendering path, then become one deterministic file for the phone.
        </p>
      </div>

      <div class="revision-readout" aria-label="Current project revision">
        <span>Revision</span>
        <strong>{{ project.revision.toString().padStart(2, '0') }}</strong>
      </div>
    </header>

    <section class="operation-bench" aria-labelledby="operation-heading">
      <div class="bench-heading">
        <div>
          <p class="bench-kicker">Operation bench</p>
          <h2 id="operation-heading">Choose the sizes, then make one change</h2>
        </div>
        <UBadge
          color="neutral"
          variant="soft"
          :label="project.data.label"
        />
      </div>

      <div class="bench-controls">
        <div class="control-group">
          <span class="control-label">Design scope</span>
          <div class="button-row">
            <UButton
              v-for="option in scopeOptions"
              :key="option.key"
              :label="option.label"
              size="sm"
              :color="activeScopeKey === option.key ? 'primary' : 'neutral'"
              :variant="activeScopeKey === option.key ? 'solid' : 'outline'"
              :disabled="activeScopeKey === option.key"
              @click="setScope(option.scope)"
            />
          </div>
        </div>

        <div class="control-group">
          <span class="control-label">Shared operation path</span>
          <div class="button-row">
            <UButton
              label="Mark temperature"
              icon="i-lucide-highlighter"
              color="neutral"
              variant="outline"
              size="sm"
              @click="markTemperature"
            />
            <UButton
              label="Fade temperature"
              icon="i-lucide-blend"
              color="neutral"
              variant="outline"
              size="sm"
              @click="fadeTemperature"
            />
            <UButton
              label="Try stale revision"
              icon="i-lucide-shield-x"
              color="warning"
              variant="outline"
              size="sm"
              @click="tryStaleRevision"
            />
          </div>
        </div>
      </div>

      <UAlert
        v-if="lastResult"
        class="operation-result"
        :color="resultColor"
        variant="subtle"
        :icon="resultIcon"
        :title="lastResult.ok ? `Revision ${lastResult.revision}` : lastResult.code"
        :description="lastResult.message"
      />
    </section>

    <section class="export-bench" aria-labelledby="export-heading">
      <div class="export-heading">
        <div>
          <p class="bench-kicker">Export / phase 2</p>
          <h2 id="export-heading">One deterministic file for three widget families</h2>
          <p class="export-summary">
            The viewer, Copy action, and downloaded file all read the same generated source string. Scriptable chooses the layout through <code>config.widgetFamily</code>.
          </p>
        </div>

        <UBadge
          :color="exportStatusColor"
          variant="soft"
          :label="exportStatusLabel"
        />
      </div>

      <UAlert
        v-if="blockingIssues.length"
        class="export-alert"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        title="Export is blocked"
        :description="blockingDescription"
      />

      <UAlert
        v-else-if="warningIssues.length"
        class="export-alert"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Export is ready with review notes"
        :description="warningDescription"
      />

      <UAlert
        v-if="copyState === 'failed'"
        class="export-alert"
        color="error"
        variant="subtle"
        icon="i-lucide-clipboard-x"
        title="Copy did not complete"
        description="Use the read-only viewer or download the file instead."
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
        {{ generatedSource.length.toLocaleString() }} characters · includes data loading, cache fallback, Keychain lookup, backgrounds, all supported elements, and small/medium/large branches.
      </p>
    </section>

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

    <section class="preview-bench" aria-labelledby="preview-heading">
      <div class="preview-heading-row">
        <div>
          <p class="bench-kicker">Browser renderer</p>
          <h2 id="preview-heading">Three layout trees over the same data</h2>
        </div>

        <div class="scope-indicator" aria-label="Sizes in the active design scope">
          <span
            v-for="size in WIDGET_SIZES"
            :key="size"
            :class="{ active: isActiveSize(size) }"
          >{{ size }}</span>
        </div>
      </div>

      <div class="preview-scroll">
        <div class="preview-grid">
          <WidgetPreview
            v-for="size in WIDGET_SIZES"
            :key="size"
            :project="project"
            :size="size"
          />
        </div>
      </div>

      <p class="support-note">
        Supported in this fixture: text, dates, images, symbols, groups, spacers, repeats, solid fills, gradients, and image backgrounds.
      </p>
    </section>
  </main>
</template>

<style scoped>
.kernel-shell {
  width: min(100%, 76rem);
  min-height: 100vh;
  margin: 0 auto;
  padding: 3rem 2rem 4rem;
}

.kernel-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2rem;
  align-items: end;
  padding-bottom: 2rem;
}

.phase-label,
.bench-kicker,
.control-label,
.revision-readout span {
  color: var(--ui-text-muted);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.kernel-header h1 {
  max-width: 19ch;
  margin-top: 0.6rem;
  color: var(--widgetr-ink);
  font-size: clamp(2.2rem, 5vw, 4.75rem);
  font-weight: 650;
  letter-spacing: -0.055em;
  line-height: 0.95;
}

.kernel-summary {
  max-width: 43rem;
  margin-top: 1.25rem;
  color: var(--ui-text-muted);
  font-size: 1rem;
  line-height: 1.65;
}

.revision-readout {
  display: grid;
  justify-items: end;
  padding-bottom: 0.35rem;
}

.revision-readout strong {
  color: var(--widgetr-cobalt);
  font-family: var(--font-mono);
  font-size: 2.5rem;
  font-weight: 500;
  letter-spacing: -0.08em;
  line-height: 1;
}

.operation-bench {
  border-top: 1px solid var(--ui-border-muted);
  border-bottom: 1px solid var(--ui-border-muted);
  padding: 1.5rem 0;
}

.bench-heading,
.preview-heading-row {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: start;
}

.bench-heading h2,
.preview-heading-row h2 {
  margin-top: 0.25rem;
  color: var(--widgetr-ink);
  font-size: 1.15rem;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.bench-controls {
  display: grid;
  grid-template-columns: minmax(15rem, 0.7fr) minmax(24rem, 1.3fr);
  gap: 2rem;
  margin-top: 1.25rem;
}

.control-group {
  display: grid;
  gap: 0.55rem;
  align-content: start;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.operation-result {
  margin-top: 1rem;
}

.export-bench {
  display: grid;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1.5rem 0;
  border-top: 1px solid var(--ui-border-muted);
  border-bottom: 1px solid var(--ui-border-muted);
}

.export-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.export-heading h2 {
  margin-top: 0.25rem;
  color: var(--widgetr-ink);
  font-size: 1.15rem;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.export-summary {
  max-width: 46rem;
  margin-top: 0.65rem;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  line-height: 1.55;
}

.export-summary code,
.export-note {
  font-family: var(--font-mono);
}

.export-summary code {
  color: var(--widgetr-ink);
  font-size: 0.8em;
}

.export-alert {
  max-width: 62rem;
}

.export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.export-note {
  color: var(--ui-text-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
}

.export-code :deep(textarea) {
  min-height: 34rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1.55;
  white-space: pre;
}

.preview-bench {
  position: relative;
  margin-top: 2rem;
  padding: 1.75rem;
  overflow: hidden;
  border: 1px solid var(--ui-border-muted);
  border-radius: 1.25rem;
  background-color: var(--ui-bg);
  background-image:
    linear-gradient(var(--ui-border-muted) 1px, transparent 1px),
    linear-gradient(90deg, var(--ui-border-muted) 1px, transparent 1px);
  background-size: 24px 24px;
  box-shadow: 0 24px 70px rgb(23 32 51 / 8%);
}

.preview-heading-row {
  position: relative;
  z-index: 1;
}

.scope-indicator {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  text-transform: uppercase;
}

.scope-indicator span {
  padding: 0.25rem 0.45rem;
  border: 1px solid var(--ui-border-muted);
  border-radius: 999px;
  background: var(--ui-bg);
  color: var(--ui-text-dimmed);
}

.scope-indicator span.active {
  border-color: var(--widgetr-cobalt);
  color: var(--widgetr-cobalt);
}

.preview-scroll {
  position: relative;
  z-index: 1;
  margin: 2rem -0.25rem 0;
  padding: 0.5rem 0.25rem 1.5rem;
  overflow-x: auto;
}

.preview-grid {
  display: grid;
  grid-template-columns: 158px 338px 338px;
  gap: 2rem;
  width: max-content;
  align-items: start;
}

.support-note {
  position: relative;
  z-index: 1;
  margin-top: 0.25rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  line-height: 1.5;
}

@media (max-width: 52rem) {
  .kernel-shell {
    padding: 2rem 1rem 3rem;
  }

  .kernel-header {
    grid-template-columns: 1fr;
  }

  .revision-readout {
    justify-items: start;
  }

  .bench-heading,
  .preview-heading-row,
  .export-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .bench-controls {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .preview-bench {
    padding: 1.25rem 0.5rem;
  }

  .preview-grid {
    grid-template-columns: max-content;
  }
}
</style>
