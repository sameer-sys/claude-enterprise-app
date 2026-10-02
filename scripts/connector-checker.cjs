#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const route = read('src/app/api/chat/route.ts');
const composio = read('src/lib/composioMcp.ts');
const native = read('src/lib/nativeConnectors.ts');
const mcpRoute = read('src/app/api/mcp/route.ts');
const oauthCallback = read('src/app/api/mcp/oauth/callback/route.ts');

const checks = [
  [
    'Composio MANAGE_CONNECTIONS normalizes toolkit actions',
    composio.includes("if (/MANAGE_CONNECTIONS/i.test(toolName))") &&
    composio.includes('const normalizedToolkits = rawToolkits.map') &&
    composio.includes('delete callArgs.action;'),
  ],
  [
    'Chat route deterministically formats connected-account results',
    /if \(connectorRequest && isAccountQuery && mcpModeActive\)[\s\S]*formatConnectorResult\(lastText, liveResult\)/.test(route),
  ],
  [
    'Chat route stops raw MANAGE_CONNECTIONS JSON from reaching the UI',
    /if \(isAccountQuery && \/MANAGE_CONNECTIONS\/i\.test\(String\(toolName \|\| ''\)\)\)[\s\S]*formatConnectorResult\(lastText, result\)/.test(route),
  ],
  [
    'Chat route contains the built-in dispatcher definition when referenced',
    route.includes('const builtInToMcpAction: Record<string, string>') &&
    route.includes('if (builtInToMcpAction[name])') &&
    !route.includes('Boolean(builtInToMcpAction[name])'),
  ],
  [
    'Composio MULTI_EXECUTE payloads use tool_slug (not name)',
    route.includes('tools: [{ tool_slug: mcpAction, arguments: args || {} }]') &&
    route.includes('tools: [{ tool_slug: name, arguments: args || {} }]') &&
    !/tools:\s*\[\s*\{\s*name:\s*(?:mcpAction|name|args\.action)/.test(route),
  ],
  [
    'Native connector OAuth callback uses the forwarded public origin',
    /x-forwarded-host/.test(mcpRoute) && /x-forwarded-proto/.test(mcpRoute),
  ],
  [
    'OAuth callback exchanges the authorization code for a real access token',
    /grant_type:\s*'authorization_code'/.test(oauthCallback) && /data\?\.access_token/.test(oauthCallback),
  ],
  [
    'Native connector directory contains the expected core MCP providers',
    /api\.githubcopilot\.com\/mcp/.test(native) &&
    /gmailmcp\.googleapis\.com\/mcp/.test(native) &&
    /drivemcp\.googleapis\.com\/mcp/.test(native) &&
    /calendarmcp\.googleapis\.com\/mcp/.test(native),
  ],
  [
    'No invalid 0.0.0.0 OAuth callback is hardcoded',
    ![route, composio, native, mcpRoute, oauthCallback].some((s) => s.includes('0.0.0.0:3000/api/')),
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
