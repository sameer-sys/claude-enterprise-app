'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, Globe, Loader2, LogIn, Plus, Search, Trash2, X } from 'lucide-react';
import { Connector, ConnectorConfig } from '@/types/chat';

const APP_DEFS = [
  { slug: 'github', name: 'GitHub', description: 'Repositories, issues, pull requests, commits and code workflows.', category: 'Developer tools' },
  { slug: 'gmail', name: 'Gmail', description: 'Search, read, draft and send email.', category: 'Communication' },
  { slug: 'googledrive', name: 'Google Drive', description: 'Search, read and manage files in Drive.', category: 'Productivity' },
  { slug: 'googlecalendar', name: 'Google Calendar', description: 'Read and manage calendar events.', category: 'Productivity' },
  { slug: 'youtube', name: 'YouTube', description: 'Read channels, videos and playlists and manage supported content.', category: 'Media' },
  { slug: 'slack', name: 'Slack', description: 'Read and send messages and work with channels.', category: 'Communication' },
  { slug: 'notion', name: 'Notion', description: 'Search and manage pages, databases and workspace content.', category: 'Productivity' },
  { slug: 'discord', name: 'Discord', description: 'Work with servers, channels and messages.', category: 'Communication' },
  { slug: 'linear', name: 'Linear', description: 'Manage issues, projects and teams.', category: 'Project management' },
  { slug: 'asana', name: 'Asana', description: 'Manage tasks, projects and workspaces.', category: 'Project management' },
  { slug: 'jira', name: 'Jira', description: 'Manage issues and project workflows.', category: 'Project management' },
  { slug: 'trello', name: 'Trello', description: 'Manage boards, lists and cards.', category: 'Project management' },
  { slug: 'hubspot', name: 'HubSpot', description: 'Work with CRM contacts, companies and deals.', category: 'CRM' },
  { slug: 'salesforce', name: 'Salesforce', description: 'Work with CRM records and sales workflows.', category: 'CRM' },
  { slug: 'shopify', name: 'Shopify', description: 'Work with store data and supported commerce actions.', category: 'Commerce' },
  { slug: 'reddit', name: 'Reddit', description: 'Search and interact with supported Reddit content.', category: 'Social' },
  { slug: 'telegram', name: 'Telegram', description: 'Work with supported Telegram actions.', category: 'Communication' },
  { slug: 'whatsapp', name: 'WhatsApp', description: 'Work with supported WhatsApp actions.', category: 'Communication' },
  { slug: 'microsoft365', name: 'Microsoft 365', description: 'Connect supported Microsoft 365 services.', category: 'Productivity' },
  { slug: 'zoom', name: 'Zoom', description: 'Work with supported meeting and account actions.', category: 'Communication' },
] as const;

function isRemoteMcpConnector(connector: Connector): boolean {
  const type = String(connector?.config?.connectionType || connector?.provider || '').toLowerCase();
  const url = String(connector?.config?.mcpUrl || connector?.url || '');
  return type === 'mcp' && /^https?:\\/\\//i.test(url);
}

function sanitizeConnector(connector: Connector): Connector {
  const config: any = { ...(connector.config || {}) };
  delete config.authToken;
  delete config.apiKey;
  delete config.clientSecret;
  return { ...connector, config };
}

export function createDefaultConnectors(): Connector[] {
  return APP_DEFS.map((app) => ({
    id: 'conn-' + app.slug,
    name: app.name,
    description: app.description,
    icon: app.slug,
    enabled: true,
    status: 'idle' as const,
    category: app.category,
    section: app.category === 'Communication' ? 'top' : 'custom',
    isCustom: false,
    isVerified: true,
    provider: 'composio' as const,
    capabilities: ['OAuth', 'Tool discovery', 'Tool execution'],
    config: {
      connectionType: 'composio',
      providerName: app.name,
      toolAccess: 'auto',
      disabledTools: [],
      toolPermissions: {},
      requireApprovalForWrites: true,
      composioToolkit: app.slug,
    },
  }));
}

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

