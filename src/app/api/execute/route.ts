import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { code, language = 'python', command, cwd } = body;

    const workingDir = cwd || process.env.USER_WORKSPACE || 'C:\\Users\\Master\\sameer workspace';

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
