<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WebMcpContext, WebMcpStatus } from '~/types/webmcp'

type AgentHistoryEntry = {
  id: string
  message: string
  detail: string
  direction: 'past' | 'future'
}

type AgentPanelTab = 'history' | 'tools'

const props = withDefaults(defineProps<{
  open: boolean
  status: WebMcpStatus
  context: WebMcpContext
  toolNames: string[]
  error: string | null
  history?: AgentHistoryEntry[]
}>(), {
  history: () => []
})

const tabOrder: AgentPanelTab[] = ['history', 'tools']
const activeTab = ref<AgentPanelTab>(props.history.length > 0 ? 'history' : 'tools')

function selectTab(tab: AgentPanelTab): void {
  activeTab.value = tab
}

function handleTabKeydown(event: KeyboardEvent): void {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return
  }

  const currentTab = (event.currentTarget as HTMLButtonElement).dataset.agentTab as AgentPanelTab
  const currentIndex = tabOrder.indexOf(currentTab)
  let nextIndex = currentIndex

  if (event.key === 'Home') {
    nextIndex = 0
  } else if (event.key === 'End') {
    nextIndex = tabOrder.length - 1
  } else if (event.key === 'ArrowLeft') {
    nextIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length
  } else if (event.key === 'ArrowRight') {
    nextIndex = (currentIndex + 1) % tabOrder.length
  }

  event.preventDefault()
  const nextTab = tabOrder[nextIndex]!
  selectTab(nextTab)
  requestAnimationFrame(() => {
    document.querySelector<HTMLButtonElement>(`[data-agent-tab="${nextTab}"]`)?.focus()
  })
}

watch(() => props.open, (open) => {
  if (open) {
    activeTab.value = props.history.length > 0 ? 'history' : 'tools'
  }
})

watch(() => props.history.length, (historyLength) => {
  if (historyLength === 0 && activeTab.value === 'history') {
    activeTab.value = 'tools'
  }
})

const statusLabel = computed(() => {
  switch (props.status) {
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

const statusColor = computed(() => {
  switch (props.status) {
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

const contextLabel = computed(() => {
  switch (props.context) {
    case 'none':
      return 'Nothing selected'
    case 'text':
      return 'Text selected'
    case 'image':
      return 'Image selected'
    case 'group':
      return 'Group selected'
    default:
      return 'Selection type not supported'
  }
})
</script>

<template>
  <section class="agent-tools-panel" aria-labelledby="agent-tools-heading">
    <div class="panel-heading">
      <h2 id="agent-tools-heading">Assistant handoff</h2>
      <UIcon name="i-lucide-bot" aria-hidden="true" />
    </div>

    <div class="agent-tools-meta">
      <UBadge :color="statusColor" variant="soft" :label="statusLabel" />
      <span>{{ contextLabel }}</span>
    </div>

    <div class="agent-panel-tabs" role="tablist" aria-label="Assistant handoff views">
      <button
        id="agent-history-tab"
        type="button"
        class="agent-panel-tab"
        :class="{ 'is-active': activeTab === 'history' }"
        role="tab"
        :aria-selected="activeTab === 'history'"
        aria-controls="agent-history-panel"
        :tabindex="activeTab === 'history' ? 0 : -1"
        data-agent-tab="history"
        @click="selectTab('history')"
        @keydown="handleTabKeydown"
      >
        <UIcon name="i-lucide-history" aria-hidden="true" />
        <span>History</span>
        <span v-if="history.length" class="agent-panel-tab-count">{{ history.length }}</span>
      </button>
      <button
        id="agent-tools-tab"
        type="button"
        class="agent-panel-tab"
        :class="{ 'is-active': activeTab === 'tools' }"
        role="tab"
        :aria-selected="activeTab === 'tools'"
        aria-controls="agent-tools-panel"
        :tabindex="activeTab === 'tools' ? 0 : -1"
        data-agent-tab="tools"
        @click="selectTab('tools')"
        @keydown="handleTabKeydown"
      >
        <UIcon name="i-lucide-wand-sparkles" aria-hidden="true" />
        <span>Tools</span>
        <span v-if="toolNames.length" class="agent-panel-tab-count">{{ toolNames.length }}</span>
      </button>
    </div>

    <div
      v-if="activeTab === 'history'"
      id="agent-history-panel"
      class="agent-panel-view agent-history-view"
      role="tabpanel"
      aria-labelledby="agent-history-tab"
      tabindex="0"
    >
      <div v-if="history.length" class="agent-history-list" aria-label="Session history">
        <div
          v-for="historyEntry in history"
          :key="historyEntry.id"
          class="agent-history-item"
          :class="`agent-history-item-${historyEntry.direction}`"
        >
          <span class="agent-history-icon" aria-hidden="true">
            <UIcon :name="historyEntry.direction === 'future' ? 'i-lucide-redo-2' : 'i-lucide-undo-2'" />
          </span>
          <span class="agent-history-copy">
            <span class="agent-history-message">{{ historyEntry.message }}</span>
            <span class="agent-history-detail">{{ historyEntry.detail }}</span>
          </span>
        </div>
      </div>
      <p v-else class="agent-tools-empty">
        No changes yet. Available assistant tools are in Tools.
      </p>
    </div>

    <div
      v-else
      id="agent-tools-panel"
      class="agent-panel-view agent-tools-view"
      role="tabpanel"
      aria-labelledby="agent-tools-tab"
      tabindex="0"
    >
      <UAlert
        v-if="status === 'unsupported'"
        color="neutral"
        variant="subtle"
        icon="i-lucide-plug-zap"
        title="Assistant unavailable"
        description="Continue building locally, or open this page in a WebMCP-enabled browser so your AI assistant can work with it."
      />
      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        title="Assistant tools could not be prepared"
        :description="error"
      />

      <div v-if="toolNames.length" class="agent-tools-list">
        <p class="agent-tools-label">Available now</p>
        <ul>
          <li v-for="toolName in toolNames" :key="toolName">
            <UIcon name="i-lucide-wand-sparkles" aria-hidden="true" />
            <code>{{ toolName }}</code>
          </li>
        </ul>
      </div>
      <p v-else-if="status === 'registering'" class="agent-tools-empty">
        Updating the contextual tool set.
      </p>
      <p v-else-if="status === 'registered'" class="agent-tools-empty">
        No contextual tools are available for this selection.
      </p>
    </div>
  </section>
</template>

<style scoped>
.agent-tools-panel {
  display: grid;
  align-content: start;
  gap: 0.8rem;
  padding: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 12%, transparent);
  border-radius: var(--widgetr-radius-panel);
  background: color-mix(in srgb, var(--widgetr-pane-solid) 78%, transparent);
  box-shadow: 0 18px 44px rgb(29 29 31 / 14%);
  backdrop-filter: blur(24px) saturate(1.25);
  -webkit-backdrop-filter: blur(24px) saturate(1.25);
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.panel-heading h2 {
  color: var(--widgetr-ink);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.panel-heading > .i-lucide-bot {
  color: var(--widgetr-accent);
}

.agent-panel-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.2rem;
  padding: 0.2rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 10%, transparent);
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--widgetr-stage) 48%, transparent);
}

.agent-panel-tab {
  display: inline-flex;
  min-width: 0;
  min-height: 2rem;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border: 0;
  border-radius: 0.65rem;
  background: transparent;
  color: var(--widgetr-muted);
  cursor: pointer;
  font-size: 0.68rem;
  font-weight: 650;
  transition: background-color 160ms ease, color 160ms ease;
}

.agent-panel-tab:hover {
  color: var(--widgetr-ink);
}

.agent-panel-tab.is-active {
  background: color-mix(in srgb, var(--widgetr-pane-solid) 82%, transparent);
  color: var(--widgetr-ink);
  box-shadow: 0 2px 8px rgb(29 29 31 / 8%);
}

.agent-panel-tab:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--widgetr-accent) 65%, transparent);
  outline-offset: 2px;
}

