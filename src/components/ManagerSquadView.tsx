'use client';

import React, { useState, useEffect } from 'react';
import {
  Crown,
  FolderKanban,
  Users,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Send,
  Eye,
  Plus,
  Radio,
  Check,
  Zap,
  Activity,
  X,
} from 'lucide-react';
import { ManagedSubAgent, ExecutiveSquad, ModelId } from '@/types/chat';

interface ManagerSquadViewProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSendPromptToSubAgent?: (agentAlias: string, prompt: string) => void;
  onDeployToSession?: (directive: string) => void | Promise<void>;
}

const DEFAULT_SUB_AGENTS: ManagedSubAgent[] = [
  {
    id: 'pm1',
    name: 'Project Manager 1',
    alias: 'PM1',
    email: 'pm1.analyst@workspace.internal',
    role: 'Task Breakdown & Spec Analyst',
    status: 'idle',
    currentTask: 'Ready for a directive',
    lastProgress: 'No live task is running yet.',
    modelId: 'claude-3-7-sonnet',
    assignedBy: 'Executive Manager',
    outputLog: [
      '[PM1] Squad member initialized.',
    ],
  },
  {
    id: 'pm2',
    name: 'Project Manager 2',
    alias: 'PM2',
    role: 'Client Operations & Communications',
    status: 'idle',
    currentTask: 'Ready for a directive',
    lastProgress: 'No live task is running yet.',
    modelId: 'the-boss-chat',
    assignedBy: 'Executive Manager',
    outputLog: [
      '[PM2] Squad member initialized.',
    ],
  },
  {
    id: 'pm3',
    name: 'Project Manager 3',
    alias: 'PM3',
    role: 'Delivery, QA & Release Steward',
    status: 'idle',
    currentTask: 'Ready for a directive',
    lastProgress: 'No live task is running yet.',
    modelId: 'the-boss-build',
    assignedBy: 'Executive Manager',
    outputLog: [
      '[PM3] Squad member initialized.',
    ],
  },
];

