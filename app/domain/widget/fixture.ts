import { createEdgeInsets, createElementStyle, createTextStyle } from './defaults'
import { parseWidgetProject } from './schema'
import type {
  GroupElement,
  RepeatElement,
  WidgetElement,
  WidgetProject,
  WidgetSize
} from '~/types/widget'

const fixedData = {
  location: 'Kochi',
  temperature: 29,
  condition: 'Light rain',
  updatedAt: '2026-08-28T04:45:00.000Z',
  heroImage: '/sample-monsoon.svg',
  forecast: [
    { day: 'Fri', high: '30°', low: '25°', symbol: 'cloud.rain.fill', rain: '70%' },
    { day: 'Sat', high: '29°', low: '25°', symbol: 'cloud.heavyrain.fill', rain: '82%' },
    { day: 'Sun', high: '30°', low: '24°', symbol: 'cloud.sun.rain.fill', rain: '54%' },
    { day: 'Mon', high: '31°', low: '25°', symbol: 'cloud.sun.fill', rain: '38%' },
    { day: 'Tue', high: '30°', low: '25°', symbol: 'cloud.rain.fill', rain: '64%' }
  ]
}

function group(
  id: string,
  direction: GroupElement['direction'],
  children: WidgetElement[],
  options: Partial<Omit<GroupElement, 'id' | 'type' | 'children' | 'direction'>> = {}
): GroupElement {
  return {
    id,
    type: 'group',
    visible: true,
    style: createElementStyle(),
    direction,
    spacing: 0,
    horizontalAlignment: 'leading',
    verticalAlignment: 'top',
    distribution: 'start',
    children,
    ...options
  }
}

function text(
  id: string,
  bindingId: string,
  fallback: string,
  fontSize: number,
  options: {
    color?: string
    weight?: 'regular' | 'medium' | 'semibold' | 'bold'
    design?: 'default' | 'rounded' | 'monospaced' | 'serif'
    alignment?: 'leading' | 'center' | 'trailing'
    width?: number | 'fill' | 'fit'
    lineLimit?: number
    prefix?: string
    suffix?: string
  } = {}
): WidgetElement {
  return {
    id,
    type: 'text',
    visible: true,
    style: createElementStyle({
      width: options.width ?? 'fit'
    }),
    value: {
      kind: 'binding',
      bindingId,
      fallback,
      ...(
        options.prefix !== undefined || options.suffix !== undefined
          ? {
              format: {
                prefix: options.prefix ?? '',
                suffix: options.suffix ?? ''
              }
            }
          : {}
      )
    },
    textStyle: createTextStyle({
      fontSize,
      color: options.color ?? '#FFFFFF',
      fontWeight: options.weight ?? 'regular',
      fontDesign: options.design ?? 'default',
      alignment: options.alignment ?? 'leading',
      lineLimit: options.lineLimit ?? 1
    })
  }
}

function literalText(
  id: string,
  value: string,
  fontSize: number,
  options: {
    color?: string
    weight?: 'regular' | 'medium' | 'semibold' | 'bold'
    design?: 'default' | 'rounded' | 'monospaced' | 'serif'
    alignment?: 'leading' | 'center' | 'trailing'
    width?: number | 'fill' | 'fit'
    lineLimit?: number
  } = {}
): WidgetElement {
  return {
    id,
    type: 'text',
    visible: true,
    style: createElementStyle({
      width: options.width ?? 'fit'
    }),
    value: {
      kind: 'literal',
      value
    },
    textStyle: createTextStyle({
      fontSize,
      color: options.color ?? '#172033',
      fontWeight: options.weight ?? 'regular',
      fontDesign: options.design ?? 'default',
      alignment: options.alignment ?? 'leading',
      lineLimit: options.lineLimit ?? 2
    })
  }
}

function itemText(
  id: string,
  path: string,
  fallback: string,
  fontSize: number,
  options: {
    color?: string
    weight?: 'regular' | 'medium' | 'semibold' | 'bold'
    width?: number | 'fill' | 'fit'
    alignment?: 'leading' | 'center' | 'trailing'
  } = {}
): WidgetElement {
  return {
    id,
    type: 'text',
    visible: true,
    style: createElementStyle({ width: options.width ?? 'fit' }),
    value: {
      kind: 'item',
      path: [path],
      fallback
    },
    textStyle: createTextStyle({
      fontSize,
      color: options.color ?? '#FFFFFF',
      fontWeight: options.weight ?? 'regular',
      alignment: options.alignment ?? 'leading'
    })
  }
}

function itemSymbol(id: string, size: number, color = '#FFFFFF'): WidgetElement {
  return {
    id,
    type: 'symbol',
    visible: true,
    style: createElementStyle(),
    name: {
      kind: 'item',
      path: ['symbol'],
      fallback: 'cloud.fill'
    },
    color,
    size
  }
}

