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
      <span>{{ label }}</span>
    </figcaption>

    <div class="calibration-frame">
      <div
        class="widget-preview"
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

.preview-caption span:first-child {
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
}
</style>
