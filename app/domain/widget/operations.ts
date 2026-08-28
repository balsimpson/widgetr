import { resolveDesignScope, validateWidgetProject, widgetOperationSchema } from './schema'
import { WIDGET_SIZES } from '~/types/widget'
import type {
  DesignScope,
  OperationFailure,
  OperationFailureCode,
  OperationResult,
  OperationSuccess,
  UpdateElementContentOperation,
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

function applyElementContentPatch(
  target: WidgetElement,
  patch: UpdateElementContentOperation['patch']
): boolean {
  const specificKeys = Object.keys(patch).filter(key => key !== 'visible')

  const supportedKeys = target.type === 'text'
    ? ['value']
    : target.type === 'date'
      ? ['value', 'format']
      : target.type === 'image'
        ? ['source', 'alt', 'fit', 'crop']
        : target.type === 'symbol'
          ? ['name', 'color', 'size']
          : target.type === 'group'
            ? ['direction', 'spacing', 'horizontalAlignment', 'verticalAlignment', 'distribution']
            : target.type === 'repeat'
              ? ['limit', 'direction', 'spacing', 'horizontalAlignment', 'verticalAlignment', 'distribution']
              : ['length']

  if (specificKeys.some(key => !supportedKeys.includes(key))) {
    return false
  }

  if (patch.visible !== undefined) {
    target.visible = patch.visible
  }

  if (target.type === 'text' || target.type === 'date') {
    if (patch.value !== undefined) {
      target.value = patch.value
    }
    if (target.type === 'date' && patch.format !== undefined) {
      target.format = patch.format
    }
  }

  if (target.type === 'image') {
    if (patch.source !== undefined) {
      target.source = patch.source
    }
    if (patch.alt !== undefined) {
      target.alt = patch.alt
    }
    if (patch.fit !== undefined) {
      target.fit = patch.fit
    }
    if (patch.crop !== undefined) {
      target.crop = patch.crop
    }
  }

  if (target.type === 'symbol') {
    if (patch.name !== undefined) {
      target.name = patch.name
    }
    if (patch.color !== undefined) {
      target.color = patch.color
    }
    if (patch.size !== undefined) {
      target.size = patch.size
    }
  }

  if (target.type === 'group' || target.type === 'repeat') {
    if (patch.direction !== undefined) {
      target.direction = patch.direction
    }
    if (patch.spacing !== undefined) {
      target.spacing = patch.spacing
    }
    if (patch.horizontalAlignment !== undefined) {
      target.horizontalAlignment = patch.horizontalAlignment
    }
    if (patch.verticalAlignment !== undefined) {
      target.verticalAlignment = patch.verticalAlignment
    }
    if (patch.distribution !== undefined) {
      target.distribution = patch.distribution
    }
    if (target.type === 'repeat' && patch.limit !== undefined) {
      target.limit = patch.limit
    }
  }

  if (target.type === 'spacer' && patch.length !== undefined) {
    target.length = patch.length
  }

  return true
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

  if (operation.type === 'update-project-metadata') {
    if (operation.patch.name !== undefined) {
      nextState.name = operation.patch.name
    }
    if (operation.patch.localReference !== undefined) {
      nextState.localReference = operation.patch.localReference
    }
    if (operation.patch.importReport !== undefined) {
      nextState.importReport = operation.patch.importReport
    }
    return finish(
      state,
      nextState,
      [],
      [],
      'Updated project details.',
      now
    )
  }

  if (operation.type === 'restore-snapshot') {
    return finish(
      state,
      structuredClone(operation.snapshot),
      [...WIDGET_SIZES],
      [],
      'Restored a session history snapshot.',
      now
    )
  }

  const sizes = resolveDesignScope(operationScope(state, operation))

  if (operation.type === 'set-layout-background') {
    for (const size of sizes) {
      nextState.layouts[size].background = structuredClone(operation.background)
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

  if (operation.type === 'reorder-children') {
    const changedSizes: WidgetSize[] = []
    const warnings: string[] = []
    let foundParent = false
    let foundWrongType = false
    let invalidIndex = false

    for (const size of sizes) {
      const parent = findElement(nextState.layouts[size].root, operation.elementId)
      if (!parent) {
        warnings.push(`${operation.elementId} does not exist in the ${size} layout.`)
        continue
      }

      foundParent = true
      if (parent.type !== 'group' && parent.type !== 'repeat') {
        foundWrongType = true
        warnings.push(`${operation.elementId} is not a group or repeat in the ${size} layout.`)
        continue
      }

      const childIndex = parent.children.findIndex(child => child.id === operation.childId)
      if (childIndex < 0) {
        warnings.push(`${operation.childId} does not exist inside ${operation.elementId} in the ${size} layout.`)
        continue
      }

      if (operation.toIndex >= parent.children.length) {
        invalidIndex = true
        warnings.push(`The target child position ${operation.toIndex} is outside the ${size} layout group.`)
        continue
      }

      const [child] = parent.children.splice(childIndex, 1)
      parent.children.splice(operation.toIndex, 0, child!)
      changedSizes.push(size)
    }

    if (changedSizes.length === 0) {
      if (invalidIndex) {
        return failure(
          state,
          'INVALID_OPERATION',
          `The child position ${operation.toIndex} is outside the requested group.`,
          warnings
        )
      }
      if (foundParent && foundWrongType) {
        return failure(
          state,
          'TARGET_TYPE_MISMATCH',
          `${operation.elementId} cannot accept child ordering changes.`,
          warnings
        )
      }
      return failure(
        state,
        'TARGET_NOT_FOUND',
        `${operation.childId} was not found in the requested group layouts.`,
        warnings
      )
    }

    return finish(
      state,
      nextState,
      changedSizes,
      warnings,
      `Moved ${operation.childId} in ${operation.elementId} for ${formatSizes(changedSizes)}.`,
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

    if (operation.type === 'update-element-content') {
      if (!applyElementContentPatch(target, operation.patch)) {
        foundWrongType = true
        warnings.push(`${operation.elementId} does not support the requested content change in the ${size} layout.`)
        continue
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
      const typeMessage = operation.type === 'update-text-style'
        ? 'text style'
        : operation.type === 'update-element-content'
          ? 'content'
          : 'element style'
      return failure(
        state,
        'TARGET_TYPE_MISMATCH',
        `${operation.elementId} cannot accept the requested ${typeMessage} change.`,
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

  const operationLabel = operation.type === 'update-element-style'
    ? 'element style'
    : operation.type === 'update-element-content'
      ? 'content'
      : 'text style'
  return finish(
    state,
    nextState,
    changedSizes,
    warnings,
    `Updated ${operation.elementId} ${operationLabel} in ${formatSizes(changedSizes)}.`,
    now
  )
}
