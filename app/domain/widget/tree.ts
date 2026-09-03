import type { WidgetElement } from '~/types/widget'

export function findWidgetElement(
  root: WidgetElement,
  elementId: string
): WidgetElement | null {
  if (root.id === elementId) {
    return root
  }

  if (root.type === 'group' || root.type === 'repeat') {
    for (const child of root.children) {
      const match = findWidgetElement(child, elementId)
      if (match) {
        return match
      }
    }
  }

  return null
}

export function widgetElementLabel(element: WidgetElement): string {
  if (element.id === 'root') {
    return 'Widget'
  }

  const words = element.id.split('-').filter(Boolean)
  if (words.length === 0) {
    return element.type
  }

  return words
    .map(word => word[0]!.toUpperCase() + word.slice(1))
    .join(' ')
}

export function widgetElementIcon(element: WidgetElement): string {
  switch (element.type) {
    case 'text':
      return 'i-lucide-type'
    case 'date':
      return 'i-lucide-calendar-clock'
    case 'image':
      return 'i-lucide-image'
    case 'symbol':
      return 'i-lucide-sparkles'
    case 'group':
      return 'i-lucide-panels-top-left'
    case 'spacer':
      return 'i-lucide-move-horizontal'
    case 'repeat':
      return 'i-lucide-repeat-2'
    case 'progress-ring':
      return 'i-lucide-circle-gauge'
    case 'progress-bar':
      return 'i-lucide-rectangle-horizontal'
    case 'sparkline':
      return 'i-lucide-chart-spline'
    case 'bar-chart':
      return 'i-lucide-chart-no-axes-column'
  }
}
