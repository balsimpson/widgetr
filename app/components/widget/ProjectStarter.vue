<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { WIDGET_STARTERS } from '~/domain/widget/starters'
import type { WidgetStarterId } from '~/types/widget'

const props = defineProps<{
  isLoading: boolean
  persistenceError: string | null
  disabled: boolean
  open: boolean
}>()

const emit = defineEmits<{
  start: [starterId: WidgetStarterId]
  reference: [file: File]
}>()

const referenceFile = ref<File | null>(null)
const referencePreviewUrl = ref<string | null>(null)
const referenceError = ref<string | null>(null)

const primaryStarters = computed(() => WIDGET_STARTERS.filter(
  starter => starter.id === 'weather' || starter.id === 'cryptocurrency'
))

function starterLabel(starterId: WidgetStarterId): string {
  if (starterId === 'weather') {
    return 'Weather'
  }
  if (starterId === 'cryptocurrency') {
    return 'Bitcoin'
  }
  return 'Start a widget'
}

function starterDescription(starterId: WidgetStarterId): string {
  if (starterId === 'weather') {
    return 'Forecast at a glance.'
  }
  if (starterId === 'cryptocurrency') {
    return 'Live price and seven-day trend.'
  }
  return ''
}

function revokeReferencePreview(): void {
  if (referencePreviewUrl.value) {
    URL.revokeObjectURL(referencePreviewUrl.value)
    referencePreviewUrl.value = null
  }
}

function resetReferenceSelection(): void {
  revokeReferencePreview()
  referenceFile.value = null
  referenceError.value = null
}

function handleReferenceFile(file: File | null | undefined): void {
  if (!file) {
    resetReferenceSelection()
    return
  }

  if (!file.type.startsWith('image/')) {
    resetReferenceSelection()
    referenceError.value = 'Choose an image file for the local reference.'
    return
  }

  revokeReferencePreview()
  referenceFile.value = file
  referencePreviewUrl.value = URL.createObjectURL(file)
  referenceError.value = null
  emit('reference', file)
}

watch(() => props.open, isOpen => {
  if (!isOpen) {
    resetReferenceSelection()
  }
})

onBeforeUnmount(() => {
  revokeReferencePreview()
})
</script>

<template>
  <section
    class="starter-modal-body"
    aria-label="New widget starting options"
    :aria-busy="props.isLoading"
  >
    <div v-if="props.isLoading" class="starter-loading" aria-live="polite">
      <USkeleton class="h-7 w-2/3 max-w-sm" />
      <USkeleton class="h-4 w-full max-w-lg" />
      <div class="starter-loading-list">
        <USkeleton v-for="index in 2" :key="index" class="h-16 w-full" />
      </div>
    </div>

    <template v-else>
      <UAlert
        v-if="props.persistenceError"
        class="starter-alert"
        color="warning"
        variant="subtle"
        icon="i-lucide-database-zap"
        title="This browser cannot save projects"
        :description="`${props.persistenceError} You can still try Widgetr in this session.`"
      />

      <div class="starter-options" aria-label="Widget templates">
        <button
          v-for="starter in primaryStarters"
          :key="starter.id"
          type="button"
          class="starter-option"
          :disabled="props.disabled"
          @click="emit('start', starter.id)"
        >
          <span class="starter-option-icon" aria-hidden="true">
            <UIcon :name="starter.icon" />
          </span>
          <span class="starter-option-copy">
            <strong>{{ starterLabel(starter.id) }}</strong>
            <span>{{ starterDescription(starter.id) }}</span>
          </span>
          <UIcon
            name="i-lucide-arrow-right"
            class="starter-option-arrow"
            aria-hidden="true"
          />
        </button>
      </div>

      <div class="starter-divider" aria-hidden="true">
        <span>or</span>
      </div>

      <div class="reference-start">
        <UFileUpload
          v-if="!referenceFile"
          v-model="referenceFile"
          class="starter-dropzone"
          accept="image/*"
          icon="i-lucide-image-plus"
          label="Add a screenshot or image"
          description="Your assistant will ask how to use it as a guide"
          variant="area"
          layout="list"
          :preview="false"
          :disabled="props.disabled"
          @update:model-value="handleReferenceFile"
        />

        <div v-else-if="referencePreviewUrl" class="reference-selection" aria-live="polite">
          <img
            :src="referencePreviewUrl"
            alt="Selected reference preview"
          >
          <div class="reference-selection-copy">
            <strong>Reference added</strong>
            <span>{{ referenceFile.name }}</span>
            <p>Your assistant will ask what to preserve and what the widget should show.</p>
          </div>
        </div>

        <UAlert
          v-if="referenceError"
          class="starter-alert"
          color="error"
          variant="subtle"
          icon="i-lucide-image-off"
          title="Reference image unavailable"
          :description="referenceError"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.starter-modal-body {
  display: grid;
  gap: 1rem;
  width: 100%;
  max-height: min(65vh, 36rem);
  overflow-y: auto;
  padding: 1.15rem 1.25rem 1.25rem;
}

