<script setup lang="ts">
import { computed } from 'vue'
import {
  widgetElementIcon,
  widgetElementLabel
} from '~/domain/widget/tree'
import type {
  WidgetElement,
  WidgetSelection,
  WidgetSize
} from '~/types/widget'

defineOptions({
  name: 'WidgetStructureTree'
})

const props = defineProps<{
  element: WidgetElement
  size: WidgetSize
  selection: WidgetSelection | null
}>()

const emit = defineEmits<{
  select: [selection: WidgetSelection]
}>()

const isSelected = computed(() => (
  props.selection?.size === props.size
  && props.selection.elementId === props.element.id
))

function selectElement(): void {
  emit('select', {
    size: props.size,
    elementId: props.element.id
  })
}
</script>

<template>
  <li class="structure-item">
    <button
      type="button"
      class="structure-row"
      :class="{ selected: isSelected }"
      :aria-current="isSelected ? 'true' : undefined"
      @click="selectElement"
    >
      <UIcon
        :name="widgetElementIcon(element)"
        class="structure-icon"
        aria-hidden="true"
      />
      <span class="structure-label">{{ widgetElementLabel(element) }}</span>
      <span class="structure-type">{{ element.type }}</span>
    </button>

    <ul
      v-if="element.type === 'group' || element.type === 'repeat'"
      class="structure-children"
    >
      <WidgetStructureTree
        v-for="child in element.children"
        :key="child.id"
        :element="child"
        :size="size"
        :selection="selection"
        @select="emit('select', $event)"
      />
    </ul>
  </li>
</template>

<style scoped>
.structure-item {
  min-width: 0;
}

.structure-row {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.55rem;
  border-left: 2px solid transparent;
  color: var(--ui-text-toned);
  text-align: left;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}

.structure-row:hover {
  background: var(--ui-bg-muted);
  color: var(--ui-text-highlighted);
}

.structure-row.selected {
  border-left-color: var(--widgetr-cobalt);
  background: var(--ui-bg-accented);
  color: var(--ui-text-highlighted);
}

.structure-icon {
  flex: 0 0 auto;
  width: 1rem;
  height: 1rem;
  color: var(--ui-text-muted);
}

.structure-row.selected .structure-icon {
  color: var(--widgetr-cobalt);
}

.structure-label {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 0.78rem;
  font-weight: 600;
}

.structure-type {
  margin-left: auto;
  color: var(--ui-text-dimmed);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  text-transform: uppercase;
}

.structure-children {
  display: grid;
  gap: 0.12rem;
  margin: 0 0 0 0.65rem;
  padding: 0 0 0 0.55rem;
  border-left: 1px solid var(--ui-border-muted);
}
</style>
