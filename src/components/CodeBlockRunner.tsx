'use client';

import React, { useState } from 'react';
import { Play, Terminal, Copy, Check, Loader2, XCircle, CheckCircle2 } from 'lucide-react';

interface CodeBlockRunnerProps {
  code: string;
  language: string;
  className?: string;
  children?: React.ReactNode;
}

export default function CodeBlockRunner({ code, language, className, children }: CodeBlockRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTimeMs: number;
    error?: string;
  } | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setShowTerminal(true);
    setOutput(null);

    try {
      const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (electronAPI?.executeCode) {
        const nativeResult = await electronAPI.executeCode(code, language || 'python');
        setOutput(nativeResult);
        return;
      }

      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: language || 'python',
        }),
      });

      const data = await res.json();
      setOutput(
        res.ok
          ? data
          : {
              stdout: data?.stdout || '',
              stderr: data?.error || data?.stderr || 'Code execution is not available from this web session. Use the desktop app for host execution.',
              exitCode: data?.exitCode ?? res.status,
              executionTimeMs: data?.executionTimeMs || 0,
              error: data?.error,
            }
      );
    } catch (err: any) {
      setOutput({
        stdout: '',
        stderr: err.message || 'Execution failed to start',
        exitCode: 1,
        executionTimeMs: 0,
        error: err.message,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const isExecutable = ['python', 'py', 'javascript', 'js', 'node', 'typescript', 'ts', 'bash', 'sh', 'powershell', 'ps1', 'cmd'].includes(
    (language || '').toLowerCase()
  );

  return (
    <div className="my-3 rounded-xl bg-[#151411] border border-[#2d2b24] overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#1d1c18] border-b border-[#282620] text-xs text-[#9c978b]">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="font-mono text-[11px] font-semibold text-[#cc785c] uppercase ml-1.5">
            {language || 'code'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isExecutable && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#292720] hover:bg-[#38352b] border border-[#3e3b30] text-[#f4efe6] text-[11px] font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Run code with Open Interpreter engine"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3 h-3 text-[#cc785c] animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                  <span className="text-emerald-300 font-semibold">Run</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-[#ece9e2] transition-colors font-sans text-[11px] px-2 py-1 rounded hover:bg-[#282620]"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Area */}
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-[#e6e2d8] leading-relaxed">
        <code className={className}>{children || code}</code>
      </pre>

      {/* Terminal Drawer (Open Interpreter output) */}
      {showTerminal && (
        <div className="border-t border-[#2d2b24] bg-[#0c0b0a] font-mono text-xs animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#12110e] border-b border-[#23211a] text-[11px]">
            <div className="flex items-center space-x-2">
              <Terminal className="w-3.5 h-3.5 text-[#cc785c]" />
              <span className="font-semibold text-[#d4cfc3]">Open Interpreter · Terminal</span>
              {output && (
                <span
                  className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] ${
                    output.exitCode === 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {output.exitCode === 0 ? (
                    <>
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Exit 0 ({output.executionTimeMs}ms)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-2.5 h-2.5" />
                      <span>Exit {output.exitCode}</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowTerminal(false)}
              className="text-[#7d786e] hover:text-[#ece9e2] text-[10px]"
            >
              Hide Terminal
            </button>
          </div>

          <div className="p-3 max-h-48 overflow-y-auto leading-relaxed select-text space-y-1">
            {isRunning && (
              <div className="flex items-center space-x-2 text-[#cc785c]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="animate-pulse">Executing code in host environment...</span>
              </div>
            )}

            {output?.stdout && (
              <div className="text-emerald-300 whitespace-pre-wrap font-mono">
                {output.stdout}
              </div>
            )}

            {output?.stderr && (
              <div className="text-rose-400 whitespace-pre-wrap font-mono">
                {output.stderr}
              </div>
            )}

            {output && !output.stdout && !output.stderr && (
              <div className="text-[#8a8579] italic font-mono">
                (Process finished with no console output)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
