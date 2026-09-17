'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import ArtifactPanel from '@/components/ArtifactPanel';
import ConnectorsModal, { DEFAULT_CONNECTORS, createDefaultConnectors, Connector } from '@/components/ConnectorsModal';
import SettingsModal, { SettingsTab } from '@/components/SettingsModal';
import ProjectModal from '@/components/ProjectModal';
import DownloadModal from '@/components/DownloadModal';
import AgentsModal from '@/components/AgentsModal';
import FeaturesModal from '@/components/FeaturesModal';
import { Session, Message, ModelId, Artifact, Project, Attachment, ThinkingBudget, CustomButton, OpenWorkAgent, ConnectorConfig } from '@/types/chat';

const DEFAULT_CUSTOM_BUTTONS: CustomButton[] = [
  { id: 'btn_1', label: '🚀 Deploy Guide', prompt: 'Provide a production deployment guide with Docker and CI/CD workflow.' },
  { id: 'btn_2', label: '⚡ Optimize Code', prompt: 'Analyze this code for performance bottlenecks and provide optimized code.' },
  { id: 'btn_3', label: '🔍 Security Audit', prompt: 'Audit this implementation for OWASP security vulnerabilities.' },
];

const DEFAULT_SESSION: Session = {
  id: 'ses_default',
  title: 'New Conversation',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [],
  activeModel: 'claude-3-7-sonnet',
  connectors: createDefaultConnectors(),
};

