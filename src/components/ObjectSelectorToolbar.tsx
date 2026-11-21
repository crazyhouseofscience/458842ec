import React, { useState } from 'react';
import { MATERIALS_DATABASE } from '../physics/materialsData';
import { ElectroObject, ModuleMode } from '../types/electrostatics';
import { getElectroscopeGuideState } from '../utils/electroscopeGuide';
import { getMaterialTooltip } from '../utils/physicsGlossary';
import { PhysicsTooltip } from './PhysicsTooltip';
import {
  Sparkles,
  Plus,
  Trash2,
  Layers,
  Wand2,
  Flame,
  Check,
  ArrowLeftRight,
  Crosshair,
  Pin,
  Minus,
  Gauge,
  Lock,
} from 'lucide-react';

interface ObjectSelectorToolbarProps {
  moduleMode: ModuleMode;
  objects: ElectroObject[];
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
  onAddObject: (materialId: string) => void;
  onRemoveObject: (id: string) => void;
  onAssignSlotMaterial: (slotIndex: 0 | 1, materialId: string) => void;
  onUpdateSlotObject: (slotIndex: 0 | 1, updates: Partial<ElectroObject>) => void;
  onSingleRub: (objectId: string) => void;
  onClearSlot: (slotIndex: 0 | 1) => void;
  onLoadScenario: (scenarioKey: string) => void;
  onTriggerFriction: (sourceId: string, targetId: string) => void;
  onAddPointCharge?: (chargeNc: number) => void;
  onUpdatePointCharge?: (id: string, updates: Partial<ElectroObject>) => void;
  onLoadPointChargePreset?: (presetKey: string) => void;
  guidedElectroscopeMode?: boolean;
  stagedPrepObject?: ElectroObject | null;
  onRubStagedPrep?: () => void;
  onPlaceStagedPrep?: () => void;
  onCancelStagedPrep?: () => void;
}