function repeat(
  id: string,
  limit: number,
  direction: RepeatElement['direction'],
  children: WidgetElement[],
  options: Partial<Omit<RepeatElement, 'id' | 'type' | 'itemsBindingId' | 'limit' | 'direction' | 'children'>> = {}
): RepeatElement {
  return {
    id,
    type: 'repeat',
    visible: true,
    style: createElementStyle({ width: 'fill' }),
    itemsBindingId: 'forecast',
    limit,
    direction,
    spacing: 8,
    horizontalAlignment: 'leading',
    verticalAlignment: 'top',
    distribution: 'start',
    children,
    ...options
  }
}

function spacer(id: string, length: number | 'flex'): WidgetElement {
  return {
    id,
    type: 'spacer',
    visible: true,
    style: createElementStyle(),
    length
  }
}

function conditionRow(size: WidgetSize): GroupElement {
  return group('condition-row', 'horizontal', [
    {
      id: 'condition-symbol',
      type: 'symbol',
      visible: true,
      style: createElementStyle(),
      name: {
        kind: 'literal',
        value: 'cloud.rain.fill'
      },
      color: size === 'medium' ? '#355DFF' : '#FFFFFF',
      size: size === 'small' ? 14 : 16
    },
    text(
      'condition',
      'condition',
      'Weather unavailable',
      size === 'small' ? 11 : 13,
      {
        color: size === 'medium' ? '#334155' : '#FFFFFF',
        weight: 'medium'
      }
    )
  ], {
    spacing: 6,
    verticalAlignment: 'center'
  })
}

const smallLayoutRoot = group('root', 'vertical', [
  text('location', 'location', 'Location unavailable', 12, {
    color: '#D8E7FF',
    weight: 'semibold'
  }),
  text('temperature', 'temperature', '--', 42, {
    weight: 'bold',
    design: 'rounded',
    suffix: '°'
  }),
  conditionRow('small'),
  spacer('content-spacer', 'flex'),
  {
    id: 'updated',
    type: 'date',
    visible: true,
    style: createElementStyle(),
    value: {
      kind: 'binding',
      bindingId: 'updated-at',
      fallback: 'Update unavailable'
    },
    format: 'time',
    textStyle: createTextStyle({
      fontSize: 9,
      fontWeight: 'medium',
      fontDesign: 'monospaced',
      color: '#BFD3F5'
    })
  }
], {
  style: createElementStyle({ width: 'fill', height: 'fill' }),
  spacing: 3
})

const mediumForecastItem = group('forecast-item', 'vertical', [
  itemText('forecast-day', 'day', 'Day', 9, {
    color: '#64748B',
    weight: 'semibold',
    width: 'fill',
    alignment: 'center'
  }),
  itemSymbol('forecast-symbol', 15, '#355DFF'),
  itemText('forecast-high', 'high', '--', 11, {
    color: '#172033',
    weight: 'bold',
    width: 'fill',
    alignment: 'center'
  })
], {
  style: createElementStyle({ width: 'fill' }),
  spacing: 2,
  horizontalAlignment: 'center'
})

const mediumLayoutRoot = group('root', 'horizontal', [
  {
    id: 'weather-image',
    type: 'image',
    visible: true,
    style: createElementStyle({
      width: 104,
      height: 'fill',
      cornerRadius: 18
    }),
    source: {
      kind: 'binding',
      bindingId: 'hero-image',
      fallback: '/sample-monsoon.svg'
    },
    alt: 'Monsoon clouds over Kochi harbour',
    fit: 'cover',
    crop: { x: 50, y: 50 }
  },
  group('weather-summary', 'vertical', [
    text('location', 'location', 'Location unavailable', 11, {
      color: '#64748B',
      weight: 'semibold'
    }),
    group('temperature-line', 'horizontal', [
      text('temperature', 'temperature', '--', 32, {
        color: '#172033',
        weight: 'bold',
        design: 'rounded',
        suffix: '°'
      }),
      conditionRow('medium')
    ], {
      spacing: 10,
      verticalAlignment: 'center'
    }),
    spacer('summary-spacer', 'flex'),
    repeat('forecast-list', 3, 'horizontal', [mediumForecastItem], {
      spacing: 6,
      distribution: 'space-between'
    })
  ], {
    style: createElementStyle({ width: 'fill', height: 'fill' }),
    spacing: 3
  })
], {
  style: createElementStyle({ width: 'fill', height: 'fill' }),
  spacing: 14,
  verticalAlignment: 'center'
})

