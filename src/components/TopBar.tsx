import React from 'react';
import { Zap, Sparkles, BookOpen, BarChart2, Atom, Layers, HelpCircle, Home } from 'lucide-react';

interface TopBarProps {
  activeTab: 'sandbox' | 'labs' | 'graphs' | 'quiz' | 'chemistry';
  setActiveTab: (tab: 'sandbox' | 'labs' | 'graphs' | 'quiz' | 'chemistry') => void;
  onOpenAITutor: () => void;
  onOpenChemistry: () => void;
  onOpenStartup?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAITutor,
  onOpenChemistry,
  onOpenStartup,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 px-4 lg:px-5 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-100 shrink-0 select-none">
      {/* Zone 1: Single element wordmark + Home */}
      <div className="flex items-center gap-2.5 shrink-0">
        {onOpenStartup && (
          <button
            onClick={onOpenStartup}
            className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-colors"
            title="Back to Startup Module Selector"
          >
            <Home className="w-4 h-4" />
          </button>
        )}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('sandbox');
          }}
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-cyan-400 whitespace-nowrap shrink-0 hover:text-cyan-300 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Zap className="w-4 h-4 fill-cyan-400/20 text-cyan-400" />
          </div>
          <span>Electrostatics Studio</span>
        </a>
      </div>

      {/* Zone 2: 4-5 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'sandbox'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Simulation Lab</span>
        </button>

        <button
          onClick={() => setActiveTab('labs')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'labs'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Guided Labs</span>
        </button>

        <button
          onClick={() => setActiveTab('graphs')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'graphs'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Field Graphs</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'quiz'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Physics Quiz</span>
        </button>

        <button
          onClick={onOpenChemistry}
          className="flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-medium rounded-lg text-slate-300 hover:text-amber-300 hover:bg-slate-800/50 transition-all whitespace-nowrap shrink-0"
        >
          <Atom className="w-4 h-4 text-amber-400" />
          <span>Triboelectric Series</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenAITutor}
          className="flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 transition-all shadow-md shadow-cyan-950/50 active:scale-95 whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>Ask AI Tutor</span>
        </button>
      </div>
    </header>
  );
};
