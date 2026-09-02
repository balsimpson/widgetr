# Widgetr fullscreen studio design

## Purpose

Widgetr should feel like a focused creative application rather than a web page inside a browser. The visual language should be quiet, precise, and intentional, with the restraint associated with Apple-designed software without copying Apple's branding or interface literally.

This document records the agreed redesign direction for the WebMCP challenge. It defines the experience, visual system, interaction model, and behavior states. It does not change the canonical `WidgetProject` model, the shared operation path, export rules, or the current implementation phase by itself.

## Canvas-first revision — 31 August 2026

The latest UI pass supersedes the earlier persistent-pane treatment for the studio shell. The canvas is now the product surface: it owns the viewport edge to edge, keeps the focused widget in generous negative space, and carries only small status/readout islands when they help orientation. Projects, Layers, Reference, Widget settings, and the selection inspector open as inset floating glass sheets without a canvas-wide scrim; they are not permanent desktop furniture.

The top bar is reduced to project identity and a few global actions. Size controls float above the canvas in a translucent glass group, while lower-frequency tools live behind a single Tools affordance. Glass is reserved for these spatially continuous control layers and feedback receipts, with solid sheet fallbacks for legibility. The canonical `WidgetProject`, operation path, scope behavior, persistence, export, and assistant truthfulness remain unchanged.

## Product model

Widgetr has two surfaces with different jobs:

- Widgetr is the live document. It shows the selected object, the current size, the assistant's activity, and the result of each change.
- The AI assistant owns the conversation. The user describes an intent there; Widgetr provides the precise live context the assistant needs to act on the document.

The user should never feel that they are operating two editors. They speak to the assistant, while Widgetr visibly updates the document. Direct manipulation remains available for precise local edits.

The challenge path uses connection guidance, not a blocking dead end. When no assistant is available, Widgetr keeps the local starter, example, reference, and manual paths that the current product supports. It explains what the assistant adds without showing assistant-only controls as disabled. When page tools become available, the same surface updates its status in place without a reload.

The UI-first pass below keeps the current product rules authoritative. It does not change how external assistant discovery is detected, does not claim that page-side registration proves an assistant connection, and does not replace the existing fallback behavior with a new gate.

## Experience shape

The experience has two modes:

1. A guided first-run state that helps the user start with a small number of clear choices.
2. A fullscreen studio once a project exists.

The studio is the primary product. The first-run state should move into it quickly and should not resemble a marketing landing page.

### First-run states

#### Assistant unavailable

Show a quiet starting stage with clear connection guidance. The message should be direct:

> Continue building locally, or connect an AI assistant.

Supporting copy can explain that the assistant uses Widgetr's page tools to create and edit the widget. When there is no project, show the starter and example paths rather than a disabled canvas. When an existing project is open, keep its manual editing controls available and show the unavailable status in the same location. Never add a second chat surface.

#### Assistant ready, no project

Show a focused command list rather than a grid of template cards. Each row represents a useful starting action and has a clear result. The list should be short enough to scan without feeling like a dashboard.

Examples of the interaction shape, using current product actions rather than invented sample copy:

- Create a new widget
- Open an example
- Start from a reference image
- Describe my own idea

Selecting a starting action creates or opens the relevant document and moves into the studio. Examples open read-only first and offer an explicit `Use as starting point` action. They never silently replace the current project.

#### Existing project

Open directly into the studio with the last project. Restore the focused size from the workspace preference when it is valid, and restore the selection only when the selected element still exists in that size. Otherwise open the project with no selection and the Medium preview focused.

## Studio shell

The studio is one continuous canvas with a few floating control islands:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  project                                                   undo · export │
│                     [ Small  Medium  Large  All  Tools ]               │
│                                                                         │
│                         Widget canvas                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

The canvas has visual priority. Navigation and inspection support the document only when summoned, then return the full viewport to the canvas when dismissed.

### Top bar

The top bar is persistent and quiet. It should contain only:

- project identity on the leading side;
- Undo and Redo when there is session history to act on;
- Export.

Direct size buttons live in the floating canvas controls. New project, Projects, Layers, Reference, and Widget settings live behind the floating `Tools` affordance.

The primary user-facing ready state is:

> Ready for your assistant

Use `assistant` or `AI assistant` in user-facing copy. Use `agent` only in internal implementation language. Use `WebMCP` in technical documentation. Provider-specific help may explain that ChatGPT calls these capabilities site tools.

The top bar should not become a control cabinet. Less frequent actions stay out of the persistent shell at every width.

