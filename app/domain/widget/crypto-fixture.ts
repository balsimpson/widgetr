import { createEdgeInsets, createElementStyle, createTextStyle } from './defaults'
import {
  CRYPTO_SAMPLE_DATA,
  createBitcoinDataSource
} from './crypto'
import { parseWidgetProject } from './schema'
import type {
  DateElement,
  GroupElement,
  SparklineElement,
  TextElement,
  WidgetElement,
  WidgetProject
} from '~/types/widget'

const BITCOIN_ORANGE = '#F7931A'
const WARM_WHITE = '#F4F1EA'
const MUTED_BLUE = '#8993A3'
const SOFT_BLUE = '#B7C1D1'

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

function literalText(
  id: string,
  value: string,
  fontSize: number,
  options: {
    color?: string
    weight?: TextElement['textStyle']['fontWeight']
    design?: TextElement['textStyle']['fontDesign']
    alignment?: TextElement['textStyle']['alignment']
    width?: TextElement['style']['width']
    lineLimit?: number
  } = {}
): TextElement {
  return {
    id,
    type: 'text',
    visible: true,
    style: createElementStyle({ width: options.width ?? 'fit' }),
    value: { kind: 'literal', value },
    textStyle: createTextStyle({
      fontSize,
      color: options.color ?? WARM_WHITE,
      fontWeight: options.weight ?? 'regular',
      fontDesign: options.design ?? 'default',
      alignment: options.alignment ?? 'leading',
      lineLimit: options.lineLimit ?? 1
    })
  }
}

function boundText(
  id: string,
  bindingId: string,
  fallback: string,
  fontSize: number,
  options: {
    color?: string
    weight?: TextElement['textStyle']['fontWeight']
    design?: TextElement['textStyle']['fontDesign']
    alignment?: TextElement['textStyle']['alignment']
    width?: TextElement['style']['width']
    lineLimit?: number
  } = {}
): TextElement {
  return {
    id,
    type: 'text',
    visible: true,
    style: createElementStyle({ width: options.width ?? 'fit' }),
    value: {
      kind: 'binding',
      bindingId,
      fallback
    },
    textStyle: createTextStyle({
      fontSize,
      color: options.color ?? WARM_WHITE,
      fontWeight: options.weight ?? 'regular',
      fontDesign: options.design ?? 'default',
      alignment: options.alignment ?? 'leading',
      lineLimit: options.lineLimit ?? 1
    })
  }
}

function updatedAt(id: string): DateElement {
  return {
    id,
    type: 'date',
    visible: true,
    style: createElementStyle({ width: 'fit' }),
    value: {
      kind: 'binding',
      bindingId: 'updated-at',
      fallback: CRYPTO_SAMPLE_DATA.updatedAt
    },
    format: 'time',
    textStyle: createTextStyle({
      fontSize: 9,
      color: MUTED_BLUE,
      fontDesign: 'monospaced',
      lineLimit: 1
    })
  }
}

function spacer(id: string, length: 'flex' | number = 'flex'): WidgetElement {
  return {
    id,
    type: 'spacer',
    visible: true,
    style: createElementStyle(),
    length
  }
}

function sparkline(id: string, height: number): SparklineElement {
  return {
    id,
    type: 'sparkline',
    visible: true,
    style: createElementStyle({
      width: 'fill',
      height
    }),
    values: {
      kind: 'binding',
      bindingId: 'history',
      fallback: [...CRYPTO_SAMPLE_DATA.history]
    },
    lineColor: BITCOIN_ORANGE,
    fillColor: BITCOIN_ORANGE,
    thickness: 3,
    density: 'balanced'
  }
}

const bindings = [
  { id: 'asset', label: 'Asset', path: ['asset'], valueType: 'string' as const },
  { id: 'symbol', label: 'Symbol', path: ['symbol'], valueType: 'string' as const },
  { id: 'pair', label: 'Trading pair', path: ['pair'], valueType: 'string' as const },
  { id: 'price-display', label: 'Current price', path: ['priceDisplay'], valueType: 'string' as const },
  { id: 'change-7d-display', label: 'Seven-day change', path: ['change7dDisplay'], valueType: 'string' as const },
  { id: 'low-7d-display', label: 'Seven-day low', path: ['low7dDisplay'], valueType: 'string' as const },
  { id: 'high-7d-display', label: 'Seven-day high', path: ['high7dDisplay'], valueType: 'string' as const },
  { id: 'history', label: 'Seven-day price history', path: ['history'], valueType: 'list' as const },
  { id: 'updated-at', label: 'Last updated', path: ['updatedAt'], valueType: 'date' as const }
]

