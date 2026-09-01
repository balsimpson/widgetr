# Widgetr phase implementation plan

## Purpose

This document is Widgetr's execution record. It answers four questions for every working session:

1. Which phase is active?
2. What is already complete?
3. What must be verified before deployment?
4. What is the exact next action?

The durable product and architecture contract lives in [the Widgetr product plan](../webmcp-scriptable-widget-plan.md). Copy, UX, UI, agent behavior, examples, documentation, and support guidance must also pass [the Widgetr product principles](./widgetr-product-principles.md).

Do not reopen decisions already locked in those documents. Ask the user only when new evidence creates a real product choice, the requested work expands phase scope, or repository rules require approval.

## Current handoff

Update this section after every session that changes implementation, verification state, deployment state, or phase scope.

| Field | Current value |
| --- | --- |
| Last updated | 1 September 2026 |
| Active phase | Phase 4: close the deployed WebMCP and Scriptable vertical slice |
| Phase state | In progress |
| Phase 4 state | In progress; Phase 5 is complete locally, while the remaining WebMCP, export, README, and iPhone checks are resumed here |
| Local branch | `main` |
| Local and remote commit | `HEAD` (empty-canvas selection clearing committed and synchronized with `origin/main`) |
| Latest verified UI commit | `HEAD` (empty canvas clicks clear element selection) |
| Production URL | [`widgetrmcp.vercel.app`](https://widgetrmcp.vercel.app/) |
| Next action | Resume the open Phase 4 WebMCP, export, README, and iPhone gates |
| Next external checkpoint | Resolve the two local-image export warnings and run the generated file in Scriptable on an iPhone for all three widget families |
| Next production checkpoint | Complete the mutating WebMCP flow and prove that a manual interleaved edit survives |
| Next phase | Phase 6: assistant handoff, truthful status, and fallback |
| Planned visual-data phase | Phase 9: constrained progress and chart elements after the core data and export path |

Phase 5 is closed as `Complete locally` after the authorized test, typecheck, build, and desktop browser checks. Phase 4 remains `In progress`; its remaining deployment, WebMCP, export, README, and iPhone checks are now the active work.

The user-requested `widgetr-design.md` UI pass is implemented in the current working tree as a local studio-shell redesign. The follow-up canvas-first revision moves navigation, settings, and selection inspection into transient sheets, keeps size controls in floating glass, and hides the persistent pane treatment. The latest polish makes `All` a peer of the three focused size choices, removes the redundant `Enter group` control in favor of direct child selection and clickable size captions for the complete `Widget` surface, presents the top-level layer as `Widget` instead of the technical `Root` label while preserving the internal `root` id, exposes the truthful assistant status text on desktop, moves the project name into a readable canvas title that wraps long names while adding a subtle spatial grid, uses a dark foreground for selected indigo size controls when white would fail contrast, keeps assistant status visually lightweight beside Export instead of presenting two adjacent circular actions, adds an optional pinned inspector state that remains open for widget settings, turns Export into a centered modal with inline Scriptable source, copy/download actions, and next-step instructions, lets the stage pan with a click-drag gesture without turning a drag into a selection click, and replaces the duplicate top-bar assistant control with one fixed bottom bot/status dock that remains visible at a stable centered width, swaps in selection and save activity copy, and opens the existing assistant handoff panel. The latest follow-up centers the mobile canvas controls, aligns the inspector pin action with its close button, reduces the top-left project entry point to a slightly larger icon-only control without wrapper chrome, stacks the readable project name directly above the centered size controls, attaches the assistant status badge to the bot icon with red disconnected, yellow working, and green connected-idle states, keeps widget clicks out of the canvas-pan gesture so surface selection remains reliable, keeps `All` mode active when selecting an element in any displayed preview so the other sizes remain visible while the Inspector scopes to the clicked size, keeps the status dock width and position stable while removing its hover lift and adding a quick text-only crossfade for status changes, lets long status receipts wrap within that fixed-width dock instead of truncating, shows `Ready for your assistant` only while the assistant is connected and idle without a change receipt, normalizes native color inputs to the same height as neighboring inspector fields, and removes the redundant offset focus outline from Nuxt UI inputs while preserving their single in-field focus ring. Selecting a widget now adds a distinct outer highlight around the complete preview. It preserves the canonical project and operation paths and does not close the open Phase 4 deployment, WebMCP, export, README, or iPhone gates.

## How to resume work

At the start of every Widgetr implementation session:

1. Work only in `/Users/balsimpson/Documents/Projects/Widgetr`.
2. Read `AGENTS.md`, this handoff, and the active phase.
3. Run `npm run repo:check`.
4. Run `git status --short --branch` and preserve unrelated changes.
5. Inspect the current code for the active phase. Do not rely on the plan alone for exact implementation details.
6. Implement only the unchecked work in the active phase.
7. Follow the phase verification and deployment gate.
8. Update this handoff, task checkboxes, and the evidence log before ending the session.

Repository rules still apply. Tests, typecheck, and production builds need approval. Changes to `nuxt.config.ts` or a future Convex schema need approval. A phase entry does not override those gates.

## Status language

Use these states consistently:

| State | Meaning |
| --- | --- |
| Not started | No implementation work for the phase has begun |
| In progress | Some work is implemented, but the deployment gate has not passed |
| Blocked | A named external dependency or user decision prevents progress |
| Complete locally | Code and local verification pass, but production or device evidence remains |
| Complete | The phase deployment gate and required external checks pass |

Do not mark a phase complete because the code exists. Record the required browser, production, WebMCP, or iPhone evidence separately.

## Phase map

Historical phases 0 through 4 keep their numbers. Phases 5 through 12 divide the remaining product work into coherent, testable releases.

| Phase | User-visible outcome | State |
| --- | --- | --- |
| 0 | A standalone public Widgetr application exists | Complete |
| 1 | One canonical project renders three widget sizes | Complete |
| 2 | One deterministic Scriptable file covers all sizes | Complete locally |
| 3 | Projects can be edited and saved locally | Complete |
| 4 | The deployed assistant and page share live state through WebMCP | In progress |
| 5 | A new visitor can intentionally start the right kind of widget | Complete locally |
| 6 | The page gives a truthful assistant handoff and useful fallback | Not started |
| 7 | A person can configure data without a JSON-first or secret-collection flow | Not started |
| 8 | Review, recovery, export, and iPhone installation form one clear finish path | Not started |
| 9 | Bound progress and compact chart elements render and export reliably | Not started |
| 10 | The owner can privately curate approved design families | Not started |
| 11 | Public projects can use approved styles without losing their data | Not started |
| 12 | The complete product passes accessibility, privacy, production, and device checks | Not started |

Each phase can deploy after its own gate passes. A later phase may not weaken a completed phase's state, privacy, export, or recovery guarantees.

## Rules that apply to every phase

- Use Nuxt UI components where they fit and Tailwind for layout.
- Keep one clear visual surface and avoid nested cards.
- Keep the preview central once a project exists.
- Use one canonical `WidgetProject` and one revision-checked operation path.
- Preserve existing IndexedDB projects through schema changes.
- Keep public projects and reference images local.
- Never collect end-user API secrets in the website.
- Keep the core experience provider-neutral.
- Give every error, waiting state, and empty state a useful next action.
- Default inputs and textareas to full width.
- Preserve work before destructive operations and ask for confirmation.
- Separate static checks, local rendering, deployment, WebMCP calls, and real-iPhone evidence in reports.
- Apply the product acceptance test from the product plan before deploying a user-facing phase.

## Phase 0: standalone foundation

State: Complete

### Outcome

Widgetr has its own public repository, Nuxt application, supported runtime contract, license, and production deployment.

### Delivered

- [x] Standalone repository with no runtime dependency on `ScriptableEditor`
- [x] Nuxt application using npm
- [x] Nuxt UI and Tailwind
- [x] Strict TypeScript configuration
- [x] Public MIT license
- [x] Environment-variable contract with no committed secrets
- [x] Public GitHub remote
- [x] Vercel deployment at `https://widgetrmcp.vercel.app/`
- [x] Repository identity guard through `npm run repo:check`

### Deployment gate

- The exact repository root, origin, and package name pass the identity guard.
- The public repository contains the license and setup instructions.
- The production URL returns the Widgetr application.

## Phase 1: canonical state and rendering kernel

State: Complete

### Outcome

One project contains shared data and independent small, medium, and large layout trees. Manual changes use a single validated operation path.

### Delivered

- [x] Versioned `WidgetProject` schema
- [x] Shared normalized data and bindings
- [x] Separate small, medium, and large element trees
- [x] Supported element and style constraints
- [x] Revision-checked `applyWidgetOperation`
- [x] One-size, selected-size, and all-size design scope
- [x] Exact-proportion browser previews
- [x] Fixed fixture that exercises supported elements
- [x] Stale revision rejection without data loss

### Standing verification

The last automated checkpoint before the preview-first UI refactor passed strict typecheck and 6 test files with 42 tests. Phase 4 must refresh those checks before the current release is called verified.

## Phase 2: deterministic Scriptable generator

State: Complete locally

### Outcome

The canonical project produces one stable Scriptable file with small, medium, and large branches.

### Delivered

- [x] State-to-Scriptable generator
- [x] `config.widgetFamily` branching
- [x] Supported text, date, image, symbol, group, spacer, repeat, and background output
- [x] Shared data bindings
- [x] Export blockers and warnings
- [x] Identical viewer, copy, download, and WebMCP source generation
- [x] Local Scriptable API harness
- [x] Stable generated output tests

### Open checkpoint

- [ ] Decide whether local `/sample-monsoon.svg` references must become embedded, remote, or intentionally unsupported in export.
- [ ] Run the same generated file in real Scriptable on an iPhone.
- [ ] Verify small, medium, and large widget families.
- [ ] Record screenshots or a concise device evidence note.

### Completion gate

Phase 2 becomes Complete only after the generated file runs on an iPhone for all three widget families with the documented image behavior.

## Phase 3: public local-first editor

State: Complete

### Outcome

A person can manage browser-local projects, edit the visible widget, keep a local reference image, and export from one preview-first workspace.

### Delivered

- [x] IndexedDB project, reference, and workspace storage
- [x] Create, rename, duplicate, delete, switch, and autosave
- [x] Active-project restoration
- [x] In-memory recovery when IndexedDB fails
- [x] Preview, structure, and inspector selection agreement
- [x] Contextual element inspector
- [x] Session undo and redo through validated snapshot restoration
- [x] Local reference-image persistence
- [x] Preview-first responsive workspace
- [x] Desktop and mobile browser smoke checks

### Standing rule

The current fixed Kochi fixture remains useful for tests and examples. Phase 5 must move it out of the unexplained first-run path without removing its test value.

The earlier best-effort Scriptable source import is removed from the current version in Phase 5. Older stored projects remain loadable because schema validation drops only that legacy metadata field.

## Phase 4: close the deployed WebMCP and Scriptable vertical slice

State: In progress

### Outcome

On the deployed page, an external assistant can read the current project, make a visible revision-aware change, observe selection-driven tool changes, preserve a person's manual edit, and export the same Scriptable source as the UI.

### Already delivered

- [x] Imperative WebMCP adapter over shared operations
- [x] Contextual tool registration for project, text, image, and group states
- [x] Bounded input and output
- [x] Revision-aware operation execution
- [x] Confirmation before image-source replacement
- [x] Production discovery of seven contextual tools
- [x] Production `widgetr_get_context` read
- [x] Production `widgetr_export` read with ready source
- [x] Preview-first workspace deployed without page-level overflow or browser console issues

### Remaining implementation and verification

- [ ] Get explicit approval to run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Run the approved checks with the supported Node runtime and record exact results.
- [ ] Resolve or deliberately document the two `LOCAL_IMAGE_SOURCE` warnings for `/sample-monsoon.svg`.
- [ ] Run the real-iPhone checkpoint from Phase 2.
- [ ] On production, create a project through WebMCP.
- [ ] Select an element and prove that the contextual tool set changes.
- [ ] Change the selected element and verify the same state changes on the page.
- [ ] Make a manual change between assistant calls and prove that the next assistant call preserves it.
- [ ] Export through WebMCP and compare the generated source with the UI export path.
- [ ] Refresh the README so it describes the verified product rather than an earlier phase snapshot.

### Likely files

- `app/composables/useWidgetWebMcp.ts`
- `app/domain/widget/webmcp.ts`
- `app/pages/index.vue`
- `app/components/widget/AgentToolsPanel.vue`
- `app/domain/widget/scriptable.ts`
- `tests/unit/widget-webmcp.test.ts`
- `tests/unit/scriptable-generator.test.ts`
- `README.md`

### Deployment gate

- Approved typecheck, unit tests, and production build pass.
- The deployed mutating flow works without console errors.
- A stale call cannot overwrite a manual edit.
- UI and WebMCP export produce the same source.
- The iPhone renders all three widget families, or the phase records a named external block and does not claim device completion.
- Production evidence is added to the evidence log.

### Not included

- First-run redesign
- Data-source onboarding
- Private design curation
- Approved-style selection

## Phase 5: first-run and intentional project starting paths

State: Complete locally

### Outcome

A new visitor sees a calm start screen, chooses a real outcome, and knows what to do next. Returning visitors resume their last project.

### Product behavior

- A browser with no stored projects opens in a dedicated start state.
- Widgetr does not show or persist the finished Kochi sample as the visitor's unexplained project.
- Starting choices include weather, cryptocurrency, daily agenda, reference image, own idea, and examples.
- Each choice explains what the assistant will ask and where the conversation continues.
- Outcome choices create a neutral canonical project with a recorded starting intent.
- Reference-image choice creates the project, opens upload on the Widgetr page, and explains that upload alone does not generate the widget.
- The returning workspace provides a clear `New project` action that creates another neutral project without replacing the current one.
- `Explore examples` shows complete examples only after the person asks. Choosing one creates a separate project.
- Existing IndexedDB projects load without migration loss and skip first-run guidance.

### Implementation tasks

- [x] Define a typed starter catalog with user-facing labels, expectations, and assistant handoff text.
- [x] Separate the neutral new-project template from the complete Kochi example fixture.
- [x] Add an explicit start mode for an empty project library.
- [x] Create a project only after an intentional starting action.
- [x] Persist the selected starting intent in canonical project metadata when it affects later guidance.
- [x] Add the start screen with Nuxt UI and one clear primary action per state.
- [x] Connect reference upload and example selection to the existing project and storage paths.
- [x] Prevent examples and new starts from replacing existing projects.
- [x] Add a clear `New project` action to the returning editor and project library.
- [x] Preserve current projects across any schema or storage migration.
- [x] Add unit coverage for starter creation and storage restoration.

### Likely files

- `app/pages/index.vue`
- `app/composables/useWidgetProjects.ts`
- `app/domain/widget/projects.ts`
- `app/domain/widget/fixture.ts`
- `app/domain/widget/schema.ts`
- `app/domain/widget/storage.ts`
- `app/types/widget.ts`
- New focused components under `app/components/widget/`
- `tests/unit/widget-schema.test.ts`
- `tests/unit/widget-storage.test.ts`

### Verification

- [x] A clean local browser origin starts with choices, not the Kochi preview.
- [x] Weather, cryptocurrency, agenda, and own-idea choices create valid neutral projects through the tested starter creation paths.
- [x] The existing reference panel opens on Widgetr and shows the external-assistant next step; the first-run reference path is wired to it.
- [x] A returning user can choose `New project`, name it, and keep the current project in the library.
- [ ] Exploring or choosing an example never replaces another project.
- [x] A returning local browser opens its last active project.
- [x] Desktop at 1280 by 900 has no unintended horizontal overflow or console warnings on the New project and returning editor surfaces; the responsive rules remain in place without a mobile viewport check.
- [ ] The full product acceptance test passes for the start flow.

### Deployment gate

- Targeted tests and approved static checks pass.
- Fresh and returning-user paths pass in the local browser.
- Existing project data survives the deployed migration.
- The deployed URL opens the correct state for a clean browser profile.

Phase 5 is closed as `Complete locally` at the user's request. The implementation, automated checks, and desktop browser evidence are complete; deployed migration and clean-profile production evidence remain explicit release follow-ups.

### Not included

- Live data-source configuration
- Provider-specific assistant integration
- Private style curation
- Scriptable source import

## Phase 6: assistant handoff, truthful status, and fallback

State: Not started

### Outcome

The person understands that the conversation happens in an external assistant, can tell whether Widgetr's tools are available, and has a useful path when they are not.

### Product behavior

- The stable handoff area uses `WebMCP unavailable`, `WebMCP ready`, `Your assistant is working`, and `Your review is needed` accurately.
- `Your assistant is working` appears only while a tool call is active.
- A successful state-changing call produces a review-needed state and names the visible change.
- Read-only calls do not pretend that an assistant changed the widget.
- A review action focuses the relevant preview or selection.
- Detailed tool names remain available in a technical details view, not as the main beginner message.
- The assistant can read the current supported element types, whether element insertion is available, and useful alternatives for unsupported requests.
- Unavailable guidance names current verified routes such as Chrome with WebMCP testing enabled and the ChatGPT desktop app's built-in browser when site tools are available.
- The core UI never claims a provider connection.
- Without WebMCP, existing manual editing, examples, reference-image, and export paths remain usable.

### Implementation tasks

- [ ] Add a product-level assistant status model above raw registration state.
- [ ] Track active read-only and mutating tool execution.
- [ ] Record the last visible change and affected sizes for review.
- [ ] Add a stable handoff and status area to start and edit modes.
- [ ] Rewrite technical `Registered`, `Agent tools`, and generic unsupported copy for beginners.
- [ ] Move contextual tool names behind technical details.
- [ ] Expose supported element types, insertion availability, and alternatives through `widgetr_get_context` or a focused read-only capability tool. Derive the element list from shared constraints instead of copying it into tool code.
- [ ] Add concrete setup help with a checked date or source reference.
- [ ] Add a review action that takes the person to the affected preview or selection.
- [ ] Ensure errors name a retry or fallback action.
- [ ] Extend WebMCP unit tests for status transitions and read-only versus mutating behavior.

### Likely files

- `app/composables/useWidgetWebMcp.ts`
- `app/components/widget/AgentToolsPanel.vue`
- `app/pages/index.vue`
- `app/domain/widget/webmcp.ts`
- `app/types/webmcp.ts`
- `tests/unit/widget-webmcp.test.ts`

### Verification

- Unsupported environment shows a working fallback and concrete help.
- Successful registration shows `WebMCP ready`, not a provider connection.
- An active mutation shows working state only for its execution window.
- A completed mutation shows review state and focuses the affected result.
- A read-only context call leaves the ready state unchanged.
- A failed or cancelled call preserves project state and names the next action.
- A request for a visual type that is not implemented yet returns an honest limitation and a working alternative without claiming that the widget changed.
- Manual editing still works with WebMCP unavailable.

### Deployment gate

- Status transition tests pass.
- Local browser checks cover unavailable, ready, working, review, error, and cancelled states.
- One deployed external assistant call proves the same transitions.
- Beginner-facing copy passes the product acceptance test.

## Phase 7: plain-language data onboarding and iPhone diagnostics

State: Not started

### Outcome

A person can configure public or authenticated data without editing JSON or giving secrets to the website.

### Product behavior

- The person can name the information they want, provide an API URL, or provide documentation.
- Widgetr shows detected fields and sample values in plain language.
- The page labels live, pasted, cached, sample, and error data.
- Browser CORS failure is distinct from API rejection and likely Scriptable compatibility.
- Authenticated sources use a temporary Scriptable test file and a safe pasted result.
- The final export reuses the Keychain identifier created by the test file.
- Runtime fallback order is live, last-good cache, labelled sample, then a specific error state.

### Implementation tasks

- [ ] Extend canonical data-source, normalized-data, binding, and diagnostic state only as required by the product plan.
- [ ] Add outcome-first data onboarding and optional API or documentation input.
- [ ] Add friendly field detection and binding controls.
- [ ] Add source-state labels for live, pasted, cached, sample, and error data.
- [ ] Detect and explain CORS, authentication, invalid response, changed fields, timeout, rate limit, and offline cases.
- [ ] Generate a temporary authenticated Scriptable test file without sending secrets to the website.
- [ ] Parse a bounded safe result pasted from the iPhone.
- [ ] Reuse the Keychain identifier in final export.
- [ ] Add representative API mocks or fixtures only when they support a real recovery or test path.
- [ ] Add data, privacy, generator, and migration tests.

### Likely files

- `app/types/widget.ts`
- `app/domain/widget/schema.ts`
- `app/domain/widget/values.ts`
- `app/domain/widget/scriptable.ts`
- `app/domain/widget/operations.ts`
- New focused data components and utilities
- Unit tests for schema, operations, generator, storage, and data diagnostics

### Verification

- Test one open public API.
- Test one browser-blocked API.
- Test one authenticated API through the iPhone copy-and-paste flow.
- Test one invalid or changed response.
- Prove that no secret enters browser state, logs, project storage, fixtures, or network calls from Widgetr.
- Prove that all three widget sizes use the same normalized data.
- Prove live, cache, sample, and error runtime behavior in the generated Scriptable file.

### Deployment gate

- Approved tests and build pass.
- Local and deployed browser paths clearly distinguish each data state.
- The authenticated flow passes on a real iPhone.
- Privacy inspection finds no secret value in browser or server storage.

## Phase 8: review, recovery, export, and iPhone finish path

State: Not started

### Outcome

The person can review the current result, resolve warnings, export one file, install it in Scriptable, and verify all three widget sizes.

### Product behavior

- The page distinguishes a visual review request, export warning, and export blocker.
- Every warning names the affected size or feature and a useful action.
- Destructive changes require confirmation before state changes.
- Export has one primary download action. Copy and source view remain secondary.
- The exported filename, Scriptable installation steps, widget-family setup, and Keychain steps are explained in plain language.
- The page does not claim success until real Scriptable behavior is checked.

### Implementation tasks

- [ ] Unify operation, data, layout, and generator diagnostics into plain-language review groups.
- [ ] Link each actionable diagnostic to the relevant selection or settings area where possible.
- [ ] Add explicit review and approval prompts for risky changes.
- [ ] Add a post-export Scriptable installation guide.
- [ ] Explain how to add and test small, medium, and large widgets.
- [ ] Explain Keychain setup only when the export needs a secret.
- [ ] Preserve identical source across view, copy, download, and WebMCP.
- [ ] Add tests for blockers, warnings, recovery actions, and export identity.

### Verification

- A blocker prevents download and points to a fix.
- A warning permits download and states the risk.
- Local-image behavior is clear and matches the generated file.
- Clipboard, source viewer, download, and WebMCP outputs match.
- The exported file runs independently after the browser closes.
- Small, medium, and large widget-family instructions work on a real iPhone.

### Deployment gate

- Targeted tests and approved checks pass.
- Local and deployed browser checks cover blocker, warning, and clean export states.
- Real-iPhone installation and all three sizes pass.
- Export copy passes the product acceptance test.

## Phase 9: constrained progress and chart elements

State: Not started

### Outcome

A person can add and bind progress rings, progress bars, sparklines, and compact bar charts that render consistently in the browser and generated Scriptable file.

### Product behavior

- Visual-data elements are typed canonical elements. Widgetr does not store arbitrary drawing commands or user-supplied drawing code.
- A progress ring binds one numeric value to an explicit minimum and maximum. Its size, track, fill, thickness, and optional center label remain bounded.
- Nested progress rings can produce a generic activity-ring presentation without provider-specific branding.
- A progress bar uses the same bounded value model as a ring.
- Sparklines and compact bar charts bind a finite numeric series with strict point limits for each widget size.
- Charts remain static and glanceable. They do not add interaction, animation, full axes, legends, or tooltips.
- Browser previews and Scriptable output use the same normalized values, ranges, colors, dimensions, and density rules.
- Unsupported custom drawing still produces an honest explanation and suggests a supported visual, image, text, or SF Symbol alternative.

### Implementation tasks

- [ ] Add revision-checked insert-element and remove-element operations before adding new visual types. Route manual controls, history, persistence, and WebMCP through them.
- [ ] Add canonical `progress-ring`, `progress-bar`, `sparkline`, and `bar-chart` element types with bounded defaults, schemas, constraints, and migrations.
- [ ] Define numeric-source, range, color, thickness, point-limit, and empty-data behavior without adding arbitrary path data to project state.
- [ ] Add deterministic geometry helpers shared by the browser preview and Scriptable generator where practical.
- [ ] Render progress and chart elements in the browser with accessible labels and visible empty or invalid-data states.
- [ ] Generate static images for these elements in Scriptable through bounded `DrawContext` and `Path` helpers, then place those images through the normal widget tree.
- [ ] Add inspector controls for bindings, ranges, colors, thickness, size, and chart density.
- [ ] Add WebMCP tools for inserting, selecting, configuring, and removing the new elements through the shared operation path.
- [ ] Update capability results so the assistant advertises the new elements only after the implementation is available.
- [ ] Add export diagnostics for non-numeric values, empty series, invalid ranges, excessive points, and dimensions that cannot fit the selected widget size.
- [ ] Add schema, migration, operation, renderer, generator, WebMCP, and diagnostic tests.

### Likely files

- `app/types/widget.ts`
- `app/domain/widget/constraints.ts`
- `app/domain/widget/defaults.ts`
- `app/domain/widget/schema.ts`
- `app/domain/widget/operations.ts`
- `app/domain/widget/values.ts`
- `app/domain/widget/scriptable.ts`
- `app/domain/widget/webmcp.ts`
- `app/components/widget/WidgetNodeRenderer.vue`
- `app/components/widget/WidgetInspector.vue`
- New focused visual-data renderer and geometry utilities
- Unit tests for schema, operations, rendering, generation, WebMCP, and diagnostics

### Verification

- Insert, update, undo, redo, remove, save, reload, and export each new element through the canonical operation path.
- Verify progress values at minimum, partial, maximum, below range, and above range.
- Verify three nested progress rings at small, medium, and large sizes.
- Verify progress bars, sparklines, and compact bar charts with valid, empty, invalid, and over-limit data.
- Compare browser and Scriptable output for the same normalized values, dimensions, colors, and item limits.
- Confirm that a manual change between assistant calls survives the next visual-data operation.
- Confirm that arbitrary drawing instructions, paths, and JavaScript never enter canonical project state.
- Run the generated file in Scriptable on a real iPhone for all four element types and all three widget families.

### Deployment gate

- Targeted tests, approved typecheck, and approved production build pass.
- Local and deployed browser checks cover all four elements at the desktop width without console errors or unintended overflow; responsive rules remain intact.
- A deployed WebMCP flow inserts and edits each element while preserving a manual interleaved change.
- Real-iPhone output passes for small, medium, and large widgets.
- Capability and fallback copy passes the product acceptance test.
- The release notes state that general canvas drawing and full interactive charting remain unsupported.

### Not included

- Arbitrary canvas or vector editing
- User-supplied drawing commands, paths, or JavaScript
- Interactive or animated charts
- Full axes, legends, tooltips, or dashboards
- Maps, gauges beyond the bounded progress elements, or exact copies of provider-branded activity visuals

## Phase 10: private design curation

State: Not started

### Outcome

The project owner can privately upload a permitted design reference, receive a structured draft, correct three canonical examples, and approve one public style version.

### Product behavior

- Auth0 protects the admin route.
- Convex independently authorizes every protected operation.
- One configured vision provider drafts structured analysis and three example layouts.
- The model output is schema-validated and remains private until approval.
- Corrections use the shared canonical state and operation path.
- Approval requires small, medium, and large examples without blockers.
- Editing an approved style creates a private draft while the last approved version remains public.

### Implementation tasks

- [ ] Obtain approval before adding or changing Convex schema or auth configuration.
- [ ] Add protected admin routing and stable administrator identity rules.
- [ ] Add private upload storage and validation.
- [ ] Add one server-configured image-analysis provider.
- [ ] Validate structured analysis and three canonical states.
- [ ] Reuse editor controls and shared operations for corrections.
- [ ] Add draft, failed, ready-for-review, and approved states.
- [ ] Add versioned approval and a public approved-style query.
- [ ] Add authorization, privacy, malformed-output, and revision tests.

### Verification

- Signed-out and signed-in non-admin callers cannot access private records or files.
- A valid upload reaches review state.
- Invalid model output stays failed and private.
- The administrator can correct and approve all three sizes.
- Editing an approved style does not change its public version until reapproval.
- Public queries omit images, drafts, prompts, errors, credentials, and administrator identity.

### Deployment gate

- Auth, authorization, storage, provider, and privacy tests pass.
- The production admin route passes authorized and unauthorized checks.
- One complete approved family is verified in production.

## Phase 11: approved-style integration

State: Not started

### Outcome

A public project without a local reference can use a visible approved style while keeping its data configuration and local ownership.

### Product behavior

- Widgetr matches a small catalog through structured tags, not embeddings.
- The chosen friendly style name is visible.
- `Try another style` changes the style snapshot and layouts without replacing data configuration.
- Each local project keeps the approved version it selected.
- Publishing a later admin revision does not silently change existing projects.
- A neutral built-in style remains available when the catalog is unavailable.

### Implementation tasks

- [ ] Define structured matching tags and selection rules.
- [ ] Fetch only approved public style data.
- [ ] Apply styles through canonical operations and supported constraints.
- [ ] Store style provenance and recipe snapshot in local project state.
- [ ] Add `Try another style` without resetting data.
- [ ] Add a neutral fallback.
- [ ] Add matching, provenance, migration, privacy, and no-data-loss tests.

### Verification

- A project without a local reference receives a coherent approved style.
- The style name and version are visible.
- All three layouts preserve appropriate density and hierarchy.
- Trying another style preserves data and bindings.
- Existing projects do not change when the admin publishes a new version.
- Catalog failure falls back without blocking project work.

### Deployment gate

- Matching and state-preservation tests pass.
- Local and production browser checks prove visible selection and safe replacement.
- Privacy inspection confirms that only approved public fields reach the browser.

## Phase 12: full-product hardening and release

State: Not started

### Outcome

The deployed product satisfies the complete product plan across fresh-user, returning-user, assistant, manual, data, visual-data, export, admin, privacy, and real-device paths.

### Implementation and review tasks

- [ ] Run keyboard and screen-reader-oriented accessibility review.
- [ ] Verify visible focus, semantic labels, contrast, and reduced-motion behavior.
- [ ] Verify the desktop responsive layout without unintended horizontal overflow and inspect narrow-width rules without a mobile viewport.
- [ ] Run the product acceptance test across every public state.
- [ ] Run full approved typecheck, unit tests, and production build.
- [ ] Verify the deployed URL in each claimed WebMCP environment.
- [ ] Re-verify progress rings, progress bars, sparklines, and compact bar charts in browser previews, exported source, and real Scriptable output.
- [ ] Verify real iPhone behavior for public, authenticated, cached, sample, and error data paths.
- [ ] Run public and admin privacy review.
- [ ] Refresh README setup, architecture, environment, and verification boundaries.
- [ ] Prepare release screenshots and demo evidence only from verified behavior.

### Completion gate

- Every item in the product plan's definition of done passes or appears in a named release deferral.
- A fresh visitor can complete the public flow without an account.
- The public repository contains setup instructions and no secrets.
- The deployed public flow, protected admin flow, and real-iPhone output match their documented behavior.
- The final evidence log identifies exact commits, URLs, environments, commands, viewports, and device checks.

## Release targets

These targets keep deployment scope clear without changing the phase order:

| Target | Included phases | What it proves |
| --- | --- | --- |
| Technical vertical slice | 0 through 4 | Shared state, contextual WebMCP changes, deterministic export, and real Scriptable output |
| Beginner-ready builder | 5 and 6 | Intentional first run, clear assistant handoff, and working fallback |
| Data-ready builder | 7 and 8 | Plain-language data setup, recovery, export, and iPhone installation |
| Visual-data widgets | 9 | Bound progress and compact chart elements with browser and Scriptable parity |
| Curated design system | 10 and 11 | Private approval and safe public style use |
| Complete product | 12 | Full acceptance, privacy, accessibility, production, and device proof |

A release may stop at any completed target. Its README and release notes must name later targets as deferred rather than implying they exist.

## Evidence log

Append concise evidence after material verification. Do not replace older evidence unless it was incorrect.

| Date | Phase | Evidence | Remaining boundary |
| --- | --- | --- | --- |
| 28 Aug 2026 | 0 | Public repository, MIT license, and Vercel URL verified | Later feature phases remained |
| 28 Aug 2026 | 1 | Canonical state, separate layout trees, scoped operations, and stale-revision behavior verified locally | Automated checks need refresh after later UI work |
| 28 Aug 2026 | 2 | Stable source and local Scriptable API harness passed | Real iPhone execution remained |
| 28 Aug 2026 | 3 | IndexedDB projects, autosave, selection, inspector, undo and redo, local reference, and the then-supported import report passed local browser smoke checks | The legacy import path is removed from the current version; deployment did not prove iPhone behavior |
| 30 Aug 2026 | 3 | Preview-first workspace at `ef2f945` rendered on production without console issues or page-level overflow | Product-principles first run remained |
| 31 Aug 2026 | 4 | Production exposed seven contextual tools; `widgetr_get_context` and `widgetr_export` succeeded | Mutating flow, manual interleave, fresh checks, and iPhone test remained |
| 31 Aug 2026 | Planning | Product and architecture rules were separated from this phase execution record, and `AGENTS.md` was routed to the current handoff | Documentation-only change; no runtime checks were run |
| 31 Aug 2026 | Planning | Added Phase 9 for typed progress rings, progress bars, sparklines, and compact bar charts; shifted curation, style integration, and final hardening to Phases 10 through 12 | Documentation-only scope decision; no visual-data implementation or runtime verification exists yet |
| 31 Aug 2026 | 5 | Added typed starter intents, a neutral first-run project, explicit Nuxt UI start paths, separate example creation, reference wiring, returning-project restoration, and the `New project` action; removed the Scriptable source-import path and kept legacy project metadata loadable. `npm test` passed 6 files and 46 tests, `npm run typecheck` passed, `npm run build` passed, and desktop `1280 x 900` browser verification covered dialog creation, project retention, absent import controls, a normal edit surviving refresh, page width, and console diagnostics | Deployed migration and clean-profile production evidence remain release follow-ups; Phase 4 remains in progress |
| 31 Aug 2026 | UI pass | Implemented the `widgetr-design.md` fullscreen studio shell, semantic light/dark tokens, persistent pane/rail/sheet geometry, direct size and visibility controls, cross-size selection continuity, contextual inspector, truthful assistant status, keyboard recovery, and mobile 44px hit targets. Local browser evidence covered dark and light `1280 x 900`, rail `1024 x 768`, and phone `390 x 844` layouts; `git diff --check` passed and the single Impeccable detector returned no findings | Tests, typecheck, and production build were not run under the repository approval gate; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 31 Aug 2026 | UI revision | Recentered the studio around a near-full-bleed canvas: persistent navigation and inspector panes are visually removed, Projects/Layers/Reference/settings/selection inspection open as transient sheets, size and visibility controls float in glass, low-frequency actions move behind Tools, and the saved-state footer only appears while saving or in error. Local browser evidence covered dark `1280 x 900`, `1024 x 768`, and `390 x 844` layouts, plus Tools, Layers, and selection-sheet interactions; `git diff --check` passed | Light-mode recheck, tests, typecheck, and production build were not run in this follow-up under the repository approval gate; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Converted navigation, settings, reference, export, and selection inspection into inset floating glass sheets with no page-wide scrim; made `All` a peer size choice, removed the redundant `Show all sizes` action, tightened visibility copy/rows, and reduced selection context to a bottom `Enter group` action; desktop and phone browser evidence confirmed the floating surfaces preserve the canvas; `git diff --check` and the Impeccable detector passed | Light-mode recheck, tests, typecheck, and production build were not run under the repository approval gate; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Replaced the user-facing top-level `Root` layer label with `Widget` while keeping the canonical internal `root` id unchanged; `git diff --check` passed and the existing desktop browser tab remained available for verification | Light-mode recheck, tests, typecheck, and production build were not run under the repository approval gate; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Removed the unclear `Enter group` control, made each preview size caption select the complete `Widget` surface, and restored the existing assistant status label in the full desktop top bar while retaining icon-only behavior at compact breakpoints; local browser evidence covered full desktop, compact desktop, and phone layouts, and both `git diff --check` and the Impeccable detector passed | Dark-mode recheck, tests, typecheck, and production build were not run under the repository approval gate; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Moved the project name out of the compact top-bar identity into a dedicated canvas title that wraps long names, and added a low-contrast grid plus restrained center glow to give the near-bleed stage spatial character without adding another panel; desktop and phone browser checks were completed with the existing open tab, and `git diff --check` plus the Impeccable detector passed | Tests, typecheck, and production build were not run under the repository approval gate; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Adjusted selected size controls to use a dark foreground in dark appearance for readable contrast against the indigo active fill; a light browser check confirmed its white label treatment remains unchanged | Dark appearance screenshot, tests, typecheck, and production build remain separate verification checkpoints |
| 1 Sep 2026 | UI revision | Removed the assistant status button's inner filled pill so the desktop action cluster reads as one lightweight status affordance plus the primary Export button, while compact widths retain touch-safe controls; full desktop and compact desktop browser checks passed with the existing open tab | Dark-mode screenshot, tests, typecheck, and production build remain separate verification checkpoints |
| 1 Sep 2026 | UI revision | Moved the assistant bot icon into the compact contextual selection receipt, leaving readable assistant status text beside Export on wide screens and the icon-only fallback at compact widths; the receipt now uses a small indigo glass treatment instead of a full-width success toast, and full desktop/compact browser checks passed | Dark-mode screenshot, tests, typecheck, and production build remain separate verification checkpoints |
| 1 Sep 2026 | UI revision | Added a pin/unpin action to the contextual inspector so it can remain open and fall back to widget settings after selection is cleared; replaced the Export slideover with a centered modal that keeps the canvas visible behind a clear backdrop, shows the generated Scriptable source, and provides copy/download actions plus three concrete setup steps; selected widget previews now receive a distinct outer indigo outline. Full desktop `1420 x 1115` and compact desktop `1024 x 768` browser checks covered export open/close, code visibility, pinned inspector persistence, selection highlight, and modal spacing; `git diff --check` and `npm run repo:check` passed | Dark-mode screenshot, tests, typecheck, and production build remain separate verification checkpoints; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Added click-drag panning to the canvas with a movement threshold that preserves normal selection clicks; floating sheets now remain non-modal and open while the canvas is panned underneath them. Full desktop and compact desktop browser checks moved the stage while the inspector remained open; the phone viewport retained the same pointer-enabled canvas surface where visible; `git diff --check` and `npm run repo:check` passed | Dark-mode screenshot, tests, typecheck, and production build remain separate verification checkpoints; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Replaced the duplicate top-bar assistant status button and contextual receipt/footer with one fixed bottom bot/status dock. It collapses to a bot icon and status dot while idle, expands for selection/save/tool-registration feedback, keeps the existing assistant handoff panel behind the bot, and stays visible while the inspector is open. Full desktop `1420 x 1115` evidence covered idle, selected-widget, inspector-open, assistant-panel, cleared-selection, and canvas-pan states; compact `1024 x 768` and phone `390 x 844` checks confirmed touch-safe sizing and a clear dock above the floating inspector; `git diff --check` and `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Centered the mobile canvas-control group from the viewport midpoint while preserving horizontal overflow handling, and aligned the inspector pin action with the close button using the same 32px header hit area and baseline. Mobile `390 x 844` and desktop `1420 x 1115` browser checks confirmed centered controls, matched pin/close geometry, and no horizontal overflow; `git diff --check` and `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; this follow-up is currently uncommitted, while production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Removed the persistent top-left Widgetr pill and wordmark so the project entry point is a slightly larger icon-only control with no wrapper chrome. Desktop `1420 x 1115` and mobile `390 x 844` browser checks confirmed the 46px touch target, 20px icon, centered canvas controls, and no horizontal overflow; `git diff --check` and `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; this follow-up is currently uncommitted, while production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Stacked the readable project name above the centered size and visibility controls in a single responsive canvas header, allowing longer names to wrap without truncation while preserving the floating glass control row. Full desktop `1420 x 1115` and phone `390 x 844` checks confirmed centered alignment, no title/control overlap, and no horizontal overflow; `git diff --check` and `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; this follow-up is currently uncommitted, while production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Attached the assistant status badge to the bot icon instead of leaving a separate floating dot, and mapped unsupported/error to red, registering/saving to yellow with a pulse, and registered to green. Full desktop and phone browser checks confirmed the badge stays anchored to the icon and the existing status copy/popover remain intact; `git diff --check` and `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; this follow-up is currently uncommitted, while production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Kept widget elements and their size captions out of the canvas-pan pointer handler so clicks reliably reach element selection while empty-canvas drags continue to pan. Full desktop checks confirmed nested surface and caption clicks update selection after a canvas drag; the phone viewport retained the same interaction path with the inspector sheet open; `git diff --check` and `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; this follow-up is currently uncommitted, while production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Removed the duplicate bottom Undo action from the assistant dock, fixed the expanded icon-and-copy footprint at 352px on desktop and the available width on phone, and added a restrained width plus copy fade/slide transition with reduced-motion support. Desktop `1420 x 1115` checks confirmed identical dock geometry across selection messages and a compact 48px idle state; phone `390 x 844` checks confirmed the 352px expanded dock, 44px idle target, no horizontal overflow, and no bottom Undo control; `git diff --check` passed | Tests, typecheck, and production build remain separate verification checkpoints; this follow-up is currently uncommitted, while production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Normalized native color inputs in the inspector to the shared 32px field height used by adjacent text and numeric controls. Desktop `1420 x 1115` and phone `390 x 844` browser checks measured matching 32px heights and no horizontal overflow; `git diff --check` and `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; this follow-up is currently uncommitted, while production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Removed the duplicate offset focus outline from Nuxt UI inputs so focused fields use one clear in-field accent ring instead of a nested border plus offset border. Desktop and phone create-project modal checks confirmed the single ring, 32px field height, and no horizontal overflow; `git diff --check` and `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; this follow-up is currently uncommitted, while production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Allowed long assistant status and change-receipt messages to wrap inside the fixed-width bottom dock instead of ellipsizing. Desktop and phone checks showed complete copy, adaptive height for multi-line receipts, stable dock width, and no horizontal overflow; `git diff --check` and `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; this follow-up is currently uncommitted, while production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Kept the Layers sheet open while selecting a layer, removed duplicate body inset so the layer tree uses the available sheet width, left-aligned Tools menu rows, and clarified project/status affordances: project actions share a 32px height with Cancel left/Create right on desktop, and `Ready for your assistant` is hidden during change receipts. Desktop `1420 x 1115` and phone `390 x 844` checks covered all four paths with no horizontal overflow; `git diff --check` and `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; this follow-up is currently uncommitted, while production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Shared the Layers sheet's horizontal inset between its header and `Preview size` body so the `Layers` heading, label, and control column align; this follow-up now uses the Inspector's 16px panel inset. Desktop `1420 x 1115` and phone `390 x 844` checks measured a 0px heading/label x-delta and no horizontal overflow; `git diff --check` and `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; this follow-up is currently uncommitted, while production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Kept Undo and Redo mounted as a dedicated glass history capsule beside a standalone Export action, synchronized the Layers preview selector/tree with the active canvas size, and matched Layers header/body padding to the Inspector's 16px inset. Desktop `1420 x 1115` and phone `390 x 844` checks confirmed persistent controls, an 8px mobile gap before Export, matching Medium state, 0px heading/label x-delta, and no horizontal overflow; `git diff --check` and the Impeccable detector passed | Tests, typecheck, and production build remain separate verification checkpoints; this follow-up is currently uncommitted, while production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Matched the outer Undo/Redo history capsule to the standalone Export control at 36px on the desktop toolbar, preserving 44px touch-safe dimensions at narrow widths. Local browser checks at `1280 x 900` and the default `1492 x 1115` view confirmed equal heights, identical baselines, no horizontal overflow, and no console errors; `git diff --check` passed | Tests, typecheck, and production build remain separate verification checkpoints; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Turned the Assistant handoff surface into accessible History and Tools tabs. Opening the surface defaults to History when undo/redo entries exist and Tools otherwise; operation messages now travel with the canonical undo/redo snapshots, and the history view uses a bounded `overflow-y: auto` list. Local browser checks at `1280 x 900` and the default `1492 x 1115` view covered both defaults, tab switching, keyboard arrow navigation, tab semantics, no horizontal overflow, and a clean reload with no new runtime errors; the retained browser log still contains one pre-fix HMR prop error from before the defensive history default was added, and `git diff --check` plus `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Removed the duplicate `New project` action from the Tools menu so project creation stays inside the Projects surface, and aligned the top-left Projects trigger to the desktop history capsule and Export control at 36px with a matching 16px icon; narrow layouts use the shared 44px touch target. Local browser checks at `1280 x 900`, `390 x 844`, and the default `1492 x 1115` view confirmed the four-item Tools menu, New project remains in Projects, matching action geometry, no horizontal overflow, and no console errors; `git diff --check` plus `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Removed the redundant Visibility control and its overview popover so the floating canvas group contains only the four direct size choices and Tools; the All view now always presents the complete set of outputs, while element-level visibility remains available in the inspector. Local browser checks at `1280 x 900` and the default `1492 x 1115` view confirmed the Visibility control and popover are absent, Small/Medium/Large/All and Tools remain available, no horizontal overflow, and no console errors; `git diff --check` plus `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Matched the Projects and Export leading-icon slots at 18px while preserving their shared 36px desktop button geometry and the 44px narrow-layout touch target. The refreshed local browser preview at the default `1492 x 1115` view confirmed equal icon-slot dimensions, centered controls, no horizontal overflow, and no console errors; `git diff --check` passed | Tests, typecheck, and production build remain separate verification checkpoints; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Empty canvas clicks now clear the current element selection while clicks on widget nodes and size captions retain their existing selection behavior; drag-release clicks remain suppressed so panning cannot accidentally clear or change selection. Static source inspection and `git diff --check` passed; the open local browser could not be reloaded or inspected because its localhost URL was rejected by the browser URL policy | Tests, typecheck, and production build remain separate verification checkpoints; fresh browser interaction, production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified |
| 1 Sep 2026 | UI revision | Kept the assistant dock at a fixed centered width, removed its hover lift, and replaced abrupt status-copy swaps with a 140ms opacity-only crossfade that respects reduced-motion settings. The visible local browser check confirmed hover changes only shadow styling, selected copy replaces the idle message, Inspector close returns to the idle message, and the dock kept identical x/y/width/height through those transitions and Projects open/close; no browser warnings or errors appeared, `git diff --check`, `npm run repo:check`, and the Impeccable detector passed | Tests, typecheck, and production build remain separate verification checkpoints; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified; this follow-up is currently uncommitted |

| 1 Sep 2026 | UI revision | Preserved `All` preview mode when selecting an element in any of the Small, Medium, or Large previews, while keeping the clicked element selected and scoping the Inspector to its size. Local browser checks confirmed all three previews remained visible, the `All` control stayed pressed, selection copy identified the clicked size, and no warning or error logs appeared; `git diff --check` and `npm run repo:check` passed | Tests, typecheck, and production build remain separate verification checkpoints; production behavior, external assistant invocation, and Scriptable/iPhone execution remain unverified; this follow-up is currently uncommitted |

## End-of-session update rule

Before ending work on a phase:

1. Update the `Current handoff` fields.
2. Check only tasks proven complete.
3. Add exact verification evidence and state what it does not prove.
4. Name the next action in one sentence.
5. Keep the active phase unchanged until its deployment gate passes or the user explicitly reprioritizes it.

This update is part of phase completion. A code change without an updated handoff is incomplete documentation.
