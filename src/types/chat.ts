export type ModelId = 
  | 'claude-3-7-sonnet'   // Claude 3.7 Sonnet (Hybrid Reasoning + Code)
  | 'claude-3-5-sonnet'   // Claude 3.5 Sonnet (Standard Intelligent)
  | 'claude-3-5-haiku'    // Claude 3.5 Haiku (Ultra-Fast 0.8s)
  | 'claude-3-opus';      // Claude 3 Opus (Deep Writing & Creative)

export type ResponseStyle = 'normal' | 'concise' | 'explanatory' | 'technical';

export type ThinkingBudget = 1000 | 4000 | 16000 | 32000;

export interface ModelOption {
  id: ModelId;
  name: string;
  tag: string;
  description: string;
  speed: string;
  badge?: string;
  contextWindow: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  dataUrl?: string;     // Base64 data URL for images
  isImage?: boolean;    // Flag if attachment is an image
  contentSnippet?: string; // Text content for code or text documents
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  modelId?: ModelId;
  thinking?: string;
  thinkingDuration?: number;
  thinkingBudget?: ThinkingBudget;
  artifact?: Artifact;
  attachments?: Attachment[];
  isProactive?: boolean; // Sent autonomously by AI while user was away/offline
}

export interface Artifact {
  id: string;
  title: string;
  type: 'code' | 'html' | 'markdown' | 'text' | 'svg';
  language?: string;
  content: string;
  version?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  customInstructions: string;
  filesCount: number;
  createdAt: number;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  activeModel: ModelId;
  starred?: boolean;
  projectId?: string;
  lastVisitedAt?: number;
}
