<script setup lang="ts">
import { computed } from 'vue'
import { describeWebMcpStatus } from '~/domain/widget/webmcp-status'
import type { WebMcpStatus } from '~/types/webmcp'

const props = withDefaults(defineProps<{
  status: WebMcpStatus
  error?: string | null
  compact?: boolean
  inline?: boolean
  retryLabel?: string
}>(), {
  error: null,
  compact: false,
  inline: false,
  retryLabel: 'Try again'
})

const emit = defineEmits<{
  retry: []
}>()

const statusCopy = computed(() => describeWebMcpStatus(props.status))
</script>

<template>
  <section
    class="webmcp-readiness"
    :class="[
      `webmcp-readiness-${statusCopy.color}`,
      `webmcp-readiness-${props.status}`,
      {
        'webmcp-readiness-compact': props.compact,
        'webmcp-readiness-inline': props.inline
      }
    ]"
    data-testid="webmcp-readiness"
    role="status"
    aria-live="polite"
  >
    <span class="webmcp-readiness-icon" aria-hidden="true">
      <UIcon :name="statusCopy.icon" />
    </span>
    <div class="webmcp-readiness-copy">
      <strong>{{ statusCopy.label }}</strong>
      <p>{{ statusCopy.description }}</p>
      <p v-if="props.error" class="webmcp-readiness-error">{{ props.error }}</p>
      <div v-if="props.status === 'error'" class="webmcp-readiness-actions">
        <UButton
          :label="props.retryLabel"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          size="xs"
          @click="emit('retry')"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.webmcp-readiness {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 12%, transparent);
  border-radius: var(--widgetr-radius-panel);
  background: color-mix(in srgb, var(--widgetr-pane-solid) 58%, transparent);
}

.webmcp-readiness-compact {
  padding: 0.65rem 0.75rem;
}

.webmcp-readiness-inline {
  align-items: center;
  padding: 0.35rem 0 0.65rem;
  border: 0;
  border-bottom: 1px solid var(--widgetr-border);
  border-radius: 0;
  background: transparent;
}

.webmcp-readiness-inline .webmcp-readiness-copy {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.15rem 0.45rem;
}

.webmcp-readiness-inline .webmcp-readiness-copy p {
  flex: 1 0 100%;
}

.webmcp-readiness-icon {
  display: grid;
  width: 1.65rem;
  height: 1.65rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--widgetr-muted) 13%, transparent);
  color: var(--widgetr-muted);
}

.webmcp-readiness-icon .i-lucide {
  width: 0.9rem;
  height: 0.9rem;
}

.webmcp-readiness-copy {
  display: grid;
  min-width: 0;
  gap: 0.16rem;
}

.webmcp-readiness-copy strong {
  color: var(--widgetr-ink);
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.25;
}

.webmcp-readiness-copy p {
  margin: 0;
  color: var(--widgetr-muted);
  font-size: 0.68rem;
  line-height: 1.45;
}

.webmcp-readiness-error {
  overflow-wrap: anywhere;
}

.webmcp-readiness-actions {
  display: flex;
  margin-top: 0.35rem;
}

.webmcp-readiness-warning .webmcp-readiness-icon {
  background: color-mix(in srgb, var(--widgetr-warning) 15%, transparent);
  color: var(--widgetr-warning);
}

.webmcp-readiness-success .webmcp-readiness-icon {
  background: color-mix(in srgb, var(--widgetr-success) 15%, transparent);
  color: var(--widgetr-success);
}

.webmcp-readiness-error .webmcp-readiness-icon {
  background: color-mix(in srgb, var(--widgetr-danger) 15%, transparent);
  color: var(--widgetr-danger);
}

.webmcp-readiness-registering .webmcp-readiness-icon .i-lucide-loader-circle,
.webmcp-readiness-working .webmcp-readiness-icon .i-lucide-loader-circle {
  animation: webmcp-readiness-spin 1.2s linear infinite;
}

@keyframes webmcp-readiness-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .webmcp-readiness-registering .webmcp-readiness-icon .i-lucide-loader-circle,
  .webmcp-readiness-working .webmcp-readiness-icon .i-lucide-loader-circle {
    animation: none;
  }
}
</style>
