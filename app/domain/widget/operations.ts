import { resolveDesignScope, validateWidgetProject, widgetOperationSchema } from './schema'
import type {
  DesignScope,
  OperationFailure,
  OperationFailureCode,
  OperationResult,
  OperationSuccess,
  WidgetElement,
  WidgetOperation,
  WidgetProject,
  WidgetSize
} from '~/types/widget'

export interface ApplyOperationOptions {
  now?: () => string
}

function failure(
  state: WidgetProject,
  code: OperationFailureCode,
  message: string,
  warnings: string[] = []
): OperationFailure {
  return {
    ok: false,
    state,
    revision: state.revision,
    changedSizes: [],
    warnings,
    selection: state.selection,
    code,
    message
  }
}

function formatSizes(sizes: WidgetSize[]): string {
  if (sizes.length === 0) {
    return 'no widget sizes'
  }
  if (sizes.length === 1) {
    return sizes[0]!
  }
  if (sizes.length === 2) {
    return `${sizes[0]} and ${sizes[1]}`
  }
  return `${sizes.slice(0, -1).join(', ')}, and ${sizes.at(-1)}`
}

function findElement(root: WidgetElement, elementId: string): WidgetElement | null {
  if (root.id === elementId) {
    return root
  }

  if (root.type === 'group' || root.type === 'repeat') {
    for (const child of root.children) {
      const match = findElement(child, elementId)
      if (match) {
        return match
      }
    }
  }

  return null
}

function operationScope(state: WidgetProject, operation: WidgetOperation): DesignScope {
  if ('scope' in operation && operation.scope) {
    return operation.scope
  }
  return state.designScope
}

function finish(
  originalState: WidgetProject,
  nextState: WidgetProject,
  changedSizes: WidgetSize[],
  warnings: string[],
  message: string,
  now: () => string
): OperationResult {
  nextState.revision = originalState.revision + 1
  nextState.updatedAt = now()

  const validation = validateWidgetProject(nextState)
  if (!validation.ok) {
    return failure(
      originalState,
      'INVALID_PROJECT',
      'The operation would make the widget state invalid.',
      validation.issues.map(issue => `${issue.path || 'project'}: ${issue.message}`)
    )
  }

  const result: OperationSuccess = {
    ok: true,
    state: validation.value,
    revision: validation.value.revision,
    changedSizes,
    warnings,
    selection: validation.value.selection,
    message
  }
  return result
}

export function applyWidgetOperation(
  state: WidgetProject,
  input: unknown,
  options: ApplyOperationOptions = {}
): OperationResult {
  const currentValidation = validateWidgetProject(state)
  if (!currentValidation.ok) {
    return failure(
      state,
      'INVALID_PROJECT',
      'The current widget state is invalid and cannot accept operations.',
      currentValidation.issues.map(issue => `${issue.path || 'project'}: ${issue.message}`)
    )
  }

  const parsedOperation = widgetOperationSchema.safeParse(input)
  if (!parsedOperation.success) {
    return failure(
      state,
      'INVALID_OPERATION',
      'The operation arguments are invalid.',
      parsedOperation.error.issues.map(issue => `${issue.path.join('.') || 'operation'}: ${issue.message}`)
    )
  }

  const operation = parsedOperation.data
  if (operation.expectedRevision !== state.revision) {
    return failure(
      state,
      'STALE_REVISION',
      `Revision ${operation.expectedRevision} is stale. Read revision ${state.revision} before trying again.`
    )
  }

  const nextState = currentValidation.value
  const now = options.now ?? (() => new Date().toISOString())

  if (operation.type === 'set-design-scope') {
    nextState.designScope = operation.scope
    const sizes = resolveDesignScope(operation.scope)
    return finish(
      state,
      nextState,
      sizes,
      [],
      `Design scope set to ${formatSizes(sizes)}.`,
      now
    )
  }

  if (operation.type === 'set-selection') {
    nextState.selection = operation.selection
    const sizes = operation.selection ? [operation.selection.size] : []
    return finish(
      state,
      nextState,
      sizes,
      [],
      operation.selection
        ? `Selected ${operation.selection.elementId} in the ${operation.selection.size} layout.`
        : 'Selection cleared.',
      now
    )
  }

  const sizes = resolveDesignScope(operationScope(state, operation))

  if (operation.type === 'set-layout-background') {
    for (const size of sizes) {
      nextState.layouts[size].background = operation.background
    }
    return finish(
      state,
      nextState,
      sizes,
      [],
      `Updated the background in ${formatSizes(sizes)}.`,
      now
    )
  }

  const changedSizes: WidgetSize[] = []
  const warnings: string[] = []
  let foundTarget = false
  let foundWrongType = false

  for (const size of sizes) {
    const target = findElement(nextState.layouts[size].root, operation.elementId)
    if (!target) {
      warnings.push(`${operation.elementId} does not exist in the ${size} layout.`)
      continue
    }

    foundTarget = true
    if (operation.type === 'update-element-style') {
      target.style = {
        ...target.style,
        ...operation.patch
      }
      changedSizes.push(size)
      continue
    }

    if (target.type !== 'text' && target.type !== 'date') {
      foundWrongType = true
      warnings.push(`${operation.elementId} is not text or a date in the ${size} layout.`)
      continue
    }

    target.textStyle = {
      ...target.textStyle,
      ...operation.patch
    }
    changedSizes.push(size)
  }

  if (changedSizes.length === 0) {
    if (foundTarget && foundWrongType) {
      return failure(
        state,
        'TARGET_TYPE_MISMATCH',
        `${operation.elementId} cannot accept the requested text style.`,
        warnings
      )
    }
    return failure(
      state,
      'TARGET_NOT_FOUND',
      `${operation.elementId} was not found in the requested layouts.`,
      warnings
    )
  }

  const operationLabel = operation.type === 'update-element-style' ? 'element style' : 'text style'
  return finish(
    state,
    nextState,
    changedSizes,
    warnings,
    `Updated ${operation.elementId} ${operationLabel} in ${formatSizes(changedSizes)}.`,
    now
  )
}
