'use client';

import React, { useEffect, useState } from 'react';
import { 
  Check, 
  ChevronDown, 
  ChevronLeft, 
  Copy, 
  ExternalLink, 
  Hand, 
  Ban, 

  Loader2, 
  Plus, 
  Search, 
  Shield, 
  X, 
  Zap, 
  Globe, 
  CheckCircle2,
  Trash2,
  LogIn,
} from 'lucide-react';
import { Connector, ConnectorConfig } from '@/types/chat';

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

export const DEFAULT_CONNECTORS: Connector[] = [{
  id: 'conn-composio',
  name: 'Composio For You',
  description: 'Connect your apps, tools, OAuth accounts, and actions via MCP.',
  icon: 'composio',
  enabled: true,
  status: 'idle',
  category: 'Integrations',
  section: 'custom',
  isCustom: true,
  isVerified: true,
  provider: 'mcp',
  capabilities: ['Multi Execute', 'Tool Search', 'Skills', 'OAuth'],
  config: { 
    connectionType: 'mcp', 
    providerName: 'Composio',
    mcpUrl: 'https://connect.composio.dev/mcp'
  },
  url: 'https://connect.composio.dev/mcp',
}];

export function createDefaultConnectors(): Connector[] {
  return DEFAULT_CONNECTORS.map((c) => ({ ...c, config: { ...c.config } }));
}

function isRemoteMcpConnector(connector: Connector): boolean {
  const type = String(connector?.config?.connectionType || connector?.provider || '').toLowerCase();
  const url = String(connector?.config?.mcpUrl || connector?.url || '');
  return type === 'mcp' && !url.startsWith('cli://') && !['cli', 'stdio'].includes(String(connector?.config?.connectionType || '').toLowerCase());
}

interface ToolPermission {
  name: string;
  mode: 'allow' | 'ask' | 'block';
}

const DEFAULT_READ_TOOLS: ToolPermission[] = [
  { name: 'Get Tool Schemas', mode: 'allow' },
  { name: 'COMPOSIO SEARCH SKILLS', mode: 'allow' },
  { name: 'Search Composio Tools', mode: 'allow' },
  { name: 'COMPOSIO USE SKILL', mode: 'allow' },
  { name: 'Wait for connection', mode: 'allow' },
];

const DEFAULT_WRITE_TOOLS: ToolPermission[] = [
  { name: 'Manage connections', mode: 'allow' },
  { name: 'COMPOSIO MANAGE SKILL', mode: 'allow' },
  { name: 'Multi Execute Composio Tools', mode: 'allow' },
  { name: 'Run bash commands', mode: 'allow' },
  { name: 'Execute Code remotely in work bench', mode: 'allow' },
  { name: 'Submit tool feedback', mode: 'allow' },
];

