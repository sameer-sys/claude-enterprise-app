'use client';

import React, { useState } from 'react';
import { X, FolderKanban, Plus } from 'lucide-react';
import { Project } from '@/types/chat';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
}

export default function ProjectModal({ isOpen, onClose, onCreateProject }: ProjectModalProps) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateProject({
      id: `proj_${Date.now()}`,
      name: name.trim(),
      description: '',
      customInstructions: '',
      filesCount: 0,
      createdAt: Date.now(),
    });
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#23221e] border border-[#383630] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#33312a]">
          <div className="flex items-center space-x-2">
            <FolderKanban className="w-4 h-4 text-[#cc785c]" />
            <h3 className="text-sm font-semibold text-[#ece9e2]">New Project</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#2c2a25] text-[#9c978b] hover:text-[#ece9e2]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <input
            type="text"
            required
            autoFocus
            placeholder="Project name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            className="w-full px-3 py-2.5 rounded-xl bg-[#1a1916] border border-[#36342e] text-sm text-[#ece9e2] placeholder-[#7d786e] focus:outline-none focus:border-[#cc785c]"
          />
          <div className="flex items-center justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs text-[#9c978b] hover:text-[#ece9e2]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${name.trim() ? 'bg-[#cc785c] hover:bg-[#db8a6e] text-black shadow-md' : 'bg-[#2b2923] text-[#6d685e] cursor-not-allowed'}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
