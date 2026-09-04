# Widgetr homepage and Studio implementation

## Status

**The homepage and `/studio` split is in place and pushed to `origin/main`.** The homepage uses a provider-neutral readiness surface, safe onboarding catalogs, a dynamic assistant message, and the official Scriptable asset. New visitors see `Start in Studio` only when page actions are ready; when they are unavailable, the homepage explains how to connect an assistant instead. Saved-project visitors can still continue to review existing work. The provider chooser is no longer part of the rendered homepage. Automated checks and rendered/deployed verification remain separate checkpoints for the latest follow-up.

The user has explicitly reprioritized this homepage and Studio split. Do not reopen whether it belongs to a later phase. When implementation begins, record the reprioritization and current evidence in the canonical [phase implementation plan](./widgetr-phase-implementation-plan.md).

## Purpose

Replace the current new-widget homepage with a short onboarding page that explains Widgetr, shows the Scriptable logo, makes the current page-action capability visible, and gives the user one short message to copy into an assistant.

Move the existing starter and editor experience to `/studio`. The Studio must show the existing starter choices in context, keep its simple next-step text, and expose truthful WebMCP readiness without caring which assistant provider is present.

This document is the focused implementation handoff for that work. It supplements, but does not replace:

- [`AGENTS.md`](../AGENTS.md) for repository rules and approval gates
- [`webmcp-scriptable-widget-plan.md`](../webmcp-scriptable-widget-plan.md) for product and architecture boundaries
- [`widgetr-product-principles.md`](./widgetr-product-principles.md) for onboarding, copy, and status rules
- [`widgetr-design.md`](../widgetr-design.md) for the visual contract
- [`widgetr-phase-implementation-plan.md`](./widgetr-phase-implementation-plan.md) for canonical resume status and evidence
- [`widgetr-local-browser-runbook.md`](./widgetr-local-browser-runbook.md) for rendered verification

## Permanent product decision

Provider identity is irrelevant to Widgetr.

- Do not ask whether the connected assistant is ChatGPT, Claude, or another provider.
- Do not maintain a provider allowlist, denylist, ranking, compatibility table, or provider-specific runtime branch.
- Do not inspect user agent strings, model names, prompt text, globals, or browser chrome to infer a provider.
- Do not reopen provider support research unless the user explicitly requests provider-specific behavior.
- Provider names may appear only as optional setup examples. They must never affect registration, readiness, UI behavior, tests, or acceptance.

Widgetr uses only runtime facts it can observe:

1. **WebMCP enabled** means `document.modelContext?.registerTool` exists on the current page.
2. **WebMCP ready** means every required Widgetr tool for the current route registered successfully. This is Widgetr's ready or connected signal.
3. **Your assistant is working** means Widgetr observed a registered tool being invoked.
4. **WebMCP unavailable** means the API is missing or required registration failed. The UI must provide a useful next action.

## Current repository snapshot

This snapshot records the starting point for the next chat. Recheck it before editing because Git state may have changed.

| Field | Value at plan creation |
| --- | --- |
| Repository | `/Users/balsimpson/Documents/Projects/Widgetr` |
| Remote | `https://github.com/balsimpson/widgetr.git` |
| Branch | `main`, tracking `origin/main` |
| Commit | `b8806ef fix: stabilize canvas selection and assistant dock` |
| Declared runtime | Node 24 from `.nvmrc` |
| Package engine | `^22.19.0 || ^24.11.0 || >=26.0.0` |
| Current shell during planning | Node `v25.8.0`, unsupported by the package engine |
| Production URL recorded by the phase plan | `https://widgetr.vercel.app/` |

Before this document was added, the existing uncommitted work was:

- `AGENTS.md`
- `app/components/widget/ProjectStarter.vue`
- `app/pages/index.vue`
- `docs/widgetr-phase-implementation-plan.md`

Those changes belong to the user. Preserve them. In particular, the current starter work makes `New project` reuse the shared starter chooser, opens it as a modal over the Studio shell, and keeps Cancel and Escape cancellation.

Current implementation facts:

- `app/pages/studio.vue` is the moved 3,500-line page that owns both the starter and the complete Studio shell.
- `ProjectStarter.vue` owns the Weather, Cryptocurrency, Daily agenda, Own idea, Reference image, and Examples choices.
- `app/domain/widget/starters.ts` is the only starter catalog. Do not create another catalog for the homepage.
- `useWidgetWebMcp()` now exposes route-specific catalogs while retaining the existing active-project catalog and lifecycle.
- The homepage registers only read-only onboarding; the starter modal registers onboarding plus validated project creation; the active no-selection catalog retains its existing mutation tools for a real project.
- `public/` contains the locally stored official Scriptable app icon alongside the Widgetr logos.

