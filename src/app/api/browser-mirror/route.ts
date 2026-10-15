import { NextRequest, NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CDP_URL = 'http://127.0.0.1:9222';
const BROWSER_START_SCRIPT = path.join(os.homedir(), 'sameer workspace', 'browser', 'browser_start.mjs');

// Auto-launch the real persistent Chrome if not running
async function ensureBrowserRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) return true;
  } catch {}

  // Spawn browser_start.mjs
  try {
    const child = spawn('node', [BROWSER_START_SCRIPT], {
      cwd: path.dirname(BROWSER_START_SCRIPT),
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();
    // Wait up to 3 seconds for port 9222 to become available
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const res = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(800) });
        if (res.ok) return true;
      } catch {}
    }
  } catch (err) {
    console.error('Failed to auto-launch browser_start.mjs:', err);
  }
  return false;
}

export async function GET() {
  try {
    const isRunning = await ensureBrowserRunning();
    if (!isRunning) {
      return NextResponse.json({
        isRunning: false,
        error: 'Persistent Chrome is starting on port 9222...',
      });
    }

    const { chromium } = await import('playwright');
    const browser = await chromium.connectOverCDP(CDP_URL);
    const ctx = browser.contexts()[0];
    const pages = ctx?.pages() || [];
    const page = pages.find((p) => !p.url().startsWith('devtools://')) || pages[0];

    if (!page) {
      await browser.close();
      return NextResponse.json({ isRunning: true, url: 'about:blank', title: 'New Tab', screenshot: '' });
    }

    const url = page.url();
    const title = await page.title().catch(() => '');
    const shotBuffer = await page.screenshot({ type: 'jpeg', quality: 65 }).catch(() => null);
    const screenshot = shotBuffer ? `data:image/jpeg;base64,${shotBuffer.toString('base64')}` : '';

    await browser.close();

    return NextResponse.json({
      isRunning: true,
      url,
      title,
      screenshot,
      tabsCount: pages.length,
    });
  } catch (err: any) {
    return NextResponse.json({
      isRunning: false,
      error: err?.message || 'Failed to capture browser mirror',
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body?.action || '').trim();

    await ensureBrowserRunning();

    const { chromium } = await import('playwright');
    const browser = await chromium.connectOverCDP(CDP_URL);
    const ctx = browser.contexts()[0];
    const pages = ctx?.pages() || [];
    const page = pages.find((p) => !p.url().startsWith('devtools://')) || pages[0];

    if (!page) {
      await browser.close();
      return NextResponse.json({ success: false, error: 'No active browser page found.' });
    }

    let resultMsg = 'Action completed';

    switch (action) {
      case 'focus': {
        // Bring real Chrome window to front on Windows
        await page.bringToFront().catch(() => {});
        exec(`powershell -NoProfile -Command "$w = New-Object -ComObject WScript.Shell; $w.AppActivate('Chrome') -or $w.AppActivate('Chromium')"`);
        resultMsg = 'Chrome brought to front';
        break;
      }
      case 'navigate': {
        const targetUrl = String(body?.url || '').trim();
        if (targetUrl) {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          resultMsg = `Navigated to ${targetUrl}`;
        }
        break;
      }
      case 'back': {
        await page.goBack().catch(() => {});
        resultMsg = 'Went back';
        break;
      }
      case 'forward': {
        await page.goForward().catch(() => {});
        resultMsg = 'Went forward';
        break;
      }
      case 'reload': {
        await page.reload().catch(() => {});
        resultMsg = 'Reloaded page';
        break;
      }
      case 'click': {
        const x = Number(body?.x);
        const y = Number(body?.y);
        if (!isNaN(x) && !isNaN(y)) {
          await page.mouse.click(x, y).catch(() => {});
          resultMsg = `Clicked at (${x}, ${y})`;
        }
        break;
      }
      case 'type': {
        const text = String(body?.text || '');
        if (text) {
          await page.keyboard.type(text).catch(() => {});
          resultMsg = `Typed text`;
        }
        break;
      }
      default:
        resultMsg = `Unknown action: ${action}`;
    }

    const currentUrl = page.url();
    const title = await page.title().catch(() => '');
    const shotBuffer = await page.screenshot({ type: 'jpeg', quality: 65 }).catch(() => null);
    const screenshot = shotBuffer ? `data:image/jpeg;base64,${shotBuffer.toString('base64')}` : '';

    await browser.close();

    return NextResponse.json({
      success: true,
      message: resultMsg,
      url: currentUrl,
      title,
      screenshot,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Failed to execute browser action',
    }, { status: 500 });
  }
}
