import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import {
  createWebMcpToolCatalog,
  getWebMcpContext,
  serializeWebMcpResult
} from '~/domain/widget/webmcp'
import type {
  OperationResult,
  WidgetOperation,
  WidgetProject,
  WidgetStarterId
} from '~/types/widget'
import type {
  ScriptableExportResult
} from '~/domain/widget/scriptable'
import type {
  WebMcpModelContext,
  WebMcpRuntime,
  WebMcpStatus,
  WebMcpTool,
  WebMcpToolDescriptor
} from '~/types/webmcp'

export interface UseWidgetWebMcpOptions {
  enabled: Ref<boolean>
  project: Ref<WidgetProject>
  commitOperation: (operation: WidgetOperation) => OperationResult
  createProject: (name: string, startingIntent?: WidgetStarterId) => Promise<WidgetProject>
  getExport: () => ScriptableExportResult
  requestConfirmation: WebMcpRuntime['requestConfirmation']
  catalog?: () => WebMcpToolDescriptor[]
  catalogKey?: Ref<string>
}

function getModelContext(): WebMcpModelContext | null {
  if (typeof document === 'undefined') {
    return null
  }

  const modelContext = document.modelContext
  if (!modelContext || typeof modelContext.registerTool !== 'function') {
    return null
  }

  return modelContext
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'WebMCP tool registration failed.'
}

function executionError(
  project: Ref<WidgetProject>,
  error: unknown,
  signal: AbortSignal
): string {
  return serializeWebMcpResult({
    ok: false,
    code: signal.aborted ? 'CANCELLED' : 'TOOL_EXECUTION_FAILED',
    revision: project.value.revision,
    changedSizes: [],
    warnings: [],
    selection: project.value.selection,
    message: signal.aborted
      ? 'The WebMCP tool execution was cancelled.'
      : errorMessage(error)
  })
}

export function createBrowserWebMcpTool(
  descriptor: WebMcpToolDescriptor,
  runtime: WebMcpRuntime,
  project: Ref<WidgetProject>,
  onExecutionChange: (active: boolean) => void = () => undefined
): WebMcpTool {
  return {
    name: descriptor.name,
    title: descriptor.title,
    description: descriptor.description,
    inputSchema: descriptor.inputSchema,
    annotations: descriptor.annotations,
    execute: async (input, executionContext) => {
      const signal = executionContext?.signal ?? new AbortController().signal
      onExecutionChange(true)
      try {
        const result = await descriptor.execute(input, { signal }, runtime)
        return serializeWebMcpResult(result)
      } catch (error) {
        return executionError(project, error, signal)
      } finally {
        onExecutionChange(false)
      }
    }
  }
}

export async function registerWebMcpToolSet(
  modelContext: WebMcpModelContext,
  descriptors: WebMcpToolDescriptor[],
  runtime: WebMcpRuntime,
  project: Ref<WidgetProject>,
  signal: AbortSignal,
  onExecutionChange: (active: boolean) => void = () => undefined
): Promise<string[]> {
  const tools = descriptors.map(descriptor => (
    createBrowserWebMcpTool(descriptor, runtime, project, onExecutionChange)
  ))

  for (const tool of tools) {
    await modelContext.registerTool(tool, { signal })
    if (signal.aborted) {
      return []
    }
  }

  return tools.map(tool => tool.name)
}

export function useWidgetWebMcp(options: UseWidgetWebMcpOptions) {
  const status = ref<WebMcpStatus>('checking')
  const error = ref<string | null>(null)
  const registeredToolNames = ref<string[]>([])
  const apiAvailable = ref(false)
  const activeExecutions = ref(0)
  const context = computed(() => (
    options.enabled.value ? getWebMcpContext(options.project.value) : 'unsupported'
  ))
  const contextKey = computed(() => {
    const selection = options.project.value.selection
    return [
      options.enabled.value ? 'enabled' : 'disabled',
      options.project.value.id,
      selection?.size ?? 'none',
      selection?.elementId ?? 'none',
      context.value,
      options.catalogKey?.value ?? 'default'
    ].join(':')
  })

  let registrationController: AbortController | null = null
  let registrationGeneration = 0
  let mounted = false
  let disposed = false

  const runtime: WebMcpRuntime = {
    getProject: () => options.project.value,
    commitOperation: options.commitOperation,
    createProject: options.createProject,
    getExport: options.getExport,
    requestConfirmation: options.requestConfirmation
  }

  async function syncTools(): Promise<void> {
    if (!mounted || disposed) {
      return
    }

    const modelContext = getModelContext()
    apiAvailable.value = modelContext !== null
    registrationGeneration += 1
    const currentGeneration = registrationGeneration

    registrationController?.abort()
    registrationController = null
    registeredToolNames.value = []
    error.value = null
    activeExecutions.value = 0

    if (!modelContext || !options.enabled.value) {
      status.value = 'unsupported'
      return
    }

    const controller = new AbortController()
    registrationController = controller
    status.value = 'registering'

    try {
      const descriptors = options.catalog?.() ?? createWebMcpToolCatalog(options.project.value)
      const onExecutionChange = (active: boolean) => {
        if (currentGeneration !== registrationGeneration || disposed) {
          return
        }

        activeExecutions.value = Math.max(
          0,
          activeExecutions.value + (active ? 1 : -1)
        )
        if (activeExecutions.value > 0) {
          status.value = 'working'
        } else if (status.value === 'working') {
          status.value = registeredToolNames.value.length > 0 ? 'registered' : 'unsupported'
        }
      }
      const toolNames = await registerWebMcpToolSet(
        modelContext,
        descriptors,
        runtime,
        options.project,
        controller.signal,
        onExecutionChange
      )
      if (controller.signal.aborted || currentGeneration !== registrationGeneration || disposed) {
        return
      }

      registeredToolNames.value = toolNames
      status.value = activeExecutions.value > 0 ? 'working' : 'registered'
    } catch (registrationError) {
      if (controller.signal.aborted || currentGeneration !== registrationGeneration || disposed) {
        return
      }
      status.value = 'error'
      error.value = errorMessage(registrationError)
    }
  }

  watch(contextKey, () => {
    void syncTools()
  })

  onMounted(() => {
    mounted = true
    void syncTools()
  })

  onBeforeUnmount(() => {
    disposed = true
    registrationGeneration += 1
    registrationController?.abort()
    registrationController = null
  })

  return {
    status,
    error,
    context,
    apiAvailable,
    registeredToolNames,
    toolCount: computed(() => registeredToolNames.value.length),
    refresh: syncTools
  }
}
