<script setup lang="ts">
import { computed } from 'vue'
import type { WebMcpStatus } from '~/types/webmcp'

const props = defineProps<{
  assistantMessage: string
  copyState: 'idle' | 'copied' | 'failed'
  hasSavedProjects: boolean
  webmcpStatus: WebMcpStatus
  webmcpError: string | null
  webmcpToolNames: string[]
}>()

const emit = defineEmits<{
  copy: []
  retry: []
}>()

const copyLabel = computed(() => {
  if (props.copyState === 'copied') {
    return 'Copied message'
  }
  if (props.copyState === 'failed') {
    return 'Try copying again'
  }
  return 'Copy message'
})

const copyReceipt = computed(() => {
  if (props.copyState === 'copied') {
    return 'Message copied. Paste it into your assistant’s chat.'
  }
  if (props.copyState === 'failed') {
    return 'Copy failed. Select the message and copy it manually.'
  }
  return ''
})

const toolCountLabel = computed(() => (
  `${props.webmcpToolNames.length} ${props.webmcpToolNames.length === 1 ? 'action' : 'actions'}`
))
</script>

<template>
  <main class="homepage" aria-labelledby="homepage-heading">
    <div class="homepage-frame">
      <header class="homepage-topbar">
        <UColorModeImage
          light="/widgetr-logo-light.svg"
          dark="/widgetr-logo-dark.svg"
          alt="Widgetr"
          class="homepage-logo"
          draggable="false"
        />
      </header>

      <div class="homepage-grid">
        <section class="homepage-intro">
          <a
            class="scriptable-relationship"
            href="https://scriptable.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Build for Scriptable. Open the Scriptable website in a new tab."
          >
            <img src="/scriptable-app-icon.png" alt="Scriptable app icon" class="scriptable-relationship-icon">
            <span class="scriptable-relationship-copy">
              <strong>Build for Scriptable</strong>
              <span>Design here, then run it in Scriptable.</span>
            </span>
          </a>

          <h1 id="homepage-heading">Build Scriptable widgets <span class="homepage-heading-accent">without writing JavaScript</span>.</h1>
          <p class="homepage-description">
            Choose a starting point, shape it with your assistant, and export the same widget to Scriptable.
          </p>
        </section>

        <section class="homepage-start" aria-labelledby="homepage-start-heading">
          <div class="homepage-section-heading">
            <h2 id="homepage-start-heading">Start in Studio</h2>
          </div>

          <WidgetWebMcpReadiness
            class="homepage-readiness"
            :status="props.webmcpStatus"
            :error="props.webmcpError"
            compact
            inline
            retry-label="Retry"
            @retry="emit('retry')"
          />

          <details class="homepage-tools">
            <summary class="homepage-tools-summary">
              <span>Page actions</span>
              <span class="homepage-tools-count">{{ toolCountLabel }}</span>
              <UIcon name="i-lucide-chevron-down" class="homepage-tools-chevron" aria-hidden="true" />
            </summary>
            <div class="homepage-tools-content">
              <ul v-if="props.webmcpToolNames.length" class="homepage-tools-list">
                <li v-for="toolName in props.webmcpToolNames" :key="toolName">
                  <UIcon name="i-lucide-wand-sparkles" aria-hidden="true" />
                  <code>{{ toolName }}</code>
                </li>
              </ul>
              <p v-else class="homepage-tools-empty">Tools appear here when page actions are ready.</p>
            </div>
          </details>

          <section class="homepage-prompt" aria-labelledby="homepage-prompt-heading">
            <div class="homepage-prompt-heading">
              <h3 id="homepage-prompt-heading">Copy a starter message</h3>
            </div>
            <ClientOnly>
              <p class="homepage-prompt-message">{{ props.assistantMessage }}</p>
            </ClientOnly>
            <div class="homepage-prompt-footer">
              <UButton
                :label="copyLabel"
                icon="i-lucide-copy"
                color="neutral"
                variant="outline"
                size="sm"
                @click="emit('copy')"
              />
              <span v-if="copyReceipt" class="homepage-copy-receipt" role="status" aria-live="polite">{{ copyReceipt }}</span>
            </div>
          </section>

          <p v-if="props.hasSavedProjects" class="homepage-continue-note">
            You have saved widgets. Continue where you left off.
          </p>

          <UButton
            :label="props.hasSavedProjects ? 'Continue' : 'Start in Studio'"
            icon="i-lucide-arrow-right"
            :to="props.hasSavedProjects ? '/studio' : '/studio?new=1'"
            color="primary"
            size="lg"
            block
            class="homepage-studio-action"
          />
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.homepage {
  display: grid;
  height: 100dvh;
  min-height: 100dvh;
  box-sizing: border-box;
  place-items: stretch;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0;
  background: var(--widgetr-app);
  color: var(--widgetr-ink);
}

.homepage-frame {
  display: flex;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: space-between;
  padding:
    max(clamp(1.25rem, 3vw, 2.5rem), env(safe-area-inset-top))
    max(clamp(1.25rem, 3vw, 2.5rem), env(safe-area-inset-right))
    max(clamp(1.25rem, 3vw, 2.5rem), env(safe-area-inset-bottom))
    max(clamp(1.25rem, 3vw, 2.5rem), env(safe-area-inset-left));
  border: 0;
  border-radius: 0;
  background: var(--widgetr-app);
  box-shadow: none;
}

.homepage-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

:deep(.homepage-logo) {
  width: auto;
  height: 1.65rem;
}

.homepage-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(20rem, 0.9fr);
  align-items: center;
  gap: clamp(2rem, 6vw, 5rem);
  width: min(100%, 65rem);
  margin: auto;
  padding: clamp(2rem, 5vh, 4rem) 0;
}

.homepage-intro {
  min-width: 0;
}

