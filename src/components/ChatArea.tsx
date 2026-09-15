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
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Maximize2,
  Wand2,
  FileDown,
  PlusCircle,
  Key,
  ExternalLink,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, ModelId, Artifact, ResponseStyle, Attachment, ThinkingBudget, CustomButton } from '@/types/chat';
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
  customButtons?: CustomButton[];
  onAddCustomButton?: (btn: CustomButton) => void;
  onDeleteCustomButton?: (id: string) => void;
  sessionTitle?: string;
  onOpenSettings?: () => void;
  hasGeminiKey?: boolean;
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
  customButtons = [],
  onAddCustomButton,
  onDeleteCustomButton,
  sessionTitle,
  onOpenSettings,
  hasGeminiKey = false,
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<ResponseStyle>('normal');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Self-Customization Modal State
  const [isAddingButton, setIsAddingButton] = useState(false);
  const [newBtnLabel, setNewBtnLabel] = useState('');
  const [newBtnPrompt, setNewBtnPrompt] = useState('');

  const handlePolishPrompt = () => {
    if (!input.trim()) return;
    const polished = `Act as Claude 3.7 Sonnet Enterprise. Provide a rigorous, production-grade, and beautifully structured solution with complete implementations and nuanced architectural patterns for:\n\n${input.trim()}`;
    setInput(polished);
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const mdContent = messages
      .map((m) => `### ${m.role === 'user' ? '👤 User' : '🤖 Claude'}\n\n${m.content}\n\n---\n`)
      .join('\n');
    const blob = new Blob(
      [
        `# Conversation Export: ${sessionTitle || 'Claude Session'}\n\nDate: ${new Date().toLocaleString()}\n\n---\n\n${mdContent}`,
      ],
      { type: 'text/markdown' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-conversation-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

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
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
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

  // Text-to-Speech (TTS) Voice playback for Claude's messages
  const handleSpeak = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this device/browser.');
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[#*_~]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Web Speech Recognition for Voice Dictation
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript('');
    };

    recognition.onresult = (event: any) => {
      let currentInterim = '';
      let finalStr = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript + ' ';
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }
      if (finalStr) {
        setInput((prev) => (prev ? `${prev} ${finalStr.trim()}` : finalStr.trim()));
      }
      setInterimTranscript(currentInterim);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  // Multimodal File & Image Processing
  const processFile = (file: File): Promise<Attachment> => {
    return new Promise((resolve) => {
      const isImg = file.type.startsWith('image/');
      const reader = new FileReader();

      if (isImg) {
        reader.onload = () => {
          resolve({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            type: file.type || 'image',
            dataUrl: reader.result as string,
            isImage: true,
          });
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const contentStr = typeof reader.result === 'string' ? reader.result : '';
          resolve({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            type: file.type || 'document',
            contentSnippet: contentStr.slice(0, 50000),
          });
        };
        reader.readAsText(file);
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newAttachments = await Promise.all(Array.from(files).map(processFile));
    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToProcess: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) filesToProcess.push(file);
      }
    }

    if (filesToProcess.length > 0) {
      e.preventDefault();
      const newAtts = await Promise.all(filesToProcess.map(processFile));
      setAttachments((prev) => [...prev, ...newAtts]);
    }
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
      {/* Attachments with Image Thumbnails */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 mb-2 border-b border-[#2e2c24]">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center space-x-2 px-2 py-1 rounded-lg bg-[#2b2923] border border-[#38352d] text-xs text-[#ece9e2]"
            >
              {att.isImage && att.dataUrl ? (
                <img
                  src={att.dataUrl}
                  alt={att.name}
                  className="w-7 h-7 object-cover rounded shadow-sm cursor-pointer"
                  onClick={() => setPreviewImage(att.dataUrl!)}
                />
              ) : (
                <Paperclip className="w-3.5 h-3.5 text-[#cc785c]" />
              )}
              <span className="truncate max-w-[130px] font-medium">{att.name}</span>
              <span className="text-[10px] text-[#8a8579] font-mono">({att.size})</span>
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="hover:text-rose-400 p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Voice Listening Banner */}
      {isListening && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-[#cc785c]/15 border border-[#cc785c]/30 text-[#cc785c] text-xs animate-in fade-in">
          <div className="flex items-center space-x-2 truncate">
            <div className="w-2 h-2 rounded-full bg-[#cc785c] animate-ping shrink-0" />
            <span className="font-semibold shrink-0">Listening... Speak now</span>
            {interimTranscript && (
              <span className="text-[#ece9e2] italic truncate max-w-[200px] sm:max-w-[320px]">
                "{interimTranscript}"
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleListening}
            className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#cc785c]/25 hover:bg-[#cc785c]/40 text-[#ece9e2] transition-colors shrink-0"
          >
            Done
          </button>
        </div>
      )}

      {/* Self-Customization Quick Buttons */}
      <div className="flex items-center gap-1.5 pb-2 mb-1 overflow-x-auto no-scrollbar">
        {customButtons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => {
              setInput(btn.prompt);
              textareaRef.current?.focus();
            }}
            className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#2b2923] hover:bg-[#38352d] text-[#ece9e2] border border-[#3f3c32] hover:border-[#cc785c]/60 transition-all flex items-center gap-1.5 shadow-sm group/btn"
          >
            <span>{btn.label}</span>
            {onDeleteCustomButton && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCustomButton(btn.id);
                }}
                className="text-[#8a8579] hover:text-rose-400 text-xs px-0.5"
                title="Remove custom button"
              >
                ×
              </span>
            )}
          </button>
        ))}
        {onAddCustomButton && (
          <button
            type="button"
            onClick={() => setIsAddingButton(true)}
            className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#24221d] hover:bg-[#2c2a23] text-[#8a8579] hover:text-[#cc785c] border border-dashed border-[#444136] hover:border-[#cc785c]/60 transition-all flex items-center gap-1"
            title="Create a custom button across Web, Android, and Desktop"
          >
            <PlusCircle className="w-3 h-3 text-[#cc785c]" />
            <span>+ Custom Action</span>
          </button>
        )}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        rows={isHero ? 2 : 1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={
          isListening
            ? 'Transcribing your voice in real-time...'
            : isStreaming
            ? 'Type to interrupt and send instantly (never queued)...'
            : isHero
            ? 'How can Claude help you today?'
            : 'Reply to Claude... (Shift+Enter for newline, Ctrl+V to paste screenshot)'
        }
        className="w-full bg-transparent text-sm text-[#ece9e2] placeholder-[#7d786e] px-2 py-1.5 focus:outline-none resize-none max-h-48 leading-relaxed font-normal"
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept="image/*,.txt,.pdf,.md,.json,.js,.ts,.tsx,.py,.html,.css"
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
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg hover:bg-[#2d2b23] text-[#8a8579] hover:text-[#ece9e2] transition-colors"
            title="Attach documents, photos, or images"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Magic Wand Prompt Polish Button */}
          <button
            type="button"
            onClick={handlePolishPrompt}
            disabled={!input.trim()}
            className={`p-1.5 rounded-lg transition-all ${
              input.trim()
                ? 'hover:bg-[#2d2b23] text-[#cc785c] hover:text-[#db8a6e]'
                : 'text-[#5c574e] cursor-not-allowed'
            }`}
            title="Magic Wand: Polish prompt for Claude Enterprise"
          >
            <Wand2 className="w-4 h-4" />
          </button>

          {/* Voice Dictation (Speech-to-Text) Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-1.5 rounded-lg transition-all ${
              isListening
                ? 'bg-[#cc785c] text-black animate-pulse shadow-md shadow-[#cc785c]/40'
                : 'hover:bg-[#2d2b23] text-[#8a8579] hover:text-[#ece9e2]'
            }`}
            title={isListening ? 'Stop Voice Dictation' : 'Speak to Claude (Voice Dictation)'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
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
          {/* 1-Click Key Setup Alert if not configured */}
          {!hasGeminiKey && onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-medium transition-all animate-pulse"
              title="Add free Google Gemini API Key for 1,500 daily requests (zero credit card)"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Add Free Key</span>
            </button>
          )}

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

          {/* EXPORT CHAT BUTTON */}
          <button
            onClick={handleExportChat}
            disabled={messages.length === 0}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              messages.length > 0
                ? 'bg-[#26241f] hover:bg-[#302e27] border-[#38352d] text-[#dcd8ce] hover:text-[#ece9e2]'
                : 'bg-[#21201b] border-[#2e2c24] text-[#6d685e] cursor-not-allowed'
            }`}
            title="Export conversation as Markdown (.md)"
          >
            <FileDown className="w-3.5 h-3.5 text-[#cc785c]" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* DOWNLOAD BUTTON */}
          <button
            onClick={onOpenDownload}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#26241f] hover:bg-[#302e27] border border-[#38352d] text-xs font-medium text-[#dcd8ce] transition-all hover:text-[#ece9e2]"
            title="Download Desktop & Android Apps"
          >
            <Download className="w-3.5 h-3.5 text-[#cc785c]" />
            <span>Download</span>
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
                  className={`relative group text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#2b2923] text-[#f4efe6] max-w-[85%] rounded-2xl rounded-tr-sm border border-[#3d3a31] px-4 py-3'
                      : 'text-[#ede8df] w-full px-1 py-1'
                  }`}
                >
                  {/* Attachments */}
                  {isUser && msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-[#3d3a31]">
                      {msg.attachments.map((att) => (
                        <div key={att.id}>
                          {att.isImage && att.dataUrl ? (
                            <div
                              onClick={() => setPreviewImage(att.dataUrl!)}
                              className="group/img relative cursor-pointer overflow-hidden rounded-xl border border-[#484439] hover:border-[#cc785c] transition-all my-1 shadow-sm"
                            >
                              <img
                                src={att.dataUrl}
                                alt={att.name}
                                className="max-h-60 max-w-xs object-cover rounded-lg group-hover/img:scale-102 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-5 h-5 text-white drop-shadow" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#35332b] text-xs text-[#dcd8ce] border border-[#444136]">
                              <Paperclip className="w-3.5 h-3.5 text-[#cc785c]" />
                              <span className="truncate max-w-[140px] font-medium">{att.name}</span>
                              <span className="text-[10px] text-[#8a8579] font-mono">({att.size})</span>
                            </div>
                          )}
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
                    <div className="space-y-2 pb-2 mb-2 border-b border-[#2a2822]">
                      <div className="flex items-center justify-between text-xs text-[#8a8579]">
                        <span className="font-semibold text-[#baa898] flex items-center gap-2 flex-wrap">
                          <span>Claude 3.7 Sonnet</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono">
                            Enterprise Priority
                          </span>
                          {msg.skillActivated && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#cc785c]/15 text-[#cc785c] border border-[#cc785c]/30 font-medium flex items-center gap-1 shadow-sm animate-in fade-in">
                              <Sparkles className="w-2.5 h-2.5 fill-current text-[#cc785c] animate-pulse" />
                              <span>Skill: {msg.skillActivated}</span>
                            </span>
                          )}
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
                  <div className="markdown-body space-y-3 text-[14.5px] leading-relaxed text-[#ede8df]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const lang = match ? match[1] : '';
                          const codeText = String(children).replace(/\n$/, '');

                          if (!inline && (lang || codeText.includes('\n'))) {
                            return (
                              <div className="my-3 rounded-xl bg-[#151411] border border-[#2d2b24] overflow-hidden shadow-lg">
                                <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#1d1c18] border-b border-[#282620] text-xs text-[#9c978b]">
                                  <div className="flex items-center space-x-2">
                                    <div className="flex space-x-1">
                                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                                    </div>
                                    <span className="font-mono text-[11px] font-semibold text-[#cc785c] uppercase ml-1.5">
                                      {lang || 'code'}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => copyMessage(`code_${Date.now()}`, codeText)}
                                    className="flex items-center gap-1 hover:text-[#ece9e2] transition-colors font-sans text-[11px] px-2 py-0.5 rounded hover:bg-[#282620]"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </button>
                                </div>
                                <pre className="p-3.5 overflow-x-auto text-xs font-mono text-[#e6e2d8] leading-relaxed">
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              </div>
                            );
                          }

                          return (
                            <code
                              className="px-1.5 py-0.5 rounded bg-[#272520] text-[#cc785c] font-mono text-xs border border-[#36342b]"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        table({ children }) {
                          return (
                            <div className="my-3 overflow-x-auto rounded-xl border border-[#302e27]">
                              <table className="min-w-full text-xs text-left divide-y divide-[#302e27]">
                                {children}
                              </table>
                            </div>
                          );
                        },
                        th({ children }) {
                          return (
                            <th className="px-3 py-2 bg-[#23221d] font-semibold text-[#f2eee6]">
                              {children}
                            </th>
                          );
                        },
                        td({ children }) {
                          return (
                            <td className="px-3 py-2 border-t border-[#292822] text-[#dcd8ce]">
                              {children}
                            </td>
                          );
                        },
                        blockquote({ children }) {
                          return (
                            <blockquote className="my-2 border-l-2 border-[#cc785c] pl-3 italic text-[#aba597]">
                              {children}
                            </blockquote>
                          );
                        },
                        a({ href, children }) {
                          return (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#cc785c] hover:underline inline-flex items-center gap-0.5"
                            >
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* 1-Click Interactive Key Setup Card */}
                  {!isUser && (msg.content.includes('Settings') || msg.content.includes('Gemini') || msg.content.includes('Notice:') || msg.content.includes('API key')) && (
                    <div className="mt-3.5 p-3.5 rounded-xl bg-[#cc785c]/10 border border-[#cc785c]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f2eee6]">
                          <Key className="w-4 h-4 text-[#cc785c]" />
                          <span>Activate Instant Claude 3.7 Responses</span>
                        </div>
                        <p className="text-[11px] text-[#baa898]">
                          1,500 daily requests free • Zero credit/debit card required • From Google AI Studio
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-[#2b2923] hover:bg-[#38352d] border border-[#444136] text-xs text-[#dcd8ce] hover:text-[#ece9e2] transition-all flex items-center gap-1"
                        >
                          <span>Get Free Key</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {onOpenSettings && (
                          <button
                            type="button"
                            onClick={onOpenSettings}
                            className="px-3 py-1.5 rounded-lg bg-[#cc785c] hover:bg-[#db8a6e] text-black font-semibold text-xs transition-all shadow-md shadow-[#cc785c]/25 active:scale-95 flex items-center gap-1.5"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Open Settings</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

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
                      <button
                        onClick={() => handleSpeak(msg.id, msg.content)}
                        className={`p-1 rounded transition-colors ${
                          speakingMsgId === msg.id
                            ? 'bg-[#cc785c]/20 text-[#cc785c]'
                            : 'hover:bg-[#2c2a23] hover:text-[#ece9e2]'
                        }`}
                        title={speakingMsgId === msg.id ? 'Stop audio' : 'Listen to Claude speak'}
                      >
                        {speakingMsgId === msg.id ? (
                          <VolumeX className="w-3.5 h-3.5 text-[#cc785c] animate-pulse" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
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

      {/* Fullscreen Image Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Attachment Preview"
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain border border-zinc-800"
            />
          </div>
        </div>
      )}

      {/* Add Custom Button Modal (Self-Customization) */}
      {isAddingButton && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-[#23221e] border border-[#383630] shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#33312a]">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-[#cc785c]" />
                <h3 className="text-sm font-semibold text-[#ece9e2]">Add Custom Action Button</h3>
              </div>
              <button
                onClick={() => setIsAddingButton(false)}
                className="p-1 rounded hover:bg-[#2c2a25] text-[#9c978b] hover:text-[#ece9e2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#8a8579]">Button Label</label>
                <input
                  type="text"
                  placeholder="e.g. 🚀 Deploy App or ⚡ Optimize Code"
                  value={newBtnLabel}
                  onChange={(e) => setNewBtnLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#8a8579]">Prompt to Trigger</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Review the architecture, check for security vulnerabilities, and optimize performance."
                  value={newBtnPrompt}
                  onChange={(e) => setNewBtnPrompt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#33312a]">
              <button
                type="button"
                onClick={() => setIsAddingButton(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#9c978b] hover:text-[#ece9e2]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newBtnLabel.trim() || !newBtnPrompt.trim()}
                onClick={() => {
                  if (onAddCustomButton && newBtnLabel.trim() && newBtnPrompt.trim()) {
                    onAddCustomButton({
                      id: `btn_${Date.now()}`,
                      label: newBtnLabel.trim(),
                      prompt: newBtnPrompt.trim(),
                    });
                    setNewBtnLabel('');
                    setNewBtnPrompt('');
                    setIsAddingButton(false);
                  }
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  newBtnLabel.trim() && newBtnPrompt.trim()
                    ? 'bg-[#cc785c] hover:bg-[#db8a6e] text-black shadow-md'
                    : 'bg-[#2b2923] text-[#6d685e] cursor-not-allowed'
                }`}
              >
                Add Button
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
