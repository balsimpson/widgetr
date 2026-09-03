<script setup lang="ts">
import { computed } from 'vue'
import { findWidgetElement, widgetElementLabel } from '~/domain/widget/tree'
import { resolveDesignScope } from '~/domain/widget/schema'
import {
  VISUAL_DATA_DENSITY_OPTIONS,
  isVisualDataElement
} from '~/domain/widget/visual-data'
import type {
  DesignScope,
  ElementStyle,
  NumericSource,
  ProgressRingDatum,
  ProgressRingElement,
  SeriesSource,
  TextStyle,
  UpdateElementContentOperation,
  ValueSource,
  WidgetBackground,
  WidgetElement,
  WidgetOperation,
  WidgetProject,
  WidgetSelection,
  WidgetSize
} from '~/types/widget'

const props = defineProps<{
  project: WidgetProject
  selection: WidgetSelection | null
  focusedSize?: WidgetSize
  mode?: 'element' | 'widget'
  embedded?: boolean
}>()

const emit = defineEmits<{
  operation: [operation: WidgetOperation]
  remove: [selection: WidgetSelection]
}>()

const selectedSize = computed<WidgetSize>(() => (
  props.selection?.size
  ?? props.focusedSize
  ?? resolveDesignScope(props.project.designScope)[0]
  ?? 'medium'
))

const selectedElement = computed<WidgetElement | null>(() => {
  if (!props.selection) {
    return null
  }
  return findWidgetElement(
    props.project.layouts[props.selection.size].root,
    props.selection.elementId
  )
})

const selectedImage = computed(() => (
  selectedElement.value?.type === 'image' ? selectedElement.value : null
))

const selectedLabel = computed(() => selectedElement.value
  ? widgetElementLabel(selectedElement.value)
  : 'No element selected')

const inspectorMode = computed(() => props.mode ?? 'element')
const isWidgetMode = computed(() => inspectorMode.value === 'widget')
const isEmbedded = computed(() => props.embedded ?? false)
const inspectorTitle = computed(() => isWidgetMode.value ? 'Widget settings' : selectedLabel.value)

const inspectorSections = computed(() => {
  const element = selectedElement.value
  if (isWidgetMode.value || !element) {
    return []
  }

  const sections = [
    {
      label: 'Properties',
      value: 'properties',
      slot: 'properties',
      icon: 'i-lucide-sliders-horizontal'
    }
  ]

  if (['text', 'date', 'symbol', 'image'].includes(element.type) || isVisualDataElement(element)) {
    sections.push({
      label: 'Content',
      value: 'content',
      slot: 'content',
      icon: 'i-lucide-type'
    })
  }

  if (['group', 'repeat', 'spacer'].includes(element.type)) {
    sections.push({
      label: 'Layout',
      value: 'layout',
      slot: 'layout',
      icon: 'i-lucide-panels-top-left'
    })
  }

  return sections
})

const defaultInspectorSection = computed(() => {
  const element = selectedElement.value
  if (element && ['group', 'repeat', 'spacer'].includes(element.type)) {
    return 'layout'
  }
  return 'content'
})

const selectedVisualData = computed(() => (
  selectedElement.value && isVisualDataElement(selectedElement.value)
    ? selectedElement.value
    : null
))

const selectedProgressRing = computed<ProgressRingElement | null>(() => (
  selectedElement.value?.type === 'progress-ring' ? selectedElement.value : null
))

function isInsideRepeat(
  element: WidgetElement,
  elementId: string,
  insideRepeat = false
): boolean {
  if (element.id === elementId) {
    return insideRepeat
  }
  if (element.type !== 'group' && element.type !== 'repeat') {
    return false
  }
  return element.children.some(child => isInsideRepeat(
    child,
    elementId,
    insideRepeat || element.type === 'repeat'
  ))
}

const selectedElementCanUseItemSource = computed(() => {
  if (!props.selection) {
    return false
  }
  return resolveDesignScope(props.project.designScope).every(size => {
    const root = props.project.layouts[size].root
    const element = findWidgetElement(root, props.selection!.elementId)
    return !element || isInsideRepeat(root, props.selection!.elementId)
  })
})

const numberBindingOptions = computed(() => [
  { label: 'Fixed value', value: 'literal' },
  ...(selectedElementCanUseItemSource.value
    ? [{ label: 'Repeat item value', value: 'item' }]
    : []),
  ...props.project.bindings
    .filter(binding => binding.valueType === 'number')
    .map(binding => ({ label: binding.label, value: `binding:${binding.id}` }))
])

const seriesBindingOptions = computed(() => [
  { label: 'Fixed series', value: 'literal' },
  ...(selectedElementCanUseItemSource.value
    ? [{ label: 'Repeat item series', value: 'item' }]
    : []),
  ...props.project.bindings
    .filter(binding => binding.valueType === 'list')
    .map(binding => ({ label: binding.label, value: `binding:${binding.id}` }))
])

const visualDensityOptions = VISUAL_DATA_DENSITY_OPTIONS

const selectedSource = computed<ValueSource | null>(() => {
  const element = selectedElement.value
  if (!element) {
    return null
  }
  if (element.type === 'text' || element.type === 'date') {
    return element.value
  }
  if (element.type === 'image') {
    return element.source
  }
  if (element.type === 'symbol') {
    return element.name
  }
  return null
})

const sourceValue = computed(() => {
  const source = selectedSource.value
  if (!source) {
    return ''
  }
  return source.kind === 'literal' ? source.value : source.fallback
})

const sourceDescription = computed(() => {
  const source = selectedSource.value
  if (!source) {
    return ''
  }
  if (source.kind === 'literal') {
    return 'Literal content'
  }
  if (source.kind === 'binding') {
    const binding = props.project.bindings.find(item => item.id === source.bindingId)
    return `Binding: ${binding?.label ?? source.bindingId}`
  }
  return `Repeat item: ${source.path.join('.')}`
})