.starter-loading {
  display: grid;
  gap: 0.75rem;
  padding: 0.35rem 0;
}

.starter-loading-list {
  display: grid;
  gap: 0.6rem;
  margin-top: 0.85rem;
}

.starter-alert {
  margin: 0;
}

.starter-options {
  display: grid;
  gap: 0.55rem;
}

.starter-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  width: 100%;
  min-width: 0;
  min-height: 4rem;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--widgetr-border);
  border-radius: 0.75rem;
  background: transparent;
  padding: 0.7rem 0.75rem;
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

.starter-option:focus-visible {
  outline: 2px solid var(--widgetr-accent);
  outline-offset: 3px;
}

.starter-option-icon {
  display: grid;
  width: 2.1rem;
  height: 2.1rem;
  place-items: center;
  border-radius: 0.6rem;
  background: color-mix(in srgb, var(--widgetr-ink) 5%, transparent);
  color: var(--widgetr-accent);
}

.starter-option-copy {
  display: grid;
  min-width: 0;
  gap: 0.15rem;
}

.starter-option-copy strong {
  color: var(--widgetr-ink);
  font-size: 0.84rem;
  font-weight: 700;
}

.starter-option-copy span,
.reference-selection-copy > span {
  overflow: hidden;
  color: var(--widgetr-muted);
  font-size: 0.7rem;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.starter-option-arrow {
  width: 1rem;
  height: 1rem;
  color: var(--widgetr-muted);
}

.starter-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--widgetr-muted);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.starter-divider::before,
.starter-divider::after {
  flex: 1;
  border-top: 1px solid var(--widgetr-border);
  content: '';
}

.starter-dropzone :deep([data-slot="base"]) {
  min-height: 7rem;
  border-style: dashed;
  border-color: color-mix(in srgb, var(--widgetr-accent) 28%, var(--widgetr-border));
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--widgetr-accent) 3%, transparent);
  transition: border-color 140ms ease-out, background-color 140ms ease-out;
}

.starter-dropzone :deep([data-slot="base"]:hover),
.starter-dropzone :deep([data-slot="base"][data-dragging="true"]) {
  border-color: var(--widgetr-accent);
  background: color-mix(in srgb, var(--widgetr-accent) 8%, transparent);
}

.starter-dropzone :deep([data-slot="wrapper"]) {
  padding: 1rem;
}

.starter-dropzone :deep([data-slot="avatar"]) {
  color: var(--widgetr-accent);
}

.starter-dropzone :deep([data-slot="label"]) {
  color: var(--widgetr-ink);
  font-size: 0.8rem;
}

.starter-dropzone :deep([data-slot="description"]) {
  color: var(--widgetr-muted);
  font-size: 0.7rem;
}

.reference-start {
  display: grid;
  gap: 0.75rem;
}

.reference-selection {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  align-items: center;
  gap: 0.85rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-accent) 32%, var(--widgetr-border));
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--widgetr-accent) 5%, transparent);
  padding: 0.7rem;
}

.reference-selection img {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 0.55rem;
  object-fit: cover;
}

.reference-selection-copy {
  display: grid;
  min-width: 0;
  gap: 0.25rem;
}

.reference-selection-copy strong {
  color: var(--widgetr-ink);
  font-size: 0.8rem;
  font-weight: 700;
}

.reference-selection-copy p {
  margin: 0;
  color: var(--widgetr-muted);
  font-size: 0.7rem;
  line-height: 1.45;
}

@media (max-width: 30rem) {
  .starter-modal-body {
    max-height: calc(100dvh - 8rem);
    padding: 1rem 1rem 1.1rem;
  }

  .starter-option {
    gap: 0.65rem;
    padding: 0.7rem;
  }

  .reference-selection {
    grid-template-columns: 3.75rem minmax(0, 1fr);
    gap: 0.7rem;
  }

  .reference-selection img {
    width: 3.75rem;
    height: 3.75rem;
  }
}
</style>
