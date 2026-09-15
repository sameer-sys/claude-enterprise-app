'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  Menu,
  Sparkles,
  FileCode,
  Copy,
  Check,
  Paperclip,
  Cpu,
  RotateCcw,
  User,
  ThumbsUp,
  ThumbsDown,
  Brain,
  SlidersHorizontal,
  X,
  Zap,
  Download,
  Bot,
  Radio,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, ModelId, Artifact, ResponseStyle, Attachment, ThinkingBudget } from '@/types/chat';
import ModelSelector from './ModelSelector';

interface ChatAreaProps {
  messages: Message[];
  activeModel: ModelId;
  onSelectModel: (model: ModelId) => void;
  onSendMessage: (text: string, attachments?: Attachment[]) => void;
  onStopStreaming: () => void;
  onRegenerateLast: () => void;
  isStreaming: boolean;
  onOpenMobileSidebar: () => void;
  onSelectArtifact: (artifact: Artifact) => void;
  activeArtifactId?: string;
  onOpenConnectors: () => void;
  onOpenDownload: () => void;
  activeConnectorsCount: number;
  thinkingBudget: ThinkingBudget;
  onSelectThinkingBudget: (budget: ThinkingBudget) => void;
  isProactiveMode: boolean;
  onToggleProactiveMode: () => void;
}

