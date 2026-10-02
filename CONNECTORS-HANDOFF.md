# Connectors Fix — Handoff

Repo: `sameer-sys/claude-enterprise-app` (branch `main`)
Live: https://claude-enterprise-app.vercel.app
Verified **2026-09-30** against a fresh local clone of the repo. Findings below are from reading
the live code and from live network probes, not from a changelog.

Scope: connector layer only. Do not touch model/provider selection, system prompts, or chat loop
policy beyond what is explicitly listed.

---

## 0. Read this first — the previous architecture doc contains two errors

If you were handed an earlier version of this document, **do not trust sections 1 and 3 of it.**
Two claims in it are wrong, and they will send you down the wrong path.

### Error 1 (most important): "The frontend uses the Composio status/execute API."

That is false. The Composio system is fully implemented and **completely unreachable from the UI.**

Evidence from the live clone:

```
grep -r "/api/composio" src/     ->  2 hits, BOTH inside src/lib/composioMcp.ts
                                     (they are just the callback URL string)
grep -c "composio" src/components/ConnectorsModal.tsx  ->  0
```

`src/app/api/composio/route.ts` implements `get_mcp_oauth_url`, `check_mcp_status`,
`disconnect_mcp`, and `execute_mcp`. **No frontend code ever calls any of them.** The only two
frontend mentions of Composio in the whole app are two comments in `src/app/page.tsx` and a
"Composio OAuth Active" label in `SettingsModal.tsx`.

Consequence: the entire Composio stack — 447 lines of `composioMcp.ts`, two API routes, PKCE,
token refresh, SSE parsing — is dead code. It is proven working (see §4, the owner's screen
recording shows it working in Claude Desktop against the same endpoint), and the app never calls it.

### Error 2: "`nativeConnectors.ts` points at real provider MCP endpoints."

Several do not exist. Live probe of every preset URL (POST with empty JSON body):

| Preset URL | Response | Reality |
|---|---|---|
| `https://api.githubcopilot.com/mcp/` | **401** | real, auth required |
| `https://mcp.slack.com/mcp` | **401** | real, auth required |
| `https://mcp.notion.com/mcp` | **401** | real, auth required |
| `https://mcp.linear.app/mcp` | **401** | real, auth required |
| `https://connect.composio.dev/mcp` | **401** | real, auth required |
| `https://gmailmcp.googleapis.com/mcp/v1` | **400** | **wrong path** |
| `https://drivemcp.googleapis.com/mcp/v1` | **400** | **wrong path** |
| `https://calendarmcp.googleapis.com/mcp/v1` | **400** | **wrong path** |

401 = endpoint is alive and wants OAuth. 400 = the path is wrong; it fails *before* any auth
dialog opens, so the user gets a dead Connect button with no explanation. The three Google
presets are 400. They are not "Google's official MCP endpoints" — Google does not serve MCP at
those hosts. This is the mechanical cause of the owner's symptom (see §1).

### Also wrong: "nativeConnectors presets are the same generic remote-MCP path (B)."

They *route* through system (B), yes. But because three of the URLs are dead, the generic path
cannot work for them. Calling them "convenience presets for the same working path" is only true
for the five that return 401.

---

## 1. The actual bug, stated plainly

The UI renders 11 preset connectors. Clicking Connect on any of them calls
`/api/mcp` with `action: 'oauth_start'`, which runs OAuth discovery against that connector's
`mcpUrl`.

- For the 5 live endpoints, discovery should find OAuth metadata and open a working auth dialog.
- For Gmail / Drive / Calendar, discovery hits a 400 and the flow dies before any login window.
- For Composio, which the owner has *proven works*, the UI never asks for it.

Every card in the UI is hardcoded to render the literal strings `Available` and `Disabled`.
Those are **not** derived from any probe or token state. They are static text in the JSX. So the
UI can never report a connector's real status, no matter what happens underneath. The owner sees
"Available / Disabled" for all 11 forever, whether or not a token exists in a cookie.

**Root cause in one line: the Connectors UI is wired exclusively to the generic remote-MCP path,
never to the Composio path, and the three Google presets point at URLs that do not exist.**

---

## 2. Architecture as it actually is

### System A — Composio "For You" (implemented, working, **orphaned**)
- One-click OAuth into the user's personal Composio account.
- Composio's hosted MCP (`https://connect.composio.dev/mcp`) exposes meta-tools
  (`COMPOSIO_MANAGE_CONNECTIONS`, `COMPOSIO_SEARCH_TOOLS`, `COMPOSIO_MULTI_EXECUTE_TOOL`) that
  proxy to whatever apps the user has linked in their Composio dashboard. So Composio alone can
  reach GitHub, Gmail, YouTube, Slack, etc. — via ONE integration and ONE OAuth.
- Files: `src/lib/composioMcp.ts`, `src/app/api/composio/route.ts`,
  `src/app/api/composio/callback/route.ts`.
- Tokens in HttpOnly cookies: `composio_mcp_token`, `composio_mcp_refresh_token`,
  plus non-secret `composio_mcp_connected` for the UI.
