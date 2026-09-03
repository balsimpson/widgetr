<script setup lang="ts">
import { computed } from 'vue'
import {
  elementStyle,
  groupStyle,
  spacerStyle,
  textStyle
} from '~/domain/widget/styles'
import { widgetElementLabel } from '~/domain/widget/tree'
import {
  formatDateValue,
  resolveRepeatItems,
  resolveValueText
} from '~/domain/widget/values'
import { isVisualDataElement } from '~/domain/widget/visual-data'
import type {
  GroupDirection,
  JsonObject,
  WidgetElement,
  WidgetProject,
  WidgetSelection,
  WidgetSize
} from '~/types/widget'

defineOptions({
  name: 'WidgetNodeRenderer'
})

const props = withDefaults(defineProps<{
  element: WidgetElement
  project: WidgetProject
  size: WidgetSize
  item?: JsonObject | null
  parentDirection?: GroupDirection
}>(), {
  item: null,
  parentDirection: 'vertical'
})

const emit = defineEmits<{
  select: [selection: WidgetSelection]
}>()

const isSelected = computed(() => (
  props.project.selection?.size === props.size
  && props.project.selection.elementId === props.element.id
))

function selectElement(): void {
  emit('select', {
    size: props.size,
    elementId: props.element.id
  })
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  selectElement()
}

const boxStyle = computed(() => elementStyle(
  props.element.style,
  props.project,
  props.item,
  props.parentDirection
))

const containerStyle = computed(() => {
  if (props.element.type !== 'group' && props.element.type !== 'repeat') {
    return boxStyle.value
  }

  return {
    ...boxStyle.value,
    ...groupStyle(
      props.element.direction,
      props.element.spacing,
      props.element.horizontalAlignment,
      props.element.verticalAlignment,
      props.element.distribution
    )
  }
})

const renderedText = computed(() => {
  if (
    props.element.type !== 'text'
    && props.element.type !== 'date'
    && props.element.type !== 'symbol'
  ) {
    return ''
  }

  const source = props.element.type === 'symbol' ? props.element.name : props.element.value
  return resolveValueText(source, props.project, props.item)
})

const renderedDate = computed(() => {
  if (props.element.type !== 'date') {
    return ''
  }
  return formatDateValue(renderedText.value, props.element.format)
})

const repeatItems = computed(() => {
  if (props.element.type !== 'repeat') {
    return []
  }
  return resolveRepeatItems(props.project, props.element.itemsBindingId).slice(0, props.element.limit)
})

const imageSource = computed(() => {
  if (props.element.type !== 'image') {
    return ''
  }
  return resolveValueText(props.element.source, props.project, props.item)
})

const imageStyle = computed(() => {
  if (props.element.type !== 'image') {
    return {}
  }
  return {
    ...boxStyle.value,
    display: 'block',
    objectFit: props.element.fit,
    objectPosition: `${props.element.crop.x}% ${props.element.crop.y}%`
  }
})

const symbolName = computed(() => {
  const symbolMap: Record<string, string> = {
    'cloud.fill': 'i-lucide-cloud',
    'cloud.rain.fill': 'i-lucide-cloud-rain',
    'cloud.heavyrain.fill': 'i-lucide-cloud-rain-wind',
    'cloud.sun.rain.fill': 'i-lucide-cloud-sun-rain',
    'cloud.sun.fill': 'i-lucide-cloud-sun',
    'sun.max.fill': 'i-lucide-sun'
  }
  return symbolMap[renderedText.value] ?? 'i-lucide-circle-help'
})

const symbolStyle = computed(() => {
  if (props.element.type !== 'symbol') {
    return {}
  }
  return {
    ...boxStyle.value,
    color: props.element.color,
    flex: '0 0 auto',
    fontSize: `${props.element.size}px`,
    width: `${props.element.size}px`,
    height: `${props.element.size}px`
  }
})

const repeatItemStyle = computed(() => {
  if (props.element.type !== 'repeat') {
    return {}
  }
  return props.element.direction === 'horizontal'
    ? { display: 'flex', flex: '1 1 0', minWidth: 0 }
    : { display: 'flex', width: '100%', minHeight: 0 }
})

const visualDataElement = computed(() => (
  isVisualDataElement(props.element) ? props.element : null
))
</script>

