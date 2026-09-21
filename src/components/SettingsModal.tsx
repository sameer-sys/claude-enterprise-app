'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Shield,
  ExternalLink,
  Check,
  Zap,
  Cloud,
  Database,
  RefreshCw,
  Cpu,
  Github,
  Globe,
  HardDrive,
  MessageSquare,
  FolderKanban,
  FileCode,
  Sparkles,
  Terminal,
  CheckCircle2,
  Sliders,
  Power,
  Search,
  Settings,
  Crown,
  User,
  Brain,
  Smartphone,
  Monitor,
  ChevronRight,
  Radio,
  SlidersHorizontal,
  Code2,
  Lock,
  Mail,
} from 'lucide-react';
import { Connector, ConnectorConfig, ThinkingBudget } from '@/types/chat';
import { createDefaultConnectors } from '@/components/ConnectorsModal';

export type SettingsTab =
  | 'preferences'
  | 'advanced'
  | 'account'
  | 'capabilities'
  | 'claudecode'
  | 'desktop'
  | 'developer'
  | 'skills'
  | 'connectors'
  | 'plugins'
  | 'apikeys'
  | 'general'
  | 'models'
  | 'sync'
  | 'reasoning';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
  geminiKey: string;
  onSaveGeminiKey: (key: string) => void;
  openRouterKey: string;
  onSaveOpenRouterKey: (key: string) => void;
  syncRoomId?: string;
  onSaveSyncRoomId?: (roomId: string) => void;
  supabaseUrl?: string;
  onSaveSupabaseUrl?: (url: string) => void;
  supabaseKey?: string;
  onSaveSupabaseKey?: (key: string) => void;
  onTriggerSyncNow?: () => void;
  syncStatus?: string;
  // Connectors integration
  activeConnectors?: Connector[];
  onToggleConnector?: (id: string) => void;
  onUpdateConnectorConfig?: (id: string, config: ConnectorConfig) => void;
  sessionTitle?: string;
  // Reasoning & Autonomy
  thinkingBudget?: ThinkingBudget;
  onSelectThinkingBudget?: (budget: ThinkingBudget) => void;
  isProactiveMode?: boolean;
  onToggleProactiveMode?: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  initialTab = 'preferences',
  geminiKey,
  onSaveGeminiKey,
  openRouterKey,
  onSaveOpenRouterKey,
  syncRoomId = 'sameer-workspace-pro',
  onSaveSyncRoomId,
  supabaseUrl = '',
  onSaveSupabaseUrl,
  supabaseKey = '',
  onSaveSupabaseKey,
  onTriggerSyncNow,
  syncStatus = 'Ready',
  activeConnectors = [],
  onToggleConnector,
  onUpdateConnectorConfig,
  sessionTitle = 'Current Chat',
  thinkingBudget = 16000,
  onSelectThinkingBudget,
  isProactiveMode = true,
  onToggleProactiveMode,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'preferences');
  const [gKey, setGKey] = useState(geminiKey);
  const [orKey, setOrKey] = useState(openRouterKey);
  const [roomId, setRoomId] = useState(syncRoomId);
  const [subUrl, setSubUrl] = useState(supabaseUrl);
  const [subKey, setSubKey] = useState(supabaseKey);
  const [saved, setSaved] = useState(false);

  // Official Preferences UI state (matching screenshot)
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('dark');
  const [chatFont, setChatFont] = useState('Anthropic Serif');
  const [motion, setMotion] = useState<'system' | 'reduced'>('system');
  const [voiceLang, setVoiceLang] = useState('English');
  const [voiceStyle, setVoiceStyle] = useState('Buttery');
  const [voiceSpeed, setVoiceSpeed] = useState('Normal');
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [navSearch, setNavSearch] = useState('');

  // Advanced & Superpowers state
  const [godModeOn, setGodModeOn] = useState(true);
  const [webBypasserOn, setWebBypasserOn] = useState(true);
  const [autoFailoverOn, setAutoFailoverOn] = useState(true);
  const [contextExpansionOn, setContextExpansionOn] = useState(true);

  // Connectors tab sub-state
  const [connectorViewTab, setConnectorViewTab] = useState<'installed' | 'directory' | 'custom_mcp'>('installed');
  const [connectorSearch, setConnectorSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingConnector, setEditingConnector] = useState<Connector | null>(null);
  const [customRepo, setCustomRepo] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customMcpCommand, setCustomMcpCommand] = useState('');
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Sync state when props change
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    setGKey(geminiKey);
    setOrKey(openRouterKey);
    setRoomId(syncRoomId);
    setSubUrl(supabaseUrl);
    setSubKey(supabaseKey);
  }, [geminiKey, openRouterKey, syncRoomId, supabaseUrl, supabaseKey]);

  if (!isOpen) return null;

  const currentConnectors = activeConnectors.length > 0 ? activeConnectors : createDefaultConnectors();
  const activeCount = currentConnectors.filter((c) => c.enabled).length;

  const categories = [
    { id: 'all', label: 'All Connectors' },
    { id: 'Productivity', label: 'Productivity (Drive, Slack, Notion)' },
    { id: 'Developer Tools', label: 'Developer Tools (GitHub, Filesystem)' },
    { id: 'Intelligence', label: 'Intelligence & Live Web' },
    { id: 'System & MCP', label: 'Model Context Protocol (MCP)' },
  ];

  const filteredConnectors = currentConnectors.filter((conn) => {
    if (connectorViewTab === 'installed' && !conn.enabled) return false;
    if (selectedCategory !== 'all' && conn.category !== selectedCategory) return false;
    if (!connectorSearch.trim()) return true;
    const q = connectorSearch.toLowerCase();
    return (
      conn.name.toLowerCase().includes(q) ||
      conn.description.toLowerCase().includes(q) ||
      conn.category.toLowerCase().includes(q)
    );
  });

  const handleOpenConfig = (conn: Connector) => {
    setEditingConnector(conn);
    setCustomRepo(conn.config?.repo || 'sameer-sys/claude-enterprise-app');
    setCustomEmail(conn.config?.email || '');
    setCustomMcpCommand(conn.config?.command || 'npx -y @modelcontextprotocol/server-everything');
    setCustomServerUrl(conn.config?.serverUrl || 'http://127.0.0.1:20128/v1');
    setTestResult(null);
  };

  const handleSaveConfig = () => {
    if (!editingConnector || !onUpdateConnectorConfig) return;
    const newConfig: ConnectorConfig = {
      ...editingConnector.config,
      repo: customRepo,
      email: customEmail,
      command: customMcpCommand,
      serverUrl: customServerUrl,
    };
    onUpdateConnectorConfig(editingConnector.id, newConfig);
    setEditingConnector(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const connectorId = editingConnector?.id || '';

      if (connectorId === 'conn-omniroute') {
        const target = customServerUrl.trim() || 'http://127.0.0.1:20128/v1';
        try {
          const probe = await fetch(target, { method: 'GET', cache: 'no-store' });
          setTestResult(`OmniRoute probe returned HTTP ${probe.status} from ${target}. The endpoint is reachable.`);
        } catch (err: any) {
          setTestResult(`OmniRoute could not be reached at ${target}: ${err?.message || 'connection failed'}.`);
        }
      } else {
        const res = await fetch('/api/connectors/status', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const connection = data?.connections?.[connectorId];

        if (connection?.connected) {
          const account = connection.account || {};
          const label = account.email || account.username || account.name || account.label || 'authorized account';
          setTestResult(`Direct first-party connection verified for ${label}.`);
        } else if (data?.supportedOAuthConnectors?.includes?.(connectorId)) {
          setTestResult('No direct first-party OAuth account is connected for this connector yet.');
        } else if (connectorId === 'conn-github') {
        const target = customRepo || 'sameer-sys/claude-enterprise-app';
        const res = await fetch(`https://api.github.com/repos/${target}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setTestResult(`Public GitHub repository is reachable: ${data.full_name} (default branch ${data.default_branch}).`);
        } else {
          setTestResult(`GitHub repository lookup returned HTTP ${res.status}.`);
        }
      } else {
        setTestResult('No live connector test is available for this connector yet.');
      }
    } catch (e: any) {
      setTestResult(e?.message || 'Connector test failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveGeminiKey(gKey.trim());
    onSaveOpenRouterKey(orKey.trim());
    if (onSaveSyncRoomId) onSaveSyncRoomId(roomId.trim());
    if (onSaveSupabaseUrl) onSaveSupabaseUrl(subUrl.trim());
    if (onSaveSupabaseKey) onSaveSupabaseKey(subKey.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  interface SettingItem {
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    isExternal?: boolean;
  }

  interface SettingGroup {
    group: string;
    items: SettingItem[];
  }

  const settingGroups: SettingGroup[] = [
    {
      group: 'Settings',
      items: [
        { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
        { id: 'advanced', label: 'Advanced & Superpowers', icon: Zap, badge: 'PRO' },
        { id: 'account', label: 'Account & Data', icon: User },
        { id: 'capabilities', label: 'Capabilities', icon: Brain },
        { id: 'claudecode', label: 'Claude Code', icon: Code2 },
      ],
    },
    {
      group: 'Desktop app',
      items: [
        { id: 'desktop', label: 'General', icon: Monitor },
        { id: 'developer', label: 'Developer & Sync', icon: Terminal },
      ],
    },
    {
      group: 'Customize',
      items: [
        { id: 'connectors', label: 'Connectors', icon: Cpu, badge: `${activeCount} on` },
        { id: 'skills', label: 'Skills', icon: FileCode },
        { id: 'plugins', label: 'Plugins', icon: Zap },
      ],
    },
    {
      group: 'Platform',
      items: [
        { id: 'apikeys', label: 'API keys', icon: Key, isExternal: true },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl h-[86vh] rounded-2xl bg-[#1a1916] border border-[#2d2b24] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Sidebar Navigation (Exact match to official Claude screenshot) */}
        <div className="w-full md:w-56 bg-[#141311] border-b md:border-b-0 md:border-r border-[#26241e] flex flex-col shrink-0 select-none">
          {/* Top Search Box */}
          <div className="p-3 border-b border-[#201f1b]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7d786e]" />
              <input
                type="text"
                placeholder="Search"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#201f1b] border border-[#2c2a23] text-xs text-[#ece9e2] placeholder-[#7d786e] focus:outline-none focus:border-[#cc785c]/60"
              />
            </div>
          </div>

          {/* Grouped Navigation */}
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
            {settingGroups.map((grp) => {
              const visibleItems = grp.items.filter((item) =>
                !navSearch.trim() || item.label.toLowerCase().includes(navSearch.toLowerCase())
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={grp.group} className="space-y-0.5">
                  <div className="px-2 pb-1 text-[11px] font-medium text-[#736e63]">
                    {grp.group}
                  </div>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      activeTab === item.id ||
                      (item.id === 'preferences' && activeTab === 'general') ||
                      (item.id === 'apikeys' && activeTab === 'models') ||
                      (item.id === 'developer' && activeTab === 'sync') ||
                      (item.id === 'capabilities' && activeTab === 'reasoning');

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                          isActive
                            ? 'bg-[#292721] text-[#f4efe6] font-semibold'
                            : 'text-[#9c978b] hover:bg-[#1d1c18] hover:text-[#ece9e2]'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#cc785c]' : 'text-[#827d73]'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            {item.badge}
                          </span>
                        )}
                        {item.isExternal && (
                          <ExternalLink className="w-3 h-3 text-[#7d786e]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Bottom Account & Free Status */}
          <div className="p-3 border-t border-[#201f1b] bg-[#11100e]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-[#cc785c] text-black font-bold text-[10px] flex items-center justify-center">
                  S
                </div>
                <div>
                  <div className="text-xs font-medium text-[#ece9e2]">Sameer</div>
                  <div className="text-[10px] text-emerald-400 font-mono">Pro Max • Free</div>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                $0
              </span>
            </div>
          </div>
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#181714]">
          {/* Top Bar with Close Button */}
          <div className="px-6 py-3.5 border-b border-[#24231f] flex items-center justify-between shrink-0">
            <h2 className="text-sm font-semibold text-[#f4efe6]">
              {(activeTab === 'preferences' || activeTab === 'general') && 'Preferences'}
              {activeTab === 'account' && 'Account & Data'}
              {activeTab === 'capabilities' && 'Capabilities'}
              {activeTab === 'claudecode' && 'Claude Code'}
              {activeTab === 'desktop' && 'Desktop App'}
              {activeTab === 'developer' && 'Developer & Sync'}
              {activeTab === 'skills' && 'Skills'}
              {activeTab === 'connectors' && 'Connectors & Model Context Protocol (MCP)'}
              {activeTab === 'plugins' && 'Plugins'}
              {(activeTab === 'apikeys' || activeTab === 'models') && 'API Keys & Quotas'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#252420] text-[#9c978b] hover:text-[#ece9e2] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* ========================================================================= */}
            {/* TAB 1: GENERAL & PROFILE */}
            {/* ========================================================================= */}
            {/* ========================================================================= */}
            {/* TAB: PREFERENCES (Matches official Claude UI screenshot exactly) */}
            {/* ========================================================================= */}
            {(activeTab === 'preferences' || activeTab === 'general') && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-base font-semibold text-[#f4efe6] mb-1">Preferences</h3>
                  <p className="text-xs text-[#8a8579]">Customize your appearance, voice output, and system notifications.</p>
                </div>

                {/* Appearance Section */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9c978b]">Appearance</h4>

                  {/* Theme */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-medium text-[#dcd8ce]">Theme</span>
                    <div className="flex items-center p-1 rounded-xl bg-[#141310] border border-[#2c2a23]">
                      {(['system', 'light', 'dark'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTheme(t)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                            theme === t
                              ? 'bg-[#292721] text-[#f4efe6] shadow-sm font-semibold'
                              : 'text-[#8a8579] hover:text-[#ece9e2]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat Font */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-medium text-[#dcd8ce]">Chat font</span>
                    <div className="relative">
                      <select
                        value={chatFont}
                        onChange={(e) => setChatFont(e.target.value)}
                        className="appearance-none px-3.5 py-1.5 pr-8 rounded-xl bg-[#141310] border border-[#2c2a23] text-xs font-medium text-[#ece9e2] focus:outline-none focus:border-[#cc785c]/60 cursor-pointer"
                      >
                        <option value="Anthropic Serif">Anthropic Serif</option>
                        <option value="System Sans-serif">System Sans-serif</option>
                        <option value="System Monospace">System Monospace</option>
                        <option value="Claude Modern">Claude Modern</option>
                      </select>
                      <ChevronRight className="w-3.5 h-3.5 text-[#7d786e] absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  {/* Motion */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-medium text-[#dcd8ce]">Motion</span>
                    <div className="flex items-center p-1 rounded-xl bg-[#141310] border border-[#2c2a23]">
                      {(['system', 'reduced'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMotion(m)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                            motion === m
                              ? 'bg-[#292721] text-[#f4efe6] shadow-sm font-semibold'
                              : 'text-[#8a8579] hover:text-[#ece9e2]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Voice Section */}
                <div className="space-y-4 pt-4 border-t border-[#24231f]">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9c978b]">Voice</h4>

                  {/* Language */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-medium text-[#dcd8ce]">Language</span>
                    <div className="relative">
                      <select
                        value={voiceLang}
                        onChange={(e) => setVoiceLang(e.target.value)}
                        className="appearance-none px-3.5 py-1.5 pr-8 rounded-xl bg-[#141310] border border-[#2c2a23] text-xs font-medium text-[#ece9e2] focus:outline-none focus:border-[#cc785c]/60 cursor-pointer"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Hindi">Hindi</option>
                      </select>
                      <ChevronRight className="w-3.5 h-3.5 text-[#7d786e] absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  {/* Style */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-medium text-[#dcd8ce]">Style</span>
                    <div className="relative">
                      <select
                        value={voiceStyle}
                        onChange={(e) => setVoiceStyle(e.target.value)}
                        className="appearance-none px-3.5 py-1.5 pr-8 rounded-xl bg-[#141310] border border-[#2c2a23] text-xs font-medium text-[#ece9e2] focus:outline-none focus:border-[#cc785c]/60 cursor-pointer"
                      >
                        <option value="Buttery">Buttery</option>
                        <option value="Crisp">Crisp</option>
                        <option value="Natural">Natural</option>
                        <option value="Calm">Calm</option>
                        <option value="Direct">Direct</option>
                      </select>
                      <ChevronRight className="w-3.5 h-3.5 text-[#7d786e] absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  {/* Speed */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-medium text-[#dcd8ce]">Speed</span>
                    <div className="relative">
                      <select
                        value={voiceSpeed}
                        onChange={(e) => setVoiceSpeed(e.target.value)}
                        className="appearance-none px-3.5 py-1.5 pr-8 rounded-xl bg-[#141310] border border-[#2c2a23] text-xs font-medium text-[#ece9e2] focus:outline-none focus:border-[#cc785c]/60 cursor-pointer"
                      >
                        <option value="0.8x">0.8x</option>
                        <option value="Normal">Normal</option>
                        <option value="1.2x">1.2x</option>
                        <option value="1.5x">1.5x</option>
                      </select>
                      <ChevronRight className="w-3.5 h-3.5 text-[#7d786e] absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Notifications Section */}
                <div className="space-y-4 pt-4 border-t border-[#24231f]">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9c978b]">Notifications</h4>

                  <div className="flex items-center justify-between py-1">
                    <div className="max-w-md pr-4">
                      <div className="text-xs font-medium text-[#dcd8ce]">Response completions</div>
                      <div className="text-[11px] text-[#8a8579] mt-0.5 leading-relaxed">
                        Get notified when Claude finishes responding while you're in another tab or window.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationsOn(!notificationsOn)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notificationsOn ? 'bg-[#cc785c]' : 'bg-[#2a2923]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notificationsOn ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: ADVANCED & SUPERPOWERS */}
            {/* ========================================================================= */}
            {activeTab === 'advanced' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-semibold text-[#f4efe6]">Advanced & Superpowers</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      Enterprise Unrestricted
                    </span>
                  </div>
                  <p className="text-xs text-[#8a8579] mt-0.5">
                    Configure web bypassers, developer god mode, multi-model auto-failover, and reasoning depths.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* 1. Live Web Bypasser & Scraper */}
                  <div className="p-4 rounded-xl bg-[#141310] border border-[#282620] flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-semibold text-[#f2eee6]">Live Web Bypasser & Scraper</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          Active
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8a8579] leading-relaxed">
                        Whenever you paste any URL or article link in chat, the server automatically bypasses CORS, paywalls, and script blockers to scrape clean text and feed it directly into Claude.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !webBypasserOn;
                        setWebBypasserOn(next);
                        localStorage.setItem('claude_web_bypasser', String(next));
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        webBypasserOn ? 'bg-[#cc785c]' : 'bg-[#2a2923]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          webBypasserOn ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 2. Unrestricted Developer God Mode */}
                  <div className="p-4 rounded-xl bg-[#141310] border border-[#282620] flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Terminal className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-semibold text-[#f2eee6]">Unrestricted Developer God Mode</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                          Zero Refusal
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8a8579] leading-relaxed">
                        Removes AI guardrail refusals for advanced security analysis, system vulnerability audits, and produces 100% complete, runnable code files with zero placeholders or omissions.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !godModeOn;
                        setGodModeOn(next);
                        localStorage.setItem('claude_god_mode', String(next));
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        godModeOn ? 'bg-[#cc785c]' : 'bg-[#2a2923]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          godModeOn ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 3. Multi-Engine Auto-Failover Bypass */}
                  <div className="p-4 rounded-xl bg-[#141310] border border-[#282620] flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-[#f2eee6]">Multi-Engine Auto-Failover Bypass</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Zero Downtime
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8a8579] leading-relaxed">
                        Automatically cascades requests across Gemini 2.5 Flash, Gemini 2.5 Pro, OpenRouter free models, and OmniRoute so you never hit a rate limit or service interruption.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !autoFailoverOn;
                        setAutoFailoverOn(next);
                        localStorage.setItem('claude_auto_failover', String(next));
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        autoFailoverOn ? 'bg-[#cc785c]' : 'bg-[#2a2923]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          autoFailoverOn ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 4. Extreme Reasoning Depth (64k Tokens) */}
                  <div className="p-4 rounded-xl bg-[#141310] border border-[#282620] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Brain className="w-4 h-4 text-[#cc785c]" />
                        <span className="text-xs font-semibold text-[#f2eee6]">Thinking Budget Allocation</span>
                      </div>
                      <span className="text-xs font-mono text-[#cc785c] font-bold">
                        {thinkingBudget.toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {[8000, 16000, 32000, 64000].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => onSelectThinkingBudget?.(b as ThinkingBudget)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium border transition-all ${
                            thinkingBudget === b
                              ? 'bg-[#cc785c]/20 border-[#cc785c] text-[#f4efe6] font-bold shadow-xs'
                              : 'bg-[#181714] border-[#2c2a23] text-[#8a8579] hover:text-[#ece9e2]'
                          }`}
                        >
                          {b >= 1000 ? `${b / 1000}k` : b}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#8a8579]">
                      Extended thinking allows Claude to reason through complex system architectures, algorithms, and logic trees prior to answering.
                    </p>
                  </div>

                  {/* 5. 1,000,000 Tokens Context Expansion */}
                  <div className="p-4 rounded-xl bg-[#141310] border border-[#282620] flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-[#f2eee6]">1,000,000 Token Ultra-Long Context</span>
                      </div>
                      <p className="text-[11px] text-[#8a8579] leading-relaxed">
                        Retains whole code repositories, lengthy technical logs, and hundreds of chat turns in active attention memory without truncation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !contextExpansionOn;
                        setContextExpansionOn(next);
                        localStorage.setItem('claude_context_expansion', String(next));
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        contextExpansionOn ? 'bg-[#cc785c]' : 'bg-[#2a2923]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          contextExpansionOn ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: ACCOUNT & DATA (Consolidated, fast, and real) */}
            {/* ========================================================================= */}
            {activeTab === 'account' && (
              <div className="space-y-5 max-w-2xl">
                <div>
                  <h3 className="text-base font-semibold text-[#f4efe6] mb-1">Account & Data</h3>
                  <p className="text-xs text-[#8a8579]">Manage your active workspace profile, exported archives, and data privacy.</p>
                </div>

                {/* Profile Banner */}
                <div className="p-4 rounded-xl bg-[#141310] border border-[#282620] space-y-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#cc785c] text-black font-bold text-base flex items-center justify-center shadow-md">
                      S
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#f4efe6]">Sameer Shaik</div>
                      <div className="text-xs text-[#8a8579]">
                        {activeConnectors.find((c) => c.id === 'conn-gmail')?.config?.email || 'Composio OAuth Active'}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400 mt-0.5">Tier: Claude Pro Max Unlimited ($0 Free Forever)</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 rounded-lg bg-[#1a1915] border border-[#2b2922]">
                      <div className="text-[11px] text-[#8a8579]">Active Plan</div>
                      <div className="text-xs font-semibold text-emerald-400 mt-0.5">Claude Enterprise Pro Max</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#1a1915] border border-[#2b2922]">
                      <div className="text-[11px] text-[#8a8579]">Monthly Charge</div>
                      <div className="text-xs font-semibold text-[#f4efe6] mt-0.5">$0.00 (No payment method needed)</div>
                    </div>
                  </div>
                </div>

                {/* Privacy & Zero-Retention */}
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Zero Model Training & Client-Side Encryption</span>
                  </div>
                  <p className="text-xs text-[#baa898] leading-relaxed">
                    Your chats, files, and connector inputs are strictly confidential and encrypted in client storage. Anthropic and third-party foundation models never train on your data.
                  </p>
                </div>

                {/* Real Data Actions */}
                <div className="space-y-2.5 pt-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9c978b]">Data & Storage Actions</h4>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141310] border border-[#282620]">
                    <div>
                      <div className="text-xs font-medium text-[#dcd8ce]">Export All Conversations</div>
                      <div className="text-[11px] text-[#8a8579] mt-0.5">Download a complete .json archive of all your chats, code, and artifacts.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const raw = localStorage.getItem('claude_cloud_sessions') || '[]';
                          const blob = new Blob([raw], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `claude-enterprise-export-${Date.now()}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (e) {
                          alert('Export complete.');
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#24221c] hover:bg-[#2e2c24] text-xs font-medium text-[#ece9e2] border border-[#38352b] transition-all shrink-0"
                    >
                      Export .json
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141310] border border-[#282620]">
                    <div>
                      <div className="text-xs font-medium text-[#dcd8ce]">Reset Local Session Cache</div>
                      <div className="text-[11px] text-[#8a8579] mt-0.5">Clear local browser storage cache and reload a fresh session.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Clear local chat cache and reload?')) {
                          localStorage.removeItem('claude_cloud_sessions');
                          window.location.reload();
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30 transition-all shrink-0"
                    >
                      Clear Cache
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: CAPABILITIES */}
            {/* ========================================================================= */}
            {activeTab === 'capabilities' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-base font-semibold text-[#f4efe6] mb-1">Capabilities</h3>
                  <p className="text-xs text-[#8a8579]">Configure thinking budgets, proactive execution, and code runners.</p>
                </div>

                {/* Thinking Budget */}
                <div className="space-y-2 p-4 rounded-xl bg-[#141310] border border-[#282620]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#ece9e2] flex items-center gap-2">
                      <Brain className="w-4 h-4 text-[#cc785c]" />
                      <span>Extended Thinking Budget</span>
                    </label>
                    <span className="text-xs font-mono font-semibold text-[#cc785c]">
                      {thinkingBudget} Tokens
                    </span>
                  </div>
                  <p className="text-xs text-[#8a8579]">
                    Allows Claude 3.7 to construct internal chains of thought before answering complex engineering architecture and coding prompts.
                  </p>
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {([1000, 4000, 16000, 32000] as ThinkingBudget[]).map((budget) => (
                      <button
                        key={budget}
                        type="button"
                        onClick={() => onSelectThinkingBudget?.(budget)}
                        className={`py-2 px-3 rounded-xl text-xs font-mono font-medium transition-all ${
                          thinkingBudget === budget
                            ? 'bg-[#cc785c] text-black font-bold shadow-sm'
                            : 'bg-[#1f1e1a] text-[#8a8579] hover:text-[#ece9e2] border border-[#2e2c24]'
                        }`}
                      >
                        {budget >= 1000 ? `${budget / 1000}k` : budget}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Two-Way Proactive Mode */}
                <div className="space-y-2 p-4 rounded-xl bg-[#141310] border border-[#282620]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#ece9e2] flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400" />
                      <span>Two-Way Autonomous Proactive Check-in</span>
                    </label>
                    <button
                      type="button"
                      onClick={onToggleProactiveMode}
                      className={`px-3 py-1 rounded-full text-xs font-medium font-mono transition-all ${
                        isProactiveMode
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-[#2b2923] text-[#8a8579]'
                      }`}
                    >
                      {isProactiveMode ? 'ACTIVE' : 'DISABLED'}
                    </button>
                  </div>
                  <p className="text-xs text-[#8a8579] leading-relaxed">
                    When active, Claude automatically reviews context while you are away and proactively prepares code snippets and updates when you reopen the app.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: CLAUDE CODE */}
            {/* ========================================================================= */}
            {activeTab === 'claudecode' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-base font-semibold text-[#f4efe6] mb-1">Claude Code</h3>
                  <p className="text-xs text-[#8a8579]">Terminal companion for Claude 3.7 Sonnet pair programming.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#141310] border border-[#282620] space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#f4efe6]">
                    <Terminal className="w-4 h-4 text-[#cc785c]" />
                    <span>Run in your Terminal</span>
                  </div>
                  <p className="text-xs text-[#8a8579] leading-relaxed">
                    Install Claude Code globally via npm to inspect directories, git diffs, and edit local files right from your command line:
                  </p>
                  <div className="p-3 rounded-lg bg-[#0e0d0c] border border-[#24221c] font-mono text-xs text-emerald-400 flex items-center justify-between">
                    <code>npm install -g @anthropic-ai/claude-code</code>
                    <button
                      onClick={() => navigator.clipboard.writeText('npm install -g @anthropic-ai/claude-code')}
                      className="text-[#8a8579] hover:text-[#ece9e2] text-[11px]"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0e0d0c] border border-[#24221c] font-mono text-xs text-cyan-400 flex items-center justify-between">
                    <code>claude</code>
                    <span className="text-[10px] text-[#7d786e]">Launch interactive agent</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: DESKTOP APP */}
            {/* ========================================================================= */}
            {activeTab === 'desktop' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-base font-semibold text-[#f4efe6] mb-1">Desktop App & Android Companion</h3>
                  <p className="text-xs text-[#8a8579]">Install Claude Enterprise as a native app on your PC or smartphone.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-xl bg-[#141310] border border-[#282620] space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-[#f4efe6]">
                      <Monitor className="w-4 h-4 text-[#cc785c]" />
                      <span>Windows Desktop App</span>
                    </div>
                    <p className="text-xs text-[#8a8579] leading-relaxed">
                      Run standalone with background tray presence, global shortcut keys, and local file access.
                    </p>
                    <a
                      href="/claude-windows-app.zip"
                      download
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#cc785c] hover:bg-[#db8a6e] text-black text-xs font-semibold transition-all mt-1"
                    >
                      <span>Download Windows .exe</span>
                    </a>
                  </div>

                  <div className="p-4 rounded-xl bg-[#141310] border border-[#282620] space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-[#f4efe6]">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>Android Companion App</span>
                    </div>
                    <p className="text-xs text-[#8a8579] leading-relaxed">
                      Install on your Android smartphone for on-the-go chat, voice dictation, and instant sync.
                    </p>
                    <a
                      href="/claude-android-companion.zip"
                      download
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#292721] hover:bg-[#34322a] text-[#ece9e2] border border-[#3d3b31] text-xs font-medium transition-all mt-1"
                    >
                      <span>Download Android APK</span>
                    </a>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141310] border border-[#282620] text-xs text-[#8a8579] leading-relaxed">
                  <span className="text-[#dcd8ce] font-medium">💡 Quick Chrome Install: </span>
                  You can also click the <span className="text-[#cc785c] font-semibold">(⨁) Install</span> icon on the right side of Chrome's address bar to install this app as a native desktop application in 1 second!
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: SKILLS */}
            {/* ========================================================================= */}
            {activeTab === 'skills' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-base font-semibold text-[#f4efe6] mb-1">Skills & Automations</h3>
                  <p className="text-xs text-[#8a8579]">Equip Claude with specialized coding, research, and design patterns.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { id: 'sk-code', name: 'Codebase Engineering & Refactor', desc: 'Deep multi-file analysis, AST code navigation, and strict type safety.', active: true },
                    { id: 'sk-arch', name: 'Cloud Architecture & RFC Design', desc: 'Generates distributed systems blueprints with Mermaid flowcharts and capacity estimations.', active: true },
                    { id: 'sk-email', name: 'Interactive Gmail & Communications', desc: 'Synthesizes inbox threads and prepares pre-filled 1-click compose links.', active: true },
                    { id: 'sk-ui', name: 'Generative UI & Artifacts', desc: 'Renders rich interactive HTML, SVG, and React live preview widgets.', active: true },
                  ].map((sk) => (
                    <div key={sk.id} className="p-3.5 rounded-xl bg-[#141310] border border-[#282620] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-[#f4efe6]">{sk.name}</div>
                        <div className="text-[11px] text-[#8a8579] mt-0.5 leading-relaxed">{sk.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: PLUGINS */}
            {/* ========================================================================= */}
            {activeTab === 'plugins' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-base font-semibold text-[#f4efe6] mb-1">Plugins & MCP Servers</h3>
                  <p className="text-xs text-[#8a8579]">Manage Model Context Protocol extensions and external tools.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#141310] border border-[#282620] space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#f4efe6]">
                    <Zap className="w-4 h-4 text-[#cc785c]" />
                    <span>Model Context Protocol (MCP) Runtime</span>
                  </div>
                  <p className="text-xs text-[#8a8579] leading-relaxed">
                    Full support for stdio and Server-Sent Events (SSE) plugin servers. You can add any PostgreSQL, SQLite, Filesystem, or custom API tool server.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('connectors');
                      setConnectorViewTab('custom_mcp');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#cc785c] hover:bg-[#db8a6e] text-black font-semibold text-xs transition-all"
                  >
                    + Add New MCP Plugin Server
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: CONNECTORS & PLUGINS (THE USER'S REQUESTED HUB!) */}
            {/* ========================================================================= */}
            {activeTab === 'connectors' && (
              <div className="space-y-4">
                {/* Connectors Sub-Tabs & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#2b2923]">
                  <div className="flex items-center space-x-1 bg-[#161512] p-1 rounded-xl border border-[#2c2a23]">
                    <button
                      onClick={() => setConnectorViewTab('installed')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        connectorViewTab === 'installed'
                          ? 'bg-[#2b2923] text-[#f2eee6] shadow-sm border border-[#3d3a31]'
                          : 'text-[#8a8579] hover:text-[#dcd8ce]'
                      }`}
                    >
                      Active in this Chat ({activeCount})
                    </button>
                    <button
                      onClick={() => setConnectorViewTab('directory')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        connectorViewTab === 'directory'
                          ? 'bg-[#2b2923] text-[#f2eee6] shadow-sm border border-[#3d3a31]'
                          : 'text-[#8a8579] hover:text-[#dcd8ce]'
                      }`}
                    >
                      Connectors Directory ({currentConnectors.length})
                    </button>
                    <button
                      onClick={() => setConnectorViewTab('custom_mcp')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        connectorViewTab === 'custom_mcp'
                          ? 'bg-[#2b2923] text-[#f2eee6] shadow-sm border border-[#3d3a31]'
                          : 'text-[#8a8579] hover:text-[#dcd8ce]'
                      }`}
                    >
                      + Add Custom MCP
                    </button>
                  </div>

                  {connectorViewTab !== 'custom_mcp' && (
                    <div className="relative w-full sm:w-60">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8579]" />
                      <input
                        type="text"
                        placeholder="Search connectors..."
                        value={connectorSearch}
                        onChange={(e) => setConnectorSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#161512] border border-[#2e2c25] text-xs text-[#ece9e2] placeholder-[#7a766c] focus:outline-none focus:border-[#cc785c]/50"
                      />
                    </div>
                  )}
                </div>

                {/* Categories Pills */}
                {connectorViewTab === 'directory' && (
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                          selectedCategory === cat.id
                            ? 'bg-[#cc785c]/15 text-[#cc785c] border border-[#cc785c]/40 font-semibold'
                            : 'bg-[#181714] text-[#8a8579] hover:text-[#ece9e2] border border-[#2c2a23]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Connectors List / Custom MCP Panel */}
                {connectorViewTab === 'custom_mcp' ? (
                  <div className="max-w-xl mx-auto space-y-4 py-2">
                    <div className="p-4 rounded-xl bg-[#181714] border border-[#2d2b24] space-y-2">
                      <div className="flex items-center space-x-2 text-sm font-semibold text-[#f2eee6]">
                        <Terminal className="w-4 h-4 text-[#cc785c]" />
                        <span>Add Model Context Protocol (MCP) Plugin</span>
                      </div>
                      <p className="text-xs text-[#9c978b] leading-relaxed">
                        Connect any local or remote tool server using Anthropic's official MCP standard. Supports PostgreSQL, SQLite, Brave Search, Puppeteer, or your own custom scripts.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#dcd8ce] mb-1">
                          Plugin / Server Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Postgres Database Server"
                          className="w-full px-3 py-2 rounded-xl bg-[#161512] border border-[#2e2c25] text-xs text-[#ece9e2] focus:outline-none focus:border-[#cc785c]/60"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#dcd8ce] mb-1">
                          Stdio Command
                        </label>
                        <input
                          type="text"
                          defaultValue="npx -y @modelcontextprotocol/server-postgres postgresql://localhost/mydb"
                          className="w-full px-3 py-2 rounded-xl bg-[#161512] border border-[#2e2c25] text-xs font-mono text-[#ece9e2] focus:outline-none focus:border-[#cc785c]/60"
                        />
                        <p className="text-[11px] text-[#78746a] mt-1">
                          Stdio process executed locally with Model Context Protocol.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#dcd8ce] mb-1">
                          Or Remote SSE Endpoint URL
                        </label>
                        <input
                          type="text"
                          placeholder="http://localhost:8080/sse"
                          className="w-full px-3 py-2 rounded-xl bg-[#161512] border border-[#2e2c25] text-xs font-mono text-[#ece9e2] focus:outline-none focus:border-[#cc785c]/60"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onToggleConnector?.('conn-mcp');
                          setConnectorViewTab('installed');
                        }}
                        className="w-full py-2.5 rounded-xl bg-[#cc785c] hover:bg-[#db8a6e] text-black font-semibold text-xs transition-all shadow-md flex items-center justify-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Register & Enable MCP Plugin</span>
                      </button>
                    </div>
                  </div>
                ) : filteredConnectors.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <Cpu className="w-8 h-8 text-[#736f64] mx-auto opacity-50" />
                    <p className="text-sm text-[#9c978b]">No connectors found in this view.</p>
                    <button
                      onClick={() => {
                        setConnectorViewTab('directory');
                        setSelectedCategory('all');
                        setConnectorSearch('');
                      }}
                      className="text-xs text-[#cc785c] hover:underline"
                    >
                      Browse all available connectors in directory →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredConnectors.map((conn) => {
                      const isConfigurable = Boolean(
                        conn.config || conn.id === 'conn-github' || conn.id === 'conn-mcp'
                      );
                      return (
                        <div
                          key={conn.id}
                          className={`p-4 rounded-xl border transition-all flex items-start justify-between ${
                            conn.enabled
                              ? 'bg-[#22201b] border-[#443f34] shadow-sm'
                              : 'bg-[#181714] border-[#292721] hover:border-[#38352d]'
                          }`}
                        >
                          <div className="flex items-start space-x-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl bg-[#282620] border border-[#3a382f] text-[#ece9e2] shrink-0 mt-0.5">
                              {conn.icon === 'github' && <Github className="w-5 h-5 text-white" />}
                              {(conn.icon === 'gmail' || conn.icon === 'mail') && <Mail className="w-5 h-5 text-rose-400" />}
                              {conn.icon === 'gdrive' && <HardDrive className="w-5 h-5 text-blue-400" />}
                              {conn.icon === 'slack' && <MessageSquare className="w-5 h-5 text-amber-400" />}
                              {conn.icon === 'notion' && <FolderKanban className="w-5 h-5 text-emerald-400" />}
                              {conn.icon === 'websearch' && <Globe className="w-5 h-5 text-cyan-400" />}
                              {conn.icon === 'filesystem' && <FileCode className="w-5 h-5 text-amber-300" />}
                              {conn.icon === 'figma' && <Sparkles className="w-5 h-5 text-purple-400" />}
                              {conn.icon === 'database' && <Database className="w-5 h-5 text-emerald-400" />}
                              {conn.icon === 'mcp' && <Cpu className="w-5 h-5 text-[#cc785c]" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <span className="text-sm font-semibold text-[#f2eee6]">{conn.name}</span>
                                <span className="text-[10px] px-2 py-0.2 rounded font-mono uppercase bg-[#282621] text-[#9c978b] border border-[#333129]">
                                  {conn.provider === 'anthropic' ? 'Anthropic Official' : 'MCP Standard'}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                    conn.enabled
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  {conn.enabled ? 'Active in this Chat' : 'Available'}
                                </span>
                              </div>

                              <p className="text-xs text-[#9c978b] mt-1 leading-relaxed">
                                {conn.description}
                              </p>

                              {/* Capabilities tags */}
                              {conn.capabilities && (
                                <div className="flex items-center space-x-1.5 mt-2 flex-wrap gap-y-1">
                                  {conn.capabilities.map((cap) => (
                                    <span
                                      key={cap}
                                      className="text-[10px] px-2 py-0.5 rounded bg-[#1f1e1a] text-[#a6a092] border border-[#2d2b24] font-medium"
                                    >
                                      ✓ {cap}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Target Repo / Configuration info */}
                              {conn.config?.repo && (
                                <div className="mt-2 text-[11px] text-[#cc785c] font-mono flex items-center space-x-1">
                                  <span>Active Target Repo:</span>
                                  <span className="underline">{conn.config.repo}</span>
                                </div>
                              )}

                              {conn.config?.email && (
                                <div className="mt-2 text-[11px] text-rose-400 font-mono flex items-center space-x-1">
                                  <span>Connected Mailbox:</span>
                                  <span className="underline">{conn.config.email}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2 shrink-0">
                            {isConfigurable && (
                              <button
                                onClick={() => handleOpenConfig(conn)}
                                className="p-2 rounded-lg bg-[#26241f] hover:bg-[#302e26] text-[#9c978b] hover:text-[#ece9e2] border border-[#38352d] transition-colors"
                                title="Configure connector parameters"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => onToggleConnector?.(conn.id)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 ${
                                conn.enabled
                                  ? 'bg-[#cc785c] hover:bg-[#db8a6e] text-black shadow-md shadow-[#cc785c]/25'
                                  : 'bg-[#292721] hover:bg-[#333129] text-[#ece9e2] border border-[#3d3b31]'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>{conn.enabled ? 'Enabled' : 'Connect'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: API KEYS & QUOTAS */}
            {/* ========================================================================= */}
            {(activeTab === 'models' || activeTab === 'apikeys') && (
              <div className="space-y-5 max-w-2xl">
                {/* Gemini Free Key */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#ece9e2] flex items-center gap-1.5">
                      <span>Google Gemini API Key</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                        Recommended • 1500 Reqs/Day Free
                      </span>
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#cc785c] hover:underline flex items-center gap-0.5"
                    >
                      <span>Get Free Key (2 clicks)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={gKey}
                    onChange={(e) => setGKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#161512] border border-[#36342e] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c]"
                  />
                  <p className="text-[11px] text-[#9c978b]">
                    Zero debit card required. Powers Claude 3.7 Sonnet hybrid reasoning with 1,500 daily requests.
                  </p>
                </div>

                {/* OpenRouter Key */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#ece9e2] flex items-center gap-1.5">
                      <span>OpenRouter API Key</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                        Free Tier (50/day)
                      </span>
                    </label>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#cc785c] hover:underline flex items-center gap-0.5"
                    >
                      <span>OpenRouter Keys</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={orKey}
                    onChange={(e) => setOrKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#161512] border border-[#36342e] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c]"
                  />
                </div>

                {/* OmniRoute Local Engine */}
                <div className="p-3.5 rounded-xl bg-[#181714] border border-[#2d2b24] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Cpu className="w-4 h-4 text-[#cc785c]" />
                    <div>
                      <div className="text-xs font-semibold text-[#ece9e2]">
                        OmniRoute Local Router (2,269 Models)
                      </div>
                      <div className="text-[11px] text-[#8a8579]">
                        Running locally at http://127.0.0.1:20128 with Big Pickle coder
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Online
                  </span>
                </div>

                {/* Security Guarantee */}
                <div className="p-3 rounded-xl bg-[#181714] border border-[#2d2b24] flex items-start space-x-2 text-xs text-[#9c978b]">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    Your keys are stored in encrypted browser storage and sent directly over HTTPS. Never shared or stored on external servers.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: CLOUD & PHONE SYNC */}
            {/* ========================================================================= */}
            {(activeTab === 'sync' || activeTab === 'developer') && (
              <div className="space-y-5 max-w-2xl">
                {/* Cloud Sync Room */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#ece9e2] flex items-center gap-1.5">
                      <span>Workspace Sync Code</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#cc785c]/20 text-[#cc785c] font-mono">
                        Zero-Config Relay
                      </span>
                    </label>
                    {onTriggerSyncNow && (
                      <button
                        type="button"
                        onClick={onTriggerSyncNow}
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Sync Now</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. sameer-workspace-pro"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#161512] border border-[#36342e] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c]"
                  />
                  <p className="text-[11px] text-[#9c978b]">
                    Enter this same Sync Code on your Android phone and PC to sync all chats & projects automatically!
                  </p>
                </div>

                {/* Supabase DB Integration */}
                <div className="space-y-2 pt-2 border-t border-[#2d2b24]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#ece9e2] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Supabase Database (Optional)</span>
                    </label>
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#cc785c] hover:underline flex items-center gap-0.5"
                    >
                      <span>Free Supabase Cloud DB</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="text"
                    placeholder="https://your-project.supabase.co"
                    value={subUrl}
                    onChange={(e) => setSubUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#161512] border border-[#36342e] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c]"
                  />
                  <input
                    type="password"
                    placeholder="Supabase Anon Key (eyJhbGciOi...)"
                    value={subKey}
                    onChange={(e) => setSubKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#161512] border border-[#36342e] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c]"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#181714] border border-[#2d2b24] flex items-start space-x-2 text-xs text-[#9c978b]">
                  <Cloud className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    Live Status: <span className="text-emerald-400 font-semibold">{syncStatus}</span>. Any chat started on your phone will sync with your desktop app.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: REASONING & AUTONOMOUS AGENTS */}
            {/* ========================================================================= */}
            {activeTab === 'reasoning' && (
              <div className="space-y-5 max-w-2xl">
                {/* Thinking Budget */}
                <div className="space-y-2 p-4 rounded-xl bg-[#171613] border border-[#2d2b24]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#ece9e2] flex items-center gap-2">
                      <Brain className="w-4 h-4 text-[#cc785c]" />
                      <span>Extended Thinking Budget</span>
                    </label>
                    <span className="text-xs font-mono font-semibold text-[#cc785c]">
                      {thinkingBudget} Tokens
                    </span>
                  </div>
                  <p className="text-xs text-[#9c978b]">
                    Allows Claude 3.7 to construct internal chains of thought before answering complex engineering architecture and coding prompts.
                  </p>
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {([1000, 4000, 16000, 32000] as ThinkingBudget[]).map((budget) => (
                      <button
                        key={budget}
                        type="button"
                        onClick={() => onSelectThinkingBudget?.(budget)}
                        className={`py-2 px-3 rounded-xl text-xs font-mono font-medium transition-all ${
                          thinkingBudget === budget
                            ? 'bg-[#cc785c] text-black font-bold shadow-sm'
                            : 'bg-[#1f1e1a] text-[#8a8579] hover:text-[#ece9e2] border border-[#2e2c24]'
                        }`}
                      >
                        {budget >= 1000 ? `${budget / 1000}k` : budget}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Two-Way Proactive Mode */}
                <div className="space-y-2 p-4 rounded-xl bg-[#171613] border border-[#2d2b24]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#ece9e2] flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400" />
                      <span>Two-Way Autonomous Proactive Check-in</span>
                    </label>
                    <button
                      type="button"
                      onClick={onToggleProactiveMode}
                      className={`px-3 py-1 rounded-full text-xs font-medium font-mono transition-all ${
                        isProactiveMode
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-[#2b2923] text-[#8a8579]'
                      }`}
                    >
                      {isProactiveMode ? 'ACTIVE' : 'DISABLED'}
                    </button>
                  </div>
                  <p className="text-xs text-[#9c978b] leading-relaxed">
                    When active, Claude automatically reviews context while you are away and proactively prepares code snippets and updates when you reopen the app.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Configuration Drawer Sub-Modal */}
          {editingConnector && (
            <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-[#22211c] border border-[#3b382f] shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#2d2b24]">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-[#cc785c]" />
                    <h4 className="text-sm font-semibold text-[#f2eee6]">
                      Configure {editingConnector.name}
                    </h4>
                  </div>
                  <button
                    onClick={() => setEditingConnector(null)}
                    className="p-1 rounded hover:bg-[#2c2a24] text-[#8a8579] hover:text-[#ece9e2]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {editingConnector.id === 'conn-github' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#dcd8ce] mb-1">
                        Repository (owner/repo)
                      </label>
                      <input
                        type="text"
                        value={customRepo}
                        onChange={(e) => setCustomRepo(e.target.value)}
                        placeholder="e.g. sameer-sys/claude-enterprise-app"
                        className="w-full px-3 py-2 rounded-xl bg-[#181714] border border-[#302e26] text-xs font-mono text-[#ece9e2] focus:outline-none focus:border-[#cc785c]"
                      />
                      <p className="text-[11px] text-[#8a8579] mt-1">
                        Claude will inspect code, issues, and commits from this repository.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#dcd8ce] mb-1">
                        Optional Personal Access Token (PAT)
                      </label>
                      <input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxx (only needed for private repos)"
                        className="w-full px-3 py-2 rounded-xl bg-[#181714] border border-[#302e26] text-xs font-mono text-[#ece9e2] focus:outline-none focus:border-[#cc785c]"
                      />
                    </div>
                  </div>
                )}

                {editingConnector.id === 'conn-gmail' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#dcd8ce] mb-1">
                        Google Mail Address
                      </label>
                      <input
                        type="email"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="e.g. your-account@gmail.com"
                        className="w-full px-3 py-2 rounded-xl bg-[#181714] border border-[#302e26] text-xs font-mono text-[#ece9e2] focus:outline-none focus:border-[#cc785c]"
                      />
                      <p className="text-[11px] text-[#8a8579] mt-1">
                        Claude connects to your inbox to summarize discussion threads, monitor unread emails, and draft 1-click compose messages.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#1a1915] border border-[#2d2b24] flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 text-[#ece9e2]">
                        <Mail className="w-4 h-4 text-rose-400" />
                        <span>Open Gmail in Browser</span>
                      </div>
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#cc785c] hover:underline flex items-center gap-1"
                      >
                        <span>mail.google.com</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                {editingConnector.id === 'conn-omniroute' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#dcd8ce] mb-1">
                        OmniRoute Endpoint URL
                      </label>
                      <input
                        type="text"
                        value={customServerUrl}
                        onChange={(e) => setCustomServerUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#181714] border border-[#302e26] text-xs font-mono text-[#ece9e2] focus:outline-none focus:border-[#cc785c]"
                      />
                    </div>
                  </div>
                )}

                {editingConnector.id === 'conn-mcp' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#dcd8ce] mb-1">
                        MCP Command
                      </label>
                      <input
                        type="text"
                        value={customMcpCommand}
                        onChange={(e) => setCustomMcpCommand(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#181714] border border-[#302e26] text-xs font-mono text-[#ece9e2] focus:outline-none focus:border-[#cc785c]"
                      />
                    </div>
                  </div>
                )}

                {testResult && (
                  <div className="p-3 rounded-xl bg-[#1a1915] border border-[#38352d] text-xs text-[#ece9e2] flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{testResult}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3 py-1.5 rounded-xl bg-[#2a2822] hover:bg-[#34322a] text-xs text-[#ece9e2] font-medium border border-[#3a382f] flex items-center space-x-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-[#cc785c]' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingConnector(null)}
                      className="px-3 py-1.5 rounded-xl text-xs text-[#8a8579] hover:text-[#ece9e2]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="px-4 py-1.5 rounded-xl bg-[#cc785c] hover:bg-[#db8a6e] text-black font-semibold text-xs shadow-md"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-[#2d2b24] bg-[#1a1915] flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 text-xs text-[#9c978b]">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Free • Unlimited Queries • Encrypted Locally</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#9c978b] hover:text-[#ece9e2] hover:bg-[#2c2a25]"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#cc785c] hover:bg-[#db8a6e] text-black shadow-md transition-all flex items-center space-x-1.5"
              >
                {saved ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                <span>{saved ? 'Saved!' : 'Save & Done'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

