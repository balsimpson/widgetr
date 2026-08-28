import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import {
  createWebMcpToolCatalog,
  getWebMcpContext,
  serializeWebMcpResult
} from '~/domain/widget/webmcp'
import type { OperationResult, WidgetOperation, WidgetProject } from '~/types/widget'
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
  project: Ref<WidgetProject>
  commitOperation: (operation: WidgetOperation) => OperationResult
  createProject: (name: string) => Promise<WidgetProject>
  getExport: () => ScriptableExportResult
  requestConfirmation: WebMcpRuntime['requestConfirmation']
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
  project: Ref<WidgetProject>
): WebMcpTool {
  return {
    name: descriptor.name,
    title: descriptor.title,
    description: descriptor.description,
    inputSchema: descriptor.inputSchema,
    annotations: descriptor.annotations,
    execute: async (input, executionContext) => {
      const signal = executionContext?.signal ?? new AbortController().signal
      try {
        const result = await descriptor.execute(input, { signal }, runtime)
        return serializeWebMcpResult(result)
      } catch (error) {
        return executionError(project, error, signal)
      }
    }
  }
}

export async function registerWebMcpToolSet(
  modelContext: WebMcpModelContext,
  descriptors: WebMcpToolDescriptor[],
  runtime: WebMcpRuntime,
  project: Ref<WidgetProject>,
  signal: AbortSignal
): Promise<string[]> {
  const tools = descriptors.map(descriptor => createBrowserWebMcpTool(descriptor, runtime, project))

  for (const tool of tools) {
    await modelContext.registerTool(tool, { signal })
    if (signal.aborted) {
      return []
    }
  }

  return tools.map(tool => tool.name)
}

export function useWidgetWebMcp(options: UseWidgetWebMcpOptions) {
  const status = ref<WebMcpStatus>('unsupported')
  const error = ref<string | null>(null)
  const registeredToolNames = ref<string[]>([])
  const apiAvailable = ref(false)
  const context = computed(() => getWebMcpContext(options.project.value))
  const contextKey = computed(() => {
    const selection = options.project.value.selection
    return [
      options.project.value.id,
      selection?.size ?? 'none',
      selection?.elementId ?? 'none',
      context.value
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

    if (!modelContext) {
      status.value = 'unsupported'
      return
    }

    const controller = new AbortController()
    registrationController = controller
    status.value = 'registering'

    const descriptors = createWebMcpToolCatalog(options.project.value)

    try {
      const toolNames = await registerWebMcpToolSet(
        modelContext,
        descriptors,
        runtime,
        options.project,
        controller.signal
      )
      if (controller.signal.aborted || currentGeneration !== registrationGeneration || disposed) {
        return
      }

      registeredToolNames.value = toolNames
      status.value = 'registered'
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
