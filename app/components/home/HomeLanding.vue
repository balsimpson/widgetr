<script setup lang="ts">
import { computed } from 'vue'
import type { WebMcpStatus } from '~/types/webmcp'
import AssistantChoiceGuideComponent from './HomeAssistantChoiceGuide.vue'

const props = defineProps<{
  status: WebMcpStatus
  error: string | null
  assistantMessage: string
  copyState: 'idle' | 'copied' | 'failed'
  hasSavedProjects: boolean
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
          <div class="scriptable-relationship" aria-label="Exports to Scriptable">
            <img src="/scriptable-app-icon.png" alt="Scriptable app icon" class="scriptable-relationship-icon">
            <span class="scriptable-relationship-copy">
              <strong>Exports to Scriptable</strong>
              <span>Build here, then use it in Scriptable.</span>
            </span>
          </div>

          <h1 id="homepage-heading">Build Scriptable widgets with your AI assistant</h1>
          <p class="homepage-description">
            Describe the widget you want. A compatible assistant can start it here; you can keep editing the same widget on the canvas, then export it to Scriptable.
          </p>

          <AssistantChoiceGuideComponent />
        </section>

        <section class="homepage-start" aria-labelledby="homepage-start-heading">
          <div class="homepage-section-heading">
            <p class="homepage-section-label">Start here</p>
            <h2 id="homepage-start-heading">Tell your assistant what to build</h2>
          </div>

          <WidgetWebMcpReadiness
            :status="props.status"
            :error="props.error"
            retry-label="Try again"
            @retry="emit('retry')"
          />

          <section class="homepage-prompt" aria-labelledby="homepage-prompt-heading">
            <div class="homepage-prompt-heading">
              <h3 id="homepage-prompt-heading">Start with this message</h3>
              <span>One message</span>
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

          <UButton
            v-if="props.hasSavedProjects"
            label="Continue"
            icon="i-lucide-arrow-right"
            to="/studio"
            color="primary"
            size="lg"
            block
            class="homepage-continue-action"
          />
        </section>
      </div>

      <footer class="homepage-footer">
        <span>Projects and reference images stay in this browser.</span>
        <span>Assistant access depends on the browser and assistant you use.</span>
      </footer>
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

.homepage-topbar,
.homepage-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

:deep(.homepage-logo) {
  width: auto;
  height: 1.65rem;
}

.homepage-footer {
  color: var(--widgetr-muted);
  font-size: 0.68rem;
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

.homepage-section-label {
  margin: 0;
  color: var(--widgetr-accent-strong);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 650;
  letter-spacing: 0.12em;
  line-height: 1.4;
  text-transform: uppercase;
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

.homepage-prompt {
  display: grid;
  gap: 0.9rem;
  padding: 1rem;
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

.homepage-prompt-heading span {
  color: var(--widgetr-muted);
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.homepage-prompt-message {
  max-height: 11rem;
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

.homepage-continue-action {
  min-height: 3.1rem;
}

.homepage-footer {
  align-items: flex-end;
  padding-top: 1.1rem;
  border-top: 1px solid var(--widgetr-border);
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

  .homepage-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.35rem;
  }
}
</style>
