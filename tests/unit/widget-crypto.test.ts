import { describe, expect, it } from 'vitest'
import {
  CRYPTO_CANDLES_URL,
  CRYPTO_DATA_ADAPTER,
  createBitcoinDataSource,
  createCryptoHistoryRequestUrl,
  normalizeBitcoinMarketData
} from '~/domain/widget/crypto'
import { createCryptoWidgetProject } from '~/domain/widget/crypto-fixture'
import { validateWidgetProject } from '~/domain/widget/schema'

describe('Bitcoin public-data adapter', () => {
  it('normalizes CoinGecko price and seven-day history into widget fields', () => {
    const result = normalizeBitcoinMarketData(
      { bitcoin: { usd: 70123.45 } },
      {
        prices: [
          [1700000000000, 68500],
          [1700086400000, 70000],
          [1700172800000, 70500]
        ]
      },
      '2026-09-03T06:00:00.000Z'
    )

    expect(result).toMatchObject({ ok: true })
    if (!result.ok) {
      return
    }
    expect(result.data.price).toBe(70123.45)
    expect(result.data.priceDisplay).toBe('$70,123.45')
    expect(result.data.history).toEqual([68500, 70000, 70123.45])
    expect(result.data.change7dDisplay).toBe('+2.4%')
    expect(result.data.low7dDisplay).toBe('$68,000.00')
    expect(result.data.high7dDisplay).toBe('$70,500.00')
    expect(result.data.updatedAt).toBe('2026-09-03T06:00:00.000Z')
  })

  it('keeps the documented history URL on a moving seven-day window', () => {
    const url = createCryptoHistoryRequestUrl(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd'
    )

    expect(new URL(url).searchParams.get('days')).toBe('7')
    expect(new URL(CRYPTO_CANDLES_URL).searchParams.get('days')).toBe('7')
  })

  it('creates a valid Bitcoin project with an explicit public adapter', () => {
    const source = createBitcoinDataSource()
    const project = createCryptoWidgetProject()

    expect(source.adapter).toBe(CRYPTO_DATA_ADAPTER)
    expect(project.dataSource).toMatchObject(source)
    expect(validateWidgetProject(project).ok).toBe(true)
  })
})
