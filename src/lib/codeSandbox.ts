const VERCEL_API_BASE = 'https://api.vercel.com';

type CodeLanguage = 'python' | 'javascript' | 'typescript';

function decodeJwtClaims(token: string): { owner_id?: string; project_id?: string } {
  try {
    const payload = token.split('.')[1];
    if (!payload) return {};
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

function getSandboxAuth(requestOidcToken?: string): { token: string; teamId: string; projectId: string } | null {
  const token = String(requestOidcToken || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL_TOKEN || '').trim();
  if (!token) return null;

  const claims = decodeJwtClaims(token);
  const teamId = String(process.env.VERCEL_TEAM_ID || claims.owner_id || '').trim();
  const projectId = String(process.env.VERCEL_PROJECT_ID || claims.project_id || '').trim();
  if (!teamId || !projectId) return null;

  return { token, teamId, projectId };
}

function apiUrl(path: string, teamId: string, query?: Record<string, string>): string {
  const url = new URL(`${VERCEL_API_BASE}${path}`);
  url.searchParams.set('teamId', teamId);
  for (const [key, value] of Object.entries(query || {})) url.searchParams.set(key, value);
  return url.toString();
}

async function vercelRequest(
  path: string,
  auth: { token: string; teamId: string },
  init: RequestInit = {},
): Promise<Response> {
  return fetch(apiUrl(path, auth.teamId), {
    ...init,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: init.signal || AbortSignal.timeout(20000),
  });
}

function normalizeLanguage(raw: string): CodeLanguage | null {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'python' || value === 'py' || value === 'python3') return 'python';
  if (value === 'javascript' || value === 'js' || value === 'node' || value === 'nodejs') return 'javascript';
  if (value === 'typescript' || value === 'ts') return 'typescript';
  return null;
}

function runtimeFor(language: CodeLanguage): { image: string; command: string; args: string[] } {
  switch (language) {
    case 'python':
      return { image: 'vercel/sandbox/universal:latest', command: 'python', args: ['-c'] };
    case 'typescript':
      return {
        image: 'vercel/sandbox/universal:latest',
        command: 'node',
        args: ['--experimental-strip-types', '--input-type=module', '-e'],
      };
    default:
      return { image: 'vercel/sandbox/node:24', command: 'node', args: ['-e'] };
  }
}

async function parseCommandStream(response: Response): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const text = await response.text();
  let stdout = '';
  let stderr = '';
  let exitCode = -1;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const item = JSON.parse(trimmed);
      if (item?.stream === 'stdout') stdout += String(item.data || '');
      else if (item?.stream === 'stderr') stderr += String(item.data || '');
      else if (item?.stream === 'error') stderr += String(item.data?.message || item.data || '');
      else if (item?.command && item.command.exitCode != null) exitCode = Number(item.command.exitCode);
    } catch {
      // Ignore any non-JSON transport fragments.
    }
  }

  return { exitCode, stdout, stderr };
}

export async function executeCodeInSandbox(input: {
  language: string;
  code: string;
  timeoutMs?: number;
  requestOidcToken?: string;
}): Promise<string> {
  const auth = getSandboxAuth(input.requestOidcToken);
  if (!auth) {
    return 'CODE_EXECUTION_UNAVAILABLE: Vercel Sandbox authentication is not configured. Set VERCEL_OIDC_TOKEN, or VERCEL_TOKEN together with VERCEL_TEAM_ID and VERCEL_PROJECT_ID.';
  }

  const language = normalizeLanguage(input.language);
  if (!language) return 'CODE_EXECUTION_ERROR: Supported languages are Python, JavaScript, and TypeScript.';

  const code = String(input.code || '');
  if (!code.trim()) return 'CODE_EXECUTION_ERROR: No code was provided.';
  if (code.length > 20000) return 'CODE_EXECUTION_ERROR: Code is too large. The limit is 20,000 characters.';

  const timeoutMs = Math.max(1000, Math.min(Number(input.timeoutMs) || 15000, 30000));
  const runtime = runtimeFor(language);
  let sessionId = '';

  try {
    const createResponse = await vercelRequest('/v3/sandboxes', auth, {
      method: 'POST',
      body: JSON.stringify({
        projectId: auth.projectId,
        image: runtime.image,
        timeout: timeoutMs,
        resources: { vcpus: 1 },
        persistent: false,
        networkPolicy: { mode: 'custom', allowedDomains: [], allowedCIDRs: [], deniedCIDRs: [] },
      }),
    });

    const createBody = await createResponse.text();
    if (!createResponse.ok) {
      let message = createBody;
      try {
        const parsed = JSON.parse(createBody);
        message = parsed?.error?.message || parsed?.message || createBody;
      } catch {}
      return `CODE_EXECUTION_ERROR: Sandbox creation failed (HTTP ${createResponse.status}). ${String(message).slice(0, 1000)}`;
    }

    let created: any = {};
    try {
      created = JSON.parse(createBody);
    } catch {
      return 'CODE_EXECUTION_ERROR: Sandbox creation returned an invalid response.';
    }

    sessionId = String(created?.session?.id || created?.sandbox?.currentSessionId || '');
    if (!sessionId) return 'CODE_EXECUTION_ERROR: Sandbox session was not returned by Vercel.';

    const commandResponse = await vercelRequest(
      `/v2/sandboxes/sessions/${encodeURIComponent(sessionId)}/cmd`,
      auth,
      {
        method: 'POST',
        body: JSON.stringify({
          command: runtime.command,
          args: [...runtime.args, code],
          env: {},
          sudo: false,
          wait: true,
          logs: true,
          timeout: timeoutMs,
        }),
        signal: AbortSignal.timeout(timeoutMs + 10000),
      },
    );

    if (!commandResponse.ok) {
      const body = await commandResponse.text().catch(() => '');
      return `CODE_EXECUTION_ERROR: Sandbox command failed (HTTP ${commandResponse.status}). ${body.slice(0, 1000)}`;
    }

    const result = await parseCommandStream(commandResponse);
    const combinedOutput = [
      result.stdout ? `stdout:\n${result.stdout.slice(0, 10000)}` : '',
      result.stderr ? `stderr:\n${result.stderr.slice(0, 6000)}` : '',
      `exit_code: ${result.exitCode}`,
    ].filter(Boolean).join('\n\n');

    return `Code execution result (${language}):\n${combinedOutput}`;
  } catch (error: any) {
    return `CODE_EXECUTION_ERROR: ${error?.message || 'Sandbox execution failed.'}`;
  } finally {
    if (sessionId) {
      try {
        await vercelRequest(
          `/v2/sandboxes/sessions/${encodeURIComponent(sessionId)}/stop`,
          auth,
          { method: 'POST', signal: AbortSignal.timeout(5000) },
        );
      } catch {}
    }
  }
}
