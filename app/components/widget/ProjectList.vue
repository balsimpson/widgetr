<script setup lang="ts">
import { computed } from 'vue'
import type { WidgetProject } from '~/types/widget'

const props = defineProps<{
  projects: WidgetProject[]
  activeProjectId: string
  isLoading: boolean
  persistenceState: 'idle' | 'saving' | 'saved' | 'error'
}>()

const emit = defineEmits<{
  create: []
  import: []
  open: [projectId: string]
  rename: [project: WidgetProject]
  duplicate: [project: WidgetProject]
  delete: [project: WidgetProject]
}>()

const persistenceLabel = computed(() => {
  switch (props.persistenceState) {
    case 'saving':
      return 'Saving locally'
    case 'saved':
      return 'Saved locally'
    case 'error':
      return 'Local save unavailable'
    default:
      return 'Local projects'
  }
})

const persistenceColor = computed(() => (
  props.persistenceState === 'error'
    ? 'error'
    : props.persistenceState === 'saving'
      ? 'warning'
      : 'neutral'
))

function projectDate(project: WidgetProject): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric'
  }).format(new Date(project.updatedAt))
}
</script>

<template>
  <aside class="project-panel" aria-labelledby="projects-heading">
    <div class="project-brand">
      <div class="brand-mark" aria-hidden="true">
        <UIcon name="i-lucide-box" />
      </div>
      <div>
        <p class="panel-kicker">Widgetr</p>
        <h1 id="projects-heading">Local projects</h1>
      </div>
    </div>

    <div class="project-actions">
      <UButton
        label="New widget"
        icon="i-lucide-plus"
        color="primary"
        block
        @click="emit('create')"
      />
      <UButton
        label="Import Scriptable"
        icon="i-lucide-file-input"
        color="neutral"
        variant="outline"
        block
        @click="emit('import')"
      />
    </div>

    <div class="project-status">
      <UBadge
        :color="persistenceColor"
        variant="soft"
        :label="persistenceLabel"
      />
      <span>IndexedDB</span>
    </div>

    <div v-if="isLoading" class="project-loading" aria-live="polite">
      <USkeleton class="h-12 w-full" />
      <USkeleton class="h-12 w-full" />
    </div>

    <ul v-else-if="projects.length" class="project-list">
      <li
        v-for="project in projects"
        :key="project.id"
        class="project-list-item"
        :class="{ active: project.id === activeProjectId }"
      >
        <button
          type="button"
          class="project-row"
          :aria-current="project.id === activeProjectId ? 'page' : undefined"
          @click="emit('open', project.id)"
        >
          <span class="project-row-leading">
            <UIcon
              name="i-lucide-panels-top-left"
              class="project-row-icon"
              aria-hidden="true"
            />
            <span class="project-row-copy">
              <strong>{{ project.name }}</strong>
              <small>{{ projectDate(project) }} · rev {{ project.revision }}</small>
            </span>
          </span>
          <UIcon
            name="i-lucide-chevron-right"
            class="project-row-arrow"
            aria-hidden="true"
          />
        </button>

        <div class="project-row-actions">
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="`Rename ${project.name}`"
            @click.stop="emit('rename', project)"
          />
          <UButton
            icon="i-lucide-copy"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="`Duplicate ${project.name}`"
            @click.stop="emit('duplicate', project)"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            :aria-label="`Delete ${project.name}`"
            @click.stop="emit('delete', project)"
          />
        </div>
      </li>
    </ul>

    <UAlert
      v-else
      color="info"
      variant="subtle"
      icon="i-lucide-folder-open"
      title="No local projects yet"
      description="Create a widget to start a local project."
    />

    <p class="project-footnote">
      Projects and reference images stay in this browser. There is no cloud backup.
    </p>
  </aside>
</template>

<style scoped>
.project-panel {
  display: grid;
  align-content: start;
  gap: 1rem;
  min-width: 0;
  padding: 1.25rem;
  border-right: 1px solid var(--ui-border-muted);
  background: var(--ui-bg-elevated);
}

.project-brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.brand-mark {
  display: grid;
  width: 2.1rem;
  height: 2.1rem;
  place-items: center;
  border-radius: 0.65rem;
  background: var(--widgetr-cobalt);
  color: var(--ui-text-inverted);
}

.project-brand h1 {
  margin-top: 0.15rem;
  color: var(--ui-text-highlighted);
  font-size: 1.05rem;
  font-weight: 750;
  letter-spacing: -0.03em;
}

.panel-kicker {
  color: var(--ui-text-muted);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.project-actions {
  display: grid;
  gap: 0.5rem;
}

.project-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--ui-text-muted);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  text-transform: uppercase;
}

.project-loading,
.project-list {
  display: grid;
  gap: 0.4rem;
}

.project-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.project-list-item {
  position: relative;
  border: 1px solid transparent;
  border-radius: 0.65rem;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.project-list-item:hover,
.project-list-item.active {
  border-color: var(--ui-border-muted);
  background: var(--ui-bg);
}

.project-list-item.active {
  border-color: var(--widgetr-cobalt);
}

.project-row {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.7rem 0.7rem 0.35rem;
  color: var(--ui-text-toned);
  text-align: left;
}

.project-row-leading {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.55rem;
}

.project-row-icon {
  flex: 0 0 auto;
  width: 1rem;
  height: 1rem;
  margin-top: 0.1rem;
  color: var(--ui-text-muted);
}

.project-list-item.active .project-row-icon {
  color: var(--widgetr-cobalt);
}

.project-row-copy {
  display: grid;
  min-width: 0;
  gap: 0.18rem;
}

.project-row-copy strong {
  overflow-wrap: anywhere;
  color: var(--ui-text-highlighted);
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1.25;
}

.project-row-copy small {
  color: var(--ui-text-muted);
  font-family: var(--font-mono);
  font-size: 0.58rem;
}

.project-row-arrow {
  flex: 0 0 auto;
  width: 0.9rem;
  height: 0.9rem;
  color: var(--ui-text-dimmed);
}

.project-row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.1rem;
  padding: 0 0.35rem 0.35rem;
  opacity: 0.65;
}

.project-list-item:hover .project-row-actions,
.project-list-item.active .project-row-actions {
  opacity: 1;
}

.project-footnote {
  margin-top: 0.5rem;
  color: var(--ui-text-muted);
  font-size: 0.7rem;
  line-height: 1.5;
}
</style>
