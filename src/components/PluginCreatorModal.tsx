'use client';

import React, { useMemo, useState } from 'react';
import { Check, Download, Github, Loader2, X, Zap } from 'lucide-react';

interface PluginCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallGitHubConnector?: () => void;
}

export default function PluginCreatorModal({ isOpen, onClose, onInstallGitHubConnector }: PluginCreatorModalProps) {
  const [name, setName] = useState('GitHub Workspace');
  const [description, setDescription] = useState('Use GitHub repositories, issues, pull requests, code, Actions, and other GitHub MCP tools from the workspace.');
  const [toolset, setToolset] = useState<'all' | 'default' | 'readonly'>('all');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [downloaded, setDownloaded] = useState(false);

  const slug = useMemo(() => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'github-workspace', [name]);

  if (!isOpen) return null;

  const createPlugin = async () => {
    setCreating(true);
    setMessage('');
    setDownloaded(false);
    try {
      const response = await fetch('/api/plugins/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, slug, toolset }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.archiveBase64) throw new Error(data?.error || 'Could not create the plugin package.');

      const bytes = Uint8Array.from(atob(data.archiveBase64), (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/gzip' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = data.filename || \`\${slug}.tar.gz\`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setMessage('GitHub plugin package created and downloaded.');
    } catch (error: any) {
      setMessage(String(error?.message || error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl border border-[#38352d] bg-[#181714] text-[#ece9e2] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2b25]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#25231e] border border-[#3a372f] flex items-center justify-center"><Zap className="w-4 h-4 text-[#cc785c]" /></div>
            <div><h2 className="text-base font-bold">Plugin Creator</h2><p className="text-[11px] text-[#8f8a80]">Create a ready-to-install MCP plugin package.</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#8f8a80] hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 rounded-xl border border-[#38352d] bg-[#141310] flex items-start gap-3">
            <Github className="w-5 h-5 mt-0.5 text-[#f0ede6]" />
            <div><div className="text-sm font-semibold">GitHub plugin</div><div className="text-xs text-[#8f8a80] mt-1">Uses GitHub's hosted Remote MCP server. Authentication is handled by the host when the connector is authorized.</div></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">Plugin name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full px-3 py-2 rounded-xl border border-[#38352d] bg-[#201e1a] font-normal focus:outline-none focus:border-[#cc785c]/60" /></label>
            <label className="text-xs font-semibold">Package id<input value={slug} readOnly className="mt-1.5 w-full px-3 py-2 rounded-xl border border-[#38352d] bg-[#171612] text-[#9b9589] font-mono font-normal" /></label>
          </div>

          <label className="block text-xs font-semibold">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5 w-full px-3 py-2 rounded-xl border border-[#38352d] bg-[#201e1a] font-normal resize-none focus:outline-none focus:border-[#cc785c]/60" /></label>

          <div>
            <div className="text-xs font-semibold mb-2">GitHub tool access</div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['all', 'All tools', 'Repositories, issues, PRs, Actions and more'],
                ['default', 'Default', 'Core GitHub tools'],
                ['readonly', 'Read only', 'Prevents write operations'],
              ] as const).map(([value, title, detail]) => (
                <button key={value} type="button" onClick={() => setToolset(value)} className={\`text-left p-3 rounded-xl border \${toolset === value ? 'border-[#cc785c] bg-[#2a211c]' : 'border-[#38352d] bg-[#201e1a]'}\`}>
                  <div className="text-xs font-semibold">{title}</div><div className="text-[10px] text-[#8f8a80] mt-1 leading-relaxed">{detail}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-[#8f8a80]">{message || 'Creates plugin.json, MCP configuration, GitHub skill instructions, and compatibility metadata.'}</div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onInstallGitHubConnector} type="button" className="px-3 py-2 rounded-xl border border-[#38352d] text-xs font-semibold hover:bg-[#25231e]">Open GitHub connector</button>
              <button onClick={createPlugin} disabled={creating || !name.trim()} type="button" className="px-4 py-2 rounded-xl bg-[#cc785c] text-black text-xs font-bold disabled:opacity-50">
                {creating ? <><Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1" />Creating…</> : downloaded ? <><Check className="w-3.5 h-3.5 inline mr-1" />Created</> : <><Download className="w-3.5 h-3.5 inline mr-1" />Create & Download</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