- `src/app/api/chat/route.ts` already reads these cookies and already merges Composio's tools into
  `effectiveTools`. **The chat backend supports Composio fully. Only the UI is missing.**

### System B — generic remote MCP (implemented, reachable, partially broken)
- Type a name + URL, works for any MCP server. Protocol negotiation (2026-07-28 + legacy
  fallback), OAuth discovery, dynamic client registration, PKCE, refresh.
- Files: `src/lib/remoteMcp.ts`, `src/lib/remoteMcpAuth.ts`, `src/app/api/mcp/route.ts`,
  `src/app/api/mcp/oauth/callback/route.ts`, `src/app/api/mcp/oauth/client-metadata/route.ts`.
- Per-connector tokens in cookies keyed by `sha256(connectorId|serverUrl)[:24]`
  (`connectorKey()` in `remoteMcpAuth.ts`).
- This is the only path `ConnectorsModal.tsx` currently uses.

### Merge point — `src/app/api/chat/route.ts`
1. If Composio token cookie present → `listMcpToolsCachedWithAuth()`, convert via `mcpToolsToOpenAI`.
2. For each **enabled** connector in the request body's `connectors` array with
   `config.connectionType === 'mcp'` → `listRemoteMcpTools()`, tools renamed
   `REMOTE_MCP_<connectorId>_<toolName>` to avoid collisions.
3. `effectiveTools = [...builtInTools, ...composioTools, ...remoteMcpTools]`.
4. Multi-turn loop, up to 24 turns / 200s when any MCP connector is active (else 8 / 120s).
   `forceConnectorTool` sets `tool_choice: 'required'` on turn 0 for connector-shaped requests.
5. `runAgentTool()` dispatches by name: `REMOTE_MCP_*` → `callRemoteMcpTool()`,
   otherwise → Composio `executeMcpTool()`.

**This part is correct and should not be rewritten.** The defect is upstream of it, in the UI.

---

## 3. The fix, in order

### Step 1 — Add a real status endpoint for generic connectors (small, unblocks honest UI)
The UI has no way to know a connector's state. Add `action: 'status'` to
`src/app/api/mcp/route.ts`, or a `GET` handler, returning per-connector truth:

```ts
// pseudocode — adapt to existing style
if (action === 'status') {
  const connector = connectorFromInput(body?.connector);
  const stored = getStoredTokenFromRequest(req, connector.id, connector.url);
  return NextResponse.json({
    success: true,
    hasToken: Boolean(stored?.accessToken),
    expiresAt: stored?.expiresAt ?? null,
    // 'connected' | 'needs_auth' | 'unreachable' | 'not_configured'
    state: stored?.accessToken ? 'connected' : 'not_configured',
  });
}
```

Stop rendering `Available`/`Disabled` as hardcoded strings. Map real state to the badge:
`connected` → green Connected; `not_configured` → grey Not connected; probe failure → red
Unreachable. **Do not show "Available" for an endpoint that was never probed.**

### Step 2 — Point the three Google presets at endpoints that exist
Either:
- (a) repoint them to Composio (recommended, see Step 3), or
- (b) find each vendor's real MCP URL and update `src/lib/nativeConnectors.ts`.

While doing this, add a build-time or dev-time check that probes each preset URL, so a dead
preset fails loudly instead of shipping. Suggested: extend the existing
`scripts/connector-checker.cjs` and its CI workflow (`.github/workflows/connector-check.yml`).

### Step 3 — Wire the UI to Composio (the highest-value change)
This is the missing link and it is what makes one-click Gmail/GitHub/YouTube work for every
user. In `ConnectorsModal.tsx`:

1. On modal open, `fetch('/api/composio')` → `{ configured, mcpConnected, connectedAccounts, tools }`.
2. If `!configured`, render a single prominent **"Connect Composio"** button in the modal header
   (not buried in a per-connector list). On click:
   `POST /api/composio { action: 'get_mcp_oauth_url' }` → returns `authUrl`.
3. Open `authUrl` in a popup. The existing callback route
   (`src/app/api/composio/callback/route.ts`) already does `window.opener.postMessage({ type:
   'sameer-composio-mcp-connected', status: 'success' | 'failed', ... })` and then closes.
   **Listen for that existing message type** — the backend contract is already built, the UI just
   isn't subscribed.
4. On `status === 'success'`, re-fetch `/api/composio` and show the connected app list from
   `connectedAccounts`.
5. Add a Disconnect button → `POST /api/composio { action: 'disconnect_mcp' }`, then re-fetch.

Keep system B ("Add custom", per-provider direct MCP) working exactly as it does. Composio is
additive — it is the low-friction path, direct MCP is the power-user path.

### Step 4 — Fix the OAuth `redirect_uri` mismatch (already diagnosed, needs deploying)
The owner's live error was:
`Be careful! The redirect_uri is not associated with this application.`

Cause: `publicOrigin()` in `src/app/api/mcp/route.ts` derived the callback origin from the
incoming request's `x-forwarded-host`. On Vercel that header varies by deployment (production vs
preview vs local), so client registration, the authorization request, and token exchange could
each compute a *different* `redirect_uri`. A GitHub OAuth App accepts exactly one, so any
mismatch is rejected — intermittently, which is why it recurred rather than failing once.

