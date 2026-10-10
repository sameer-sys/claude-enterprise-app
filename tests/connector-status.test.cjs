'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Run the actual route with mocked transport/auth boundaries; no live credentials.
function harness({ token, saved, tools = [], failure, rotated, envToken } = {}) {
  const probes = [];
  const writes = [];
  let envReads = 0;
  const response = { json: (body, init = {}) => ({ body, status: init.status || 200, headers: { append() {} } }) };
  const auth = {
    getStoredTokenFromRequest: () => token,
    getCredentialFromRequest: () => saved,
    setStoredTokenCookie: (res, id, url, value) => writes.push({ id, url, value }),
  };
  const transport = {
    getGitHubToken: () => { envReads++; return envToken; },
    listRemoteMcpTools: async (connector, options) => {
      probes.push({ connector, options });
      if (rotated) options.onCredentialsUpdated(rotated);
      if (failure) throw failure;
      return tools;
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/app/api/mcp/route.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, console, process, URL, URLSearchParams, AbortSignal, Buffer,
    require: (name) => {
      if (name === 'crypto') return require('node:crypto');
      if (name === 'next/server') return { NextResponse: response };
      if (name === '@/lib/remoteMcp') return transport;
      if (name === '@/lib/remoteMcpAuth') return auth;
      throw new Error('Unexpected dependency: ' + name);
    },
  });
  return {
    probes, writes, envReads: () => envReads,
    run: (connectors) => module.exports.POST({ json: async () => ({ action: 'status', connectors }) }),
  };
}

const connector = { id: 'custom', name: 'Example', url: 'https://example.com/mcp' };

test('missing credentials are not connected and do not trigger transport', async () => {
  const h = harness();
  const result = await h.run([connector]);
  assert.equal(result.body.success, true);
  assert.equal(result.body.connectors[0].connected, false);
  assert.equal(h.probes.length, 0);
});

test('malformed connector preserves its id and is not connected', async () => {
  const h = harness({ token: { accessToken: 'mock' } });
  const result = await h.run([{ id: 'invalid', name: 'Missing URL' }]);
  assert.equal(result.body.connectors[0].id, 'invalid');
  assert.equal(result.body.connectors[0].connected, false);
  assert.equal(h.probes.length, 0);
});

test('valid credentials require successful tool discovery', async () => {
  const h = harness({ token: { accessToken: 'mock' }, tools: [{ function: { name: 'read' } }] });
  const result = await h.run([connector]);
  assert.equal(h.probes.length, 1);
  assert.equal(result.body.connectors[0].connected, true);
  assert.equal(result.body.connectors[0].state, 'connected');
  assert.equal(result.body.connectors[0].toolCount, 1);
});

test('revoked token requires reauthentication instead of appearing connected', async () => {
  const h = harness({ token: { accessToken: 'revoked' }, failure: Object.assign(new Error('Rejected'), { status: 401 }) });
  const result = await h.run([connector]);
  assert.equal(result.body.connectors[0].connected, false);
  assert.equal(result.body.connectors[0].state, 'needs_auth');
});

test('expired token rejected by transport is not connected', async () => {
  const h = harness({ token: { accessToken: 'expired', expiresAt: 1 }, failure: Object.assign(new Error('Expired'), { status: 401 }) });
  const result = await h.run([connector]);
  assert.equal(h.probes.length, 1);
  assert.equal(result.body.connectors[0].connected, false);
});

test('transport refresh is persisted to the response', async () => {
  const rotated = { accessToken: 'fresh', refreshToken: 'rotated', expiresAt: Date.now() + 60000 };
  const h = harness({ token: { accessToken: 'expired', expiresAt: 1 }, rotated });
  const result = await h.run([connector]);
  assert.equal(result.body.connectors[0].connected, true);
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].value, rotated);
});

test('provider outage is isolated per connector and does not leak raw errors', async () => {
  const h = harness({ token: { accessToken: 'mock' }, failure: new Error('secret upstream detail') });
  const result = await h.run([connector, { ...connector, id: 'second' }]);
  assert.equal(result.status, 200);
  assert.equal(result.body.connectors.length, 2);
  assert.equal(result.body.connectors[0].connected, false);
  assert.equal(result.body.connectors[0].state, 'unreachable');
  assert.equal(JSON.stringify(result.body).includes('secret upstream detail'), false);
});

test('saved API token also requires discovery', async () => {
  const h = harness({ saved: { accessToken: 'mock' } });
  const result = await h.run([connector]);
  assert.equal(h.probes.length, 1);
  assert.equal(result.body.connectors[0].connected, true);
});

test('GitHub named custom endpoint never receives server GitHub credentials', async () => {
  const h = harness({ envToken: 'server-secret' });
  const result = await h.run([{ id: 'conn-github', name: 'GitHub', url: 'https://example.com/mcp' }]);
  assert.equal(result.body.connectors[0].connected, false);
  assert.equal(h.probes.length, 0);
  assert.equal(h.envReads(), 0);
});

test('official GitHub server credential fallback is verified rather than assumed', async () => {
  const h = harness({ envToken: 'mock-server-token', failure: Object.assign(new Error('Rejected'), { status: 401 }) });
  const result = await h.run([{ id: 'conn-github', name: 'GitHub', url: 'https://api.githubcopilot.com/mcp/' }]);
  assert.equal(h.probes.length, 1);
  assert.equal(result.body.connectors[0].connected, false);
});
