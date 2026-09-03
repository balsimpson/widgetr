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

  const transformed = source.format.transform === 'weekday'
    ? formatWeekday(text)
    : source.format.transform === 'time'
      ? formatLocalTime(text)
      : source.format.transform === 'integer'
        ? formatInteger(text)
        : source.format.transform === 'weather-code'
          ? formatWeatherCode(text)
      : text
  return `${source.format.prefix}${transformed}${source.format.suffix}`
}

function formatWeekday(value: string): string {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00Z`)
    : new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(parsed)
}

function formatLocalTime(value: string): string {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(parsed)
}

function formatInteger(value: string): string {
  const numeric = Number(value)
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(numeric)
    : value
}

function formatWeatherCode(value: string): string {
  const code = Number(value)
  if (!Number.isInteger(code)) {
    return value
  }
  if (code === 0) return 'Clear sky'
  if (code === 1) return 'Mainly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if ([45, 48].includes(code)) return 'Fog'
  if ([51, 53, 55].includes(code)) return 'Drizzle'
  if ([56, 57].includes(code)) return 'Freezing drizzle'
  if ([61, 63, 65].includes(code)) return 'Rain'
  if ([66, 67].includes(code)) return 'Freezing rain'
  if ([71, 73, 75, 77].includes(code)) return 'Snow'
  if ([80, 81, 82].includes(code)) return 'Rain showers'
  if ([85, 86].includes(code)) return 'Snow showers'
  if ([95, 96, 99].includes(code)) return 'Thunderstorm'
  return value
}

export function resolveRepeatItems(project: WidgetProject, bindingId: string): JsonObject[] {
  const value = resolveBindingValue(project, bindingId)
  if (Array.isArray(value)) {
    return value.filter((item): item is JsonObject => (
      typeof item === 'object' && item !== null && !Array.isArray(item)
    ))
  }

  if (typeof value !== 'object' || value === null) {
    return []
  }

  const columns = Object.entries(value).filter((entry): entry is [string, JsonValue[]] => (
    Array.isArray(entry[1])
  ))
  const length = Math.max(0, ...columns.map(([, column]) => column.length))
  return Array.from({ length }, (_, index) => Object.fromEntries(
    columns.map(([key, column]) => [key, column[index] ?? null])
  ) as JsonObject)
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