const scopeOptions = computed(() => [
  ...(['small', 'medium', 'large'] as WidgetSize[]).map(size => ({
    label: `Only ${size}`,
    value: `one:${size}`
  })),
  { label: 'Small + medium', value: 'several:small-medium' },
  { label: 'Medium + large', value: 'several:medium-large' },
  { label: 'All sizes', value: 'all' }
])

const currentScopeKey = computed(() => scopeKey(props.project.designScope))
const scopeLabel = computed(() => {
  const sizes = resolveDesignScope(props.project.designScope)
  if (sizes.length === 3) {
    return 'All sizes'
  }
  return sizes.map(size => size[0]!.toUpperCase() + size.slice(1)).join(' + ')
})

const background = computed(() => props.project.layouts[selectedSize.value].background)

const backgroundKindOptions = [
  { label: 'Solid color', value: 'solid' },
  { label: 'Gradient', value: 'gradient' },
  { label: 'Image', value: 'image' }
]

const weightOptions = ['regular', 'medium', 'semibold', 'bold']
const fontDesignOptions = ['default', 'rounded', 'monospaced', 'serif']
const alignmentOptions = [
  { label: 'Leading', value: 'leading' },
  { label: 'Center', value: 'center' },
  { label: 'Trailing', value: 'trailing' }
]
const verticalAlignmentOptions = [
  { label: 'Top', value: 'top' },
  { label: 'Center', value: 'center' },
  { label: 'Bottom', value: 'bottom' }
]
const directionOptions = [
  { label: 'Horizontal', value: 'horizontal' },
  { label: 'Vertical', value: 'vertical' }
]
const distributionOptions = [
  { label: 'Start', value: 'start' },
  { label: 'Center', value: 'center' },
  { label: 'End', value: 'end' },
  { label: 'Space between', value: 'space-between' }
]
const fitOptions = [
  { label: 'Cover', value: 'cover' },
  { label: 'Contain', value: 'contain' },
  { label: 'Fill', value: 'fill' }
]
const dateFormatOptions = [
  { label: 'Date', value: 'date' },
  { label: 'Time', value: 'time' },
  { label: 'Date and time', value: 'date-time' },
  { label: 'Relative', value: 'relative' }
]
const dimensionOptions = [
  { label: 'Fit content', value: 'fit' },
  { label: 'Fill available space', value: 'fill' },
  { label: 'Fixed width', value: 'fixed' }
]

function scopeKey(scope: DesignScope): string {
  if (scope.kind === 'all') {
    return 'all'
  }
  if (scope.kind === 'one') {
    return `one:${scope.size}`
  }
  return `several:${scope.sizes.join('-')}`
}

function scopeFromKey(value: string): DesignScope | null {
  if (value === 'all') {
    return { kind: 'all' }
  }
  if (value.startsWith('one:')) {
    const size = value.slice(4) as WidgetSize
    if (['small', 'medium', 'large'].includes(size)) {
      return { kind: 'one', size }
    }
  }
  if (value === 'several:small-medium') {
    return { kind: 'several', sizes: ['small', 'medium'] }
  }
  if (value === 'several:medium-large') {
    return { kind: 'several', sizes: ['medium', 'large'] }
  }
  return null
}

function updateScope(value: string): void {
  const scope = scopeFromKey(value)
  if (!scope) {
    return
  }
  emit('operation', {
    type: 'set-design-scope',
    expectedRevision: props.project.revision,
    scope
  })
}

function updateContent(patch: UpdateElementContentOperation['patch']): void {
  if (!props.selection) {
    return
  }
  emit('operation', {
    type: 'update-element-content',
    expectedRevision: props.project.revision,
    elementId: props.selection.elementId,
    patch
  })
}

function updateStyle(patch: Partial<ElementStyle>): void {
  if (!props.selection) {
    return
  }
  emit('operation', {
    type: 'update-element-style',
    expectedRevision: props.project.revision,
    elementId: props.selection.elementId,
    patch
  })
}

function updateTextStyle(patch: Partial<TextStyle>): void {
  if (!props.selection) {
    return
  }
  emit('operation', {
    type: 'update-text-style',
    expectedRevision: props.project.revision,
    elementId: props.selection.elementId,
    patch
  })
}

function updateSource(value: string): void {
  const source = selectedSource.value
  if (!source) {
    return
  }
  const nextSource: ValueSource = source.kind === 'literal'
    ? { kind: 'literal', value }
    : { ...source, fallback: value }

  if (selectedElement.value?.type === 'image') {
    updateContent({ source: nextSource })
    return
  }
  if (selectedElement.value?.type === 'symbol') {
    updateContent({ name: nextSource })
    return
  }
  updateContent({ value: nextSource })
}

function sourceMode(source: NumericSource | SeriesSource): string {
  if (source.kind === 'literal') {
    return 'literal'
  }
  if (source.kind === 'binding') {
    return `binding:${source.bindingId}`
  }
  return 'item'
}

function numericSourceValue(source: NumericSource): string {
  return String(source.kind === 'literal' ? source.value : source.fallback)
}

function seriesSourceValue(source: SeriesSource): string {
  const values = source.kind === 'literal' ? source.value : source.fallback
  return values.join(', ')
}

function numericSourceFromMode(
  current: NumericSource,
  mode: string
): NumericSource {
  if (mode === 'literal') {
    return {
      kind: 'literal',
      value: current.kind === 'literal' ? current.value : current.fallback
    }
  }
  if (mode === 'item') {
    return {
      kind: 'item',
      path: current.kind === 'item' ? current.path : ['value'],
      fallback: current.kind === 'literal' ? current.value : current.fallback
    }
  }

  const bindingId = mode.startsWith('binding:') ? mode.slice('binding:'.length) : ''
  if (!bindingId) {
    return current
  }
  return {
    kind: 'binding',
    bindingId,
    fallback: current.kind === 'literal' ? current.value : current.fallback
  }
}

