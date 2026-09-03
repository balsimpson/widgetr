# General public API data onboarding

## Purpose

Widgetr will let a person and their connected AI assistant turn a public JSON API into a Scriptable widget without adding a separate chat interface or a source-specific integration for every starter. The Weather starter is the first open-ended use of this flow, and the Bitcoin starter is the first bounded source adapter. Weather asks for a location in the assistant chat; Bitcoin loads a live BTC / USD snapshot and seven-day history through CoinGecko's keyless public endpoints.

This moves the first slice of the planned data-onboarding work ahead of the remaining Phase 4 verification gates. It does not mark Phase 7 complete.

## User flow

1. The person copies the homepage message, opens Widgetr in the assistant's in-app browser, and opens the new-project flow.
2. The person chooses Weather or Bitcoin in Widgetr's starter modal. Weather creates a weather layout with labelled starter data; Bitcoin creates a Bitcoin layout with a public CoinGecko source and sample data while its live request starts.
3. The assistant sees the starting intent. For Weather it asks for the location in its own chat; for Bitcoin it can shape the already-loaded live fields without asking the person to paste JSON.
4. Weather uses a public HTTPS GET JSON source through the general onboarding path. Bitcoin uses its explicit public price-plus-history adapter. Open-Meteo remains the suggested first weather source, not a hard dependency or a special-only path.
5. Widgetr reports the result, exposes safe field information where the general source path is used, and the assistant maps responses to visible widget fields through revision-checked operations.
6. The canvas shows the same normalized state that the Scriptable export uses. The export includes the request and a deterministic transformation needed to refresh it on-device.

## Scope of the first slice

The first slice supports a direct public JSON request with these limits:

- HTTPS only.
- GET only.
- No request body, cookies, browser credentials, custom headers, or arbitrary redirects.
- A bounded timeout and response size.
- JSON objects and arrays only.
- A shallow, bounded summary of available fields for the assistant, never an unbounded raw response in a tool result.
- A saved URL, named query parameters, refresh interval, normalized current data, bindings, and explicit source status.

It does not support authenticated browser requests, OAuth, API-key entry on the website, arbitrary server-side fetching, scraping, background polling, or arbitrary transformation code.

## Data source model

`WidgetProject` remains the sole owner of source configuration, normalized data, bindings, diagnostics, and separate small, medium, and large layouts. All updates pass through `applyWidgetOperation` with an expected revision.

The public-data operation records a source declaration and an outcome. A source declaration contains the safe request shape and a refresh interval. An outcome contains either normalized JSON with a capture timestamp or a structured diagnostic. A failed request never replaces the most recent working data or layout.

Field discovery converts successful JSON into a bounded list of paths, display labels, example values, and value types. The assistant uses this list to select field bindings. Widgetr does not execute assistant-provided JavaScript, JSONPath expressions, or transformation snippets.

The Weather starter supplies the visual layout and intended fields. Once the assistant connects a source, it binds those intended fields through the general binding path. The Bitcoin starter supplies its own layout and an explicit CoinGecko adapter that normalizes a current price plus seven daily history points into the same binding, preview, and export model. User-selected crypto assets remain deferred.

## Browser and export behavior

Widgetr fetches the public source from the browser only. It does not proxy arbitrary URLs through a server. A successful browser response updates the visible preview and produces export-ready source configuration. The Bitcoin adapter makes two bounded public GET requests in parallel: a current simple price and a seven-day market-chart window.

The generated Scriptable file requests the saved source directly, validates the response, and renders using the same bindings. It refreshes according to the saved interval. It caches the most recent successful response on-device and reports a specific fallback state when the source cannot be reached.

A browser CORS block is not treated as a failed Scriptable request. Widgetr labels the browser preview as unable to read the source and keeps the last known valid preview. The assistant can choose a CORS-friendly source or use a safe pasted sample. Running and verifying the generated request in Scriptable remains a separate iPhone checkpoint.

## Secrets and privacy

The website never accepts, stores, logs, exports in plaintext, or returns API-secret values through WebMCP. The public connection action cannot set headers or credentials.

When an assistant identifies a source that needs authentication, Widgetr returns an `AUTHENTICATION_NOT_SUPPORTED` result and does not save a source configuration. A later authenticated-source flow will generate a temporary Scriptable test file that asks the person to enter the secret directly into Keychain on their own device.

## Diagnostics and recovery

Widgetr records and presents distinct states for:

| State | User-facing recovery |
| --- | --- |
| Live data | Review the preview and continue shaping the widget. |
| Browser CORS block | Choose a source that permits browser access or provide a safe sample response. |
| HTTP rejection | Check the source URL and public access requirements. |
| Timeout | Try again or choose a faster source. |
| Rate limit | Wait for the source limit or choose another source. |
| Invalid JSON | Use a JSON endpoint or provide a compatible sample. |
| Authentication needed | Use a public source for the browser preview. Authenticated sources are deferred to a later on-device Keychain flow. |
| Changed or missing bound field | Rebind the affected field before export. |

The browser page never claims a source will work in Scriptable merely because its browser fetch succeeded. The final report and release checks keep browser rendering, hosted behavior, WebMCP invocation, export, and iPhone execution separate.

## WebMCP contract

The starter catalog and `widgetr_get_context` expose the selected starting intent and whether a project has usable data. The assistant receives an action to connect a public data source and actions to inspect discovered fields and update bindings. All mutating calls require the current revision, return the new revision, state their changed fields, and leave the latest document intact on stale or failed operations.

The source action accepts only the bounded public request shape. It returns an outcome summary, diagnostics, and a compact field catalog. It never returns secrets, cookies, raw private data, or an assistant provider identity.

## Verification plan

- Unit coverage for source validation, source-state transitions, field discovery limits, binding validation, stale revisions, generated-request parity, and secret rejection.
- One public CORS-friendly JSON API path, beginning with the Weather starter, plus the Bitcoin price-and-history adapter.
- One CORS-blocked endpoint, one HTTP error, one timeout, one non-JSON response, and one authentication-required request.
- In-app browser verification at 1280 x 900 for the Weather and Bitcoin starters, successful connection/refresh, and each visible recovery state.
- A WebMCP invocation that asks for a location in chat, connects the source, binds its fields, and preserves a manual interleaved edit.
- Export inspection and a real Scriptable iPhone run, recorded separately from browser success.

## Deferred work

- User-entered API keys and authenticated sources.
- OAuth and cookie-authenticated requests.
- Server-side arbitrary URL proxies.
- Arbitrary request methods, headers, bodies, redirects, and custom transformation code.
- Automatic provider selection, background synchronization, user-selected crypto assets, and all other non-weather starter integrations.
