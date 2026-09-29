import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function esc(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const toolkit = String(
    url.searchParams.get('toolkit') ||
    url.searchParams.get('toolkit_slug') ||
    ''
  ).toLowerCase();
  const accountId = String(
    url.searchParams.get('connected_account_id') ||
    url.searchParams.get('connectedAccountId') ||
    ''
  );
  const error = String(
    url.searchParams.get('error_description') ||
    url.searchParams.get('error') ||
    ''
  );
  const status = String(url.searchParams.get('status') || '').toLowerCase();
  const failed = Boolean(error) || status === 'failed' || status === 'error';

  const payload = {
    type: 'sameer-composio-connector-connected',
    status: failed ? 'failed' : 'success',
    toolkit,
    connectedAccountId: accountId || undefined,
    error: failed ? error || 'Connector authentication did not complete.' : undefined,
  };

  const payloadJson = JSON.stringify(payload).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><head><meta charset="utf-8"><title>' +
    (failed ? 'Connection failed' : 'Connector connected') +
    '</title></head><body style="font-family:system-ui,-apple-system,sans-serif;background:#181714;color:#f2eee6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
    '<div style="text-align:center;padding:32px;max-width:620px">' +
    '<div style="font-size:38px;margin-bottom:14px">' + (failed ? '!' : '✓') + '</div>' +
    '<h2 style="margin:0 0 10px;font-size:21px">' + esc(failed ? 'Connection failed' : 'Connector connected') + '</h2>' +
    '<p style="color:#aaa49a;line-height:1.6;font-size:14px">' +
    esc(failed ? (error || 'The provider did not complete authentication.') : ('Your ' + (toolkit || 'connector') + ' connection is ready.')) +
    '</p></div><script>' +
    '(function(){var message=' + payloadJson + ';try{if(window.opener)window.opener.postMessage(message,window.location.origin);}catch(e){}' +
    'setTimeout(function(){try{window.close();}catch(e){}},500);})();' +
    '</script></body></html>';

  return new NextResponse(html, {
    status: failed ? 400 : 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