.homepage-intro h1 {
  max-width: 12ch;
  margin: 0;
  color: var(--widgetr-ink);
  font-size: clamp(2.8rem, 6vw, 4.8rem);
  font-weight: 650;
  letter-spacing: -0.075em;
  line-height: 0.94;
  text-wrap: balance;
}

.homepage-heading-accent {
  color: var(--widgetr-accent-strong);
}

.homepage-description {
  max-width: 48ch;
  margin: 1.6rem 0 0;
  color: var(--widgetr-muted);
  font-size: clamp(0.9rem, 1.4vw, 1rem);
  line-height: 1.65;
}

.scriptable-relationship {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  margin: 0 0 1.8rem;
  color: inherit;
  text-decoration: none;
  transition: opacity 160ms ease;
}

.scriptable-relationship:hover {
  opacity: 0.8;
}

.scriptable-relationship:focus-visible {
  outline: 2px solid var(--widgetr-accent-strong);
  outline-offset: 0.3rem;
  border-radius: 0.85rem;
}

.scriptable-relationship-icon {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 0.65rem;
}

.scriptable-relationship-copy {
  display: grid;
  gap: 0.14rem;
}

.scriptable-relationship-copy strong {
  color: var(--widgetr-ink);
  font-size: 0.86rem;
  font-weight: 700;
}

.scriptable-relationship-copy span {
  color: var(--widgetr-muted);
  font-size: 0.62rem;
}

.homepage-start {
  display: grid;
  min-width: 0;
  gap: 1.25rem;
  padding-left: clamp(1.5rem, 4vw, 3rem);
  border-left: 1px solid var(--widgetr-border);
}

.homepage-section-heading {
  display: grid;
  gap: 0.4rem;
}

.homepage-section-heading h2 {
  max-width: 18ch;
  margin: 0;
  color: var(--widgetr-ink);
  font-size: clamp(1.3rem, 2.5vw, 1.75rem);
  font-weight: 650;
  letter-spacing: -0.045em;
  line-height: 1.05;
}

.homepage-readiness {
  min-width: 0;
}

.homepage-tools {
  min-width: 0;
  border-bottom: 1px solid var(--widgetr-border);
}

.homepage-tools-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.25rem;
  color: var(--widgetr-ink);
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 650;
  list-style: none;
}

.homepage-tools-summary::-webkit-details-marker {
  display: none;
}

.homepage-tools-summary:focus-visible {
  outline: 2px solid var(--widgetr-accent);
  outline-offset: 0.2rem;
  border-radius: 0.2rem;
}

.homepage-tools-count {
  margin-left: auto;
  color: var(--widgetr-muted);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 550;
}

.homepage-tools-chevron {
  color: var(--widgetr-muted);
  transition: transform 160ms ease;
}

.homepage-tools[open] .homepage-tools-chevron {
  transform: rotate(180deg);
}

.homepage-tools-content {
  padding: 0 0 0.75rem;
}

.homepage-tools-list {
  display: grid;
  gap: 0.45rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.homepage-tools-list li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--widgetr-muted);
  font-size: 0.64rem;
}

.homepage-tools-list code {
  overflow-wrap: anywhere;
  color: var(--widgetr-ink);
  font-family: var(--font-mono);
  font-size: 0.62rem;
}

.homepage-tools-empty {
  margin: 0;
  color: var(--widgetr-muted);
  font-size: 0.64rem;
  line-height: 1.45;
}

.homepage-prompt {
  display: grid;
  gap: 0.9rem;
  padding: 0.95rem;
  border: 1px solid var(--widgetr-border);
  border-radius: var(--widgetr-radius-panel);
  background: color-mix(in srgb, var(--widgetr-stage) 48%, transparent);
}

.homepage-prompt-heading,
.homepage-prompt-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.homepage-prompt-heading h3 {
  margin: 0;
  color: var(--widgetr-ink);
  font-size: 0.78rem;
  font-weight: 700;
}

.homepage-prompt-message {
  max-height: 8rem;
  margin: 0;
  overflow: auto;
  color: var(--widgetr-ink);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.homepage-copy-receipt {
  min-width: 0;
  color: var(--widgetr-success);
  font-size: 0.62rem;
  line-height: 1.4;
  text-align: right;
}

.homepage-continue-note {
  margin: -0.2rem 0 -0.2rem;
  color: var(--widgetr-muted);
  font-size: 0.68rem;
  line-height: 1.4;
}

.homepage-studio-action {
  min-height: 3.1rem;
}

@media (max-width: 52rem) {
  .homepage-grid {
    grid-template-columns: 1fr;
    gap: 3rem;
    padding: 4rem 0;
  }

  .homepage-intro h1 {
    max-width: 12ch;
  }

  .homepage-start {
    max-width: 38rem;
    padding-top: 2rem;
    padding-left: 0;
    border-top: 1px solid var(--widgetr-border);
    border-left: 0;
  }
}

@media (max-width: 30rem) {
  .homepage {
    display: block;
    padding: 0;
  }

  .homepage-frame {
    min-height: 100dvh;
    padding: 1.15rem max(1rem, env(safe-area-inset-right)) 1.15rem max(1rem, env(safe-area-inset-left));
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .homepage-grid {
    gap: 2.6rem;
    padding: 3.2rem 0 3rem;
  }

  .homepage-intro h1 {
    font-size: clamp(2.8rem, 14vw, 4rem);
  }

  .homepage-description {
    margin-top: 1.25rem;
    font-size: 0.88rem;
  }

  .scriptable-relationship {
    margin-bottom: 1.5rem;
  }

  .homepage-start {
    gap: 1rem;
    padding-top: 1.6rem;
  }

  .homepage-prompt-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .homepage-copy-receipt {
    text-align: left;
  }

}
</style>
