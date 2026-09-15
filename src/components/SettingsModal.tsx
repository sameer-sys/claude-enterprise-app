'use client';

import React, { useState } from 'react';
import { X, Key, Shield, ExternalLink, Check, Zap } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiKey: string;
  onSaveGeminiKey: (key: string) => void;
  openRouterKey: string;
  onSaveOpenRouterKey: (key: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  geminiKey,
  onSaveGeminiKey,
  openRouterKey,
  onSaveOpenRouterKey,
}: SettingsModalProps) {
  const [gKey, setGKey] = useState(geminiKey);
  const [orKey, setOrKey] = useState(openRouterKey);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveGeminiKey(gKey.trim());
    onSaveOpenRouterKey(orKey.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
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
              <h3 className="text-base font-semibold text-[#ece9e2]">Model API & Cloud Settings</h3>
              <p className="text-xs text-[#9c978b]">Configure your free AI providers & unlimited daily quotas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2c2a25] text-[#9c978b] hover:text-[#ece9e2]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Gemini Free Key (Recommended) */}
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
              Zero debit card needed. Provides 0.8-second replies with 1,500 free daily requests.
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
              Your keys are encrypted in your browser's local storage and used directly for your sessions. They are never shared.
            </p>
          </div>
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
