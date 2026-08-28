# Widgetr agent instructions

## Scope and source of truth

- These instructions apply to `/Users/balsimpson/Documents/Projects/Widgetr`.
- Widgetr is a standalone project. Do not add its runtime, dependencies, or application code to `/Users/balsimpson/Documents/ScriptableEditor`.
- The product and phase contract live in [`webmcp-scriptable-widget-plan.md`](./webmcp-scriptable-widget-plan.md).
- Before resuming work, read the plan's **Current implementation handoff** section. It records the current phase, verification state, and next work order.
- Preserve unrelated changes in the worktree. Do not reset, clean, or delete files to make the checkout look tidy.

## Current resume state

As of 28 August 2026:

- Phase 0 is complete. The local Nuxt foundation, MIT license, public GitHub remote, and Vercel deployment are verified at `https://widgetrmcp.vercel.app/`.
- Phase 1 is implemented and manually verified in the local browser.
- Phase 1 includes the canonical schema, supported constraints, separate small/medium/large layout trees, revision-checked operations, shared rendering, and a fixed sample fixture.
- Phase 1, Phase 2, and Phase 3 automated checks pass: 5 test files, 28 tests, and strict typecheck.
- Phase 2 is implemented locally and browser-smoke-tested. Real Scriptable execution on an iPhone and public release setup are still pending.
- Phase 3 is implemented locally and browser-smoke-tested: IndexedDB projects, autosave, selection and inspector editing, session undo/redo, local reference-image persistence, and best-effort import are covered.
- Visual design refinement is intentionally deferred. Keep the current page as a functional kernel harness until the state and export work are stable.
- The next order is: verify the generated file in real Scriptable, then begin Phase 4 WebMCP vertical-slice work.

## Resume checklist

When starting a new task in this repository:

1. Read this file and the plan handoff section.
2. Confirm the checkout with `pwd` and `git status --short --branch`.
3. Inspect `package.json`, `.nvmrc`, and the relevant files below before editing.
4. Check whether the requested work belongs to the current phase. Do not start a later phase incidentally.
5. Preserve the one canonical state and one shared operation path.
6. For UI behavior changes, follow the **Local Nuxt + in-app browser runbook** below. Source inspection alone is not visual verification.
7. Report checks that were not run instead of implying they passed.

## Local Nuxt + in-app browser runbook

This environment has a known socket restriction: the default sandbox can read and edit the repository but may not allow Nuxt to bind a listening socket. A `listen EPERM`, bind timeout, or no listener on ports 3000/3100 when those ports are free means sandbox denial, not a port collision. Do not keep retrying different ports in the default sandbox.

For every rendered UI check, use this sequence:

1. From `/Users/balsimpson/Documents/Projects/Widgetr`, confirm the target before starting anything:

   ```text
   pwd
   git status --short --branch
   ```

2. Check whether the fixed test port is already occupied:

   ```text
   lsof -nP -iTCP:3100 -sTCP:LISTEN
   ```

   If there is no listener, keep port 3100. If a listener exists, identify it before deciding whether it is an existing Widgetr server; do not kill an unrelated process.

3. Start exactly one Nuxt server from the repository root with the supported Node runtime and elevated sandbox permissions. The shell invocation must use `sandbox_permissions: "require_escalated"`, include a user-facing justification that Nuxt needs to bind `127.0.0.1:3100`, and retain the returned terminal session id:

   ```text
   PATH=/Users/balsimpson/.local/bin:/usr/bin:/bin npm run dev -- --host 127.0.0.1 --port 3100
   ```

   Use a TTY and a short initial wait so the command returns a live session id. Do not launch a second server just because the first command was started in the default sandbox. Wait for the Nuxt “ready” output before opening the browser.

4. Use the in-app Browser skill for the rendered check. Navigate to `http://127.0.0.1:3100/`, wait for the page to settle, and inspect both the visible result and the browser console. For responsive UI changes, check at least 1280×900 and 390×844. At each relevant viewport, verify:

   - the requested content and interaction are visibly present;
   - there are no page errors or console errors/warnings;
   - `document.documentElement.scrollWidth` and `document.documentElement.clientWidth` match when horizontal overflow is not intended.

   Reuse the same browser connection and tab during a task. If HMR is stale, reload the exact local URL or reopen the tab; do not start another Nuxt process.

5. Stop the server through the retained terminal session by sending `Ctrl-C`. Do not use a broad `killall`, `pkill`, or an unverified PID. If the session has already exited, verify the port is free with the same `lsof` command.

6. Report the local URL, viewport sizes, console result, overflow result, and whether the server was stopped. A local browser check proves only the local rendered app; it does not prove deployment, a public URL, WebMCP behavior, or real Scriptable/iPhone behavior.

## Repository map

### Product contract

- `webmcp-scriptable-widget-plan.md`: approved product plan, phase deliverables, checkpoints, privacy boundaries, and definition of done.
- `README.md`: local setup, current scope, and project boundary.
- `AGENTS.md`: these project-specific operating instructions.

### Runtime foundation

- `package.json`: npm scripts, dependencies, and supported Node engine range.
- `package-lock.json`: resolved dependency graph. Keep it synchronized with `package.json` using npm.
- `.nvmrc`: preferred local Node major version.
- `nuxt.config.ts`: Nuxt module, CSS, compatibility date, devtools, and strict TypeScript configuration.
- `app/app.vue`: Nuxt UI `UApp` shell.
- `app/app.config.ts`: Nuxt UI semantic color configuration.
- `app/assets/css/main.css`: Tailwind/Nuxt UI imports and shared tokens.

