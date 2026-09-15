'use client';

import React, { useState } from 'react';
import { X, FolderKanban, Plus, FileText, Check, Sparkles } from 'lucide-react';
import { Project } from '@/types/chat';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
}

export default function ProjectModal({ isOpen, onClose, onCreateProject }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProj: Project = {
      id: `proj_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      customInstructions: instructions.trim(),
      filesCount: 0,
      createdAt: Date.now(),
    };

    onCreateProject(newProj);
    setName('');
    setDescription('');
    setInstructions('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#23221e] border border-[#383630] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#33312a]">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#cc785c]/15 border border-[#cc785c]/30 flex items-center justify-center">
              <FolderKanban className="w-4 h-4 text-[#cc785c]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#ece9e2]">Create Claude Project</h3>
              <p className="text-xs text-[#9c978b]">Organize chats, custom instructions, and files in one workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2c2a25] text-[#9c978b] hover:text-[#ece9e2]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#ece9e2]">Project Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Website Redesign, Marketing Campaign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-xs text-[#ece9e2] placeholder-[#7d786e] focus:outline-none focus:border-[#cc785c]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#ece9e2]">Description (Optional)</label>
            <input
              type="text"
              placeholder="Brief summary of what this project is for"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-xs text-[#ece9e2] placeholder-[#7d786e] focus:outline-none focus:border-[#cc785c]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#ece9e2]">Custom Project Instructions</label>
            <textarea
              rows={4}
              placeholder="Tell Claude how to behave in this project (e.g. 'Use Next.js 15, Tailwind, and write clean production code with unit tests')."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-xs text-[#ece9e2] placeholder-[#7d786e] focus:outline-none focus:border-[#cc785c] resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[#33312a] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#9c978b] hover:text-[#ece9e2] hover:bg-[#2c2a25]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#cc785c] hover:bg-[#db8a6e] text-black shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
