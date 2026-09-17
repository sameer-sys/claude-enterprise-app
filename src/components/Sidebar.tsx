'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Search,
  Sparkles,
  FolderKanban,
  Cpu,
  Settings,
  Star,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Zap,
  Github,
  HardDrive,
  Globe,
  FileCode,
  Database,
  Mail,
  PanelLeft,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Code2,
  SlidersHorizontal,
  Download,
  ListFilter,
  Circle,
  Menu,
  X,
  Crown,
  MessageSquare,
} from 'lucide-react';
import { Session, Project, Connector } from '@/types/chat';

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onToggleStar: (id: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenConnectors: () => void;
  onOpenSettings: () => void;
  onOpenNewProject: () => void;
  onNewPMSession?: (project: Project) => void;
  onOpenAgents?: () => void;
  onOpenSquad?: () => void;
  onOpenDownload?: () => void;
  onOpenArtifacts?: () => void;
  isSquadActive?: boolean;
  projects: Project[];
  activeConnectorsCount: number;
  activeConnectors?: Connector[];
  onToggleConnector?: (id: string) => void;
  activeSessionTitle?: string;
  hasGeminiKey?: boolean;
  onOpenFeatures?: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onToggleStar,
  isOpenMobile,
  onCloseMobile,
  onOpenConnectors,
  onOpenSettings,
  onOpenNewProject,
  onNewPMSession,
  onOpenAgents,
  onOpenSquad,
  onOpenDownload,
  onOpenArtifacts,
  projects,
  activeConnectorsCount,
  activeConnectors = [],
  onToggleConnector,
  activeSessionTitle,
  hasGeminiKey = false,
  onOpenFeatures,
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Filter out PM sessions (those with projectId) from main sessions list
  const mainSessions = sessions.filter((s) => !s.projectId);

  const filteredSessions = mainSessions.filter((s) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const titleMatch = s.title.toLowerCase().includes(query);
    const contentMatch = s.messages.some((m) =>
      m.content.toLowerCase().includes(query)
    );
    return titleMatch || contentMatch;
  });

  const starredSessions = filteredSessions.filter((s) => s.starred);
  const regularSessions = filteredSessions.filter((s) => !s.starred);


  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#191815] border-r border-[#2d2b25] flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Workspace Brand Header */}
        <div className="p-3.5 border-b border-[#282621] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#b86146] to-[#e68d71] flex items-center justify-center shadow-md shadow-[#cc785c]/30">
              <Sparkles className="w-4 h-4 text-black fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="font-semibold text-sm text-[#f2eee6] tracking-tight">Sameer AI</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500/20 to-[#cc785c]/20 text-[#cc785c] border border-[#cc785c]/40 font-mono flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5" />
                  <span>Workspace</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Start New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewSession();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#26241f] hover:bg-[#302e27] border border-[#38352d] text-[#f2eee6] font-medium text-xs transition-all group shadow-sm"
          >
            <div className="flex items-center space-x-2">
              <Plus className="w-4 h-4 text-[#cc785c]" />
              <span>Start new chat</span>
            </div>
            <span className="text-[10px] font-mono text-[#8a8579] bg-[#1f1e1a] px-1.5 py-0.5 rounded border border-[#2e2c24]">
              Ctrl+K
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8579]" />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#201f1b] border border-[#2e2c25] text-xs text-[#ece9e2] placeholder-[#8a8579] focus:outline-none focus:border-[#cc785c]/50"
            />
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto px-2 space-y-3 py-1">
          {/* Starred Section */}
          {starredSessions.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-[#cc785c] flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                <span>Starred</span>
              </div>
              {starredSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const sessionConnCount = (session.connectors || []).filter((c) => c.enabled).length;
                return (
                  <div
                    key={session.id}
                    className={`group relative flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#2b2923] text-[#f2eee6] border border-[#3b3830]'
                        : 'text-[#bfb9ad] hover:bg-[#23221c] hover:text-[#ece9e2]'
                    }`}
                    onClick={() => {
                      onSelectSession(session.id);
                      onCloseMobile();
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-2 shrink-0 opacity-60" />
                    <span className="truncate flex-1">{session.title}</span>

                    {/* Per-session connector indicator */}
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 mx-1 border ${
                        sessionConnCount > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-[#201f1b] text-[#6b675d] border-transparent'
                      }`}
                      title={`${sessionConnCount} connectors enabled for this chat`}
                    >
                      {sessionConnCount}⚡
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(session.id);
                      }}
                      className="p-1 text-[#cc785c]"
                      title="Unstar"
                    >
                      <Star className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}




          {/* Projects Section */}
          <div className="space-y-0.5">
            <div className="px-2 py-1 text-[11px] font-semibold text-[#8a8579] flex items-center justify-between">
              <span>Projects</span>
              {onOpenNewProject && (
                <button
                  onClick={onOpenNewProject}
                  className="p-1 rounded hover:bg-[#282620] text-[#8a8579] hover:text-[#ece9e2] transition-colors"
                  title="New project"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
            {regularSessions.length === 0 && starredSessions.length === 0 ? (
              <div className="text-center py-6 px-4 text-[#7d786e] text-xs">
                No chats yet.
              </div>
            ) : (
              regularSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const sessionConnCount = (session.connectors || []).filter((c) => c.enabled).length;
                return (
                  <div
                    key={session.id}
                    className={`group relative flex items-center rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#2b2923] text-[#f2eee6] border border-[#3b3830]'
                        : 'text-[#bfb9ad] hover:bg-[#23221c] hover:text-[#ece9e2]'
                    }`}
                    onClick={() => {
                      onSelectSession(session.id);
                      onCloseMobile();
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-2 shrink-0 opacity-60" />
                    <span className="truncate flex-1">{session.title}</span>

                    {/* Per-session connector indicator */}
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 mx-1 border ${
                        sessionConnCount > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-[#201f1b] text-[#6b675d] border-transparent'
                      }`}
                      title={`${sessionConnCount} connectors enabled for this chat`}
                    >
                      {sessionConnCount}⚡
                    </span>

                    <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(session.id);
                        }}
                        className="p-1 rounded hover:bg-[#38352d] text-[#8a8579] hover:text-[#cc785c] transition-all"
                        title="Star chat"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="p-1 rounded hover:bg-[#38352d] text-[#8a8579] hover:text-rose-400 transition-all"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Navigation Quick Bar */}
        <div className="p-2 border-t border-[#282621] space-y-1 bg-[#161512]">
          {onOpenFeatures && (
            <button
              onClick={onOpenFeatures}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#25241d] text-xs text-[#bfb9ad] hover:text-[#f2eee6] transition-all group"
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-[#cc785c] group-hover:rotate-12 transition-transform" />
                <span className="font-semibold text-[#f2eee6]">Features & Superpowers</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-gradient-to-r from-amber-500/20 to-[#cc785c]/20 text-[#cc785c] font-mono border border-[#cc785c]/30">
                12⚡
              </span>
            </button>
          )}

          {onOpenAgents && (
            <button
              onClick={onOpenAgents}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#25241d] text-xs text-[#bfb9ad] hover:text-[#f2eee6] transition-all group"
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-[#cc785c] group-hover:rotate-12 transition-transform" />
                <span>OpenWork Agents</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#2b2923] text-[#bfb9ad] font-mono">
                260+
              </span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#25241d] text-xs text-[#bfb9ad] hover:text-[#f2eee6] transition-all"
          >
            <div className="flex items-center space-x-2">
              <Settings className="w-3.5 h-3.5 text-[#cc785c]" />
              <span className="font-medium text-[#ece9e2]">Settings & API Keys</span>
            </div>
            {!hasGeminiKey ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-mono animate-pulse">
                Setup Key
              </span>
            ) : (
              <ChevronRight className="w-3 h-3 text-[#7d786e]" />
            )}
          </button>
        </div>

        {/* User Profile - Enterprise Pro Max Tier */}
        <div
          onClick={onOpenSettings}
          className="p-3 border-t border-[#282621] bg-[#141310] flex items-center justify-between text-xs cursor-pointer hover:bg-[#1e1d18] transition-colors"
          title="Open Settings & Profile"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#b86146] to-[#e68d71] flex items-center justify-center text-black font-bold text-xs shadow-sm">
              S
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-[#ece9e2] font-semibold text-xs">Sameer</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#cc785c]" />
              </div>
              <p className="text-[10px] text-[#baa898]">Claude Pro Max • $0 Free</p>
            </div>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#cc785c]/15 text-[#cc785c] border border-[#cc785c]/30 font-mono">
            Unlimited
          </span>
        </div>
      </aside>
    </>
  );
}
