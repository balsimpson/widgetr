<script setup lang="ts">
import { computed, ref } from 'vue'
import { createNeutralWidgetProject } from '~/domain/widget/fixture'
import { createAssistantPrompt } from '~/domain/widget/onboarding'
import { createHomepageWebMcpToolCatalog } from '~/domain/widget/webmcp'
import { generateScriptableCode } from '~/domain/widget/scriptable'
import { useWidgetProjects } from '~/composables/useWidgetProjects'
import { useWidgetWebMcp } from '~/composables/useWidgetWebMcp'
import type {
  OperationResult,
  WidgetOperation,
  WidgetProject
} from '~/types/widget'
import type { WebMcpConfirmationRequest } from '~/types/webmcp'

const homepageProject = ref(createNeutralWidgetProject())
const homepageEnabled = ref(true)
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
const requestUrl = useRequestURL()
const canonicalUrl = computed(() => new URL('/', requestUrl.origin).toString())

useSeoMeta({
  title: 'Widgetr | Build Scriptable widgets',
  description: 'Build a Scriptable widget with a visual editor and your AI assistant, then export it to your iPhone.',
  ogTitle: 'Widgetr | Build Scriptable widgets',
  ogDescription: 'Build a Scriptable widget with a visual editor and your AI assistant, then export it to your iPhone.',
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  ogSiteName: 'Widgetr',
  twitterCard: 'summary',
  twitterTitle: 'Widgetr | Build Scriptable widgets',
  twitterDescription: 'Build a Scriptable widget with a visual editor and your AI assistant, then export it to your iPhone.'
})

useHead({
  link: [
    {
      rel: 'canonical',
      href: canonicalUrl
    }
  ]
})

const { projects: savedProjects } = useWidgetProjects()
const hasSavedProjects = computed(() => savedProjects.value.length > 0)

const widgetrUrl = canonicalUrl
const assistantMessage = computed(() => createAssistantPrompt(widgetrUrl.value))

function currentStudioUrl(): string {
  return new URL('/studio', requestUrl.origin).toString()
}

function homepageOperationFailure(operation: WidgetOperation): OperationResult {
  return {
    ok: false,
    state: homepageProject.value,
    revision: homepageProject.value.revision,
    changedSizes: [],
    warnings: [],
    selection: homepageProject.value.selection,
    code: 'INVALID_OPERATION',
    message: `The ${operation.type} operation is available in the widget editor.`
  }
}

async function unavailableCreateProject(
  _name: string,
  _startingIntent?: WidgetProject['startingIntent']
): Promise<WidgetProject> {
  throw new Error('Project creation is available in the widget editor.')
}

useWidgetWebMcp({
  enabled: homepageEnabled,
  project: homepageProject,
  commitOperation: homepageOperationFailure,
  createProject: unavailableCreateProject,
  getExport: () => generateScriptableCode(homepageProject.value),
  requestConfirmation: async (
    _request: WebMcpConfirmationRequest,
    _signal: AbortSignal
  ) => false,
  catalogKey: computed(() => currentStudioUrl()),
  catalog: () => createHomepageWebMcpToolCatalog(currentStudioUrl())
})

async function copyAssistantMessage(): Promise<void> {
  if (!navigator.clipboard) {
    copyState.value = 'failed'
    return
  }

  try {
    await navigator.clipboard.writeText(assistantMessage.value)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'failed'
  }
}

</script>

<template>
  <HomeLanding
    :assistant-message="assistantMessage"
    :copy-state="copyState"
    :has-saved-projects="hasSavedProjects"
    @copy="copyAssistantMessage"
  />
</template>