export default function ConnectorsModal({
  isOpen,
  onClose,
  activeConnectors,
  onToggleConnector,
  onUpdateConnectorConfig,
  onAddCustomConnector,
  onRemoveCustomConnector,
}: ConnectorsModalProps) {
  const [view, setView] = useState<'list' | 'add' | 'detail'>('list');
  const [search, setSearch] = useState('');
  const [connectors, setConnectors] = useState<Connector[]>(createDefaultConnectors());
  const [selected, setSelected] = useState<Connector | null>(null);
  const [accounts, setAccounts] = useState<Record<string, any[]>>({});
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tools, setTools] = useState<string[]>([]);

  const activeMap = useMemo(() => new Map(activeConnectors.map((c) => [c.id, c])), [activeConnectors]);

  const persistCustom = (items: Connector[]) => {
    try {
      localStorage.setItem(
        'claude_custom_connectors',
        JSON.stringify(items.filter((c) => c.isCustom && isRemoteMcpConnector(c)).map(sanitizeConnector))
      );
    } catch {}
  };

  const mergeState = (customs: Connector[]) => [...createDefaultConnectors(), ...customs.filter(isRemoteMcpConnector).map(sanitizeConnector)];

  useEffect(() => {
    try {
      const raw = localStorage.getItem('claude_custom_connectors');
      const persisted = raw ? JSON.parse(raw) : [];
      setConnectors(mergeState(Array.isArray(persisted) ? persisted : []));
    } catch {
      setConnectors(mergeState([]));
    }
  }, []);

  const refreshStatus = async () => {
    try {
      const res = await fetch('/api/composio', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      const nextAccounts: Record<string, any[]> = {};
      for (const app of Array.isArray(data?.apps) ? data.apps : []) {
        nextAccounts[String(app.slug)] = Array.isArray(app.accounts) ? app.accounts : [];
      }
      setAccounts(nextAccounts);
      setConnectors((prev) => prev.map((connector) => {
        const slug = String(connector?.config?.composioToolkit || '').toLowerCase();
        if (!slug) return connector;
        return { ...connector, status: (nextAccounts[slug] || []).length > 0 ? 'connected' : 'idle' };
      }));
      if (data?.error) setStatusMessage(String(data.error));
    } catch (err: any) {
      setStatusMessage(String(err?.message || 'Could not load connector status.'));
    }
  };

  useEffect(() => {
    if (isOpen) refreshStatus();
  }, [isOpen]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'sameer-composio-connector-connected') return;
      const toolkit = String(event.data?.toolkit || '').toLowerCase();
      setAuthenticating(null);
      setStatusMessage(
        event.data?.status === 'success'
          ? (toolkit || 'Connector') + ' connected successfully.'
          : 'OAuth Error: ' + String(event.data?.error || 'Authentication failed.')
      );
      refreshStatus();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!selected || !isOpen || selected.provider === 'composio') {
      if (!selected || selected.provider === 'composio') setTools([]);
      return;
    }
    let cancelled = false;
    fetch('/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check', connector: selected }) })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => { if (!cancelled && data?.success) setTools(Array.isArray(data.tools) ? data.tools.map((t: any) => String(t?.name || '')).filter(Boolean) : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selected?.id, isOpen]);

  const openComposioConnect = async (connector: Connector) => {
    const toolkit = String(connector?.config?.composioToolkit || '').trim().toLowerCase();
    if (!toolkit) return;
    setAuthenticating(toolkit);
    setStatusMessage('Opening secure ' + connector.name + ' sign-in…');
    try {
      const res = await fetch('/api/composio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', toolkit, alias: connector.name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.redirectUrl) throw new Error(data?.error || 'Failed to create the connection link.');
      const popup = window.open(data.redirectUrl, 'composio_' + toolkit, 'popup,width=650,height=820,resizable=yes,scrollbars=yes');
      if (!popup) window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setAuthenticating(null);
      setStatusMessage(String(err?.message || err));
    }
  };

  const disconnectComposio = async (connector: Connector) => {
    const toolkit = String(connector?.config?.composioToolkit || '').trim().toLowerCase();
    const list = accounts[toolkit] || [];
    if (!list[0]?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/composio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', connectedAccountId: list[0].id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to disconnect.');
      setStatusMessage(connector.name + ' disconnected.');
      await refreshStatus();
    } catch (err: any) {
      setStatusMessage(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const openRemoteOAuth = async (connector: Connector) => {
    setAuthenticating(connector.id);
    setStatusMessage('Starting secure MCP OAuth…');
    try {
      const res = await fetch('/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'oauth_start', connector }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.authUrl) throw new Error(data?.error || 'This connector could not start OAuth.');
      const popup = window.open(data.authUrl, 'remote_mcp_login', 'popup,width=620,height=780,resizable=yes,scrollbars=yes');
      if (!popup) window.open(data.authUrl, '_blank');
    } catch (err: any) {
      setAuthenticating(null);
      setStatusMessage('OAuth Error: ' + String(err?.message || err));
    }
  };

  const addCustomConnector = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = customName.trim();
    const url = customUrl.trim();
    if (!name || !url) return;

    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error('Use a public HTTP/HTTPS MCP URL.');
    } catch (err: any) {
      setStatusMessage(err?.message || 'Enter a valid MCP URL.');
      return;
    }

    setLoading(true);
    const connector: Connector = {
      id: 'mcp-' + Date.now(),
      name,
      description: 'Remote MCP server at ' + url,
      icon: 'mcp',
      enabled: true,
      status: 'ready',
      category: 'Custom',
      section: 'custom',
      isCustom: true,
      isVerified: false,
      provider: 'mcp',
      capabilities: ['Remote MCP', 'Tool Discovery', 'Tool Execution', 'OAuth'],
      config: { connectionType: 'mcp', providerName: name, mcpUrl: url, toolAccess: 'auto', disabledTools: [], requireApprovalForWrites: true, ...(oauthClientId.trim() ? { oauthClientId: oauthClientId.trim() } : {}) },
      url,
    };

    try {
      const save = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_credentials', connectorId: connector.id, serverUrl: url, clientId: oauthClientId.trim(), clientSecret: oauthClientSecret, apiToken: apiToken.trim() }),
      });
      if (!save.ok) throw new Error('Could not securely save connector credentials.');
      const next = [connector, ...connectors.filter((c) => c.id !== connector.id)];
      setConnectors(next);
      persistCustom(next);
      onAddCustomConnector?.(connector);
      setSelected(connector);
      setView('detail');
      setStatusMessage('Custom MCP connector added.');
    } catch (err: any) {
      setStatusMessage(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const removeConnector = async (connector: Connector) => {
    if (!connector.isCustom) return;
    await fetch('/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'disconnect', connectorId: connector.id, serverUrl: connector.url }) }).catch(() => {});
    const next = connectors.filter((c) => c.id !== connector.id);
    setConnectors(next);
    persistCustom(next);
    onRemoveCustomConnector?.(connector.id);
    setSelected(null);
    setView('list');
  };

  const updateConfig = (config: ConnectorConfig) => {
    if (!selected) return;
    const next = { ...selected, config: { ...(selected.config || {}), ...config } };
    setSelected(next);
    setConnectors((prev) => prev.map((c) => c.id === next.id ? next : c));
    onUpdateConnectorConfig?.(selected.id, next.config || {});
    if (selected.isCustom) persistCustom(connectors.map((c) => c.id === next.id ? next : c));
  };

  const filtered = connectors.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-4xl h-[700px] rounded-2xl border border-[#38352d] bg-[#181714] text-[#ece9e2] shadow-2xl flex flex-col overflow-hidden">
        {view === 'list' && <>
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#2d2b25]">
            <div><h2 className="text-xl font-bold">Connectors</h2><p className="text-xs text-[#8f8a80] mt-1">Connect each app directly. OAuth is handled securely by the integration provider.</p></div>
            <div className="flex items-center gap-3">
              <div className="relative"><Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8a80]"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search connectors" className="w-52 pl-8 pr-3 py-2 text-xs rounded-lg border border-[#38352d] bg-[#201e1a]"/></div>
              <button onClick={() => { setCustomName(''); setCustomUrl(''); setOauthClientId(''); setOauthClientSecret(''); setApiToken(''); setShowAdvanced(false); setStatusMessage(''); setView('add'); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#38352d] bg-[#25231e]"><Plus className="w-3.5 h-3.5 text-[#cc785c]"/>Custom MCP</button>
              <button onClick={onClose} className="p-1.5 rounded-lg text-[#8f8a80]"><X className="w-4 h-4"/></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {filtered.map((connector) => {
              const toolkit = String(connector?.config?.composioToolkit || '').toLowerCase();
              const connectedAccounts = accounts[toolkit] || [];
              const connected = connector.provider === 'composio' ? connectedAccounts.length > 0 : connector.status === 'connected';
              return <div key={connector.id} className="flex items-center justify-between p-3.5 rounded-xl border border-[#2d2b25] bg-[#1e1c18]">
                <button className="flex items-center gap-3 min-w-0 text-left" onClick={() => { setSelected({ ...(activeMap.get(connector.id) || connector), ...connector }); setView('detail'); }}>
                  <div className="w-10 h-10 rounded-xl border border-[#38352d] bg-[#2a2722] flex items-center justify-center text-[#cc785c] text-xs font-bold">{connector.name.slice(0,2).toUpperCase()}</div>
                  <div className="min-w-0"><div className="flex items-center gap-2"><span className="font-semibold text-sm truncate">{connector.name}</span><span className={'text-[10px] px-2 py-0.5 rounded-full border ' + (connected ? 'border-emerald-800 text-emerald-400' : 'border-amber-800 text-amber-400')}>{connected ? 'Connected' : 'Not connected'}</span></div><div className="text-xs text-[#8f8a80] truncate max-w-2xl">{connector.description}</div>{connected && connectedAccounts[0]?.alias && <div className="text-[10px] text-[#6d685f] mt-1">Account: {connectedAccounts[0].alias}</div>}</div>
                </button>
                <div className="flex items-center gap-2">
                  {connector.provider === 'composio' ? (
                    connected ? <button onClick={() => disconnectComposio(connector)} disabled={loading} className="px-3 py-1.5 rounded-lg border border-[#4a4133] text-[#d0c9bc] text-xs font-semibold">{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'Disconnect'}</button> :
                    <button onClick={() => openComposioConnect(connector)} disabled={authenticating !== null} className="px-3 py-1.5 rounded-lg bg-[#cc785c] text-white text-xs font-semibold">{authenticating === toolkit ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <><LogIn className="w-3.5 h-3.5 inline mr-1"/>Connect</>}</button>
                  ) : <button onClick={() => connector.status === 'connected' ? undefined : openRemoteOAuth(connector)} className="px-3 py-1.5 rounded-lg bg-[#cc785c] text-white text-xs font-semibold">{connector.status === 'connected' ? 'Connected' : 'Connect'}</button>}
                  <button onClick={() => onToggleConnector(connector.id)} className={'px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold ' + (connector.enabled ? 'border-emerald-800 text-emerald-400' : 'border-[#38352d] text-[#8f8a80]')}>{connector.enabled ? 'Enabled' : 'Disabled'}</button>
                </div>
              </div>;
            })}
          </div>
          {statusMessage && <div className="px-6 py-3 border-t border-[#2d2b25] text-xs text-[#cc785c] bg-[#1a1815]">{statusMessage}</div>}
        </>}

        {view === 'add' && <form onSubmit={addCustomConnector} className="h-full flex flex-col">
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#2d2b25]"><div className="flex items-center gap-2"><button type="button" onClick={() => setView('list')} className="p-1.5 rounded-lg text-[#8f8a80]"><ChevronLeft className="w-4 h-4"/></button><h2 className="text-base font-bold">Add custom MCP connector</h2></div><button type="button" onClick={onClose} className="p-1.5 text-[#8f8a80]"><X className="w-4 h-4"/></button></div>
          <div className="flex-1 overflow-y-auto px-8 py-5 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#141310] border border-[#282620]"><div className="flex items-center gap-2 font-semibold"><Globe className="w-4 h-4 text-[#cc785c]"/>Remote MCP server</div><p className="mt-1 text-[#8f8a80]">For services not in the built-in connector catalog.</p></div>
            <div><label className="block font-semibold mb-1.5">Connector Name</label><input required value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. My MCP server" className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18]"/></div>
            <div><label className="block font-semibold mb-1.5">Server URL</label><input required type="url" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://example.com/mcp" className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18]"/></div>
            <div className="pt-2 border-t border-[#2d2b25]"><button type="button" onClick={() => setShowAdvanced((v) => !v)} className="flex items-center gap-2 font-semibold"><ChevronDown className={'w-3.5 h-3.5 ' + (showAdvanced ? 'rotate-180' : '')}/>Advanced settings</button>
              {showAdvanced && <div className="mt-3 space-y-3"><div><label className="block mb-1.5 font-semibold">OAuth Client ID</label><input value={oauthClientId} onChange={(e) => setOauthClientId(e.target.value)} className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18]"/></div><div><label className="block mb-1.5 font-semibold">OAuth Client Secret</label><input type="password" autoComplete="new-password" value={oauthClientSecret} onChange={(e) => setOauthClientSecret(e.target.value)} className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18]"/></div><div><label className="block mb-1.5 font-semibold">Bearer / API Token</label><input type="password" autoComplete="off" value={apiToken} onChange={(e) => setApiToken(e.target.value)} className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18]"/></div></div>}
            </div>
            <div className="flex justify-end pt-4"><button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-[#cc785c] text-white text-xs font-semibold">{loading ? 'Adding…' : 'Add connector'}</button></div>
            {statusMessage && <div className="p-3 rounded-lg border border-[#4a4133] bg-[#231f18] text-[#cc785c]">{statusMessage}</div>}
          </div>
        </form>}

        {view === 'detail' && selected && <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#2d2b25]"><div className="flex items-center gap-2"><button onClick={() => setView('list')} className="p-1.5 rounded-lg text-[#8f8a80]"><ChevronLeft className="w-4 h-4"/></button><h2 className="text-base font-bold">{selected.name}</h2></div><button onClick={onClose} className="p-1.5 text-[#8f8a80]"><X className="w-4 h-4"/></button></div>
          <div className="flex-1 overflow-y-auto px-8 py-5 space-y-4 text-xs">
            <div className="p-4 rounded-xl border border-[#2d2b25] bg-[#141310]"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl border border-[#38352d] bg-[#2a2722] flex items-center justify-center text-[#cc785c] font-bold">{selected.name.slice(0,2).toUpperCase()}</div><div><div className="font-semibold text-sm">{selected.name}</div><div className="text-[#8f8a80]">{selected.description}</div></div></div></div>
            <div className="p-3.5 rounded-xl bg-[#141310] border border-[#282620] space-y-3"><div className="flex items-center justify-between"><span>Connection</span><span className={selected.provider === 'composio' && (accounts[String(selected.config?.composioToolkit || '').toLowerCase()] || []).length ? 'text-emerald-400' : 'text-amber-400'}>{selected.provider === 'composio' && (accounts[String(selected.config?.composioToolkit || '').toLowerCase()] || []).length ? 'Connected' : 'Not connected'}</span></div>{selected.provider === 'composio' && !(accounts[String(selected.config?.composioToolkit || '').toLowerCase()] || []).length && <button onClick={() => openComposioConnect(selected)} className="w-full px-3 py-2 rounded-lg bg-[#cc785c] text-white font-semibold">Connect {selected.name}</button>}{selected.provider === 'composio' && (accounts[String(selected.config?.composioToolkit || '').toLowerCase()] || []).length > 0 && <button onClick={() => disconnectComposio(selected)} disabled={loading} className="w-full px-3 py-2 rounded-lg border border-[#4a4133] text-[#d0c9bc] font-semibold">Disconnect</button>}</div>
            <div className="p-3.5 rounded-xl bg-[#141310] border border-[#282620] space-y-3"><div className="flex items-center justify-between"><div><h4 className="text-xs font-semibold">Tool access</h4><p className="text-[11px] text-[#6d685f]">Controls whether this connector participates in chats.</p></div><select value={selected.config?.toolAccess || 'auto'} onChange={(e) => updateConfig({ toolAccess: e.target.value as any })} className="px-3 py-1.5 rounded-lg border border-[#38352d] bg-[#22201b] text-xs"><option value="auto">Auto</option><option value="always">Always available</option><option value="on_demand">On demand</option></select></div><label className="flex items-center justify-between text-xs"><span>Require approval for writes</span><input type="checkbox" checked={selected.config?.requireApprovalForWrites !== false} onChange={(e) => updateConfig({ requireApprovalForWrites: e.target.checked })}/></label></div>
            {selected.isCustom && <div><div className="flex items-center justify-between mb-2"><h4 className="text-xs font-semibold">Available tools</h4><span className="text-[10px] text-[#6d685f]">{tools.length} discovered</span></div><div className="border border-[#282620] rounded-xl divide-y divide-[#24221c] max-h-56 overflow-y-auto">{tools.length === 0 ? <div className="p-3 text-[11px] text-[#6d685f]">Authenticate the connector or reopen this view to discover tools.</div> : tools.map((tool) => <div key={tool} className="px-3 py-2 text-xs text-[#b8b2a7]">{tool}</div>)}</div></div>}
            {selected.isCustom && <button onClick={() => removeConnector(selected)} className="w-full px-3 py-2 rounded-lg border border-red-900/50 text-red-400 font-semibold"><Trash2 className="w-3.5 h-3.5 inline mr-1"/>Remove custom connector</button>}
            {statusMessage && <div className="p-3 rounded-lg border border-[#4a4133] bg-[#231f18] text-[#cc785c]">{statusMessage}</div>}
          </div>
        </div>}
      </div>
    </div>
  );
}
