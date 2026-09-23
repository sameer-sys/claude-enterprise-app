import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_WORKSPACE = process.env.USER_WORKSPACE || path.join(process.cwd(), '.workspace');

// SECURITY: this endpoint reads, writes, and deletes files. It was
// previously reachable by anyone on the internet with no auth check at all.
// It now requires a matching x-api-key header, checked against a secret
// stored ONLY in the INTERNAL_API_SECRET environment variable.
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false; // fail closed if not configured
  const provided = req.headers.get('x-api-key');
  return provided === secret;
}

function getSafePath(relativePath: string, baseDir: string = DEFAULT_WORKSPACE): string {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, relativePath || '');
  const rel = path.relative(base, resolved);
  if (rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel))) {
    return resolved;
  }
  throw new Error('Path escapes the configured workspace directory.');
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';
    const targetPath = searchParams.get('path') || '';
    const workspaceDir = searchParams.get('workspace') || DEFAULT_WORKSPACE;

    if (!fs.existsSync(workspaceDir)) {
      try {
        fs.mkdirSync(workspaceDir, { recursive: true });
      } catch (e) {}
    }

    if (action === 'list') {
      const fullPath = getSafePath(targetPath, workspaceDir);
      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: 'Directory not found', path: fullPath }, { status: 404 });
      }

      const entries = fs.readdirSync(fullPath, { withFileTypes: true });
      const items = entries.map((entry) => {
        const itemPath = path.join(fullPath, entry.name);
        const rel = path.relative(workspaceDir, itemPath);
        let size = 0;
        let mtime = null;
        try {
          const stat = fs.statSync(itemPath);
          size = stat.size;
          mtime = stat.mtime;
        } catch (e) {}

        return {
          name: entry.name,
          relativePath: rel.replace(/\\/g, '/'),
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
          size,
          modifiedAt: mtime,
        };
      });

      return NextResponse.json({
        success: true,
        workspace: workspaceDir,
        currentPath: targetPath,
        items,
      });
    }

    if (action === 'read') {
      const fullPath = getSafePath(targetPath, workspaceDir);
      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: 'File not found', path: fullPath }, { status: 404 });
      }

      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        return NextResponse.json({ error: 'Target is a directory' }, { status: 400 });
      }

      if (stat.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (> 2MB)' }, { status: 400 });
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      return NextResponse.json({
        success: true,
        path: targetPath,
        content,
        size: stat.size,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, path: targetPath, content, workspace = DEFAULT_WORKSPACE } = body;

    if (!targetPath) {
      return NextResponse.json({ error: 'Target path is required' }, { status: 400 });
    }

    const fullPath = getSafePath(targetPath, workspace);

    if (action === 'write') {
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content || '', 'utf-8');
      return NextResponse.json({
        success: true,
        message: `File written successfully to ${fullPath}`,
        path: targetPath,
      });
    }

    if (action === 'delete') {
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      }
      return NextResponse.json({
        success: true,
        message: `Deleted ${fullPath}`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
