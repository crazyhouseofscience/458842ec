import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import { ElectroObject, ProbeData } from '../types/electrostatics';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  objects: ElectroObject[];
  probeData: ProbeData;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  objects,
  probeData,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAskAI = async (customQuestion?: string) => {
    const queryPrompt = customQuestion || prompt;
    if (!queryPrompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const labStateSummary = {
        objectCount: objects.length,
        objects: objects.map((o) => ({
          name: o.name,
          material: o.materialId,
          chargeNc: o.charge,
          isGrounded: o.isGrounded,
          position: { x: Math.round(o.x), y: Math.round(o.y) },
        })),
        probeDataAtTip: {
          voltageV: probeData.voltageV,
          fieldMagnitudeNC: probeData.fieldMagnitude,
          fieldEx: probeData.fieldEx,
          fieldEy: probeData.fieldEy,
        },
      };

      const res = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: queryPrompt, labState: labStateSummary }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to communicate with AI Tutor server.');
      }

      setResponse(data.explanation || 'No response received.');
    } catch (err: any) {
      setError(err.message || 'An error occurred while contacting the AI Physics Tutor.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Why does rubbing glass with silk make the rod positively charged?',
    'Why does a negatively charged balloon stick to a neutral dielectric wall?',
    'Explain how Coulomb inverse-square law applies to my current stage setup.',
    'Analyze my current objects and calculate the net force vector on the selected body.',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-cyan-950">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Gemini AI Physics & Chemistry Tutor
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                  gemini-3.8-flash
                </span>
              </h2>
              <p className="text-xs text-slate-400">Ask any conceptual, numerical, or lab scenario question</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scroll Container */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Quick Questions Chips */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Suggested Physics Questions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(qp);
                    handleAskAI(qp);
                  }}
                  className="p-3 bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/50 rounded-xl text-left text-slate-300 transition-all text-xs font-medium"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* AI Response Display Area */}
          {isLoading ? (
            <div className="p-8 bg-slate-950/80 border border-cyan-500/30 rounded-xl flex flex-col items-center justify-center gap-3 text-cyan-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-mono text-xs">Analyzing simulation physics & generating explanation...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          ) : response ? (
            <div className="p-5 bg-slate-950 border border-cyan-500/40 rounded-xl space-y-3 shadow-lg">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-200 text-xs">AI Physics Tutor Explanation</span>
              </div>
              <div className="prose prose-invert prose-xs max-w-none text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                {response}
              </div>
            </div>
          ) : null}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
            placeholder="Ask AI Tutor about triboelectricity, Coulomb force, or your current simulation..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
          />
          <button
            onClick={() => handleAskAI()}
            disabled={isLoading || !prompt.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-sky-300 text-slate-950 font-bold text-xs rounded-xl hover:from-cyan-300 hover:to-sky-200 transition-all shadow-md shadow-cyan-950/50 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>Ask</span>
          </button>
        </div>
      </div>
    </div>
  );
};
