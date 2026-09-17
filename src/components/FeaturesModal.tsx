'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Zap,
  Globe,
  Brain,
  Mail,
  Github,
  Search,
  Bot,
  Code2,
  Mic,
  Radio,
  ShieldCheck,
  Download,
  Terminal,
  Cpu,
  Layers,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Sliders,
  HardDrive,
} from 'lucide-react';

interface FeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt?: (prompt: string) => void;
  onOpenSettings?: () => void;
  onOpenDownload?: () => void;
  onSelectThinkingBudget?: (budget: number) => void;
}

export default function FeaturesModal({
  isOpen,
  onClose,
  onSelectPrompt,
  onOpenSettings,
  onOpenDownload,
  onSelectThinkingBudget,
}: FeaturesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Superpowers' },
    { id: 'intelligence', label: 'Reasoning & Thinking' },
    { id: 'connectors', label: 'Live Connectors (MCP)' },
    { id: 'web', label: 'Web Bypasser & Search' },
    { id: 'agents', label: '260+ Agents' },
    { id: 'developer', label: 'Developer & Code' },
  ];

  const features = [
    {
      id: 'web-bypasser',
      title: 'Live Web Bypasser & Scraper',
      badge: 'NEW SUPERPOWER',
      badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      category: 'web',
      icon: Globe,
      description:
        'Paste any URL into chat to bypass paywalls, CORS, and anti-scraping blockers. Claude fetches the real live web content, strips ads and clutter, and analyzes it directly in real time.',
      actionLabel: 'Try Web Bypass',
      actionType: 'prompt',
      samplePrompt: 'Summarize and extract key insights from this website: https://news.ycombinator.com',
    },
    {
      id: 'hybrid-thinking',
      title: '64,000 Hybrid Extended Thinking',
      badge: 'CLAUDE 3.7',
      badgeColor: 'bg-[#cc785c]/15 text-[#cc785c] border-[#cc785c]/30',
      category: 'intelligence',
      icon: Brain,
      description:
        'Claude 3.7 Sonnet hybrid reasoning architecture allows up to 64k tokens of step-by-step thinking. Solves complex mathematical proofs, traces subtle bugs, and plans massive architectural refactors before typing a word.',
      actionLabel: 'Enable 64k Thinking',
      actionType: 'budget',
      budget: 64000,
      samplePrompt: 'Solve this step-by-step using 64k extended thinking: Prove that the square root of 2 is irrational and explain its geometric significance.',
    },
    {
      id: 'gmail-connector',
      title: 'Google Mail (Gmail) Connector',
      badge: 'PER-CHAT EMAIL',
      badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      category: 'connectors',
      icon: Mail,
      description:
        'Draft and stage emails with 1-click send links directly into your Gmail account. Configure different email accounts per chat (work vs personal) with complete privacy.',
      actionLabel: 'Try Gmail Connector',
      actionType: 'prompt',
      samplePrompt: 'Send an email to team@company.com saying that project status is confirmed and live',
    },
    {
      id: 'github-connector',
      title: 'GitHub Live Repo Inspector',
      badge: 'REAL-TIME GIT',
      badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      category: 'connectors',
      icon: Github,
      description:
        'Connect directly to any public or private GitHub repository. Inspect branches, commit diffs, open pull requests, and audit code files in real-time.',
      actionLabel: 'Inspect GitHub Repo',
      actionType: 'prompt',
      samplePrompt: 'Inspect the sameer-sys/claude-enterprise-app repository structure and recent commits',
    },
    {
      id: 'agents-squad',
      title: '260+ OpenWork Autonomous Agents',
      badge: 'SQUAD MODE',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      category: 'agents',
      icon: Bot,
      description:
        'Deploy a specialized team of autonomous AI agents: Full-Stack Architect, Security Pen-Tester, DevOps Engineer, Growth Lead, and UX Designer working in concert.',
      actionLabel: 'Open Agent Squad View',
      actionType: 'squad',
    },
    {
      id: 'interactive-artifacts',
      title: 'Interactive HTML & Code Artifacts',
      badge: 'LIVE RUNNER',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      category: 'developer',
      icon: Code2,
      description:
        'Generates live interactive HTML/CSS/JS components, dashboards, games, SVG charts, and full applications. Preview and test directly in the browser side-by-side with your chat.',
      actionLabel: 'Generate Interactive App',
      actionType: 'prompt',
      samplePrompt: 'Create an interactive HTML5 particle network dashboard with glowing canvas physics',
    },
    {
      id: 'voice-speech',
      title: 'Voice Dictation & Speech Read-Aloud',
      badge: 'HANDS-FREE',
      badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      category: 'developer',
      icon: Mic,
      description:
        'Continuous speech-to-text dictation with real-time interim transcription and text-to-speech voice read-aloud featuring multiple voice styles (Buttery, Crisp, Natural).',
      actionLabel: 'Try Voice Dictation',
      actionType: 'prompt',
      samplePrompt: 'Explain how neural network backpropagation works in 3 clear bullet points',
    },
    {
      id: 'proactive-twoway',
      title: 'Two-Way Autonomous Proactivity',
      badge: 'ALWAYS ACTIVE',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      category: 'intelligence',
      icon: Radio,
      description:
        'Claude does not just wait for you. When proactive mode is enabled, it prepares next steps, audits workspace context, and greets you with an actionable summary when you return.',
      actionLabel: 'Configure in Settings',
      actionType: 'settings',
    },
    {
      id: 'god-mode',
      title: 'Unrestricted Developer God Mode',
      badge: 'FULL POWER',
      badgeColor: 'bg-red-500/15 text-red-400 border-red-500/30',
      category: 'developer',
      icon: Terminal,
      description:
        'Zero refusal filters for technical tasks. Produces complete production-ready code with zero placeholders or omissions (no "// rest of code here"), plus deep vulnerability analysis.',
      actionLabel: 'Open Advanced Settings',
      actionType: 'settings',
    },
    {
      id: 'cloud-sync',
      title: 'Cross-Device Cloud Sync (Supabase)',
      badge: 'NO LOGINS',
      badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      category: 'developer',
      icon: HardDrive,
      description:
        'Seamlessly sync all your conversations, custom buttons, and artifacts between your PC, laptop, and phone using lightweight room IDs without requiring sign-ins.',
      actionLabel: 'Manage Sync',
      actionType: 'settings',
    },
    {
      id: 'desktop-mobile-apps',
      title: 'Windows (.exe) & Android (.apk) Apps',
      badge: 'OFFICIAL APPS',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      category: 'developer',
      icon: Download,
      description:
        'Dedicated desktop launcher for Windows 10 & 11 with system tray integration, plus Android companion APK and Chrome 1-tap PWA installation.',
      actionLabel: 'Download Apps',
      actionType: 'download',
    },
    {
      id: 'free-forever',
      title: 'Claude Pro Max Lifetime ($0 Free Forever)',
      badge: '$0 FOREVER',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      category: 'intelligence',
      icon: ShieldCheck,
      description:
        'Zero credit card required. No monthly subscriptions or invoices. All enterprise capabilities with zero payment gateways or billing barriers.',
      actionLabel: 'View Plan Details',
      actionType: 'settings',
    },
  ];

  const filteredFeatures = features.filter((feat) => {
    if (selectedCategory !== 'all' && feat.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return feat.title.toLowerCase().includes(q) || feat.description.toLowerCase().includes(q);
  });

  const handleAction = (feat: any) => {
    if (feat.actionType === 'prompt' && feat.samplePrompt) {
      onSelectPrompt?.(feat.samplePrompt);
      onClose();
    } else if (feat.actionType === 'budget' && feat.budget) {
      onSelectThinkingBudget?.(feat.budget);
      if (feat.samplePrompt) onSelectPrompt?.(feat.samplePrompt);
      onClose();
    } else if (feat.actionType === 'settings') {
      onClose();
      onOpenSettings?.();
    } else if (feat.actionType === 'download') {
      onClose();
      onOpenDownload?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[88vh] rounded-3xl bg-[#1c1b18] border border-[#35332a] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2d2b24] bg-[#181713] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#cc785c] to-[#e68d71] flex items-center justify-center shadow-lg shadow-[#cc785c]/25">
              <Sparkles className="w-5 h-5 text-black fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-[#f4efe6] tracking-tight">
                  Claude Pro Max Superpowers & Features
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  12 Superpowers Active
                </span>
              </div>
              <p className="text-xs text-[#9c978b]">
                Explore all advanced capabilities, live MCP connectors, and web bypassing tools.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#2c2a23] text-[#9c978b] hover:text-[#ece9e2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills & Search */}
        <div className="px-6 py-3 border-b border-[#2d2b24] bg-[#1a1915] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7d786e]" />
            <input
              type="text"
              placeholder="Search superpowers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141310] border border-[#2d2b24] text-xs text-[#ece9e2] placeholder-[#7d786e] focus:outline-none focus:border-[#cc785c]"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#cc785c] text-black font-bold shadow-sm'
                    : 'bg-[#22201b] hover:bg-[#2b2923] text-[#aba597] hover:text-[#ece9e2] border border-[#302e26]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="p-5 rounded-2xl bg-[#22201b] border border-[#333128] hover:border-[#cc785c]/40 transition-all flex flex-col justify-between space-y-4 shadow-sm group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#2b2923] border border-[#3e3b32] flex items-center justify-center text-[#cc785c] group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-[#f2eee6]">{feat.title}</h4>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${feat.badgeColor}`}
                    >
                      {feat.badge}
                    </span>
                  </div>

                  <p className="text-xs text-[#aba597] leading-relaxed">{feat.description}</p>
                </div>

                <div className="pt-2 border-t border-[#2d2b24] flex items-center justify-between">
                  <span className="text-[10px] text-[#787469] font-mono">100% Free Forever</span>
                  <button
                    onClick={() => handleAction(feat)}
                    className="px-3 py-1.5 rounded-xl bg-[#2c2a23] hover:bg-[#cc785c] text-xs font-semibold text-[#f2eee6] hover:text-black border border-[#3e3b32] hover:border-[#cc785c] transition-all flex items-center space-x-1.5 shadow-sm active:scale-95"
                  >
                    <span>{feat.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#2d2b24] bg-[#181713] flex items-center justify-between text-xs text-[#8a8579] shrink-0">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>All 12 superpowers unlocked with zero restrictions</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#26241e] hover:bg-[#302e27] text-[#ece9e2] font-medium border border-[#3a382e]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
