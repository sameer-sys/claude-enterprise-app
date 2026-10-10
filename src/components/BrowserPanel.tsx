'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  ExternalLink,
  Maximize2,
  Minimize2,
  X,
  Search,
  Lock,
  Sparkles,
  Play,
  Check,
} from 'lucide-react';

interface BrowserPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  agentTask?: string;
  isAgentRunning?: boolean;
  agentStepText?: string;
  onUrlChange?: (url: string) => void;
}

export default function BrowserPanel({
  isOpen,
  onClose,
  initialUrl = 'https://www.google.com',
  agentTask,
  isAgentRunning = false,
  agentStepText,
  onUrlChange,
}: BrowserPanelProps) {
  const [currentUrl, setCurrentUrl] = useState<string>(initialUrl);
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync when initialUrl changes externally (e.g. from AI action)
  useEffect(() => {
    if (initialUrl && initialUrl !== currentUrl) {
      navigateTo(initialUrl);
    }
  }, [initialUrl]);

  if (!isOpen) return null;

  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return 'https://www.google.com';

    // Check if it looks like a search query rather than a URL
    if (!trimmed.includes('.') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}&igu=1`;
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }

    return trimmed;
  };

  const navigateTo = (target: string) => {
    const clean = normalizeUrl(target);
    setIsLoading(true);
    setCurrentUrl(clean);
    setInputUrl(clean);

    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      return [...next, clean];
    });
    setHistoryIndex((prev) => prev + 1);
    setIframeKey((k) => k + 1);
    onUrlChange?.(clean);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl) {
      navigateTo(inputUrl);
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHistoryIndex((prev) => prev - 1);
      setCurrentUrl(target);
      setInputUrl(target);
      setIframeKey((k) => k + 1);
      onUrlChange?.(target);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHistoryIndex((prev) => prev + 1);
      setCurrentUrl(target);
      setInputUrl(target);
      setIframeKey((k) => k + 1);
      onUrlChange?.(target);
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey((k) => k + 1);
  };

  const handleHome = () => {
    navigateTo('https://www.google.com');
  };

  // Convert URLs so they never hit X-Frame-Options blocking or white screen
  const getEmbeddableUrl = (url: string): string => {
    try {
      const isElectron =
        typeof window !== 'undefined' &&
        (Boolean((window as any).electron) ||
          Boolean((window as any).process?.versions?.electron) ||
          navigator.userAgent.includes('Electron'));

      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      // YouTube specific handling:
      if (host.includes('youtube.com') || host.includes('youtu.be')) {
        let videoId = parsed.searchParams.get('v');
        if (!videoId && host.includes('youtu.be')) {
          videoId = parsed.pathname.replace(/^\//, '');
        }
        if (videoId) {
          return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
        }
        const searchQ = parsed.searchParams.get('search_query');
        if (searchQ) {
          return `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(searchQ)}&autoplay=1`;
        }
        // General YouTube home / search embed
        return `https://www.youtube-nocookie.com/embed?listType=search&list=trending&autoplay=0`;
      }

      // Google search handling:
      if (host.includes('google.com')) {
        if (!parsed.searchParams.has('igu')) {
          parsed.searchParams.set('igu', '1');
        }
        return parsed.toString();
      }

      // If running in Electron, Electron's header stripper handles all sites directly:
      if (isElectron) {
        return url;
      }

      // In browser/cloud, for sites known to enforce X-Frame-Options:
      if (
        host.includes('github.com') ||
        host.includes('instagram.com') ||
        host.includes('twitter.com') ||
        host.includes('x.com') ||
        host.includes('reddit.com')
      ) {
        return `/api/proxy?url=${encodeURIComponent(url)}`;
      }
    } catch {}
    return url;
  };

  const embedUrl = getEmbeddableUrl(currentUrl);

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-[#161512] border-l border-[#2e2c25] flex flex-col z-40 transition-all duration-200 shadow-2xl ${
        isFullscreen ? 'w-full inset-0 z-50' : 'w-full md:w-[680px] lg:w-[820px] xl:w-[920px]'
      }`}
    >
      {/* Top Chrome Header: Nav, Address Bar, Window Controls */}
      <div className="flex flex-col border-b border-[#2a2822] bg-[#1d1c18] shrink-0">
        {/* Main Toolbar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 gap-2">
          {/* History Controls */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={handleBack}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg hover:bg-[#2b2923] text-[#a09b8f] hover:text-[#ece9e2] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleForward}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg hover:bg-[#2b2923] text-[#a09b8f] hover:text-[#ece9e2] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleReload}
              className={`p-1.5 rounded-lg hover:bg-[#2b2923] text-[#a09b8f] hover:text-[#ece9e2] transition-colors ${
                isLoading ? 'animate-spin text-[#cc785c]' : ''
              }`}
              title="Reload"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleHome}
              className="p-1.5 rounded-lg hover:bg-[#2b2923] text-[#a09b8f] hover:text-[#ece9e2] transition-colors"
              title="Home"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>

          {/* Omnibox / Address Bar */}
          <form onSubmit={handleInputSubmit} className="flex-1 min-w-[200px] relative">
            <div className="flex items-center px-3 py-1.5 rounded-xl bg-[#24221d] border border-[#38352d] focus-within:border-[#cc785c]/70 transition-all text-xs">
              <Lock className="w-3.5 h-3.5 text-emerald-400 mr-2 shrink-0" />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Search or type URL (e.g. youtube.com, google.com)..."
                className="w-full bg-transparent text-[#ede8df] placeholder-[#6b675e] focus:outline-none font-mono text-[12px] truncate"
              />
              <button
                type="submit"
                className="ml-1 text-[11px] font-semibold text-[#cc785c] hover:text-[#db8a6e] px-1.5 py-0.5 rounded transition-colors"
              >
                Go
              </button>
            </div>
          </form>

          {/* Action / View Controls */}
          <div className="flex items-center space-x-1 shrink-0">
            <div className="hidden sm:flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-[#24221d] border border-[#38352d] text-[11px] text-[#baa898]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">Live Browser</span>
            </div>

            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-[#2b2923] text-[#a09b8f] hover:text-[#ece9e2] transition-colors"
              title="Open in external browser window"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg hover:bg-[#2b2923] text-[#a09b8f] hover:text-[#ece9e2] transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Browser'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-rose-950/40 hover:text-rose-300 text-[#a09b8f] transition-colors"
              title="Close Browser"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Launch Shortcuts Bar */}
        <div className="flex items-center space-x-2 px-3.5 pb-2 text-[11px] overflow-x-auto no-scrollbar">
          <span className="text-[#6b675e] font-semibold uppercase tracking-wider text-[10px] shrink-0">
            Quick:
          </span>
          <button
            type="button"
            onClick={() => navigateTo('https://www.youtube.com')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#26241e] hover:bg-[#302e26] border border-[#38352d] text-[#e0ded8] hover:text-white transition-all shrink-0"
          >
            <span className="text-red-500 font-bold">▶</span>
            <span>YouTube</span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo('https://www.google.com')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#26241e] hover:bg-[#302e26] border border-[#38352d] text-[#e0ded8] hover:text-white transition-all shrink-0"
          >
            <Search className="w-3 h-3 text-blue-400" />
            <span>Google</span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo('https://github.com')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#26241e] hover:bg-[#302e26] border border-[#38352d] text-[#e0ded8] hover:text-white transition-all shrink-0"
          >
            <span className="text-purple-400 font-bold">🐙</span>
            <span>GitHub</span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo('https://en.wikipedia.org')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#26241e] hover:bg-[#302e26] border border-[#38352d] text-[#e0ded8] hover:text-white transition-all shrink-0"
          >
            <span className="text-slate-300 font-serif font-bold">W</span>
            <span>Wikipedia</span>
          </button>
        </div>

        {/* Active AI Agent Banner (Visible when AI is controlling the browser) */}
        {(isAgentRunning || agentStepText) && (
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#cc785c]/20 border-t border-[#cc785c]/35 text-xs text-[#f2eee6] animate-in fade-in">
            <div className="flex items-center space-x-2 truncate">
              <Sparkles className="w-3.5 h-3.5 text-[#cc785c] animate-spin shrink-0" />
              <span className="font-semibold text-[#cc785c]">AI Browser Action:</span>
              <span className="truncate text-[#e6e2d8] font-mono text-[11.5px]">
                {agentStepText || agentTask || 'Executing task in browser...'}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#cc785c]/30 text-[#f2eee6] shrink-0">
              Live
            </span>
          </div>
        )}
      </div>

      {/* Main Browser Viewport */}
      <div className="flex-1 w-full h-full bg-[#141310] relative overflow-hidden">
        {/* Loading Bar */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#cc785c] animate-pulse z-10" />
        )}

        {/* Live Iframe Viewport */}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={embedUrl}
          title="Sameer AI Browser"
          className="w-full h-full border-0 bg-white"
          onLoad={() => setIsLoading(false)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-modals"
        />
      </div>
    </div>
  );
}