function seriesSourceFromMode(
  current: SeriesSource,
  mode: string
): SeriesSource {
  const currentValues = current.kind === 'literal' ? current.value : current.fallback
  if (mode === 'literal') {
    return { kind: 'literal', value: currentValues }
  }
  if (mode === 'item') {
    return {
      kind: 'item',
      path: current.kind === 'item' ? current.path : ['values'],
      fallback: currentValues
    }
  }

  const bindingId = mode.startsWith('binding:') ? mode.slice('binding:'.length) : ''
  if (!bindingId) {
    return current
  }
  return { kind: 'binding', bindingId, fallback: currentValues }
}

function parseSeriesInput(value: string): number[] {
  return value
    .split(',')
    .map(item => Number(item.trim()))
    .filter(item => Number.isFinite(item))
}

function updateRing(index: number, patch: Partial<ProgressRingDatum>): void {
  const element = selectedProgressRing.value
  if (!element || !element.rings[index]) {
    return
  }
  updateContent({
    rings: element.rings.map((ring, ringIndex) => (
      ringIndex === index ? { ...ring, ...patch } : ring
    ))
  })
}

function updateRingSourceMode(index: number, mode: string): void {
  const ring = selectedProgressRing.value?.rings[index]
  if (!ring) {
    return
  }
  updateRing(index, { value: numericSourceFromMode(ring.value, mode) })
}

function updateRingSourceValue(index: number, value: string | number | undefined): void {
  const ring = selectedProgressRing.value?.rings[index]
  const numberValue = Number(value)
  if (!ring || !Number.isFinite(numberValue)) {
    return
  }
  const source = ring.value
  updateRing(index, {
    value: source.kind === 'literal'
      ? { kind: 'literal', value: numberValue }
      : { ...source, fallback: numberValue }
  })
}

function updateRingSourcePath(index: number, value: string): void {
  const ring = selectedProgressRing.value?.rings[index]
  if (!ring || ring.value.kind !== 'item') {
    return
  }
  const path = value.split('.').map(part => part.trim()).filter(Boolean)
  updateRing(index, { value: { ...ring.value, path } })
}

function addProgressRing(): void {
  const element = selectedProgressRing.value
  if (!element || element.rings.length >= 3) {
    return
  }
  const source = element.rings.at(-1)!
  let suffix = element.rings.length + 1
  let id = `ring-${suffix}`
  while (element.rings.some(ring => ring.id === id)) {
    suffix += 1
    id = `ring-${suffix}`
  }
  updateContent({
    rings: [...element.rings, {
      ...source,
      id,
      value: source.value.kind === 'literal'
        ? { kind: 'literal', value: Math.max(0, source.value.value - 0.12) }
        : { ...source.value }
    }]
  })
}

function removeProgressRing(index: number): void {
  const element = selectedProgressRing.value
  if (!element || element.rings.length <= 1) {
    return
  }
  updateContent({ rings: element.rings.filter((_, ringIndex) => ringIndex !== index) })
}

function updateProgressCenterLabel(value: string): void {
  updateContent({
    centerLabel: value.trim() ? { kind: 'literal', value } : null
  })
}

function updateSeriesSourceMode(mode: string): void {
  const element = selectedVisualData.value
  if (element?.type !== 'sparkline' && element?.type !== 'bar-chart') {
    return
  }
  updateContent({ series: seriesSourceFromMode(element.values, mode) })
}

function updateSeriesSourceValue(value: string): void {
  const element = selectedVisualData.value
  if (element?.type !== 'sparkline' && element?.type !== 'bar-chart') {
    return
  }
  const values = parseSeriesInput(value)
  const source = element.values
  updateContent({
    series: source.kind === 'literal'
      ? { kind: 'literal', value: values }
      : { ...source, fallback: values }
  })
}

function updateSeriesSourcePath(value: string): void {
  const element = selectedVisualData.value
  if (
    (element?.type !== 'sparkline' && element?.type !== 'bar-chart')
    || element.values.kind !== 'item'
  ) {
    return
  }
  const path = value.split('.').map(part => part.trim()).filter(Boolean)
  updateContent({ series: { ...element.values, path } })
}

function updateVisualColor(key: 'trackColor' | 'fillColor' | 'lineColor' | 'barColor', value: string): void {
  updateContent({ [key]: value } as UpdateElementContentOperation['patch'])
}

function updateVisualNumericSource(mode: string): void {
  const element = selectedVisualData.value
  if (element?.type !== 'progress-bar') {
    return
  }
  updateContent({ numericValue: numericSourceFromMode(element.value, mode) })
}

function updateVisualNumericValue(value: string | number | undefined): void {
  const element = selectedVisualData.value
  const numberValue = Number(value)
  if (element?.type !== 'progress-bar' || !Number.isFinite(numberValue)) {
    return
  }
  const source = element.value
  updateContent({
    numericValue: source.kind === 'literal'
      ? { kind: 'literal', value: numberValue }
      : { ...source, fallback: numberValue }
  })
}

function updateVisualNumericPath(value: string): void {
  const element = selectedVisualData.value
  if (element?.type !== 'progress-bar' || element.value.kind !== 'item') {
    return
  }
  const path = value.split('.').map(part => part.trim()).filter(Boolean)
  updateContent({ numericValue: { ...element.value, path } })
}

function removeSelectedElement(): void {
  if (props.selection && props.selection.elementId !== 'root') {
    emit('remove', props.selection)
  }
}

function updateNumber(
  value: string | number | undefined,
  callback: (numberValue: number) => void
): void {
  const numberValue = Number(value)
  if (Number.isFinite(numberValue)) {
    callback(numberValue)
  }
}