Keep assistant status in one fixed bottom canvas dock, independent of the canvas pan position and any open sheet. The dock is compact (bot icon plus status dot) when the workspace is idle, then expands into a short status capsule while an element is selected, a change is being saved, or assistant tools are registering or unavailable. The bot icon opens the assistant handoff details; do not duplicate that control in the top bar or create a second circular action beside Export. When expanded, pair selection or save feedback with the existing assistant status so the dock is the single source of contextual feedback.

### Left navigation pane

Use one transient leading sheet with separate modes rather than permanent sidebars. The modes are:

- `Projects`: project list, recent documents, and example entry points;
- `Layers`: the editable outline of the current widget;
- `Reference`: the reference image or captured view associated with the project.

Only one mode is open at a time. Opening a destination presents it as an inset floating sheet without changing the canvas or selection. Dismissing it restores the unobstructed canvas at every width; the sheet never relies on a darkened page-wide backdrop to establish hierarchy.

### Canvas

The canvas is the document surface, not a decorative preview card. It should:

- center the focused widget on a calm stage;
- preserve the widget's accurate aspect ratio;
- show the actual rendered content at a useful scale;
- avoid fake device frames and excessive chrome;
- expose selection directly on the widget;
- support a deliberate all-sizes view when requested.
- support click-drag panning on the stage, including beneath open floating sheets; a click without movement keeps its normal selection behavior.

The project name lives in a dedicated canvas title treatment rather than the compact identity pill. It stays readable at every width and wraps instead of truncating longer names. A very low-contrast grid or similar spatial cue can give the stage personality without becoming another surface or competing with the widget.

The focused view is the default because it keeps editing legible. All three outputs remain first-class project content and are never treated as competing variants.

### Inspector

The inspector is contextual and transient. With no selection, Widget settings opens as a floating sheet; with a selection, the selected element or group opens in the same inset glass pattern. It should be organized into short sections such as:

- Content
- Appearance
- Layout
- Advanced

Sections use disclosure controls so the panel remains readable without hiding the existence of available controls. The inspector is the complete control surface; the canvas toolbar is only a shortcut surface.

The inspector header includes a pin action for people who want the controls to stay open while they work. A pinned inspector remains visible after clearing a selection and falls back to widget settings; an unpinned inspector closes with the selection. The close action always unpins and dismisses it.

## Preview and size behavior

The three named sizes are always clear and direct:

```text
Widget sizes    [Small] [Medium] [Large] [All]   [Tools]
```

- Clicking `Small`, `Medium`, or `Large` focuses that output for editing.
- Clicking a preview's size caption selects that output's complete `Widget` surface.
- `All` focuses the overview containing all three outputs and sits in the same size-control group as the three focused views.

The all-sizes view is for seeing the complete set of outputs at once. It is not labeled or framed as a comparison mode.

## Visual direction

### Overall principle

Make the interface feel composed, not decorated. Every visible control should explain its role, and every layer should earn its separation.

### Color

- Follow the system light or dark appearance automatically.
- Use quiet graphite, silver, and cool neutral surfaces as the base.
- Use a restrained indigo as the interaction accent. It should lean slightly violet so it feels authored rather than like a default link blue.
- Reserve indigo for selection, focus, active navigation, primary actions, and meaningful status.
- Choose the active-state foreground per appearance so indigo controls maintain readable contrast in both light and dark modes; do not force white text where the dark appearance needs a graphite label.
- Do not use gradients, neon glow, colored shadows, or a uniformly blue interface.
- Keep semantic colors distinct from the indigo accent so success, warning, and failure remain legible.

The accent should be recognizable as Widgetr's interaction color, not as a decoration applied to every control.

### Typography

- Use the native system UI font stack as the primary typeface.
- Use weight, scale, and spacing to establish hierarchy instead of oversized marketing headings.
- Keep labels short and sentence-cased.
- Use a monospaced face only for code, generated Scriptable output, identifiers, and other technical values.
- Avoid introducing a display font merely to make the product feel designed.

### Surfaces and depth

- Treat the studio as one continuous workspace.
- Let the stage carry most of the viewport and use generous negative space around the widget.
- Use translucent glass layers for floating controls, contextual readouts, receipts, and inset sheets so they preserve the canvas beneath them.
- Use solid, readable sheet surfaces as the fallback for navigation and inspection; they appear only while that task is active and never require a page-wide scrim.
- Avoid nested card stacks. A panel should not look like a card inside another card inside the page.
- Use borders, tonal shifts, and small elevation changes sparingly.

### Shape and density

