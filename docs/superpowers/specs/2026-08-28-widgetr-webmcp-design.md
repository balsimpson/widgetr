# Widgetr WebMCP vertical slice

Status: design for Phase 4
Date: 28 August 2026

## Summary

Widgetr will expose a small, contextual set of WebMCP tools from the existing local editor. The browser will see tools for the current editor context only: no selection, text, image, or group. Each widget-state editing tool will translate its bounded input into a canonical `WidgetOperation`, then send it through the same commit path used by the UI. Project creation remains a lifecycle command because it has no existing project revision to update.

The adapter will not own widget state, duplicate validation, or write IndexedDB records. It will read the current project at execution time, require a current revision for mutations, and report the operation result without returning the whole project or any private data.

Real Scriptable execution on an iPhone remains a separate Phase 2 checkpoint. This phase targets the local and deployed WebMCP behavior.

## Goals

- Register contextual tools through `document.modelContext.registerTool()`.
- Change the registered tool set when the selected element context changes.
- Keep manual edits and agent edits on one canonical state and one operation path.
- Preserve revision checks, session history, autosave, and the existing generator.
- Require an explicit design scope for multi-size visual changes.
- Require an actual user confirmation before an agent replaces an image.
- Keep tool inputs, descriptions, and outputs bounded and safe to expose to an external agent.
- Make the active WebMCP context visible in the editor for local verification.
- Cover the adapter and operation additions with focused unit tests.

## Non-goals

- No built-in chat or agent transport.
- No API fetching, authenticated data onboarding, Keychain secrets, or iPhone pairing.
- No approved-style library or style provenance workflow. Those belong to Phase 6.
- No arbitrary JavaScript, canvas drawing, charts, maps, tables, animation, or navigation in the canonical widget state.
- No replacement of the existing Nuxt editor with a new visual design. The page remains a functional phase harness.
- No cloud project storage or cross-device synchronization.

## Existing boundaries

The current project already has:

- one `WidgetProject` containing shared normalized data and separate small, medium, and large layout trees;
- `applyWidgetOperation()` as the canonical mutation function;
- revision-checked operations for selection, scope, element style, text style, content, metadata, background, and snapshots;
- a page-level `commitOperation()` wrapper that records session history and persists valid state;
- `generateScriptableCode()` as the shared export source;
- local project creation through `useWidgetProjects()`.

The WebMCP runtime must use these boundaries rather than introducing a second state model or a second widget-state mutation implementation.

## Options considered

### Static tool set

Register every possible action and require each tool to receive an element ID and type. This is easy to discover from a test harness, but it exposes irrelevant actions and makes the agent reason about selections that the interface already knows.

### Dynamic imperative adapter

Register a small catalog for the current selection context and replace that registration set when the context changes. This matches the Phase 4 contract and the current WebMCP imperative API. The catalog can stay pure, while the runtime composable owns browser lifecycle and the page continues to own persistence and history.

This is the chosen approach.

### Declarative forms

Annotate editor forms as WebMCP tools. This works well for ordinary form submission, but it does not map cleanly to recursive selection context, scoped tree operations, revision checks, or a tool that waits for a destructive confirmation dialog.

## Architecture

### Pure tool catalog

Add a domain module that accepts the latest `WidgetProject` and returns a `WebMcpToolDefinition[]`. It will derive a context key from:

- `none` when `project.selection` is null;
- `text` when the selected element is a text or date element;
- `image` when the selected element is an image;
- `group` when the selected element is a group or repeat;
- `unsupported` when a stale selection points to an element that no longer exists.

The catalog will contain static descriptions and JSON Schema input definitions. It may include a short sanitized element label in the status panel, but imported code, API data, project data, and user-provided text will not be copied into tool descriptions.

The catalog will not call browser APIs or mutate state. It will provide tool metadata and an operation factory or handler descriptor for the runtime adapter.

### Browser adapter composable

Add a composable that receives the live project ref and these page-owned callbacks:

- `commitOperation(operation)`, which already applies, histories, replaces, and persists widget state;
- `createProject(name)`, for the project-lifecycle create action;
- `getExport()`, which returns the current `generateScriptableCode()` result;
- `requestConfirmation(request, signal)`, which opens a UI confirmation dialog and resolves only after the user chooses.

On mount, the composable will detect `document.modelContext`. If the API is missing, it will expose an `unsupported` status and leave the editor usable. If the API exists, it will register the catalog for the current context with an `AbortController` signal. When the context key changes, it will abort the previous registration set and register the new set. It will abort the active set on unmount.

