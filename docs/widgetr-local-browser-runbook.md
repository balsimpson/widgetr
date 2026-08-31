# Widgetr local browser runbook

This runbook covers rendered UI checks in the Codex desktop environment. Complete the repository identity hard gate in [`AGENTS.md`](../AGENTS.md) before starting a server.

## Socket restriction

The default sandbox can read and edit the repository but may not allow Nuxt to bind a listening socket. A `listen EPERM`, bind timeout, or no listener on ports 3000 or 3100 when those ports are free means sandbox denial, not a port collision. Do not keep retrying different ports in the default sandbox.

## Runbook

1. Check whether the fixed test port is occupied:

   ```text
   lsof -nP -iTCP:3100 -sTCP:LISTEN
   ```

   If there is no listener, keep port 3100. If a listener exists, identify it before deciding whether it is an existing Widgetr server. Do not kill an unrelated process.

2. Start one Nuxt server from the repository root with the supported Node runtime and elevated sandbox permissions. The shell invocation must use `sandbox_permissions: "require_escalated"`, include a user-facing justification that Nuxt needs to bind `127.0.0.1:3100`, and retain the returned terminal session id:

   ```text
   PATH=/Users/balsimpson/.local/bin:/usr/bin:/bin npm run dev -- --host 127.0.0.1 --port 3100
   ```

   Use a TTY and a short initial wait so the command returns a live session id. Wait for Nuxt's `ready` output before opening the browser. Do not launch a second server because the first command was started in the default sandbox.

3. Use the in-app Browser skill for the rendered check. Navigate to `http://127.0.0.1:3100/`, wait for the page to settle, and inspect the visible result and browser console at the desktop viewport 1280 x 900. Keep responsive styles intact and inspect the relevant narrow-width rules in source; do not switch to a mobile viewport unless the user explicitly requests it. Verify:

   - The requested content and interaction are visibly present.
   - There are no page errors or console errors or warnings.
   - `document.documentElement.scrollWidth` and `document.documentElement.clientWidth` match when horizontal overflow is not intended.

   Reuse the same browser connection and tab during a task. If HMR is stale, reload the exact local URL or reopen the tab. Do not start another Nuxt process.

4. Stop the server through the retained terminal session by sending `Ctrl-C`. Do not use a broad `killall`, `pkill`, or an unverified PID. If the session has exited, verify the port is free with the same `lsof` command.

5. Report the local URL, viewport sizes, console result, overflow result, and whether the server was stopped. A local browser check proves only the local rendered app. It does not prove deployment, a public URL, WebMCP behavior, or real Scriptable or iPhone behavior.
