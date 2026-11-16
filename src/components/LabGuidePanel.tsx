import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ElectroObject, ProbeSensor, ProbeData, VisualOverlayConfig } from '../types/electrostatics';
import { BookOpen, CheckCircle2, ChevronRight, HelpCircle, RefreshCw, Award, Sparkles } from 'lucide-react';

interface LabGuidePanelProps {
  objects: ElectroObject[];
  sensor: ProbeSensor;
  probeData: ProbeData;
  setObjects: React.Dispatch<React.SetStateAction<ElectroObject[]>>;
  setOverlayConfig: React.Dispatch<React.SetStateAction<VisualOverlayConfig>>;
}

export const LAB_MODULES = [
  {
    id: 'lab-1',
    title: 'Lab 1: Triboelectric Friction & Charge Transfer',
    subtitle: 'Observe electron donor/acceptor dynamics via mechanical rubbing',
    category: 'Triboelectricity',
    description:
      'In this experiment, you will rub different materials together to witness valence electron transfer based on material work functions.',
    steps: [
      {
        id: 's1',
        title: 'Step 1: Charge Glass Rod with Silk',
        instruction: 'Drag the Silk Cloth repeatedly over the Glass Rod to transfer electrons via friction until Glass has > +5 nC charge.',
        hint: 'Rub with rapid dragging back and forth across the Glass Rod.',
        check: (objs: ElectroObject[]) => {
          const glass = objs.find((o) => o.materialId === 'glass');
          return glass ? glass.charge >= 4.0 : false;
        },
      },
      {
        id: 's2',
        title: 'Step 2: Charge Teflon Balloon with Fur',
        instruction: 'Rub the Teflon Balloon with Rabbit Fur until Teflon accumulates a negative charge (< -5 nC).',
        hint: 'Fur donates valence electrons easily to high electron-affinity Teflon.',
        check: (objs: ElectroObject[]) => {
          const teflon = objs.find((o) => o.materialId === 'teflon');
          return teflon ? teflon.charge <= -4.0 : false;
        },
      },
      {
        id: 's3',
        title: 'Step 3: Measure Electrostatic Attraction',
        instruction: 'Move the positively charged Glass Rod near the negatively charged Teflon Balloon (dist < 15 cm). Observe attractive force vectors!',
        hint: 'Opposite charges attract with Coulomb Force F = k q1 q2 / r².',
        check: (objs: ElectroObject[]) => {
          const glass = objs.find((o) => o.materialId === 'glass');
          const teflon = objs.find((o) => o.materialId === 'teflon');
          if (glass && teflon) {
            const dx = glass.x - teflon.x;
            const dy = glass.y - teflon.y;
            return Math.sqrt(dx * dx + dy * dy) < 200 && glass.charge > 2 && teflon.charge < -2;
          }
          return false;
        },
      },
    ],
  },
  {
    id: 'lab-2',
    title: 'Lab 2: Inverse-Square Coulomb Law',
    subtitle: 'Verify F ∝ 1/r² relationship between charged bodies',
    category: 'Coulomb Force',
    description:
      'Quantify the electrostatic force between charges as separation distance changes.',
    steps: [
      {
        id: 's1',
        title: 'Step 1: Set Up Two Positive Charges',
        instruction: 'Set the Glass Rod charge to +10 nC and place a Copper Sphere at +10 nC.',
        hint: 'Use the Object Inspector slider in the control panel to adjust charges.',
        check: (objs: ElectroObject[]) => {
          const glass = objs.find((o) => o.materialId === 'glass');
          const copper = objs.find((o) => o.materialId === 'copper');
          return (glass ? glass.charge >= 8 : false) && (copper ? copper.charge >= 8 : false);
        },
      },
      {
        id: 's2',
        title: 'Step 2: Measure Force at Close Separation',
        instruction: 'Position the two positive objects 15 cm apart and turn ON Force Vectors overlay.',
        hint: 'Watch the repulsive force vectors point away from each other.',
        check: (objs: ElectroObject[]) => {
          const glass = objs.find((o) => o.materialId === 'glass');
          const copper = objs.find((o) => o.materialId === 'copper');
          if (glass && copper) {
            const dist = Math.sqrt((glass.x - copper.x) ** 2 + (glass.y - copper.y) ** 2);
            return dist < 220 && dist > 80;
          }
          return false;
        },
      },
    ],
  },
  {
    id: 'lab-3',
    title: 'Lab 3: Polarization & Induced Dipoles',
    subtitle: 'Why neutral insulators attract charged objects',
    category: 'Dielectrics',
    description:
      'Explore how external electric fields shift atomic electron clouds in neutral paper and walls.',
    steps: [
      {
        id: 's1',
        title: 'Step 1: Charge the Balloon',
        instruction: 'Charge the Balloon to -10 nC.',
        hint: 'Rub with fur or use the Inspector slider.',
        check: (objs: ElectroObject[]) => {
          const b = objs.find((o) => o.shape === 'balloon');
          return b ? b.charge <= -6 : false;
        },
      },
      {
        id: 's2',
        title: 'Step 2: Bring Charged Balloon near Neutral Paper',
        instruction: 'Drag the charged balloon close to the Paper Strips (< 10 cm).',
        hint: 'Notice how neutral paper bits feel an attractive force toward both (+) and (-) charged objects!',
        check: (objs: ElectroObject[]) => {
          const b = objs.find((o) => o.shape === 'balloon');
          const p = objs.find((o) => o.materialId === 'paper');
          if (b && p) {
            const dist = Math.sqrt((b.x - p.x) ** 2 + (b.y - p.y) ** 2);
            return dist < 160 && b.charge <= -5;
          }
          return false;
        },
      },
    ],
  },
];

