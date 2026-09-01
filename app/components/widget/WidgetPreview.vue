<script setup lang="ts">
import { computed } from 'vue'
import { backgroundStyle } from '~/domain/widget/styles'
import { WIDGET_DIMENSIONS } from '~/types/widget'
import type { WidgetProject, WidgetSelection, WidgetSize } from '~/types/widget'

const props = defineProps<{
  project: WidgetProject
  size: WidgetSize
}>()

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

    <div class="calibration-frame">
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
  display: flex;
  justify-content: center;
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