.agent-panel-tab > .i-lucide-history,
.agent-panel-tab > .i-lucide-wand-sparkles {
  width: 0.8rem;
  height: 0.8rem;
  flex: 0 0 auto;
}

.agent-panel-tab-count {
  min-width: 1.1rem;
  padding: 0.08rem 0.25rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--widgetr-accent) 13%, transparent);
  color: var(--widgetr-accent-strong);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  line-height: 1.2;
  text-align: center;
}

.agent-panel-view {
  display: grid;
  min-width: 0;
  gap: 0.8rem;
}

.agent-history-list {
  max-height: min(22rem, 48vh);
  overflow-y: auto;
  padding-right: 0.2rem;
  scrollbar-gutter: stable;
}

.agent-history-item {
  display: grid;
  grid-template-columns: 1.15rem minmax(0, 1fr);
  gap: 0.55rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--widgetr-border);
}

.agent-history-item:first-child {
  padding-top: 0;
}

.agent-history-item:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.agent-history-icon {
  display: inline-flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 0.1rem;
  color: var(--widgetr-accent);
}

.agent-history-item-future .agent-history-icon {
  color: var(--widgetr-muted);
}

.agent-history-icon > svg {
  width: 0.85rem;
  height: 0.85rem;
}

.agent-history-copy {
  display: grid;
  min-width: 0;
  gap: 0.16rem;
}

.agent-history-message,
.agent-history-detail {
  min-width: 0;
  overflow-wrap: anywhere;
}

.agent-history-message {
  color: var(--widgetr-ink);
  font-size: 0.7rem;
  line-height: 1.35;
}

.agent-history-detail {
  color: var(--widgetr-muted);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  text-transform: uppercase;
}

.agent-tools-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  color: var(--widgetr-muted);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  text-transform: uppercase;
}

.agent-tools-list {
  display: grid;
  gap: 0.45rem;
}

.agent-tools-label {
  color: var(--widgetr-muted);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.agent-tools-list ul {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.agent-tools-list li {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.45rem;
  color: var(--widgetr-muted);
  font-size: 0.7rem;
}

.agent-tools-list li .i-lucide-wand-sparkles {
  flex: 0 0 auto;
  color: var(--widgetr-accent);
}

.agent-tools-list code {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--widgetr-ink);
  font-family: var(--font-mono);
  font-size: 0.62rem;
}

.agent-tools-empty {
  color: var(--widgetr-muted);
  font-size: 0.72rem;
  line-height: 1.5;
}

@media (prefers-reduced-motion: reduce) {
  .agent-panel-tab {
    transition: none;
  }
}
</style>