Tool handlers will read `project.value` when they execute. They will not close over a stale project snapshot. A revision mismatch therefore reaches `applyWidgetOperation()` and returns `STALE_REVISION` without replacing current state.

The adapter will keep a monotonically increasing registration generation so a slow registration result from an older context cannot overwrite the current status or tool-name list.

### Page integration

The page will instantiate the adapter beside the existing operation and project composables. The adapter will use the page’s `commitOperation()` rather than calling `applyWidgetOperation()` directly. This preserves the current undo/redo and autosave behavior for both manual and agent edits.

Add a compact Agent tools panel to the current page. It will show:

- WebMCP status: unavailable, registering, registered, or error;
- current context: widget, text, image, or group;
- current revision;
- currently registered tool names;
- a short explanation when the browser does not expose WebMCP.

The panel is diagnostic UI for the phase checkpoint, not a second tool runner.

## Tool contract

All tool names use the `widgetr_` prefix. Names are stable across context changes. Every mutating widget-state tool has a required `expectedRevision` integer. The project-creation lifecycle command is the one exception because it creates a new project rather than updating an existing revision. Every visual mutation that can affect more than one size has a required `scope` object matching the existing `DesignScope` shape:

- `{ "kind": "one", "size": "small" | "medium" | "large" }`;
- `{ "kind": "several", "sizes": [size, size] }`;
- `{ "kind": "all" }`.

The schema will constrain the two-size tuple to distinct sizes. The handler will still pass the complete operation through the existing Zod operation schema.

### Shared tools

`widgetr_get_context` is read-only and is always registered. It returns a bounded summary containing the current revision, selection, design scope, context, available tool names, and a small description of the selected element. It does not return raw data, bindings, source code, IndexedDB records, or secrets.

`widgetr_export` is read-only and is always registered. It calls `generateScriptableCode(project.value)`, reports readiness and bounded diagnostics, and returns the generated source only when it fits the output limit. If the source exceeds the limit, the result reports `sourceIncluded: false`, the source length, and a short preview. The UI continues to provide the complete source through its existing viewer, copy, and download actions.

`widgetr_select_element` is always registered. It validates the requested size and element ID against the live trees before sending the existing `set-selection` operation. This lets an external agent move into a text, image, or group context without bypassing the selection path.

### No-selection tools

The no-selection context registers:

- `widgetr_create_widget`, which uses the existing local project-creation callback and returns the new project ID, name, and revision;
- `widgetr_set_design_scope`, which sends `set-design-scope`;
- `widgetr_change_overall_style`, limited in Phase 4 to supported layout background changes through `set-layout-background`.

Approved-style application, a private style library, and style variations are not exposed before their later phases have real backing state. The catalog must never register a tool that only claims to work.

### Text tools

For a selected text or date element, register:

- `widgetr_change_text_content`, mapped to `update-element-content` with a bounded literal, binding, or repeat-item value source;
- `widgetr_change_typography`, mapped to `update-text-style`;
- `widgetr_resize_element`, mapped to `update-element-style` width and height;
- `widgetr_align_element`, mapped to the appropriate element or text alignment fields;
- `widgetr_restyle_element`, mapped to the supported opacity, padding, radius, border, and background fields.

The schemas expose only fields meaningful to each action. They do not accept arbitrary patches or unknown keys.

### Image tools

For a selected image element, register:

- `widgetr_resize_image`, mapped to `update-element-style` width and height;
- `widgetr_crop_image`, mapped to `update-element-content` crop coordinates;
- `widgetr_move_image`, mapped to the existing crop-position representation;
- `widgetr_change_image_treatment`, mapped to image fit and supported element treatment fields;
- `widgetr_replace_image`, mapped to `update-element-content` source after user confirmation.

`widgetr_replace_image` will request confirmation before constructing or committing the operation. If the user cancels, the result reports `confirmed: false` and the project revision does not change.

### Group tools

For a selected group or repeat element, register:

- `widgetr_change_group_spacing`, mapped to `update-element-content` spacing;
- `widgetr_align_group`, mapped to horizontal and vertical alignment;
- `widgetr_set_group_direction`, mapped to direction;
- `widgetr_set_group_distribution`, mapped to distribution;
- `widgetr_reorder_group`, mapped to the new canonical child-order operation.

## Canonical operation addition

The current operation union does not support child ordering. Add a `reorder-children` operation with:

- `elementId` for the parent group or repeat;
- `childId` for the child being moved;
- `toIndex` as a bounded non-negative integer;
- optional `scope` with the same rules as other layout changes;
- required `expectedRevision`.

