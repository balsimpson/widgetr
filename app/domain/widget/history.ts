import { z } from 'zod'
import type {
  OperationResult,
  WidgetOperation,
  WidgetProject
} from '~/types/widget'
import type {
  WidgetHistoryActor,
  WidgetHistoryEntry
} from '~/types/widget-history'

const widgetHistoryEntrySchema = z.object({
  id: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  revision: z.number().int().nonnegative(),
  actor: z.enum(['user', 'assistant']),
  operation: z.string().trim().min(1).transform(value => value as WidgetOperation['type']),
  targetIds: z.array(z.string().trim().min(1)).max(20),
  changedFields: z.array(z.string().trim().min(1)).max(30),
  changedSizes: z.array(z.enum(['small', 'medium', 'large'])).max(3),
  selection: z.object({
    size: z.enum(['small', 'medium', 'large']),
    elementId: z.string().trim().min(1)
  }).strict().nullable(),
  message: z.string().max(500),
  warnings: z.array(z.string().max(500)).max(20),
  createdAt: z.string().min(1)
}).strict()

export function parseWidgetHistoryEntry(input: unknown): WidgetHistoryEntry | null {
  const result = widgetHistoryEntrySchema.safeParse(input)
  return result.success ? result.data : null
}

function operationDetails(operation: WidgetOperation): Pick<WidgetHistoryEntry, 'targetIds' | 'changedFields'> {
  switch (operation.type) {
    case 'set-design-scope':
      return { targetIds: [], changedFields: ['designScope'] }
    case 'set-selection':
      return {
        targetIds: operation.selection ? [operation.selection.elementId] : [],
        changedFields: ['selection']
      }
    case 'update-element-style':
    case 'update-text-style':
    case 'update-element-content':
      return {
        targetIds: [operation.elementId],
        changedFields: Object.keys(operation.patch)
      }
    case 'update-project-metadata':
      return {
        targetIds: [],
        changedFields: Object.keys(operation.patch)
      }
    case 'set-public-data-source':
      return { targetIds: [], changedFields: ['dataSource', 'data'] }
    case 'set-data-bindings':
      return { targetIds: [], changedFields: ['bindings'] }
    case 'set-layout-background':
      return { targetIds: [], changedFields: ['background'] }
    case 'reorder-children':
      return {
        targetIds: [operation.elementId, operation.childId],
        changedFields: ['children']
      }
    case 'insert-element':
      return {
        targetIds: [operation.parentId, operation.element.id],
        changedFields: ['children']
      }
    case 'remove-element':
      return {
        targetIds: [operation.elementId],
        changedFields: ['children']
      }
    case 'restore-snapshot':
      return { targetIds: [], changedFields: ['project'] }
  }
}

export function createWidgetHistoryEntry(
  project: WidgetProject,
  operation: WidgetOperation,
  result: OperationResult,
  actor: WidgetHistoryActor
): WidgetHistoryEntry | null {
  if (!result.ok || operation.type === 'set-selection') {
    return null
  }

  const details = operationDetails(operation)
  const targetIds = [...new Set(details.targetIds)]

  return {
    id: `${project.id}:${result.revision}`,
    projectId: project.id,
    revision: result.revision,
    actor,
    operation: operation.type,
    targetIds,
    changedFields: details.changedFields,
    changedSizes: [...result.changedSizes],
    selection: result.selection ? { ...result.selection } : null,
    message: result.message,
    warnings: [...result.warnings],
    createdAt: result.state.updatedAt
  }
}
