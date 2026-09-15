'use client';

import React, { useState } from 'react';
import { X, Key, Shield, ExternalLink, Check, Zap, Cloud, Database, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
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
}

export default function SettingsModal({
  isOpen,
  onClose,
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
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'models' | 'sync'>('models');
  const [gKey, setGKey] = useState(geminiKey);
  const [orKey, setOrKey] = useState(openRouterKey);
  const [roomId, setRoomId] = useState(syncRoomId);
  const [subUrl, setSubUrl] = useState(supabaseUrl);
  const [subKey, setSubKey] = useState(supabaseKey);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

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
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#23221e] border border-[#383630] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#33312a]">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#cc785c]/15 border border-[#cc785c]/30 flex items-center justify-center">
              <Key className="w-4 h-4 text-[#cc785c]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#ece9e2]">Settings & Integrations</h3>
              <p className="text-xs text-[#9c978b]">Configure AI quotas, cloud sync & cross-device database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2c2a25] text-[#9c978b] hover:text-[#ece9e2]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center px-6 pt-3 border-b border-[#33312a] gap-4 bg-[#1f1e1a]">
          <button
            type="button"
            onClick={() => setActiveTab('models')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'models'
                ? 'border-[#cc785c] text-[#ece9e2]'
                : 'border-transparent text-[#8a8579] hover:text-[#dcd8ce]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#cc785c]" />
            <span>AI Models & Quotas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'sync'
                ? 'border-[#cc785c] text-[#ece9e2]'
                : 'border-transparent text-[#8a8579] hover:text-[#dcd8ce]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-[#cc785c]" />
            <span>Cloud & Cross-Device Sync</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {activeTab === 'models' ? (
            <>
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
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c]"
                />
                <p className="text-[11px] text-[#9c978b]">
                  Zero debit card required. Powers Claude 3.7 hybrid reasoning & multimodal vision with 1,500 daily requests.
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
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#1d1c19] border border-[#302f2a] flex items-start space-x-2 text-xs text-[#9c978b]">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Your keys are encrypted in browser local storage and used directly for your sessions. Never shared.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Cloud Sync Room */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#ece9e2] flex items-center gap-1.5">
                    <span>Workspace Sync Code</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#cc785c]/20 text-[#cc785c] font-mono">
                      Zero-Config Cloud Relay
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
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c]"
                />
                <p className="text-[11px] text-[#9c978b]">
                  Use this same Sync Code on your Android phone and PC to sync all chats & projects automatically!
                </p>
              </div>

              {/* Supabase Integration */}
              <div className="space-y-2 pt-2 border-t border-[#312f29]">
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
                    <span>Free Supabase DB</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="text"
                  placeholder="https://your-project.supabase.co"
                  value={subUrl}
                  onChange={(e) => setSubUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c]"
                />
                <input
                  type="password"
                  placeholder="Supabase Anon Key (eyJhbGciOi...)"
                  value={subKey}
                  onChange={(e) => setSubKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#1d1c19] border border-[#302f2a] flex items-start space-x-2 text-xs text-[#9c978b]">
                <Cloud className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Status: <span className="text-emerald-400 font-semibold">{syncStatus}</span>. Any chat created on your phone will sync with your PC.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#33312a] bg-[#1d1c19] flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#9c978b] hover:text-[#ece9e2] hover:bg-[#2c2a25]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#cc785c] hover:bg-[#db8a6e] text-black shadow-md transition-all flex items-center space-x-1.5"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
            <span>{saved ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
