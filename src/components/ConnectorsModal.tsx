'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  Terminal
} from 'lucide-react';
import { Connector, ConnectorConfig } from '@/types/chat';

export interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConnectors: Connector[];
  onToggleConnector: (id: string) => void;
  onUpdateConnectorConfig?: (id: string, config: ConnectorConfig) => void;
  onAddCustomConnector?: (connector: Connector) => void;
  onResetConnectors?: () => void;
  sessionTitle?: string;
  sessionId?: string;
}

export const DEFAULT_CONNECTORS: Connector[] = [{
  id: 'conn-composio',
  name: 'composio',
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

interface PrebuiltCatalogItem {
  id: string;
  name: string;
  description: string;
  author: string;
  iconBg: string;
  isOfficial?: boolean;
}

const DISCOVER_CATALOG: PrebuiltCatalogItem[] = [
  { id: 'vidiq', name: 'vidIQ', description: 'Research and create for YouTube, Instagram & TikTok', author: 'by vidIQ', iconBg: '#0284c7', isOfficial: true },
  { id: 'hyperframes', name: 'HyperFrames by HeyGen', description: 'Build animated slides and motion graphics with HTML', author: 'by HeyGen Technologies', iconBg: '#059669', isOfficial: true },
  { id: 'resend', name: 'Resend', description: 'Email for developers. The best way to reach humans instead of spam folders.', author: 'by Resend', iconBg: '#000000', isOfficial: true },
  { id: 'fastmail', name: 'Fastmail', description: 'An MCP server for Fastmail customers and accounts', author: 'by Fastmail', iconBg: '#2563eb', isOfficial: true },
  { id: 'celigo', name: 'Celigo', description: 'Build and manage automations across hundreds of apps', author: 'by Celigo', iconBg: '#475569', isOfficial: true },
  { id: 'grasp', name: 'Grasp', description: 'Find, screen and analyse private-market opportunities', author: 'by Grasp AI', iconBg: '#334155', isOfficial: true },
  { id: 'agility', name: 'Agility CMS', description: 'AI pipelines for developers and marketers. Model content, author pages, publish...', author: 'by Agility CMS', iconBg: '#d97706', isOfficial: true },
  { id: 'spark', name: 'Spark', description: 'Connect Claude to your inbox — read, draft, triage, and act on email, calendars, meetings...', author: 'by Spark Mail Limited', iconBg: '#0284c7', isOfficial: true },
  { id: 'airmail', name: 'Airmail', description: 'Manage emails, calendars, contacts, and more from Claude using Airmail\'s MCP server.', author: 'by Airmail', iconBg: '#2563eb', isOfficial: true },
  { id: 'clipkit', name: 'Clipkit', description: 'A video toolbox for Claude: compose videos as structured JSON, validate and preview fram...', author: 'by Clipkit Inc', iconBg: '#ea580c' },
  { id: 'githits', name: 'GitHits', description: 'Version-aware index of open-source dependencies for Claude', author: 'by GitHits Inc.', iconBg: '#475569' },
  { id: 'missive', name: 'Missive', description: 'Search, analyze, and draft across your team\'s shared inboxes.', author: 'by Missive', iconBg: '#ef4444' },
];

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
  const { isOpen, onClose, onUpdateConnectorConfig, onAddCustomConnector } = props;

  // View state: 'list' (Yours/Discover) | 'add' (Add custom connector) | 'detail' (Tools & permissions view)
  const [activeTab, setActiveTab] = useState<'yours' | 'discover'>('yours');
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'detail'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Detail view state
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [readTools, setReadTools] = useState<ToolPermission[]>(DEFAULT_READ_TOOLS);
  const [writeTools, setWriteTools] = useState<ToolPermission[]>(DEFAULT_WRITE_TOOLS);
  const [globalPermission, setGlobalPermission] = useState<'Always allow' | 'Ask before run' | 'Block write'>('Always allow');

  // Add mode: 'mcp' (Remote URL) | 'cli' (Local Command / Stdio)
  const [addMode, setAddMode] = useState<'mcp' | 'cli'>('mcp');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Custom MCP connector form state
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [authMode, setAuthMode] = useState<'now' | 'needed' | 'none'>('now');
  const [oauthClientMode, setOauthClientMode] = useState<'published' | 'auto' | 'custom'>('auto');

  // Custom CLI connector form state
  const [cliName, setCliName] = useState('');
  const [cliCommand, setCliCommand] = useState('');
  const [cliArgs, setCliArgs] = useState('');
  const [cliEnv, setCliEnv] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [mcpConnected, setMcpConnected] = useState(false);

  // Connectors list
  const [customConnectors, setCustomConnectors] = useState<Connector[]>(() => {
    try {
      const stored = localStorage.getItem('claude_custom_connectors');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // Check Composio "For You" MCP status on open
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/composio', { method: 'GET', cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const isConn = Boolean(data.mcpConnected || data.mode === 'for_you');
          setMcpConnected(isConn);
          setCustomConnectors((prev) => {
            const next = prev.map((c) =>
              c.name.toLowerCase().includes('composio') || c.url?.includes('composio.dev')
                ? { ...c, status: (isConn ? 'connected' : 'idle') as 'connected' | 'idle' }
                : c
            );
            try { localStorage.setItem('claude_custom_connectors', JSON.stringify(next)); } catch {}
            return next;
          });
        }
      } catch {}
    };
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  // Listen for OAuth completion message from popup
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'sameer-composio-mcp-connected') {
        if (event.data?.status === 'success') {
          setMcpConnected(true);
          setStatusMessage('Successfully connected to Composio "For You"!');
          setCustomConnectors((prev) => {
            const next = prev.map((c) =>
              c.name.toLowerCase().includes('composio') || c.url?.includes('composio.dev')
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
          authMode,
          oauthClientMode,
        },
        url: customUrl.trim(),
      };

      const updated = [newConnector, ...customConnectors.filter((c) => c.name.toLowerCase() !== newConnector.name.toLowerCase())];
      setCustomConnectors(updated);
      try {
        localStorage.setItem('claude_custom_connectors', JSON.stringify(updated));
      } catch {}

      if (onAddCustomConnector) {
        onAddCustomConnector(newConnector);
      }

      // If it's Composio, initiate the real OAuth PKCE flow
      if (customUrl.includes('composio.dev') || customName.toLowerCase().includes('composio')) {
        await startComposioOAuth();
      }

      setSelectedConnector(newConnector);
      setCurrentView('detail');
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCliSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliName.trim() || !cliCommand.trim()) return;

    setIsSubmitting(true);
    setStatusMessage('Configuring CLI connector...');

    try {
      const parsedEnv: Record<string, string> = {};
      if (cliEnv.trim()) {
        cliEnv.split('\n').forEach((line) => {
          const [k, ...v] = line.split('=');
          if (k && v.length) parsedEnv[k.trim()] = v.join('=').trim();
        });
      }

      const newConnector: Connector = {
        id: `cli-${Date.now()}`,
        name: cliName.trim(),
        description: `Local CLI Command: ${cliCommand.trim()} ${cliArgs.trim()}`,
        icon: 'terminal',
        enabled: true,
        status: 'connected',
        category: 'Developer Tools',
        section: 'custom',
        isCustom: true,
        isVerified: true,
        provider: 'mcp',
        capabilities: ['CLI Execution', 'Local Stdio', 'Automations'],
        config: {
          connectionType: 'cli',
          providerName: cliName.trim(),
          command: cliCommand.trim(),
          args: cliArgs.trim().split(/\s+/).filter(Boolean),
          env: parsedEnv,
        },
        url: `cli://${cliCommand.trim()}`,
      };

      const updated = [newConnector, ...customConnectors.filter((c) => c.name.toLowerCase() !== newConnector.name.toLowerCase())];
      setCustomConnectors(updated);
      try {
        localStorage.setItem('claude_custom_connectors', JSON.stringify(updated));
      } catch {}

      if (onAddCustomConnector) {
        onAddCustomConnector(newConnector);
      }

      setStatusMessage('CLI connector successfully configured!');
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
    if (conn && (conn.name.toLowerCase().includes('composio') || conn.url?.includes('composio.dev'))) {
      try {
        await fetch('/api/composio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disconnect_mcp' }),
        });
        setMcpConnected(false);
      } catch {}
    }

    const updated = customConnectors.filter((c) => c.id !== connectorId);
    setCustomConnectors(updated);
    try {
      localStorage.setItem('claude_custom_connectors', JSON.stringify(updated));
    } catch {}
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
                {/* Tabs */}
                <div className="flex items-center bg-[#25231e] p-0.5 rounded-lg border border-[#38352d]">
                  <button
                    onClick={() => setActiveTab('yours')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'yours' 
                        ? 'bg-[#38352d] text-[#ece9e2] shadow-sm' 
                        : 'text-[#8f8a80] hover:text-[#ece9e2]'
                    }`}
                  >
                    Yours
                  </button>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'discover' 
                        ? 'bg-[#38352d] text-[#ece9e2] shadow-sm' 
                        : 'text-[#8f8a80] hover:text-[#ece9e2]'
                    }`}
                  >
                    Discover
                  </button>
                </div>
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
                
                {/* + Add Button with Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#38352d] bg-[#25231e] hover:bg-[#322f29] text-[#ece9e2] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#cc785c]" />
                    <span>Add</span>
                    <ChevronDown className="w-3 h-3 text-[#8f8a80]" />
                  </button>

                  {isAddMenuOpen && (
                    <div 
                      className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-[#38352d] bg-[#1a1915] shadow-2xl py-1.5 z-50 text-xs text-[#ece9e2] animate-in fade-in zoom-in-95 duration-100"
                      onMouseLeave={() => setIsAddMenuOpen(false)}
                    >
                      <button
                        onClick={() => {
                          setAddMode('mcp');
                          setCurrentView('add');
                          setIsAddMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-[#25231e] flex items-center gap-3 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#2a2722] border border-[#38352d] flex items-center justify-center shrink-0">
                          <Zap className="w-3.5 h-3.5 text-[#cc785c]" />
                        </div>
                        <div>
                          <div className="font-semibold text-[#f2eee6]">Add MCP Connector</div>
                          <div className="text-[11px] text-[#8f8a80]">Remote URL (Composio, Notion, SSE)</div>
                        </div>
                      </button>

                      <div className="h-px bg-[#282620] my-1" />

                      <button
                        onClick={() => {
                          setAddMode('cli');
                          setCurrentView('add');
                          setIsAddMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-[#25231e] flex items-center gap-3 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#222a22] border border-[#2d382d] flex items-center justify-center shrink-0">
                          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-[#f2eee6]">Add CLI Connector</div>
                          <div className="text-[11px] text-[#8f8a80]">Local Command, Composio CLI & Stdio</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

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
              {activeTab === 'yours' ? (
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
                      .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((conn) => {
                        const isCli = conn.config?.connectionType === 'cli' || conn.url?.startsWith('cli://');
                        const isComposio = !isCli && (conn.name.toLowerCase().includes('composio') || conn.url?.includes('composio.dev'));
                        const isConnected = isCli ? true : (isComposio ? mcpConnected : (conn.status === 'connected'));

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
                              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center font-bold ${
                                isCli ? 'bg-[#1e281e] border-[#2d3a2d] text-emerald-400' : 'bg-[#2a2722] border-[#38352d] text-[#cc785c]'
                              }`}>
                                {isCli ? <Terminal className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-[#ece9e2]">{conn.name}</span>
                                  {isConnected ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-medium">
                                      {isCli ? 'CLI (Connected)' : (isComposio ? 'Connected (For You)' : 'Connected')}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800 text-amber-400 font-medium">
                                      Sign in needed
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-[#8f8a80]">
                                  {isCli
                                    ? `Command: ${conn.config?.command || 'cli'} ${Array.isArray(conn.config?.args) ? conn.config.args.join(' ') : ''}`
                                    : (conn.config?.mcpUrl || conn.url || 'MCP Server')}
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
              ) : (
                /* Discover Tab Grid */
                <div className="grid grid-cols-2 gap-3 pb-6">
                  {DISCOVER_CATALOG
                    .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-[#2d2b25] bg-[#1e1c18] hover:border-[#38352d] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm"
                              style={{ backgroundColor: item.iconBg }}
                            >
                              {item.name.slice(0, 2).toUpperCase()}
                            </div>
                            <button
                              onClick={() => {
                                setCustomName(item.name.toLowerCase().replace(/\s+/g, '-'));
                                setCustomUrl(`https://mcp.${item.id}.com/mcp`);
                                setCurrentView('add');
                              }}
                              className="p-1.5 rounded-lg border border-[#38352d] bg-[#25231e] hover:bg-[#322f29] text-[#ece9e2]"
                              title="Add connector"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="mt-2.5 flex items-center gap-1.5">
                            <h3 className="font-semibold text-sm text-[#ece9e2]">{item.name}</h3>
                            {item.isOfficial && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                          </div>
                          <p className="mt-1 text-xs text-[#8f8a80] line-clamp-2 leading-relaxed">{item.description}</p>
                        </div>
                        <span className="mt-3 text-[11px] text-[#6d685f]">{item.author}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: ADD CUSTOM CONNECTOR (FRAME 7 & 9 FROM VIDEO)     */}
        {/* ========================================================= */}
        {currentView === 'add' && (
          <form onSubmit={addMode === 'cli' ? handleCliSubmit : handleAddSubmit} className="flex flex-col h-full">
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
                  {addMode === 'cli' ? 'Add CLI Connector (Local / Stdio)' : 'Add Custom MCP Connector'}
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

            {/* Type Switcher Tabs */}
            <div className="flex items-center px-8 pt-3 pb-2 border-b border-[#282620] bg-[#141310]">
              <div className="flex items-center bg-[#1e1c18] p-1 rounded-xl border border-[#38352d] w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setAddMode('mcp')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    addMode === 'mcp'
                      ? 'bg-[#38352d] text-[#ece9e2] shadow-sm'
                      : 'text-[#8f8a80] hover:text-[#ece9e2]'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-[#cc785c]" />
                  <span>Remote MCP Server</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('cli')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    addMode === 'cli'
                      ? 'bg-[#38352d] text-[#ece9e2] shadow-sm'
                      : 'text-[#8f8a80] hover:text-[#ece9e2]'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CLI / Local Command</span>
                </button>
              </div>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4 text-xs text-[#b8b2a7]">
              {addMode === 'mcp' ? (
                <>
                  <div>
                    <p className="text-xs text-[#8f8a80]">
                      Connect Claude to your data and tools via Model Context Protocol (MCP). <span className="underline cursor-pointer text-[#ece9e2]">Learn more about connectors</span> or get started with <span className="underline cursor-pointer text-[#ece9e2]" onClick={() => { setActiveTab('discover'); setCurrentView('list'); }}>pre-built ones</span>.
                    </p>
                  </div>

                  {/* Name Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#dcd8ce]">Connector Name</label>
                    <input
                      type="text"
                      required
                      placeholder="composio"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18] text-[#ece9e2] placeholder-[#6d685f] focus:outline-none focus:border-[#cc785c]"
                    />
                    <p className="text-[11px] text-[#6d685f]">Shown in the connectors list.</p>
                  </div>

                  {/* URL Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#dcd8ce]">Server URL (SSE / HTTP)</label>
                    <input
                      type="url"
                      required
                      placeholder="https://connect.composio.dev/mcp"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18] text-[#ece9e2] placeholder-[#6d685f] focus:outline-none focus:border-[#cc785c]"
                    />
                    <p className="text-[11px] text-[#6d685f]">
                      The HTTPS address where the server accepts connections, e.g. https://connect.composio.dev/mcp.
                    </p>
                  </div>

                  {/* Authentication */}
                  <div className="space-y-2 pt-2 border-t border-[#2d2b25]">
                    <div className="flex items-center gap-1.5 font-semibold text-[#ece9e2]">
                      <span>Authentication</span>
                      <span className="w-3.5 h-3.5 rounded-full border border-[#4a463d] flex items-center justify-center text-[10px] text-[#8f8a80]">i</span>
                    </div>

                    <div className="space-y-2.5">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="authMode"
                          checked={authMode === 'now'}
                          onChange={() => setAuthMode('now')}
                          className="mt-0.5 accent-[#cc785c]"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[#ece9e2]">Sign in now</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2e2a22] text-[#cc785c] border border-[#4a4133]">Detected</span>
                          </div>
                          <p className="text-[11px] text-[#6d685f]">Each user signs in through the server's OAuth flow before they can use any tools or resources.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="authMode"
                          checked={authMode === 'needed'}
                          onChange={() => setAuthMode('needed')}
                          className="mt-0.5 accent-[#cc785c]"
                        />
                        <div>
                          <span className="font-medium text-[#ece9e2]">Sign in when needed</span>
                          <p className="text-[11px] text-[#6d685f]">Claude connects without credentials first and prompts users to sign in when the server asks.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="authMode"
                          checked={authMode === 'none'}
                          onChange={() => setAuthMode('none')}
                          className="mt-0.5 accent-[#cc785c]"
                        />
                        <div>
                          <span className="font-medium text-[#ece9e2]">No sign-in</span>
                          <p className="text-[11px] text-[#6d685f]">Pick this for servers with open access or API key auth.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* OAuth Client */}
                  <div className="space-y-2 pt-2 border-t border-[#2d2b25]">
                    <div className="flex items-center gap-1.5 font-semibold text-[#ece9e2]">
                      <span>OAuth client</span>
                      <span className="w-3.5 h-3.5 rounded-full border border-[#4a463d] flex items-center justify-center text-[10px] text-[#8f8a80]">i</span>
                    </div>

                    <div className="space-y-2.5">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="oauthClientMode"
                          checked={oauthClientMode === 'auto'}
                          onChange={() => setOauthClientMode('auto')}
                          className="mt-0.5 accent-[#cc785c]"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[#ece9e2]">Register automatically</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2e2a22] text-[#cc785c] border border-[#4a4133]">Detected</span>
                          </div>
                          <p className="text-[11px] text-[#6d685f]">Claude registers OAuth clients with the server as users connect (DCR).</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="oauthClientMode"
                          checked={oauthClientMode === 'published'}
                          onChange={() => setOauthClientMode('published')}
                          className="mt-0.5 accent-[#cc785c]"
                        />
                        <div>
                          <span className="font-medium text-[#ece9e2]">Use Claude's published identity</span>
                          <p className="text-[11px] text-[#6d685f]">The server reads Claude's client details from CIMD.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                /* CLI Connector Form */
                <>
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 flex items-start gap-3">
                    <Terminal className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-xs text-emerald-300">Local CLI & Stdio MCP Server</div>
                      <p className="text-[11px] text-[#8f8a80] mt-0.5 leading-relaxed">
                        Connect local CLI toolkits, Composio CLI (<code className="text-emerald-400">composio run</code>), Claude Code, or stdio packages. Tools are executed directly in your environment.
                      </p>
                    </div>
                  </div>

                  {/* 1-Click Quick Presets */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#dcd8ce]">Quick Presets</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: '⚡ Composio CLI', name: 'composio-cli', command: 'composio', args: 'run' },
                        { label: '💻 Claude Code', name: 'claude-code', command: 'npx', args: '-y @anthropic-ai/claude-code' },
                        { label: '🐙 GitHub MCP', name: 'github-mcp', command: 'npx', args: '-y @modelcontextprotocol/server-github' },
                        { label: '🐘 PostgreSQL', name: 'postgres-mcp', command: 'npx', args: '-y @modelcontextprotocol/server-postgres postgresql://localhost/mydb' },
                        { label: '💾 SQLite', name: 'sqlite-mcp', command: 'uvx', args: 'mcp-server-sqlite --db-path ./data.db' },
                        { label: '📁 Filesystem', name: 'filesystem-mcp', command: 'npx', args: '-y @modelcontextprotocol/server-filesystem ./' },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setCliName(preset.name);
                            setCliCommand(preset.command);
                            setCliArgs(preset.args);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#22201b] hover:bg-[#2c2a23] border border-[#38352d] text-[11px] text-[#dcd8ce] hover:text-white transition-all"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CLI Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#dcd8ce]">Connector Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. composio-cli or postgres-local"
                      value={cliName}
                      onChange={(e) => setCliName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18] text-[#ece9e2] placeholder-[#6d685f] focus:outline-none focus:border-[#cc785c]"
                    />
                  </div>

                  {/* CLI Command */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#dcd8ce]">Command (Executable)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. composio, npx, uvx, python"
                      value={cliCommand}
                      onChange={(e) => setCliCommand(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18] font-mono text-xs text-[#ece9e2] placeholder-[#6d685f] focus:outline-none focus:border-[#cc785c]"
                    />
                    <p className="text-[11px] text-[#6d685f]">The binary or CLI command executed in the environment.</p>
                  </div>

                  {/* CLI Arguments */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#dcd8ce]">Arguments (Flags & Params)</label>
                    <input
                      type="text"
                      placeholder="e.g. run OR -y @modelcontextprotocol/server-postgres postgresql://localhost/db"
                      value={cliArgs}
                      onChange={(e) => setCliArgs(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18] font-mono text-xs text-[#ece9e2] placeholder-[#6d685f] focus:outline-none focus:border-[#cc785c]"
                    />
                  </div>

                  {/* Environment Variables */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#dcd8ce]">Environment Variables (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="KEY=VALUE (one per line, e.g. GITHUB_TOKEN=ghp_...)"
                      value={cliEnv}
                      onChange={(e) => setCliEnv(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18] font-mono text-xs text-[#ece9e2] placeholder-[#6d685f] focus:outline-none focus:border-[#cc785c] resize-none"
                    />
                  </div>
                </>
              )}

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
                <span>{addMode === 'cli' ? 'Add CLI Connector' : 'Connect'}</span>
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
                      {selectedConnector.name.toLowerCase().includes('composio') && (
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
