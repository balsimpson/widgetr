<script setup lang="ts">
import { computed } from 'vue'
import { backgroundStyle } from '~/domain/widget/styles'
import { WIDGET_DIMENSIONS } from '~/types/widget'
import type { WidgetProject, WidgetSelection, WidgetSize } from '~/types/widget'

type ChangeActor = 'user' | 'assistant'

const props = withDefaults(defineProps<{
  project: WidgetProject
  size: WidgetSize
  changeActor?: ChangeActor | null
}>(), {
  changeActor: null
})

const emit = defineEmits<{
  select: [selection: WidgetSelection]
}>()

const layout = computed(() => props.project.layouts[props.size])
const dimensions = computed(() => WIDGET_DIMENSIONS[props.size])
const label = computed(() => props.size[0]!.toUpperCase() + props.size.slice(1))
const isWidgetSelected = computed(() => (
  props.project.selection?.size === props.size
  && props.project.selection.elementId === layout.value.root.id
))

function selectWidget(): void {
  emit('select', {
    size: props.size,
    elementId: layout.value.root.id
  })
}

const previewStyle = computed(() => ({
  ...backgroundStyle(layout.value.background, props.project),
  width: `${dimensions.value.width}px`,
  height: `${dimensions.value.height}px`,
  padding: `${layout.value.padding.top}px ${layout.value.padding.right}px ${layout.value.padding.bottom}px ${layout.value.padding.left}px`,
  borderRadius: `${layout.value.cornerRadius}px`
}))

const collaborationOutlineStyle = computed(() => ({
  borderRadius: `${layout.value.cornerRadius + 4}px`
}))
</script>

<template>
  <figure
    class="preview-figure"
    :style="{ width: `${dimensions.width}px` }"
  >
    <figcaption class="preview-caption">
      <button
        type="button"
        class="preview-caption-button"
        :aria-label="`Select ${label} widget`"
        @click="selectWidget"
      >
        <span>{{ label }}</span>
      </button>
    </figcaption>

    <div
      class="calibration-frame"
      :class="changeActor ? `calibration-frame-${changeActor}` : undefined"
    >
      <span
        v-if="changeActor"
        class="collaboration-outline"
        :style="collaborationOutlineStyle"
        aria-hidden="true"
      />
      <span
        v-if="changeActor"
        class="collaboration-marker"
        :class="`collaboration-marker-${changeActor}`"
      >
        <UIcon :name="changeActor === 'assistant' ? 'i-lucide-bot' : 'i-lucide-user-round'" aria-hidden="true" />
        {{ changeActor === 'assistant' ? 'Assistant' : 'You' }}
      </span>
      <div
        class="widget-preview"
        :class="{ 'widget-preview-selected': isWidgetSelected }"
        :style="previewStyle"
        :aria-label="`${label} widget preview`"
      >
        <WidgetNodeRenderer
          :element="layout.root"
          :project="project"
          :size="size"
          :parent-direction="layout.root.direction"
          @select="emit('select', $event)"
        />
      </div>
    </div>
  </figure>
</template>

<style scoped>
.preview-figure {
  flex: 0 0 auto;
  margin: 0;
}

.preview-caption {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.55rem;
  color: var(--widgetr-muted);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.preview-caption-button {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  margin: -0.25rem -0.35rem;
  padding: 0.25rem 0.35rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--widgetr-ink);
  font: inherit;
  line-height: 1.2;
  cursor: pointer;
}

.preview-caption-button:hover {
  background: color-mix(in srgb, var(--widgetr-ink) 8%, transparent);
}

.preview-caption-button:focus-visible {
  outline: 2px solid var(--widgetr-accent);
  outline-offset: 2px;
}

.preview-caption-button span {
  color: var(--widgetr-ink);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0;
}

.calibration-frame {
  position: relative;
  display: flex;
  justify-content: center;
}

.collaboration-outline {
  position: absolute;
  z-index: 3;
  inset: -5px;
  border: 2px solid var(--widgetr-accent);
  pointer-events: none;
  animation: collaboration-trace 1800ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.calibration-frame-assistant .collaboration-outline {
  border-color: var(--widgetr-assistant);
  border-style: dashed;
}

.collaboration-marker {
  position: absolute;
  z-index: 4;
  top: -1.45rem;
  left: -0.45rem;
  display: inline-flex;
  min-height: 1.5rem;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.45rem;
  border: 1px solid color-mix(in srgb, var(--widgetr-accent) 38%, var(--widgetr-border));
  border-radius: 0.45rem;
  background: color-mix(in srgb, var(--widgetr-pane-solid) 92%, transparent);
  box-shadow: 0 5px 14px rgb(29 29 31 / 14%);
  color: var(--widgetr-accent-strong);
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
  animation: collaboration-marker-arrive 1800ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.collaboration-marker-assistant {
  border-color: color-mix(in srgb, var(--widgetr-assistant) 45%, var(--widgetr-border));
  color: var(--widgetr-assistant);
}

.collaboration-marker > svg {
  width: 0.75rem;
  height: 0.75rem;
  flex: 0 0 auto;
}

@keyframes collaboration-trace {
  0% {
    opacity: 0;
    clip-path: inset(0 100% 100% 0 round 0.75rem);
  }

  14%, 82% {
    opacity: 1;
    clip-path: inset(0 0 0 0 round 0.75rem);
  }

  100% {
    opacity: 0;
    clip-path: inset(0 0 0 0 round 0.75rem);
  }
}

@keyframes collaboration-marker-arrive {
  0% {
    opacity: 0;
    transform: translateY(0.35rem);
  }

  14%, 82% {
    opacity: 1;
    transform: translateY(0);
  }

  100% {
    opacity: 0;
    transform: translateY(0);
  }
}

.widget-preview {
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--widgetr-ink) 18%, transparent);
  box-shadow:
    0 1px 0 rgb(255 255 255 / 65%) inset,
    0 18px 42px rgb(29 29 31 / 16%);
  transition: border-color 160ms ease, box-shadow 160ms ease, outline-color 160ms ease;
}

.widget-preview-selected {
  border-color: var(--widgetr-accent);
  outline: 2px solid var(--widgetr-accent);
  outline-offset: 4px;
  box-shadow:
    0 0 0 6px color-mix(in srgb, var(--widgetr-accent) 18%, transparent),
    0 1px 0 rgb(255 255 255 / 65%) inset,
    0 18px 42px rgb(29 29 31 / 16%);
}
</style>