export const LabGuidePanel: React.FC<LabGuidePanelProps> = ({
  objects,
  sensor,
  probeData,
  setObjects,
  setOverlayConfig,
}) => {
  const [activeLabIdx, setActiveLabIdx] = useState(0);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const currentLab = LAB_MODULES[activeLabIdx];
  const currentStep = currentLab.steps[activeStepIdx];

  const handleVerifyStep = () => {
    const isPassed = currentStep.check(objects);
    if (isPassed) {
      const stepKey = `${currentLab.id}-${currentStep.id}`;
      setCompletedSteps((prev) => ({ ...prev, [stepKey]: true }));

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });

      if (activeStepIdx < currentLab.steps.length - 1) {
        setActiveStepIdx((prev) => prev + 1);
        setShowHint(false);
      }
    } else {
      setShowHint(true);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-slate-100 flex flex-col gap-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100">Guided Academic Physics Labs</h3>
        </div>

        {/* Lab Selector Dropdown */}
        <select
          value={activeLabIdx}
          onChange={(e) => {
            setActiveLabIdx(parseInt(e.target.value));
            setActiveStepIdx(0);
            setShowHint(false);
          }}
          className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:border-cyan-500 font-medium cursor-pointer"
        >
          {LAB_MODULES.map((lab, idx) => (
            <option key={lab.id} value={idx}>
              {lab.title}
            </option>
          ))}
        </select>
      </div>

      {/* Lab Summary Card */}
      <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
            {currentLab.category}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Progress: Step {activeStepIdx + 1} of {currentLab.steps.length}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{currentLab.description}</p>
      </div>

      {/* Steps Stepper Bar */}
      <div className="flex items-center gap-2">
        {currentLab.steps.map((step, idx) => {
          const stepKey = `${currentLab.id}-${step.id}`;
          const isDone = completedSteps[stepKey];
          const isCurrent = idx === activeStepIdx;

          return (
            <button
              key={step.id}
              onClick={() => {
                setActiveStepIdx(idx);
                setShowHint(false);
              }}
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                isCurrent
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md'
                  : isDone
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <span>{step.title.split(':')[0]}</span>
              {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          );
        })}
      </div>

      {/* Current Active Step Box */}
      <div className="bg-slate-950/80 border border-cyan-500/30 p-4 rounded-xl space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            {currentStep.title}
          </h4>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          {currentStep.instruction}
        </p>

        {showHint && (
          <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-lg text-xs text-amber-200 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Lab Hint: </span>
              {currentStep.hint}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showHint ? 'Hide Hint' : 'Need Hint?'}</span>
          </button>

          <button
            onClick={handleVerifyStep}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 font-bold text-xs rounded-xl hover:from-cyan-400 hover:to-sky-300 transition-all shadow-md shadow-cyan-950/50 active:scale-95 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Verify Step Goal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
