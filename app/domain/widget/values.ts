import type {
  DataPath,
  JsonObject,
  JsonValue,
  ValueSource,
  WidgetProject
} from '~/types/widget'

export function getValueAtPath(value: unknown, path: DataPath): unknown {
  let current = value
  for (const segment of path) {
    if (typeof segment === 'number') {
      if (!Array.isArray(current)) {
        return undefined
      }
      current = current[segment]
      continue
    }

    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function resolveBindingValue(project: WidgetProject, bindingId: string): JsonValue | undefined {
  const binding = project.bindings.find(candidate => candidate.id === bindingId)
  if (!binding) {
    return undefined
  }
  return getValueAtPath(project.data.value, binding.path) as JsonValue | undefined
}

export function resolveValueSource(
  source: ValueSource,
  project: WidgetProject,
  item: JsonObject | null = null
): JsonValue {
  if (source.kind === 'literal') {
    return source.value
  }

  const resolved = source.kind === 'binding'
    ? resolveBindingValue(project, source.bindingId)
    : getValueAtPath(item, source.path)

  if (
    resolved === undefined
    || resolved === null
    || typeof resolved === 'object'
  ) {
    return source.fallback
  }
  return resolved as JsonValue
}

export function resolveValueText(
  source: ValueSource,
  project: WidgetProject,
  item: JsonObject | null = null
): string {
  const value = resolveValueSource(source, project, item)
  const text = typeof value === 'boolean'
    ? value ? 'Yes' : 'No'
    : String(value)

  if (source.kind === 'literal' || !source.format) {
    return text
  }
  return `${source.format.prefix}${text}${source.format.suffix}`
}

export function resolveRepeatItems(project: WidgetProject, bindingId: string): JsonObject[] {
  const value = resolveBindingValue(project, bindingId)
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is JsonObject => (
    typeof item === 'object' && item !== null && !Array.isArray(item)
  ))
}

export function formatDateValue(value: string, format: 'date' | 'time' | 'date-time' | 'relative'): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  if (format === 'relative') {
    const diffMinutes = Math.round((parsed.getTime() - Date.now()) / 60000)
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    if (Math.abs(diffMinutes) < 60) {
      return formatter.format(diffMinutes, 'minute')
    }
    const diffHours = Math.round(diffMinutes / 60)
    if (Math.abs(diffHours) < 24) {
      return formatter.format(diffHours, 'hour')
    }
    return formatter.format(Math.round(diffHours / 24), 'day')
  }

  const options: Intl.DateTimeFormatOptions = format === 'date'
    ? { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }
    : format === 'time'
      ? { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }
      : {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'UTC'
        }

  return new Intl.DateTimeFormat('en', options).format(parsed)
}