## Approved route behavior

### `/`

The root route becomes a calm onboarding page. It must not show the starter grid or editor controls.

It contains:

- Widgetr branding
- The Scriptable logo with a clear `Build for Scriptable` relationship link
- A short explanation of Widgetr and WebMCP
- A compact, truthful WebMCP status row and registered tool disclosure
- One copyable message for the user's assistant
- One clear copy action for the assistant handoff
- A readiness-aware next action: `Start in Studio` for a new visitor only when page actions are ready, `Continue` for a saved project, or `How to connect an assistant` when a new visitor cannot use page actions

### `/studio`

The current starter and editor experience moves here.

- A first-time visitor with no saved projects sees the Studio shell, neutral empty canvas, and starter chooser opened as a modal.
- A direct visit with saved projects resumes the active project.
- The homepage `Start in Studio` button opens `/studio?new=1` for a new visitor; `Continue` opens `/studio` and resumes the active saved project when one exists.
- Cancel and Escape dismiss the forced chooser and return a saved-project user to the active project.
- Choosing a starter or cancelling the forced chooser removes `new=1` with history replacement so refresh and Back do not reopen it unexpectedly.
- The starter modal currently exposes only Weather and Cryptocurrency templates plus a reference-image dropzone; Examples and other starter cards stay deferred from this visible flow.
- Existing project persistence, history, previews, manual controls, export, and reference-image behavior remain unchanged. Choosing a reference image immediately creates the local reference-led project, opens the assistant handoff, and keeps the image available for replacement from the Reference panel. A person's selected preview mode is preserved while an assistant selects or edits another size; in `All`, all three previews stay visible.

## Homepage content

Use plain, provider-neutral copy. The first screen should be understandable without knowing what MCP is.

### Proposed copy

**Heading**

> Build Scriptable widgets without writing JavaScript.

**Description**

> Choose a starting point, shape it with your assistant, and export the same widget to Scriptable.

**Scriptable relationship**

> Build for Scriptable
>
> Design here, then run it in Scriptable.

**Prompt label**

> Copy a starter message

**Start section heading**

> Use `Connect an assistant to start` when a new visitor cannot use page actions, `Start in Studio` when page actions are ready, and `Continue your widget` when saved work exists.

**Copied message**

```text
Open Widgetr at {current Widgetr URL}. Use its page actions to help me build a Scriptable widget. Ask what I want to see at a glance, then wait for me to choose a starting point. Keep changes visible on the canvas.
```

Generate the URL from the current page at runtime. Do not hard-code production so the message also works in the local preview and future deployment domains.

**Actions**

- `Copy message` copies the complete message and shows a short success or failure receipt.
- `How to connect an assistant` opens concise setup guidance for a new visitor when page actions are unavailable or registration fails.
- `Start in Studio` opens `/studio?new=1` for a new visitor only when page actions are ready or working.
- `Continue` opens `/studio` to resume the active saved project regardless of page-action readiness.
- The page actions disclosure shows the registered tool names when registration succeeds.

### WebMCP readiness and tools

The start area uses the shared readiness component in an inline row. It does not ask the person to identify or choose an assistant provider. The row describes the page-side state, while the native `Page actions` disclosure shows the exact registered names for people who want to inspect the technical handoff.

Do not add a provider chooser, compatibility ranking, provider logos, or a second chat surface. When page actions are unavailable for a new visitor, show a short setup disclosure that explains the observable page-action requirement, points to concrete current setup examples, and keeps the person on the homepage until the environment is ready.

## Readiness state model

Keep status copy in one reusable component for the Studio assistant handoff and the homepage inline row. The homepage should show the row next to the handoff message instead of hiding registration state.

| State | Evidence | User-facing copy | Next action |
| --- | --- | --- | --- |
| Checking | Client has mounted but capability has not been resolved | `Checking page actions...` | None |
| Unavailable | `document.modelContext?.registerTool` is missing | `WebMCP unavailable` | Open Widgetr where an AI assistant can use page actions; the homepage exposes concrete setup guidance for new visitors |
| Registering | Registration has started | `Preparing page actions...` | Wait |
| Ready | Every required tool for the current route registered | `WebMCP ready` | Ask what to build, then shape it together on the canvas |
| Working | A registered tool is executing | `Your assistant is working` | Watch the page update |
| Error | Required registration failed | `Page actions could not start` | Retry registration or open Widgetr where an AI assistant can use page actions |

Rules:

- Do not show `ChatGPT connected`, `Claude connected`, or any provider-derived state.
- Do not call API availability alone `ready`. Registration must succeed.
- Do not imply that registration proves an assistant has discovered or invoked the page actions.
- Do not call registration alone `working`. A tool invocation must start.
- Keep errors concrete and give the user a next action.
- The ready state should remain useful in an ordinary WebMCP-capable browser even when Widgetr cannot identify the assistant, because identification is not required.

## Safe WebMCP onboarding tools

Do not expose the complete editor catalog before a real project exists.

### Homepage catalog

Register one read-only onboarding tool:

- `widgetr_get_started`
  - Returns what Widgetr does.
  - Returns the absolute Studio URL.
  - Returns compact starter labels, ids, actions, and descriptions from `WIDGET_STARTERS`.
  - Tells the assistant to ask what the user wants before creating a project.
  - Its invocation lets the page truthfully show `Your assistant is working`.
- The homepage disclosure shows its registered name after successful registration.

The assistant can use its browser capability to open the returned Studio URL. Do not navigate away before returning the tool result.

### Studio starter catalog

While the starter chooser is visible, register only starter-safe tools:

- `widgetr_get_started`
- `widgetr_create_widget`

Extend `widgetr_create_widget` so it may accept a validated optional `starterId`. Route creation through the existing `createProject(name, startingIntent)` path. Do not mutate the neutral project and do not create a second starter catalog.

### Active project catalog

After a real project exists and the starter chooser closes, register the existing context-sensitive editor catalog. All editor mutations must continue through `applyWidgetOperation` with revision checks.

Tool registration must clean up on route change and component unmount. A route must not leave stale tools available after its page closes.

## Suggested code ownership

Keep the new page thin and avoid adding more responsibility to the existing Studio page.

| Concern | Suggested owner |
| --- | --- |
| Homepage route and head metadata | `app/pages/index.vue` |
| Existing starter and editor shell | `app/pages/studio.vue` after moving the current page |
| Homepage hero, prompt, and actions | A focused component under `app/components/home/` |
| Shared readiness UI | A focused component under `app/components/widget/` |
| Homepage and starter-safe registration lifecycle | A small composable under `app/composables/` |
| Starter-safe tool descriptors and validation | `app/domain/widget/webmcp.ts` or one adjacent focused domain module if that file would become harder to navigate |
| WebMCP status and tool types | `app/types/webmcp.ts` |
| Starter definitions | Existing `app/domain/widget/starters.ts` only |
| Scriptable brand asset | A local file under `public/` |

Prefer one shared low-level registration lifecycle over copying mount, abort, retry, and cleanup logic into a second composable. Keep the existing `useWidgetWebMcp()` public behavior stable for the active Studio.

The current Studio page already coordinates many behaviors. Move it mechanically first. Do not combine the route move with an unrelated Studio refactor.

## Visual direction

The homepage should match Widgetr's existing quiet graphite, silver, and restrained violet-indigo language.

- Use one visual layer, not nested cards.
- Keep native system typography.
- Give the Scriptable logo supporting prominence, not co-brand dominance.
- Pair the Scriptable logo with `Build for Scriptable` so the relationship is clear. Make the relationship block link to `https://scriptable.app/` and open it in a new tab.
- Put the compact WebMCP readiness row and page-actions disclosure in the start area.
- Use the existing restrained violet-indigo accent to emphasize `without writing JavaScript` in the homepage heading.
- Keep the assistant handoff compact and provider-neutral.
- Keep the primary action singular and obvious.
- Respect light mode, dark mode, keyboard focus, reduced motion, safe areas, and mobile width.
- Do not use gradients, neon glow, colored shadows, marketing-dashboard metrics, or literal Apple interface chrome.

Use a legitimate Scriptable brand asset from an official or user-approved source, store it locally, and record its source in the implementation session. Do not redraw, approximate, or hotlink the logo.

## Implementation sequence

- [x] Re-run the repository identity gate and inspect the current diff.
- [ ] Switch to the Node 24 runtime declared by `.nvmrc` before dependency-backed commands. Node 24 is not installed on this host; the package-compatible Node 22.23.1 runtime was used for the local server.
- [x] Record this user-approved reprioritization in the phase plan's Current handoff.
- [x] Move the current `app/pages/index.vue` to `app/pages/studio.vue` without losing its uncommitted starter changes.
- [x] Add the new thin homepage route.
- [x] Add the official or user-approved Scriptable asset under `public/`.
- [x] Add the homepage content, dynamic copy message, copy receipt, assistant handoff, and saved-project continuation button.
- [x] Add the compact provider-neutral homepage readiness row, retry action, and page-actions disclosure.
- [x] Remove the provider chooser from the rendered homepage flow.
- [x] Shorten the assistant prompt and the homepage onboarding tool output.
- [x] Add shared provider-neutral readiness UI.
- [x] Add the safe homepage and starter WebMCP catalogs.
- [x] Add `?new=1` handling after project hydration, including query cleanup on start and cancel.
- [x] Update route-specific titles and descriptions.
- [x] Update `AGENTS.md` routing owners from `app/pages/index.vue` to `app/pages/studio.vue` after the move exists.
- [x] Add focused unit coverage for readiness mapping, prompt generation, starter-safe tool registration, and optional starter creation.
- [x] Run `git diff --check`.
- [x] Follow the local browser runbook and leave the changed routes visible for inspection.
- [ ] Ask before `npm test` or `npm run typecheck`.
- [ ] Do not run a production build, commit, push, publish, or deploy without explicit authorization.
- [x] Update this checklist and the canonical phase handoff with exact evidence before ending the implementation session.

