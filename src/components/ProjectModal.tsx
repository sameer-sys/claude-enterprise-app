'use client';

import React, { useState } from 'react';
import { X, FolderKanban, Plus, Mail, Briefcase } from 'lucide-react';
import { Project } from '@/types/chat';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
}

export default function ProjectModal({ isOpen, onClose, onCreateProject }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [task, setTask] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateProject({
      id: `proj_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      task: task.trim(),
      description: '',
      customInstructions: '',
      filesCount: 0,
      createdAt: Date.now(),
      isActive: true,
      hasIssue: false,
    });
    setName(''); setEmail(''); setTask('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#23221e] border border-[#383630] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#33312a]">
          <div className="flex items-center space-x-2">
            <FolderKanban className="w-4 h-4 text-[#cc785c]" />
            <h3 className="text-sm font-semibold text-[#ece9e2]">Add Project Manager</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#2c2a25] text-[#9c978b] hover:text-[#ece9e2]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-[#8a8579] block mb-1">PM Name</label>
            <input type="text" required autoFocus placeholder="e.g. PM1, PM2 — YouTube Manager"
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-sm text-[#ece9e2] placeholder-[#7d786e] focus:outline-none focus:border-[#cc785c]" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#8a8579] block mb-1">Assigned Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a8579]" />
              <input type="email" placeholder="e.g. client@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-sm text-[#ece9e2] placeholder-[#7d786e] focus:outline-none focus:border-[#cc785c]" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#8a8579] block mb-1">Assigned Task / Project</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8a8579]" />
              <textarea rows={2} placeholder="e.g. Handle YouTube platform uploads, upgrade channels, post content for project workspace"
                value={task} onChange={(e) => setTask(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1a1916] border border-[#36342e] text-sm text-[#ece9e2] placeholder-[#7d786e] focus:outline-none focus:border-[#cc785c] resize-none" />
            </div>
          </div>
          <div className="flex items-center justify-end space-x-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs text-[#9c978b] hover:text-[#ece9e2]">Cancel</button>
            <button type="submit" disabled={!name.trim()}
              className={"px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all " + (name.trim() ? 'bg-[#cc785c] hover:bg-[#db8a6e] text-black shadow-md' : 'bg-[#2b2923] text-[#6d685e] cursor-not-allowed')}>
              <Plus className="w-3.5 h-3.5" />
              <span>Add PM</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