export default function ConnectorsModal(props: ConnectorsModalProps) {
  const { isOpen, onClose, activeConnectors, onUpdateConnectorConfig, onAddCustomConnector, onRemoveCustomConnector } = props;

  // View state: 'list' (Yours/Discover) | 'add' (Add custom connector) | 'detail' (Tools & permissions view)
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'detail'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Detail view state
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [readTools, setReadTools] = useState<ToolPermission[]>(DEFAULT_READ_TOOLS);
  const [writeTools, setWriteTools] = useState<ToolPermission[]>(DEFAULT_WRITE_TOOLS);
  const [globalPermission, setGlobalPermission] = useState<'Always allow' | 'Ask before run' | 'Block write'>('Always allow');


  // Custom remote MCP connector form state
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [discoveredTools, setDiscoveredTools] = useState<string[]>([]);


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [mcpConnected, setMcpConnected] = useState(false);

  // The parent session is the source of truth for connector configuration.
  // localStorage is only a migration/backup for custom MCP/CLI definitions.
  const [customConnectors, setCustomConnectors] = useState<Connector[]>(() => {
    const persisted: Connector[] = [];
    try {
      const stored = localStorage.getItem('claude_custom_connectors');
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) persisted.push(...parsed);
    } catch {}

    const merged = [...activeConnectors.filter(isRemoteMcpConnector), ...persisted.filter(isRemoteMcpConnector), ...createDefaultConnectors()];
    const seen = new Set<string>();
    return merged.filter((c) => {
      const key = c.id || c.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  // Refresh local connector view from the current session whenever the modal opens.
  // Never clear this state merely because the page was refreshed.
  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = localStorage.getItem('claude_custom_connectors');
      const parsed = stored ? JSON.parse(stored) : [];
      const persisted = Array.isArray(parsed) ? parsed : [];
      const merged = [...activeConnectors.filter(isRemoteMcpConnector), ...persisted.filter(isRemoteMcpConnector), ...createDefaultConnectors()];
      const seen = new Set<string>();
      setCustomConnectors(merged.filter((c: Connector) => {
        const key = c.id || c.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }));
    } catch {
      setCustomConnectors([...activeConnectors.filter(isRemoteMcpConnector), ...createDefaultConnectors()]);
    }
  }, [isOpen, activeConnectors]);

  // Check the server-side Composio session on open. This is read-only.
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/composio', { method: 'GET', cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const isConn = Boolean(data.mcpConnected && data.mode === 'for_you');
        setMcpConnected(isConn);

        setCustomConnectors((prev) => {
          const existing = prev.find((c) => c.id === 'conn-composio');
          const base = createDefaultConnectors()[0];
          const composio = {
            ...base,
            ...(existing || {}),
            status: (isConn ? 'connected' : 'idle') as 'connected' | 'idle',
            config: {
              ...(base.config || {}),
              ...(existing?.config || {}),
              composioAccountCount: Array.isArray(data.connectedAccounts) ? data.connectedAccounts.length : 0,
            },
          };
          const rest = prev.filter((c) => c.id !== 'conn-composio');
          const next = [composio, ...rest];
          try {
            localStorage.setItem('claude_custom_connectors', JSON.stringify(next.filter((c) => c.id !== 'conn-composio')));
          } catch {}
          return next;
        });
      } catch {}
    };
    if (isOpen) checkStatus();
  }, [isOpen]);

  // Refresh custom remote MCP auth/tool status without modifying the server-side connection.
  useEffect(() => {
    if (!isOpen) return;
    const custom = customConnectors.filter((c) => c.id !== 'conn-composio' && isRemoteMcpConnector(c)).slice(0, 8);
    if (!custom.length) return;
    let cancelled = false;
    Promise.all(custom.map(async (connector) => {
      try {
        const res = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check', connector }),
        });
        const data = await res.json().catch(() => ({}));
        return {
          id: connector.id,
          status: data?.success ? 'connected' : 'ready',
          tools: Array.isArray(data?.tools) ? data.tools.map((t: any) => String(t?.name || '')).filter(Boolean) : [],
        };
      } catch {
        return { id: connector.id, status: 'ready', tools: [] };
      }
    })).then((results) => {
      if (cancelled) return;
      setCustomConnectors((prev) => prev.map((connector) => {
        const result = results.find((r) => r.id === connector.id);
        if (!result) return connector;
        return { ...connector, status: result.status as 'connected' | 'ready' | 'idle' };
      }));
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  // Listen for OAuth completion message from popup
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'sameer-remote-mcp-connected') {
        const connectorId = String(event.data?.connectorId || '');
        if (event.data?.status === 'success') {
          setCustomConnectors((prev) => prev.map((c) => c.id === connectorId ? { ...c, status: 'connected' as const } : c));
          const conn = activeConnectors.find((c) => c.id === connectorId);
          if (conn) setSelectedConnector({ ...conn, status: 'connected' });
          setStatusMessage('Remote MCP connector authenticated successfully.');
        } else {
          setStatusMessage('OAuth Error: ' + String(event.data?.error || 'Authentication failed.'));
        }
        setIsAuthenticating(false);
        setIsSubmitting(false);
        return;
      }

      if (event.data?.type === 'sameer-composio-mcp-connected') {
        if (event.data?.status === 'success') {
          setMcpConnected(true);
          setStatusMessage('Successfully connected to Composio "For You"!');
          setCustomConnectors((prev) => {
            const next = prev.map((c) =>
              c.id === 'conn-composio'
                ? { ...c, status: 'connected' as const }
                : c
            );
            try { localStorage.setItem('claude_custom_connectors', JSON.stringify(next)); } catch {}
            return next;
          });
        } else if (event.data?.error) {
          setStatusMessage(`OAuth Error: ${event.data.error}`);
        }
        setIsAuthenticating(false);
        setIsSubmitting(false);
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCurrentView('list');
      setStatusMessage('');
    }
  }, [isOpen]);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const startComposioOAuth = async () => {
    setIsAuthenticating(true);
    setStatusMessage('Initiating Composio "For You" sign-in...');
    try {
      const res = await fetch('/api/composio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_mcp_oauth_url' }),
      });
      const data = await res.json();
      if (!res.ok || !data.authUrl) {
        throw new Error(data.error || 'Failed to generate OAuth URL');
      }
      const popup = window.open(
        data.authUrl,
        'composio_mcp_login',
        'popup,width=620,height=780,resizable=yes,scrollbars=yes'
      );
      if (!popup) {
        window.open(data.authUrl, '_blank');
      }
    } catch (err: any) {
      setStatusMessage(`OAuth Error: ${err.message}`);
      setIsAuthenticating(false);
    }
  };

  const startRemoteOAuth = async (connector: Connector) => {
    setIsAuthenticating(true);
    setStatusMessage('Starting secure OAuth sign-in…');
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'oauth_start', connector }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.authUrl) throw new Error(data.error || 'Could not start MCP OAuth.');
      const popup = window.open(data.authUrl, 'remote_mcp_login', 'popup,width=620,height=780,resizable=yes,scrollbars=yes');
      if (!popup) window.open(data.authUrl, '_blank');
    } catch (err: any) {
      setStatusMessage('OAuth Error: ' + String(err?.message || 'Could not start OAuth.'));
      setIsAuthenticating(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customUrl.trim()) return;

    setIsSubmitting(true);
    setStatusMessage('Connecting to MCP server...');

    try {
      const newConnector: Connector = {
        id: `mcp-${Date.now()}`,
        name: customName.trim(),
        description: `MCP Server at ${customUrl.trim()}`,
        icon: 'composio',
        enabled: true,
        status: 'idle',
        category: 'Integrations',
        section: 'custom',
        isCustom: true,
        isVerified: true,
        provider: 'mcp',
        capabilities: ['Multi Execute', 'Tool Search', 'OAuth'],
        config: {
          connectionType: 'mcp',
          providerName: customName.trim(),
          mcpUrl: customUrl.trim(),
          ...(oauthClientId.trim() ? { oauthClientId: oauthClientId.trim() } : {}),
        },
        url: customUrl.trim(),
      };

      const saveRes = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_credentials',
          connectorId: newConnector.id,
          serverUrl: newConnector.url,
          clientId: oauthClientId.trim(),
          clientSecret: oauthClientSecret,
          apiToken: apiToken.trim(),
        }),
      });
      if (!saveRes.ok) throw new Error('Could not save connector credentials securely.');

      const probeRes = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', connector: newConnector }),
      });
      const probe = await probeRes.json().catch(() => ({}));

      if (probeRes.ok && probe?.success) {
        newConnector.status = probe.toolCount > 0 ? 'connected' : 'ready';
        setStatusMessage(
          probe.toolCount > 0
            ? `Connected — discovered ${probe.toolCount} MCP tool${probe.toolCount === 1 ? '' : 's'}.`
            : 'Server responded, but did not advertise any tools yet.'
        );
      } else if (probe?.requiresAuth || probeRes.status === 401 || probeRes.status === 403) {
        newConnector.status = 'ready';
        setStatusMessage('Connector added. Click Connect to authenticate with the remote MCP server.');
      } else {
        newConnector.status = 'ready';
        setStatusMessage(probe?.error || 'Connector saved. It will be checked again when the agent uses it.');
      }

      const updated = [newConnector, ...customConnectors.filter((c) => c.name.toLowerCase() !== newConnector.name.toLowerCase())];
      setCustomConnectors(updated);
      try {
        localStorage.setItem('claude_custom_connectors', JSON.stringify(updated));
      } catch {}

      if (onAddCustomConnector) {
        onAddCustomConnector(newConnector);
      }

      setSelectedConnector(newConnector);
      setCurrentView('detail');
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async (connectorId: string) => {
    const conn = customConnectors.find((c) => c.id === connectorId);
    if (!conn) return;

    if (conn.id === 'conn-composio') {
      try {
        await fetch('/api/composio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disconnect_mcp' }),
        });
      } catch {}
      setMcpConnected(false);
      setCustomConnectors((prev) => prev.map((c) => c.id === connectorId ? { ...c, status: 'idle' } : c));
      setCurrentView('detail');
      return;
    }

    try {
      await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', connectorId: conn.id, serverUrl: conn.url }),
      });
    } catch {}

    setCustomConnectors((prev) => prev.map((c) => c.id === connectorId ? { ...c, status: 'ready' } : c));
    onUpdateConnectorConfig?.(connectorId, { ...(conn.config || {}), disabledTools: [] });
    setStatusMessage('Connector disconnected. Your server configuration is still saved.');
  };

  const handleRemove = async (connectorId: string) => {
    const conn = customConnectors.find((c) => c.id === connectorId);
    if (!conn) return;
    if (conn.id === 'conn-composio') return;
    try {
      await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', connectorId: conn.id, serverUrl: conn.url }),
      });
    } catch {}
    const updated = customConnectors.filter((c) => c.id !== connectorId);
    setCustomConnectors(updated);
    try {
      localStorage.setItem('claude_custom_connectors', JSON.stringify(updated.filter((c) => c.id !== 'conn-composio')));
    } catch {}
    onRemoveCustomConnector?.(connectorId);
    setCurrentView('list');
  };

  const toggleToolMode = (type: 'read' | 'write', toolName: string, mode: 'allow' | 'ask' | 'block') => {
    if (type === 'read') {
      setReadTools((prev) => prev.map((t) => (t.name === toolName ? { ...t, mode } : t)));
    } else {
      setWriteTools((prev) => prev.map((t) => (t.name === toolName ? { ...t, mode } : t)));
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl h-[620px] rounded-2xl border border-[#38352d] bg-[#181714] text-[#ece9e2] shadow-2xl flex flex-col overflow-hidden">
        
        {/* ========================================================= */}
        {/* VIEW 1: MAIN CONNECTORS VIEW (YOURS & DISCOVER)           */}
        {/* ========================================================= */}
        {currentView === 'list' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-[#ece9e2]">Connectors</h2>
                <span className="text-[10px] px-2 py-1 rounded-lg border border-[#3a372f] bg-[#211f1a] text-[#cc785c] font-mono">For You + Remote MCP</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8a80]" />
                  <input
                    type="text"
                    placeholder="Search connectors"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#38352d] bg-[#201e1a] text-[#ece9e2] placeholder-[#8f8a80] focus:outline-none focus:border-[#cc785c]"
                  />
                </div>
                
                {/* + Add Custom Remote MCP */}
                <button
                  onClick={() => {
                    setCustomName('');
                    setCustomUrl('');
                    setOauthClientId('');
                    setOauthClientSecret('');
                    setApiToken('');
                    setShowAdvanced(false);
                    setStatusMessage('');
                    setCurrentView('add');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#38352d] bg-[#25231e] hover:bg-[#322f29] text-[#ece9e2] transition-colors"
                  title="Add a remote MCP connector"
                >
                  <Plus className="w-3.5 h-3.5 text-[#cc785c]" />
                  <span>Add custom connector</span>
                </button>

                <button 
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[#8f8a80] hover:text-[#ece9e2] hover:bg-[#25231e]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
                <div className="space-y-2">
                  {customConnectors.length === 0 ? (
                    <div className="text-center py-16 text-[#8f8a80]">
                      <p className="text-sm">No custom connectors installed yet.</p>
                      <button 
                        onClick={() => setCurrentView('add')}
                        className="mt-3 px-4 py-2 text-xs rounded-xl bg-[#cc785c] text-white hover:bg-[#b86950]"
                      >
                        Add Custom Connector
                      </button>
                    </div>
                  ) : (
                    customConnectors
                      .filter(isRemoteMcpConnector)
                      .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((conn) => {
                        const isComposio = conn.id === 'conn-composio';
                        const isConnected = isComposio ? mcpConnected : (conn.status === 'connected');

                        return (
                          <div
                            key={conn.id}
                            className="flex items-center justify-between p-3.5 rounded-xl border border-[#2d2b25] bg-[#1e1c18] hover:border-[#423f36] hover:bg-[#23211c] transition-all"
                          >
                            <div 
                              className="flex items-center gap-3 cursor-pointer flex-1"
                              onClick={() => {
                                setSelectedConnector(conn);
                                setCurrentView('detail');
                              }}
                            >
                              <div className="w-9 h-9 rounded-lg border flex items-center justify-center font-bold bg-[#2a2722] border-[#38352d] text-[#cc785c]">
                                <Zap className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-[#ece9e2]">{conn.name}</span>
                                  {isConnected ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-medium">
                                      {isComposio ? 'Connected (For You)' : 'Connected'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800 text-amber-400 font-medium">
                                      Sign in needed
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-[#8f8a80]">
                                  {conn.config?.mcpUrl || conn.url || 'Remote MCP Server'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              {isComposio && !isConnected && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startComposioOAuth();
                                  }}
                                  disabled={isAuthenticating}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#cc785c] hover:bg-[#b86950] text-white font-medium text-xs shadow-sm disabled:opacity-50"
                                >
                                  {isAuthenticating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                                  <span>Connect</span>
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedConnector(conn);
                                  setCurrentView('detail');
                                }}
                                className="flex items-center gap-1 text-[#8f8a80] hover:text-[#ece9e2] px-2 py-1"
                              >
                                <span>Configure</span>
                                <ChevronDown className="w-4 h-4 -rotate-90" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
            </div>
          </>
        )}
        {/* ========================================================= */}
        {/* VIEW 2: ADD CUSTOM CONNECTOR (FRAME 7 & 9 FROM VIDEO)     */}
        {/* ========================================================= */}
        {currentView === 'add' && (
          <form onSubmit={handleAddSubmit} className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#2d2b25]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('list')}
                  className="p-1.5 rounded-lg text-[#8f8a80] hover:text-[#ece9e2] hover:bg-[#25231e]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-bold text-[#ece9e2]">
                  Add custom connector
                </h2>
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8f8a80] hover:text-[#ece9e2] hover:bg-[#25231e]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4 text-xs text-[#b8b2a7]">
              <>
                  <div>
                    <p className="text-xs text-[#8f8a80]">
                      Connect a remote MCP server by entering its name and public HTTP/HTTPS URL.
                    </p>
                  </div>

                  {/* Name Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#dcd8ce]">Connector Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. My MCP server"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18] text-[#ece9e2] placeholder-[#6d685f] focus:outline-none focus:border-[#cc785c]"
                    />
                    <p className="text-[11px] text-[#6d685f]">Shown in the connectors list.</p>
                  </div>

                  {/* URL Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#dcd8ce]">Server URL</label>
                    <input
                      type="url"
                      required
                      placeholder="https://example.com/mcp"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18] text-[#ece9e2] placeholder-[#6d685f] focus:outline-none focus:border-[#cc785c]"
                    />
                    <p className="text-[11px] text-[#6d685f]">
                      Enter the public HTTP/HTTPS endpoint of your remote MCP server.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#2d2b25]">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((v) => !v)}
                      className="flex items-center gap-2 text-xs font-semibold text-[#ece9e2]"
                    >
                      <ChevronDown className={"w-3.5 h-3.5 transition-transform " + (showAdvanced ? "rotate-180" : "")} />
                      <span>Advanced settings</span>
                    </button>
                    {showAdvanced && (
                      <div className="mt-3 space-y-3">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-[#dcd8ce]">OAuth Client ID (optional)</label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={oauthClientId}
                            onChange={(e) => setOauthClientId(e.target.value)}
                            placeholder="Client ID provided by the MCP server"
                            className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18] text-[#ece9e2] placeholder-[#6d685f] focus:outline-none focus:border-[#cc785c]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-[#dcd8ce]">OAuth Client Secret (optional)</label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={oauthClientSecret}
                            onChange={(e) => setOauthClientSecret(e.target.value)}
                            placeholder="Stored securely; never written to chat localStorage"
                            className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18] text-[#ece9e2] placeholder-[#6d685f] focus:outline-none focus:border-[#cc785c]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-[#dcd8ce]">Bearer / API token (optional)</label>
                          <input
                            type="password"
                            autoComplete="off"
                            value={apiToken}
                            onChange={(e) => setApiToken(e.target.value)}
                            placeholder="For MCP servers using static bearer auth"
                            className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18] text-[#ece9e2] placeholder-[#6d685f] focus:outline-none focus:border-[#cc785c]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </>
              
              {statusMessage && (
                <div className="p-3 rounded-lg border border-[#4a4133] bg-[#231f18] text-[#cc785c] text-xs">
                  {statusMessage}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between px-8 py-4 border-t border-[#2d2b25] bg-[#1a1915]">
              <button
                type="button"
                onClick={() => setCurrentView('list')}
                className="px-4 py-2 text-xs rounded-xl border border-[#38352d] text-[#8f8a80] hover:text-[#ece9e2] hover:bg-[#25231e]"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isAuthenticating}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#cc785c] hover:bg-[#b86950] text-white flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {(isSubmitting || isAuthenticating) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Add connector</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: CONNECTOR DETAILS & TOOL PERMISSIONS (FRAME 15)  */}
        {/* ========================================================= */}
        {currentView === 'detail' && selectedConnector && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#2d2b25]">
              <button
                onClick={() => setCurrentView('list')}
                className="flex items-center gap-1.5 text-xs text-[#8f8a80] hover:text-[#ece9e2]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Your connectors</span>
              </button>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8f8a80] hover:text-[#ece9e2] hover:bg-[#25231e]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-5 space-y-6">
              {/* Connector Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2a2722] border border-[#38352d] flex items-center justify-center font-bold text-[#cc785c]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-[#ece9e2]">{selectedConnector.name}</h3>
                      {selectedConnector.id === 'conn-composio' && (
                        mcpConnected ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-medium">
                            Connected (For You)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800 text-amber-400 font-medium">
                            Sign in needed
                          </span>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#8f8a80]">
                      <span>{selectedConnector.config?.mcpUrl || selectedConnector.url}</span>
                      <button 
                        onClick={() => handleCopyUrl(selectedConnector.config?.mcpUrl || selectedConnector.url || '')}
                        className="p-1 hover:text-[#ece9e2]"
                        title="Copy URL"
                      >
                        {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedConnector.name.toLowerCase().includes('composio') && !mcpConnected && (
                    <button
                      onClick={startComposioOAuth}
                      disabled={isAuthenticating}
                      className="px-3.5 py-1.5 rounded-xl bg-[#cc785c] hover:bg-[#b86950] text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isAuthenticating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                      <span>Sign In with Composio</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDisconnect(selectedConnector.id)}
                    className="px-3.5 py-1.5 rounded-xl border border-[#38352d] hover:border-red-900/60 bg-[#201e1a] hover:bg-red-950/30 text-xs text-[#b8b2a7] hover:text-red-300 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Tool permissions section */}
              <div className="space-y-4 pt-4 border-t border-[#2d2b25]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-[#ece9e2]">Tool permissions</h4>
                    <p className="text-[11px] text-[#6d685f]">Choose when Claude is allowed to use these tools.</p>
                  </div>
                  
                  {/* Global Permission Dropdown */}
                  <div className="relative">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#38352d] bg-[#22201b] text-xs font-medium text-[#ece9e2]">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{globalPermission}</span>
                      <ChevronDown className="w-3 h-3 text-[#8f8a80]" />
                    </button>
                  </div>
                </div>

                {/* Read-only Tools */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#8f8a80] font-medium py-1">
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Read-only tools</span>
                    <span className="text-[10px] px-1.5 rounded-full bg-[#2a2722] text-[#8f8a80]">{readTools.length}</span>
                  </div>

                  <div className="divide-y divide-[#24221c] border-t border-[#24221c]">
                    {readTools.map((tool) => (
                      <div key={tool.name} className="flex items-center justify-between py-2 text-xs">
                        <span className="text-[#b8b2a7]">{tool.name}</span>
                        <div className="flex items-center gap-1 bg-[#201e1a] p-0.5 rounded-lg border border-[#2d2b25]">
                          <button
                            type="button"
                            onClick={() => toggleToolMode('read', tool.name, 'allow')}
                            className={`p-1 rounded ${tool.mode === 'allow' ? 'bg-[#38352d] text-emerald-400' : 'text-[#6d685f] hover:text-[#ece9e2]'}`}
                            title="Always allow"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleToolMode('read', tool.name, 'ask')}
                            className={`p-1 rounded ${tool.mode === 'ask' ? 'bg-[#38352d] text-amber-400' : 'text-[#6d685f] hover:text-[#ece9e2]'}`}
                            title="Ask before running"
                          >
                            <Hand className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleToolMode('read', tool.name, 'block')}
                            className={`p-1 rounded ${tool.mode === 'block' ? 'bg-[#38352d] text-red-400' : 'text-[#6d685f] hover:text-[#ece9e2]'}`}
                            title="Block tool"
                          >
                            <Ban className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Write/delete Tools */}
                <div className="space-y-1 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#8f8a80] font-medium py-1">
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Write/delete tools</span>
                    <span className="text-[10px] px-1.5 rounded-full bg-[#2a2722] text-[#8f8a80]">{writeTools.length}</span>
                  </div>

                  <div className="divide-y divide-[#24221c] border-t border-[#24221c]">
                    {writeTools.map((tool) => (
                      <div key={tool.name} className="flex items-center justify-between py-2 text-xs">
                        <span className={`text-[#b8b2a7] ${tool.name === 'Multi Execute Composio Tools' ? 'font-semibold text-[#ece9e2]' : ''}`}>
                          {tool.name}
                        </span>
                        <div className="flex items-center gap-1 bg-[#201e1a] p-0.5 rounded-lg border border-[#2d2b25]">
                          <button
                            type="button"
                            onClick={() => toggleToolMode('write', tool.name, 'allow')}
                            className={`p-1 rounded ${tool.mode === 'allow' ? 'bg-[#38352d] text-emerald-400' : 'text-[#6d685f] hover:text-[#ece9e2]'}`}
                            title="Always allow"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleToolMode('write', tool.name, 'ask')}
                            className={`p-1 rounded ${tool.mode === 'ask' ? 'bg-[#38352d] text-amber-400' : 'text-[#6d685f] hover:text-[#ece9e2]'}`}
                            title="Ask before running"
                          >
                            <Hand className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleToolMode('write', tool.name, 'block')}
                            className={`p-1 rounded ${tool.mode === 'block' ? 'bg-[#38352d] text-red-400' : 'text-[#6d685f] hover:text-[#ece9e2]'}`}
                            title="Block tool"
                          >
                            <Ban className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
