import React, { useState } from 'react';
import { ModuleMode } from '../types/electrostatics';
import {
  Zap,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ArrowRight,
  Atom,
  Layers,
  Crosshair,
  ShieldCheck,
  BookOpen,
  BarChart2,
  HelpCircle,
  Gauge,
} from 'lucide-react';

interface StartupScreenProps {
  isUnlocked: boolean;
  onUnlockSuccess: () => void;
  onLock: () => void;
  onSelectModule: (mode: ModuleMode) => void;
  onOpenToolTab?: (tab: 'labs' | 'graphs' | 'quiz' | 'chemistry') => void;
}

const ACCESS_PASSCODE = 'PAHS2026';

export const StartupScreen: React.FC<StartupScreenProps> = ({
  isUnlocked,
  onUnlockSuccess,
  onLock,
  onSelectModule,
  onOpenToolTab,
}) => {
  const [passcodeInput, setPasscodeInput] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.trim() === ACCESS_PASSCODE) {
      setErrorMsg(null);
      setPasscodeInput('');
      onUnlockSuccess();
    } else {
      setErrorMsg('Incorrect passcode. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-y-auto overflow-x-hidden font-sans select-none">
      {/* Subtle scientific field grid backdrop */}
      <div
        className="pointer-events-none fixed inset-0 opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(30, 41, 59, 0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 41, 59, 0.55) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 25% 20%, rgba(14, 165, 233, 0.10), transparent 45%), radial-gradient(circle at 78% 75%, rgba(236, 72, 153, 0.08), transparent 45%)',
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-5 pt-4 pb-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm">
            <Zap className="w-5 h-5 fill-cyan-400/20 text-cyan-400" />
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight text-slate-100 leading-none">
              Electrostatics Studio
            </div>
            <div className="text-xs font-mono text-slate-400 mt-0.5">
              Physics &amp; Chemistry Interactive Lab · v1.0
            </div>
          </div>
        </div>

        {isUnlocked && (
          <button
            onClick={onLock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-colors"
            title="Lock studio access"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Lock Screen</span>
          </button>
        )}
      </header>

      {/* Main Content: Either Passcode Gate OR Module Selection */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-5 py-4 flex-1 flex items-center justify-center">
        {!isUnlocked ? (
          <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-400/50 flex items-center justify-center text-orange-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 leading-tight">
                  Classroom Access Passcode
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter your lab passcode to open the simulation modules.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasscodeSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="studio-passcode"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Passcode
                </label>
                <div className="relative">
                  <input
                    id="studio-passcode"
                    type={showPasscode ? 'text' : 'password'}
                    value={passcodeInput}
                    onChange={(e) => {
                      setPasscodeInput(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Enter passcode"
                    autoFocus
                    autoComplete="off"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl px-3.5 py-2.5 pr-10 text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="px-3 py-2 rounded-lg bg-rose-950/60 border border-rose-500/50 text-xs font-medium text-rose-200"
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-bold text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock Electrostatics Studio</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="w-full space-y-5">
            <div className="text-center max-w-2xl mx-auto space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
                Choose a Simulation Module
              </h1>
              <p className="text-sm text-slate-300">
                Explore triboelectric friction, electrostatic induction, multi-object systems, or pure Coulomb point charges.
              </p>
            </div>

            {/* 4 Primary Module Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Module 1 */}
              <button
                onClick={() => onSelectModule('module1')}
                className="group text-left bg-slate-900/95 hover:bg-slate-900 border border-slate-800 hover:border-orange-400/80 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all shadow-xl hover:shadow-orange-950/25 active:scale-[0.995]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-400/40 flex items-center justify-center text-orange-400">
                      <Atom className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-400">
                      Module 01
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-100 group-hover:text-orange-300 transition-colors">
                      Two-Object Friction &amp; Induction
                    </h2>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      Pick two classroom materials (Glass, Fur, Scotch Tape, Styrofoam, Copper), rub to transfer electrons, and observe attraction, repulsion, and induced charge.
                    </p>
                  </div>

                  <ul className="space-y-1 text-xs font-mono text-slate-400 pt-1">
                    <li>• Guided Object 1 &amp; Object 2 bench</li>
                    <li>• Triboelectric electron migration</li>
                    <li>• Live +/- nC charge magnitudes</li>
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-bold text-orange-300">
                  <span>Launch Two-Object Lab</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Module 2 */}
              <button
                onClick={() => onSelectModule('module2')}
                className="group text-left bg-slate-900/95 hover:bg-slate-900 border border-slate-800 hover:border-cyan-400/80 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all shadow-xl hover:shadow-cyan-950/25 active:scale-[0.995]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                      Module 02
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      Multi-Object &amp; Advanced Data
                    </h2>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      Build multi-body experiments, test grounding and conduction, run Air Scrubber &amp; Laser Toner apps, and measure V &amp; |E| with the live probe.
                    </p>
                  </div>

                  <ul className="space-y-1 text-xs font-mono text-slate-400 pt-1">
                    <li>• Unlimited specimens &amp; Ground Plate</li>
                    <li>• Voltage V &amp; |E| Probe Telemetry</li>
                    <li>• Humidity leak, Breakdown &amp; Damping</li>
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-bold text-cyan-300">
                  <span>Launch Multi-Object Lab</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Module 3: Point Charges */}
              <button
                onClick={() => onSelectModule('module3')}
                className="group text-left bg-slate-900/95 hover:bg-slate-900 border border-slate-800 hover:border-pink-400/80 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all shadow-xl hover:shadow-pink-950/25 active:scale-[0.995]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-400/40 flex items-center justify-center text-pink-400">
                      <Crosshair className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-pink-400">
                      Module 03
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-100 group-hover:text-pink-300 transition-colors">
                      Point Charges &amp; Field Vectors
                    </h2>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      Pure Coulomb point-charge sandbox. Place +Q, −Q, and test charges, dial exact charge values, and visualize force arrows, field lines, and motion.
                    </p>
                  </div>

                  <ul className="space-y-1 text-xs font-mono text-slate-400 pt-1">
                    <li>• Manipulate Q (−30 to +30 nC)</li>
                    <li>• Coulomb Force Arrows &amp; Field Lines</li>
                    <li>• Dipole, Quadrupole &amp; Repel Setups</li>
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-bold text-pink-300">
                  <span>Launch Point Charges</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Module 4: Gold-Leaf Electroscope */}
              <button
                onClick={() => onSelectModule('module4')}
                className="group text-left bg-slate-900/95 hover:bg-slate-900 border border-slate-800 hover:border-amber-400/80 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all shadow-xl hover:shadow-amber-950/25 active:scale-[0.995]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400">
                      <Gauge className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                      Module 04
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                      Gold-Leaf Electroscope
                    </h2>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      Rub classroom objects and test induction, conduction, and permanent 0 V grounding on a realistic glass-jar gold-leaf electroscope.
                    </p>
                  </div>

                  <ul className="space-y-1 text-xs font-mono text-slate-400 pt-1">
                    <li>• Gold, Aluminum, Copper &amp; Gum Wrapper foils</li>
                    <li>• Induction &amp; knob conduction</li>
                    <li>• Multiple rubbable lab materials</li>
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-bold text-amber-300">
                  <span>Launch Electroscope</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            {/* Optional Quick Reference Links */}
            {onOpenToolTab && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => onOpenToolTab('labs')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 text-xs font-medium text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Guided Labs</span>
                </button>
                <button
                  onClick={() => onOpenToolTab('graphs')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 text-xs font-medium text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Field Graphs</span>
                </button>
                <button
                  onClick={() => onOpenToolTab('quiz')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 text-xs font-medium text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Physics Quiz</span>
                </button>
                <button
                  onClick={() => onOpenToolTab('chemistry')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 text-xs font-medium text-slate-300 hover:text-amber-300 transition-colors"
                >
                  <Atom className="w-3.5 h-3.5 text-amber-400" />
                  <span>Triboelectric Series</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Clean Unboxed Attribution Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-5 py-3 text-center text-xs font-mono text-slate-400">
        Designed by Keith Chapman · 2026 · v1.0 using Google AI Studio
      </footer>
    </div>
  );
};
