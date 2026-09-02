<script setup lang="ts">
import { computed, ref } from 'vue'

type AssistantOptionId = 'chatgpt' | 'claude' | 'hermes' | 'openclaw'

interface AssistantOption {
  id: AssistantOptionId
  name: string
  status: string
  detail: string
}

const assistantOptions: AssistantOption[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT desktop',
    status: 'Recommended',
    detail: 'Site tools are not available on the Luna model. Choose a model that supports them to let the assistant control Widgetr.'
  },
  {
    id: 'claude',
    name: 'Claude Desktop',
    status: 'Setup required',
    detail: 'Claude Desktop supports MCP servers, but it does not automatically discover actions registered by an open webpage.'
  },
  {
    id: 'hermes',
    name: 'Hermes',
    status: 'Setup required',
    detail: 'Hermes supports MCP servers and browser tools. Connect Widgetr before asking it to edit the canvas.'
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    status: 'Setup required',
    detail: 'OpenClaw can control an isolated or existing browser. Add a bridge if you want structured Widgetr actions.'
  }
]

const selectedAssistantId = ref<AssistantOptionId>('chatgpt')
const selectedAssistant = computed(() => (
  assistantOptions.find(option => option.id === selectedAssistantId.value) ?? assistantOptions[0]!
))

function selectAssistant(id: AssistantOptionId): void {
  selectedAssistantId.value = id
}
</script>

<template>
  <section class="assistant-choice" aria-labelledby="assistant-choice-heading">
    <h2 id="assistant-choice-heading" class="assistant-choice-label">Assistant</h2>

    <div class="assistant-choice-list" role="group" aria-label="Choose an assistant">
      <button
        v-for="option in assistantOptions"
        :key="option.id"
        type="button"
        class="assistant-choice-option"
        :class="{ 'is-selected': selectedAssistantId === option.id }"
        :aria-pressed="selectedAssistantId === option.id"
        :aria-label="option.status === 'Recommended' ? `${option.name}, recommended` : option.name"
        @click="selectAssistant(option.id)"
      >
        <span>{{ option.name }}</span>
        <span v-if="option.status === 'Recommended'" class="assistant-choice-option-badge">Recommended</span>
      </button>
    </div>

    <p class="assistant-choice-detail" role="status" aria-live="polite">
      <strong v-if="selectedAssistant.status !== 'Recommended'">{{ selectedAssistant.status }}.</strong>
      <span>{{ selectedAssistant.detail }}</span>
    </p>
  </section>
</template>

<style scoped>
.assistant-choice {
  display: grid;
  gap: 0.45rem;
  margin-top: 1.45rem;
}

.assistant-choice-label {
  margin: 0;
  color: var(--widgetr-accent-strong);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  font-weight: 650;
  letter-spacing: 0.12em;
  line-height: 1.4;
  text-transform: uppercase;
}

.assistant-choice-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.15rem;
}

.assistant-choice-option {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0.3rem 0.55rem;
  border: 1px solid var(--widgetr-border);
  border-radius: 0.35rem;
  background: transparent;
  color: var(--widgetr-muted);
  cursor: pointer;
  font-size: 0.63rem;
  font-weight: 650;
  text-align: left;
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
}

.assistant-choice-option-badge {
  position: absolute;
  top: -0.48rem;
  right: 0.3rem;
  z-index: 1;
  padding: 0.16rem 0.3rem;
  border: 2px solid var(--widgetr-app);
  border-radius: 999px;
  background: var(--widgetr-success);
  color: var(--widgetr-app);
  font-family: var(--font-mono);
  font-size: 0.46rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.assistant-choice-option:hover,
.assistant-choice-option:focus-visible {
  background: color-mix(in srgb, var(--widgetr-pane-solid) 38%, transparent);
}

.assistant-choice-option:focus-visible {
  outline: 2px solid var(--widgetr-accent);
  outline-offset: 0.1rem;
}

.assistant-choice-option.is-selected {
  color: var(--widgetr-ink);
  border-color: var(--widgetr-accent);
  background: color-mix(in srgb, var(--widgetr-accent) 8%, transparent);
}

.assistant-choice-detail {
  margin: 0;
  color: var(--widgetr-muted);
  font-size: 0.64rem;
  line-height: 1.45;
}

.assistant-choice-detail strong {
  color: var(--widgetr-ink);
  font-weight: 700;
}

.assistant-choice-detail strong + span {
  margin-left: 0.25rem;
}

</style>