- Use controlled corner rounding for panels, controls, and selection handles.
- Reserve pill shapes for segmented modes, compact statuses, and the size controls where appropriate.
- Keep the canvas airy and the controls compact but comfortable.
- Use an 8-point spacing rhythm, with smaller optical adjustments where text or icon geometry requires them.

### Iconography

Use a restrained, familiar icon set with consistent stroke weight. Global actions such as undo, redo, settings, and export may be icon-led with accessible labels. Contextual editing actions should use an icon plus a short label so their effect is clear.

## Selection and direct editing

The canvas is the primary editing surface.

- A size caption selects the complete `Widget` surface; a single click on a visible child selects that element or group.
- Selection shows a precise outline or bounding treatment on the canvas, a highlighted row in Layers, and the matching inspector state.
- Selecting the complete `Widget` surface adds a distinct outer outline around the preview so the widget-level selection is visible even when child outlines are also present.
- Children can also be selected from Layers without changing the canvas view.
- Escape clears the current selection.
- Multi-select is out of scope for the challenge; the interaction model stays intentionally precise with one element or group at a time.

The Layers mode is a secondary precision route, not a duplicate editor. It should support:

- disclosure of groups;
- selecting an element or group;
- show/hide;
- reordering where the document model supports it;
- a clear path into the inspector.

Layer rename, duplicate, and delete stay out of the UI-first pass until matching canonical operations and their confirmation rules exist.

The outline should represent the real structured document. Do not create an arbitrary freeform layer hierarchy that the renderer or exporter cannot honor.

### Contextual toolbar

Do not add a separate `Enter group` control. The size caption selects the complete `Widget` surface, while clicking a visible child or choosing it from Layers selects that element directly. Selection identity, visibility, scope, and clearing belong to the inspector.

The canvas should not reserve space for a selection toolbar that duplicates direct selection.

### Export handoff

Export opens as a centered modal with a readable glass surface over the canvas. The modal keeps the generated Scriptable source visible in a scrollable code area, offers direct copy and `.js` download actions, and explains the next steps: move the source into Scriptable, run it once, and add a Scriptable widget that uses the script. Export should not replace the canvas with a side panel or dismiss the user's working context.

### Scope of a change

The current target and propagation scope must be visible at the point of editing:

```text
Apply changes to:  [This size] [All sizes]
```

- `This size` is the default for local changes.
- `All sizes` is explicit and applies a generic compatible change across the three named outputs.
- The existing two-size scope remains supported. When the current scope is a selected pair, the inspector exposes it as `Selected sizes` under the advanced scope control instead of silently narrowing the canonical model to two choices.
- Background and font choices are examples of changes that can reasonably be applied to all sizes.
- A selected element, selected group, current size, project, and scope travel together as the assistant's command context.
- If an operation cannot safely apply to all sizes, the assistant should explain the limitation in its conversation and keep the page state unchanged until the scope is clear.

## Assistant collaboration

### Shared surface

The assistant conversation remains outside Widgetr. Widgetr shows the document state that the conversation is acting on:

- current selection;
- current size and propagation scope;
- a subtle activity state while a tool call is actively changing the document;
- the resulting change receipt;
- Undo and Redo state.

The page should not ask the user to repeat a clear, reversible assistant request by clicking a second confirmation button. Risky or irreversible actions are the exception and keep one clear confirmation step.

### Trust and undo

Clear, reversible assistant changes apply immediately. The page gives the user a visible, immediate Undo path instead of duplicating the assistant's approval step.

- One direct edit or one assistant request creates one undoable change.
- An explicit all-sizes operation is one undo step, even if it updates all three outputs.
- A destructive or difficult-to-reverse request keeps the existing confirmation contract. Project deletion, source replacement, and any operation that cannot be restored through the current history path must be confirmed before it changes state.
- The page receipt includes `Undo`.
- The top bar includes Undo and Redo.
- The user can also tell the assistant to undo the last change.

This hybrid trust model is the UI-first contract: reversible document edits are immediate and undoable, while destructive or irreversible changes remain confirmed.

### Concurrent user and assistant edits

The page remains editable while the assistant is working. There is no blocking busy lock.

Every mutation commits against the current project revision:

1. The assistant reads revision `N` and prepares an operation.
2. The user or assistant may commit a change first.
3. The first successful commit advances the revision.
4. Any operation prepared against an older revision is rejected as stale instead of overwriting the newer state.
5. The assistant reads the latest context and retries only when the intended change still applies.

The two important outcomes are:

| Commit order | Result |
| --- | --- |
| User commits first | The old assistant operation is rejected safely. The user's edit remains intact. |
| Assistant commits first | The user's later edit applies to the new revision. |

