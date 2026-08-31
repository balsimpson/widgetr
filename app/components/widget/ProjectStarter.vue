<script setup lang="ts">
import { computed, ref } from 'vue'
import { createSampleWidgetProject } from '~/domain/widget/fixture'
import { WIDGET_STARTERS } from '~/domain/widget/starters'
import type { WidgetStarterId } from '~/types/widget'

const props = defineProps<{
  isLoading: boolean
  persistenceError: string | null
  disabled: boolean
}>()

const emit = defineEmits<{
  start: [starterId: WidgetStarterId]
}>()

const examplesOpen = ref(false)
const exampleProject = createSampleWidgetProject()

const primaryStarters = computed(() => WIDGET_STARTERS.filter(starter => starter.action === 'create'))
const supportingStarters = computed(() => WIDGET_STARTERS.filter(starter => starter.action === 'reference'))
const exampleStarter = computed(() => WIDGET_STARTERS.find(starter => starter.action === 'example')!)

function choose(starterId: WidgetStarterId): void {
  emit('start', starterId)
}
</script>

<template>
  <section
    class="starter-page"
    aria-label="Widgetr starting options"
    :aria-busy="props.isLoading"
  >
    <div class="starter-surface">
      <div v-if="props.isLoading" class="starter-loading" aria-live="polite">
        <USkeleton class="h-10 w-3/4 max-w-md" />
        <USkeleton class="h-5 w-full max-w-2xl" />
        <USkeleton class="h-5 w-2/3 max-w-xl" />
        <div class="starter-loading-list">
          <USkeleton v-for="index in 4" :key="index" class="h-20 w-full" />
        </div>
      </div>

      <template v-else>
        <header class="starter-header">
          <div class="starter-mark" aria-hidden="true">
            <UIcon name="i-lucide-panels-top-left" />
          </div>
          <h1 id="starter-heading">Start building a widget</h1>
          <p>
            Choose an idea below or add a reference image. Your AI assistant will ask questions in its own chat.
            Your preview and controls will stay here.
          </p>
        </header>

        <UAlert
          v-if="props.persistenceError"
          class="starter-alert"
          color="warning"
          variant="subtle"
          icon="i-lucide-database-zap"
          title="This browser cannot save projects"
          :description="`${props.persistenceError} You can still try Widgetr in this session.`"
        />

        <div class="starter-layout">
          <section class="starter-choice-section" aria-labelledby="starter-ideas-heading">
            <div class="starter-section-heading">
              <h2 id="starter-ideas-heading">Choose an idea</h2>
              <p>Pick a direction and continue in your assistant's chat.</p>
            </div>

            <div class="starter-options">
              <button
                v-for="starter in primaryStarters"
                :key="starter.id"
                type="button"
                class="starter-option"
                :disabled="props.disabled"
                @click="choose(starter.id)"
              >
                <span class="starter-option-icon" aria-hidden="true">
                  <UIcon :name="starter.icon" />
                </span>
                <span class="starter-option-copy">
                  <strong>{{ starter.label }}</strong>
                  <span>{{ starter.description }}</span>
                  <small>{{ starter.nextStep }}</small>
                </span>
                <UIcon
                  name="i-lucide-arrow-up-right"
                  class="starter-option-arrow"
                  aria-hidden="true"
                />
              </button>
            </div>
          </section>

          <aside class="starter-side" aria-labelledby="starter-other-heading">
            <div class="starter-section-heading">
              <h2 id="starter-other-heading">Other ways to start</h2>
              <p>Keep the visual work here while your assistant guides the next step.</p>
            </div>

            <div class="starter-support-actions">
              <UButton
                v-for="starter in supportingStarters"
                :key="starter.id"
                :label="starter.label"
                :icon="starter.icon"
                color="neutral"
                variant="outline"
                block
                :disabled="props.disabled"
                @click="choose(starter.id)"
              />
            </div>

            <div class="starter-example-section">
              <UButton
                :label="examplesOpen ? 'Hide examples' : exampleStarter.label"
                :icon="examplesOpen ? 'i-lucide-chevron-up' : exampleStarter.icon"
                color="neutral"
                variant="ghost"
                block
                :disabled="props.disabled"
                @click="examplesOpen = !examplesOpen"
              />

              <div v-if="examplesOpen" class="starter-example" aria-live="polite">
                <div class="starter-example-copy">
                  <h3>{{ exampleProject.name }}</h3>
                  <p>{{ exampleStarter.description }}</p>
                  <small>{{ exampleStarter.nextStep }}</small>
                  <UButton
                    label="Use this example"
                    icon="i-lucide-arrow-right"
                    color="primary"
                    size="sm"
                    :disabled="props.disabled"
                    @click="choose('example')"
                  />
                </div>
                <WidgetPreview
                  :project="exampleProject"
                  size="small"
                />
              </div>
            </div>
          </aside>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.starter-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: max(1.5rem, env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right)) max(1.5rem, env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left));
  background: var(--widgetr-app);
}

