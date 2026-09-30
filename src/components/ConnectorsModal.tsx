'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, Copy, Globe, Loader2, LogIn, Plus, Search, Trash2, X, Zap } from 'lucide-react';
import { Connector, ConnectorConfig } from '@/types/chat';
import { cloneNativeConnectors } from '@/lib/nativeConnectors';
import PluginCreatorModal from '@/components/PluginCreatorModal';

export interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConnectors: Connector[];
  onToggleConnector: (id: string) => void;
  onUpdateConnectorConfig?: (id: string, config: ConnectorConfig) => void;
  onAddCustomConnector?: (connector: Connector) => void;
  onRemoveCustomConnector?: (connectorId: string) => void;
  onResetConnectors?: () => void;
  sessionTitle?: string;
  sessionId?: string;
}

export const DEFAULT_CONNECTORS: Connector[] = cloneNativeConnectors();

export function createDefaultConnectors(): Connector[] {
  return cloneNativeConnectors();
}

function isRemoteMcpConnector(connector: Connector): boolean {
  const type = String(connector?.config?.connectionType || connector?.provider || '').toLowerCase();
  const url = String(connector?.config?.mcpUrl || connector?.url || '');
  return type === 'mcp' && /^https?:\/\//i.test(url);
}

function sanitizeConnector(connector: Connector): Connector {
  const config: any = { ...(connector.config || {}) };
  delete config.authToken;
  delete config.apiKey;
  delete config.clientSecret;
  return { ...connector, config };
}

function mergeConnectorState(active: Connector[], persisted: Connector[]): Connector[] {
  const defaults = createDefaultConnectors();
  const byId = new Map<string, Connector>(defaults.map((connector) => [connector.id, connector]));
  for (const connector of [...persisted, ...active]) {
    if (!connector || typeof connector !== 'object' || !isRemoteMcpConnector(connector)) continue;
    const safe = sanitizeConnector({ ...connector, config: { ...(connector.config || {}), connectionType: 'mcp' } });
    const base = byId.get(connector.id);
    byId.set(connector.id, base
      ? { ...base, ...safe, config: { ...(base.config || {}), ...(safe.config || {}), connectionType: 'mcp' } }
      : safe);
  }
  return Array.from(byId.values());
}

