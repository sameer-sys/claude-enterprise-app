'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Download,
  Monitor,
  Smartphone,
  Globe,
  Check,
  ShieldCheck,
  Terminal,
  Cpu,
  Zap,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Github,
  Mail,
  HardDrive,
  FolderKanban,
  CheckCircle2,
  ChevronDown,
  Layers,
  Code2,
  Brain,
  Sliders,
  Play,
  Copy,
  Radio,
} from 'lucide-react';

export default function OpenWorkCloudPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [demoInput, setDemoInput] = useState('Send an email to team@company.com with project updates');
  const [demoOutput, setDemoOutput] = useState<string | null>(null);
  const [isDemoRunning, setIsDemoRunning] = useState(false);

  const handleDownloadWindows = () => {
    const launcherScript = `@echo off
title Claude Enterprise & OpenWork Cloud Launcher
echo ========================================================
echo Launching Claude Enterprise Pro Max - OpenWork Cloud
echo URL: https://claude-enterprise-app.vercel.app
echo ========================================================
start https://claude-enterprise-app.vercel.app
exit
`;
    const blob = new Blob([launcherScript], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Claude-Enterprise-OpenWork-Setup.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAndroid = () => {
    const androidPayload = `[InternetShortcut]\nURL=https://claude-enterprise-app.vercel.app\nIconIndex=0`;
    const blob = new Blob([androidPayload], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Claude-OpenWork-Mobile.url';
    a.click();
    URL.revokeObjectURL(url);
  };

  const runDemo = () => {
    setIsDemoRunning(true);
    setDemoOutput(null);
    setTimeout(() => {
      setDemoOutput(
        `### Connector command preview\n\n` +
        `**Command:** ${demoInput}\n\n` +
        `This public demo does not connect to your Gmail, GitHub, or other third-party accounts. In the workspace, connectors execute only after the provider/runtime authorization succeeds.\n\n` +
        `No email was sent and no external action was performed by this demo.`
      );
      setIsDemoRunning(false);
    }, 900);
  };

  const faqs = [
    {
      q: 'How do I use the OpenWork Cloud Web App?',
      a: 'Simply click "Launch Web App" at the top of this page or navigate to https://claude-enterprise-app.vercel.app. The web app runs instantly in any modern web browser without requiring installation or subscription payment.',
    },
    {
      q: 'How do I install on Windows or Android?',
      a: 'Click "Download for Windows" to get the 1-click desktop launcher, or click "Download for Android" to install the mobile companion. In Google Chrome or Microsoft Edge, you can also click the "Install App" button in the address bar to install it as an offline-capable PWA.',
    },
    {
      q: 'Is OpenWork Cloud really 100% Free Forever ($0)?',
      a: 'Yes! All features—including Claude 3.7 Sonnet reasoning, 16k-64k extended thinking budgets, 260+ OpenWork autonomous agents, and Model Context Protocol connectors—are provided free of charge with zero credit card requirements.',
    },
    {
      q: 'Can each chat connect different email accounts and GitHub repos?',
      a: 'Yes! Connectors are isolated per chat. When you switch or create a conversation, you can link unique Gmail accounts (e.g. work vs personal) or target different GitHub repositories without cross-contamination.',
    },
    {
      q: 'What is the Model Context Protocol (MCP)?',
      a: 'Model Context Protocol (MCP) is an open industry standard that allows Claude to securely read local files, execute terminal commands, search GitHub repositories, query databases, and manage mailboxes in real-time.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#141310] text-[#ece9e2] selection:bg-[#cc785c]/30 selection:text-white flex flex-col font-sans">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-[#cc785c]/15 via-[#cc785c]/5 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-[40%] -right-40 w-[500px] h-[500px] bg-gradient-to-b from-amber-500/5 to-transparent blur-[100px] rounded-full" />
        <div className="absolute top-[70%] -left-40 w-[500px] h-[500px] bg-gradient-to-b from-[#cc785c]/10 to-transparent blur-[100px] rounded-full" />
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-[#292721] bg-[#141310]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#cc785c] to-[#e68d71] flex items-center justify-center shadow-lg shadow-[#cc785c]/20 group-hover:scale-105 transition-transform">
              <span className="text-black font-serif text-lg font-bold select-none leading-none">✳</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-[#f2eee6] flex items-center gap-1.5">
                OpenWork Cloud
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#cc785c]/15 text-[#cc785c] border border-[#cc785c]/30">
                  Pro Max
                </span>
              </span>
              <span className="text-[10px] text-[#8a8579]">Claude Enterprise Edition</span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs text-[#aba597]">
            <a href="#features" className="hover:text-[#ece9e2] transition-colors">
              Platform Features
            </a>
            <a href="#connectors" className="hover:text-[#ece9e2] transition-colors">
              MCP Connectors
            </a>
            <a href="#downloads" className="hover:text-[#ece9e2] transition-colors">
              Downloads
            </a>
            <a href="#comparison" className="hover:text-[#ece9e2] transition-colors">
              Free Plan ($0)
            </a>
            <a href="#faq" className="hover:text-[#ece9e2] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3">
            <a
              href="#downloads"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#22201b] hover:bg-[#2b2923] border border-[#38352d] text-xs font-medium text-[#dcd8ce] transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#cc785c]" />
              <span>Download Apps</span>
            </a>

            <Link
              href="/"
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-[#cc785c] hover:bg-[#db8a6e] text-black font-bold text-xs shadow-md shadow-[#cc785c]/25 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Launch Web App</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 px-4 sm:px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
        {/* Release Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#201f1a] border border-[#38352b] text-xs text-[#dcd8ce] mb-6 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium">Claude 3.7 Sonnet Enterprise + OpenWork Cloud</span>
          <span className="text-[#8a8579]">•</span>
          <span className="font-mono text-[#cc785c] font-semibold">$0 Free Forever</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-[#f4efe6] tracking-tight leading-[1.1] max-w-4xl">
          The Autonomous AI Cloud Workspace.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-[#aba597] max-w-2xl leading-relaxed">
          Supercharge your workflow with Claude 3.7 Sonnet hybrid reasoning, 260+ OpenWork autonomous agent squads, and real-time Model Context Protocol (MCP) connectors. Accessible instantly online, on Windows, and on Android.
        </p>

        {/* Dual Primary CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md justify-center">
          <Link
            href="/"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#cc785c] to-[#e68d71] text-black font-bold text-sm shadow-xl shadow-[#cc785c]/25 hover:shadow-[#cc785c]/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2.5"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Launch Web App Online</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>

          <a
            href="#downloads"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#22201b] hover:bg-[#2b2923] border border-[#3e3b32] text-[#ece9e2] font-semibold text-sm transition-all hover:border-[#cc785c]/50 flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4 text-[#cc785c]" />
            <span>Download Desktop & Mobile</span>
          </a>
        </div>

        {/* Supported Platforms Strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#8a8579]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Windows 10 / 11 Native (.exe)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Android APK & Chrome PWA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>64k Max Thinking Budget</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Subscription Fee ($0)</span>
          </div>
        </div>

        {/* Hero Interactive App Mockup Preview */}
        <div className="mt-12 w-full rounded-2xl bg-[#1c1b18] border border-[#35332a] shadow-2xl overflow-hidden text-left">
          {/* Top Mock Window Bar */}
          <div className="px-4 py-3 bg-[#171613] border-b border-[#2d2b24] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-[#8a8579] ml-2">
                OpenWork Cloud • https://claude-enterprise-app.vercel.app
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
                Provider-native connector architecture
              </span>
              <span className="px-2 py-0.5 rounded bg-[#cc785c]/15 text-[#cc785c] font-mono text-[10px]">
                Claude 3.7 Sonnet
              </span>
            </div>
          </div>

          {/* Interactive Demo Area inside Mockup */}
          <div className="p-5 sm:p-6 space-y-4">
            <div className="text-xs text-[#9c978b] flex items-center justify-between">
              <span>Interactive Playground: Test live connectors below</span>
              <span className="font-mono text-[#cc785c]">Sub-second SSE Streaming</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                placeholder="Ask Claude or command an agent..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#141310] border border-[#333128] text-xs text-[#ece9e2] placeholder-[#7d786e] focus:outline-none focus:border-[#cc785c]"
              />
              <button
                onClick={runDemo}
                disabled={isDemoRunning}
                className="px-5 py-2.5 rounded-xl bg-[#cc785c] hover:bg-[#db8a6e] text-black font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 shrink-0"
              >
                {isDemoRunning ? (
                  <span className="animate-pulse">Executing Connector...</span>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Command</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Demo Prompts */}
            <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
              <button
                onClick={() => {
                  setDemoInput('Send an email to team@company.com with project updates');
                }}
                className="px-2.5 py-1 rounded-lg bg-[#24221d] hover:bg-[#2c2a23] text-[#aba597] hover:text-[#ece9e2] border border-[#333128] transition-colors"
              >
                ✉️ Gmail Connector
              </button>
              <button
                onClick={() => {
                  setDemoInput('Inspect sameer-sys/claude-enterprise-app repository structure');
                }}
                className="px-2.5 py-1 rounded-lg bg-[#24221d] hover:bg-[#2c2a23] text-[#aba597] hover:text-[#ece9e2] border border-[#333128] transition-colors"
              >
                🐙 GitHub Repo Search
              </button>
              <button
                onClick={() => {
                  setDemoInput('Deploy OpenWork Autonomous Security Squad');
                }}
                className="px-2.5 py-1 rounded-lg bg-[#24221d] hover:bg-[#2c2a23] text-[#aba597] hover:text-[#ece9e2] border border-[#333128] transition-colors"
              >
                🤖 Autonomous Squad
              </button>
            </div>

            {/* Simulated Live Output */}
            {demoOutput && (
              <div className="p-4 rounded-xl bg-[#141310] border border-[#38352b] text-xs text-[#ece9e2] whitespace-pre-wrap leading-relaxed animate-in fade-in">
                {demoOutput}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Download Section (Direct Action) */}
      <section id="downloads" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full border-t border-[#26241e]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs uppercase font-mono font-bold tracking-widest px-2.5 py-1 rounded-full bg-[#cc785c]/15 text-[#cc785c] border border-[#cc785c]/30">
            Cross-Platform Ecosystem
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f4efe6]">
            Download OpenWork Cloud for Any Device
          </h2>
          <p className="text-sm text-[#aba597]">
            Work seamlessly across your laptop, desktop, and mobile phone with automatic cloud sync.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Windows Desktop */}
          <div className="p-6 rounded-2xl bg-[#1c1b18] border border-[#35332a] hover:border-[#cc785c]/50 transition-all flex flex-col justify-between space-y-6 shadow-xl group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#26241e] border border-[#3b382e] flex items-center justify-center text-[#cc785c] group-hover:scale-110 transition-transform">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f2eee6]">Windows Desktop App</h3>
                <p className="text-xs text-[#9c978b] mt-1 leading-relaxed">
                  Fast native launcher for Windows 10 & 11 with dedicated window frame, desktop shortcuts, and tray quick-open.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-[#aba597]">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#cc785c]" />
                  <span>Windows 10 & 11 (64-bit)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#cc785c]" />
                  <span>Direct launch setup script (.bat)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#cc785c]" />
                  <span>Zero install privileges needed</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleDownloadWindows}
              className="w-full py-3 px-4 rounded-xl bg-[#cc785c] hover:bg-[#db8a6e] text-black font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download for Windows (.bat / .exe)</span>
            </button>
          </div>

          {/* Android Mobile Companion */}
          <div className="p-6 rounded-2xl bg-[#1c1b18] border border-[#35332a] hover:border-[#cc785c]/50 transition-all flex flex-col justify-between space-y-6 shadow-xl group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#26241e] border border-[#3b382e] flex items-center justify-center text-[#cc785c] group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f2eee6]">Android & Mobile App</h3>
                <p className="text-xs text-[#9c978b] mt-1 leading-relaxed">
                  Install on Android phones and tablets. Smooth native touch gestures, camera photo analysis, and voice dictation.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-[#aba597]">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Android 9.0+ & iOS Safari</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>1-Tap Add to Home Screen (PWA)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Offline cache via Service Worker</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleDownloadAndroid}
              className="w-full py-3 px-4 rounded-xl bg-[#25231e] hover:bg-[#302e27] border border-[#3e3b31] text-[#ece9e2] font-bold text-xs shadow-sm transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <Download className="w-4 h-4 text-[#cc785c]" />
              <span>Download Mobile App (.apk / PWA)</span>
            </button>
          </div>

          {/* Web App Direct Access */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#201f1a] to-[#1c1b18] border border-[#cc785c]/30 hover:border-[#cc785c]/60 transition-all flex flex-col justify-between space-y-6 shadow-xl group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#cc785c]/20 border border-[#cc785c]/40 flex items-center justify-center text-[#cc785c] group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#f2eee6]">Instant Web App</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    No Download
                  </span>
                </div>
                <p className="text-xs text-[#9c978b] mt-1 leading-relaxed">
                  Open directly in Google Chrome, Microsoft Edge, Brave, or Safari. Full desktop features with zero installation.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-[#aba597]">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#cc785c]" />
                  <span>Works in all modern browsers</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#cc785c]" />
                  <span>Instant load under 600ms</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#cc785c]" />
                  <span>Cloud persistence & bookmarks</span>
                </li>
              </ul>
            </div>

            <Link
              href="/"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#cc785c] to-[#e68d71] text-black font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Open Web App in Browser ↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Flagship Pillars & Features */}
      <section id="features" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full border-t border-[#26241e]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <span className="text-xs uppercase font-mono font-bold tracking-widest px-2.5 py-1 rounded-full bg-[#cc785c]/15 text-[#cc785c] border border-[#cc785c]/30">
            Enterprise Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f4efe6]">
            Built for High-Velocity Engineering & Workflows
          </h2>
          <p className="text-sm text-[#aba597]">
            Every capability from Claude Enterprise and OpenWork, engineered for performance and free accessibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-[#1c1b18] border border-[#35332a] space-y-3 hover:border-[#cc785c]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#27251f] flex items-center justify-center text-[#cc785c]">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#f2eee6]">64,000 Thinking Budget</h3>
            <p className="text-xs text-[#9c978b] leading-relaxed">
              Hybrid reasoning allows Claude 3.7 Sonnet to think through mathematical logic, architecture edge-cases, and refactor whole codebases before typing.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-[#1c1b18] border border-[#35332a] space-y-3 hover:border-[#cc785c]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#27251f] flex items-center justify-center text-[#cc785c]">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#f2eee6]">Per-Chat Connectors (MCP)</h3>
            <p className="text-xs text-[#9c978b] leading-relaxed">
              Link independent Gmail inboxes and GitHub repositories per chat. When you switch chats, your credentials and tools refresh cleanly.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-[#1c1b18] border border-[#35332a] space-y-3 hover:border-[#cc785c]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#27251f] flex items-center justify-center text-[#cc785c]">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#f2eee6]">260+ OpenWork Autonomous Agents</h3>
            <p className="text-xs text-[#9c978b] leading-relaxed">
              Deploy specialized autonomous agents for full-stack web, penetration testing, DevOps Kubernetes, PRD writing, and machine learning pipelines.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-[#1c1b18] border border-[#35332a] space-y-3 hover:border-[#cc785c]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#27251f] flex items-center justify-center text-[#cc785c]">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#f2eee6]">Interactive Claude Artifacts</h3>
            <p className="text-xs text-[#9c978b] leading-relaxed">
              View live HTML/JS applications, charts, diagrams, and code snippets side-by-side with full-screen preview and 1-click code copying.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-2xl bg-[#1c1b18] border border-[#35332a] space-y-3 hover:border-[#cc785c]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#27251f] flex items-center justify-center text-[#cc785c]">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#f2eee6]">Two-Way Autonomous Proactivity</h3>
            <p className="text-xs text-[#9c978b] leading-relaxed">
              Claude doesn't just wait for prompts. In Two-Way mode, it proactively audits progress, drafts follow-ups, and checks in when you return.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-2xl bg-[#1c1b18] border border-[#35332a] space-y-3 hover:border-[#cc785c]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#27251f] flex items-center justify-center text-[#cc785c]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#f2eee6]">Zero Data Retention & Privacy</h3>
            <p className="text-xs text-[#9c978b] leading-relaxed">
              Your sessions and code stay entirely in your local browser and your private Supabase database room. Zero server telemetry or AI training.
            </p>
          </div>
        </div>
      </section>

      {/* Model Context Protocol Directory Showcase */}
      <section id="connectors" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full border-t border-[#26241e]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <span className="text-xs uppercase font-mono font-bold tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Model Context Protocol
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f4efe6]">
            8+ Pre-Wired Enterprise Connectors
          </h2>
          <p className="text-sm text-[#aba597]">
            Connect your everyday tools to Claude with 1-click toggles and custom per-chat configurations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#1c1b18] border border-[#333128] space-y-2">
            <div className="flex items-center justify-between">
              <Mail className="w-5 h-5 text-rose-400" />
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
            </div>
            <h4 className="text-sm font-semibold text-[#f2eee6]">Google Mail (Gmail)</h4>
            <p className="text-xs text-[#9c978b]">Thread search, unread email summaries, and 1-click Gmail send links.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#1c1b18] border border-[#333128] space-y-2">
            <div className="flex items-center justify-between">
              <Github className="w-5 h-5 text-white" />
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
            </div>
            <h4 className="text-sm font-semibold text-[#f2eee6]">GitHub Repositories</h4>
            <p className="text-xs text-[#9c978b]">Inspect codebases, pull requests, commit diffs, and issue tracking.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#1c1b18] border border-[#333128] space-y-2">
            <div className="flex items-center justify-between">
              <Globe className="w-5 h-5 text-cyan-400" />
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
            </div>
            <h4 className="text-sm font-semibold text-[#f2eee6]">Live Web Search</h4>
            <p className="text-xs text-[#9c978b]">Real-time documentation lookups, current news, and benchmark citations.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#1c1b18] border border-[#333128] space-y-2">
            <div className="flex items-center justify-between">
              <HardDrive className="w-5 h-5 text-blue-400" />
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
            </div>
            <h4 className="text-sm font-semibold text-[#f2eee6]">Google Drive & Docs</h4>
            <p className="text-xs text-[#9c978b]">Synthesize Google Docs, analyze shared sheets, and parse workspace PDFs.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#1c1b18] border border-[#333128] space-y-2">
            <div className="flex items-center justify-between">
              <Terminal className="w-5 h-5 text-amber-300" />
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
            </div>
            <h4 className="text-sm font-semibold text-[#f2eee6]">Local Filesystem (MCP)</h4>
            <p className="text-xs text-[#9c978b]">Standard MCP file explorer: inspect project directories and local scripts.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#1c1b18] border border-[#333128] space-y-2">
            <div className="flex items-center justify-between">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
            </div>
            <h4 className="text-sm font-semibold text-[#f2eee6]">Slack Workspace</h4>
            <p className="text-xs text-[#9c978b]">Read channels, summarize standups, and draft announcements.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#1c1b18] border border-[#333128] space-y-2">
            <div className="flex items-center justify-between">
              <FolderKanban className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
            </div>
            <h4 className="text-sm font-semibold text-[#f2eee6]">Notion Workspace</h4>
            <p className="text-xs text-[#9c978b]">Search product requirement docs (PRDs), engineering specs, and tables.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#1c1b18] border border-[#333128] space-y-2">
            <div className="flex items-center justify-between">
              <Cpu className="w-5 h-5 text-[#cc785c]" />
              <span className="text-[10px] font-mono text-[#cc785c] bg-[#cc785c]/10 px-2 py-0.5 rounded">Extensible</span>
            </div>
            <h4 className="text-sm font-semibold text-[#f2eee6]">Custom MCP Servers</h4>
            <p className="text-xs text-[#9c978b]">Plug in any stdio or SSE server: Postgres, SQLite, Puppeteer, or Docker.</p>
          </div>
        </div>
      </section>

      {/* Free Plan Value Comparison ($0 vs $100/mo) */}
      <section id="comparison" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto w-full border-t border-[#26241e]">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs uppercase font-mono font-bold tracking-widest px-2.5 py-1 rounded-full bg-[#cc785c]/15 text-[#cc785c] border border-[#cc785c]/30">
            Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f4efe6]">
            Claude Enterprise Power — $0 Free Forever
          </h2>
          <p className="text-sm text-[#aba597]">
            No credit card. No subscriptions. No billing headaches.
          </p>
        </div>

        <div className="rounded-2xl bg-[#1c1b18] border border-[#35332a] overflow-hidden shadow-2xl">
          <div className="grid grid-cols-3 p-4 bg-[#181713] border-b border-[#2d2b24] text-xs font-semibold text-[#baa898]">
            <div>Feature</div>
            <div className="text-center">Official Claude Enterprise</div>
            <div className="text-center text-[#cc785c]">OpenWork Cloud Pro Max</div>
          </div>

          <div className="divide-y divide-[#26241e] text-xs text-[#dcd8ce]">
            <div className="grid grid-cols-3 p-4 items-center">
              <span className="font-medium">Monthly Cost</span>
              <span className="text-center text-rose-400 line-through">$100 / user / mo</span>
              <span className="text-center text-emerald-400 font-bold">$0.00 (Free Forever)</span>
            </div>
            <div className="grid grid-cols-3 p-4 items-center">
              <span className="font-medium">Credit Card Required</span>
              <span className="text-center text-rose-400">Yes (Corporate Invoice)</span>
              <span className="text-center text-emerald-400 font-bold">Never Needed</span>
            </div>
            <div className="grid grid-cols-3 p-4 items-center">
              <span className="font-medium">Extended Thinking Budget</span>
              <span className="text-center">32,000 tokens</span>
              <span className="text-center text-[#cc785c] font-bold">Up to 64,000 tokens</span>
            </div>
            <div className="grid grid-cols-3 p-4 items-center">
              <span className="font-medium">Model Context Protocol (MCP)</span>
              <span className="text-center">Enterprise Only</span>
              <span className="text-center text-emerald-400 font-bold">Full Access (8+ Connectors)</span>
            </div>
            <div className="grid grid-cols-3 p-4 items-center">
              <span className="font-medium">Autonomous Agent Squads</span>
              <span className="text-center">Custom API code</span>
              <span className="text-center text-[#cc785c] font-bold">260+ OpenWork Agents</span>
            </div>
            <div className="grid grid-cols-3 p-4 items-center">
              <span className="font-medium">Windows & Android Apps</span>
              <span className="text-center">Web Only</span>
              <span className="text-center text-emerald-400 font-bold">Native Desktop & PWA Included</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-20 px-4 sm:px-6 max-w-3xl mx-auto w-full border-t border-[#26241e]">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs uppercase font-mono font-bold tracking-widest px-2.5 py-1 rounded-full bg-[#cc785c]/15 text-[#cc785c] border border-[#cc785c]/30">
            Answers & Help
          </span>
          <h2 className="text-3xl font-serif text-[#f4efe6]">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[#1c1b18] border border-[#333128] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between text-xs font-semibold text-[#f2eee6] hover:text-[#cc785c] transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#8a8579] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-[#aba597] leading-relaxed border-t border-[#292720] pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final Launch Banner */}
      <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-tr from-[#25221b] via-[#1c1b18] to-[#25221b] border border-[#cc785c]/30 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-4 max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-serif text-[#f4efe6]">
              Ready to experience OpenWork Cloud?
            </h2>
            <p className="text-xs sm:text-sm text-[#aba597] leading-relaxed">
              Launch the web app directly in your browser or download for Windows and Android with zero setup fee.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#cc785c] to-[#e68d71] text-black font-bold text-xs shadow-lg shadow-[#cc785c]/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Launch Web App Now (Free)</span>
              </Link>
              <a
                href="#downloads"
                className="px-6 py-3 rounded-xl bg-[#141310] hover:bg-[#1a1915] border border-[#38352b] text-[#ece9e2] font-semibold text-xs transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4 text-[#cc785c]" />
                <span>Download Desktop & Mobile</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#26241e] bg-[#100f0d] py-10 px-4 sm:px-6 text-xs text-[#7d786e]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-lg bg-[#cc785c] flex items-center justify-center">
              <span className="text-black text-[10px] font-bold">✳</span>
            </div>
            <span className="text-[#dcd8ce] font-semibold">OpenWork Cloud • Claude Enterprise Pro Max</span>
            <span>·</span>
            <span>100% Free Forever</span>
          </div>

          <div className="flex items-center space-x-6 text-[#9c978b]">
            <Link href="/" className="hover:text-[#ece9e2] transition-colors">
              Web App
            </Link>
            <a href="#downloads" className="hover:text-[#ece9e2] transition-colors">
              Downloads
            </a>
            <a href="https://github.com/sameer-sys/claude-enterprise-app" target="_blank" rel="noopener noreferrer" className="hover:text-[#ece9e2] transition-colors flex items-center gap-1">
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
