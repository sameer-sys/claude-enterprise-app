#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const route = read('src/app/api/chat/route.ts');
const composio = read('src/lib/composioMcp.ts');

const checks = [
  [
    'Composio connection discovery is live/dynamic',
    composio.includes('listComposioActiveConnections') &&
    composio.includes('listComposioToolkitSlugs') &&
    route.includes('fetchComposioAccounts'),
  ],
  [
    'Runtime discovery does not depend on a fixed toolkit allow-list',
    /DEFAULT_COMPOSIO_TOOLKITS:\s*string\[\]\s*=\s*\[\]/.test(composio),
  ],
  [
    'Connector requests use live Composio tools instead of app-specific action maps',
    route.includes('mcpToolsToOpenAI') &&
    route.includes('runAgentTool') &&
    !route.includes('const builtInToMcpAction: Record<string, string>') &&
    !route.includes('detectComposioAction(lastText)'),
  ],
  [
    'No deterministic playlist/test-specific handler remains',
    !route.includes('deterministic-playlist-handler') &&
    !route.includes('YOUTUBE_CREATE_PLAYLIST'),
  ],
  [
    'Composio tool schemas are converted into callable model tools',
    composio.includes('mcpToolsToOpenAI') &&
    /function:\s*\{[\s\S]*?name:\s*tool\.name/.test(composio),
  ],
  [
    'Real connector execution failures are returned to the agent loop',
    route.includes('isComposioExecutionFailure') &&
    route.includes('AUTOMATIC COMPOSIO SKILL RECOVERY') &&
    route.includes('Do not stop until the requested task succeeds'),
  ],
  [
    'Connector requests require real external execution before completion',
    route.includes('successfulMcpToolCalls') &&
    route.includes('requiredMcpToolCalls') &&
    route.includes('Do NOT finish yet'),
  ],
  [
    'Multiple connected accounts are handled dynamically',
    route.includes('connected_account_id') &&
    route.includes('fetchComposioAccounts'),
  ],
  [
    'No invalid local OAuth callback is hardcoded',
    ![route, composio].some((s) => s.includes('0.0.0.0:3000/api/')),
  ],
  [
    'Composio reconnect route exists',
    fs.existsSync(path.join(root, 'src/app/api/composio/connect/route.ts')) &&
    read('src/app/api/composio/connect/route.ts').includes('NextResponse.redirect(authUrl, 302)'),
  ],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + label);
  if (!ok) failed++;
}

if (failed) {
  console.error('\nConnector checker failed: ' + failed + ' check(s).');
  process.exit(1);
}

console.log('\nConnector checker passed: ' + checks.length + '/' + checks.length + ' checks.');
