import type { OperationResult, WidgetOperation, WidgetProject, WidgetSize } from './widget'
import type { ScriptableExportResult } from '~/domain/widget/scriptable'

export type WebMcpContext = 'none' | 'text' | 'image' | 'group' | 'unsupported'

export type WebMcpStatus = 'unsupported' | 'registering' | 'registered' | 'error'

export interface WebMcpJsonSchema {
  type?: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'null'
  properties?: Record<string, WebMcpJsonSchema>
  items?: WebMcpJsonSchema
  required?: string[]
  additionalProperties?: boolean
  enum?: string[]
  const?: string | number | boolean
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  minItems?: number
  maxItems?: number
  pattern?: string
  description?: string
  oneOf?: WebMcpJsonSchema[]
}

export interface WebMcpToolAnnotations {
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  openWorldHint?: boolean
  untrustedContentHint?: boolean
}

export interface WebMcpExecutionContext {
  signal: AbortSignal
}

export interface WebMcpConfirmationRequest {
  title: string
  description: string
  actionLabel: string
  changedSizes: WidgetSize[]
}

export interface WebMcpRuntime {
  getProject: () => WidgetProject
  commitOperation: (operation: WidgetOperation) => OperationResult
  createProject: (name: string) => Promise<WidgetProject>
  getExport: () => ScriptableExportResult
  requestConfirmation: (
    request: WebMcpConfirmationRequest,
    signal: AbortSignal
  ) => Promise<boolean>
}

export type WebMcpToolPayload = Record<string, unknown>

export interface WebMcpToolDescriptor {
  name: string
  title: string
  description: string
  inputSchema: WebMcpJsonSchema
  annotations?: WebMcpToolAnnotations
  execute: (
    input: unknown,
    context: WebMcpExecutionContext,
    runtime: WebMcpRuntime
  ) => Promise<WebMcpToolPayload> | WebMcpToolPayload
}

export interface WebMcpTool {
  name: string
  title?: string
  description: string
  inputSchema: WebMcpJsonSchema
  annotations?: WebMcpToolAnnotations
  execute: (
    input: unknown,
    context?: WebMcpExecutionContext
  ) => Promise<string> | string
}

export interface WebMcpRegisterOptions {
  exposedTo?: string[]
  signal?: AbortSignal
}

export interface WebMcpModelContext {
  registerTool: (
    tool: WebMcpTool,
    options?: WebMcpRegisterOptions
  ) => Promise<undefined>
}

declare global {
  interface Document {
    readonly modelContext?: WebMcpModelContext
  }
}
