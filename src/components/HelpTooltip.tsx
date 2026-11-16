import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  content: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ title, content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="p-1 text-slate-500 hover:text-cyan-400 transition-colors cursor-help"
        aria-label={title}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 text-left text-xs pointer-events-none">
          <span className="font-bold text-cyan-400 block mb-1">{title}</span>
          <p className="text-slate-300 text-[11px] leading-relaxed">{content}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};