The operation implementation will:

1. resolve each scoped layout;
2. find the parent by `elementId`;
3. reject a non-group or non-repeat target;
4. reject a missing child or an index outside the child list;
5. remove and insert the child without cloning unrelated state;
6. validate the complete resulting project;
7. return changed sizes and warnings through the existing operation result shape.

The operation will have focused schema and behavior tests. The browser renderer and Scriptable generator already consume the child arrays, so they will inherit the same ordering.

Project creation is a lifecycle action rather than an edit to an existing project. It will use the existing `createProject()` repository path. Once created, all widget state edits use `applyWidgetOperation()`.

## Result and error contract

Every tool returns a JSON string, because the current imperative WebMCP API returns a stringified result. The adapter will normalize results into small objects.

Mutation results contain:

```json
{
  "ok": true,
  "revision": 18,
  "changedSizes": ["small", "medium"],
  "warnings": [],
  "selection": { "size": "small", "elementId": "headline" },
  "message": "Updated headline typography in small and medium."
}
```

Failure results preserve the existing operation code, message, warnings, current revision, and current selection. They never return the rejected candidate state.

The adapter will return explicit error objects for:

- unsupported WebMCP browser API;
- malformed tool input;
- stale revision;
- missing or mismatched selected element;
- required confirmation not granted;
- export blocked by preflight diagnostics;
- output truncation.

Tool input limits will include bounded strings, finite numeric ranges, fixed enum values, small color arrays, and a maximum serialized input size. Tool output will have one fixed serialized-size ceiling. The truncation path will retain status, revision, diagnostics, and a recovery message.

## Confirmation flow

The page will own a pending confirmation ref and a resolver. A destructive tool will:

1. validate its input and current revision;
2. ask the page to display a confirmation modal naming the selected element and requested replacement;
3. listen for the WebMCP execution abort signal;
4. wait for the user’s confirm or cancel action;
5. commit only after confirmation;
6. resolve with the normalized operation result.

The modal will not display arbitrary imported code or unbounded agent text. The confirmation request will show the action, target, and affected sizes using fixed UI copy and bounded values.

## Security and privacy

- Do not expose `data.value`, secrets, headers, query parameters, raw bindings, or IndexedDB records through tools.
- Do not put imported Scriptable code or API responses into tool descriptions.
- Treat every tool argument as untrusted data. Operation schemas remain the final validator.
- Keep `exposedTo` unset so tools remain same-origin unless a later phase explicitly defines cross-origin exposure.
- Mark tools that handle user-provided content with the appropriate untrusted-content annotation when the browser type supports it.
- Do not persist WebMCP execution logs beyond the existing in-memory result display.

## Testing

Add focused tests for:

- context classification and the tool matrix for no selection, text, image, group, repeat, and stale selection;
- required revision and scope fields in mutation schemas;
- operation construction for each supported action;
- `reorder-children` validation, scope handling, changed-size reporting, and stale revision behavior;
- bounded input and output serialization;
- export readiness and blocked diagnostics;
- replacement confirmation, cancellation, and abort handling;
- dynamic registration teardown and context changes using a fake `ModelContext`;
- a manual revision change between tool discovery and execution preserving the manual edit.

The repository’s existing `npm test` and `npm run typecheck` commands remain the verification commands, but both require explicit authorization under `AGENTS.md` before they are run.

## Browser checkpoint

After implementation, run one local Nuxt server on port 3100 and use the in-app Browser. Verify at 1280 × 900 and 390 × 844:

- the Agent tools panel reports the browser WebMCP status;
- the tool list changes after selecting text, image, and group elements;
- a manual edit changes the displayed revision;
- a stale agent operation returns a failure and does not overwrite the manual edit;
- a confirmed image replacement changes the same preview and revision as a manual edit;
- export uses the same preflight and generated source as the UI;
- there are no console errors or unintended horizontal overflow.

If the local browser does not expose WebMCP, use a test-only `ModelContext` stub for local interaction checks and report that the real external-agent checkpoint still requires a WebMCP-enabled deployed browser. Do not claim deployment or challenge support from a local stub.

## Phase boundary and completion evidence

Phase 4 is complete only when the adapter, contextual registration, revision-aware execution, scope handling, confirmation flow, output limits, tests, and local browser checkpoint are complete. A deployed external-agent run must separately show widget creation, selection-context changes, a shared manual and agent edit, and export through the existing generator.

Real Scriptable execution on small, medium, and large widget families remains an independent evidence item and must not be reported as proven by this phase.
