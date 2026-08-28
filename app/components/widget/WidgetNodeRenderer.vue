<script setup lang="ts">
import { computed } from 'vue'
import {
  elementStyle,
  groupStyle,
  spacerStyle,
  textStyle
} from '~/domain/widget/styles'
import {
  formatDateValue,
  resolveRepeatItems,
  resolveValueText
} from '~/domain/widget/values'
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
</script>

<template>
  <template v-if="element.visible">
    <div
      v-if="element.type === 'group'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :style="containerStyle"
      :data-element-id="element.id"
      @click.stop="selectElement"
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
      @click.stop="selectElement"
    >{{ renderedText }}</span>

    <time
      v-else-if="element.type === 'date'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :datetime="renderedText"
      :style="{ ...boxStyle, ...textStyle(element.textStyle) }"
      :data-element-id="element.id"
      @click.stop="selectElement"
    >{{ renderedDate }}</time>

    <img
      v-else-if="element.type === 'image'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :src="imageSource"
      :alt="element.alt"
      :style="imageStyle"
      :data-element-id="element.id"
      @click.stop="selectElement"
    >

    <UIcon
      v-else-if="element.type === 'symbol'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :name="symbolName"
      :style="symbolStyle"
      :aria-label="renderedText"
      :data-element-id="element.id"
      @click.stop="selectElement"
    />

    <div
      v-else-if="element.type === 'spacer'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      aria-hidden="true"
      :style="spacerStyle(element.length, parentDirection)"
      :data-element-id="element.id"
      @click.stop="selectElement"
    />

    <div
      v-else-if="element.type === 'repeat'"
      class="widget-node"
      :class="{ 'element-selected': isSelected }"
      :style="containerStyle"
      :data-element-id="element.id"
      @click.stop="selectElement"
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
  </template>
</template>

<style scoped>
.widget-node {
  cursor: pointer;
  outline: 1px solid transparent;
  outline-offset: 2px;
  transition: outline-color 120ms ease, box-shadow 120ms ease;
}

.widget-node:hover {
  outline-color: var(--widgetr-cobalt);
}

.widget-node.element-selected {
  outline: 2px solid var(--widgetr-cobalt);
  box-shadow: 0 0 0 4px rgb(53 93 255 / 22%);
}
</style>
