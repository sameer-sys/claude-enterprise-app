const assert = require('assert');

// 1. Algorithmic verification matching extractAllAccounts logic
function extractAllAccounts(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw) && raw.length > 0 && raw.every((b) => b && typeof b === 'object' && typeof b.text === 'string')) {
    const text = raw.map((b) => b.text).join('\n').trim();
    if (text.startsWith('{') || text.startsWith('[')) {
      try { raw = JSON.parse(text); } catch { return []; }
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.data && typeof raw.data === 'object') {
    const inner = raw.data;
    if (inner.results || inner.connections || inner.connected_accounts || inner.accounts || inner.items) {
      raw = inner;
    }
  }
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (Array.isArray(raw.connections)) {
    list = raw.connections;
  } else if (Array.isArray(raw.connected_accounts)) {
    list = raw.connected_accounts;
  } else if (Array.isArray(raw.accounts)) {
    list = raw.accounts;
  } else if (Array.isArray(raw.items)) {
    list = raw.items;
  } else if (raw.results && typeof raw.results === 'object' && !Array.isArray(raw.results)) {
    for (const [toolkit, entry] of Object.entries(raw.results)) {
      const accounts = Array.isArray(entry?.accounts) ? entry.accounts : [];
      for (const account of accounts) {
        list.push({ ...(account || {}), app_name: toolkit });
      }
    }
  }
  return list;
}

function normalizeConnectedAccounts(raw) {
  const list = extractAllAccounts(raw);
  return list.filter((account) => {
    const status = String(account?.status || 'ACTIVE').toUpperCase();
    return status === 'ACTIVE' || status === 'CONNECTED';
  });
}

async function runTests() {
  console.log('--- Step 1: Algorithmic Verification for 10-Account Stale Lockout ---');

  // Scenario A: User hit 10-account limit with 10 initializing connection IDs
  const tenStaleAccountsPayload = {
    results: {
      youtube: {
        accounts: [
          { id: 'youtube_pokey-lunt', status: 'INITIALIZING' },
          { id: 'youtube_stale-2', status: 'INITIALIZING' },
          { id: 'youtube_stale-3', status: 'PENDING' },
          { id: 'youtube_stale-4', status: 'FAILED' },
          { id: 'youtube_stale-5', status: 'INITIALIZING' },
          { id: 'youtube_stale-6', status: 'INITIALIZING' },
          { id: 'youtube_stale-7', status: 'INITIALIZING' },
          { id: 'youtube_stale-8', status: 'INITIALIZING' },
          { id: 'youtube_stale-9', status: 'INITIALIZING' },
          { id: 'youtube_stale-10', status: 'INITIALIZING' },
        ]
      }
    }
  };

  const allAccountsA = extractAllAccounts(tenStaleAccountsPayload);
  assert.strictEqual(allAccountsA.length, 10, 'Must extract all 10 accounts from raw payload');

  const activeAccountsA = normalizeConnectedAccounts(tenStaleAccountsPayload);
  assert.strictEqual(activeAccountsA.length, 0, 'Active accounts should be 0 because all 10 are initializing');

  const staleAccountsA = allAccountsA.filter((acc) => {
    const status = String(acc?.status || '').toUpperCase();
    return status === 'INITIALIZING' || status === 'INITIATING' || status === 'PENDING' || status === 'FAILED';
  });
  assert.strictEqual(staleAccountsA.length, 10, 'All 10 accounts must be flagged as stale');
  console.log('✔ Correctly detected 10/10 stuck accounts in initializing state');

  // Scenario B: Payload with MCP content block JSON wrapping
  const mcpWrappedPayload = [
    {
      type: 'text',
      text: JSON.stringify({
        connections: [
          { id: 'gmail_1', app_name: 'gmail', status: 'ACTIVE' },
          { id: 'gmail_stale_1', app_name: 'gmail', status: 'INITIALIZING' },
          { id: 'github_stale_1', app_name: 'github', status: 'PENDING' },
        ]
      })
    }
  ];

  const allAccountsB = extractAllAccounts(mcpWrappedPayload);
  assert.strictEqual(allAccountsB.length, 3, 'Must unwrap MCP content block and find 3 accounts');
  const activeB = normalizeConnectedAccounts(mcpWrappedPayload);
  assert.strictEqual(activeB.length, 1, 'Only 1 active account should be reported to user');
  assert.strictEqual(activeB[0].id, 'gmail_1');
  const staleB = allAccountsB.filter((acc) => {
    const status = String(acc?.status || '').toUpperCase();
    return status === 'INITIALIZING' || status === 'INITIATING' || status === 'PENDING' || status === 'FAILED';
  });
  assert.strictEqual(staleB.length, 2, '2 stale accounts should be identified for purging');
  console.log('✔ Correctly handled MCP content-block wrapper and separated active vs stale');

  console.log('\n--- Step 2: Live Server Endpoint Verification ---');

  // 1. Test live /api/composio POST with no auth token
  const noAuthRes = await fetch('http://localhost:3000/api/composio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'purge_stale' })
  });
  const noAuthData = await noAuthRes.json();
  console.log('1. POST /api/composio (unauthenticated):', noAuthData);
  assert.strictEqual(noAuthRes.status, 401, 'Should return 401 when unauthenticated');
  assert.strictEqual(noAuthData.error, 'Composio is not connected.');

  // 2. Test live /api/composio POST with dummy token
  const dummyRes = await fetch('http://localhost:3000/api/composio', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': 'composio_mcp_token=dummy_invalid_token'
    },
    body: JSON.stringify({ action: 'purge_stale' })
  });
  const dummyData = await dummyRes.json();
  console.log('2. POST /api/composio (dummy token):', dummyData);
  assert.ok(dummyData.errors || dummyData.error, 'Should return error/errors object gracefully');
  assert.strictEqual(dummyData.success, false, 'Should report success: false on invalid token');

  // 3. Test HTML page loads
  const homeRes = await fetch('http://localhost:3000/');
  console.log('3. GET / HTTP Status:', homeRes.status);
  assert.strictEqual(homeRes.status, 200, 'Home page should respond 200 OK');

  console.log('\n===========================================');
  console.log('🎉 ALL COMPOSIO CHECKS AND TESTS PASSED!');
  console.log('===========================================');
}

runTests().catch((err) => {
  console.error('Self-check test failed:', err);
  process.exit(1);
});