const smallRoot = group('root', 'vertical', [
  group('small-header', 'horizontal', [
    literalText('small-mark', '₿', 18, { color: BITCOIN_ORANGE, weight: 'bold', design: 'rounded' }),
    boundText('small-pair', 'pair', 'BTC-USD', 9, { color: MUTED_BLUE, design: 'monospaced' }),
    spacer('small-header-spacer'),
    literalText('small-window', '7D', 9, { color: MUTED_BLUE, weight: 'bold', design: 'monospaced' })
  ], {
    style: createElementStyle({ width: 'fill' }),
    spacing: 4,
    verticalAlignment: 'center'
  }),
  boundText('small-price', 'price-display', CRYPTO_SAMPLE_DATA.priceDisplay, 27, {
    width: 'fill',
    color: WARM_WHITE,
    weight: 'bold',
    design: 'monospaced'
  }),
  boundText('small-change', 'change-7d-display', CRYPTO_SAMPLE_DATA.change7dDisplay, 10, {
    color: BITCOIN_ORANGE,
    weight: 'semibold',
    design: 'monospaced'
  }),
  spacer('small-chart-spacer'),
  sparkline('small-chart', 45),
  updatedAt('small-updated-at')
], {
  style: createElementStyle({
    width: 'fill',
    height: 'fill',
    padding: { top: 14, right: 14, bottom: 12, left: 14 }
  }),
  spacing: 5
})

const mediumRoot = group('root', 'horizontal', [
  group('medium-summary', 'vertical', [
    group('medium-brand', 'horizontal', [
      literalText('medium-mark', '₿', 19, { color: BITCOIN_ORANGE, weight: 'bold', design: 'rounded' }),
      boundText('medium-symbol', 'symbol', 'BTC', 10, { color: SOFT_BLUE, weight: 'semibold', design: 'monospaced' })
    ], {
      style: createElementStyle({ width: 'fill' }),
      spacing: 5,
      verticalAlignment: 'center'
    }),
    boundText('medium-asset', 'asset', 'Bitcoin', 12, { color: MUTED_BLUE }),
    boundText('medium-price', 'price-display', CRYPTO_SAMPLE_DATA.priceDisplay, 26, {
      color: WARM_WHITE,
      weight: 'bold',
      design: 'monospaced',
      width: 'fill'
    }),
    boundText('medium-change', 'change-7d-display', CRYPTO_SAMPLE_DATA.change7dDisplay, 10, {
      color: BITCOIN_ORANGE,
      weight: 'semibold',
      design: 'monospaced'
    }),
    spacer('medium-summary-spacer'),
    updatedAt('medium-updated-at')
  ], {
    style: createElementStyle({ width: 126, height: 'fill' }),
    spacing: 4,
    verticalAlignment: 'top'
  }),
  group('medium-trend', 'vertical', [
    literalText('medium-trend-label', '7-day trend', 10, { color: MUTED_BLUE, weight: 'semibold' }),
    sparkline('medium-chart', 62),
    group('medium-range', 'horizontal', [
      group('medium-low', 'vertical', [
        literalText('medium-low-label', 'Low', 8, { color: MUTED_BLUE, design: 'monospaced' }),
        boundText('medium-low-value', 'low-7d-display', CRYPTO_SAMPLE_DATA.low7dDisplay, 9, { color: SOFT_BLUE, design: 'monospaced' })
      ], {
        style: createElementStyle({ width: 'fill' }),
        spacing: 2
      }),
      group('medium-high', 'vertical', [
        literalText('medium-high-label', 'High', 8, { color: MUTED_BLUE, design: 'monospaced' }),
        boundText('medium-high-value', 'high-7d-display', CRYPTO_SAMPLE_DATA.high7dDisplay, 9, { color: SOFT_BLUE, design: 'monospaced' })
      ], {
        style: createElementStyle({ width: 'fill' }),
        spacing: 2,
        horizontalAlignment: 'trailing'
      })
    ], {
      style: createElementStyle({ width: 'fill' }),
      spacing: 10,
      verticalAlignment: 'top'
    })
  ], {
    style: createElementStyle({ width: 'fill', height: 'fill' }),
    spacing: 7,
    verticalAlignment: 'top'
  })
], {
  style: createElementStyle({
    width: 'fill',
    height: 'fill',
    padding: { top: 15, right: 16, bottom: 14, left: 16 }
  }),
  spacing: 16,
  verticalAlignment: 'center'
})

