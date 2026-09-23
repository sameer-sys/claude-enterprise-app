import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// SECURITY: this endpoint runs arbitrary shell commands / code. It was
// previously reachable by anyone on the internet with no auth check at all.
// It now requires a matching x-api-key header, checked against a secret
// stored ONLY in the INTERNAL_API_SECRET environment variable, using a
// timing-safe comparison so the check can't be brute-forced by timing.
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false; // fail closed if not configured
  const provided = req.headers.get('x-api-key') || '';

  const secretBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);
  if (secretBuf.length !== providedBuf.length) return false;
  try {
    return crypto.timingSafeEqual(secretBuf, providedBuf);
  } catch {
    return false;
  }
}

// SECURITY: the working directory used to be taken directly from the
// request body with no validation, so a caller (or anyone who obtained
// the secret) could point command execution at any folder on disk. It is
// now locked to the configured workspace root: an optional relative
// sub-path may be requested, but it can never escape that root.
const WORKSPACE_ROOT =
  process.env.USER_WORKSPACE || path.join(process.cwd(), '.workspace');

function resolveWorkingDir(requestedSubPath: unknown): string {
  const root = path.resolve(WORKSPACE_ROOT);
  if (!requestedSubPath || typeof requestedSubPath !== 'string') {
    return root;
  }
  const resolved = path.resolve(root, requestedSubPath);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    // Attempted path traversal outside the workspace root — refuse it
    // and fall back to the root instead of silently executing elsewhere.
    return root;
  }
  return resolved;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  try {
    const body = await req.json();
    const { code, language = 'python', command, cwd } = body;

    const workingDir = resolveWorkingDir(cwd);

    // Ensure working directory exists
    if (!fs.existsSync(workingDir)) {
      try {
        fs.mkdirSync(workingDir, { recursive: true });
      } catch (e) {}
    }

    let cmdToRun = '';
    let tempFilePath: string | null = null;

    if (command && typeof command === 'string') {
      // Direct shell command
      cmdToRun = command;
    } else if (code && typeof code === 'string') {
      const tempDir = os.tmpdir();
      const randId = Math.random().toString(36).substring(2, 9);

      if (language === 'python' || language === 'py') {
        tempFilePath = path.join(tempDir, `interpreter_${randId}.py`);
        fs.writeFileSync(tempFilePath, code, 'utf-8');
        cmdToRun = `python "${tempFilePath}"`;
      } else if (language === 'javascript' || language === 'js' || language === 'node') {
        tempFilePath = path.join(tempDir, `interpreter_${randId}.js`);
        fs.writeFileSync(tempFilePath, code, 'utf-8');
        cmdToRun = `node "${tempFilePath}"`;
      } else if (language === 'powershell' || language === 'ps1') {
        tempFilePath = path.join(tempDir, `interpreter_${randId}.ps1`);
        fs.writeFileSync(tempFilePath, code, 'utf-8');
        cmdToRun = `powershell -ExecutionPolicy Bypass -File "${tempFilePath}"`;
      } else if (language === 'bash' || language === 'sh') {
        cmdToRun = code;
      } else {
        tempFilePath = path.join(tempDir, `interpreter_${randId}.py`);
        fs.writeFileSync(tempFilePath, code, 'utf-8');
        cmdToRun = `python "${tempFilePath}"`;
      }
    } else {
      return NextResponse.json(
        { error: 'Missing code or command to execute' },
        { status: 400 }
      );
    }

    // Execute with a 45-second timeout
    const { stdout, stderr } = await execAsync(cmdToRun, {
      cwd: workingDir,
      timeout: 45000,
      maxBuffer: 1024 * 1024 * 10, // 10 MB
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });

    // Cleanup temp file if created
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: 0,
      executionTimeMs: duration,
      cwd: workingDir,
      commandExecuted: cmdToRun,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || 'Execution error',
      exitCode: error.code || 1,
      executionTimeMs: duration,
      error: error.message,
    });
  }
}