function updateDimension(
  axis: 'width' | 'height',
  value: string
): void {
  if (value === 'fit' || value === 'fill') {
    updateStyle({ [axis]: value })
    return
  }
  if (value === 'fixed') {
    updateStyle({ [axis]: 64 })
  }
}

function updatePadding(value: string | number | undefined): void {
  updateNumber(value, numberValue => updateStyle({
    padding: {
      top: numberValue,
      right: numberValue,
      bottom: numberValue,
      left: numberValue
    }
  }))
}

function updateBackground(backgroundValue: WidgetBackground): void {
  emit('operation', {
    type: 'set-layout-background',
    expectedRevision: props.project.revision,
    background: backgroundValue
  })
}

function updateBackgroundFit(value: string): void {
  if (
    background.value.kind === 'image'
    && (value === 'cover' || value === 'contain' || value === 'fill')
  ) {
    updateBackground({ ...background.value, fit: value })
  }
}

function updateImageCrop(axis: 'x' | 'y', value: string | number | undefined): void {
  const image = selectedImage.value
  const numberValue = Number(value)
  if (!image || !Number.isFinite(numberValue)) {
    return
  }

  updateContent({
    crop: axis === 'x'
      ? { x: numberValue, y: image.crop.y }
      : { x: image.crop.x, y: numberValue }
  })
}

function setBackgroundKind(kind: string): void {
  if (kind === 'solid') {
    updateBackground({
      kind: 'solid',
      color: background.value.kind === 'solid' ? background.value.color : '#182235',
      opacity: background.value.kind === 'solid' ? background.value.opacity : 1
    })
    return
  }
  if (kind === 'gradient') {
    updateBackground({
      kind: 'gradient',
      colors: background.value.kind === 'gradient'
        ? background.value.colors
        : ['#182235', '#355DFF'],
      direction: background.value.kind === 'gradient' ? background.value.direction : 'bottom-right',
      opacity: background.value.kind === 'gradient' ? background.value.opacity : 1
    })
    return
  }
  updateBackground({
    kind: 'image',
    source: background.value.kind === 'image'
      ? background.value.source
      : { kind: 'literal', value: '/sample-monsoon.svg' },
    fit: background.value.kind === 'image' ? background.value.fit : 'cover',
    overlayColor: background.value.kind === 'image' ? background.value.overlayColor : '#0B1C30',
    overlayOpacity: background.value.kind === 'image' ? background.value.overlayOpacity : 0.5
  })
}

function updateBackgroundColor(value: string): void {
  if (background.value.kind === 'solid') {
    updateBackground({ ...background.value, color: value })
  }
}

function updateBackgroundOpacity(value: string | number | undefined): void {
  updateNumber(value, opacity => {
    if (background.value.kind === 'solid' || background.value.kind === 'gradient') {
      updateBackground({ ...background.value, opacity })
    }
  })
}

function updateOverlayColor(value: string): void {
  if (background.value.kind === 'image') {
    updateBackground({ ...background.value, overlayColor: value })
  }
}

function updateOverlayOpacity(value: string | number | undefined): void {
  updateNumber(value, overlayOpacity => {
    if (background.value.kind === 'image') {
      updateBackground({ ...background.value, overlayOpacity })
    }
  })
}
</script>

