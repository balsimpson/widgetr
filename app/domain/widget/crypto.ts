import type { DataSourceConfig, JsonObject } from '~/types/widget'

export const CRYPTO_DATA_ADAPTER = 'coingecko-bitcoin-usd' as const
export const LEGACY_CRYPTO_DATA_ADAPTER = 'coinbase-btc-usd' as const
export const CRYPTO_PRODUCT_ID = 'bitcoin'
export const CRYPTO_REFRESH_MINUTES = 15
export const CRYPTO_TICKER_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
export const CRYPTO_CANDLES_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7'

export function isBitcoinDataAdapter(adapter: string | undefined): boolean {
  return adapter === CRYPTO_DATA_ADAPTER || adapter === LEGACY_CRYPTO_DATA_ADAPTER
}

export type BitcoinMarketData = JsonObject & {
  asset: string
  symbol: string
  pair: string
  quoteCurrency: string
  price: number
  priceDisplay: string
  change7dPercent: number
  change7dDisplay: string
  low7d: number
  low7dDisplay: string
  high7d: number
  high7dDisplay: string
  history: number[]
  updatedAt: string
}

export const CRYPTO_SAMPLE_DATA = {
  asset: 'Bitcoin',
  symbol: 'BTC',
  pair: 'BTC-USD',
  quoteCurrency: 'USD',
  price: 81234.56,
  priceDisplay: '$81,234.56',
  change7dPercent: 4.2,
  change7dDisplay: '+4.2%',
  low7d: 76840.12,
  low7dDisplay: '$76,840.12',
  high7d: 82496.88,
  high7dDisplay: '$82,496.88',
  history: [76840.12, 78112.4, 77548.73, 79880.21, 80462.18, 81774.03, 81234.56],
  updatedAt: '2026-09-03T06:00:00.000Z'
} satisfies BitcoinMarketData

export interface CryptoDataFailure {
  ok: false
  code: 'HTTP_ERROR' | 'RATE_LIMITED' | 'FETCH_FAILED' | 'INVALID_RESPONSE' | 'CANCELLED'
  message: string
  recovery: string
}

export type CryptoFetchResult =
  | { ok: true, data: BitcoinMarketData, capturedAt: string }
  | CryptoDataFailure