<template>
  <template v-if="element.visible">
    <div
      v-if="element.type === 'group'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :style="containerStyle"
      :data-element-id="element.id"
      role="button"
      tabindex="0"
      :aria-label="`${widgetElementLabel(element)} group`"
      :aria-pressed="isSelected"
      @click.stop="selectElement"
      @keydown="handleKeydown"
    >
      <WidgetNodeRenderer
        v-for="child in element.children"
        :key="child.id"
        :element="child"
        :project="project"
        :size="size"
        :item="item"
        :parent-direction="element.direction"
        @select="emit('select', $event)"
      />
    </div>

    <span
      v-else-if="element.type === 'text'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :style="{ ...boxStyle, ...textStyle(element.textStyle) }"
      :data-element-id="element.id"
      role="button"
      tabindex="0"
      :aria-label="`${widgetElementLabel(element)} text`"
      :aria-pressed="isSelected"
      @click.stop="selectElement"
      @keydown="handleKeydown"
    >{{ renderedText }}</span>

    <time
      v-else-if="element.type === 'date'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :datetime="renderedText"
      :style="{ ...boxStyle, ...textStyle(element.textStyle) }"
      :data-element-id="element.id"
      role="button"
      tabindex="0"
      :aria-label="`${widgetElementLabel(element)} date`"
      :aria-pressed="isSelected"
      @click.stop="selectElement"
      @keydown="handleKeydown"
    >{{ renderedDate }}</time>

    <img
      v-else-if="element.type === 'image'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :src="imageSource"
      :alt="element.alt"
      :style="imageStyle"
      :data-element-id="element.id"
      role="button"
      tabindex="0"
      :aria-label="`${widgetElementLabel(element)} image`"
      :aria-pressed="isSelected"
      @click.stop="selectElement"
      @keydown="handleKeydown"
    >

    <UIcon
      v-else-if="element.type === 'symbol'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :name="symbolName"
      :style="symbolStyle"
      :aria-label="renderedText"
      :data-element-id="element.id"
      role="button"
      tabindex="0"
      :aria-pressed="isSelected"
      @click.stop="selectElement"
      @keydown="handleKeydown"
    />

    <div
      v-else-if="element.type === 'spacer'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :style="spacerStyle(element.length, parentDirection)"
      :data-element-id="element.id"
      role="button"
      tabindex="0"
      :aria-label="`${widgetElementLabel(element)} spacer`"
      :aria-pressed="isSelected"
      @click.stop="selectElement"
      @keydown="handleKeydown"
    />

    <div
      v-else-if="element.type === 'repeat'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :style="containerStyle"
      :data-element-id="element.id"
      role="button"
      tabindex="0"
      :aria-label="`${widgetElementLabel(element)} repeat`"
      :aria-pressed="isSelected"
      @click.stop="selectElement"
      @keydown="handleKeydown"
    >
      <div
        v-for="(repeatItem, index) in repeatItems"
        :key="`${element.id}-${index}`"
        :style="repeatItemStyle"
      >
        <WidgetNodeRenderer
          v-for="child in element.children"
          :key="child.id"
          :element="child"
          :project="project"
          :size="size"
          :item="repeatItem"
          :parent-direction="element.direction"
          @select="emit('select', $event)"
        />
      </div>
    </div>

    <div
      v-else-if="visualDataElement"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :style="boxStyle"
      :data-element-id="element.id"
      role="button"
      tabindex="0"
      :aria-label="`${widgetElementLabel(element)} ${element.type}`"
      :aria-pressed="isSelected"
      @click.stop="selectElement"
      @keydown="handleKeydown"
    >
      <VisualDataRenderer
        :element="visualDataElement"
        :project="project"
        :size="size"
        :item="item"
      />
    </div>
  </template>
</template>

<style scoped>
.widget-node {
  cursor: pointer;
  outline: 1px solid transparent;
  outline-offset: 2px;
  transition: outline-color 120ms ease, box-shadow 120ms ease;
}

.widget-node:focus-visible {
  outline: 2px solid var(--widgetr-accent);
  outline-offset: 3px;
}

.widget-node:hover {
  outline-color: var(--widgetr-accent);
}

.widget-node.element-selected {
  outline: 2px solid var(--widgetr-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--widgetr-accent) 22%, transparent);
}
</style>