### Canonical widget kernel

- `app/types/widget.ts`: versioned project, data, binding, layout, element, selection, scope, diagnostic, and operation types.
- `app/domain/widget/constraints.ts`: supported element types and numeric/style/tree limits.
- `app/domain/widget/defaults.ts`: valid default styles and insets.
- `app/domain/widget/schema.ts`: Zod schemas, cross-tree validation, binding checks, duplicate-id checks, and operation argument validation.
- `app/domain/widget/operations.ts`: the only state mutation path. It validates, checks `expectedRevision`, applies scoped changes, increments revision, and returns a concise result.
- `app/domain/widget/values.ts`: data-path, binding, literal, repeat-item, and date-value resolution.
- `app/domain/widget/styles.ts`: browser style translation for backgrounds, elements, groups, text, and spacers.
- `app/domain/widget/fixture.ts`: fixed weather data and intentionally different small, medium, and large layout trees.

### Rendering and harness

- `app/components/widget/WidgetNodeRenderer.vue`: recursive renderer for every supported Phase 1 element.
- `app/components/widget/WidgetPreview.vue`: exact reference dimensions and preview frame for each widget size.
- `app/pages/index.vue`: functional operation bench and three-preview browser harness. Keep it focused on kernel behavior until a later design pass.
- `public/sample-monsoon.svg`: local fixture image used by the sample widget.

### Verification

- `tests/unit/widget-schema.test.ts`: fixture validity, shared data/separate trees, supported element coverage, duplicate IDs, and style constraints.
- `tests/unit/widget-operations.test.ts`: one-size, two-size, all-size, stale revision, and invalid operation behavior.
- `vitest.config.ts`: unit-test alias and test scope.

## Phase 1 invariants

- `WIDGET_SCHEMA_VERSION` remains explicit and is incremented deliberately when the canonical state changes incompatibly.
- One `WidgetProject` owns shared normalized data and independent `layouts.small`, `layouts.medium`, and `layouts.large` trees.
- Layouts may show different data density, but they must resolve from the same shared data and bindings.
- Every mutation goes through `applyWidgetOperation`. Do not mutate project state directly from a button, component, or future WebMCP adapter.
- Every operation validates its arguments, requires the current `expectedRevision`, increments the monotonic revision on success, and preserves the newest state on stale failure.
- Design scope is explicit: one size, two selected sizes, or all sizes.
- The browser renderer and future Scriptable generator must consume the same canonical element trees.
- Keep the supported element set constrained to text, dates, images, SF Symbols, groups, spacers, repeats, and solid/gradient/image backgrounds until the plan authorizes expansion.
- Do not introduce arbitrary user JavaScript, canvas drawing, charts, maps, animation, tables, or navigation into the canonical state.

## Verification rules

- Use npm. Never use pnpm.
- Use the supported local runtime, preferably `/Users/balsimpson/.local/bin/node` with its matching npm. The system Node 25 runtime is outside the supported even-LTS range for this project.
- Do not run `npm run typecheck` or `npm test` without asking the user first. The commands are ready, but their permission gate is still open.
- Do not run `npm run build` for small changes. A production build belongs to a deliberate release/deployment checkpoint.
- If the user authorizes checks, run them with the supported Node runtime and report the exact commands and outcomes.
- For UI behavior changes, verify the rendered result at desktop size and at the relevant responsive width. Confirm console errors and page-level overflow when responsive layout is involved.
- A local dev server or browser smoke check does not prove a deployed URL, public repository, WebMCP behavior, Scriptable execution, or iPhone behavior. Report those as separate checkpoints.

## Coding conventions

- Use focused edits with `apply_patch`.
- Prefer named exports in application modules. Keep framework-required default exports only in Nuxt/Vitest configuration entrypoints.
- Use Nuxt UI components where they fit and Tailwind for layout. Use semantic Nuxt UI colors rather than hard-coded palette classes.
- Default every input field and textarea to full width with Tailwind (`w-full`) unless a narrower control is explicitly requested. Check the rendered root component as well as its inner input so shrink-wrapped Nuxt UI controls do not leave a narrow field.
- Keep one clear surface. Avoid nested card stacks.
- Do not add fake or generic placeholder copy. Fixture fallbacks are allowed only when they represent a real recovery state in the product contract.
- Keep browser-local public references local. Never add API secrets, user secrets, or committed `.env` values.
- Do not edit `.nuxt/`, generated Nuxt files, or generated Convex files if those directories are introduced later.

## Phase boundaries

- Phase 0 complete: public remote `https://github.com/balsimpson/widgetr` and production URL `https://widgetrmcp.vercel.app/` are verified. Real iPhone Scriptable execution remains a Phase 2 checkpoint.
- Phase 2 implemented locally: deterministic state-to-Scriptable generation, `config.widgetFamily` branching, preflight diagnostics, and one shared viewer/copy/download source string. Real iPhone execution remains to be verified.
- Phase 3 implemented locally: IndexedDB projects, structure view, selection/inspector, autosave, undo/redo, local reference images, and best-effort import. The local browser checkpoint passed.
- Phase 4 later: contextual imperative WebMCP tools as a thin adapter over `applyWidgetOperation`.
- Phase 5 later: data onboarding, CORS distinctions, iPhone diagnostics, and Keychain-only secret entry.
- Phase 6 and 7 later: private design curation, approved-style provenance, and constrained adaptation.
- Phase 8 later: hardening, deployed WebMCP testing, real iPhone Scriptable testing, and challenge submission evidence.

Do not claim the MVP is complete until the plan's phase checkpoints and final definition of done have been verified.  
