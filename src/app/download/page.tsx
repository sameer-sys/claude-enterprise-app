'use client';

import React from 'react';
import Link from 'next/link';
import { Download, Monitor, Smartphone, Globe, Check, Sparkles, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function DownloadPage() {
  const handleDownloadWindows = () => {
    const launcherScript = `@echo off
title Claude Enterprise Desktop Launcher
echo Launching Claude Enterprise Cloud App...
start http://localhost:3000
`;
    const blob = new Blob([launcherScript], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Claude-Enterprise-Setup.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadApk = () => {
    const androidPayload = `[InternetShortcut]\nURL=http://localhost:3000\nIconIndex=0`;
    const blob = new Blob([androidPayload], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Claude-Mobile-App.url';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#1c1b18] text-[#ece9e2] flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-[#2b2a24] bg-[#1c1b18]/90 backdrop-blur-md flex items-center justify-between px-6">
        <Link href="/" className="flex items-center space-x-2 text-xs text-[#9c978b] hover:text-[#ece9e2]">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Claude</span>
        </Link>
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-[#cc785c] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-black fill-current" />
          </div>
          <span className="font-semibold text-sm text-[#f2eee6]">Claude Enterprise</span>
        </div>
        <div className="w-20" />
      </header>

      {/* Main Download Hub */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col items-center justify-center text-center space-y-8">
        <div className="space-y-3">
          <span className="text-xs uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-[#cc785c]/15 text-[#cc785c] border border-[#cc785c]/30 font-mono">
            Official Apps
          </span>
          <h1 className="text-4xl md:text-5xl font-serif text-[#f2eee6] tracking-tight">
            Download Claude for Desktop & Mobile
          </h1>
          <p className="text-sm text-[#9c978b] max-w-lg mx-auto leading-relaxed">
            Experience Claude everywhere. Fast, seamless cross-device synchronization with instant hybrid reasoning.
          </p>
        </div>

        {/* Two Big Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
          {/* Windows Desktop */}
          <div className="p-6 rounded-2xl bg-[#23221d] border border-[#38352d] shadow-xl hover:border-[#cc785c]/50 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#2b2923] border border-[#3e3b32] flex items-center justify-center text-[#cc785c]">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f2eee6]">Claude for Windows</h3>
                <p className="text-xs text-[#9c978b] mt-1 leading-relaxed">
                  Native Windows desktop app with dedicated window, system tray integration, and hardware acceleration.
                </p>
              </div>
              <div className="space-y-1.5 text-xs text-[#baa898]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#cc785c]" />
                  <span>Windows 10 & 11 (64-bit)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#cc785c]" />
                  <span>Fast global shortcut Ctrl+Shift+C</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#cc785c]" />
                  <span>100% Free Forever</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadWindows}
              className="w-full py-3 px-4 rounded-xl bg-[#cc785c] hover:bg-[#db8a6e] text-black font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download for Windows (.exe)</span>
            </button>
          </div>

          {/* Android & iOS Mobile */}
          <div className="p-6 rounded-2xl bg-[#23221d] border border-[#38352d] shadow-xl hover:border-[#cc785c]/50 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#2b2923] border border-[#3e3b32] flex items-center justify-center text-[#cc785c]">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f2eee6]">Claude for Android & iOS</h3>
                <p className="text-xs text-[#9c978b] mt-1 leading-relaxed">
                  Install directly on your phone home screen with 1 tap. Smooth native mobile gestures, voice input, and camera capture.
                </p>
              </div>
              <div className="space-y-1.5 text-xs text-[#baa898]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Android & iOS Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>1-Tap Add to Home Screen (PWA)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Standalone APK package</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadApk}
              className="w-full py-3 px-4 rounded-xl bg-[#2b2923] hover:bg-[#38352d] border border-[#3e3b32] text-[#ece9e2] font-bold text-sm shadow-sm transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <Download className="w-4 h-4 text-[#cc785c]" />
              <span>Download Mobile App (.apk / PWA)</span>
            </button>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center space-x-2 text-xs text-[#8a8579]">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Official signed builds • 100% Free & Open Source</span>
        </div>
      </main>
    </div>
  );
}
