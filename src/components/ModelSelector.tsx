'use client';

import React, { useState } from 'react';
import { Sparkles, Brain, Zap, BookOpen, ChevronDown, Check, Crown } from 'lucide-react';
import { ModelId, ModelOption, ThinkingBudget } from '@/types/chat';

export const PRO_CLAUDE_MODELS: ModelOption[] = [
  {
    id: 'boss',
    name: 'Boss',
    tag: 'OmniRoute Cloud Engine',
    description: 'Autonomous AI engine with real tool execution, zero rate limits, and sub-second intelligence.',
    speed: '50ms Ultra-Fast',
    badge: 'Boss ⚡',
    contextWindow: '1M tokens',
  },
];

interface ModelSelectorProps {
  selectedModel: ModelId;
  onSelectModel: (model: ModelId) => void;
  thinkingBudget: ThinkingBudget;
  onSelectThinkingBudget: (budget: ThinkingBudget) => void;
  isThinkingEnabled: boolean;
}

export default function ModelSelector({
  selectedModel,
  onSelectModel,
  thinkingBudget,
  onSelectThinkingBudget,
  isThinkingEnabled,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const active = PRO_CLAUDE_MODELS.find((m) => m.id === selectedModel) || PRO_CLAUDE_MODELS[0];

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#252420] hover:bg-[#2e2c26] border border-[#383630] transition-all text-xs md:text-sm font-medium text-[#ece9e2] shadow-sm"
      >
        <span className="w-2 h-2 rounded-full bg-[#cc785c] animate-pulse" />
        <span className="font-semibold text-[#f2eee6]">{active.name}</span>
        {isThinkingEnabled && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#cc785c]/20 text-[#cc785c] font-mono border border-[#cc785c]/40 flex items-center gap-1">
            <Brain className="w-3 h-3" />
            <span>{(thinkingBudget / 1000).toFixed(0)}k thinking</span>
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-[#9c978b]" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-88 md:w-96 rounded-2xl bg-[#23221e] border border-[#383630] shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold text-[#9c978b] uppercase tracking-wider border-b border-[#2d2b25]">
              <span className="flex items-center gap-1 text-[#cc785c]">
                <Crown className="w-3.5 h-3.5" />
                <span>Boss Autonomous AI Engine</span>
              </span>
              <span className="text-[10px] text-[#baa898] font-mono">OmniRoute Priority</span>
            </div>

            {PRO_CLAUDE_MODELS.map((model) => {
              const isSelected = model.id === selectedModel;
              return (
                <div
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                  }}
                  className={`w-full p-3 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#cc785c]/15 border border-[#cc785c]/40 text-[#ece9e2]'
                      : 'hover:bg-[#2b2924] text-[#dcd8ce] border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#cc785c]" />
                      <span className="text-sm font-semibold text-[#f2eee6]">{model.name}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#33312a] text-[#baa898] font-mono">
                        {model.contextWindow}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#cc785c]" />}
                    </div>
                  </div>
                  <p className="text-xs text-[#9c978b] mt-1 leading-relaxed pl-6">{model.description}</p>

                  {/* Thinking Budget Slider for Boss */}
                  {isSelected && isThinkingEnabled && (
                    <div className="mt-3 pt-2.5 border-t border-[#36342c] pl-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between text-[11px] text-[#dcd8ce] mb-1.5">
                        <span className="font-semibold text-[#cc785c] flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          <span>Thinking Token Budget</span>
                        </span>
                        <span className="font-mono text-[#baa898]">{thinkingBudget.toLocaleString()} tokens</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {([1000, 4000, 16000, 32000] as ThinkingBudget[]).map((budget) => (
                          <button
                            key={budget}
                            type="button"
                            onClick={() => onSelectThinkingBudget(budget)}
                            className={`py-1 rounded text-[10px] font-mono transition-all ${
                              thinkingBudget === budget
                                ? 'bg-[#cc785c] text-black font-bold shadow-sm'
                                : 'bg-[#2e2c25] hover:bg-[#38352d] text-[#baa898]'
                            }`}
                          >
                            {(budget / 1000).toFixed(0)}k
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Close / Done Action */}
            <div className="pt-2 px-1 border-t border-[#2d2b25] flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1 rounded-lg bg-[#cc785c] hover:bg-[#db8a6e] text-black font-semibold text-xs shadow-sm transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