export default function ChatArea({
  messages,
  activeModel,
  onSelectModel,
  onSendMessage,
  onStopStreaming,
  onRegenerateLast,
  isStreaming,
  onOpenMobileSidebar,
  onSelectArtifact,
  activeArtifactId,
  onOpenConnectors,
  onOpenDownload,
  activeConnectorsCount,
  thinkingBudget,
  onSelectThinkingBudget,
  isProactiveMode,
  onToggleProactiveMode,
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<ResponseStyle>('normal');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, Sameer';
    if (hour < 18) return 'Good afternoon, Sameer';
    return 'Good evening, Sameer';
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    const text = input.trim();
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSendMessage(text, currentAttachments);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newAttachments: Attachment[] = Array.from(files).map((f) => ({
      id: `att_${Date.now()}_${Math.random()}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      type: f.type || 'document',
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleThinking = (msgId: string) => {
    setExpandedThinking((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const hasMessages = messages.length > 0;

  const renderPromptBox = (isHero: boolean) => (
    <form
      onSubmit={handleSubmit}
      className={`relative w-full rounded-2xl bg-[#23221d] border border-[#38352d] shadow-2xl focus-within:border-[#cc785c]/70 transition-all p-3 ${
        isHero ? 'max-w-2xl mx-auto mt-6' : 'max-w-3xl mx-auto'
      }`}
    >
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 mb-2 border-b border-[#2e2c24]">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#2b2923] border border-[#38352d] text-xs text-[#ece9e2]"
            >
              <Paperclip className="w-3 h-3 text-[#cc785c]" />
              <span className="truncate max-w-[140px]">{att.name}</span>
              <span className="text-[10px] text-[#8a8579] font-mono">({att.size})</span>
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="hover:text-rose-400 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        rows={isHero ? 2 : 1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isStreaming
            ? 'Type to interrupt and send instantly (never queued)...'
            : isHero
            ? 'How can Claude help you today?'
            : 'Reply to Claude... (Shift+Enter for newline)'
        }
        className="w-full bg-transparent text-sm text-[#ece9e2] placeholder-[#7d786e] px-2 py-1.5 focus:outline-none resize-none max-h-48 leading-relaxed font-normal"
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
      />

      {/* Controls Bar inside the Input Box */}
      <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#2c2a23]">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#9c978b]">
          <ModelSelector
            selectedModel={activeModel}
            onSelectModel={onSelectModel}
            thinkingBudget={thinkingBudget}
            onSelectThinkingBudget={onSelectThinkingBudget}
            isThinkingEnabled={isThinkingEnabled}
          />

          {/* Extended Thinking Button */}
          <button
            type="button"
            onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
              isThinkingEnabled
                ? 'bg-[#cc785c]/15 text-[#cc785c] border-[#cc785c]/40 shadow-sm'
                : 'bg-[#26241f] text-[#8a8579] border-[#38352d] hover:text-[#ece9e2]'
            }`}
            title="Toggle Claude Extended Thinking"
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Thinking: {isThinkingEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* DOWNLOAD BUTTON TO THE LEFT OF CONNECTORS */}
          <button
            type="button"
            onClick={onOpenDownload}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#26241f] hover:bg-[#2f2d26] border border-[#38352d] text-[#8a8579] hover:text-[#ece9e2] transition-colors text-[11px]"
            title="Download Desktop & Android Apps"
          >
            <Download className="w-3.5 h-3.5 text-[#cc785c]" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Connectors */}
          <button
            type="button"
            onClick={onOpenConnectors}
            className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-[#26241f] hover:bg-[#2f2d26] border border-[#38352d] text-[#8a8579] hover:text-[#ece9e2] transition-colors text-[11px]"
            title="Connectors"
          >
            <Cpu className="w-3.5 h-3.5 text-[#cc785c]" />
            <span className="hidden md:inline">Connectors</span>
            <span className="text-[9px] px-1 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 font-mono">
              {activeConnectorsCount}
            </span>
          </button>

          {/* Style */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-[#26241f] hover:bg-[#2f2d26] border border-[#38352d] text-[#8a8579] hover:text-[#ece9e2] transition-colors text-[11px]"
              title="Response Style"
            >
              <SlidersHorizontal className="w-3 h-3 text-[#cc785c]" />
              <span className="capitalize hidden lg:inline">{selectedStyle}</span>
            </button>

            {isStyleMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsStyleMenuOpen(false)} />
                <div className="absolute left-0 bottom-8 mb-1 w-36 rounded-xl bg-[#23221e] border border-[#383630] shadow-xl z-40 p-1 space-y-0.5 text-xs">
                  {(['normal', 'concise', 'explanatory', 'technical'] as ResponseStyle[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setSelectedStyle(st);
                        setIsStyleMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg capitalize ${
                        selectedStyle === st
                          ? 'bg-[#cc785c]/15 text-[#cc785c] font-semibold'
                          : 'hover:bg-[#2b2923] text-[#dcd8ce]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Send Action */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg hover:bg-[#2d2b23] text-[#8a8579] hover:text-[#ece9e2] transition-colors"
            title="Attach documents, files, or images"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium flex items-center space-x-1.5 border border-rose-500/30 transition-all"
              title="Stop generation"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() && attachments.length === 0}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                input.trim() || attachments.length > 0
                  ? 'bg-[#cc785c] hover:bg-[#db8a6e] text-black shadow-md shadow-[#cc785c]/25 active:scale-95'
                  : 'bg-[#2b2923] text-[#6d685e] cursor-not-allowed'
              }`}
              title="Send to Claude"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </form>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1c1b18] relative overflow-hidden">
      {/* Top Navbar */}
      <header className="h-14 border-b border-[#2b2a24] bg-[#1c1b18]/95 backdrop-blur-md flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-[#282621] text-[#9c978b] hover:text-[#ece9e2]"
          >
            <Menu className="w-5 h-5" />
          </button>
          {hasMessages && (
            <ModelSelector
              selectedModel={activeModel}
              onSelectModel={onSelectModel}
              thinkingBudget={thinkingBudget}
              onSelectThinkingBudget={onSelectThinkingBudget}
              isThinkingEnabled={isThinkingEnabled}
            />
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Autonomous Two-Way Proactive Mode Toggle */}
          <button
            onClick={onToggleProactiveMode}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium font-mono transition-all ${
              isProactiveMode
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[#26241f] border-[#38352d] text-[#8a8579] hover:text-[#ece9e2]'
            }`}
            title="Two-Way Chat: AI proactively checks in and prepares updates while you are away/offline"
          >
            <Radio className={`w-3 h-3 ${isProactiveMode ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span className="hidden sm:inline">Two-Way Agent: {isProactiveMode ? 'Active' : 'Off'}</span>
          </button>

          {/* DOWNLOAD BUTTON TO THE LEFT OF CONNECTORS */}
          <button
            onClick={onOpenDownload}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#26241f] hover:bg-[#302e27] border border-[#38352d] text-xs font-medium text-[#dcd8ce] transition-all hover:text-[#ece9e2]"
            title="Download Desktop & Android Apps"
          >
            <Download className="w-3.5 h-3.5 text-[#cc785c]" />
            <span>Download</span>
          </button>

          {/* CONNECTORS BUTTON */}
          <button
            onClick={onOpenConnectors}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#26241f] hover:bg-[#302e27] border border-[#38352d] text-xs font-medium text-[#dcd8ce] transition-all"
            title="Manage Connectors"
          >
            <Cpu className="w-3.5 h-3.5 text-[#cc785c]" />
            <span className="hidden sm:inline">Connectors</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 font-mono">
              {activeConnectorsCount}
            </span>
          </button>
        </div>
      </header>

      {/* Messages Stream / Hero Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
        {!hasMessages ? (
          /* Claude Hero Welcome View */
          <div className="min-h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-4 py-6">
            <div className="w-12 h-12 rounded-2xl bg-[#cc785c] flex items-center justify-center shadow-lg shadow-[#cc785c]/25 animate-in zoom-in-90 duration-300">
              <Sparkles className="w-6 h-6 text-black fill-current" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xs uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-[#cc785c]/20 text-[#cc785c] border border-[#cc785c]/40 font-mono">
                  Claude Enterprise Pro
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-serif text-[#f2eee6] tracking-tight">{getGreeting()}</h2>
              <p className="text-sm text-[#9c978b] mt-2 max-w-md mx-auto leading-relaxed">
                Unlimited hybrid reasoning with Claude 3.7 Sonnet, Artifacts, and two-way proactive offline synchronization.
              </p>
            </div>

            {/* Centered Hero Prompt Box */}
            <div className="w-full pt-2">
              {renderPromptBox(true)}
            </div>

            {/* Quick Starters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left pt-4">
              <button
                onClick={() =>
                  onSendMessage('Design a high-scale microservices architecture with Next.js, Redis, and Supabase in 5 clear sections.')
                }
                className="p-3.5 rounded-2xl bg-[#23221d] border border-[#333129] hover:border-[#cc785c]/50 hover:bg-[#2a2822] transition-all text-xs text-[#dcd8ce] space-y-1 group"
              >
                <div className="font-semibold text-[#f2eee6] flex items-center gap-1.5 group-hover:text-[#cc785c]">
                  <Brain className="w-3.5 h-3.5 text-[#cc785c]" />
                  <span>🧠 3.7 Extended Reasoning Plan</span>
                </div>
                <p className="text-[#8a8579]">Architect a full-scale microservices cloud infrastructure.</p>
              </button>

              <button
                onClick={() =>
                  onSendMessage(
                    'Write a complete, responsive interactive dashboard component in HTML with Tailwind CSS and modern styling.'
                  )
                }
                className="p-3.5 rounded-2xl bg-[#23221d] border border-[#333129] hover:border-[#cc785c]/50 hover:bg-[#2a2822] transition-all text-xs text-[#dcd8ce] space-y-1 group"
              >
                <div className="font-semibold text-[#f2eee6] flex items-center gap-1.5 group-hover:text-[#cc785c]">
                  <FileCode className="w-3.5 h-3.5 text-[#cc785c]" />
                  <span>🛠️ Build Code Artifact</span>
                </div>
                <p className="text-[#8a8579]">Generate a live interactive HTML artifact component.</p>
              </button>
            </div>
          </div>
        ) : (
          /* Ongoing Conversation Stream */
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isLastAssistant = !isUser && index === messages.length - 1;
            const isThinkingOpen = expandedThinking[msg.id];

            return (
              <div
                key={msg.id}
                className={`flex space-x-3.5 max-w-3xl mx-auto ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-[#cc785c] flex items-center justify-center shrink-0 shadow-sm mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-black fill-current" />
                  </div>
                )}

                <div
                  className={`relative group rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#2b2923] text-[#f2eee6] max-w-[85%] rounded-tr-sm border border-[#3d3a31]'
                      : 'bg-[#22211c] text-[#dcd8ce] w-full rounded-tl-sm border border-[#312f28]'
                  }`}
                >
                  {/* Attachments */}
                  {isUser && msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-[#3d3a31]">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#35332b] text-xs text-[#dcd8ce]"
                        >
                          <Paperclip className="w-3 h-3 text-[#cc785c]" />
                          <span className="truncate max-w-[120px]">{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Proactive Autonomous Badge if generated while offline/away */}
                  {!isUser && msg.isProactive && (
                    <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                      <Radio className="w-3 h-3 animate-pulse" />
                      <span>Two-Way Proactive Check-in • Claude updated this while you were away</span>
                    </div>
                  )}

                  {/* Assistant Header Badge & Thinking Accordion */}
                  {!isUser && (
                    <div className="space-y-2 pb-2 mb-2 border-b border-[#2d2b24]">
                      <div className="flex items-center justify-between text-xs text-[#8a8579]">
                        <span className="font-semibold text-[#baa898] flex items-center gap-1.5">
                          <span>Claude 3.7 Sonnet</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono">
                            Enterprise Priority
                          </span>
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => copyMessage(msg.id, msg.content)}
                            className="p-1 rounded hover:bg-[#2c2a23] text-[#8a8579] hover:text-[#ece9e2] transition-all opacity-0 group-hover:opacity-100"
                            title="Copy message"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Thinking Accordion */}
                      {msg.thinking && (
                        <div className="rounded-lg bg-[#181714] border border-[#2e2c25] overflow-hidden text-xs">
                          <button
                            onClick={() => toggleThinking(msg.id)}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-[#8a8579] hover:text-[#ece9e2] transition-colors"
                          >
                            <div className="flex items-center space-x-1.5">
                              <Brain className="w-3.5 h-3.5 text-[#cc785c]" />
                              <span>
                                Thought for {msg.thinkingDuration || 2}s ({msg.thinkingBudget || 16000} token budget)
                              </span>
                            </div>
                            <span className="text-[11px] text-[#baa898]">
                              {isThinkingOpen ? 'Hide' : 'Show details'}
                            </span>
                          </button>
                          {isThinkingOpen && (
                            <div className="px-3 py-2 border-t border-[#2a2821] text-[#9c978b] font-mono text-[11px] leading-relaxed whitespace-pre-wrap bg-[#141310]">
                              {msg.thinking}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Markdown Body */}
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>

                  {/* Claude Artifact Card */}
                  {msg.artifact && (
                    <div
                      onClick={() => onSelectArtifact(msg.artifact!)}
                      className="mt-3.5 p-3 rounded-xl bg-[#1d1c18] border border-[#3b382f] hover:border-[#cc785c]/60 cursor-pointer transition-all flex items-center justify-between group/art"
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="w-8 h-8 rounded-lg bg-[#cc785c]/15 border border-[#cc785c]/30 flex items-center justify-center">
                          <FileCode className="w-4 h-4 text-[#cc785c]" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-[#ece9e2] truncate group-hover/art:text-[#cc785c]">
                            {msg.artifact.title}
                          </p>
                          <p className="text-[11px] text-[#8a8579] uppercase font-mono">
                            {msg.artifact.language || msg.artifact.type} Artifact • Click to Open
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-[#292721] text-[#ece9e2] font-medium border border-[#38352d]">
                        View Artifact →
                      </span>
                    </div>
                  )}

                  {/* Claude Action Toolbar */}
                  {!isUser && (
                    <div className="flex items-center space-x-2 pt-2 mt-2 border-t border-[#292721] text-[#8a8579] opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyMessage(msg.id, msg.content)}
                        className="p-1 rounded hover:bg-[#2c2a23] hover:text-[#ece9e2]"
                        title="Copy"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {isLastAssistant && (
                        <button
                          onClick={onRegenerateLast}
                          className="p-1 rounded hover:bg-[#2c2a23] hover:text-[#ece9e2]"
                          title="Retry / Regenerate response"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        className="p-1 rounded hover:bg-[#2c2a23] hover:text-emerald-400"
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-[#2c2a23] hover:text-rose-400"
                        title="Not helpful"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-[#3d3a31] flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-[#dcd8ce]" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isStreaming && (
          <div className="flex space-x-3.5 max-w-3xl mx-auto items-center text-xs text-[#9c978b] pt-1">
            <div className="w-2 h-2 rounded-full bg-[#cc785c] animate-ping mr-2" />
            <span>Claude is synthesizing & generating...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Prompt Box at Bottom */}
      {hasMessages && (
        <div className="p-4 md:p-6 bg-gradient-to-t from-[#1c1b18] via-[#1c1b18] to-transparent shrink-0">
          {renderPromptBox(false)}
        </div>
      )}
    </div>
  );
}
