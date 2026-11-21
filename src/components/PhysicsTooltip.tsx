import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PHYSICS_GLOSSARY, PhysicsTooltipEntry } from '../utils/physicsGlossary';

interface PhysicsTooltipProps {
  termKey?: keyof typeof PHYSICS_GLOSSARY;
  entry?: PhysicsTooltipEntry;
  children: React.ReactNode;
  placement?: 'auto' | 'top' | 'bottom' | 'left' | 'right';
  as?: 'div' | 'span';
  className?: string;
  underlineTerm?: boolean;
  delayMs?: number;
}

export const PhysicsTooltip: React.FC<PhysicsTooltipProps> = ({
  termKey,
  entry,
  children,
  placement = 'auto',
  as = 'div',
  className = '',
  underlineTerm = false,
  delayMs = 180,
}) => {
  const resolved = entry ?? (termKey ? PHYSICS_GLOSSARY[termKey] : undefined);
  const triggerRef = useRef<HTMLDivElement | HTMLSpanElement>(null);
  const timerRef = useRef<number | null>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; side: 'top' | 'bottom' | 'left' | 'right' }>({
    top: 0,
    left: 0,
    side: 'top',
  });

  const computePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipMaxW = 280;
    const tooltipEstH = 128;
    const gap = 10;

    let chosen: 'top' | 'bottom' | 'left' | 'right';
    if (placement !== 'auto') {
      chosen = placement;
    } else {
      // Smart auto-placement: favor pushing inward toward center stage rather than off-screen
      const spaceLeft = rect.left;
      const spaceRight = vw - rect.right;
      const spaceTop = rect.top;
      const spaceBottom = vh - rect.bottom;

      if (rect.left < 310 && spaceRight >= tooltipMaxW + gap + 12) {
        chosen = 'right';
      } else if (vw - rect.right < 320 && spaceLeft >= tooltipMaxW + gap + 12) {
        chosen = 'left';
      } else if (spaceBottom >= tooltipEstH + gap + 12) {
        chosen = 'bottom';
      } else if (spaceTop >= tooltipEstH + gap + 12) {
        chosen = 'top';
      } else {
        chosen = spaceRight >= spaceLeft ? 'right' : 'left';
      }
    }

    let top = 0;
    let left = 0;

    if (chosen === 'right') {
      left = Math.min(vw - tooltipMaxW - 10, rect.right + gap);
      top = Math.max(10, Math.min(vh - tooltipEstH - 10, rect.top + rect.height / 2 - 42));
    } else if (chosen === 'left') {
      left = Math.max(10, rect.left - tooltipMaxW - gap);
      top = Math.max(10, Math.min(vh - tooltipEstH - 10, rect.top + rect.height / 2 - 42));
    } else if (chosen === 'bottom') {
      left = Math.max(10, Math.min(vw - tooltipMaxW - 10, rect.left + rect.width / 2 - tooltipMaxW / 2));
      top = Math.min(vh - tooltipEstH - 10, rect.bottom + gap);
    } else {
      left = Math.max(10, Math.min(vw - tooltipMaxW - 10, rect.left + rect.width / 2 - tooltipMaxW / 2));
      top = Math.max(10, rect.top - tooltipEstH - gap);
    }

    setCoords({ top, left, side: chosen });
  }, [placement]);

  const showWithDelay = () => {
    if (!resolved) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      computePosition();
      setIsVisible(true);
    }, delayMs);
  };

  const hideImmediately = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!resolved) {
    return <>{children}</>;
  }

  const Tag = as;
  const termClasses = underlineTerm
    ? 'border-b border-dotted border-cyan-400/60 hover:border-cyan-300 cursor-help transition-colors'
    : '';

  return (
    <>
      <Tag
        ref={triggerRef as React.RefObject<never>}
        onMouseEnter={showWithDelay}
        onMouseLeave={hideImmediately}
        onFocus={showWithDelay}
        onBlur={hideImmediately}
        onPointerDown={hideImmediately}
        className={`${as === 'span' ? 'inline-flex items-center' : 'block'} ${termClasses} ${className}`}
      >
        {children}
      </Tag>

      {isVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-[9999] w-[280px] max-w-[calc(100vw-20px)] pointer-events-none select-none rounded-xl bg-slate-900/98 backdrop-blur-md border border-cyan-400/50 shadow-[0_12px_36px_rgba(2,6,23,0.85)] p-3 text-left transition-opacity duration-150"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-cyan-300 leading-tight">
                {resolved.title}
              </span>
              {resolved.badge && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/40 text-[10px] font-mono font-semibold text-cyan-200 whitespace-nowrap shrink-0">
                  {resolved.badge}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              {resolved.definition}
            </p>

            {resolved.formula && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[11px] font-mono text-amber-300 leading-snug">
                {resolved.formula}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