<template>
  <aside
    class="inspector-panel"
    :class="{ 'inspector-panel-embedded': isEmbedded }"
    :aria-label="isEmbedded ? inspectorTitle : undefined"
    :aria-labelledby="isEmbedded ? undefined : 'inspector-heading'"
  >
    <div v-if="!isEmbedded" class="inspector-heading">
      <div>
        <h2 id="inspector-heading">{{ inspectorTitle }}</h2>
      </div>
      <UBadge
        v-if="!isWidgetMode"
        color="neutral"
        variant="soft"
        :label="scopeLabel"
      />
    </div>

    <UFormField
      label="Applies to"
      description="Choose which widget sizes this change affects."
    >
      <USelect
        class="w-full"
        :model-value="currentScopeKey"
        :items="scopeOptions"
        value-key="value"
        @update:model-value="updateScope"
      />
    </UFormField>

    <section
      v-if="isWidgetMode"
      class="inspector-section"
      aria-labelledby="background-heading"
    >
      <div class="section-heading">
        <div>
          <h3 id="background-heading">{{ selectedSize }} background</h3>
        </div>
        <span class="section-meta">{{ selectedSize }}</span>
      </div>

      <UFormField label="Background type">
        <USelect
          class="w-full"
          :model-value="background.kind"
          :items="backgroundKindOptions"
          value-key="value"
          @update:model-value="setBackgroundKind"
        />
      </UFormField>

      <UFormField
        v-if="background.kind === 'solid'"
        label="Color"
      >
        <UInput
          class="w-full"
          type="color"
          :model-value="background.color"
          @update:model-value="updateBackgroundColor"
        />
      </UFormField>

      <UFormField
        v-if="background.kind === 'solid' || background.kind === 'gradient'"
        label="Opacity"
      >
        <UInput
          class="w-full"
          type="number"
          min="0"
          max="1"
          step="0.05"
          :model-value="String(background.opacity)"
          @update:model-value="updateBackgroundOpacity"
        />
      </UFormField>

      <template v-if="background.kind === 'image'">
        <UFormField label="Image fit">
          <USelect
            class="w-full"
            :model-value="background.fit"
            :items="fitOptions"
            value-key="value"
            @update:model-value="updateBackgroundFit"
          />
        </UFormField>
        <UFormField label="Overlay color">
          <UInput
            class="w-full"
            type="color"
            :model-value="background.overlayColor"
            @update:model-value="updateOverlayColor"
          />
        </UFormField>
        <UFormField label="Overlay opacity">
          <UInput
            class="w-full"
            type="number"
            min="0"
            max="1"
            step="0.05"
            :model-value="String(background.overlayOpacity)"
            @update:model-value="updateOverlayOpacity"
          />
        </UFormField>
      </template>
    </section>

    <template v-if="!isWidgetMode">
      <UAlert
        v-if="!selectedElement"
        color="info"
        variant="subtle"
        icon="i-lucide-mouse-pointer-2"
        title="Select an element to edit it"
        description="Click a node in a preview or in the structure tree."
      />

      <template v-else>
      <UAccordion
        :key="selectedElement?.id"
        :items="inspectorSections"
        type="multiple"
        :default-value="[defaultInspectorSection]"
        class="inspector-accordion"
      >
        <template #properties-body>
      <section class="inspector-section" aria-labelledby="visibility-heading">
        <div class="section-heading">
          <div>
            <h3 id="visibility-heading">Visibility and box</h3>
          </div>
          <span class="section-meta">{{ selectedElement.type }}</span>
        </div>

        <UFormField label="Visible">
          <USwitch
            :model-value="selectedElement.visible"
            @update:model-value="value => updateContent({ visible: value })"
          />
        </UFormField>

        <div class="inspector-grid">
          <UFormField label="Opacity">
            <UInput
              class="w-full"
              type="number"
              min="0"
              max="1"
              step="0.05"
              :model-value="String(selectedElement.style.opacity)"
              @update:model-value="value => updateNumber(value, opacity => updateStyle({ opacity }))"
            />
          </UFormField>
          <UFormField label="Corner radius">
            <UInput
              class="w-full"
              type="number"
              min="0"
              max="48"
              step="1"
              :model-value="String(selectedElement.style.cornerRadius)"
              @update:model-value="value => updateNumber(value, cornerRadius => updateStyle({ cornerRadius }))"
            />
          </UFormField>
        </div>

        <UFormField label="Padding">
          <UInput
            class="w-full"
            type="number"
            min="0"
            max="48"
            step="1"
            :model-value="String(selectedElement.style.padding.top)"
            @update:model-value="updatePadding"
          />
        </UFormField>

        <div class="inspector-grid">
          <UFormField label="Width">
            <USelect
              class="w-full"
              :model-value="typeof selectedElement.style.width === 'number' ? 'fixed' : selectedElement.style.width"
              :items="dimensionOptions"
              value-key="value"
              @update:model-value="value => updateDimension('width', value)"
            />
          </UFormField>
          <UFormField label="Height">
            <USelect
              class="w-full"
              :model-value="typeof selectedElement.style.height === 'number' ? 'fixed' : selectedElement.style.height"
              :items="dimensionOptions"
              value-key="value"
              @update:model-value="value => updateDimension('height', value)"
            />
          </UFormField>
        </div>
      </section>

        </template>

        <template #content-body>
      <section
        v-if="selectedElement.type === 'text' || selectedElement.type === 'date' || selectedElement.type === 'symbol' || selectedElement.type === 'image'"
        class="inspector-section"
        aria-labelledby="content-heading"
      >
        <div class="section-heading">
          <div>
            <h3 id="content-heading">{{ selectedElement.type === 'image' ? 'Image source' : 'Displayed value' }}</h3>
          </div>
        </div>

        <UFormField
          v-if="selectedElement.type === 'text' || selectedElement.type === 'date' || selectedElement.type === 'symbol' || selectedElement.type === 'image'"
          :label="selectedElement.type === 'image' ? 'Image URL or local path' : selectedElement.type === 'symbol' ? 'SF Symbol name' : 'Text fallback'"
          :description="sourceDescription"
        >
          <UInput
            class="w-full"
            :model-value="sourceValue"
            @update:model-value="updateSource"
          />
        </UFormField>

        <template v-if="selectedElement.type === 'text' || selectedElement.type === 'date'">
          <div class="inspector-grid">
            <UFormField label="Font size">
              <UInput
                class="w-full"
                type="number"
                min="8"
                max="48"
                step="1"
                :model-value="String(selectedElement.textStyle.fontSize)"
                @update:model-value="value => updateNumber(value, fontSize => updateTextStyle({ fontSize }))"
              />
            </UFormField>
            <UFormField label="Weight">
              <USelect
                class="w-full"
                :model-value="selectedElement.textStyle.fontWeight"
                :items="weightOptions"
                @update:model-value="value => updateTextStyle({ fontWeight: value as TextStyle['fontWeight'] })"
              />
            </UFormField>
          </div>

          <div class="inspector-grid">
            <UFormField label="Font design">
              <USelect
                class="w-full"
                :model-value="selectedElement.textStyle.fontDesign"
                :items="fontDesignOptions"
                @update:model-value="value => updateTextStyle({ fontDesign: value as TextStyle['fontDesign'] })"
              />
            </UFormField>
            <UFormField label="Alignment">
              <USelect
                class="w-full"
                :model-value="selectedElement.textStyle.alignment"
                :items="alignmentOptions"
                value-key="value"
                @update:model-value="value => updateTextStyle({ alignment: value as TextStyle['alignment'] })"
              />
            </UFormField>
          </div>

          <div class="inspector-grid">
            <UFormField label="Text color">
              <UInput
                class="w-full"
                type="color"
                :model-value="selectedElement.textStyle.color"
                @update:model-value="value => updateTextStyle({ color: value })"
              />
            </UFormField>
            <UFormField label="Line limit">
              <UInput
                class="w-full"
                type="number"
                min="1"
                max="8"
                step="1"
                :model-value="String(selectedElement.textStyle.lineLimit)"
                @update:model-value="value => updateNumber(value, lineLimit => updateTextStyle({ lineLimit }))"
              />
            </UFormField>
          </div>

          <UFormField label="Italic">
            <USwitch
              :model-value="selectedElement.textStyle.italic"
              @update:model-value="value => updateTextStyle({ italic: value })"
            />
          </UFormField>

          <UFormField
            v-if="selectedElement.type === 'date'"
            label="Date format"
          >
            <USelect
              class="w-full"
              :model-value="selectedElement.format"
              :items="dateFormatOptions"
              value-key="value"
              @update:model-value="value => updateContent({ format: value as 'date' | 'time' | 'date-time' | 'relative' })"
            />
          </UFormField>
        </template>

        <template v-if="selectedElement.type === 'image'">
          <UFormField label="Alt text">
            <UInput
              class="w-full"
              :model-value="selectedElement.alt"
              @update:model-value="value => updateContent({ alt: value })"
            />
          </UFormField>
          <UFormField label="Image fit">
            <USelect
              class="w-full"
              :model-value="selectedElement.fit"
              :items="fitOptions"
              value-key="value"
              @update:model-value="value => updateContent({ fit: value as 'cover' | 'contain' | 'fill' })"
            />
          </UFormField>
          <div class="inspector-grid">
            <UFormField label="Crop x">
              <UInput
                class="w-full"
                type="number"
                min="0"
                max="100"
                step="1"
                :model-value="String(selectedImage?.crop.x ?? 50)"
                @update:model-value="value => updateImageCrop('x', value)"
              />
            </UFormField>
            <UFormField label="Crop y">
              <UInput
                class="w-full"
                type="number"
                min="0"
                max="100"
                step="1"
                :model-value="String(selectedImage?.crop.y ?? 50)"
                @update:model-value="value => updateImageCrop('y', value)"
              />
            </UFormField>
          </div>
        </template>

        <template v-if="selectedElement.type === 'symbol'">
          <div class="inspector-grid">
            <UFormField label="Symbol color">
              <UInput
                class="w-full"
                type="color"
                :model-value="selectedElement.color"
                @update:model-value="value => updateContent({ color: value })"
              />
            </UFormField>
            <UFormField label="Symbol size">
              <UInput
                class="w-full"
                type="number"
                min="8"
                max="96"
                step="1"
                :model-value="String(selectedElement.size)"
                @update:model-value="value => updateNumber(value, size => updateContent({ size }))"
              />
            </UFormField>
          </div>
        </template>
      </section>

      <section
        v-if="selectedElement.type === 'progress-ring'"
        class="inspector-section"
        aria-labelledby="progress-ring-heading"
      >
        <div class="section-heading">
          <div>
            <h3 id="progress-ring-heading">Progress rings</h3>
          </div>
          <span class="section-meta">{{ selectedElement.rings.length }} / 3 rings</span>
        </div>

        <div
          v-for="(ring, index) in selectedElement.rings"
          :key="ring.id"
          class="visual-data-editor"
        >
          <div class="section-heading">
            <span class="visual-data-editor-title">Ring {{ index + 1 }}</span>
            <UButton
              v-if="selectedElement.rings.length > 1"
              label="Remove"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="removeProgressRing(index)"
            />
          </div>

          <UFormField label="Value source">
            <USelect
              class="w-full"
              :model-value="sourceMode(ring.value)"
              :items="numberBindingOptions"
              value-key="value"
              @update:model-value="value => updateRingSourceMode(index, value)"
            />
          </UFormField>
          <UFormField label="Value" description="Used as the fallback when a source is unavailable.">
            <UInput
              class="w-full"
              type="number"
              :model-value="numericSourceValue(ring.value)"
              @update:model-value="value => updateRingSourceValue(index, value)"
            />
          </UFormField>
          <UFormField
            v-if="ring.value.kind === 'item'"
            label="Item path"
            description="Use dot-separated fields from the current repeat item."
          >
            <UInput
              class="w-full"
              :model-value="ring.value.path.join('.')"
              @update:model-value="value => updateRingSourcePath(index, value)"
            />
          </UFormField>
          <div class="inspector-grid">
            <UFormField label="Minimum">
              <UInput
                class="w-full"
                type="number"
                :model-value="String(ring.min)"
                @update:model-value="value => updateNumber(value, min => updateRing(index, { min }))"
              />
            </UFormField>
            <UFormField label="Maximum">
              <UInput
                class="w-full"
                type="number"
                :model-value="String(ring.max)"
                @update:model-value="value => updateNumber(value, max => updateRing(index, { max }))"
              />
            </UFormField>
          </div>
          <div class="inspector-grid">
            <UFormField label="Track color">
              <UInput
                class="w-full"
                type="color"
                :model-value="ring.trackColor"
                @update:model-value="value => updateRing(index, { trackColor: value })"
              />
            </UFormField>
            <UFormField label="Fill color">
              <UInput
                class="w-full"
                type="color"
                :model-value="ring.fillColor"
                @update:model-value="value => updateRing(index, { fillColor: value })"
              />
            </UFormField>
          </div>
        </div>

        <UButton
          v-if="selectedElement.rings.length < 3"
          label="Add nested ring"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          block
          @click="addProgressRing"
        />

        <div class="inspector-grid">
          <UFormField label="Ring size">
            <UInput
              class="w-full"
              type="number"
              min="32"
              max="128"
              step="1"
              :model-value="String(selectedElement.size)"
              @update:model-value="value => updateNumber(value, size => updateContent({ size }))"
            />
          </UFormField>
          <UFormField label="Thickness">
            <UInput
              class="w-full"
              type="number"
              min="2"
              max="14"
              step="1"
              :model-value="String(selectedElement.thickness)"
              @update:model-value="value => updateNumber(value, thickness => updateContent({ thickness }))"
            />
          </UFormField>
        </div>
        <UFormField label="Center label" description="Leave empty to hide the label.">
          <UInput
            class="w-full"
            :model-value="selectedElement.centerLabel ? (selectedElement.centerLabel.kind === 'literal' ? selectedElement.centerLabel.value : selectedElement.centerLabel.fallback) : ''"
            @update:model-value="updateProgressCenterLabel"
          />
        </UFormField>
      </section>

      <section
        v-if="selectedElement.type === 'progress-bar'"
        class="inspector-section"
        aria-labelledby="progress-bar-heading"
      >
        <div class="section-heading">
          <div>
            <h3 id="progress-bar-heading">Progress bar</h3>
          </div>
          <span class="section-meta">bounded value</span>
        </div>
        <UFormField label="Value source">
          <USelect
            class="w-full"
            :model-value="sourceMode(selectedElement.value)"
            :items="numberBindingOptions"
            value-key="value"
            @update:model-value="updateVisualNumericSource"
          />
        </UFormField>
        <UFormField label="Value" description="Used as the fallback when a source is unavailable.">
          <UInput
            class="w-full"
            type="number"
            :model-value="numericSourceValue(selectedElement.value)"
            @update:model-value="updateVisualNumericValue"
          />
        </UFormField>
        <UFormField
          v-if="selectedElement.value.kind === 'item'"
          label="Item path"
          description="Use dot-separated fields from the current repeat item."
        >
          <UInput
            class="w-full"
            :model-value="selectedElement.value.path.join('.')"
            @update:model-value="updateVisualNumericPath"
          />
        </UFormField>
        <div class="inspector-grid">
          <UFormField label="Minimum">
            <UInput
              class="w-full"
              type="number"
              :model-value="String(selectedElement.min)"
              @update:model-value="value => updateNumber(value, min => updateContent({ min }))"
            />
          </UFormField>
          <UFormField label="Maximum">
            <UInput
              class="w-full"
              type="number"
              :model-value="String(selectedElement.max)"
              @update:model-value="value => updateNumber(value, max => updateContent({ max }))"
            />
          </UFormField>
        </div>
        <div class="inspector-grid">
          <UFormField label="Track color">
            <UInput
              class="w-full"
              type="color"
              :model-value="selectedElement.trackColor"
              @update:model-value="value => updateVisualColor('trackColor', value)"
            />
          </UFormField>
          <UFormField label="Fill color">
            <UInput
              class="w-full"
              type="color"
              :model-value="selectedElement.fillColor"
              @update:model-value="value => updateVisualColor('fillColor', value)"
            />
          </UFormField>
        </div>
        <UFormField label="Thickness">
          <UInput
            class="w-full"
            type="number"
            min="4"
            max="28"
            step="1"
            :model-value="String(selectedElement.thickness)"
            @update:model-value="value => updateNumber(value, thickness => updateContent({ thickness }))"
          />
        </UFormField>
      </section>

      <section
        v-if="selectedElement.type === 'sparkline' || selectedElement.type === 'bar-chart'"
        class="inspector-section"
        aria-labelledby="series-chart-heading"
      >
        <div class="section-heading">
          <div>
            <h3 id="series-chart-heading">{{ selectedElement.type === 'sparkline' ? 'Sparkline' : 'Bar chart' }}</h3>
          </div>
          <span class="section-meta">numeric series</span>
        </div>
        <UFormField label="Series source">
          <USelect
            class="w-full"
            :model-value="sourceMode(selectedElement.values)"
            :items="seriesBindingOptions"
            value-key="value"
            @update:model-value="updateSeriesSourceMode"
          />
        </UFormField>
        <UFormField label="Values" description="Enter comma-separated numeric values. The latest points are kept when the chart is dense.">
          <UInput
            class="w-full"
            :model-value="seriesSourceValue(selectedElement.values)"
            @update:model-value="updateSeriesSourceValue"
          />
        </UFormField>
        <UFormField
          v-if="selectedElement.values.kind === 'item'"
          label="Item path"
          description="Use dot-separated fields from the current repeat item."
        >
          <UInput
            class="w-full"
            :model-value="selectedElement.values.path.join('.')"
            @update:model-value="updateSeriesSourcePath"
          />
        </UFormField>
        <UFormField label="Density" description="Controls the maximum number of rendered points.">
          <USelect
            class="w-full"
            :model-value="selectedElement.density"
            :items="visualDensityOptions"
            value-key="value"
            @update:model-value="value => updateContent({ density: value as 'compact' | 'balanced' | 'detailed' })"
          />
        </UFormField>

        <template v-if="selectedElement.type === 'sparkline'">
          <div class="inspector-grid">
            <UFormField label="Line color">
              <UInput
                class="w-full"
                type="color"
                :model-value="selectedElement.lineColor"
                @update:model-value="value => updateVisualColor('lineColor', value)"
              />
            </UFormField>
            <UFormField label="Thickness">
              <UInput
                class="w-full"
                type="number"
                min="1"
                max="8"
                step="1"
                :model-value="String(selectedElement.thickness)"
                @update:model-value="value => updateNumber(value, thickness => updateContent({ thickness }))"
              />
            </UFormField>
          </div>
          <UFormField v-if="selectedElement.fillColor" label="Area fill">
            <UInput
              class="w-full"
              type="color"
              :model-value="selectedElement.fillColor"
              @update:model-value="value => updateVisualColor('fillColor', value)"
            />
          </UFormField>
          <div class="inspector-grid">
            <UButton
              v-if="selectedElement.fillColor"
              label="Remove area fill"
              color="neutral"
              variant="outline"
              @click="updateContent({ fillColor: null })"
            />
            <UButton
              v-else
              label="Add area fill"
              color="neutral"
              variant="outline"
              @click="updateContent({ fillColor: '#6D5BD0' })"
            />
          </div>
        </template>

        <UFormField v-else label="Bar color">
          <UInput
            class="w-full"
            type="color"
            :model-value="selectedElement.barColor"
            @update:model-value="value => updateVisualColor('barColor', value)"
          />
        </UFormField>
        <UFormField v-if="selectedElement.type === 'bar-chart'" label="Bar gap">
          <UInput
            class="w-full"
            type="number"
            min="0"
            max="12"
            step="1"
            :model-value="String(selectedElement.gap)"
            @update:model-value="value => updateNumber(value, gap => updateContent({ gap }))"
          />
        </UFormField>
      </section>

        </template>

        <template #layout-body>
      <section
        v-if="selectedElement.type === 'group' || selectedElement.type === 'repeat'"
        class="inspector-section"
        aria-labelledby="layout-heading"
      >
        <div class="section-heading">
          <div>
            <h3 id="layout-heading">Group arrangement</h3>
          </div>
          <span class="section-meta">{{ selectedElement.children.length }} children</span>
        </div>

        <UFormField label="Direction">
          <USelect
            class="w-full"
            :model-value="selectedElement.direction"
            :items="directionOptions"
            value-key="value"
            @update:model-value="value => updateContent({ direction: value as 'horizontal' | 'vertical' })"
          />
        </UFormField>

        <div class="inspector-grid">
          <UFormField label="Spacing">
            <UInput
              class="w-full"
              type="number"
              min="0"
              max="40"
              step="1"
              :model-value="String(selectedElement.spacing)"
              @update:model-value="value => updateNumber(value, spacing => updateContent({ spacing }))"
            />
          </UFormField>
          <UFormField label="Distribution">
            <USelect
              class="w-full"
              :model-value="selectedElement.distribution"
              :items="distributionOptions"
              value-key="value"
              @update:model-value="value => updateContent({ distribution: value as 'start' | 'center' | 'end' | 'space-between' })"
            />
          </UFormField>
        </div>

        <div class="inspector-grid">
          <UFormField label="Horizontal alignment">
            <USelect
              class="w-full"
              :model-value="selectedElement.horizontalAlignment"
              :items="alignmentOptions"
              value-key="value"
              @update:model-value="value => updateContent({ horizontalAlignment: value as 'leading' | 'center' | 'trailing' })"
            />
          </UFormField>
          <UFormField label="Vertical alignment">
            <USelect
              class="w-full"
              :model-value="selectedElement.verticalAlignment"
              :items="verticalAlignmentOptions"
              value-key="value"
              @update:model-value="value => updateContent({ verticalAlignment: value as 'top' | 'center' | 'bottom' })"
            />
          </UFormField>
        </div>

        <UFormField
          v-if="selectedElement.type === 'repeat'"
          label="Visible items"
        >
          <UInput
            class="w-full"
            type="number"
            min="1"
            max="20"
            step="1"
            :model-value="String(selectedElement.limit)"
            @update:model-value="value => updateNumber(value, limit => updateContent({ limit }))"
          />
        </UFormField>
      </section>

      <section
        v-if="selectedElement.type === 'spacer'"
        class="inspector-section"
        aria-labelledby="spacer-heading"
      >
        <div class="section-heading">
          <div>
            <h3 id="spacer-heading">Spacer length</h3>
          </div>
          <span class="section-meta">{{ selectedElement.length === 'flex' ? 'flexible' : `${selectedElement.length}px` }}</span>
        </div>
        <UFormField label="Fixed length">
          <UInput
            class="w-full"
            type="number"
            min="0"
            max="400"
            step="1"
            :model-value="selectedElement.length === 'flex' ? '' : String(selectedElement.length)"
            placeholder="12"
            @update:model-value="value => updateNumber(value, length => updateContent({ length }))"
          />
        </UFormField>
        <UButton
          label="Use flexible space"
          icon="i-lucide-expand"
          color="neutral"
          variant="outline"
          block
          @click="updateContent({ length: 'flex' })"
        />
      </section>

        </template>
      </UAccordion>
      <UButton
        v-if="selection && selection.elementId !== 'root'"
        label="Remove element"
        icon="i-lucide-trash-2"
        color="error"
        variant="soft"
        block
        @click="removeSelectedElement"
      />
      </template>
    </template>
  </aside>
