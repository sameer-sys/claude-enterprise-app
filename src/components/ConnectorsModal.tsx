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
  Trash2
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
  status: 'connected',
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

  // Custom connector form state
  const [customName, setCustomName] = useState('composio');
  const [customUrl, setCustomUrl] = useState('https://connect.composio.dev/mcp');
  const [authMode, setAuthMode] = useState<'now' | 'needed' | 'none'>('now');
  const [oauthClientMode, setOauthClientMode] = useState<'published' | 'auto' | 'custom'>('auto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Connectors list
  const [customConnectors, setCustomConnectors] = useState<Connector[]>(() => {
    try {
      const stored = localStorage.getItem('claude_custom_connectors');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CONNECTORS;
  });

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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customUrl.trim()) return;

    setIsSubmitting(true);
    setStatusMessage('Connecting to MCP server...');

    try {
      // Create new connector object matching Claude Desktop format
      const newConnector: Connector = {
        id: `mcp-${Date.now()}`,
        name: customName.trim(),
        description: `MCP Server at ${customUrl.trim()}`,
        icon: 'composio',
        enabled: true,
        status: 'connected',
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

      // If it's Composio, initiate OAuth login handshake popup
      if (customUrl.includes('composio.dev') || customName.toLowerCase().includes('composio')) {
        const authPopup = window.open('https://login.composio.dev/', 'composio_mcp_login', 'popup,width=620,height=780,resizable=yes,scrollbars=yes');
        if (!authPopup) {
          window.open('https://login.composio.dev/', '_blank');
        }
      }

      setSelectedConnector(newConnector);
      setCurrentView('detail');
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = (connectorId: string) => {
    const updated = customConnectors.filter((c) => c.id !== connectorId);
    setCustomConnectors(updated);
    try {
      localStorage.setItem('claude_custom_connectors', JSON.stringify(updated));
    } catch {}
    setCurrentView('list');
  };

  const toggleToolMode = (type: 'read' | 'write', toolName: string, mode: 'allow' | 'ask' | 'block') => {
    if (type === 'read') {
      setReadTools((prev) => prev.map((t) => t.name === toolName ? { ...t, mode } : t));
    } else {
      setWriteTools((prev) => prev.map((t) => t.name === toolName ? { ...t, mode } : t));
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
                
                {/* + Add Button */}
                <button
                  onClick={() => setCurrentView('add')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#38352d] bg-[#25231e] hover:bg-[#322f29] text-[#ece9e2] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#cc785c]" />
                  <span>Add</span>
                  <ChevronDown className="w-3 h-3 text-[#8f8a80]" />
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
                      .map((conn) => (
                        <div
                          key={conn.id}
                          onClick={() => {
                            setSelectedConnector(conn);
                            setCurrentView('detail');
                          }}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-[#2d2b25] bg-[#1e1c18] hover:border-[#423f36] hover:bg-[#23211c] cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#2a2722] border border-[#38352d] flex items-center justify-center font-bold text-[#cc785c]">
                              <Zap className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-[#ece9e2]">{conn.name}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-medium">
                                  Connected
                                </span>
                              </div>
                              <span className="text-xs text-[#8f8a80]">{conn.config?.mcpUrl || conn.url || 'MCP Server'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-[#8f8a80]">
                            <span>Configure</span>
                            <ChevronDown className="w-4 h-4 -rotate-90" />
                          </div>
                        </div>
                      ))
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
                <h2 className="text-base font-bold text-[#ece9e2]">Add custom connector</h2>
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
            <div className="flex-1 overflow-y-auto px-8 py-5 space-y-5 text-xs text-[#b8b2a7]">
              <div>
                <p className="text-xs text-[#8f8a80]">
                  Connect Claude to your data and tools. <span className="underline cursor-pointer text-[#ece9e2]">Learn more about connectors</span> or get started with <span className="underline cursor-pointer text-[#ece9e2]" onClick={() => { setActiveTab('discover'); setCurrentView('list'); }}>pre-built ones</span>.
                </p>
              </div>

              {/* Name Field */}
              <div className="space-y-1.5">
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
                <input
                  type="url"
                  required
                  placeholder="https://connect.composio.dev/mcp"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#38352d] bg-[#1e1c18] text-[#ece9e2] placeholder-[#6d685f] focus:outline-none focus:border-[#cc785c]"
                />
                <p className="text-[11px] text-[#6d685f]">
                  The HTTPS address where the server accepts connections, e.g. https://mcp.example.com/mcp.
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
                      <p className="text-[11px] text-[#6d685f]">Claude connects without credentials first and prompts users to sign in when the server asks. Pick this for servers that offer some tools without an account.</p>
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
                      <p className="text-[11px] text-[#6d685f]">Pick this for servers with open access, or for servers that use an API key instead of OAuth.</p>
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
                      checked={oauthClientMode === 'published'}
                      onChange={() => setOauthClientMode('published')}
                      className="mt-0.5 accent-[#cc785c]"
                    />
                    <div>
                      <span className="font-medium text-[#ece9e2]">Use Claude's published identity</span>
                      <p className="text-[11px] text-[#6d685f]">The server reads Claude's client details from a URL Anthropic hosts (CIMD). Nothing to set up, but the server must support it.</p>
                    </div>
                  </label>

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
                      <p className="text-[11px] text-[#6d685f]">Claude registers OAuth clients with the server as users connect (DCR). Works with most servers, but creates many client registrations on busy ones.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="oauthClientMode"
                      checked={oauthClientMode === 'custom'}
                      onChange={() => setOauthClientMode('custom')}
                      className="mt-0.5 accent-[#cc785c]"
                    />
                    <div>
                      <span className="font-medium text-[#ece9e2]">Use your own OAuth client</span>
                      <p className="text-[11px] text-[#6d685f]">Enter a client ID you registered with the server yourself. Leave the secret blank unless your authorization server requires one.</p>
                    </div>
                  </label>
                </div>
              </div>

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
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#cc785c] hover:bg-[#b86950] text-white flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Connect</span>
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
                    <h3 className="font-bold text-base text-[#ece9e2]">{selectedConnector.name}</h3>
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

                <button
                  onClick={() => handleDisconnect(selectedConnector.id)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#38352d] hover:border-red-900/60 bg-[#201e1a] hover:bg-red-950/30 text-xs text-[#b8b2a7] hover:text-red-300 transition-colors"
                >
                  Disconnect
                </button>
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