Fix already prepared (apply, then redeploy):
- `publicOrigin()` returns `process.env.APP_URL` when set; request headers only as a dev
  fallback; logs a warning in production when `APP_URL` is unset.
- Same pinning in `src/app/api/mcp/oauth/client-metadata/route.ts`.
- `.env.example` documents `APP_URL=https://claude-enterprise-app.vercel.app`.

**Then, manually, in the GitHub OAuth App settings:** set the Authorization callback URL to
exactly `https://claude-enterprise-app.vercel.app/api/mcp/oauth/callback` — one URL, no trailing
slash. And set `APP_URL` in the Vercel env vars. Both are required; the code change alone is
insufficient.

### Step 5 — Make "Create plugin" a real feature
Currently `src/app/api/plugins/create/route.ts` exists (~5.9KB) and `PluginCreatorModal.tsx`
exists, but the button is decorative — the Composio modal shows "Create plugin" and the owner's
video shows it never completing. Either implement it properly (POST → validate manifest →
persist → list → loadable in chat) or remove the button. Do not ship a button that no-ops.
A dead prominent button is worse than no button.

---

## 4. Verification requirements

The owner has a screen recording proving Composio's endpoint works end to end in Claude Desktop,
including the Google account chooser completing for `samesuf786@gmail.com`. That is the
reference behaviour. Replicate it in the app.

**Do not report anything as fixed without doing all of these against the live deployment:**

1. `curl -s -X POST https://claude-enterprise-app.vercel.app/api/composio` returns JSON with
   `configured` and `mcpConnected` (not a 404, not HTML).
2. Composio OAuth completes in a real browser: popup opens, Google login succeeds, callback sets
   cookies, `GET /api/composio` then returns `mcpConnected: true` with a non-empty
   `connectedAccounts`.
3. A real chat turn using a connected app performs a real action and reports success in plain
   language — e.g. "search my Gmail for X". Confirm the model actually called a Composio tool.
4. Two-step request completes **both** steps: e.g. "create a playlist called X, then add my
   favourite videos to it". Verify both actions occurred, not just the first.
5. Raw model `reasoning` never reaches the user as the reply. There were two earlier bugs where an
   empty `content` field fell back to streaming `reasoning` (e.g. "We must call
   COMPOSIO_SEARCH_TOOLS..."). Re-check both fallbacks, including under `mcpModeActive`.
6. No raw tool JSON is dumped to the user. A previous YouTube result leaked malformed JSON with
   broken markdown in thumbnail URLs. Summarise in prose or sanitise before streaming.
7. GitHub Actions build + deploy checks both green before claiming done.
8. Grep for stale project-key auth: `grep -rn "COMPOSIO_API_KEY" src/`. Any hit used for actual
   execution silently reintroduces the old broken single-action behaviour.

**Explicitly not a task:** do not add a CLI / local-command / stdio / terminal connector. A
previous changelog falsely claimed it existed. It does not exist in any file, and it is
architecturally impossible on Vercel serverless functions — there is no persistent process to run
`npx ...` in. If local MCP is genuinely wanted, it requires a different runtime (the user's own
machine, or a long-lived container), not a Vercel Function. Do not add fake UI for it.

---

## 5. Prompt to hand to the coding agent

```
Read this whole document before touching code. Note section 0: an earlier version of this
architecture doc made two factual errors (that the frontend calls the Composio API, and that all
nativeConnectors preset URLs are real endpoints). Do not trust that earlier doc; trust this one.

Repo: sameer-sys/claude-enterprise-app, branch main. Deployed at
https://claude-enterprise-app.vercel.app. Clone fresh and re-read the live files first —
`src/app/api/chat/route.ts` is ~82KB and `src/components/ConnectorsModal.tsx` ~34KB, both
edited by multiple agents, so any line numbers in this doc will drift.

Hard rule: connector layer only. Do not modify model/provider selection, system prompts, or the
chat loop's tool-choice policy except where explicitly listed.

The core defect, in one line: the Connectors UI talks only to the generic remote-MCP path
(/api/mcp) and never to the working Composio path (/api/composio), three Google preset URLs are
wrong (HTTP 400), and the UI renders "Available"/"Disabled" as hardcoded strings instead of real
state. The chat backend already supports Composio correctly — do not rewrite it.

Work in the order of section 3, one step at a time:
  1. real per-connector status endpoint
  2. fix or replace the three dead Google preset URLs, and add a probe so dead presets fail loudly
  3. wire the UI to Composio (subscribe to the postMessage type
     'sameer-composio-mcp-connected' that the existing callback route already sends)
  4. the APP_URL redirect_uri pinning, plus the manual GitHub OAuth App callback setting
  5. make "Create plugin" work, or delete the button — never leave a no-op button

For each change: smallest possible diff, then actually deploy and test against the live URL per
section 4. Report precisely what you tested and observed versus what you are assuming. Do not
claim a feature is fixed or deployed without having re-tested it live afterward. If something
cannot be verified, say so explicitly instead of guessing.
```