export default function ConnectorsModal({
  isOpen, onClose, activeConnectors, onToggleConnector, onUpdateConnectorConfig, onAddCustomConnector, onRemoveCustomConnector,
}: ConnectorsModalProps) {
  const [view, setView] = useState<'list' | 'add' | 'detail'>('list');
  const [search, setSearch] = useState('');
  const [connectors, setConnectors] = useState<Connector[]>(createDefaultConnectors());
  const [selected, setSelected] = useState<Connector | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [customAuthMode, setCustomAuthMode] = useState<'oauth' | 'api_token' | 'none'>('oauth');
  const [authClientId, setAuthClientId] = useState('');
  const [authClientSecret, setAuthClientSecret] = useState('');
  const [authApiToken, setAuthApiToken] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tools, setTools] = useState<string[]>([]);
  const [pluginCreatorOpen, setPluginCreatorOpen] = useState(false);

  const currentMap = useMemo(() => new Map(activeConnectors.map((c) => [c.id, c])), [activeConnectors]);

  const persistCustom = (items: Connector[]) => {
    try {
      localStorage.setItem('claude_custom_connectors', JSON.stringify(items.filter((c) => c.isCustom === true).map(sanitizeConnector)));
    } catch {}
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('claude_custom_connectors');
      const persisted = raw ? JSON.parse(raw) : [];
      setConnectors(mergeConnectorState(Array.isArray(activeConnectors) ? activeConnectors : [], Array.isArray(persisted) ? persisted : []));
    } catch {
      setConnectors(mergeConnectorState(activeConnectors || [], []));
    }
  }, [activeConnectors]);

  useEffect(() => {
    if (!isOpen) return;
    const items = connectors.filter((c) => isRemoteMcpConnector(c));
    if (!items.length) return;
    let cancelled = false;
    fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', connectors: items }),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.connectors)) return;
        setConnectors((prev) => prev.map((c) => {
          const result = data.connectors.find((item: any) => item?.id === c.id);
          return result ? { ...c, status: result.connected ? 'connected' : c.status === 'connected' ? 'ready' : c.status } : c;
        }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, connectors.length]);

  useEffect(() => {
    if (!selected || !isOpen) { setTools([]); return; }
    let cancelled = false;
    fetch('/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check', connector: selected }) })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => { if (!cancelled && data?.success) setTools(Array.isArray(data.tools) ? data.tools.map((t: any) => String(t?.name || '')).filter(Boolean) : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selected?.id, isOpen]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'sameer-remote-mcp-connected') {
        const id = String(event.data?.connectorId || '');
        if (event.data?.status === 'success') {
          setConnectors((prev) => prev.map((c) => c.id === id ? { ...c, status: 'connected', enabled: true } : c));
          setSelected((prev) => prev?.id === id ? { ...prev, status: 'connected', enabled: true } : prev);
          const connectedConnector = connectors.find((c) => c.id === id);
          if (connectedConnector && !connectedConnector.enabled) onToggleConnector(id);
          setStatusMessage('Provider account connected. Loading its real tools…');
        } else setStatusMessage('OAuth Error: ' + String(event.data?.error || 'Authentication failed.'));
        setAuthenticating(false);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const openRemoteOAuth = async (connector: Connector) => {
    setAuthenticating(true); setStatusMessage("Opening the provider's secure sign-in…");
    try {
      const res = await fetch('/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'oauth_start', connector }), signal: AbortSignal.timeout(15000) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.authUrl) throw new Error(data?.error || 'This connector could not start OAuth.');
      const popup = window.open(data.authUrl, 'remote_mcp_login', 'popup,width=620,height=780,resizable=yes,scrollbars=yes');
      if (!popup) window.open(data.authUrl, '_blank');
    } catch (err: any) {
      setAuthenticating(false);
      setStatusMessage('OAuth Error: ' + String(err?.message || err));
      setSelected(connector);
      setAuthClientId(String(connector.config?.oauthClientId || ''));
      setAuthClientSecret('');
      setAuthApiToken('');
      setView('detail');
    }
  };

  const saveConnectorCredentials = async (connector: Connector) => {
    setSavingCredentials(true);
    setStatusMessage('Saving credentials securely…');
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_credentials',
          connectorId: connector.id,
          serverUrl: connector.url,
          clientId: authClientId.trim(),
          clientSecret: authClientSecret,
          apiToken: authApiToken.trim(),
        }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Could not save connector credentials.');

      const next = {
        ...connector,
        config: {
          ...(connector.config || {}),
          ...(authClientId.trim() ? { oauthClientId: authClientId.trim() } : {}),
        },
      };
      setSelected(next);
      setConnectors((prev) => prev.map((c) => c.id === connector.id ? next : c));
      setAuthClientSecret('');
      setAuthApiToken('');

      const probe = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', connector: next }),
        signal: AbortSignal.timeout(30000),
      });
      const probeData = await probe.json().catch(() => ({}));

      if (probeData?.success) {
        setConnectors((prev) => prev.map((c) => c.id === connector.id ? { ...c, status: 'connected', enabled: true } : c));
        setSelected((prev) => prev?.id === connector.id ? { ...prev, status: 'connected', enabled: true } : prev);
        if (!connector.enabled) onToggleConnector(connector.id);
        setTools(Array.isArray(probeData.tools) ? probeData.tools.map((t: any) => String(t?.name || '')).filter(Boolean) : []);
        setStatusMessage('Connected — discovered ' + Number(probeData.toolCount || 0) + ' tool' + (Number(probeData.toolCount || 0) === 1 ? '' : 's') + '.');
      } else if (probeData?.requiresAuth) {
        setStatusMessage("Credentials saved. Click Connect to open the provider's real sign-in page.");
      } else {
        setStatusMessage("Credentials saved. Click Connect to open the provider's real sign-in page.");
      }
    } catch (err: any) {
      setStatusMessage('Credential Error: ' + String(err?.message || err));
    } finally {
      setSavingCredentials(false);
    }
  };

  const startOAuthForConnector = async (connector: Connector) => {
    setAuthenticating(true);
    setStatusMessage("Opening the provider's secure sign-in…");
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'oauth_start', connector }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.authUrl) throw new Error(data?.error || 'This connector could not start OAuth.');
      const popup = window.open(data.authUrl, 'provider_login', 'popup,width=620,height=780,resizable=yes,scrollbars=yes');
      if (!popup) window.open(data.authUrl, '_blank');
    } catch (err: any) {
      setAuthenticating(false);
      setStatusMessage('OAuth Error: ' + String(err?.message || err));
      setSelected(connector);
      setAuthClientId(String(connector.config?.oauthClientId || ''));
      setAuthClientSecret('');
      setAuthApiToken('');
      setView('detail');
    }
  };

  const addCustomConnector = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = customName.trim(); const url = customUrl.trim();
    if (!name || !url) return;
    try { const parsed = new URL(url); if (!/^https?:$/.test(parsed.protocol)) throw new Error('Use a public HTTP/HTTPS MCP URL.'); } catch (err: any) { setStatusMessage(err?.message || 'Enter a valid MCP URL.'); return; }
    setLoading(true); setStatusMessage('Checking MCP server…');
    const connector: Connector = {
      id: 'mcp-' + Date.now(), name, description: 'Remote MCP server at ' + url, icon: 'mcp', enabled: true, status: 'ready', category: 'Integrations', section: 'custom', isCustom: true, isVerified: true, provider: 'mcp',
      capabilities: ['Remote MCP', 'Tool Discovery', 'Tool Execution', 'OAuth'],
      config: { connectionType: 'mcp', providerName: name, mcpUrl: url, toolAccess: 'auto', disabledTools: [], authMode: customAuthMode, ...(oauthClientId.trim() ? { oauthClientId: oauthClientId.trim() } : {}) }, url,
    };
    try {
      const save = await fetch('/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_credentials', connectorId: connector.id, serverUrl: url, clientId: oauthClientId.trim(), clientSecret: oauthClientSecret, apiToken: apiToken.trim() }) });
      if (!save.ok) throw new Error('Could not securely save connector credentials.');
      // Register the connector locally, but never call it "connected" before
      // provider authorization succeeds and the real MCP server accepts the token.
      connector.status = 'ready';
      connector.enabled = false;
      setConnectors((prev) => [connector, ...prev.filter((c) => c.id !== connector.id && c.name.toLowerCase() !== name.toLowerCase())]);
      persistCustom([connector, ...connectors]);
      onAddCustomConnector?.(connector);
      setSelected(connector);
      setView('detail');

      if (oauthClientId.trim() || apiToken.trim()) {
        const probe = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check', connector }),
          signal: AbortSignal.timeout(30000),
        });
        const data = await probe.json().catch(() => ({}));
        if (data?.success) {
          connector.status = 'connected';
          connector.enabled = true;
          setConnectors((prev) => prev.map((c) => c.id === connector.id ? connector : c));
          setSelected(connector);
          setStatusMessage('Connected — verified against the real MCP server.');
          if (!connector.enabled) onToggleConnector(connector.id);
        } else if (authMode !== 'oauth') {
          setStatusMessage(data?.requiresAuth ? 'Added. Authentication is required.' : 'Added. The server will be checked when used.');
        }
      } else if (customAuthMode === 'oauth') {
        await startOAuthForConnector(connector);
      } else {
        setStatusMessage(customAuthMode === 'none'
          ? 'Connector added. Verifying the unauthenticated MCP server…'
          : 'Connector added. Enter a bearer/API token in the connector page and save it to verify.');
      }
    } catch (err: any) { setStatusMessage(String(err?.message || err)); } finally { setLoading(false); }
  };

  const disconnectConnector = async (connector: Connector) => {
    await fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disconnect', connectorId: connector.id, serverUrl: connector.url }),
    }).catch(() => {});
    setConnectors((prev) => prev.map((item) =>
      item.id === connector.id ? { ...item, status: 'ready', enabled: false } : item
    ));
    setSelected((prev) => prev?.id === connector.id ? { ...prev, status: 'ready', enabled: false } : prev);
    if (connector.enabled) onToggleConnector(connector.id);
    if (connector.isCustom) persistCustom(connectors.map((item) =>
      item.id === connector.id ? { ...item, status: 'ready', enabled: false } : item
    ));
    setStatusMessage('Connector disconnected.');
  };

  const removeConnector = async (connector: Connector) => {
    if (!connector.isCustom) return;
    await fetch('/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'disconnect', connectorId: connector.id, serverUrl: connector.url }) }).catch(() => {});
    const next = connectors.filter((c) => c.id !== connector.id);
    setConnectors(next); persistCustom(next); onRemoveCustomConnector?.(connector.id); setSelected(null); setView('list');
  };

  const updateConfig = (config: ConnectorConfig) => {
    if (!selected) return;
    const next = { ...selected, config: { ...(selected.config || {}), ...config } };
    setSelected(next); setConnectors((prev) => prev.map((c) => c.id === selected.id ? next : c)); onUpdateConnectorConfig?.(selected.id, next.config || {});
    if (next.isCustom) persistCustom(connectors.map((c) => c.id === next.id ? next : c));
  };

  const selectConnector = (connector: Connector) => {
    const merged = { ...(currentMap.get(connector.id) || connector), ...connector };
    setSelected(merged);
    setAuthClientId(String(merged.config?.oauthClientId || ''));
    setAuthClientSecret('');
    setAuthApiToken('');
    setTools([]);
    setStatusMessage('');
    setView('detail');
  };

  const filtered = connectors.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || String(c.url || '').toLowerCase().includes(search.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl h-[650px] rounded-2xl border border-[#38352d] bg-[#181714] text-[#ece9e2] shadow-2xl flex flex-col overflow-hidden">
        {view === 'list' && <>
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div className="flex items-center gap-3"><h2 className="text-xl font-bold">Connectors</h2><span className="text-[10px] px-2 py-1 rounded-lg border border-[#3a372f] bg-[#211f1a] text-[#cc785c] font-mono">Native OAuth + Remote MCP</span></div>
            <div className="flex items-center gap-2"><div className="relative"><Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8a80]"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search connectors" className="w-44 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#38352d] bg-[#201e1a] text-[#ece9e2] focus:outline-none"/></div><button onClick={() => { setPluginCreatorOpen(true); setStatusMessage(''); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#cc785c] text-black"><Zap className="w-3.5 h-3.5"/>Create plugin</button><button onClick={() => { setCustomName(''); setCustomUrl(''); setOauthClientId(''); setOauthClientSecret(''); setApiToken(''); setShowAdvanced(false); setStatusMessage(''); setView('add'); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#38352d] bg-[#25231e]"><Plus className="w-3.5 h-3.5 text-[#cc785c]"/>Add custom</button><button onClick={onClose} className="p-1.5 rounded-lg text-[#8f8a80]"><X className="w-4 h-4"/></button></div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
            {filtered.map((connector) => {
              const connected = connector.status === 'connected';
              return <div key={connector.id} className="flex items-center justify-between p-3.5 rounded-xl border border-[#2d2b25] bg-[#1e1c18]">
                <button className="flex items-center gap-3 min-w-0 text-left" onClick={() => selectConnector(connector)}>
                  <div className="w-9 h-9 rounded-lg border border-[#38352d] bg-[#2a2722] flex items-center justify-center text-[#cc785c]"><Zap className="w-4 h-4"/></div>
                  <div className="min-w-0"><div className="flex items-center gap-2"><span className="font-semibold text-sm truncate">{connector.name}</span><span className={`text-[10px] px-2 py-0.5 rounded-full border ${connected ? 'border-emerald-800 text-emerald-400' : 'border-amber-800 text-amber-400'}`}>{connected ? 'Connected' : connector.isCustom ? 'Sign in needed' : 'Available'}</span></div><div className="text-xs text-[#8f8a80] truncate max-w-xl">{connector.url}</div></div>
                </button>
                <div className="flex items-center gap-2">
                  {!connected && <button onClick={() => openRemoteOAuth(connector)} disabled={authenticating} className="px-3 py-1.5 rounded-lg bg-[#cc785c] text-white text-xs font-semibold">{authenticating ? <><Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1"/>Connecting…</> : <><LogIn className="w-3.5 h-3.5 inline mr-1"/>Connect</>}</button>}
                  <button onClick={() => onToggleConnector(connector.id)} className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold ${connector.enabled ? 'border-emerald-800 text-emerald-400' : 'border-[#38352d] text-[#8f8a80]'}`}>{connector.enabled ? 'Enabled' : 'Disabled'}</button>
                </div>
              </div>;
            })}
          </div>
        </>}

        {view === 'add' && <form onSubmit={addCustomConnector} className="h-full flex flex-col">
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#2d2b25]"><div className="flex items-center gap-2"><button type="button" onClick={() => setView('list')} className="p-1.5 rounded-lg text-[#8f8a80]"><ChevronLeft className="w-4 h-4"/></button><h2 className="text-base font-bold">Add custom connector</h2></div><button type="button" onClick={onClose} className="p-1.5 text-[#8f8a80]"><X className="w-4 h-4"/></button></div>
          <div className="flex-1 overflow-y-auto px-8 py-5 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#141310] border border-[#282620]"><div className="flex items-center gap-2 font-semibold"><Globe className="w-4 h-4 text-[#cc785c]"/>Remote MCP server</div><p className="mt-1 text-[#8f8a80]">Add the connector name and public MCP URL. OAuth client settings are optional.</p></div>
            <div><label className="block font-semibold mb-1.5">Connector Name</label><input required value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. My MCP server" className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18]"/></div>
            <div><label className="block font-semibold mb-1.5">Server URL</label><input required type="url" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://example.com/mcp" className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18]"/><p className="mt-1 text-[11px] text-[#6d685f]">The remote MCP endpoint must be reachable over the public internet.</p></div>
            <div>
              <label className="block font-semibold mb-1.5">Authentication</label>
              <select value={customAuthMode} onChange={(e) => setCustomAuthMode(e.target.value as 'oauth' | 'api_token' | 'none')} className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18]">
                <option value="oauth">OAuth — open provider sign-in</option>
                <option value="api_token">Bearer / API token</option>
                <option value="none">No authentication</option>
              </select>
            </div>
            <div className="pt-2 border-t border-[#2d2b25]"><button type="button" onClick={() => setShowAdvanced((v) => !v)} className="flex items-center gap-2 font-semibold"><ChevronDown className={`w-3.5 h-3.5 ${showAdvanced ? 'rotate-180' : ''}`}/>Advanced settings</button>
              {showAdvanced && <div className="mt-3 space-y-3"><div><label className="block mb-1.5 font-semibold">OAuth Client ID</label><input value={oauthClientId} onChange={(e) => setOauthClientId(e.target.value)} className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18]"/></div><div><label className="block mb-1.5 font-semibold">OAuth Client Secret</label><input type="password" autoComplete="new-password" value={oauthClientSecret} onChange={(e) => setOauthClientSecret(e.target.value)} className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18]"/></div><div><label className="block mb-1.5 font-semibold">Bearer / API Token</label><input type="password" autoComplete="off" value={apiToken} onChange={(e) => setApiToken(e.target.value)} className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18]"/></div></div>}</div>
            {statusMessage && <div className="p-3 rounded-lg border border-[#4a4133] bg-[#231f18] text-[#cc785c]">{statusMessage}</div>}
          </div>
          <div className="flex justify-between px-8 py-4 border-t border-[#2d2b25]"><button type="button" onClick={() => setView('list')} className="px-4 py-2 rounded-xl border border-[#38352d]">Back</button><button type="submit" disabled={loading} className="px-5 py-2 rounded-xl bg-[#cc785c] text-white font-semibold flex items-center gap-2">{loading && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}Add connector</button></div>
        </form>}

        {view === 'detail' && selected && <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#2d2b25]"><button onClick={() => setView('list')} className="flex items-center gap-1.5 text-xs text-[#8f8a80]"><ChevronLeft className="w-4 h-4"/>Your connectors</button><button onClick={onClose} className="p-1.5 text-[#8f8a80]"><X className="w-4 h-4"/></button></div>
          <div className="flex-1 overflow-y-auto px-8 py-5 space-y-6">
            <div className="flex items-center justify-between gap-4"><div className="min-w-0"><h3 className="font-bold text-base flex items-center gap-2">{selected.name}</h3><div className="flex items-center gap-1 text-xs text-[#8f8a80] mt-1"><span className="truncate">{selected.url}</span><button onClick={() => { navigator.clipboard.writeText(selected.url || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="w-3 h-3 text-emerald-400"/> : <Copy className="w-3 h-3"/>}</button></div></div>
              <div className="flex items-center gap-2">{selected.status === 'connected' ? <button onClick={() => disconnectConnector(selected)} className="px-3.5 py-1.5 rounded-xl border border-[#38352d] text-xs">Disconnect</button> : <button onClick={() => openRemoteOAuth(selected)} disabled={authenticating} className="px-3.5 py-1.5 rounded-xl bg-[#cc785c] text-white text-xs font-semibold">{authenticating ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'Connect'}</button>}{selected.isCustom && <button onClick={() => removeConnector(selected)} className="px-3.5 py-1.5 rounded-xl border border-red-900/60 text-red-300 text-xs"><Trash2 className="w-3.5 h-3.5 inline mr-1"/>Remove</button>}</div>
            </div>
            <div className="pt-4 border-t border-[#2d2b25] space-y-4">
              <div className="rounded-xl border border-[#2d2b25] bg-[#141310] p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold">Authentication</h4>
                  <p className="text-[11px] text-[#6d685f] mt-1">
                    Credentials are kept in secure server-side cookies. They are not saved to browser local storage.
                  </p>
                </div>
                <div className="grid gap-3">
                  <div>
                    <label className="block mb-1.5 text-[11px] font-semibold">OAuth Client ID</label>
                    <input value={authClientId} onChange={(e) => setAuthClientId(e.target.value)} placeholder="Use the client ID from your provider OAuth app" className="w-full px-3 py-2 rounded-lg border border-[#38352d] bg-[#1e1c18] text-xs"/>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-[11px] font-semibold">OAuth Client Secret</label>
                    <input type="password" autoComplete="new-password" value={authClientSecret} onChange={(e) => setAuthClientSecret(e.target.value)} placeholder="Optional when using a bearer/API token" className="w-full px-3 py-2 rounded-lg border border-[#38352d] bg-[#1e1c18] text-xs"/>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-[11px] font-semibold">Bearer / API Token</label>
                    <input type="password" autoComplete="off" value={authApiToken} onChange={(e) => setAuthApiToken(e.target.value)} placeholder="Use a provider access token instead of OAuth" className="w-full px-3 py-2 rounded-lg border border-[#38352d] bg-[#1e1c18] text-xs"/>
                  </div>
                </div>
                <div className="text-[10px] text-[#6d685f]">
                  OAuth callback for this app: <span className="text-[#8f8a80] break-all">{typeof window !== 'undefined' ? window.location.origin + '/api/mcp/oauth/callback' : '/api/mcp/oauth/callback'}</span>
                </div>
                <button type="button" onClick={() => saveConnectorCredentials(selected)} disabled={savingCredentials} className="px-3 py-2 rounded-lg border border-[#38352d] bg-[#211f1a] text-xs font-semibold">
                  {savingCredentials ? 'Saving…' : 'Save credentials'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold">Tool access</h4>
                  <p className="text-[11px] text-[#6d685f]">Choose when this connector is loaded in this conversation.</p>
                </div>
                <select
                  value={selected.config?.toolAccess || 'auto'}
                  onChange={(e) => updateConfig({ toolAccess: e.target.value as any })}
                  className="px-3 py-1.5 rounded-lg border border-[#38352d] bg-[#22201b] text-xs"
                >
                  <option value="auto">Auto</option>
                  <option value="always">Always available</option>
                  <option value="on_demand">On demand</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold">Available tools</h4>
                  <span className="text-[10px] text-[#6d685f]">{tools.length} discovered</span>
                </div>
                <div className="border border-[#282620] rounded-xl divide-y divide-[#24221c] max-h-56 overflow-y-auto">
                  {tools.length === 0 ? (
                    <div className="p-3 text-[11px] text-[#6d685f]">
                      Authenticate the connector or reopen this view to discover tools.
                    </div>
                  ) : (
                    tools.map((tool) => {
                      const disabled = new Set((selected.config?.disabledTools || []).map(String)).has(tool);
                      return (
                        <div key={tool} className="flex items-center justify-between px-3 py-2 text-xs">
                          <span className={disabled ? 'line-through text-[#6d685f]' : 'text-[#b8b2a7]'}>{tool}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set((selected.config?.disabledTools || []).map(String));
                              if (next.has(tool)) next.delete(tool);
                              else next.add(tool);
                              updateConfig({ disabledTools: Array.from(next) });
                            }}
                            className={`px-2 py-1 rounded border text-[10px] ${disabled ? 'border-emerald-800 text-emerald-400' : 'border-red-900/60 text-red-300'}`}
                          >
                            {disabled ? 'Enable' : 'Block'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            {statusMessage && <div className="p-3 rounded-lg border border-[#4a4133] bg-[#231f18] text-xs text-[#cc785c]">{statusMessage}</div>}
          </div>
        </div>}
      <PluginCreatorModal
        isOpen={pluginCreatorOpen}
        onClose={() => setPluginCreatorOpen(false)}
        onInstallGitHubConnector={() => {
          setPluginCreatorOpen(false);
          const github = connectors.find((item) => item.id === 'conn-github');
          if (github) selectConnector(github);
        }}
        onCreatedConnector={(newConnector) => {
          const next = [newConnector, ...connectors.filter((item) => item.id !== newConnector.id && item.name.toLowerCase() !== newConnector.name.toLowerCase())];
          setConnectors(next);
          persistCustom(next);
          onAddCustomConnector?.(newConnector);
          setSelected(newConnector);
          setView('detail');
          setPluginCreatorOpen(false);
          setStatusMessage(newConnector.status === 'connected' ? 'Plugin connected and added to Connectors.' : 'Plugin added to Connectors. Connect it when authentication is required.');
        }}
      />
      </div>
    </div>
  );
}