The activity indicator describes an active page-side tool call. It must not imply that Widgetr can observe private assistant reasoning or work that has not reached the page.

### Assistant awareness

The assistant can read the latest project context when it acts. That context should include:

- project identity and current revision;
- selected element or group;
- current size and `This size` / `All sizes` scope;
- current editor context;
- selected-element summary;
- the latest committed change summary when available.

The proposed `lastChange` context record should identify the actor, target, scope, and concise result. It gives the assistant a useful account of what happened since the user's previous message without making the page responsible for pushing conversation messages.

The awareness model is read-based and revision-aware. It must not assume that a WebMCP tool-catalog update is a general application-state event.

## Navigation, reference, and examples

### Projects

Projects are documents, not browser tabs. The Projects mode should show the current project clearly, with recent documents and examples available as secondary entries. Switching projects should preserve the project-local selection and history rules.

### Layers

Layers expose structure and control. They should stay synchronized with canvas selection in both directions and should never become a stale outline while the assistant is applying an operation.

### Reference

Reference is a separate view for the supplied image or captured view. It should not compete with the canvas during normal editing. Opening it should not silently change the project.

### Examples

Examples are read-only documents until the user explicitly chooses `Use as starting point`. The current project must remain recoverable and should not be replaced without that explicit action.

## Persistence and export

The studio should communicate local persistence quietly through truthful status, for example:

- `Saved locally`
- `Saving…`
- `Could not save locally`

The canvas-first shell keeps the saved state quiet once it is stable: `Saving…` and `Could not save locally` expand the bottom status dock alongside the assistant icon, while a stable save is represented by the compact ready state and remains available in the Projects and assistant surfaces. This keeps persistence truthful without turning the canvas into a status dashboard.

History, direct edits, assistant edits, and export should continue to use the canonical project state and operation path. The redesign does not introduce a second state model for the canvas.

Export is opened from the top bar in a centered in-context modal with:

- `Copy code`;
- `Download .js`;
- the current project and export target clearly identified.

The modal should make the generated Scriptable output easy to inspect without turning the studio into a code editor.

## Responsive behavior

The layout is adaptive rather than a desktop layout compressed until it breaks.

- On every width, let the canvas own the viewport and keep Projects/Layers/Reference behind the Tools affordance.
- Open navigation and inspection as inset floating sheets only while that task is active; dismissing a sheet returns the unobstructed canvas.
- Keep the focused canvas visible as the primary surface.
- Keep low-frequency actions out of the persistent top bar and behind Tools.
- Preserve direct access to Small, Medium, Large, and All at every supported width.

## Motion and feedback

Motion should make state changes legible without drawing attention to itself.

- Use short transitions for selection, panel appearance, size focus, and receipts.
- Use a calm activity treatment while a page-side assistant operation is running.
- Do not use bouncing, spring-heavy, or celebratory animation for routine edits.
- Animate the transition from unavailable or registering to ready in place, without a reload.
- Respect `prefers-reduced-motion` and provide an equally clear non-animated state.

## Accessibility

The visual restraint must not reduce clarity or access.

- Provide visible keyboard focus for every actionable control.
- Keep selection distinguishable through outline, label, and inspector state, not color alone.
- Give icon-led actions accessible names and tooltips where useful.
- Preserve readable contrast in both system appearances.
- Make the size and visibility states understandable without relying on hover.
- Support keyboard movement through the top bar, sidebar modes, Layers outline, inspector, and canvas selection.
- Keep Undo and Redo available through standard keyboard shortcuts as well as visible controls.
- Ensure touch targets remain comfortable when the inspector or rail is used on a narrow screen.

## Status and copy principles

- Prefer `assistant` in user-facing text.
- Prefer `Ready for your assistant` over technical `WebMCP ready` in the main top bar.
- Keep WebMCP in technical help, diagnostics, and implementation documentation.
- Explain unavailable capability plainly instead of showing a disabled editor.
- State whether the page is showing a preview, a live document, or a read-only example.
- Keep receipts concise and action-oriented: what changed, where it changed, and how to undo it.

## Non-goals for this design

This redesign does not add:

- an embedded chat panel inside Widgetr;
- arbitrary freeform vector or drawing tools;
- multi-selection for the challenge scope;
- a template marketplace or marketing-style home page;
- fake device mockups around the widget;
- a second state model separate from `WidgetProject`;
- silent project replacement when opening an example;
- provider-specific language in the core interface;
- a claim that a registered page-side tool proves external assistant discovery or real-device Scriptable execution.
- a new PWA install flow, browser Fullscreen API flow, or offline service worker.
- Scriptable source import in this UI pass. The current phase plan keeps that capability deferred.
- new layer rename, duplicate, or delete operations until the canonical operation model supports them.