const largeForecastItem = group('forecast-row', 'horizontal', [
  itemText('forecast-day', 'day', 'Day', 13, {
    weight: 'semibold',
    width: 44
  }),
  itemSymbol('forecast-symbol', 18, '#DCEBFF'),
  itemText('forecast-rain', 'rain', '--', 11, {
    color: '#BFD3F5',
    width: 36
  }),
  spacer('forecast-spacer', 'flex'),
  itemText('forecast-high', 'high', '--', 14, {
    weight: 'bold',
    width: 32,
    alignment: 'trailing'
  }),
  itemText('forecast-low', 'low', '--', 13, {
    color: '#BFD3F5',
    width: 32,
    alignment: 'trailing'
  })
], {
  style: createElementStyle({
    width: 'fill',
    padding: {
      top: 7,
      right: 9,
      bottom: 7,
      left: 9
    },
    cornerRadius: 12,
    background: {
      kind: 'solid',
      color: '#10243C',
      opacity: 0.72
    }
  }),
  spacing: 8,
  verticalAlignment: 'center'
})

const largeLayoutRoot = group('root', 'vertical', [
  group('header', 'horizontal', [
    text('location', 'location', 'Location unavailable', 14, {
      weight: 'semibold'
    }),
    spacer('header-spacer', 'flex'),
    {
      id: 'updated',
      type: 'date',
      visible: true,
      style: createElementStyle(),
      value: {
        kind: 'binding',
        bindingId: 'updated-at',
        fallback: 'Update unavailable'
      },
      format: 'time',
      textStyle: createTextStyle({
        fontSize: 10,
        fontWeight: 'medium',
        fontDesign: 'monospaced',
        color: '#BFD3F5',
        alignment: 'trailing'
      })
    }
  ], {
    style: createElementStyle({ width: 'fill' }),
    verticalAlignment: 'center'
  }),
  text('temperature', 'temperature', '--', 52, {
    weight: 'bold',
    design: 'rounded',
    suffix: '°'
  }),
  conditionRow('large'),
  spacer('forecast-gap', 10),
  repeat('forecast-list', 5, 'vertical', [largeForecastItem], {
    spacing: 6
  })
], {
  style: createElementStyle({ width: 'fill', height: 'fill' }),
  spacing: 4
})

const fixture: WidgetProject = {
  schemaVersion: 1,
  id: 'phase-one-weather',
  name: 'Kochi monsoon sample',
  createdAt: '2026-08-28T04:30:00.000Z',
  updatedAt: '2026-08-28T04:30:00.000Z',
  revision: 0,
  dataSource: {
    kind: 'sample',
    url: null,
    method: 'GET',
    parameters: [],
    headers: [],
    refreshMinutes: 30,
    secretPlaceholders: []
  },
  data: {
    kind: 'sample',
    label: 'Fixed weather sample',
    capturedAt: '2026-08-28T04:45:00.000Z',
    value: fixedData
  },
  bindings: [
    { id: 'location', label: 'Location', path: ['location'], valueType: 'string' },
    { id: 'temperature', label: 'Temperature', path: ['temperature'], valueType: 'number' },
    { id: 'condition', label: 'Condition', path: ['condition'], valueType: 'string' },
    { id: 'updated-at', label: 'Updated time', path: ['updatedAt'], valueType: 'date' },
    { id: 'hero-image', label: 'Weather image', path: ['heroImage'], valueType: 'image-url' },
    { id: 'forecast', label: 'Five-day forecast', path: ['forecast'], valueType: 'list' }
  ],
  layouts: {
    small: {
      size: 'small',
      padding: createEdgeInsets(14),
      cornerRadius: 24,
      background: {
        kind: 'gradient',
        colors: ['#10243C', '#1D4D78', '#5B8FC4'],
        direction: 'bottom-right',
        opacity: 1
      },
      root: smallLayoutRoot
    },
    medium: {
      size: 'medium',
      padding: createEdgeInsets(12),
      cornerRadius: 24,
      background: {
        kind: 'solid',
        color: '#F8FAFC',
        opacity: 1
      },
      root: mediumLayoutRoot
    },
    large: {
      size: 'large',
      padding: createEdgeInsets(18),
      cornerRadius: 28,
      background: {
        kind: 'image',
        source: {
          kind: 'binding',
          bindingId: 'hero-image',
          fallback: '/sample-monsoon.svg'
        },
        fit: 'cover',
        overlayColor: '#0B1C30',
        overlayOpacity: 0.5
      },
      root: largeLayoutRoot
    }
  },
  selection: null,
  designScope: {
    kind: 'all'
  },
  styleProvenance: null,
  localReference: null,
  diagnostics: []
}

export const SAMPLE_WIDGET_PROJECT = parseWidgetProject(fixture)

export function createSampleWidgetProject(): WidgetProject {
  return structuredClone(SAMPLE_WIDGET_PROJECT)
}

