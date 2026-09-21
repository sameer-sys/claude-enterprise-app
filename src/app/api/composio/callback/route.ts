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
  const sessionUri = String(url.searchParams.get('session_uri') || '');
  const callbackAccountId = String(url.searchParams.get('connected_account_id') || '');
  const callbackUserId = String(url.searchParams.get('user_id') || '');
  const statusParam = String(url.searchParams.get('status') || '').toLowerCase();
  const errorText = String(
    url.searchParams.get('error') ||
    url.searchParams.get('error_description') ||
    ''
  );

  let success = statusParam === 'success' || Boolean(callbackAccountId);
  let connectedAccountId = callbackAccountId;
  let toolkitSlug = '';
  let detail = success
    ? 'Composio returned from the provider authorization flow.'
    : (errorText || 'The authorization flow was cancelled or did not complete.');

  // When Composio callback identity verification is enabled, the callback
  // contains only a single-use session_uri. The app-user identity was stored
  // in an HttpOnly cookie when the Connect Link was created, then redeemed here.
  if (sessionUri) {
    const apiKey = process.env.COMPOSIO_API_KEY || '';
    const cookieUserId = req.cookies.get('sameer_composio_user_id')?.value || '';
    const userId = cookieUserId || callbackUserId;

    if (!apiKey || !userId) {
      success = false;
      detail = 'The connection returned for identity verification, but the Composio project key or app user identity is missing on the server.';
    } else {
      try {
        const completeRes = await fetch(
          'https://backend.composio.dev/api/v3.1/connected_accounts/complete_auth',
          {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_uri: sessionUri,
              user_id: userId,
            }),
            cache: 'no-store',
          }
        );

        const completeData = await completeRes.json().catch(() => ({}));
        if (completeRes.ok && completeData?.connected_account_id) {
          success = true;
          connectedAccountId = String(completeData.connected_account_id);
          toolkitSlug = String(completeData.toolkit_slug || '');
          detail = toolkitSlug
            ? toolkitSlug + ' is now ACTIVE for this app user.'
            : 'The Composio connection is now ACTIVE for this app user.';
        } else {
          success = false;
          detail =
            completeData?.error?.message ||
            completeData?.message ||
            'Composio could not complete the authenticated connection for this app user.';
        }
      } catch (error: any) {
        success = false;
        detail = error?.message || 'Composio callback verification failed.';
      }
    }
  }

  const message = JSON.stringify({
    type: 'sameer-composio-connected',
    status: success ? 'success' : 'failed',
    connectedAccountId,
    toolkit: toolkitSlug,
  });

  const origin = JSON.stringify(url.origin);
  const home = JSON.stringify(new URL('/', url.origin).toString());
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><title>' +
    escapeHtml(success ? 'Composio connection complete' : 'Composio connection not completed') +
    '</title></head>' +
    '<body style="font-family:system-ui,-apple-system,sans-serif;background:#181714;color:#f2eee6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
    '<div style="text-align:center;padding:32px;max-width:560px">' +
    '<h2 style="margin:0 0 12px">' +
    escapeHtml(success ? 'Composio connection complete' : 'Composio connection not completed') +
    '</h2>' +
    '<p style="color:#aaa49a;line-height:1.6">' + escapeHtml(detail) + '</p>' +
    (connectedAccountId
      ? '<p style="font:12px ui-monospace;color:#777268">Account: ' + escapeHtml(connectedAccountId) + '</p>'
      : '') +
    '</div>' +
    '<script>' +
    '(function(){var message=' + message + ';try{if(window.opener){window.opener.postMessage(message,' + origin + ');}}catch(e){}' +
    'setTimeout(function(){try{window.close();}catch(e){}setTimeout(function(){if(!window.opener||!window.closed){window.location.replace(' + home + ');}},250);},500);})();' +
    '</script></body></html>';

  const response = new NextResponse(html, {
    status: success ? 200 : 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

  return response;
}