export type CryptoNormalizationResult =
  | { ok: true, data: BitcoinMarketData }
  | { ok: false, message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function currentPrice(payload: unknown): number | null {
  if (!isRecord(payload)) {
    return null
  }

  const bitcoin = payload.bitcoin
  if (!isRecord(bitcoin)) {
    return null
  }

  return finiteNumber(bitcoin.usd)
}

interface PriceRow {
  timestamp: number
  price: number
}

function timestampInMilliseconds(value: unknown): number | null {
  const numeric = finiteNumber(value)
  if (numeric === null) {
    return null
  }
  return numeric < 10_000_000_000 ? numeric * 1000 : numeric
}

function priceRows(payload: unknown): PriceRow[] {
  if (!isRecord(payload) || !Array.isArray(payload.prices)) {
    return []
  }

  return payload.prices
    .flatMap((row: unknown): PriceRow[] => {
      if (!Array.isArray(row)) {
        return []
      }
      const timestamp = timestampInMilliseconds(row[0])
      const price = finiteNumber(row[1])
      if (timestamp === null || price === null) {
        return []
      }
      return [{ timestamp, price }]
    })
    .sort((left, right) => left.timestamp - right.timestamp)
}

function dailyPrices(rows: PriceRow[]): number[] {
  const pricesByDay = new Map<number, number>()
  for (const row of rows) {
    const day = Math.floor(row.timestamp / (24 * 60 * 60 * 1000))
    pricesByDay.set(day, row.price)
  }
  return [...pricesByDay.entries()]
    .sort(([left], [right]) => left - right)
    .slice(-7)
    .map(([, price]) => price)
}

export function createCryptoHistoryRequestUrl(
  baseUrl = CRYPTO_CANDLES_URL,
  _now = Date.now()
): string {
  void _now
  const url = new URL(baseUrl)
  url.searchParams.set('days', '7')
  return url.toString()
}

export const createCryptoCandleRequestUrl = createCryptoHistoryRequestUrl

export function createBitcoinDataSource(): DataSourceConfig {
  return {
    kind: 'public-api',
    url: CRYPTO_CANDLES_URL,
    method: 'GET',
    parameters: [],
    headers: [],
    refreshMinutes: CRYPTO_REFRESH_MINUTES,
    adapter: CRYPTO_DATA_ADAPTER,
    secretPlaceholders: []
  }
}

export function normalizeBitcoinMarketData(
  pricePayload: unknown,
  historyPayload: unknown,
  capturedAt = new Date().toISOString()
): CryptoNormalizationResult {
  const price = currentPrice(pricePayload)
  if (price === null) {
    return { ok: false, message: 'CoinGecko returned no current BTC price.' }
  }

  const rows = priceRows(historyPayload)
  const history = dailyPrices(rows)
  if (history.length < 2) {
    return { ok: false, message: 'CoinGecko returned fewer than two days of BTC history.' }
  }

  history[history.length - 1] = price
  const rangeValues = rows.map(row => row.price)
  rangeValues.push(price)

  const firstClose = history[0]!
  const change7dPercent = ((price - firstClose) / firstClose) * 100
  const low7d = Math.min(...rangeValues)
  const high7d = Math.max(...rangeValues)

  return {
    ok: true,
    data: {
      asset: 'Bitcoin',
      symbol: 'BTC',
      pair: 'BTC-USD',
      quoteCurrency: 'USD',
      price,
      priceDisplay: formatUsd(price),
      change7dPercent,
      change7dDisplay: formatPercentage(change7dPercent),
      low7d,
      low7dDisplay: formatUsd(low7d),
      high7d,
      high7dDisplay: formatUsd(high7d),
      history,
      updatedAt: capturedAt
    }
  }
}

function responseFailure(response: Response, endpoint: string): CryptoDataFailure | null {
  if (response.ok) {
    return null
  }
  if (response.status === 429) {
    return {
      ok: false,
      code: 'RATE_LIMITED',
      message: `CoinGecko is rate-limiting ${endpoint} data right now.`,
      recovery: 'Wait a moment, then try Refresh live data again. Your saved preview remains available.'
    }
  }
  return {
    ok: false,
    code: 'HTTP_ERROR',
    message: `CoinGecko could not provide ${endpoint} data (HTTP ${response.status}).`,
    recovery: 'Try Refresh live data again or keep working from the saved preview.'
  }
}

export async function fetchBitcoinMarketData(
  options: { signal?: AbortSignal, historyUrl?: string, candlesUrl?: string } = {}
): Promise<CryptoFetchResult> {
  const historyUrl = options.historyUrl ?? options.candlesUrl
  try {
    const [priceResponse, historyResponse] = await Promise.all([
      fetch(CRYPTO_TICKER_URL, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        signal: options.signal
      }),
      fetch(createCryptoHistoryRequestUrl(historyUrl ?? CRYPTO_CANDLES_URL), {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        signal: options.signal
      })
    ])

    const priceFailure = responseFailure(priceResponse, 'price')
    if (priceFailure) {
      return priceFailure
    }
    const historyFailure = responseFailure(historyResponse, 'seven-day history')
    if (historyFailure) {
      return historyFailure
    }

    const [pricePayload, historyPayload] = await Promise.all([
      priceResponse.json(),
      historyResponse.json()
    ])
    const capturedAt = new Date().toISOString()
    const normalized = normalizeBitcoinMarketData(pricePayload, historyPayload, capturedAt)
    if (!normalized.ok) {
      return {
        ok: false,
        code: 'INVALID_RESPONSE',
        message: normalized.message,
        recovery: 'Try Refresh live data again. The saved preview remains available while CoinGecko recovers.'
      }
    }

    return {
      ok: true,
      data: normalized.data,
      capturedAt
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        code: 'CANCELLED',
        message: 'The Bitcoin data refresh was cancelled.',
        recovery: 'Try Refresh live data again when you are ready.'
      }
    }
    return {
      ok: false,
      code: 'FETCH_FAILED',
      message: 'The browser could not reach CoinGecko for live Bitcoin data.',
      recovery: 'Check your connection, then try Refresh live data again. Your saved preview remains available.'
    }
  }
}
