<script setup lang="ts">
import { computed } from 'vue'
import type { WebMcpContext, WebMcpStatus } from '~/types/webmcp'

const props = defineProps<{
  status: WebMcpStatus
  context: WebMcpContext
  revision: number
  toolNames: string[]
  error: string | null
}>()

const emit = defineEmits<{
  clearSelection: []
}>()

const statusLabel = computed(() => {
  switch (props.status) {
    case 'registered':
      return 'Registered'
    case 'registering':
      return 'Registering'
    case 'error':
      return 'Registration issue'
    default:
      return 'Unavailable'
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
      <div>
        <p class="panel-kicker">WebMCP</p>
        <h2 id="agent-tools-heading">Agent tools</h2>
      </div>
      <UIcon name="i-lucide-bot" aria-hidden="true" />
    </div>

    <div class="agent-tools-meta">
      <UBadge :color="statusColor" variant="soft" :label="statusLabel" />
      <span>{{ contextLabel }}</span>
      <span>rev {{ revision }}</span>
    </div>

    <UButton
      v-if="context !== 'none'"
      class="w-full"
      color="neutral"
      icon="i-lucide-x"
      label="Clear selection"
      variant="outline"
      @click="emit('clearSelection')"
    />

    <UAlert
      v-if="status === 'unsupported'"
      color="neutral"
      variant="subtle"
      icon="i-lucide-plug-zap"
      title="WebMCP is not available in this browser"
      description="The editor remains usable. Use a WebMCP-enabled browser to let an external agent work with this page."
    />
    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Agent tools could not be registered"
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
  border-top: 1px solid var(--ui-border-muted);
}

.agent-tools-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  color: var(--ui-text-muted);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  text-transform: uppercase;
}

.agent-tools-list {
  display: grid;
  gap: 0.45rem;
}

.agent-tools-label {
  color: var(--ui-text-muted);
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
  color: var(--ui-text-muted);
  font-size: 0.7rem;
}

.agent-tools-list li .i-lucide-wand-sparkles {
  flex: 0 0 auto;
  color: var(--widgetr-cobalt);
}

.agent-tools-list code {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--ui-text-toned);
  font-family: var(--font-mono);
  font-size: 0.62rem;
}

.agent-tools-empty {
  color: var(--ui-text-muted);
  font-size: 0.72rem;
  line-height: 1.5;
}
</style>