export const ObjectSelectorToolbar: React.FC<ObjectSelectorToolbarProps> = ({
  moduleMode,
  objects,
  selectedObjectId,
  setSelectedObjectId,
  onAddObject,
  onRemoveObject,
  onAssignSlotMaterial,
  onUpdateSlotObject,
  onSingleRub,
  onClearSlot,
  onLoadScenario,
  onTriggerFriction,
  onAddPointCharge,
  onUpdatePointCharge,
  onLoadPointChargePreset,
  guidedElectroscopeMode = true,
  stagedPrepObject = null,
  onRubStagedPrep,
  onPlaceStagedPrep,
  onCancelStagedPrep,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'positive' | 'negative' | 'neutral_dielectric' | 'conductors'>('all');
  const [frictionTargetId, setFrictionTargetId] = useState<string>('');

  const materialList = Object.values(MATERIALS_DATABASE);
  const specimenMaterials = materialList.filter((m) => m.id !== 'electroscope');
  const filteredMaterials = materialList.filter((m) => {
    if (activeCategory === 'positive') return m.triboOrder > 2;
    if (activeCategory === 'negative') return m.triboOrder < -2;
    if (activeCategory === 'neutral_dielectric') return m.category === 'dielectric' || m.category === 'tribo_neutral';
    if (activeCategory === 'conductors') return m.category === 'conductor';
    return true;
  });

  // Module 1: Left Toolbar = Object 1 Material Selection (Always Visible, No Advanced Charge Sliders)
  if (moduleMode === 'module1') {
    const obj1 =
      objects.find((o) => o.id.startsWith('slot-0-')) ||
      objects.find((o) => !o.id.startsWith('slot-1-'));
    const obj1Mat = obj1 ? MATERIALS_DATABASE[obj1.materialId] : null;
    const isObj1Active = obj1 ? selectedObjectId === obj1.id : false;
    const needsObj1 = !obj1;

    return (
      <aside
        className={`w-full lg:w-[258px] xl:w-[274px] h-full bg-slate-900/95 rounded-2xl p-2.5 flex flex-col gap-2 text-slate-100 shadow-2xl shrink-0 overflow-hidden border transition-all ${
          needsObj1
            ? 'border-orange-400 ring-2 ring-orange-400/40 shadow-[0_0_26px_rgba(251,146,60,0.20)]'
            : 'border-slate-800'
        }`}
      >
        {/* Object 1 Header */}
        <div
          onClick={() => obj1 && setSelectedObjectId(obj1.id)}
          className={`p-2.5 rounded-xl border transition-all space-y-1.5 shrink-0 ${
            obj1 ? 'cursor-pointer' : ''
          } ${
            needsObj1
              ? 'bg-orange-950/60 border-orange-400/85'
              : isObj1Active
              ? 'bg-orange-950/45 border-orange-400 shadow-md shadow-orange-950/25'
              : 'bg-slate-950/75 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold uppercase tracking-wide text-orange-400">
              {needsObj1 ? 'Step 1 · Object 1' : 'Object 1 (Left)'}
            </span>
            <span className={`text-xs font-mono font-semibold ${needsObj1 || isObj1Active ? 'text-orange-300' : 'text-slate-300'}`}>
              {needsObj1 ? 'Select Material' : isObj1Active ? '● Selected' : '✓ Placed'}
            </span>
          </div>

          {obj1 && obj1Mat ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3.5 h-3.5 rounded-sm shrink-0 border border-white/20"
                    style={{ backgroundColor: obj1Mat.color }}
                  />
                  <span className="text-[15px] font-bold text-slate-100 truncate">{obj1.name}</span>
                </div>
                <span
                  className={`text-sm font-mono font-bold tabular-nums shrink-0 ${
                    obj1.charge > 0.05
                      ? 'text-cyan-400'
                      : obj1.charge < -0.05
                      ? 'text-pink-400'
                      : 'text-slate-300'
                  }`}
                >
                  {obj1.charge > 0.05 ? `+${obj1.charge.toFixed(1)}` : obj1.charge.toFixed(1)} nC
                </span>
              </div>

              {/* Direct Rub & Pin/Clear Actions (No charge sliders in Module 1) */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <PhysicsTooltip termKey="rubSingle" placement="right" className="flex-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedObjectId(obj1.id);
                      onSingleRub(obj1.id);
                    }}
                    className="w-full py-1.5 px-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                    <span>Rub Object 1</span>
                  </button>
                </PhysicsTooltip>
                <PhysicsTooltip termKey="pinObject" placement="right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateSlotObject(0, { isPinned: !obj1.isPinned, vx: 0, vy: 0 });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap ${
                      obj1.isPinned
                        ? 'bg-orange-950/80 border-orange-400 text-orange-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-slate-100'
                    }`}
                  >
                    {obj1.isPinned ? 'Pinned' : 'Pin'}
                  </button>
                </PhysicsTooltip>
                <PhysicsTooltip termKey="removeObject" placement="right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearSlot(0);
                    }}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </PhysicsTooltip>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-orange-100/95 leading-snug">
              Choose a material below to place <span className="font-bold text-orange-300">Object 1</span> on the stage.
            </p>
          )}
        </div>

        {/* Object 1 Material Selection — Compact 2-Column Grid so all 13 fit on Chromebooks */}
        <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <span className={`text-[13px] font-bold flex items-center gap-1.5 ${needsObj1 ? 'text-orange-300' : 'text-slate-100'}`}>
              <ArrowLeftRight className="w-4 h-4 text-orange-400" />
              <span>{needsObj1 ? 'Pick Object 1 Material' : 'Object 1 Materials'}</span>
            </span>
            <span className="text-xs font-mono text-slate-400">{specimenMaterials.length} items</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 overflow-y-auto pr-0.5 content-start flex-1">
            {specimenMaterials.map((mat) => {
              const isSelectedMat = obj1?.materialId === mat.id;
              return (
                <PhysicsTooltip key={mat.id} entry={getMaterialTooltip(mat)} placement="right">
                  <button
                    onClick={() => onAssignSlotMaterial(0, mat.id)}
                    className={`w-full px-2 py-1.5 rounded-xl border text-left flex items-start justify-between gap-1.5 transition-all ${
                      isSelectedMat
                        ? 'bg-orange-950/65 border-orange-400 text-slate-100 shadow-sm'
                        : needsObj1
                        ? 'bg-slate-950/85 border-orange-500/35 hover:border-orange-400 hover:bg-orange-950/30 text-slate-100'
                        : 'bg-slate-950/75 border-slate-800/80 hover:border-slate-600 hover:bg-slate-800/50 text-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-1.5 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-sm shrink-0 mt-1"
                        style={{ backgroundColor: mat.color }}
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-tight truncate">{mat.name}</div>
                        <div className="text-xs text-slate-400 truncate font-mono mt-0.5">
                          {mat.triboOrder > 0
                            ? `+${mat.triboOrder} Donor`
                            : mat.triboOrder < 0
                            ? `${mat.triboOrder} Gain e⁻`
                            : mat.category === 'conductor'
                            ? 'Conductor'
                            : 'Dielectric'}
                        </div>
                      </div>
                    </div>
                    {isSelectedMat && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />}
                  </button>
                </PhysicsTooltip>
              );
            })}
          </div>
        </div>
      </aside>
    );
  }

  // Module 3: Point Charges Catalogue & Live Charge List
  if (moduleMode === 'module3') {
    return (
      <aside className="w-full lg:w-[258px] xl:w-[274px] h-full bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-2 text-slate-100 shadow-2xl shrink-0 overflow-y-auto">
        {/* 1. Add Point Charges (Primary Action from Blank Stage) */}
        <div
          className={`space-y-1.5 pb-2 border-b shrink-0 rounded-xl p-2 transition-all ${
            objects.length === 0
              ? 'bg-orange-950/30 border-orange-400/70'
              : 'border-slate-800 bg-slate-950/40'
          }`}
        >
          <div className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center justify-between gap-1.5">
            <span className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Add Point Charge</span>
            </span>
            <span className="text-xs font-mono text-slate-300">
              {objects.length === 0 ? 'Step 1' : `${objects.length} active`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <PhysicsTooltip termKey="pointChargeAdd" placement="right">
              <button
                onClick={() => onAddPointCharge?.(10)}
                className="w-full py-2 px-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/60 hover:bg-cyan-900/70 text-cyan-100 font-bold flex items-center justify-center gap-1 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+10 nC</span>
              </button>
            </PhysicsTooltip>
            <PhysicsTooltip termKey="pointChargeAdd" placement="right">
              <button
                onClick={() => onAddPointCharge?.(-10)}
                className="w-full py-2 px-2.5 rounded-xl bg-pink-950/70 border border-pink-500/60 hover:bg-pink-900/70 text-pink-100 font-bold flex items-center justify-center gap-1 transition-all active:scale-95"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>−10 nC</span>
              </button>
            </PhysicsTooltip>
            <PhysicsTooltip termKey="pointChargeAdd" placement="right">
              <button
                onClick={() => onAddPointCharge?.(5)}
                className="w-full py-1.5 px-2.5 rounded-xl bg-slate-950 border border-sky-500/40 hover:border-sky-400 text-sky-200 font-semibold text-xs transition-all"
              >
                +5 nC
              </button>
            </PhysicsTooltip>
            <PhysicsTooltip termKey="pointChargeAdd" placement="right">
              <button
                onClick={() => onAddPointCharge?.(-5)}
                className="w-full py-1.5 px-2.5 rounded-xl bg-slate-950 border border-pink-500/40 hover:border-pink-400 text-pink-200 font-semibold text-xs transition-all"
              >
                −5 nC
              </button>
            </PhysicsTooltip>
            <PhysicsTooltip termKey="pointChargeAdd" placement="right">
              <button
                onClick={() => onAddPointCharge?.(2)}
                className="w-full py-1.5 px-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-sky-400 text-slate-200 font-semibold text-xs transition-all"
              >
                +2 nC Test
              </button>
            </PhysicsTooltip>
            <PhysicsTooltip termKey="pointChargeAdd" placement="right">
              <button
                onClick={() => onAddPointCharge?.(0)}
                className="w-full py-1.5 px-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold text-xs transition-all"
              >
                0 nC Neutral
              </button>
            </PhysicsTooltip>
          </div>
        </div>

        {/* 2. Active Point Charges List with Inline Charge Stepper */}
        <div className="space-y-1.5 flex-1 flex flex-col min-h-[120px]">
          <div className="flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-pink-400" />
              <span>Charges on Stage ({objects.length})</span>
            </span>
          </div>

          {objects.length === 0 ? (
            <div className="p-3 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-400">
              Blank stage. Add a charge above to display field lines and vectors.
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto pr-0.5 flex-1">
              {objects.map((obj) => {
                const isSelected = selectedObjectId === obj.id;
                const isPos = obj.charge > 0.05;
                const isNeg = obj.charge < -0.05;

                return (
                  <div
                    key={obj.id}
                    onClick={() => setSelectedObjectId(obj.id)}
                    className={`p-2 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                      isSelected
                        ? 'bg-orange-950/40 border-orange-400 text-slate-100 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold text-white shrink-0 ${
                            isPos ? 'bg-sky-600' : isNeg ? 'bg-pink-600' : 'bg-slate-600'
                          }`}
                        >
                          {isPos ? '+' : isNeg ? '−' : '0'}
                        </span>
                        <span className="text-xs font-bold truncate">{obj.name}</span>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                          isPos ? 'text-cyan-300' : isNeg ? 'text-pink-300' : 'text-slate-300'
                        }`}
                      >
                        {isPos ? `+${obj.charge.toFixed(1)}` : obj.charge.toFixed(1)} nC
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                      <div className="flex items-center gap-1">
                        <PhysicsTooltip termKey="adjustChargeStep" placement="right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdatePointCharge?.(obj.id, { charge: Math.max(-30, obj.charge - 2) });
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-pink-400 text-pink-300 font-bold"
                          >
                            −2
                          </button>
                        </PhysicsTooltip>
                        <PhysicsTooltip termKey="adjustChargeStep" placement="right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdatePointCharge?.(obj.id, { charge: Math.min(30, obj.charge + 2) });
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 font-bold"
                          >
                            +2
                          </button>
                        </PhysicsTooltip>
                      </div>

                      <div className="flex items-center gap-1">
                        <PhysicsTooltip termKey="pinObject" placement="right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdatePointCharge?.(obj.id, { isPinned: !obj.isPinned, vx: 0, vy: 0 });
                            }}
                            className={`p-1 rounded border transition-colors ${
                              obj.isPinned
                                ? 'bg-amber-950/70 border-amber-400 text-amber-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                        </PhysicsTooltip>
                        <PhysicsTooltip termKey="removeObject" placement="right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveObject(obj.id);
                            }}
                            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </PhysicsTooltip>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Optional Quick Configurations */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-pink-400 uppercase tracking-wider">
              <Crosshair className="w-3.5 h-3.5" />
              <span>Quick Setups</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <PhysicsTooltip termKey="presetDipole" placement="right">
              <button
                onClick={() => onLoadPointChargePreset?.('dipole')}
                className="w-full p-2 bg-slate-950/75 border border-slate-800 hover:border-cyan-400/70 rounded-xl text-left transition-all"
              >
                <div className="font-semibold text-slate-100 leading-tight">Dipole (+/−)</div>
              </button>
            </PhysicsTooltip>

            <PhysicsTooltip termKey="presetLikePos" placement="right">
              <button
                onClick={() => onLoadPointChargePreset?.('repel_pos')}
                className="w-full p-2 bg-slate-950/75 border border-slate-800 hover:border-sky-400/70 rounded-xl text-left transition-all"
              >
                <div className="font-semibold text-slate-100 leading-tight">Like (+/+)</div>
              </button>
            </PhysicsTooltip>

            <PhysicsTooltip termKey="presetQuadrupole" placement="right">
              <button
                onClick={() => onLoadPointChargePreset?.('quadrupole')}
                className="w-full p-2 bg-slate-950/75 border border-slate-800 hover:border-amber-400/70 rounded-xl text-left transition-all"
              >
                <div className="font-semibold text-slate-100 leading-tight">Quadrupole</div>
              </button>
            </PhysicsTooltip>

            <PhysicsTooltip termKey="presetTriad" placement="right">
              <button
                onClick={() => onLoadPointChargePreset?.('triangle')}
                className="w-full p-2 bg-slate-950/75 border border-slate-800 hover:border-orange-400/70 rounded-xl text-left transition-all"
              >
                <div className="font-semibold text-slate-100 leading-tight">3-Charge Triad</div>
              </button>
            </PhysicsTooltip>
          </div>
        </div>
      </aside>
    );
  }

  // Module 4: Electroscope Lab — Organized Top-to-Bottom by Student Workflow (Add -> Rub -> Quick Labs)
  if (moduleMode === 'module4') {
    const guide = getElectroscopeGuideState(objects, stagedPrepObject);
    const rubbableObjects = objects.filter((o) => o.shape !== 'electroscope' && o.shape !== 'point_charge');
    const selectedRubbable = rubbableObjects.find((o) => o.id === selectedObjectId) || rubbableObjects[0];
    const rubPairCandidates = selectedRubbable ? rubbableObjects.filter((o) => o.id !== selectedRubbable.id) : [];
    const activePairTarget =
      rubPairCandidates.find((o) => o.id === frictionTargetId) || rubPairCandidates[0];
    const highlightStep1 = guidedElectroscopeMode && guide.step === 1;
    const highlightStep2 = guidedElectroscopeMode && guide.step === 2;
    const canPlaceStaged = Boolean(
      stagedPrepObject &&
        (stagedPrepObject.materialId === 'ground' || Math.abs(stagedPrepObject.charge) >= 0.5)
    );

    return (
      <aside className="w-full lg:w-[266px] xl:w-[284px] h-full bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-2 text-slate-100 shadow-2xl shrink-0 overflow-hidden">
        {/* Step 1: Add Classroom Objects (Primary First Action) */}
        <div
          className={`rounded-xl p-2 border transition-all flex flex-col gap-1.5 min-h-0 flex-1 ${
            highlightStep1
              ? 'bg-amber-950/35 border-amber-400 ring-2 ring-amber-400/35 shadow-[0_0_22px_rgba(251,191,36,0.18)]'
              : 'bg-slate-950/45 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5 shrink-0">
            <span className={`flex items-center gap-1.5 text-[13px] font-bold ${highlightStep1 ? 'text-amber-300' : 'text-slate-100'}`}>
              <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{guidedElectroscopeMode ? 'Step 1 · Pick Object' : 'Add Objects'}</span>
            </span>
            {highlightStep1 ? (
              <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[11px] font-extrabold uppercase tracking-wide shrink-0">
                Start Here
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-mono">{specimenMaterials.length} items</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 overflow-y-auto pr-0.5 content-start flex-1">
            {specimenMaterials.map((mat) => {
              const isInPrep = stagedPrepObject?.materialId === mat.id;
              return (
                <PhysicsTooltip key={mat.id} entry={getMaterialTooltip(mat)} placement="right">
                  <button
                    onClick={() => onAddObject(mat.id)}
                    className={`w-full px-2 py-1.5 rounded-xl border text-left flex items-center justify-between gap-1.5 transition-all ${
                      isInPrep
                        ? 'bg-amber-950/75 border-amber-400 text-slate-100 shadow-sm'
                        : highlightStep1
                        ? 'bg-slate-950/90 border-amber-400/45 hover:border-amber-300 hover:bg-amber-950/40'
                        : 'bg-slate-950/75 border-slate-800/80 hover:border-amber-400/60 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: mat.color }}
                      />
                      <span className="text-[13px] font-semibold text-slate-100 truncate">{mat.name}</span>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-bold shrink-0 ${
                        mat.triboOrder > 0 ? 'text-cyan-400' : mat.triboOrder < 0 ? 'text-pink-400' : 'text-slate-400'
                      }`}
                    >
                      {mat.triboOrder > 0 ? '+' : mat.triboOrder < 0 ? '−' : 'C'}
                    </span>
                  </button>
                </PhysicsTooltip>
              );
            })}
          </div>
        </div>

        {/* Step 2: Prep Station / Bench Test Objects & Charge / Rub */}
        <div
          className={`rounded-xl p-2 border transition-all space-y-1.5 shrink-0 ${
            highlightStep2
              ? 'bg-amber-950/35 border-amber-400 ring-2 ring-amber-400/35 shadow-[0_0_22px_rgba(251,191,36,0.18)]'
              : 'bg-slate-950/45 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className={`flex items-center gap-1.5 text-[13px] font-bold ${highlightStep2 ? 'text-amber-300' : 'text-slate-100'}`}>
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {stagedPrepObject
                  ? 'Step 2 · Rub & Place'
                  : guidedElectroscopeMode
                  ? 'Step 2 · Charge Object'
                  : `Bench Objects (${rubbableObjects.length})`}
              </span>
            </span>
            {highlightStep2 && (
              <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[11px] font-extrabold uppercase tracking-wide shrink-0">
                {stagedPrepObject ? (canPlaceStaged ? 'Click Place' : 'Rub First') : 'Click Rub'}
              </span>
            )}
          </div>

          {stagedPrepObject && (
            <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-400/70 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold text-slate-100 truncate">
                  {stagedPrepObject.name}
                </span>
                <span
                  className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                    stagedPrepObject.charge > 0.1
                      ? 'text-cyan-300'
                      : stagedPrepObject.charge < -0.1
                      ? 'text-pink-300'
                      : 'text-slate-300'
                  }`}
                >
                  {stagedPrepObject.charge > 0.05
                    ? `+${stagedPrepObject.charge.toFixed(1)}`
                    : stagedPrepObject.charge.toFixed(1)}{' '}
                  nC
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {stagedPrepObject.materialId !== 'ground' && (
                  <PhysicsTooltip termKey="rubSingle" placement="right" className="flex-1">
                    <button
                      onClick={() => onRubStagedPrep?.()}
                      className={`w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 ${
                        !canPlaceStaged ? 'ring-2 ring-amber-200' : ''
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                      <span>1. Rub</span>
                    </button>
                  </PhysicsTooltip>
                )}
                <PhysicsTooltip termKey="placeStagedObject" placement="right" className="flex-1">
                  <button
                    onClick={() => onPlaceStagedPrep?.()}
                    disabled={!canPlaceStaged}
                    className={`w-full py-1.5 px-2 rounded-lg border font-bold text-xs flex items-center justify-center gap-1 ${
                      canPlaceStaged
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300'
                        : 'bg-slate-950 border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {canPlaceStaged ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Lock className="w-3 h-3 shrink-0" />}
                    <span>2. Place</span>
                  </button>
                </PhysicsTooltip>
                {onCancelStagedPrep && (
                  <PhysicsTooltip termKey="removeObject" placement="right">
                    <button
                      onClick={onCancelStagedPrep}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </PhysicsTooltip>
                )}
              </div>
            </div>
          )}

          {rubbableObjects.length === 0 ? (
            !stagedPrepObject && (
              <div className="px-2.5 py-2 rounded-lg bg-slate-950/70 border border-dashed border-slate-800 text-xs text-slate-300 text-center">
                {guidedElectroscopeMode
                  ? 'Pick a material above to rub & place!'
                  : 'Electroscope centered. Add a material above!'}
              </div>
            )
          ) : (
            <div className="space-y-1 max-h-28 overflow-y-auto pr-0.5">
              {rubbableObjects.map((obj) => {
                const mat = MATERIALS_DATABASE[obj.materialId];
                const isSelected = selectedObjectId === obj.id;
                return (
                  <div
                    key={obj.id}
                    onClick={() => setSelectedObjectId(obj.id)}
                    className={`px-2 py-1.5 rounded-xl border flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-950/45 border-amber-400 text-slate-100'
                        : 'bg-slate-950/75 border-slate-800 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: mat?.color || '#94a3b8' }}
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold truncate leading-tight">{obj.name}</div>
                        <div
                          className={`text-xs font-mono tabular-nums ${
                            obj.charge > 0.1
                              ? 'text-cyan-300'
                              : obj.charge < -0.1
                              ? 'text-pink-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {obj.charge > 0.05 ? `+${obj.charge.toFixed(1)}` : obj.charge.toFixed(1)} nC
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <PhysicsTooltip termKey="rubSingle" placement="right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedObjectId(obj.id);
                            onSingleRub(obj.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1 ${
                            highlightStep2 && !stagedPrepObject ? 'ring-2 ring-amber-200' : ''
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Rub</span>
                        </button>
                      </PhysicsTooltip>
                      <PhysicsTooltip termKey="removeObject" placement="right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveObject(obj.id);
                          }}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-500/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </PhysicsTooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Compact Pair Rub Option when 2+ test objects are placed */}
          {selectedRubbable && activePairTarget && (
            <div className="pt-1 border-t border-slate-800/80 flex items-center gap-1.5">
              <select
                value={activePairTarget.id}
                onChange={(e) => setFrictionTargetId(e.target.value)}
                className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
              >
                {rubPairCandidates.map((t) => (
                  <option key={t.id} value={t.id}>
                    vs {t.name}
                  </option>
                ))}
              </select>
              <PhysicsTooltip termKey="rubPair" placement="right">
                <button
                  onClick={() => onTriggerFriction(selectedRubbable.id, activePairTarget.id)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-amber-400/60 text-amber-200 font-bold text-xs rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rub Pair</span>
                </button>
              </PhysicsTooltip>
            </div>
          )}
        </div>

        {/* Quick 1-Click Experiments */}
        <div className="space-y-1.5 pt-1 border-t border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Gauge className="w-3.5 h-3.5" />
              <span>Quick Labs</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">1-Click</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <PhysicsTooltip termKey="presetScopeRulerWool" placement="right">
              <button
                onClick={() => onLoadScenario('scope_ruler_wool')}
                className="w-full px-2 py-1.5 bg-slate-950/75 border border-slate-800 hover:border-amber-400/70 rounded-xl text-left transition-all"
              >
                <div className="font-semibold text-slate-100 leading-tight">Ruler + Wool</div>
              </button>
            </PhysicsTooltip>

            <PhysicsTooltip termKey="presetScopeGlassSilk" placement="right">
              <button
                onClick={() => onLoadScenario('scope_glass_silk')}
                className="w-full px-2 py-1.5 bg-slate-950/75 border border-slate-800 hover:border-sky-400/70 rounded-xl text-left transition-all"
              >
                <div className="font-semibold text-slate-100 leading-tight">Glass + Silk</div>
              </button>
            </PhysicsTooltip>

            <PhysicsTooltip termKey="presetScopeInduction" placement="right">
              <button
                onClick={() => onLoadScenario('scope_induction_demo')}
                className="w-full px-2 py-1.5 bg-slate-950/75 border border-slate-800 hover:border-emerald-400/70 rounded-xl text-left transition-all"
              >
                <div className="font-semibold text-slate-100 leading-tight">Induction Lab</div>
              </button>
            </PhysicsTooltip>

            <PhysicsTooltip termKey="presetScopePolarity" placement="right">
              <button
                onClick={() => onLoadScenario('scope_charged_test')}
                className="w-full px-2 py-1.5 bg-slate-950/75 border border-slate-800 hover:border-pink-400/70 rounded-xl text-left transition-all"
              >
                <div className="font-semibold text-slate-100 leading-tight">Polarity Test</div>
              </button>
            </PhysicsTooltip>
          </div>
        </div>
      </aside>
    );
  }

  // Module 2 Multi-Object & Advanced Electrostatic Mode
  const selectedObject = objects.find((o) => o.id === selectedObjectId);

  const handleApplyFrictionToSelected = () => {
    if (!selectedObjectId) return;
    const otherObjs = objects.filter((o) => o.id !== selectedObjectId);
    const target = frictionTargetId ? otherObjs.find((o) => o.id === frictionTargetId) : otherObjs[0];
    if (target) {
      onTriggerFriction(selectedObjectId, target.id);
    }
  };

  return (
    <aside className="w-full lg:w-[264px] xl:w-[280px] h-full bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-3 text-slate-100 shadow-2xl shrink-0 overflow-y-auto">
      {/* 1. Guided Starter Scenarios & Practical Engineering Apps */}
      <div className="space-y-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Wand2 className="w-3.5 h-3.5" />
            <span>Learning Setups</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">1-Click</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <PhysicsTooltip termKey="presetGlassSilk" placement="right">
            <button
              onClick={() => onLoadScenario('classic_silk_glass')}
              className="w-full p-2 bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-950/20 rounded-xl text-left transition-all group"
            >
              <div className="font-semibold text-slate-100 group-hover:text-cyan-300">Glass + Silk</div>
              <div className="text-[11px] text-slate-400">Tribo Donor (+)</div>
            </button>
          </PhysicsTooltip>

          <PhysicsTooltip termKey="presetFurBalloon" placement="right">
            <button
              onClick={() => onLoadScenario('fur_teflon_balloon')}
              className="w-full p-2 bg-slate-950/70 border border-slate-800 hover:border-pink-500/50 hover:bg-pink-950/20 rounded-xl text-left transition-all group"
            >
              <div className="font-semibold text-slate-100 group-hover:text-pink-300">Fur + Balloon</div>
              <div className="text-[11px] text-slate-400">Tribo Acceptor (-)</div>
            </button>
          </PhysicsTooltip>

          <PhysicsTooltip termKey="presetBalloonPaper" placement="right">
            <button
              onClick={() => onLoadScenario('balloon_paper_dipole')}
              className="w-full p-2 bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 hover:bg-amber-950/20 rounded-xl text-left transition-all group"
            >
              <div className="font-semibold text-slate-100 group-hover:text-amber-300">Balloon + Paper</div>
              <div className="text-[11px] text-slate-400">Induced Dipoles</div>
            </button>
          </PhysicsTooltip>

          <PhysicsTooltip termKey="presetCopperGround" placement="right">
            <button
              onClick={() => onLoadScenario('conductors_and_ground')}
              className="w-full p-2 bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/20 rounded-xl text-left transition-all group"
            >
              <div className="font-semibold text-slate-100 group-hover:text-emerald-300">Copper + Ground</div>
              <div className="text-[11px] text-slate-400">Conduction & Drain</div>
            </button>
          </PhysicsTooltip>
        </div>

        {/* Real-Life Practical Engineering Applications */}
        <div className="pt-1">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
            Practical Engineering Apps
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <PhysicsTooltip termKey="presetAirScrubber" placement="right">
              <button
                onClick={() => onLoadScenario('electrostatic_precipitator')}
                className="w-full p-2 bg-emerald-950/25 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/40 rounded-xl text-left transition-all group"
              >
                <div className="font-semibold text-emerald-200 group-hover:text-emerald-300 truncate">Air Scrubber</div>
                <div className="text-[11px] text-slate-300 truncate">Ash Precipitator</div>
              </button>
            </PhysicsTooltip>

            <PhysicsTooltip termKey="presetLaserToner" placement="right">
              <button
                onClick={() => onLoadScenario('xerographic_toner')}
                className="w-full p-2 bg-sky-950/25 border border-sky-500/30 hover:border-sky-400 hover:bg-sky-950/40 rounded-xl text-left transition-all group"
              >
                <div className="font-semibold text-sky-200 group-hover:text-sky-300 truncate">Laser Toner</div>
                <div className="text-[11px] text-slate-300 truncate">Xerography Drum</div>
              </button>
            </PhysicsTooltip>
          </div>
        </div>
      </div>

      {/* 2. Stage Objects List (Active / Inactive Selection) */}
      <div className="space-y-1.5 pb-2.5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Stage Objects ({objects.length})</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Active / Inactive</span>
        </div>

        {objects.length === 0 ? (
          <div className="p-2.5 bg-slate-950/50 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-400">
            No objects on stage. Click a material below to add one.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
            {objects.map((obj) => {
              const mat = MATERIALS_DATABASE[obj.materialId];
              const isSelected = selectedObjectId === obj.id;

              return (
                <div
                  key={obj.id}
                  onClick={() => setSelectedObjectId(obj.id)}
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/70 border-cyan-500 text-slate-100 shadow-md shadow-cyan-950/40'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0 shadow-sm"
                      style={{ backgroundColor: mat?.color || '#94a3b8' }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold">{obj.name}</div>
                      <div className={`text-[11px] font-mono ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`}>
                        {isSelected ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs tabular-nums">
                    <span
                      className={`font-bold ${
                        obj.charge > 0.05
                          ? 'text-cyan-400'
                          : obj.charge < -0.05
                          ? 'text-pink-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {obj.charge > 0.05 ? `+${obj.charge.toFixed(1)}` : obj.charge.toFixed(1)} nC
                    </span>

                    <PhysicsTooltip termKey="removeObject" placement="right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveObject(obj.id);
                        }}
                        className="p-1 hover:text-rose-400 hover:bg-rose-950/50 rounded transition-colors text-slate-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </PhysicsTooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Friction Action Controller */}
      {selectedObject && objects.length >= 2 && (
        <div className="p-2.5 bg-gradient-to-br from-cyan-950/40 to-slate-950 border border-cyan-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Apply Friction Action</span>
            </span>
            <PhysicsTooltip termKey="workFunction" placement="right" as="span" underlineTerm>
              <span className="text-[11px] text-amber-400/90 font-mono">ΔW Flow</span>
            </PhysicsTooltip>
          </div>

          <div className="text-xs text-slate-200">
            Rub <span className="font-bold text-cyan-300">{selectedObject.name}</span> against:
          </div>

          <select
            value={frictionTargetId}
            onChange={(e) => setFrictionTargetId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
          >
            {objects
              .filter((o) => o.id !== selectedObjectId)
              .map((target) => (
                <option key={target.id} value={target.id}>
                  {target.name} ({target.charge.toFixed(1)} nC)
                </option>
              ))}
          </select>

          <PhysicsTooltip termKey="rubPair" placement="right">
            <button
              onClick={handleApplyFrictionToSelected}
              className="w-full py-2 bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>Rub Objects (Transfer e⁻)</span>
            </button>
          </PhysicsTooltip>
        </div>
      )}

      {/* 4. Material Catalogue & Add Object */}
      <div className="space-y-2 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add New Material</span>
          </div>
          <PhysicsTooltip termKey="triboAffinity" placement="right" as="span" underlineTerm>
            <span className="text-[11px] text-slate-400 font-mono">Catalogue</span>
          </PhysicsTooltip>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1 text-[11px] font-medium">
          <PhysicsTooltip termKey="allMaterials" placement="right">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2 py-1 rounded-md transition-all whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-slate-800 text-cyan-300 font-bold'
                  : 'text-slate-300 hover:text-white bg-slate-950/50'
              }`}
            >
              All
            </button>
          </PhysicsTooltip>
          <PhysicsTooltip termKey="electronDonor" placement="right">
            <button
              onClick={() => setActiveCategory('positive')}
              className={`px-2 py-1 rounded-md transition-all whitespace-nowrap ${
                activeCategory === 'positive'
                  ? 'bg-sky-950 text-sky-300 border border-sky-500/40 font-bold'
                  : 'text-slate-300 hover:text-white bg-slate-950/50'
              }`}
            >
              (+) Donors
            </button>
          </PhysicsTooltip>
          <PhysicsTooltip termKey="electronAcceptor" placement="right">
            <button
              onClick={() => setActiveCategory('negative')}
              className={`px-2 py-1 rounded-md transition-all whitespace-nowrap ${
                activeCategory === 'negative'
                  ? 'bg-pink-950 text-pink-300 border border-pink-500/40 font-bold'
                  : 'text-slate-300 hover:text-white bg-slate-950/50'
              }`}
            >
              (-) Acceptors
            </button>
          </PhysicsTooltip>
          <PhysicsTooltip termKey="dielectric" placement="right">
            <button
              onClick={() => setActiveCategory('neutral_dielectric')}
              className={`px-2 py-1 rounded-md transition-all whitespace-nowrap ${
                activeCategory === 'neutral_dielectric'
                  ? 'bg-amber-950 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-300 hover:text-white bg-slate-950/50'
              }`}
            >
              Dielectrics
            </button>
          </PhysicsTooltip>
          <PhysicsTooltip termKey="conductor" placement="right">
            <button
              onClick={() => setActiveCategory('conductors')}
              className={`px-2 py-1 rounded-md transition-all whitespace-nowrap ${
                activeCategory === 'conductors'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-slate-300 hover:text-white bg-slate-950/50'
              }`}
            >
              Conductors
            </button>
          </PhysicsTooltip>
        </div>

        {/* Materials Buttons List */}
        <div className="space-y-1.5 overflow-y-auto max-h-56 pr-0.5">
          {filteredMaterials.map((mat) => {
            const isPositive = mat.triboOrder > 0;
            const isNegative = mat.triboOrder < 0;

            return (
              <PhysicsTooltip key={mat.id} entry={getMaterialTooltip(mat)} placement="right">
                <button
                  onClick={() => onAddObject(mat.id)}
                  className="w-full p-2 bg-slate-950/70 border border-slate-800/80 hover:border-slate-600 hover:bg-slate-800/50 rounded-xl text-left flex items-center justify-between gap-2 group transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0 group-hover:scale-125 transition-transform"
                      style={{ backgroundColor: mat.color }}
                    />
                    <div className="truncate">
                      <div className="text-[13px] font-semibold text-slate-100 group-hover:text-cyan-300">
                        {mat.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate font-mono">
                        W={mat.workFunctionEv}eV · m={mat.massGrams}g · εr={mat.dielectricConstant}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right font-mono text-xs">
                    {isPositive && <span className="text-cyan-400 font-bold">+{mat.triboOrder}</span>}
                    {isNegative && <span className="text-pink-400 font-bold">{mat.triboOrder}</span>}
                    {mat.triboOrder === 0 && <span className="text-slate-400">0</span>}
                  </div>
                </button>
              </PhysicsTooltip>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
