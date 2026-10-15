'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ShieldCheck,
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
  const viewportRef = useRef<HTMLDivElement>(null);

  const isElectron =
    typeof window !== 'undefined' &&
    Boolean((window as any).electronAPI?.browser || (window as any).electronAPI?.isElectron);

  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return 'https://www.google.com';

    if (!trimmed.includes('.') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}&igu=1`;
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }

    return trimmed;
  };

  // Sync Native Chromium Bounds with the DOM Viewport rectangle
  const syncNativeBounds = useCallback(() => {
    if (!isOpen || !viewportRef.current) return;
    const electronBrowser = (window as any)?.electronAPI?.browser;
    if (!electronBrowser) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const bounds = {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };

    if (bounds.width > 20 && bounds.height > 20) {
      electronBrowser.show(bounds);
      electronBrowser.bounds(bounds);
    }
  }, [isOpen]);

  // Handle open / close / resize for native view
  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.browser) {
        (window as any).electronAPI.browser.hide();
      }
      return;
    }

    // Delay slightly to ensure panel transition/DOM layout is final
    const timer1 = setTimeout(syncNativeBounds, 50);
    const timer2 = setTimeout(syncNativeBounds, 250);

    window.addEventListener('resize', syncNativeBounds);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', syncNativeBounds);
      if (typeof window !== 'undefined' && (window as any).electronAPI?.browser) {
        (window as any).electronAPI.browser.hide();
      }
    };
  }, [isOpen, isFullscreen, syncNativeBounds]);

  // Sync when initialUrl changes externally
  useEffect(() => {
    if (initialUrl && initialUrl !== currentUrl) {
      navigateTo(initialUrl);
    }
  }, [initialUrl]);

  if (!isOpen) return null;

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

    if (typeof window !== 'undefined' && (window as any).electronAPI?.browser) {
      (window as any).electronAPI.browser.navigate(clean);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl) {
      navigateTo(inputUrl);
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.browser) {
      (window as any).electronAPI.browser.back();
    }
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHistoryIndex((prev) => prev - 1);
      setCurrentUrl(target);
      setInputUrl(target);
      onUrlChange?.(target);
    }
  };

  const handleForward = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.browser) {
      (window as any).electronAPI.browser.forward();
    }
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHistoryIndex((prev) => prev + 1);
      setCurrentUrl(target);
      setInputUrl(target);
      onUrlChange?.(target);
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    if (typeof window !== 'undefined' && (window as any).electronAPI?.browser) {
      (window as any).electronAPI.browser.reload();
    }
    setIframeKey((k) => k + 1);
  };

  const handleHome = () => {
    navigateTo('https://www.google.com');
  };

  const handleOpenExternal = () => {
    if (typeof window !== 'undefined') {
      window.open(currentUrl, '_blank');
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.browser) {
      (window as any).electronAPI.browser.hide();
    }
    onClose();
  };

  const getEmbeddableUrl = (url: string): string => {
    if (isElectron) return url;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host.includes('youtube.com') || host.includes('youtu.be')) {
        let videoId = parsed.searchParams.get('v');
        if (!videoId && host.includes('youtu.be')) {
          videoId = parsed.pathname.replace(/^\//, '');
        }
        if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
        return `https://www.youtube-nocookie.com/embed/videoseries?list=PL4fGSI1pDJn6jXS_PEoNxmdaZwVO397yg`;
      }
      if (host.includes('google.com') && !parsed.searchParams.has('igu')) {
        parsed.searchParams.set('igu', '1');
        return parsed.toString();
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
              disabled={historyIndex <= 0 && !isElectron}
              className="p-1.5 rounded-lg hover:bg-[#2b2923] text-[#a09b8f] hover:text-[#ece9e2] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleForward}
              disabled={historyIndex >= history.length - 1 && !isElectron}
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

          {/* URL Omnibox */}
          <form onSubmit={handleInputSubmit} className="flex-1 min-w-0">
            <div className="flex items-center bg-[#141310] hover:bg-[#181713] focus-within:bg-[#181713] border border-[#333028] focus-within:border-[#cc785c] rounded-xl px-3 py-1.5 transition-all shadow-inner">
              <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0 mr-2" />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Search or enter URL (e.g. google.com, github.com)"
                className="w-full bg-transparent text-xs text-[#ece9e2] placeholder-[#6b675e] focus:outline-none font-mono"
              />
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-[#cc785c] border-t-transparent rounded-full animate-spin shrink-0 ml-2" />
              ) : (
                <button type="submit" className="text-[#a09b8f] hover:text-[#ece9e2] shrink-0 ml-2" title="Go">
                  <Search className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Window / Action Controls */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={handleOpenExternal}
              className="p-1.5 rounded-lg hover:bg-[#2b2923] text-[#a09b8f] hover:text-[#ece9e2] transition-colors"
              title="Open in default system browser"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFullscreen((prev) => !prev);
                setTimeout(syncNativeBounds, 120);
              }}
              className="p-1.5 rounded-lg hover:bg-[#2b2923] text-[#a09b8f] hover:text-[#ece9e2] transition-colors"
              title={isFullscreen ? 'Restore' : 'Maximize'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-[#a09b8f] hover:text-red-400 transition-colors"
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
            onClick={() => navigateTo('https://www.youtube.com')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#26241e] hover:bg-[#302e26] border border-[#38352d] text-[#e0ded8] hover:text-white transition-all shrink-0"
          >
            <span className="text-red-500 font-bold">▶</span>
            <span>YouTube</span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo('https://x.com')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#26241e] hover:bg-[#302e26] border border-[#38352d] text-[#e0ded8] hover:text-white transition-all shrink-0"
          >
            <span className="text-sky-400 font-bold">𝕏</span>
            <span>Twitter/X</span>
          </button>
          {/* AI Eye / Observer Indicator & Chrome Sign-in Bridge */}
          <div className="flex items-center space-x-2 ml-auto shrink-0">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AI Eye: Active</span>
            </div>
            <button
              type="button"
              onClick={handleOpenExternal}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#cc785c]/15 hover:bg-[#cc785c]/25 border border-[#cc785c]/35 text-[#f2eee6] text-[11px] font-medium transition-all"
              title="Open current URL in your system Chrome/Edge with saved Google/GitHub logins"
            >
              <ExternalLink className="w-3 h-3 text-[#cc785c]" />
              <span>Sign In via Chrome ↗</span>
            </button>
          </div>
        </div>

        {/* Active AI Agent Banner (Visible when AI is controlling the browser) */}
        {(isAgentRunning || agentStepText) && (
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#cc785c]/20 border-t border-[#cc785c]/35 text-xs text-[#f2eee6] animate-in fade-in">
            <div className="flex items-center space-x-2 truncate">
              <Sparkles className="w-3.5 h-3.5 text-[#cc785c] animate-spin shrink-0" />
              <span className="font-semibold text-[#cc785c]">AI Browser Observer:</span>
              <span className="truncate text-[#e6e2d8] font-mono text-[11.5px]">
                {agentStepText || agentTask || 'Keeping eye on browser and tracking page...'}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#cc785c]/30 text-[#f2eee6] shrink-0">
              Live
            </span>
          </div>
        )}
      </div>

      {/* Main Browser Viewport: Live, Visible, and Interactive */}
      <div ref={viewportRef} className="flex-1 w-full h-full bg-[#141310] relative overflow-hidden">
        {/* Loading Bar */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#cc785c] animate-pulse z-10" />
        )}

        {/* Live Interactive Browser Viewport */}
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