## Implementation guardrails

When this design moves into implementation:

- Keep `WidgetProject` as the canonical document state.
- Route direct edits, assistant edits, history, persistence, and export through the shared operation path.
- Preserve revision checks and reject stale operations without overwriting newer user state.
- Keep selection context precise and include scope in assistant operations.
- Add the latest committed change summary to assistant-readable context only if it can remain truthful and bounded.
- Make page-side activity reflect actual tool execution, not inferred assistant thought.
- Keep the connection guidance, hybrid trust model, and existing fallback/confirmation rules aligned with the product-principles document.
- Verify the live page at wide and narrow viewports, with the assistant unavailable, registering, ready, active, stale, failed, and restored states.

## UI-first implementation plan

This pass implements the visual and interaction shell against the current Widgetr state model. It does not add a new data model, new assistant-discovery semantics, a PWA, or new Scriptable capabilities. Later UX work can improve the behavior inside this shell without having to replace the visual foundation.

### First-pass decisions

These choices are authoritative for the UI pass. They remove the product forks that would otherwise be left to an implementation agent.

| Decision | UI-first contract |
| --- | --- |
| Fullscreen | Treat fullscreen as a viewport-filling web application shell. Use `100dvh` with a `100vh` fallback, keep the document itself from scrolling, and do not add the browser Fullscreen API, PWA installation, or service-worker work in this pass. |
| Assistant unavailable | Keep the starter, example, reference, and manual editing paths usable. Show truthful connection guidance and never imply that page-side tool registration proves an external assistant connection. |
| Destructive actions | Reversible document edits apply immediately and expose Undo. Project deletion, source replacement, and other difficult-to-reverse actions keep one explicit confirmation step. |
| Size scope | Keep the canonical one-size, selected-pair, and all-size scopes. Show `This size` and `All sizes` in the simple path; expose an existing selected-pair scope as `Selected sizes` under the advanced scope control. |
| Unsupported actions | Do not add layer rename, duplicate, or delete controls until matching canonical operations exist. Keep the current Scriptable source import path deferred. |
| State ownership | `WidgetProject` remains the only document state. UI-only layout state such as open panes, focused preview, and expanded inspector sections may live in focused composables and workspace preferences, but must not duplicate document data. |
| Product signature | The stage is quiet and the widget is the only rich object. The signature interaction is a precise selection trace followed by a concise change receipt with Undo, not decorative glass or celebration. |

### Visual world contract

The implementation must replace the current cobalt/Avenir-first token set with a small semantic system. Components consume these names rather than hard-coded palette classes. The values below are the starting contract; contrast checks may darken or lighten a value without changing its role.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--widgetr-app` | `#f5f5f7` | `#171719` | App background behind the shell |
| `--widgetr-stage` | `#e9e9ee` | `#101012` | Canvas stage and quiet breathing room |
| `--widgetr-pane` | `rgb(255 255 255 / 84%)` | `rgb(42 42 45 / 86%)` | Translucent navigation and inspector panes |
| `--widgetr-pane-solid` | `#ffffff` | `#2a2a2d` | Sheet and popover fallback when blur is unavailable |
| `--widgetr-ink` | `#1d1d1f` | `#f5f5f7` | Primary text and icons |
| `--widgetr-muted` | `#6e6e73` | `#a1a1a6` | Supporting text and quiet metadata |
| `--widgetr-border` | `rgb(29 29 31 / 12%)` | `rgb(255 255 255 / 14%)` | Pane separators and control boundaries |
| `--widgetr-accent` | `#6d5bd0` | `#9b8cff` | Selection, focus, active mode, and primary action |
| `--widgetr-accent-strong` | `#5745b7` | `#b3a7ff` | Hover and pressed accent states |
| `--widgetr-success` | `#1f7a51` | `#5dd49e` | Saved and completed states |
| `--widgetr-warning` | `#a45a00` | `#f0b35e` | Saving, warnings, and recoverable limits |
| `--widgetr-danger` | `#c73532` | `#ff7b72` | Errors and destructive confirmation |

Use `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` for interface text. Use `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` only for generated code, identifiers, and technical values. The type ramp is 11, 13, 15, 17, 20, and 24px with regular, medium, and semibold weights. There is no oversized marketing heading in the studio.

The geometry tokens are:

| Token | Value | Use |
| --- | --- | --- |
| `--widgetr-topbar-height` | `52px` | Floating top-bar overlay baseline |
| `--widgetr-pane-width` | `240px` | Leading sheet width |
| `--widgetr-rail-width` | `52px` | Reserved compact control width |
| `--widgetr-inspector-width` | `320px` | Wide inspector sheet |
| `--widgetr-inspector-min-width` | `280px` | Smallest inspector sheet |
| `--widgetr-control-height` | `32px` | Desktop controls |
| `--widgetr-touch-target` | `44px` | Touch hit area, including compact icon controls |
| `--widgetr-radius-control` | `8px` | Buttons, fields, and disclosure rows |
| `--widgetr-radius-panel` | `12px` | Panes and sheets |
| `--widgetr-radius-stage` | `16px` | Canvas stage |
| `--widgetr-spacing-unit` | `4px` | Base unit for the 8-point rhythm |

Use one-pixel separators and small tonal shifts before adding shadows. Blur is limited to pane and sheet backdrops, has a solid fallback, and never sits behind body text. Do not add gradients, neon edges, colored shadows, or a card inside another card.

### Shell and responsive geometry

The root app shell uses `min-height: 100vh`, `min-height: 100dvh`, `height: 100dvh`, and `overflow: hidden`. `html`, `body`, and `#__nuxt` must be able to fill the viewport. Apply safe-area insets with `max(12px, env(safe-area-inset-*))` where content touches a device edge.

| Width | Shell | Navigation | Inspector | Canvas behavior |
| --- | --- | --- | --- | --- |
| `>= 1200px` | Full-viewport canvas with small glass islands | Left sheet on demand | Right sheet on selection or settings | Focused widget is centered in generous negative space; all-sizes overview scrolls only inside the canvas |
| `900px-1199px` | Same canvas-first shell | Left sheet on demand | Right sheet on selection or settings | Canvas keeps the focused preview legible without reserving pane width |
| `600px-899px` | Same canvas-first shell, compact floating controls | Full-width or max-width left sheet | Right sheet, max 360px | Focused preview remains visible behind a sheet; no page-level horizontal scroll |
| `< 600px` | Same canvas-first shell with project name wrapping safely | Full-width left sheet | Full-width right sheet | One focused preview at a time; Small, Medium, Large, and All stay directly reachable in a compact horizontal control |

The app root never scrolls. The canvas region owns preview scrolling, each pane owns its own list scrolling, and each sheet owns its body scrolling. Do not create nested scroll containers for the same axis. The canonical `WIDGET_DIMENSIONS` remain unchanged. Responsive behavior scales the rendered preview with `contain` or a CSS transform; it never mutates the widget's layout dimensions or aspect ratio.

The canvas controls have a fixed priority order. The leading top-bar group is project identity and a Projects entry point. The trailing group is history when available and Export. The centered floating group owns focused size and All; low-frequency actions including New project, Layers, Reference, Widget settings, and assistant diagnostics stay behind the Tools affordance. The bottom status dock owns assistant status and contextual feedback. Export remains visible as a compact icon control so the canvas never loses its primary action.

### Component and state ownership

Keep `app/pages/studio.vue` as the page-level coordinator. It owns project loading, history, persistence, WebMCP registration, and event wiring. It should not own the detailed markup or styling for every region.

Create focused UI components under `app/components/studio/`:

| Component | Responsibility |
| --- | --- |
| `StudioShell.vue` | Viewport shell, top bar slot, navigation slot, canvas slot, inspector slot, and scroll ownership |
| `StudioTopBar.vue` | Project identity, focused size, scope summary, history, status, export, and overflow priority |
| `StudioNavigation.vue` | Projects, Layers, and Reference modes, presented as one transient sheet without permanent pane or rail furniture |
| `StudioCanvas.vue` | Stage, focused/all-sizes layout, preview scale, selection overlay, and canvas empty states |
| `StudioSizeControls.vue` | Small, Medium, Large, All, and selected-pair scope disclosure |
| `StudioSelectionToolbar.vue` | Existing common actions only, with collision-safe placement near the selection or canvas edge |
| `StudioInspectorPane.vue` | Selection-driven inspector presentation and project-level settings entry point |
| `StudioAssistantStatus.vue` | Truthful unavailable, registering, ready, active, stale, failed, and restored states |
| `StudioChangeReceipt.vue` | Concise actor, target, scope, result, and immediate Undo action |
| `StudioExportSheet.vue` | In-context source inspection, copy, download, warnings, blockers, and success state |