</template>

<style scoped>
.inspector-panel {
  display: grid;
  align-content: start;
  gap: 0.85rem;
  min-width: 0;
  padding: 1rem;
  overflow-y: auto;
  background: transparent;
}

.inspector-panel-embedded {
  padding: 1rem;
  background: transparent;
}

.inspector-heading,
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.inspector-heading h2,
.section-heading h3 {
  margin: 0;
  color: var(--widgetr-ink);
  font-weight: 650;
  letter-spacing: -0.02em;
}

.inspector-heading h2 {
  max-width: 18ch;
  font-size: 1.1rem;
  overflow-wrap: anywhere;
}

.section-heading h3 {
  font-size: 0.9rem;
}

.section-meta {
  flex: 0 0 auto;
  padding-top: 0.2rem;
  color: var(--widgetr-muted);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.inspector-section {
  display: grid;
  gap: 0.8rem;
  padding-top: 1rem;
  border-top: 1px solid var(--widgetr-border);
}

.visual-data-editor {
  display: grid;
  gap: 0.7rem;
  padding: 0.75rem;
  border: 1px solid var(--widgetr-border);
  border-radius: 0.65rem;
  background: color-mix(in srgb, var(--widgetr-surface) 65%, transparent);
}

.visual-data-editor-title {
  color: var(--widgetr-ink);
  font-size: 0.78rem;
  font-weight: 650;
}

.inspector-accordion .inspector-section {
  padding-top: 0.2rem;
  border-top: 0;
}

.inspector-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

:deep(input[type='color']) {
  height: 2rem;
  min-height: 2rem;
}

@media (max-width: 25rem) {
  .inspector-grid {
    grid-template-columns: 1fr;
  }
}
</style>
