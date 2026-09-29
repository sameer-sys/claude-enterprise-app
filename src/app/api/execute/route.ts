import { NextRequest, NextResponse } from 'next/server';
import { executeCodeInSandbox } from '@/lib/codeSandbox';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Unified code-execution endpoint used by Web, Desktop, and Mobile clients.
 * Code is never executed inside the Next.js/Vercel function itself; it is
 * forwarded to an isolated Vercel Sandbox microVM.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = typeof body?.code === 'string' ? body.code : '';
    const language = typeof body?.language === 'string' ? body.language : 'python';
    const timeoutMs = Number(body?.timeoutMs || body?.timeout_ms || 15000);

    if (!code.trim()) {
      return NextResponse.json(
        { success: false, stdout: '', stderr: 'No code supplied.', exitCode: 1, executionTimeMs: 0 },
        { status: 400 }
      );
    }

    const executionStart = Date.now();
    const resultText = await executeCodeInSandbox({
      language,
      code,
      timeoutMs,
      requestOidcToken: req.headers.get('x-vercel-oidc-token') || undefined,
    });

    const unavailable = resultText.startsWith('CODE_EXECUTION_UNAVAILABLE:');
    const failed = resultText.startsWith('CODE_EXECUTION_ERROR:');

    const stdoutMatch = resultText.match(/stdout:\n([\s\S]*?)(?:\n\nstderr:\n|\n\nexit_code:|$)/);
    const stderrMatch = resultText.match(/stderr:\n([\s\S]*?)(?:\n\nexit_code:|$)/);
    const exitMatch = resultText.match(/exit_code:\s*(-?\d+)/);

    const stdout = stdoutMatch?.[1] || '';
    const stderr = stderrMatch?.[1] || (failed || unavailable ? resultText : '');
    const exitCode = exitMatch ? Number(exitMatch[1]) : (failed || unavailable ? 1 : 0);

    return NextResponse.json(
      {
        success: !failed && !unavailable && exitCode === 0,
        stdout,
        stderr,
        exitCode,
        executionTimeMs: Date.now() - executionStart,
        result: resultText,
      },
      { status: unavailable ? 503 : failed ? 500 : 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        stdout: '',
        stderr: error?.message || 'Execution failed.',
        exitCode: 1,
        executionTimeMs: 0,
      },
      { status: 500 }
    );
  }
}