const neutralSmallRoot = group('root', 'vertical', [
  literalText('welcome', 'Start building', 18, {
    weight: 'bold',
    width: 'fill'
  }),
  literalText('prompt', 'Choose an idea to begin.', 11, {
    color: '#64748B',
    width: 'fill'
  }),
  spacer('content-spacer', 'flex'),
  literalText('assistant-hint', 'Continue in your assistant\'s chat.', 9, {
    color: '#64748B',
    width: 'fill'
  })
], {
  style: createElementStyle({
    width: 'fill',
    height: 'fill',
    padding: createEdgeInsets(12)
  }),
  spacing: 6
})

const neutralMediumRoot = group('root', 'horizontal', [
  group('welcome-copy', 'vertical', [
    literalText('welcome', 'Start building', 22, {
      weight: 'bold',
      width: 'fill'
    }),
    literalText('prompt', 'Choose an idea to begin.', 13, {
      color: '#64748B',
      width: 'fill'
    })
  ], {
    style: createElementStyle({
      width: 'fill',
      height: 'fill'
    }),
    spacing: 6
  }),
  spacer('content-spacer', 14),
  group('assistant-note', 'vertical', [
    literalText('assistant-label', 'Next step', 10, {
      color: '#355DFF',
      weight: 'semibold',
      width: 'fill'
    }),
    literalText('assistant-hint', 'Continue in your assistant\'s chat.', 11, {
      color: '#64748B',
      width: 118
    })
  ], {
    style: createElementStyle({
      width: 132,
      padding: createEdgeInsets(10),
      cornerRadius: 14,
      background: {
        kind: 'solid',
        color: '#EEF2FF',
        opacity: 1
      }
    }),
    spacing: 4,
    verticalAlignment: 'center'
  })
], {
  style: createElementStyle({
    width: 'fill',
    height: 'fill',
    padding: createEdgeInsets(14)
  }),
  spacing: 10,
  verticalAlignment: 'center'
})

const neutralLargeRoot = group('root', 'vertical', [
  literalText('welcome', 'Start building', 30, {
    weight: 'bold',
    width: 'fill'
  }),
  literalText('prompt', 'Choose an idea or add a reference.', 16, {
    color: '#64748B',
    width: 'fill'
  }),
  spacer('hero-spacer', 'flex'),
  group('assistant-note', 'vertical', [
    literalText('assistant-label', 'Your next step', 11, {
      color: '#355DFF',
      weight: 'semibold',
      width: 'fill'
    }),
    literalText('assistant-hint', 'Continue in your assistant\'s chat.', 14, {
      color: '#334155',
      width: 'fill'
    })
  ], {
    style: createElementStyle({
      width: 'fill',
      padding: {
        top: 14,
        right: 16,
        bottom: 14,
        left: 16
      },
      cornerRadius: 16,
      background: {
        kind: 'solid',
        color: '#EEF2FF',
        opacity: 1
      }
    }),
    spacing: 5
  })
], {
  style: createElementStyle({
    width: 'fill',
    height: 'fill',
    padding: createEdgeInsets(20)
  }),
  spacing: 8
})

const neutralFixture: WidgetProject = {
  schemaVersion: 1,
  id: 'neutral-widget-template',
  name: 'New widget',
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
  revision: 0,
  dataSource: {
    kind: 'none',
    url: null,
    method: 'GET',
    parameters: [],
    headers: [],
    refreshMinutes: 30,
    secretPlaceholders: []
  },
  data: {
    kind: 'sample',
    label: 'No data configured',
    capturedAt: '2026-08-31T00:00:00.000Z',
    value: {}
  },
  bindings: [],
  layouts: {
    small: {
      size: 'small',
      padding: createEdgeInsets(0),
      cornerRadius: 24,
      background: {
        kind: 'solid',
        color: '#F8FAFC',
        opacity: 1
      },
      root: neutralSmallRoot
    },
    medium: {
      size: 'medium',
      padding: createEdgeInsets(0),
      cornerRadius: 24,
      background: {
        kind: 'solid',
        color: '#F8FAFC',
        opacity: 1
      },
      root: neutralMediumRoot
    },
    large: {
      size: 'large',
      padding: createEdgeInsets(0),
      cornerRadius: 28,
      background: {
        kind: 'solid',
        color: '#F8FAFC',
        opacity: 1
      },
      root: neutralLargeRoot
    }
  },
  selection: null,
  designScope: {
    kind: 'all'
  },
  styleProvenance: null,
  localReference: null,
  diagnostics: []
}

export const NEUTRAL_WIDGET_PROJECT = parseWidgetProject(neutralFixture)

export function createNeutralWidgetProject(): WidgetProject {
  return structuredClone(NEUTRAL_WIDGET_PROJECT)
}