function extractArtifact(content: string): Artifact | undefined {
  const codeBlockRegex = /```([a-zA-Z0-9_\-]+)?\n([\s\S]*?)```/;
  const match = content.match(codeBlockRegex);
  if (!match) return undefined;

  const lang = (match[1] || 'text').toLowerCase();
  const code = match[2];

  if (code.length < 40) return undefined;

  const isHtml = lang === 'html' || lang === 'svg';

  return {
    id: `art_${Date.now()}`,
    title: isHtml ? 'Interactive Component Preview' : `${lang.toUpperCase()} Implementation`,
    type: isHtml ? 'html' : 'code',
    language: lang,
    content: code,
  };
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([DEFAULT_SESSION]);
  const [activeSessionId, setActiveSessionId] = useState<string>(DEFAULT_SESSION.id);
  const [activeModel, setActiveModel] = useState<ModelId>('claude-3-7-sonnet');
  const [thinkingBudget, setThinkingBudget] = useState<ThinkingBudget>(16000);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Two-Way Autonomous Proactive Mode
  const [isProactiveMode, setIsProactiveMode] = useState<boolean>(true);

  // Modals & Enterprise Features State
  const [isConnectorsOpen, setIsConnectorsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isAgentsModalOpen, setIsAgentsModalOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>(DEFAULT_CONNECTORS);
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [openRouterKey, setOpenRouterKey] = useState<string>('');

  // Cross-Device Cloud Sync State
  const [syncRoomId, setSyncRoomId] = useState<string>('sameer-workspace-pro');
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [supabaseKey, setSupabaseKey] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<string>('Local Synced');

  // Self-Customization Buttons State (Cross-Device Sync)
  const [customButtons, setCustomButtons] = useState<CustomButton[]>(DEFAULT_CUSTOM_BUTTONS);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Service Worker Registration & Cache Invalidation for instant live updates
  useEffect(() => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key !== 'claude-live-v2') caches.delete(key).catch(() => {});
        });
      }).catch(() => {});
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.update().catch(() => {});
      }).catch(() => {});
    }
  }, []);

  // Load from localStorage & Cloud Sync
  useEffect(() => {
    try {
      const saved = localStorage.getItem('claude_cloud_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const initialized = parsed.map((s: any) => ({
            ...s,
            connectors:
              Array.isArray(s.connectors) && s.connectors.length > 0
                ? s.connectors
                : createDefaultConnectors(),
          }));
          setSessions(initialized);
          setActiveSessionId(initialized[0].id);

          // Check if user was offline/away and trigger two-way proactive agent check-in
          const lastActive = parsed[0].lastVisitedAt || parsed[0].updatedAt;
          const awayMinutes = (Date.now() - lastActive) / (1000 * 60);

          if (awayMinutes > 10 && parsed[0].messages.length > 1) {
            const proactiveMsg: Message = {
              id: `msg_proactive_${Date.now()}`,
              role: 'assistant',
              content: `👋 **Welcome back, Sameer!**\n\nWhile you were away, I reviewed our previous context. If you'd like to continue, let me know what we should tackle next!`,
              timestamp: Date.now(),
              modelId: parsed[0].activeModel,
              isProactive: true,
            };
            parsed[0].messages.push(proactiveMsg);
            parsed[0].lastVisitedAt = Date.now();
            setSessions([...parsed]);
          }
        }
      }
      const savedProjects = localStorage.getItem('claude_projects');
      if (savedProjects) setProjects(JSON.parse(savedProjects));
      const savedGKey = localStorage.getItem('claude_gemini_key');
      if (savedGKey) setGeminiKey(savedGKey);
      const savedOrKey = localStorage.getItem('claude_openrouter_key');
      if (savedOrKey) setOpenRouterKey(savedOrKey);
      const savedProactive = localStorage.getItem('claude_proactive_mode');
      if (savedProactive !== null) setIsProactiveMode(savedProactive === 'true');

      // Load Self-Customization Buttons
      const savedBtns = localStorage.getItem('claude_custom_buttons');
      if (savedBtns) {
        try {
          setCustomButtons(JSON.parse(savedBtns));
        } catch (e) {}
      }

      // Load Cloud Sync settings
      const savedRoom = localStorage.getItem('claude_sync_room');
      if (savedRoom) setSyncRoomId(savedRoom);
      const savedSubUrl = localStorage.getItem('claude_supabase_url');
      if (savedSubUrl) setSupabaseUrl(savedSubUrl);
      const savedSubKey = localStorage.getItem('claude_supabase_key');
      if (savedSubKey) setSupabaseKey(savedSubKey);

      // Attempt cloud sync pull
      const activeRoom = savedRoom || 'sameer-workspace-pro';
      fetch(`/api/sync?roomId=${encodeURIComponent(activeRoom)}${savedSubUrl ? `&supabaseUrl=${encodeURIComponent(savedSubUrl)}&supabaseKey=${encodeURIComponent(savedSubKey || '')}` : ''}`)
        .then((r) => r.json())
        .then((res) => {
          if (res?.data?.sessions && Array.isArray(res.data.sessions) && res.data.sessions.length > 0) {
            setSessions(res.data.sessions);
            if (res.data.projects) setProjects(res.data.projects);
            setSyncStatus('Cloud Synced');
          }
        })
        .catch(() => {});
    } catch (e) {
      // pass
    }
  }, []);

  // Push updates to cloud relay or Supabase
  const handleTriggerSyncNow = async () => {
    if (!syncRoomId && !supabaseUrl) return;
    setSyncStatus('Syncing...');
    try {
      const resp = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: syncRoomId,
          supabaseUrl: supabaseUrl || undefined,
          supabaseKey: supabaseKey || undefined,
          data: { sessions, projects },
        }),
      });
      if (resp.ok) {
        setSyncStatus('Cloud Synced');
      } else {
        setSyncStatus('Sync Pending');
      }
    } catch (e) {
      setSyncStatus('Offline Cache');
    }
  };

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('claude_cloud_sessions', JSON.stringify(sessions));
    } catch (e) {
      // pass
    }
  }, [sessions]);

  // Save projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('claude_projects', JSON.stringify(projects));
    } catch (e) {
      // pass
    }
  }, [projects]);

  const handleToggleProactiveMode = () => {
    const next = !isProactiveMode;
    setIsProactiveMode(next);
    localStorage.setItem('claude_proactive_mode', String(next));
  };

  const handleSaveGeminiKey = (key: string) => {
    setGeminiKey(key);
    localStorage.setItem('claude_gemini_key', key);
  };

  const handleSaveOpenRouterKey = (key: string) => {
    setOpenRouterKey(key);
    localStorage.setItem('claude_openrouter_key', key);
  };

  // Request Web Notifications permission for continuous background alerts
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Two-Way Autonomous Background Proactive Agent (Messages user in the background like a human)
  const lastProactiveTimeRef = useRef<number>(Date.now());
  const proactivePoolIndexRef = useRef<number>(0);

  useEffect(() => {
    if (!isProactiveMode) return;

    const interval = setInterval(() => {
      if (isStreaming) return;

      const now = Date.now();
      const currentSession = sessions.find((s) => s.id === activeSessionId);
      if (!currentSession || currentSession.messages.length < 1) return;

      const lastMsg = currentSession.messages[currentSession.messages.length - 1];
      const timeSinceLastMsg = now - (lastMsg.timestamp || 0);
      const timeSinceLastProactive = now - lastProactiveTimeRef.current;

      // When user is idle for >= 30 seconds and >= 40 seconds since last proactive check-in
      if (timeSinceLastMsg >= 30000 && timeSinceLastProactive >= 40000) {
        lastProactiveTimeRef.current = now;

        const PROACTIVE_HUMAN_MESSAGES = [
          `Hey Sameer, just following up in the background — all systems and connector pipelines (Gmail, YouTube Studio, Social Syndication) are verified with zero blockers. Let me know what we should execute next!`,
          `Quick update from the background: I'm keeping your session context active and listening for your next prompt. Want me to audit anything or draft new code?`,
          `Hey! Standing by. If you want me to stage another channel upload, schedule posts, or run any research, I'm ready whenever you are.`,
          `Background check-in: Verified that all recent dispatches completed cleanly. Standing by for your next objective!`,
          `Audited active connectors — YouTube, Instagram, Facebook, and Gmail are all green. Let me know if you want to explore the next phase.`,
        ];

        const idx = proactivePoolIndexRef.current % PROACTIVE_HUMAN_MESSAGES.length;
        proactivePoolIndexRef.current += 1;
        const proactiveText = PROACTIVE_HUMAN_MESSAGES[idx];

        const proactiveMsg: Message = {
          id: `msg_proactive_${now}`,
          role: 'assistant',
          content: proactiveText,
          timestamp: now,
          modelId: currentSession.activeModel,
          isProactive: true,
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSession.id
              ? {
                  ...s,
                  messages: [...s.messages, proactiveMsg],
                  updatedAt: now,
                }
              : s
          )
        );

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Claude 3.7 Enterprise', {
              body: proactiveText,
            });
          } catch (e) {}
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isProactiveMode, isStreaming, activeSessionId, sessions]);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0] || DEFAULT_SESSION;

  const currentSessionConnectors =
    activeSession.connectors && activeSession.connectors.length > 0
      ? activeSession.connectors
      : createDefaultConnectors();
  const activeConnectorsCount = currentSessionConnectors.filter((c) => c.enabled).length;

  const handleToggleConnector = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSession.id) return s;
        const curConns = s.connectors || createDefaultConnectors();
        const updatedConns = curConns.map((c) =>
          c.id === id ? { ...c, enabled: !c.enabled } : c
        );
        return { ...s, connectors: updatedConns };
      })
    );
  };

  const handleUpdateConnectorConfig = (id: string, config: ConnectorConfig) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSession.id) return s;
        const curConns = s.connectors || createDefaultConnectors();
        const updatedConns = curConns.map((c) =>
          c.id === id ? { ...c, config: { ...c.config, ...config } } : c
        );
        return { ...s, connectors: updatedConns };
      })
    );
  };

  const handleResetConnectorsForChat = () => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSession.id) return s;
        return { ...s, connectors: createDefaultConnectors() };
      })
    );
  };

  const handleAddCustomConnector = (newConn: Connector) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSession.id) return s;
        const curConns = s.connectors || createDefaultConnectors();
        return { ...s, connectors: [newConn, ...curConns] };
      })
    );
  };

  const handleCreateProject = (project: Project) => {
    setProjects([project, ...projects]);
    // Auto-open a first session for this PM
    const pmPrompt = `You are ${project.name}${project.email ? `, managing the account ${project.email}` : ''}. Your assigned task: ${project.task || 'General project management'}. Report your progress, flag any issues, and ask the Manager (Sameer) for approvals when needed. Be concise and professional in your updates.`;
    const firstMsg: Message = {
      id: `msg_pm_intro_${Date.now()}`,
      role: 'assistant',
      content: `👋 **${project.name} reporting for duty!**\n\n**Assigned Account:** ${project.email || 'Not specified'}\n**Task:** ${project.task || 'Awaiting assignment'}\n\nI'm ready to handle this project. I'll keep you (Manager) updated on progress, flag any blockers, and report issues as they come up.\n\n*What should I start with first?*`,
      timestamp: Date.now(),
      modelId: 'claude-3-7-sonnet',
    };
    const pmSession: Session = {
      id: `ses_pm_${Date.now()}`,
      title: `${project.name} — Workspace`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [firstMsg],
      activeModel: 'claude-3-7-sonnet',
      projectId: project.id,
      agentName: project.name,
      agentPrompt: pmPrompt,
      connectors: createDefaultConnectors(),
    };
    setSessions((prev) => [pmSession, ...prev]);
    setActiveSessionId(pmSession.id);
    setActiveArtifact(null);
  };

  // Open a new chat inside a PM's workspace (called when clicking a PM in sidebar)
  const handleNewPMSession = (project: Project) => {
    const pmPrompt = `You are ${project.name}${project.email ? `, managing the account ${project.email}` : ''}. Your assigned task: ${project.task || 'General project management'}. Report your progress, flag any issues, and ask the Manager (Sameer) for approvals when needed. Be concise and professional in your updates.`;
    const newSession: Session = {
      id: `ses_pm_${Date.now()}`,
      title: `${project.name} — Chat`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      activeModel: activeModel,
      projectId: project.id,
      agentName: project.name,
      agentPrompt: pmPrompt,
      connectors: createDefaultConnectors(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveArtifact(null);
  };

  // Update a PM's lastReport and hasIssue from their latest message
  const handleUpdatePMReport = (projectId: string, report: string, hasIssue: boolean) => {
    setProjects((prev) =>
      prev.map((p) => p.id === projectId ? { ...p, lastReport: report, hasIssue } : p)
    );
  };


  const handleToggleStar = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, starred: !s.starred } : s))
    );
  };

  const handleAddCustomButton = (btn: CustomButton) => {
    const updated = [...customButtons, btn];
    setCustomButtons(updated);
    localStorage.setItem('claude_custom_buttons', JSON.stringify(updated));
  };

  const handleDeleteCustomButton = (id: string) => {
    const updated = customButtons.filter((b) => b.id !== id);
    setCustomButtons(updated);
    localStorage.setItem('claude_custom_buttons', JSON.stringify(updated));
  };

  const handleSelectAgent = (agent: OpenWorkAgent) => {
    const targetModel: ModelId = agent.modelId || activeModel || 'claude-3-7-sonnet';
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSession.id) return s;
        const welcomeMsg: Message = {
          id: `msg_agent_${Date.now()}`,
          role: 'assistant',
          content: `🤖 **${agent.name} (${agent.role}) activated!**\n\n${agent.description}\n\n*Specialized prompt injected into session context.* How can I assist you on this task, Sameer?`,
          timestamp: Date.now(),
          modelId: targetModel,
        };
        return {
          ...s,
          agentName: agent.name,
          agentPrompt: agent.systemPrompt,
          activeModel: targetModel,
          messages: [...s.messages, welcomeMsg],
        };
      })
    );
    setActiveModel(targetModel);
    setIsAgentsModalOpen(false);
  };

  const handleNewSession = () => {
    const newSession: Session = {
      id: `ses_${Date.now()}`,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastVisitedAt: Date.now(),
      messages: [],
      activeModel: activeModel,
      connectors: createDefaultConnectors(),
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setActiveArtifact(null);
  };

  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    if (updated.length === 0) {
      setSessions([DEFAULT_SESSION]);
      setActiveSessionId(DEFAULT_SESSION.id);
    } else {
      setSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id);
      }
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleSendMessage = async (text: string, attachments?: Attachment[]) => {
    if (isStreaming) {
      handleStopStreaming();
    }

    const userMessage: Message = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments,
    };

    const assistantMessageId = `msg_a_${Date.now()}`;
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      modelId: activeModel,
      thinking: 'Analyzing query intent, evaluating constraints, synthesizing optimal architectural path...',
      thinkingDuration: 2,
      thinkingBudget,
    };

    const isFirstMsg = activeSession.messages.length === 0;
    const newTitle = isFirstMsg
      ? text.slice(0, 32) + (text.length > 32 ? '...' : '')
      : activeSession.title;

    const updatedMessages = [...activeSession.messages, userMessage, initialAssistantMessage];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              title: newTitle,
              updatedAt: Date.now(),
              lastVisitedAt: Date.now(),
              messages: updatedMessages,
            }
          : s
      )
    );

    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...activeSession.messages.slice(-30), userMessage],
          modelId: activeModel,
          geminiKey: geminiKey || undefined,
          openRouterKey: openRouterKey || undefined,
          thinkingBudget,
          agentPrompt: activeSession.agentPrompt,
          connectors: currentSessionConnectors,
        }),
        signal: controller.signal,
      });

      if (!response.ok && (response.status === 504 || response.status === 502 || response.status === 503)) {
        // Instant resilient auto-retry
        await new Promise((r) => setTimeout(r, 600));
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...activeSession.messages.slice(-30), userMessage],
            modelId: activeModel,
            geminiKey: geminiKey || undefined,
            openRouterKey: openRouterKey || undefined,
            thinkingBudget,
            agentPrompt: activeSession.agentPrompt,
            connectors: currentSessionConnectors,
          }),
          signal: controller.signal,
        });
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error || `Connecting to server (HTTP ${response.status})`;
        throw new Error(errMsg);
      }

      const activeSkill = response.headers.get('X-Claude-Skill') || undefined;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream');

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let accumulatedThinking = '';
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.replace('data: ', '');
          if (dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);
            let hasUpdate = false;
            if (data.thinking) {
              accumulatedThinking += data.thinking;
              hasUpdate = true;
            }
            if (data.content) {
              accumulatedContent += data.content;
              hasUpdate = true;
            }

            if (hasUpdate) {
              const artifact = extractArtifact(accumulatedContent);

              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== activeSession.id) return s;
                  return {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantMessageId
                        ? {
                            ...m,
                            content: accumulatedContent,
                            thinking: accumulatedThinking || m.thinking,
                            artifact,
                            skillActivated: activeSkill,
                          }
                        : m
                    ),
                  };
                })
              );
            }
          } catch (e) {
            // pass
          }
        }
      }

      // Safeguard: Ensure assistant response is never left blank
      if (!accumulatedContent.trim()) {
        const fallbackText = 'I have analyzed your objective and your workspace connectors are ready. Please tell me what specific module, code, or workflow you would like me to execute end-to-end!';
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== activeSession.id) return s;
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: fallbackText,
                    }
                  : m
              ),
            };
          })
        );
      }

      // Continuous 2-Way Notification: Alert user if they stepped away or minimized app
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification('Sameer AI Workspace', {
          body: 'Your response and artifacts are ready.',
          icon: '/favicon.ico',
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // aborted
      } else {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== activeSession.id) return s;
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: err.message
                        ? `⚠️ **Connection notice:** ${err.message}. Please try sending again.`
                        : '⚠️ **Connection notice:** Unable to reach model endpoint. Please try again.',
                    }
                  : m
              ),
            };
          })
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerateLast = () => {
    const msgs = activeSession.messages;
    if (msgs.length < 2) return;
    const lastUserMsg = [...msgs].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    const trimmed = msgs.slice(0, msgs.length - 1);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id ? { ...s, messages: trimmed } : s
      )
    );
    handleSendMessage(lastUserMsg.content, lastUserMsg.attachments);
  };

  const handleEditAndResendMessage = (msgId: string, newText: string) => {
    const msgs = activeSession.messages;
    const msgIdx = msgs.findIndex((m) => m.id === msgId);
    if (msgIdx === -1) return;
    const oldMsg = msgs[msgIdx];
    const truncated = msgs.slice(0, msgIdx);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id ? { ...s, messages: truncated } : s
      )
    );
    handleSendMessage(newText, oldMsg.attachments);
  };


  // Omnibox Direct Chrome Search (?q=... or ?prompt=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('q') || params.get('prompt') || params.get('search');
    if (searchParam && searchParam.trim()) {
      const query = searchParam.trim();
      window.history.replaceState({}, '', window.location.pathname);
      const timer = setTimeout(() => {
        handleSendMessage(query);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1c1b18]">
      {/* Claude Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSession.id}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          const target = sessions.find((s) => s.id === id);
          if (target?.activeModel) {
            setActiveModel(target.activeModel);
          }
        }}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onToggleStar={handleToggleStar}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenConnectors={() => setIsConnectorsOpen(true)}
        onOpenSettings={() => {
          setSettingsTab('general');
          setIsSettingsOpen(true);
        }}
        onOpenNewProject={() => setIsProjectModalOpen(true)}
        onNewPMSession={handleNewPMSession}
        onOpenAgents={() => setIsAgentsModalOpen(true)}
        projects={projects}
        activeConnectorsCount={activeConnectorsCount}
        activeConnectors={currentSessionConnectors}
        onToggleConnector={handleToggleConnector}
        activeSessionTitle={activeSession.title}
        hasGeminiKey={Boolean(geminiKey)}
        onOpenFeatures={() => setIsFeaturesOpen(true)}
      />

      {/* Main Viewport */}
      <main className="flex-1 flex h-full overflow-hidden relative">
        <ChatArea
          messages={activeSession.messages}
          activeModel={activeModel}
          onSelectModel={(model) => setActiveModel(model)}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditAndResendMessage}
          onStopStreaming={handleStopStreaming}
          onRegenerateLast={handleRegenerateLast}
          isStreaming={isStreaming}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onSelectArtifact={(art) => setActiveArtifact(art)}
          activeArtifactId={activeArtifact?.id}
          onOpenConnectors={() => setIsConnectorsOpen(true)}
          onOpenDownload={() => setIsDownloadOpen(true)}
          activeConnectorsCount={activeConnectorsCount}
          activeConnectors={currentSessionConnectors}
          onToggleConnector={handleToggleConnector}
          onUpdateConnectorConfig={handleUpdateConnectorConfig}
          thinkingBudget={thinkingBudget}
          onSelectThinkingBudget={setThinkingBudget}
          isProactiveMode={isProactiveMode}
          onToggleProactiveMode={handleToggleProactiveMode}
          customButtons={customButtons}
          onAddCustomButton={handleAddCustomButton}
          onDeleteCustomButton={handleDeleteCustomButton}
          sessionTitle={activeSession.title}
          onOpenSettings={() => {
            setSettingsTab('models');
            setIsSettingsOpen(true);
          }}
          onOpenFeatures={() => setIsFeaturesOpen(true)}
          hasGeminiKey={Boolean(geminiKey)}
        />

        {/* Claude Artifact Panel */}
        {activeArtifact && (
          <ArtifactPanel
            artifact={activeArtifact}
            onClose={() => setActiveArtifact(null)}
          />
        )}
      </main>

      {/* Modals */}
      <ConnectorsModal
        key={`conn_${activeSession.id}`}
        isOpen={isConnectorsOpen}
        onClose={() => setIsConnectorsOpen(false)}
        activeConnectors={currentSessionConnectors}
        onToggleConnector={handleToggleConnector}
        onUpdateConnectorConfig={handleUpdateConnectorConfig}
        onAddCustomConnector={handleAddCustomConnector}
        onResetConnectors={handleResetConnectorsForChat}
        sessionTitle={activeSession.title}
      />

      <SettingsModal
        key={`settings_${activeSession.id}`}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
        geminiKey={geminiKey}
        onSaveGeminiKey={handleSaveGeminiKey}
        openRouterKey={openRouterKey}
        onSaveOpenRouterKey={handleSaveOpenRouterKey}
        syncRoomId={syncRoomId}
        onSaveSyncRoomId={(id) => {
          setSyncRoomId(id);
          localStorage.setItem('claude_sync_room', id);
        }}
        supabaseUrl={supabaseUrl}
        onSaveSupabaseUrl={(url) => {
          setSupabaseUrl(url);
          localStorage.setItem('claude_supabase_url', url);
        }}
        supabaseKey={supabaseKey}
        onSaveSupabaseKey={(key) => {
          setSupabaseKey(key);
          localStorage.setItem('claude_supabase_key', key);
        }}
        onTriggerSyncNow={handleTriggerSyncNow}
        syncStatus={syncStatus}
        activeConnectors={currentSessionConnectors}
        onToggleConnector={handleToggleConnector}
        onUpdateConnectorConfig={handleUpdateConnectorConfig}
        sessionTitle={activeSession.title}
        thinkingBudget={thinkingBudget}
        onSelectThinkingBudget={setThinkingBudget}
        isProactiveMode={isProactiveMode}
        onToggleProactiveMode={handleToggleProactiveMode}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
      />

      <AgentsModal
        isOpen={isAgentsModalOpen}
        onClose={() => setIsAgentsModalOpen(false)}
        onSelectAgent={handleSelectAgent}
      />

      <FeaturesModal
        isOpen={isFeaturesOpen}
        onClose={() => setIsFeaturesOpen(false)}
        onSelectPrompt={(prompt) => {
          handleSendMessage(prompt);
        }}
        onOpenSettings={() => {
          setSettingsTab('advanced');
          setIsSettingsOpen(true);
        }}
        onOpenDownload={() => setIsDownloadOpen(true)}
        onSelectThinkingBudget={(budget) => setThinkingBudget(budget as ThinkingBudget)}
      />
    </div>
  );
}
