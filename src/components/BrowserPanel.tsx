'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Maximize2,
  Minimize2,
  X,
  Search,
  Lock,
  Sparkles,
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
  initialUrl = 'https://github.com',
  agentTask,
  isAgentRunning = false,
  agentStepText,
  onUrlChange,
}: BrowserPanelProps) {
  const [currentUrl, setCurrentUrl] = useState<string>(initialUrl);
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Live Mirror State (from real external Chrome)
  const [mirrorImage, setMirrorImage] = useState<string | null>(null);
  const [mirrorTitle, setMirrorTitle] = useState<string>('External Chrome');

  const mirrorImgRef = useRef<HTMLImageElement>(null);

  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return 'https://github.com';
    if (!trimmed.includes('.') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  // Poll / Fetch Live Screen Mirror from Real Chrome
  const fetchMirror = useCallback(async () => {
    if (!isOpen) return;
    try {
      const res = await fetch('/api/browser-mirror');
      const data = await res.json();
      if (data?.isRunning) {
        if (data.screenshot) setMirrorImage(data.screenshot);
        if (data.url && data.url !== 'about:blank') {
          setCurrentUrl(data.url);
          setInputUrl(data.url);
          onUrlChange?.(data.url);
        }
        if (data.title) setMirrorTitle(data.title);
      }
    } catch {}
  }, [isOpen, onUrlChange]);

  // Periodic poll while mirror is open
  useEffect(() => {
    if (!isOpen) return;
    fetchMirror();
    const interval = setInterval(fetchMirror, 1500);
    return () => clearInterval(interval);
  }, [isOpen, fetchMirror]);

  // Execute Action on Real Chrome
  const executeAction = async (action: string, payload: Record<string, any> = {}) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/browser-mirror', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (data?.success) {
        if (data.screenshot) setMirrorImage(data.screenshot);
        if (data.url) {
          setCurrentUrl(data.url);
          setInputUrl(data.url);
          onUrlChange?.(data.url);
        }
        if (data.title) setMirrorTitle(data.title);
      }
    } catch (e) {
      console.error('Browser action failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateTo = (target: string) => {
    const clean = normalizeUrl(target);
    setCurrentUrl(clean);
    setInputUrl(clean);
    onUrlChange?.(clean);
    executeAction('navigate', { url: clean });
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl) navigateTo(inputUrl);
  };

  const handleBack = () => executeAction('back');
  const handleForward = () => executeAction('forward');
  const handleReload = () => executeAction('reload');
  const handleHome = () => navigateTo('https://github.com');

  // Click on the mirror image -> dispatches click to real Chrome at calculated coordinates
  const handleMirrorClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!mirrorImgRef.current) return;
    const rect = mirrorImgRef.current.getBoundingClientRect();
    const naturalWidth = mirrorImgRef.current.naturalWidth || 1280;
    const naturalHeight = mirrorImgRef.current.naturalHeight || 800;

    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX);
    const clickY = Math.round((e.clientY - rect.top) * scaleY);

    executeAction('click', { x: clickX, y: clickY });
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-[#161512] border-l border-[#2e2c25] flex flex-col z-40 transition-all duration-200 shadow-2xl ${
        isFullscreen ? 'w-full inset-0 z-50' : 'w-full md:w-[720px] lg:w-[860px] xl:w-[960px]'
      }`}
    >
      {/* Top Header: Nav, Clean Address Bar, Window Controls */}
      <div className="flex flex-col border-b border-[#2a2822] bg-[#1d1c18] shrink-0">
        {/* Main Toolbar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 gap-2">
          {/* History Controls */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 rounded-lg hover:bg-[#2b2923] text-[#a09b8f] hover:text-[#ece9e2] transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleForward}
              className="p-1.5 rounded-lg hover:bg-[#2b2923] text-[#a09b8f] hover:text-[#ece9e2] transition-colors"
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

          {/* Clean URL Omnibox */}
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

          {/* Window Controls */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 rounded-lg hover:bg-[#2b2923] text-[#a09b8f] hover:text-[#ece9e2] transition-colors"
              title={isFullscreen ? 'Restore' : 'Maximize'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-[#a09b8f] hover:text-red-400 transition-colors"
              title="Close Browser"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clean Shortcuts */}
        <div className="flex items-center space-x-2 px-3.5 pb-2 text-[11px] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => navigateTo('https://github.com')}
            className="px-2.5 py-1 rounded-lg bg-[#26241e] hover:bg-[#302e26] border border-[#38352d] text-[#e0ded8] hover:text-white transition-all text-[11px]"
          >
            GitHub
          </button>
          <button
            type="button"
            onClick={() => navigateTo('https://www.google.com')}
            className="px-2.5 py-1 rounded-lg bg-[#26241e] hover:bg-[#302e26] border border-[#38352d] text-[#e0ded8] hover:text-white transition-all text-[11px]"
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => navigateTo('https://www.youtube.com')}
            className="px-2.5 py-1 rounded-lg bg-[#26241e] hover:bg-[#302e26] border border-[#38352d] text-[#e0ded8] hover:text-white transition-all text-[11px]"
          >
            YouTube
          </button>
        </div>

        {/* Active AI Agent Banner (Visible only when AI is actively performing browser actions) */}
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

      {/* Main Viewport: Clean In-App Mirror of Real Chrome */}
      <div className="flex-1 w-full h-full bg-[#0d0c0a] relative overflow-hidden flex items-center justify-center">
        {/* Loading Bar */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#cc785c] animate-pulse z-20" />
        )}

        {mirrorImage ? (
          <img
            ref={mirrorImgRef}
            src={mirrorImage}
            alt={mirrorTitle}
            onClick={handleMirrorClick}
            className="max-w-full max-h-full object-contain cursor-pointer shadow-2xl transition-opacity duration-150 select-none"
            title="Mirrored from external Chrome • Click anywhere to interact"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[#8a8579]">
            <Globe className="w-8 h-8 text-[#cc785c] animate-spin mb-3" />
            <p className="text-xs font-semibold text-[#ece9e2] mb-1">
              Connecting to Browser Mirror...
            </p>
            <p className="text-[11px] text-[#6d685e] max-w-sm">
              Mirroring your external Chrome browser session live.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
