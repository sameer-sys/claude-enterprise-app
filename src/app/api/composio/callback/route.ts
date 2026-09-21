import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = String(url.searchParams.get('status') || '').toLowerCase();
  const accountId = String(url.searchParams.get('connected_account_id') || '');
  const userId = String(url.searchParams.get('user_id') || '');
  const errorText = String(
    url.searchParams.get('error') ||
    url.searchParams.get('error_description') ||
    ''
  );

  const success = status === 'success';
  const title = success ? 'Composio connection complete' : 'Composio connection not completed';
  const detail = success
    ? 'The provider account was authorized through Composio. This window can close.'
    : (errorText || 'The connection flow was cancelled or failed. Start a fresh Connect flow from the workspace.');

  const message = JSON.stringify({
    type: 'sameer-composio-connected',
    status: success ? 'success' : 'failed',
    connectedAccountId: accountId,
    userId,
  });
  const origin = JSON.stringify(url.origin);
  const home = JSON.stringify(new URL('/', url.origin).toString());

  const html =
    '<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title></head>' +
    '<body style="font-family:system-ui,-apple-system,sans-serif;background:#181714;color:#f2eee6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
    '<div style="text-align:center;padding:32px;max-width:560px"><h2 style="margin:0 0 12px">' + escapeHtml(title) + '</h2>' +
    '<p style="color:#aaa49a;line-height:1.6">' + escapeHtml(detail) + '</p>' +
    (accountId ? '<p style="font:12px ui-monospace;color:#777268">Account: ' + escapeHtml(accountId) + '</p>' : '') +
    '</div>' +
    '<script>' +
    '(function(){var message=' + message + ';try{if(window.opener){window.opener.postMessage(message,' + origin + ');}}catch(e){}' +
    'setTimeout(function(){try{window.close();}catch(e){}setTimeout(function(){if(!window.opener||!window.closed){window.location.replace(' + home + ');}},250);},500);})();' +
    '</script></body></html>';

  return new NextResponse(html, {
    status: success ? 200 : 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
