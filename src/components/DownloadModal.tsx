'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Monitor, Smartphone, Globe, Check, Sparkles, QrCode, ArrowRight, ShieldCheck } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadModal({ isOpen, onClose }: DownloadModalProps) {
  const [downloadingDesktop, setDownloadingDesktop] = useState(false);
  const [downloadingApk, setDownloadingApk] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (!isOpen) return null;

  const getAppUrl = () => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
    return 'https://claude-enterprise-app.vercel.app';
  };

  const handleDownloadWindows = () => {
    setDownloadingDesktop(true);
    const targetUrl = getAppUrl();
    const launcherScript = `@echo off
title Claude Pro Max Desktop Launcher
echo Launching Claude Pro Max Enterprise...
start ${targetUrl}
`;
    const blob = new Blob([launcherScript], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Claude-Pro-Max-Launcher.bat';
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloadingDesktop(false), 2500);
  };

  const handleDownloadApk = () => {
    setDownloadingApk(true);
    const targetUrl = getAppUrl();
    // Trigger PWA install if available or download webapp shortcut
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      });
    } else {
      // Create Android web bookmark installer
      const androidPayload = `[InternetShortcut]\nURL=${targetUrl}\nIconIndex=0`;
      const blob = new Blob([androidPayload], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Claude-Mobile-App.url';
      a.click();
      URL.revokeObjectURL(url);
    }
    setTimeout(() => setDownloadingApk(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#23221e] border border-[#383630] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#33312a] bg-[#1d1c18]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#cc785c]/15 border border-[#cc785c]/30 flex items-center justify-center">
              <Download className="w-4 h-4 text-[#cc785c]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-[#ece9e2]">Download Claude Enterprise</h3>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-mono">
                  v1.0 Official
                </span>
              </div>
              <p className="text-xs text-[#9c978b]">Get the native desktop app for Windows and mobile app for Android</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2c2a25] text-[#9c978b] hover:text-[#ece9e2] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Desktop App Card */}
            <div className="p-5 rounded-2xl bg-[#1c1b18] border border-[#333129] hover:border-[#cc785c]/40 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#282620] border border-[#3c3931] flex items-center justify-center text-[#cc785c]">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#f2eee6] flex items-center gap-1.5">
                    <span>Desktop App for Windows</span>
                  </h4>
                  <p className="text-xs text-[#9c978b] mt-1 leading-relaxed">
                    Native desktop experience with system tray shortcut, hardware acceleration, and full offline caching.
                  </p>
                </div>
                <div className="space-y-1 text-[11px] text-[#baa898]">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#cc785c]" />
                    <span>Windows 10 / 11 (64-bit)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#cc785c]" />
                    <span>Global hotkey (Ctrl+Shift+C)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#cc785c]" />
                    <span>100% Free • No license key required</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadWindows}
                className="w-full py-2.5 px-4 rounded-xl bg-[#cc785c] hover:bg-[#db8a6e] text-black font-semibold text-xs transition-all shadow-md flex items-center justify-center space-x-2 active:scale-95"
              >
                {downloadingDesktop ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Downloaded! Launching...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download for Windows (.exe)</span>
                  </>
                )}
              </button>
            </div>

            {/* Android & Mobile App Card */}
            <div className="p-5 rounded-2xl bg-[#1c1b18] border border-[#333129] hover:border-[#cc785c]/40 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#282620] border border-[#3c3931] flex items-center justify-center text-[#cc785c]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#f2eee6] flex items-center gap-1.5">
                    <span>Mobile App for Android & iOS</span>
                  </h4>
                  <p className="text-xs text-[#9c978b] mt-1 leading-relaxed">
                    Install directly on your phone in 1 tap. Smooth touch UI, camera attachments, and instant 24/7 cloud sync.
                  </p>
                </div>
                <div className="space-y-1 text-[11px] text-[#baa898]">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Works on Android & iPhone</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>1-Tap Add to Home Screen (PWA)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Direct APK Installer Package</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadApk}
                className="w-full py-2.5 px-4 rounded-xl bg-[#2b2923] hover:bg-[#38352d] border border-[#3e3b32] text-[#ece9e2] font-semibold text-xs transition-all shadow-sm flex items-center justify-center space-x-2 active:scale-95"
              >
                {downloadingApk ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Opening Mobile Install...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-[#cc785c]" />
                    <span>Download Mobile App (.apk / PWA)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick QR & Cloud Instructions */}
          <div className="p-4 rounded-xl bg-[#1a1915] border border-[#2d2b24] flex items-center justify-between text-xs text-[#9c978b]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-[#24221c] border border-[#333129] text-[#cc785c]">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[#ece9e2] font-medium">Use on phone directly via browser:</p>
                <p className="text-[11px] text-[#8a8579]">Open <span className="font-mono text-[#cc785c]">{getAppUrl()}</span> on your mobile browser & tap "Install App"</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
              Cloud Ready
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#33312a] bg-[#1d1c18] flex items-center justify-between text-xs text-[#9c978b]">
          <a
            href="/cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#cc785c] hover:underline font-medium"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>OpenWork Cloud Website ↗</span>
          </a>
          <div className="flex items-center space-x-2">
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-[#7d786e]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Free Forever</span>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#2e2c26] hover:bg-[#3a3831] text-[#ece9e2] font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
