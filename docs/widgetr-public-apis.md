# Widgetr public API reference

Research snapshot: 3 September 2026.

This is a curated starting point for external data in Widgetr. It covers
weather, crypto, exchange rates, astronomy, spaceflight, news, books, TV, and
other small widget-friendly feeds.

This document is a planning reference, not proof that an API is currently
available. Recheck the linked official documentation before implementing or
releasing a source. Confirm browser access, generated Scriptable output, and
real iPhone execution separately.

## What makes an API a good Widgetr source

Prefer sources that have:

- Small, predictable JSON responses.
- One request, or a small bounded follow-up such as a list of IDs followed by
  three item requests.
- A useful cache window. A weather forecast can be stale for a few minutes;
  a countdown to a launch may need a more recent check.
- No user secret in the normal path.
- Clear attribution and usage terms.
- A meaningful sample response and a testable failure state.

Public does not mean unlimited. A no-key API can still rate-limit clients, move
hosts, require attribution, or change its response shape.

## Recommended no-key sources

These are the best candidates for Widgetr's first public-data examples.

### Open-Meteo

Use it for weather, location lookup, and air quality. The forecast API accepts
latitude and longitude and exposes current, hourly, and daily weather values.
The standard API does not require a key for typical non-commercial use. The
official documentation notes that a key can be required for commercial access
to reserved resources.

Official documentation:

- [Forecast API](https://open-meteo.com/en/docs)
- [Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- [Air Quality API](https://open-meteo.com/en/docs/air-quality-api)

Useful endpoint shapes:

```text
https://geocoding-api.open-meteo.com/v1/search?name=Kochi&count=1

https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto
```

Good widget fields include current temperature, apparent temperature,
weather code, high and low temperature, rain probability, wind, sunrise,
sunset, and air quality.

Widgetr recommendation: make this the first weather source. Ask for a place
and units, resolve the place to coordinates, then bind the normalized forecast
to all three widget sizes.

### CoinGecko Keyless Public API

Use it for a focused Bitcoin price-and-trend widget. CoinGecko's Keyless Public
API exposes a current simple price and a bounded market-chart response without
an API key. The `days=7` market-chart query gives Widgetr a moving seven-day
history. Widgetr's Bitcoin starter requests the current price and history
directly from the browser, then repeats the same public requests in generated
Scriptable code.

Official documentation:

- [Keyless Public API](https://docs.coingecko.com/docs/keyless-public-api)
- [Simple price](https://docs.coingecko.com/reference/simple-price)
- [Coin market chart](https://docs.coingecko.com/reference/coins-id-market-chart)

```text
https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd

https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7
```

The simple-price response supplies the current USD price. The market-chart
response supplies timestamped price samples. Widgetr groups those samples into
the latest seven UTC daily closes, then normalizes the pair, current price,
seven-day percentage change, seven-day low/high, last updated time, and a
numeric history binding.

This is a public market-data aggregate, not an exchange-specific order book.
Keyless does not mean unlimited: browser CORS, HTTP errors, usage terms, and
rate limits still need an honest recovery state. Widgetr keeps the last saved
preview when a refresh fails and does not collect a CoinGecko secret.

Widgetr recommendation: keep the first cryptocurrency starter fixed to Bitcoin
and USD. The keyless public path is appropriate for this low-volume starter;
add user-selected assets or higher-volume refreshes only after the adapter,
usage terms, and export contracts have a clear multi-product design.

### Frankfurter

Use it for currency conversion and daily exchange-rate widgets. The API is
free, requires no key, and supports current, historical, and time-series
rates. It also supports filtering by a named provider such as the European
Central Bank.

Official documentation: [Frankfurter](https://frankfurter.dev/)

```text
https://api.frankfurter.dev/v2/rate/USD/EUR
https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR,INR
```

This is suitable for exchange-rate cards and travel widgets. It is daily-rate
data, not a trading feed.

### Sunrise-Sunset

Use it as a small companion to a weather or travel widget. It returns sunrise,
sunset, twilight, golden-hour, solar-position, and moon data from coordinates.
It requires no key, but it requires visible attribution to Sunrise-Sunset.org.

Official documentation: [Sunrise-Sunset API](https://sunrise-sunset.org/api)

```text
https://api.sunrise-sunset.org/v2?lat=...&lng=...&date=today
```

### USGS earthquake feeds

Use the USGS GeoJSON feeds for recent earthquakes. The feeds cover ranges such
as the past hour, day, seven days, and 30 days, and the official page says the
summary feeds update every minute.

Official documentation: [USGS GeoJSON feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php)

```text
https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson
```

Good widget fields include the largest magnitude, place, time, depth, and a
short list of recent events. This is a good source for testing arrays,
location data, dates, and compact list layouts.

### Hacker News

Use the official Hacker News API for a developer-news widget. It returns story
IDs from endpoints such as `topstories`, followed by individual item objects.
The API documentation currently says there is no rate limit, but Widgetr
should still cache the ID list and keep item fan-out bounded.

Official documentation: [Hacker News API](https://github.com/HackerNews/API)

```text
https://hacker-news.firebaseio.com/v0/topstories.json
https://hacker-news.firebaseio.com/v0/item/{id}.json
```

Good widget fields include story title, score, comment count, author, and
destination URL. Fetch only the first few stories needed by the selected
layout.

### Nager Holidays

Use Nager Holidays for public-holiday and next-day-off widgets. The current
official repository documents the `nagerholidays.com` API host. Older examples
may still use `date.nager.at`, so verify the current host before coding.

Official documentation and source: [Nager.Date on GitHub](https://github.com/nager/Nager.Date)

```text
https://nagerholidays.com/api/v3/publicholidays/{year}/{countryCode}
```

Good widget fields include the next holiday, local name, country, date, and
whether the holiday is global.

### Open Library

Use it for book discovery, a book-of-the-day widget, or a reading reference
card. The Search API returns multiple books in one response and the Covers API
provides cover images.

Official documentation: [Open Library APIs](https://openlibrary.org/developers/api)

```text
https://openlibrary.org/search.json?q=Ursula%20Le%20Guin&limit=5
https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg
```

Open Library asks clients to cache responses and identify themselves with a
User-Agent and contact address. Its current guidance lists one request per
second for unidentified clients and three requests per second for identified
clients. Keep this source low-volume and human-facing.

### TVmaze

Use TVmaze for show search, episode schedules, and next-episode widgets. It is
a free public JSON API. TVmaze asks applications to provide attribution, for
example with a link back to TVmaze.

Official documentation: [TVmaze API](https://www.tvmaze.com/api)

```text
https://api.tvmaze.com/schedule?country=IN&date=YYYY-MM-DD
https://api.tvmaze.com/search/shows?q=severance
```

## Space, NASA, and rocket launches

### Launch Library 2 is the best general launch source

[Launch Library 2](https://ll.thespacedevs.com/) is the strongest first choice
for a Widgetr rocket-launch widget. It covers launches from multiple agencies
and providers, with launch, mission, agency, vehicle, pad, and status data.
The current supported API version is `2.3.0`.

```text
https://ll.thespacedevs.com/2.3.0/launches/upcoming/
```

The free API currently limits unauthenticated requests to 15 calls per hour.
The development host, `lldev.thespacedevs.com`, is intended for development,
has stale and limited data, and is not rate-limited. Higher production limits
require an API key. The Space Devs recommends caching responses and avoiding
direct queries from every user client.

Widgetr recommendation: use a server-side cached adapter for a general
"next rocket launch" starter. Show the launch name, provider, vehicle, pad,
scheduled window, status, and a source link. Preserve uncertainty in the date.
If a source says NET, estimated, or date-only, do not render a false precise
countdown.

### RocketLaunch.Live is a keyed alternative

[RocketLaunch.Live](https://www.rocketlaunch.live/api) provides read-only
launch data with launch, provider, vehicle, pad, mission, date, and weather
summary fields. It requires a valid API key, returns up to 25 results per page,
uses UTC timestamps, and requests attribution with the text "Data by
RocketLaunch.Live".

Example endpoint:

```text
https://fdo.rocketlaunch.live/json/launches
```

Use it when Widgetr has an app-owned server key and needs its particular data
shape. Do not make users paste this key into the website.

### Spaceflight News API is good for launch news

[Spaceflight News API](https://github.com/TheSpaceDevs/spaceflightnewsapi) is a
public REST API for aggregated spaceflight articles. Its current v4 docs are
at [api.spaceflightnewsapi.net/v4/docs](https://api.spaceflightnewsapi.net/v4/docs).
It integrates with Launch Library 2, so it can provide articles related to a
launch or event.

```text
https://api.spaceflightnewsapi.net/v4/articles/
```

Use it beside Launch Library 2 for a "launch news" widget. Treat it as a news
source, not as the sole authority for a countdown or exact launch time.

### NASA APIs are best for space imagery and objects

[NASA Open APIs](https://api.nasa.gov/) are a strong fit for an astronomy
starter, especially APOD and Near Earth Object data. NASA provides the
`DEMO_KEY` for exploration. Its current documentation lists a lower limit of
30 requests per hour and 50 requests per day for that key. Register a key for
heavier use and keep it on the server.

```text
https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY
```

NASA's [official launch schedule](https://www.nasa.gov/event-type/launch-schedule/)
is useful for checking NASA missions and linking to official information. For
a structured, multi-provider launch feed, use Launch Library 2 instead.

### SpaceX API is narrow and no longer a production default

The [r-spacex SpaceX API](https://github.com/r-spacex/SpaceX-API) documents a
public, unauthenticated SpaceX launch endpoint:

```text
https://api.spacexdata.com/v4/launches
```

However, the repository was archived on 6 June 2026. Treat it as a historical
or throwaway prototype source. Do not make it the default production launch
adapter when Launch Library 2 is available.

## Public but keyed or rate-sensitive sources

| Source | Use | Widgetr position |
| --- | --- | --- |
| [CoinGecko Keyless Public API](https://docs.coingecko.com/docs/keyless-public-api) | Multi-asset prices, market cap, change, and charts | Good fixed Bitcoin starter source for low-volume public use. Follow the current usage terms and limits; use a server-owned key/proxy for higher-volume or authenticated paths. |
| [NASA APIs](https://api.nasa.gov/assets/html/authentication.html) | APOD, asteroids, and other space data | Good space imagery source. `DEMO_KEY` is for exploration only. |
| [RocketLaunch.Live](https://www.rocketlaunch.live/api) | Detailed launch records | Good advanced launch source when a server key is available. |
| [GitHub REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) | Public repository releases, stars, and issue counts | Useful for developer widgets. Unauthenticated requests currently have a 60-request-per-hour limit, so cache aggressively. |

## Widgetr integration rules

### Keep three access tiers

1. No-key public sources belong in the beginner-facing starter catalog.
2. App-owned keys belong behind a server route or cached proxy. Never put them
   in browser state, generated public fixtures, or exported Scriptable code.
3. User-owned authenticated sources belong in the later iPhone test and
   Keychain flow. Do not ask users to give secrets to the Widgetr website.

### Normalize before binding

The layout should not know whether the data came from Open-Meteo, CoinGecko, or
Launch Library 2. Each adapter should return a small normalized object with
stable field names, for example:

```text
{
  title,
  subtitle,
  value,
  unit,
  imageUrl,
  items,
  fetchedAt,
  sourceUrl,
  sourceState
}
```

Use only the fields needed by the widget. Keep the original response available
for inspection, but do not bind a large provider-specific response directly to
the layout.

### Preserve the same fallback order

Generated Scriptable output and the browser preview should follow the same
runtime order:

1. Live response.
2. Last-good cached response.
3. Clearly labelled sample data.
4. A specific error state with a retry or setup action.

Distinguish CORS failure, timeout, rate limit, invalid JSON, changed fields,
authentication failure, and offline execution. A successful browser request
does not prove that the generated Scriptable file can fetch the same source.

### Launch-specific rules

Launch dates move. Keep the source status and date precision alongside the
timestamp. Prefer labels such as `NET`, `estimated`, `window open`, or `time
unconfirmed` when the source does not provide an exact time. Refresh near a
launch only within the source's rate limits and cache policy.

## Suggested Widgetr source catalog order

Start with these examples:

1. Weather, using Open-Meteo and its geocoder.
2. Bitcoin, using CoinGecko public prices.
3. Currency conversion, using Frankfurter.
4. Daylight, using Sunrise-Sunset.
5. Next rocket launch, using a cached Launch Library 2 adapter.
6. Recent earthquakes, using USGS GeoJSON.
7. Developer news, using Hacker News.
8. Public holidays, using Nager Holidays.
9. Space image of the day, using NASA APOD.

Clocks and countdowns to a user-provided date do not need an external API.
Use local date and time calculations for those cases.

When adding a source, record its official documentation URL, auth tier,
attribution requirement, example endpoint, sample response, normalizer,
cache policy, expected failure states, and the date of the last documentation
check.