const largeRoot = group('root', 'vertical', [
  group('large-header', 'horizontal', [
    group('large-brand', 'horizontal', [
      literalText('large-mark', '₿', 21, { color: BITCOIN_ORANGE, weight: 'bold', design: 'rounded' }),
      boundText('large-asset', 'asset', 'Bitcoin', 12, { color: WARM_WHITE, weight: 'semibold' }),
      boundText('large-symbol', 'symbol', 'BTC', 9, { color: MUTED_BLUE, design: 'monospaced' })
    ], {
      style: createElementStyle({ width: 'fit' }),
      spacing: 6,
      verticalAlignment: 'center'
    }),
    spacer('large-header-spacer'),
    updatedAt('large-updated-at')
  ], {
    style: createElementStyle({ width: 'fill' }),
    verticalAlignment: 'center'
  }),
  boundText('large-price', 'price-display', CRYPTO_SAMPLE_DATA.priceDisplay, 42, {
    width: 'fill',
    color: WARM_WHITE,
    weight: 'bold',
    design: 'monospaced'
  }),
  group('large-change-row', 'horizontal', [
    literalText('large-window', '7D', 9, { color: MUTED_BLUE, weight: 'bold', design: 'monospaced' }),
    boundText('large-change', 'change-7d-display', CRYPTO_SAMPLE_DATA.change7dDisplay, 12, {
      color: BITCOIN_ORANGE,
      weight: 'semibold',
      design: 'monospaced'
    })
  ], {
    style: createElementStyle({ width: 'fill' }),
    spacing: 7,
    verticalAlignment: 'center'
  }),
  spacer('large-chart-spacer', 8),
  sparkline('large-chart', 112),
  group('large-range', 'horizontal', [
    group('large-low', 'vertical', [
      literalText('large-low-label', '7D LOW', 8, { color: MUTED_BLUE, weight: 'semibold', design: 'monospaced' }),
      boundText('large-low-value', 'low-7d-display', CRYPTO_SAMPLE_DATA.low7dDisplay, 11, { color: SOFT_BLUE, design: 'monospaced' })
    ], {
      style: createElementStyle({ width: 'fill' }),
      spacing: 3
    }),
    group('large-high', 'vertical', [
      literalText('large-high-label', '7D HIGH', 8, { color: MUTED_BLUE, weight: 'semibold', design: 'monospaced' }),
      boundText('large-high-value', 'high-7d-display', CRYPTO_SAMPLE_DATA.high7dDisplay, 11, { color: SOFT_BLUE, design: 'monospaced' })
    ], {
      style: createElementStyle({ width: 'fill' }),
      spacing: 3,
      horizontalAlignment: 'trailing'
    })
  ], {
    style: createElementStyle({ width: 'fill' }),
    spacing: 12,
    verticalAlignment: 'top'
  }),
  spacer('large-footer-spacer'),
  literalText('large-source', 'CoinGecko market data · USD', 9, {
    color: MUTED_BLUE,
    design: 'monospaced'
  })
], {
  style: createElementStyle({
    width: 'fill',
    height: 'fill',
    padding: { top: 18, right: 18, bottom: 16, left: 18 }
  }),
  spacing: 5
})

const cryptoFixture: WidgetProject = {
  schemaVersion: 1,
  id: 'bitcoin-widget-template',
  name: 'Bitcoin tracker',
  createdAt: CRYPTO_SAMPLE_DATA.updatedAt,
  updatedAt: CRYPTO_SAMPLE_DATA.updatedAt,
  revision: 0,
  dataSource: createBitcoinDataSource(),
  data: {
    kind: 'sample',
    label: 'Sample Bitcoin data; refreshes live from CoinGecko',
    capturedAt: CRYPTO_SAMPLE_DATA.updatedAt,
    value: {
      ...CRYPTO_SAMPLE_DATA,
      history: [...CRYPTO_SAMPLE_DATA.history]
    }
  },
  bindings,
  layouts: {
    small: {
      size: 'small',
      padding: createEdgeInsets(0),
      cornerRadius: 24,
      background: {
        kind: 'gradient',
        colors: ['#0D1015', '#202832'],
        direction: 'bottom-right',
        opacity: 1
      },
      root: smallRoot
    },
    medium: {
      size: 'medium',
      padding: createEdgeInsets(0),
      cornerRadius: 24,
      background: {
        kind: 'solid',
        color: '#10151C',
        opacity: 1
      },
      root: mediumRoot
    },
    large: {
      size: 'large',
      padding: createEdgeInsets(0),
      cornerRadius: 28,
      background: {
        kind: 'gradient',
        colors: ['#10151C', '#242D38'],
        direction: 'bottom-right',
        opacity: 1
      },
      root: largeRoot
    }
  },
  selection: null,
  designScope: { kind: 'all' },
  styleProvenance: null,
  localReference: null,
  diagnostics: []
}

export const CRYPTO_WIDGET_PROJECT = parseWidgetProject(cryptoFixture)

export function createCryptoWidgetProject(): WidgetProject {
  return structuredClone(CRYPTO_WIDGET_PROJECT)
}
