'use client';

import React, { useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, X, Zap } from 'lucide-react';
import type { Connector } from '@/types/chat';

interface PluginCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallGitHubConnector?: () => void;
  onCreatedConnector?: (connector: Connector) => void;
}

type AuthMode = 'oauth' | 'api_token' | 'client_credentials' | 'none';

export default function PluginCreatorModal({ isOpen, onClose, onInstallGitHubConnector, onCreatedConnector }: PluginCreatorModalProps) {
  const [name, setName] = useState('My MCP Plugin');
  const [description, setDescription] = useState('Connect this workspace to a remote MCP service.');
  const [serverUrl, setServerUrl] = useState('');
  const [setupUrl, setSetupUrl] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('oauth');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [created, setCreated] = useState(false);

  const slug = useMemo(() => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'my-mcp-plugin', [name]);

  if (!isOpen) return null;

  const createPlugin = async () => {
    const url = serverUrl.trim();
    if (!name.trim() || !url) {
      setMessage('Plugin name and MCP server URL are required.');
      return;
    }
    try { new URL(url); } catch { setMessage('Enter a valid HTTP/HTTPS MCP server URL.'); return; }

    setCreating(true);
    setMessage('Creating plugin and registering the connector…');
    setCreated(false);
    try {
      const response = await fetch('/api/plugins/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, slug, serverUrl: url, setupUrl, authMode }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.archiveBase64) throw new Error(data?.error || 'Could not create the plugin package.');

      const connector: Connector = {
        id: 'plugin-' + slug + '-' + Date.now(),
        name: name.trim(),
        description: description.trim() || ('Remote MCP server at ' + url),
        icon: 'mcp',
        enabled: false,
        status: 'ready',
        category: 'Plugins',
        section: 'custom',
        isCustom: true,
        isVerified: false,
        provider: 'mcp',
        capabilities: ['Remote MCP', 'Tool Discovery', 'Tool Execution', authMode === 'oauth' ? 'OAuth' : authMode === 'api_token' ? 'API Token' : authMode === 'client_credentials' ? 'Client Credentials' : 'No Auth'],
        config: {
          connectionType: 'mcp',
          providerName: name.trim(),
          mcpUrl: url,
          toolAccess: 'auto',
          disabledTools: [],
          authMode,
          ...(setupUrl.trim() ? { credentialSetupUrl: setupUrl.trim() } : {}),
          ...(clientId.trim() ? { oauthClientId: clientId.trim() } : {}),
        },
        url,
      };

      // Save only the credential material needed by the connector. Secrets never enter localStorage.
      if (clientId.trim() || clientSecret || apiToken.trim()) {
        const save = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_credentials',
            connectorId: connector.id,
            serverUrl: url,
            clientId: clientId.trim(),
            clientSecret,
            apiToken: apiToken.trim(),
          }),
          signal: AbortSignal.timeout(10000),
        });
        const saveData = await save.json().catch(() => ({}));
        if (!save.ok || !saveData?.success) throw new Error(saveData?.error || 'Could not securely save connector credentials.');
      }

      let probeData: any = null;
      if (directMcpMode === 'directMcp') {
        connector.status = 'ready';
        connector.enabled = false;
        setMessage('direct MCP plugin created and added to Connectors. Sign in through direct MCP to activate it.');
      } else {
        const probe = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check', connector }),
          signal: AbortSignal.timeout(30000),
        });
        probeData = await probe.json().catch(() => ({}));

        connector.status = probeData?.success ? 'connected' : 'ready';
        connector.enabled = Boolean(probeData?.success);
        if (probeData?.success) {
          connector.config = { ...connector.config, discoveredToolCount: Number(probeData.toolCount || 0) };
          setMessage('Plugin created, added to Connectors, and verified with ' + Number(probeData.toolCount || 0) + ' tool(s).');
        } else if (probeData?.requiresAuth) {
          setMessage('Plugin created and added to Connectors. Authentication is still required — use Connect on the new connector.');
        } else {
          setMessage('Plugin created and added to Connectors. The server can be tested from its connector page.');
        }
      }

      const bytes = Uint8Array.from(atob(data.archiveBase64), (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/gzip' });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = data.filename || (slug + '.tar.gz');
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      setCreated(true);
      // Match the real ChatGPT-style app/plugin flow:
      // create/register the app first, then immediately start the provider's
      // real OAuth authorization. Never mark an OAuth connector connected
      // merely because it was created.
      onCreatedConnector?.(connector);

      if (authMode === 'oauth') {
        setMessage('Plugin added. Opening the provider sign-in page…');
        const authResponse = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'oauth_start', connector }),
          signal: AbortSignal.timeout(15000),
        });
        const authData = await authResponse.json().catch(() => ({}));
        if (!authResponse.ok || !authData?.authUrl) {
          throw new Error(authData?.error || 'The provider OAuth flow could not be started.');
        }
        const popup = window.open(authData.authUrl, 'plugin_provider_login', 'popup,width=620,height=780,resizable=yes,scrollbars=yes');
        if (!popup) window.open(authData.authUrl, '_blank');
      }
    } catch (error: any) {
      setMessage(String(error?.message || error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-[#38352d] bg-[#181714] text-[#ece9e2] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2b25] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#25231e] border border-[#3a372f] flex items-center justify-center"><Zap className="w-4 h-4 text-[#cc785c]" /></div>
            <div><h2 className="text-base font-bold">Plugin Creator</h2><p className="text-[11px] text-[#8f8a80]">Create it here and automatically add it to Connectors.</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#8f8a80] hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="p-3 rounded-xl border border-[#38352d] bg-[#141310] text-xs text-[#9f998d]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[#ece9e2]">Create a direct MCP connector</div>
                <div className="mt-1">The plugin is registered here, verified against its MCP server, and added directly to Connectors.</div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-[#38352d] bg-[#141310] text-xs text-[#9f998d]">
            Enter the provider's MCP URL. If it requires OAuth or an API key, this screen tells you exactly where to obtain it. Secrets are sent only to your app's server-side credential endpoint.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">Plugin name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full px-3 py-2 rounded-xl border border-[#38352d] bg-[#201e1a] font-normal focus:outline-none focus:border-[#cc785c]/60" /></label>
            <label className="text-xs font-semibold">Package id<input value={slug} readOnly className="mt-1.5 w-full px-3 py-2 rounded-xl border border-[#38352d] bg-[#171612] text-[#9b9589] font-mono font-normal" /></label>
          </div>

          <label className="block text-xs font-semibold">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1.5 w-full px-3 py-2 rounded-xl border border-[#38352d] bg-[#201e1a] font-normal resize-none focus:outline-none focus:border-[#cc785c]/60" /></label>

          <label className="block text-xs font-semibold">Remote MCP server URL<input required value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://example.com/mcp" className="mt-1.5 w-full px-3 py-2 rounded-xl border border-[#38352d] bg-[#201e1a] font-mono font-normal focus:outline-none focus:border-[#cc785c]/60" /></label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">Where to get credentials
              <div className="mt-1.5 flex gap-2">
                <input value={setupUrl} onChange={(e) => setSetupUrl(e.target.value)} placeholder="https://provider.com/developers" className="w-full px-3 py-2 rounded-xl border border-[#38352d] bg-[#201e1a] font-normal focus:outline-none" />
                {setupUrl.trim() && <a href={setupUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border border-[#38352d] text-[#cc785c] flex items-center"><ExternalLink className="w-4 h-4" /></a>}
              </div>
            </label>
            <label className="text-xs font-semibold">Authentication
              <select value={authMode} onChange={(e) => setAuthMode(e.target.value as AuthMode)} className="mt-1.5 w-full px-3 py-2 rounded-xl border border-[#38352d] bg-[#201e1a] font-normal focus:outline-none">
                <option value="oauth">OAuth</option>
                <option value="api_token">API token</option>
                <option value="client_credentials">Client ID + Secret</option>
                <option value="none">No authentication</option>
              </select>
            </label>
          </div>

          {setupUrl.trim() && <a href={setupUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#cc785c] hover:underline"><ExternalLink className="w-3.5 h-3.5" />Open provider credential page</a>}

          {authMode === 'oauth' && <div className="grid gap-3 sm:grid-cols-2 p-4 rounded-xl border border-[#38352d] bg-[#141310]">
            <label className="text-xs font-semibold">OAuth Client ID<input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID" className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[#38352d] bg-[#201e1a] font-normal" /></label>
            <label className="text-xs font-semibold">OAuth Client Secret<input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Client Secret" className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[#38352d] bg-[#201e1a] font-normal" /></label>
            <div className="sm:col-span-2 text-[10px] text-[#8f8a80]">If the provider supports automatic OAuth discovery, leave these blank and use Connect after creation. GitHub's remote MCP server requires the host application to provide OAuth credentials. citeturn0search2</div>
          </div>}

          {authMode === 'api_token' && <label className="block text-xs font-semibold p-4 rounded-xl border border-[#38352d] bg-[#141310]">API token<input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder="Paste token here" className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[#38352d] bg-[#201e1a] font-normal" /></label>}

          {authMode === 'client_credentials' && <div className="grid gap-3 sm:grid-cols-2 p-4 rounded-xl border border-[#38352d] bg-[#141310]">
            <label className="text-xs font-semibold">Client ID<input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID" className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[#38352d] bg-[#201e1a] font-normal" /></label>
            <label className="text-xs font-semibold">Client Secret<input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Client Secret" className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[#38352d] bg-[#201e1a] font-normal" /></label>
          </div>}

          {message && <div className="p-3 rounded-xl border border-[#38352d] bg-[#141310] text-xs text-[#ece9e2]">{message}</div>}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button onClick={onInstallGitHubConnector} type="button" className="px-3 py-2 rounded-xl border border-[#38352d] text-xs font-semibold hover:bg-[#25231e]">Open GitHub connector</button>
            <button onClick={createPlugin} disabled={creating || !name.trim() || !serverUrl.trim()} type="button" className="px-4 py-2 rounded-xl bg-[#cc785c] text-black text-xs font-bold disabled:opacity-50">
              {creating ? <><Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1" />Creating & connecting…</> : created ? <><Check className="w-3.5 h-3.5 inline mr-1" />Added to Connectors</> : <><Zap className="w-3.5 h-3.5 inline mr-1" />Create & Add</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
