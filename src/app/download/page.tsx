'use client';

import React from 'react';
import Link from 'next/link';
import { Download, Monitor, Smartphone, Globe, Check, Sparkles, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function DownloadPage() {
  const desktopDownloadUrl = 'https://github.com/sameer-sys/claude-enterprise-app/releases/latest/download/Sameer-AI-Workspace-Setup.exe';
  const androidDownloadUrl = 'https://github.com/sameer-sys/claude-enterprise-app/releases/latest/download/Sameer-AI-Workspace-Android.apk';

  return (
    <div className="min-h-screen bg-[#1c1b18] text-[#ede8df] flex flex-col selection:bg-[#cc785c]/30">
      {/* Top Bar */}
      <header className="h-14 border-b border-[#2b2a24] bg-[#1c1b18]/90 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0">
        <Link
          href="/"
          className="flex items-center space-x-2 text-xs font-medium text-[#9c978b] hover:text-[#ece9e2] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </Link>
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-[#cc785c] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-black fill-current" />
          </div>
          <span className="font-semibold text-sm text-[#f2eee6]">Sameer AI Workspace</span>
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
            Download Sameer AI Workspace
          </h1>
          <p className="text-sm text-[#9c978b] max-w-lg mx-auto leading-relaxed">
            Experience your autonomous workspace everywhere. Fast, seamless cross-device synchronization with instant hybrid reasoning.
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
                <h3 className="text-lg font-semibold text-[#f2eee6]">Sameer AI Workspace for Windows</h3>
                <p className="text-xs text-[#9c978b] mt-1 leading-relaxed">
                  Dedicated app window — no browser tabs, no address bar. Runs exactly like a native desktop app with its own taskbar icon.
                </p>
              </div>
              <div className="space-y-1.5 text-xs text-[#baa898]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#cc785c]" />
                  <span>Dedicated window — no browser chrome</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#cc785c]" />
                  <span>Own taskbar icon — pin it like any app</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#cc785c]" />
                  <span>Native Windows installer — 64-bit</span>
                </div>
              </div>
            </div>

            <a href={desktopDownloadUrl}
              
              className="w-full py-3 px-4 rounded-xl bg-[#cc785c] hover:bg-[#db8a6e] text-black font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download Windows Installer (.exe)</span>
            </a>

          </div>

          {/* Android & iOS Mobile */}
          <div className="p-6 rounded-2xl bg-[#23221d] border border-[#38352d] shadow-xl hover:border-[#cc785c]/50 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#2b2923] border border-[#3e3b32] flex items-center justify-center text-[#cc785c]">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f2eee6]">Sameer AI Workspace for Android</h3>
                <p className="text-xs text-[#9c978b] mt-1 leading-relaxed">
                  Install directly on your phone home screen with 1 tap. Smooth native mobile gestures, voice input, and camera capture.
                </p>
              </div>
              <div className="space-y-1.5 text-xs text-[#baa898]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Android APK available now</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Native Android application package</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Separate app from the web/PWA</span>
                </div>
              </div>
            </div>

            <a
              href={androidDownloadUrl}
              className="w-full py-3 px-4 rounded-xl bg-[#2b2923] hover:bg-[#38352d] border border-[#3e3b32] text-[#ece9e2] font-bold text-sm shadow-sm transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <Download className="w-4 h-4 text-[#cc785c]" />
              <span>Download Android App (.apk)</span>
            </a>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center space-x-2 text-xs text-[#8a8579]">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Official native builds • Web app remains unchanged</span>
        </div>
      </main>
    </div>
  );
}  const handleDownloadWindows = () => {
    window.location.href = 'https://github.com/sameer-sys/claude-enterprise-app/releases/latest/download/Sameer-AI-Workspace-Setup.exe';
  };

  const handleDownloadApk = () => {
    window.location.href = 'https://github.com/sameer-sys/claude-enterprise-app/releases/latest/download/Sameer-AI-Workspace-Android.apk';
  };