Adapt the existing `WidgetPreview.vue`, `WidgetNodeRenderer.vue`, `WidgetStructureTree.vue`, `WidgetInspector.vue`, `WidgetProjectList.vue`, `ProjectStarter.vue`, and `AgentToolsPanel.vue` into those regions rather than creating parallel editors. If state grows, extract `useStudioLayout`, `useStudioSelection`, and `useStudioStatus` composables. Every document change still calls the page's `commitOperation`, which routes through `applyWidgetOperation`.

### Implementation sequence

1. **Lock the visual foundation.** Replace the current token names in `app/assets/css/main.css`, add the light/dark semantic values above, add the viewport shell, and remove the centered page-card treatment. At the end of this step, the empty shell must fill the viewport at 1280 x 900 without document scroll.
2. **Build the shared shell.** Extract the top bar, navigation region, canvas stage, and inspector region. Keep the existing project, history, persistence, and WebMCP behavior wired through the same page coordinator. Do not change operation schemas in this step.
3. **Make the canvas the hero.** Add direct size buttons, focused/all-sizes rendering, accurate scaling, and the quiet stage. The selected widget is the only rich object on the screen. Keep the current canonical dimensions and renderer.
4. **Add selection continuity.** Synchronize canvas and Layers selection, add the outline and breadcrumb presentation, and add the contextual toolbar using only supported operations. Defer unsupported layer rename, duplicate, and delete actions. Preserve the current selected-pair scope in the advanced control.
5. **Add adaptive navigation and inspector presentation.** Keep navigation and inspection transient at every width, with sheets that preserve canvas context and return focus on dismissal. Define Escape behavior before adding transitions.
6. **Add truthful feedback and restrained motion.** Implement save status, assistant status, stale and failed receipts, export states, and the first-change focus treatment. Use the motion and reduced-motion rules below. Do not invent assistant reasoning or connection claims.
7. **Run the bounded verification pass.** Capture the specified viewports in light and dark appearance, exercise the listed states, run `git diff --check`, and run the Impeccable detector once on changed UI files. Typecheck, tests, and production build remain separate approval-gated checks.

### UI state matrix

Every state needs a visible location, one useful action, preserved work, and an accessible announcement.

| State | Visible treatment | Primary action and guarantee |
| --- | --- | --- |
| Hydrating | Same shell with quiet skeletons in the project list and canvas | No destructive action is available before the project is valid |
| Assistant unavailable | `Assistant unavailable` status plus connection guidance | Continue with local editing, examples, reference, or help; no disabled fake editor |
| Registering | `Preparing assistant tools` status | Keep the document usable; status changes in place when registration completes |
| Registered and ready | `Ready for your assistant` status | Do not claim an external assistant is connected |
| Active mutation | `Your assistant is applying a change` activity treatment | Keep the page editable and show no private reasoning |
| Stale operation | `That change was based on an older version` receipt | Preserve the newer document and ask the assistant to retry with current context |
| Failed or cancelled operation | `Change not applied` receipt with the actual reason | Preserve the document and offer a clear retry or correction path |
| Restored project | Short `Back to your project` confirmation | Restore project-local selection and focused size where available |
| Read-only example | `Example` marker and read-only controls | `Use as starting point` creates a recoverable editable copy |
| Saving, saved, save failure | `Saving` or `Could not save locally` in the low-profile status location; stable saves stay quiet and are available in Projects/assistant surfaces | Preserve the current session and explain whether refresh can lose it |
| Export warning, blocker, success | Warning or blocker beside the affected target; success after copy/download | Name the next action and never claim Scriptable success without device evidence |

### Interaction, keyboard, and accessibility contract

| Region | Pointer behavior | Keyboard and assistive behavior |
| --- | --- | --- |
| Top bar | Buttons use familiar labels and icon plus text where the action is contextual | Tab order follows leading, center, trailing groups. `Cmd/Ctrl-Z` and `Cmd/Ctrl-Shift-Z` control history outside editable fields. |
| Navigation | One mode opens at a time; pane collapse does not alter selection | Mode buttons expose selected state. Arrow keys move within the Layers tree. Sheets trap focus and return it to the trigger. |
| Canvas | Click selects; double-click enters a group; selection outline and inspector update together | Focusable nodes expose role, name, size, and selected state. Enter or Space selects. Escape closes a sheet or popover first, then exits a group. |
| Layers | Disclosure, selection, visibility, and reorder follow the real document tree | Use tree/treeitem semantics, roving focus, Left/Right for disclosure, Up/Down for movement, Home/End for bounds, and a visible rename action only when the model supports it. |
| Inspector and sheets | Inputs stay close to the selected element and remain full width | Focus returns to the changed control after an operation. Destructive confirmations state what will be lost and preserve the underlying form state. |
| Status and receipts | Status stays near the top bar; receipts stay near the changed canvas result | Use a polite live region for save, ready, active, and completed receipts. Use an assertive announcement only for a blocking error. Never communicate meaning through color alone. |

