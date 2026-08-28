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
      <span>{{ dimensions.width }} × {{ dimensions.height }} reference grid</span>
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
  margin-bottom: 0.625rem;
  color: var(--ui-text-muted);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.preview-caption span:first-child {
  color: var(--widgetr-ink);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
}

.calibration-frame {
  position: relative;
}

.calibration-frame::before,
.calibration-frame::after {
  position: absolute;
  z-index: 0;
  content: "";
  pointer-events: none;
}

.calibration-frame::before {
  top: -6px;
  right: 8px;
  left: 8px;
  height: 3px;
  background: repeating-linear-gradient(
    to right,
    var(--widgetr-mist) 0,
    var(--widgetr-mist) 1px,
    transparent 1px,
    transparent 12px
  );
}

.calibration-frame::after {
  top: 8px;
  bottom: 8px;
  left: -6px;
  width: 3px;
  background: repeating-linear-gradient(
    to bottom,
    var(--widgetr-mist) 0,
    var(--widgetr-mist) 1px,
    transparent 1px,
    transparent 12px
  );
}

.widget-preview {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 70%) inset,
    0 18px 42px rgb(23 32 51 / 14%);
}
</style>
