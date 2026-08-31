<script setup lang="ts">
import { computed } from 'vue'
import type { WebMcpContext, WebMcpStatus } from '~/types/webmcp'

const props = defineProps<{
  status: WebMcpStatus
  context: WebMcpContext
  toolNames: string[]
  error: string | null
}>()

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
  </section>
</template>

<style scoped>
.agent-tools-panel {
  display: grid;
  align-content: start;
  gap: 0.8rem;
  padding: 1.25rem;
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
</style>
