import type {
  WidgetOperation,
  WidgetSelection,
  WidgetSize
} from './widget'

export type WidgetHistoryActor = 'user' | 'assistant'

export interface WidgetHistoryEntry {
  id: string
  projectId: string
  revision: number
  actor: WidgetHistoryActor
  operation: WidgetOperation['type']
  targetIds: string[]
  changedFields: string[]
  changedSizes: WidgetSize[]
  selection: WidgetSelection | null
  message: string
  warnings: string[]
  createdAt: string
}
