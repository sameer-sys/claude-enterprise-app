'use client';

import React, { useState } from 'react';
import { X, Check, Globe, Github, HardDrive, Database, Cpu, Plus, Power } from 'lucide-react';

export interface Connector {
  id: string;
  name: string;
  description: string;
  icon: 'github' | 'gdrive' | 'database' | 'filesystem' | 'mcp';
  enabled: boolean;
  status: 'connected' | 'ready' | 'idle';
  category: string;
}

const DEFAULT_CONNECTORS: Connector[] = [
  {
    id: 'conn-github',
    name: 'GitHub',
    description: 'Access repositories, inspect source code, issues, and pull requests.',
    icon: 'github',
    enabled: true,
    status: 'connected',
    category: 'Developer Tools',
  },
  {
    id: 'conn-gdrive',
    name: 'Google Drive',
    description: 'Read and analyze documents, spreadsheets, and workspace files.',
    icon: 'gdrive',
    enabled: false,
    status: 'ready',
    category: 'Productivity',
  },
  {
    id: 'conn-filesystem',
    name: 'Local Filesystem',
    description: 'Read project directories, docs, and workspace scripts locally.',
    icon: 'filesystem',
    enabled: true,
    status: 'connected',
    category: 'System',
  },
  {
    id: 'conn-supabase',
    name: 'Supabase Cloud Sync',
    description: 'Sync conversations, user settings, and artifacts 24/7 across devices.',
    icon: 'database',
    enabled: true,
    status: 'connected',
    category: 'Cloud Storage',
  },
  {
    id: 'conn-mcp',
    name: 'Custom MCP Server',
    description: 'Connect standard Model Context Protocol servers over stdio or SSE.',
    icon: 'mcp',
    enabled: false,
    status: 'ready',
    category: 'Integrations',
  },
];

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConnectors: Connector[];
  onToggleConnector: (id: string) => void;
}

export default function ConnectorsModal({
  isOpen,
  onClose,
  activeConnectors,
  onToggleConnector,
}: ConnectorsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#23221e] border border-[#383630] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#33312a]">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#cc785c]/15 border border-[#cc785c]/30 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[#cc785c]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#ece9e2]">Connectors & Integrations</h3>
              <p className="text-xs text-[#9c978b]">Manage active tools, data sources, and MCP connections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2c2a25] text-[#9c978b] hover:text-[#ece9e2] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Connectors List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {activeConnectors.map((conn) => {
            return (
              <div
                key={conn.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#1c1b18] border border-[#302e28] hover:border-[#423f37] transition-all"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-2 rounded-lg bg-[#272621] border border-[#383630] text-[#ece9e2] mt-0.5">
                    {conn.icon === 'github' && <Github className="w-4 h-4" />}
                    {conn.icon === 'gdrive' && <HardDrive className="w-4 h-4 text-blue-400" />}
                    {conn.icon === 'database' && <Database className="w-4 h-4 text-emerald-400" />}
                    {conn.icon === 'filesystem' && <Globe className="w-4 h-4 text-amber-400" />}
                    {conn.icon === 'mcp' && <Cpu className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-[#ece9e2]">{conn.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          conn.enabled
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {conn.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-[#9c978b] mt-0.5 leading-relaxed">{conn.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => onToggleConnector(conn.id)}
                  className={`ml-4 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 shrink-0 ${
                    conn.enabled
                      ? 'bg-[#cc785c] hover:bg-[#db8a6e] text-black font-semibold shadow-sm'
                      : 'bg-[#2b2924] hover:bg-[#38352e] text-[#ece9e2] border border-[#3c3a32]'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  <span>{conn.enabled ? 'Enabled' : 'Enable'}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#33312a] bg-[#1d1c19] flex items-center justify-between text-xs text-[#9c978b]">
          <span>Claude MCP Connector Engine v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#2e2c26] hover:bg-[#3a3831] text-[#ece9e2] font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_CONNECTORS };