## Acceptance criteria

### Homepage

- `/` no longer renders the new-widget starter screen.
- The page explains Widgetr, Scriptable, and the role of page actions in the first viewport.
- The start area shows a compact provider-neutral readiness row and a disclosure of registered page-action names.
- The Widgetr brand and Scriptable logo are visible with a clear `Build for Scriptable` relationship link that opens the official Scriptable site in a new tab.
- The `Build for Scriptable` relationship link leads the intro with a brief explanation before the headline.
- The homepage does not ask a person to choose or compare assistant providers.
- The copied message contains the current absolute Widgetr URL.
- Copy success and failure are visible and accessible.
- A new visitor can open `/studio?new=1` only when page actions are ready or working; an unavailable new visitor receives setup guidance instead, while a saved-project visitor can always `Continue` into `/studio`.
- No runtime path asks for, detects, or branches on assistant provider identity.

### Studio

- `/studio` keeps the Studio shell visible and opens the same existing starter choices in a modal for a first-time visitor.
- `/studio?new=1` opens that modal for a returning user without deleting or replacing saved work.
- Direct `/studio` resumes the active saved project.
- Starter, cancel, and Escape behavior remove the forced-new query correctly.
- Weather and Cryptocurrency are the only visible template actions; reference-led creation starts with a dropzone and immediately hands the selected image to the local project and assistant handoff.
- The Studio keeps the shared readiness status in its assistant dock while the starter modal stays focused on creation choices.
- Creating a starter produces a separate local project through the existing persistence path.
- The active Studio retains existing preview, selection, history, reference, export, and assistant behavior.

### WebMCP

- Missing `document.modelContext` produces the unavailable state and a useful next action.
- Successful required-tool registration produces `WebMCP ready`.
- A tool invocation produces `Your assistant is working` while it executes.
- Registration failure produces a concrete error and retry or copy-message path.
- Homepage and starter tools cannot mutate the neutral unsaved project.
- Active-project mutations still use the canonical operation path and revision checks.
- Closing or changing routes removes stale tools.

### Rendered verification

- Verify `/` and `/studio?new=1` at 1280 x 900 first.
- Verify the relevant mobile layout, including the prompt and CTA, at 390 x 844.
- Verify light and dark themes.
- Verify keyboard focus and the copy action.
- Verify the no-WebMCP state in ordinary Brave, including the absence of the new-visitor Studio CTA and the setup guidance action.
- Verify the homepage readiness row, page-actions disclosure, readiness-gated new-visitor Studio CTA, and saved-project continuation.
- Verify registration, listed tools, one safe onboarding invocation, and the working receipt in an actual WebMCP-capable in-app browser.
- Treat browser rendering, successful registration, actual invocation, deployment, and real Scriptable execution as separate evidence.

## New-chat kickoff prompt

Use this prompt in a new chat:

```text
Work only in /Users/balsimpson/Documents/Projects/Widgetr. Read AGENTS.md, docs/widgetr-homepage-studio-implementation.md, the Current handoff in docs/widgetr-phase-implementation-plan.md, docs/widgetr-product-principles.md, and widgetr-design.md. Run npm run repo:check and git status --short --branch before editing, then preserve every existing uncommitted change.

Implement the approved homepage and /studio split in docs/widgetr-homepage-studio-implementation.md. Provider identity is irrelevant. Do not ask about ChatGPT, Claude, or provider compatibility, and do not add provider-specific branches. Use only WebMCP API availability, successful Widgetr tool registration, and observed tool invocation for status.

Use the Node 24 runtime from .nvmrc. Make the smallest focused changes, keep the new homepage thin, preserve the shared starter catalog and canonical mutation path, and update the handoff checklists as you work. Follow the browser runbook and leave the homepage and Studio ready to inspect. Ask before tests or typecheck. Do not build, commit, push, or deploy without explicit authorization.
```
