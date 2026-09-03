<script setup lang="ts">
import { computed } from 'vue'
import {
  barChartBars,
  formatProgressPercent,
  limitedSeries,
  normalizeProgressValue,
  progressRingGeometry,
  resolveNumericSourceDetails,
  resolveSeriesSource,
  sparklinePoints
} from '~/domain/widget/visual-data'
import { resolveValueText } from '~/domain/widget/values'
import type {
  JsonObject,
  VisualDataElement,
  WidgetProject,
  WidgetSize
} from '~/types/widget'

const props = withDefaults(defineProps<{
  element: VisualDataElement
  project: WidgetProject
  size: WidgetSize
  item?: JsonObject | null
}>(), {
  item: null
})

const ringGeometry = computed(() => {
  if (props.element.type !== 'progress-ring') {
    return []
  }

  const geometry = progressRingGeometry(props.element, props.project, props.item)
  return props.element.rings.map((ring, index) => ({
    ring,
    geometry: geometry[index]!
  }))
})

const progressBarState = computed(() => {
  if (props.element.type !== 'progress-bar') {
    return { ratio: null, label: 'No data' }
  }

  const resolution = resolveNumericSourceDetails(props.element.value, props.project, props.item)
  const ratio = normalizeProgressValue(resolution.value, props.element.min, props.element.max)

  return {
    ratio,
    label: formatProgressPercent(resolution.value, props.element.min, props.element.max)
  }
})

const progressBarGeometry = computed(() => {
  if (props.element.type !== 'progress-bar') {
    return { y: 5, height: 18, radius: 9 }
  }

  const canvasHeight = typeof props.element.style.height === 'number'
    ? Math.max(1, props.element.style.height)
    : 28
  const physicalHeight = Math.min(canvasHeight * 0.62, Math.max(6, props.element.thickness))
  const height = Math.min(28, Math.max(1, physicalHeight * 28 / canvasHeight))
  return {
    y: (28 - height) / 2,
    height,
    radius: height / 2
  }
})

const centerLabel = computed(() => {
  if (props.element.type !== 'progress-ring' || !props.element.centerLabel) {
    return ''
  }
  return resolveValueText(props.element.centerLabel, props.project, props.item)
})

const seriesValues = computed(() => {
  if (props.element.type !== 'sparkline' && props.element.type !== 'bar-chart') {
    return []
  }
  return limitedSeries(
    resolveSeriesSource(props.element.values, props.project, props.item),
    props.size,
    props.element.density
  )
})

const sparklinePointList = computed(() => sparklinePoints(seriesValues.value, 100, 42))

function pathForPoints(points: Array<{ x: number, y: number }>): string {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
}

const sparklinePath = computed(() => pathForPoints(sparklinePointList.value))
const sparklineAreaPath = computed(() => {
  const points = sparklinePointList.value
  if (points.length < 2) {
    return ''
  }
  const first = points[0]!
  const last = points.at(-1)!
  return `${pathForPoints(points)} L ${last.x.toFixed(2)} 48 L ${first.x.toFixed(2)} 48 Z`
})

const chartBars = computed(() => {
  if (props.element.type !== 'bar-chart') {
    return []
  }
  return barChartBars(seriesValues.value, 100, 48, props.element.gap)
})
</script>

<template>
  <svg
    v-if="element.type === 'progress-ring'"
    class="visual-data-svg visual-data-ring"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="centerLabel || 'Progress ring'"
  >
    <g transform="rotate(-90 50 50)">
      <template v-for="entry in ringGeometry" :key="entry.ring.id">
        <circle
          cx="50"
          cy="50"
          :r="entry.geometry.radius"
          fill="none"
          :stroke="entry.ring.trackColor"
          :stroke-width="entry.geometry.strokeWidth"
        />
        <circle
          cx="50"
          cy="50"
          :r="entry.geometry.radius"
          fill="none"
          :stroke="entry.ring.fillColor"
          :stroke-width="entry.geometry.strokeWidth"
          stroke-linecap="round"
          :stroke-dasharray="entry.geometry.circumference"
          :stroke-dashoffset="entry.geometry.circumference * (1 - entry.geometry.ratio)"
        />
      </template>
    </g>
    <text
      v-if="centerLabel"
      x="50"
      y="54"
      text-anchor="middle"
      class="visual-data-label"
    >{{ centerLabel }}</text>
  </svg>

  <svg
    v-else-if="element.type === 'progress-bar'"
    class="visual-data-svg visual-data-progress-bar"
    viewBox="0 0 100 28"
    preserveAspectRatio="none"
    role="img"
    :aria-label="`Progress bar: ${progressBarState.label}`"
  >
    <rect
      x="0"
      :y="progressBarGeometry.y"
      width="100"
      :height="progressBarGeometry.height"
      :rx="progressBarGeometry.radius"
      :fill="element.trackColor"
    />
    <rect
      v-if="progressBarState.ratio !== null"
      x="0"
      :y="progressBarGeometry.y"
      :width="progressBarState.ratio * 100"
      :height="progressBarGeometry.height"
      :rx="progressBarGeometry.radius"
      :fill="element.fillColor"
    />
    <text
      x="50"
      y="17"
      text-anchor="middle"
      class="visual-data-label visual-data-label-inverse"
    >{{ progressBarState.label }}</text>
  </svg>

  <svg
    v-else-if="element.type === 'sparkline'"
    class="visual-data-svg visual-data-chart"
    viewBox="0 0 100 48"
    preserveAspectRatio="none"
    role="img"
    :aria-label="seriesValues.length ? `Sparkline with ${seriesValues.length} points` : 'Sparkline: No data'"
  >
    <path
      v-if="element.fillColor && sparklineAreaPath"
      :d="sparklineAreaPath"
      :fill="element.fillColor"
      fill-opacity="0.14"
    />
    <path
      v-if="sparklinePath"
      :d="sparklinePath"
      fill="none"
      :stroke="element.lineColor"
      :stroke-width="element.thickness"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle
      v-if="sparklinePointList.length === 1"
      :cx="sparklinePointList[0]!.x"
      :cy="sparklinePointList[0]!.y"
      :r="Math.max(2, element.thickness)"
      :fill="element.lineColor"
    />
    <text
      v-if="!seriesValues.length"
      x="50"
      y="27"
      text-anchor="middle"
      class="visual-data-empty-label"
    >No data</text>
  </svg>

  <svg
    v-else
    class="visual-data-svg visual-data-chart"
    viewBox="0 0 100 48"
    preserveAspectRatio="none"
    role="img"
    :aria-label="seriesValues.length ? `Bar chart with ${seriesValues.length} bars` : 'Bar chart: No data'"
  >
    <rect
      v-for="(bar, index) in chartBars"
      :key="`${index}-${bar.value}`"
      :x="bar.x"
      :y="bar.y"
      :width="bar.width"
      :height="bar.height"
      rx="1.5"
      :fill="element.barColor"
    />
    <text
      v-if="!seriesValues.length"
      x="50"
      y="27"
      text-anchor="middle"
      class="visual-data-empty-label"
    >No data</text>
  </svg>
</template>

<style scoped>
.visual-data-svg {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: visible;
}

.visual-data-label,
.visual-data-empty-label {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.visual-data-label {
  fill: #fff;
}

.visual-data-label-inverse {
  font-size: 9px;
}

.visual-data-empty-label {
  fill: var(--widgetr-muted);
  font-size: 9px;
  font-weight: 600;
}
</style>
