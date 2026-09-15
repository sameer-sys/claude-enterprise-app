'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Code,
  Play,
  FileText,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  History,
  ExternalLink,
} from 'lucide-react';
import { Artifact } from '@/types/chat';

interface ArtifactPanelProps {
  artifact: Artifact | null;
  onClose: () => void;
}

export default function ArtifactPanel({ artifact, onClose }: ArtifactPanelProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!artifact) return null;

  const isPreviewable =
    artifact.type === 'html' ||
    artifact.language === 'html' ||
    artifact.language === 'svg' ||
    artifact.content.includes('<html') ||
    artifact.content.includes('<!DOCTYPE') ||
    artifact.content.includes('<svg') ||
    artifact.content.includes('<div');

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext =
      artifact.language === 'html' || artifact.type === 'html'
        ? 'html'
        : artifact.language === 'python'
        ? 'py'
        : artifact.language === 'typescript' || artifact.language === 'tsx'
        ? 'tsx'
        : artifact.language === 'javascript'
        ? 'js'
        : 'txt';
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    handleCopy();
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-[#161512] border-l border-[#2e2c25] flex flex-col z-30 transition-all duration-200 ${
        isFullscreen ? 'w-full inset-0 z-50' : 'w-full md:w-[600px] lg:w-[680px]'
      }`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2822] bg-[#1d1c18]">
        <div className="flex items-center space-x-2 truncate">
          <div className="w-6 h-6 rounded-md bg-[#cc785c]/15 border border-[#cc785c]/30 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 text-[#cc785c]" />
          </div>
          <span className="font-semibold text-sm text-[#f2eee6] truncate">{artifact.title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2821] text-[#baa898] font-mono border border-[#38352d]">
            v1.0 • {artifact.language || artifact.type}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5">
          {isPreviewable && (
            <div className="flex bg-[#26241e] p-0.5 rounded-lg border border-[#36342c] mr-1">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center space-x-1 ${
                  activeTab === 'preview'
                    ? 'bg-[#1a1915] text-[#cc785c] shadow-sm font-semibold'
                    : 'text-[#9c978b] hover:text-[#ece9e2]'
                }`}
              >
                <Play className="w-3 h-3" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center space-x-1 ${
                  activeTab === 'code'
                    ? 'bg-[#1a1915] text-[#ece9e2] shadow-sm font-semibold'
                    : 'text-[#9c978b] hover:text-[#ece9e2]'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>Code</span>
              </button>
            </div>
          )}

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-[#282620] text-[#9c978b] hover:text-[#ece9e2] transition-colors"
            title="Download file"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg hover:bg-[#282620] text-[#9c978b] hover:text-[#ece9e2] transition-colors"
            title="Copy code to clipboard"
          >
            {shared ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-[#282620] text-[#9c978b] hover:text-[#ece9e2] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#282620] text-[#9c978b] hover:text-[#ece9e2] transition-colors"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-auto bg-[#141310] p-4">
        {activeTab === 'preview' && isPreviewable ? (
          <div className="w-full h-full min-h-[500px] bg-white rounded-xl overflow-hidden shadow-2xl border border-zinc-700">
            <iframe
              srcDoc={artifact.content}
              title={artifact.title}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-modals"
            />
          </div>
        ) : (
          <div className="relative rounded-xl bg-[#191814] border border-[#2e2c24] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#201e19] border-b border-[#2c2a23] text-xs text-[#8a8579] font-mono">
              <span>{artifact.language || 'code'}</span>
              <button onClick={handleCopy} className="hover:text-[#ece9e2] flex items-center gap-1">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="font-mono text-xs md:text-sm text-[#dcd8ce] leading-relaxed overflow-x-auto p-4">
              <code>{artifact.content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