Use WCAG 2.2 AA as the web baseline. Normal text must reach 4.5:1 contrast, large text and meaningful UI boundaries 3:1, and touch hit areas 44 x 44 CSS pixels. Verify keyboard-only completion, visible focus, 200% zoom with reflow, screen-reader names and state changes, and focus return from every sheet, popover, and confirmation. The reduced-motion state removes transforms and waits, but keeps the same selection, receipt, focus, and announcement results.

### Motion and delight contract

Use four motion tokens: selection `120ms ease-out`, pane or sheet entry `180ms ease-out`, size focus `220ms ease-in-out`, and receipt emphasis `160ms ease-out`. A later update replaces an in-flight emphasis instead of queuing animations. Users can continue interacting immediately.

The first assistant change is the emotional peak. Focus the changed element, draw one restrained outline transition, place `Changed [target] in [size]` beside it, and keep `Undo` next to that receipt. Switching size keeps the selected target and recent context in view. Export ends with a truthful next step such as reviewing the generated file or installing it in Scriptable. There is no confetti, bounce, glow, or celebratory animation for routine edits.

### UI-pass acceptance and evidence

The first implementation is complete only when all of the following are observable in the local browser:

- At 1280 x 900, the shell fills the viewport, the canvas owns the full stage, floating controls remain comfortably separated, and the document has no horizontal or vertical scroll.
- At 1024 x 768, navigation and inspection remain available as sheets without reserving canvas width, and the focused preview does not become a clipped card.
- At 390 x 844, the root width is 390px, there is no page-level horizontal overflow, navigation and inspector open as sheets, touch targets are at least 44 x 44 CSS pixels, and the four size choices remain reachable.
- The same shell works in light and dark appearance. The widget remains the focal object and the stage, floating controls, sheets, and receipts retain one visual grammar.
- Selecting from the canvas or Layers updates the outline, breadcrumb, inspector, and assistant-readable context. Clearing selection closes selection-only controls.
- The assistant status matrix, persistence states, read-only example state, and export warning/blocker/success states show the specified copy, action, preserved work, and announcement.
- Keyboard-only navigation can open and close every pane, move through Layers, select a canvas element, edit a supported field, undo, redo, and recover focus.
- `prefers-reduced-motion` produces the same state changes without waiting or relying on movement.
- Static checks include `git diff --check` and one Impeccable detector run over changed UI files. Browser evidence, hosted behavior, external assistant invocation, and real Scriptable/iPhone execution stay separate claims.

The UI pass stops after this evidence. Data-source onboarding, new layer operations, Scriptable source import, external assistant discovery semantics, PWA installation, browser Fullscreen API behavior, private style curation, and real-device execution belong to later UX or release phases.

## Acceptance criteria for the redesign

The direction is ready for implementation when a reviewer can confirm that:

1. The page reads as a fullscreen studio, not a website with a hero section.
2. The canvas is the dominant surface and the focused widget is the default view.
3. Small, Medium, Large, and All are directly addressable in one compact control group.
4. A single click, double-click, Layers selection, breadcrumb, and Escape produce an understandable selection flow.
5. `This size` and `All sizes` are visible and unambiguous at the point of change.
6. The assistant conversation stays external while the page shows live selection, activity, and receipts.
7. A user edit made during an assistant operation cannot be overwritten by stale assistant work.
8. The assistant can read the latest revision, selection, scope, and recent change context.
9. Undo is the page's immediate recovery path for direct and assistant changes.
10. The layout remains usable when navigation and inspection appear as transient sheets at every width.
11. Light/dark appearance, keyboard focus, reduced motion, and readable contrast are treated as core states.

## References

- [Widgetr product principles](docs/widgetr-product-principles.md)
- [Widgetr phase implementation plan](docs/widgetr-phase-implementation-plan.md)
- [Apple Human Interface Guidelines: Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)
- [Apple Human Interface Guidelines: Split views](https://developer.apple.com/design/human-interface-guidelines/split-views)
- [Apple Human Interface Guidelines: Panels](https://developer.apple.com/design/human-interface-guidelines/panels)
- [Apple Human Interface Guidelines: Disclosure controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls)
- [WebMCP draft](https://webmachinelearning.github.io/webmcp/)
- [OpenAI: Using site tools in the ChatGPT desktop app](https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app)