.starter-surface {
  width: min(100%, 68rem);
  padding: clamp(1.25rem, 4vw, 3.5rem) 0;
}

.starter-loading {
  display: grid;
  gap: 0.75rem;
}

.starter-loading-list {
  display: grid;
  gap: 0.6rem;
  margin-top: 1.75rem;
}

.starter-header {
  max-width: 51rem;
}

.starter-mark {
  display: grid;
  width: 2.6rem;
  height: 2.6rem;
  place-items: center;
  margin-bottom: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-accent) 32%, var(--widgetr-border));
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--widgetr-accent) 12%, transparent);
  color: var(--widgetr-accent);
}

.starter-mark .i-lucide-panels-top-left {
  width: 1.25rem;
  height: 1.25rem;
}

.starter-header h1 {
  max-width: 12ch;
  color: var(--widgetr-ink);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 650;
  letter-spacing: -0.045em;
  line-height: 1;
}

.starter-header p {
  max-width: 60ch;
  margin-top: 1.25rem;
  color: var(--widgetr-muted);
  font-size: 0.95rem;
  line-height: 1.65;
}

.starter-alert {
  margin-top: 1.75rem;
}

.starter-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(15rem, 0.8fr);
  gap: clamp(1.5rem, 4vw, 3.5rem);
  margin-top: 3rem;
}

.starter-choice-section,
.starter-side {
  min-width: 0;
}

.starter-section-heading {
  display: grid;
  gap: 0.4rem;
}

.starter-section-heading h2 {
  color: var(--widgetr-ink);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.starter-section-heading p {
  color: var(--widgetr-muted);
  font-size: 0.76rem;
  line-height: 1.5;
}

.starter-options,
.starter-support-actions {
  display: grid;
  gap: 0.6rem;
  margin-top: 1rem;
}

.starter-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 0.85rem;
  border: 1px solid var(--widgetr-border);
  border-radius: 0.8rem;
  background: transparent;
  padding: 0.9rem 0.95rem;
  color: var(--widgetr-ink);
  text-align: left;
  transition: border-color 140ms ease-out, background-color 140ms ease-out, transform 140ms ease-out;
}

.starter-option:hover {
  border-color: color-mix(in srgb, var(--widgetr-accent) 48%, var(--widgetr-border));
  background: color-mix(in srgb, var(--widgetr-accent) 6%, transparent);
  transform: translateY(-1px);
}

.starter-option:disabled,
.starter-option:disabled:hover {
  cursor: not-allowed;
  opacity: 0.6;
  border-color: var(--widgetr-border);
  background: transparent;
  transform: none;
}

.starter-option:focus-visible,
.starter-option:focus {
  outline: 2px solid var(--widgetr-accent);
  outline-offset: 3px;
}

.starter-option-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.6rem;
  background: color-mix(in srgb, var(--widgetr-ink) 5%, transparent);
  color: var(--widgetr-accent);
}

.starter-option-copy {
  display: grid;
  min-width: 0;
  gap: 0.25rem;
}

.starter-option-copy strong {
  color: var(--widgetr-ink);
  font-size: 0.84rem;
  font-weight: 700;
}

.starter-option-copy span,
.starter-option-copy small,
.starter-example-copy p,
.starter-example-copy small {
  color: var(--widgetr-muted);
  font-size: 0.7rem;
  line-height: 1.45;
}

.starter-option-copy small,
.starter-example-copy small {
  color: var(--widgetr-ink);
}

.starter-option-arrow {
  width: 1rem;
  height: 1rem;
  color: var(--widgetr-muted);
}

.starter-side {
  align-self: start;
}

.starter-support-actions {
  margin-top: 1rem;
}

.starter-example-section {
  margin-top: 1.5rem;
  border-top: 1px solid var(--widgetr-border);
  padding-top: 1rem;
}

.starter-example {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  margin-top: 0.75rem;
  border-top: 1px solid var(--widgetr-border);
  padding-top: 1rem;
}

.starter-example-copy {
  display: grid;
  min-width: 0;
  gap: 0.45rem;
}

.starter-example-copy h3 {
  color: var(--widgetr-ink);
  font-size: 0.8rem;
  font-weight: 700;
}

.starter-example-copy :deep(button) {
  justify-self: start;
  margin-top: 0.35rem;
}

.starter-example :deep(.preview-figure) {
  width: 158px;
}

@media (max-width: 54rem) {
  .starter-layout {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }

  .starter-side {
    max-width: 38rem;
  }
}

@media (max-width: 30rem) {
  .starter-page {
    min-height: calc(100vh - 1.5rem);
    padding: 0.75rem 0;
  }

  .starter-surface {
    padding: 1.25rem;
  }

  .starter-header h1 {
    font-size: 2.5rem;
  }

  .starter-layout {
    margin-top: 2.25rem;
  }

  .starter-example {
    grid-template-columns: 1fr;
  }

  .starter-example :deep(.preview-figure) {
    justify-self: start;
  }
}
</style>