export default function ManagerSquadView({
  isOpen = true,
  onClose,
  onSendPromptToSubAgent,
  onDeployToSession,
}: ManagerSquadViewProps) {
  const [subAgents, setSubAgents] = useState<ManagedSubAgent[]>(DEFAULT_SUB_AGENTS);
  const [directiveInput, setDirectiveInput] = useState('');
  const [isAutoMonitoring, setIsAutoMonitoring] = useState(true);
  const [selectedSubAgent, setSelectedSubAgent] = useState<ManagedSubAgent | null>(subAgents[0]);
  const [directPrompt, setDirectPrompt] = useState('');
  const [inspectionFeed, setInspectionFeed] = useState<string[]>([
    '👑 [Sameer (Manager)] Executive Manager initialized autonomous squad supervision.',
    '📋 [PM1] Ready for live task directives.',
    '🔍 [PM3] Ready for live QA directives.',
  ]);

  // Autonomous inspection cycle
  useEffect(() => {
    if (!isAutoMonitoring) return;

    const timer = setInterval(() => {
      setSubAgents((prev) =>
        prev.map((agent) => {
          if (agent.status === 'working') {
            return {
              ...agent,
              lastProgress: `Auto-inspected at ${new Date().toLocaleTimeString()}: Progress on schedule.`,
            };
          }
          return agent;
        })
      );
    }, 15000);

    return () => clearInterval(timer);
  }, [isAutoMonitoring]);

  const handleRunSquadLocally = (customDirective?: string, dispatchToChat = true) => {
    const directive = (customDirective || directiveInput).trim();
    if (!directive) return;

    const timestamp = new Date().toLocaleTimeString();
    setInspectionFeed((prev) => [
      `👑 [Sameer: ${timestamp}] Dispatched directive: "${directive}"`,
      `⚡ [PM1] Starting architectural specification decomposition...`,
      `⚡ [PM2] Aligning client timeline and operational deliverables...`,
      `⚡ [PM3] Establishing automated test criteria and build checks...`,
      ...prev,
    ]);

    // Set all agents to actively working
    setSubAgents((prev) =>
      prev.map((ag) => ({
        ...ag,
        status: 'working',
        currentTask: `Executing: ${directive}`,
        lastProgress: `In progress: initialized sub-task pipeline...`,
        outputLog: [
          `[${ag.alias}: ${timestamp}] Received directive: "${directive}"`,
          `[${ag.alias}: ${timestamp}] 🚀 Task pipeline running under Manager Sameer supervision`,
          ...(ag.outputLog || []),
        ],
      }))
    );

    // No simulated completion. The squad only records that a directive
    // was dispatched; actual completion comes from the live workspace engine.
    if (dispatchToChat && onDeployToSession) {
      onDeployToSession(directive);
    }

    setDirectiveInput('');
  };

  const handleDeployDirectiveToChat = () => {
    if (!directiveInput.trim()) return;
    const directive = directiveInput.trim();
    handleRunSquadLocally(directive, false);
    if (onDeployToSession) {
      onDeployToSession(directive);
    }
  };

  const handleSendDirectPrompt = () => {
    if (!selectedSubAgent || !directPrompt.trim()) return;
    const prompt = directPrompt.trim();
    const timestamp = new Date().toLocaleTimeString();

    const updatedLog = [
      `[${selectedSubAgent.alias}: ${timestamp}] Directive: "${prompt}"`,
      `[${selectedSubAgent.alias}: ${timestamp}] Command forwarded to the live workspace chat engine.`,
      ...(selectedSubAgent.outputLog || []),
    ];

    setSubAgents((prev) =>
      prev.map((ag) =>
        ag.id === selectedSubAgent.id
          ? {
              ...ag,
              status: 'working',
              currentTask: prompt,
              outputLog: updatedLog,
            }
          : ag
      )
    );

    setInspectionFeed((prev) => [
      `👑 [Sameer (Manager)] Sent direct command to ${selectedSubAgent.alias}: "${prompt}"`,
      `📨 [${selectedSubAgent.alias}] Command forwarded to the live workspace chat engine.`,
      ...prev,
    ]);

    if (onSendPromptToSubAgent) {
      onSendPromptToSubAgent(selectedSubAgent.alias, prompt);
    }

    setDirectPrompt('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl h-[90vh] rounded-2xl bg-[#1b1a16] border border-[#38352d] shadow-2xl overflow-hidden flex flex-col">
        {/* Top Navbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2b24] bg-[#161512]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#b86146] to-[#e68d71] flex items-center justify-center shadow-md shadow-[#cc785c]/25">
              <Crown className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#f2eee6]">Sameer AI Agent Squad</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#cc785c]/15 text-[#cc785c] border border-[#cc785c]/30 font-mono">
                  Autonomous Multi-PM Engine
                </span>
              </div>
              <p className="text-xs text-[#9c978b]">
                Manager Sameer continuously monitors, inspects, and commands PM1, PM2, and PM3 in parallel
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsAutoMonitoring(!isAutoMonitoring)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium font-mono transition-all ${
                isAutoMonitoring
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm'
                  : 'bg-[#24221d] border-[#38352d] text-[#8a8579]'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isAutoMonitoring ? 'animate-pulse text-emerald-400' : ''}`} />
              <span>Auto-Inspect: {isAutoMonitoring ? 'Active' : 'Paused'}</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[#282620] text-[#9c978b] hover:text-[#ece9e2] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Executive Directive Command Bar */}
        <div className="p-4 border-b border-[#2d2b24] bg-[#1f1e19]">
          <div className="flex flex-col sm:flex-row gap-2.5 items-center">
            <div className="relative flex-1 w-full">
              <div className="absolute left-3 top-2.5 flex items-center gap-1.5 text-[#cc785c]">
                <Crown className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">Directive:</span>
              </div>
              <input
                type="text"
                placeholder="Issue directive to PM1, PM2, PM3 (e.g. 'Build fullstack dashboard with real-time sync and verify all tests')..."
                value={directiveInput}
                onChange={(e) => setDirectiveInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunSquadLocally();
                }}
                className="w-full pl-28 pr-4 py-2 rounded-xl bg-[#141310] border border-[#3b382f] text-xs text-[#ece9e2] placeholder-[#6d685e] focus:outline-none focus:border-[#cc785c]"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleRunSquadLocally()}
                disabled={!directiveInput.trim()}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 shrink-0 transition-all ${
                  directiveInput.trim()
                    ? 'bg-[#cc785c] hover:bg-[#db8a6e] text-black shadow-md shadow-[#cc785c]/25 active:scale-95'
                    : 'bg-[#2b2923] text-[#6d685e] cursor-not-allowed'
                }`}
                title="Run parallel autonomous execution across PM1, PM2, PM3 right in Squad View"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Run Squad</span>
              </button>
              <button
                onClick={handleDeployDirectiveToChat}
                disabled={!directiveInput.trim()}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 shrink-0 transition-all ${
                  directiveInput.trim()
                    ? 'bg-[#26241f] hover:bg-[#302e27] border border-[#38352d] text-[#dcd8ce] hover:text-[#ece9e2] active:scale-95'
                    : 'bg-[#2b2923] text-[#6d685e] border border-transparent cursor-not-allowed'
                }`}
                title="Deploy directive to active chat session and run streaming AI response"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Deploy to Chat</span>
              </button>
            </div>
          </div>
        </div>

        {/* Squad Grid & Inspection Feed */}
        <div className="flex-1 flex overflow-hidden">
          {/* Subordinates Grid (Left 60%) */}
          <div className="w-full md:w-3/5 overflow-y-auto p-5 space-y-4 border-r border-[#2d2b24]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8a8579] font-mono">
                Supervised Downside Sub-Managers ({subAgents.length})
              </h3>
              <span className="text-[11px] text-[#baa898]">Click an agent to inspect details</span>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {subAgents.map((agent) => {
                const isSelected = selectedSubAgent?.id === agent.id;
                const statusColor =
                  agent.status === 'working'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : agent.status === 'inspecting'
                    ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                    : agent.status === 'completed'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700';

                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedSubAgent(agent)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#27251f] border-[#cc785c] shadow-lg shadow-[#cc785c]/10'
                        : 'bg-[#1f1e1a] hover:bg-[#25241e] border-[#312f27]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#141310] border border-[#3b382f] flex items-center justify-center font-bold text-xs text-[#cc785c] font-mono">
                          {agent.alias}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-[#f2eee6]">{agent.name}</span>
                            {agent.email && (
                              <span className="text-[10px] text-[#8a8579] font-mono">
                                ({agent.email})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#9c978b]">{agent.role}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold border ${statusColor}`}
                      >
                        {agent.status}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#151411] border border-[#2b2923] space-y-1 mb-2">
                      <div className="text-[10px] text-[#8a8579] font-mono uppercase">Current Task</div>
                      <p className="text-xs text-[#dcd8ce] leading-relaxed">{agent.currentTask}</p>
                    </div>

                    {agent.lastProgress && (
                      <p className="text-[11px] text-[#baa898] italic flex items-center gap-1">
                        <Activity className="w-3 h-3 text-[#cc785c]" />
                        <span>{agent.lastProgress}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Selected Agent Inspection & Live Feed (Right 40%) */}
          <div className="hidden md:flex w-2/5 flex-col h-full overflow-hidden bg-[#161512]">
            {selectedSubAgent ? (
              <div className="p-5 flex flex-col h-full justify-between space-y-4">
                <div className="space-y-4 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-[#2d2b24]">
                    <div>
                      <h4 className="text-sm font-semibold text-[#f2eee6]">
                        Inspect: {selectedSubAgent.name}
                      </h4>
                      <p className="text-xs text-[#cc785c] font-mono">{selectedSubAgent.alias} Control Channel</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-[#27251f] text-[#baa898] border border-[#38352d] font-mono">
                      {selectedSubAgent.modelId}
                    </span>
                  </div>

                  {/* Direct Command to SubAgent */}
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase font-bold text-[#8a8579] font-mono">
                      Send Command to {selectedSubAgent.alias}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Command for ${selectedSubAgent.alias}...`}
                        value={directPrompt}
                        onChange={(e) => setDirectPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendDirectPrompt();
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-[#1d1c18] border border-[#38352d] text-xs text-[#ece9e2] placeholder-zinc-600 focus:outline-none focus:border-[#cc785c]"
                      />
                      <button
                        onClick={handleSendDirectPrompt}
                        disabled={!directPrompt.trim()}
                        className="px-3 py-1.5 rounded-xl bg-[#cc785c] hover:bg-[#db8a6e] text-black font-semibold text-xs transition-all disabled:opacity-40"
                      >
                        Send
                      </button>
                    </div>
                  </div>

                  {/* Output Log */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase font-bold text-[#8a8579] font-mono">
                        {selectedSubAgent.alias} Output & Inspection Log
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#12110e] border border-[#27251f] space-y-1.5 text-[11px] font-mono text-[#a6a094] max-h-48 overflow-y-auto">
                      {(selectedSubAgent.outputLog || []).map((log, i) => (
                        <div key={i} className="leading-relaxed whitespace-pre-wrap">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Global Live Feed */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] uppercase font-bold text-[#8a8579] font-mono">
                      Live Inspection Feed
                    </span>
                    <div className="p-3 rounded-xl bg-[#12110e] border border-[#27251f] space-y-1 text-[11px] font-mono text-[#8a8579] max-h-40 overflow-y-auto">
                      {inspectionFeed.map((feed, i) => (
                        <div key={i} className="truncate">
                          {feed}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-zinc-500">
                Select an agent to inspect
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
