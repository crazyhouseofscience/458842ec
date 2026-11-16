import React from 'react';
import {
  VisualOverlayConfig,
  ElectroObject,
  ProbeSensor,
  ProbeData,
  ModuleMode,
} from '../types/electrostatics';
import { MATERIALS_DATABASE } from '../physics/materialsData';
import {
  updateSurfaceChargeDots,
  getAirBreakdownThreshold,
  AIR_VISCOSITY_ETA,
  calculateCoulombForces,
} from '../physics/electrostaticsEngine';
import {
  Eye,
  Trash2,
  RotateCw,
  Shield,
  Droplets,
  Zap,
  Sliders,
  Activity,
  Compass,
  Wind,
  Pin,
  Check,
  ArrowLeftRight,
  Sparkles,
  Crosshair,
  RefreshCw,
  Grid3x3,
} from 'lucide-react';

interface ControlPanelProps {
  moduleMode: ModuleMode;
  overlayConfig: VisualOverlayConfig;
  setOverlayConfig: React.Dispatch<React.SetStateAction<VisualOverlayConfig>>;
  sensor: ProbeSensor;
  setSensor: React.Dispatch<React.SetStateAction<ProbeSensor>>;
  probeData: ProbeData;
  objects: ElectroObject[];
  setObjects: React.Dispatch<React.SetStateAction<ElectroObject[]>>;
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
  onAssignSlotMaterial: (slotIndex: 0 | 1, materialId: string) => void;
  onUpdateSlotObject: (slotIndex: 0 | 1, updates: Partial<ElectroObject>) => void;
  onSingleRub: (objectId: string) => void;
  onClearSlot: (slotIndex: 0 | 1) => void;
  onResetScene: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  moduleMode,
  overlayConfig,
  setOverlayConfig,
  sensor,
  setSensor,
  probeData,
  objects,
  setObjects,
  selectedObjectId,
  setSelectedObjectId,
  onAssignSlotMaterial,
  onUpdateSlotObject,
  onSingleRub,
  onClearSlot,
  onResetScene,
}) => {
  const selectedObject = objects.find((o) => o.id === selectedObjectId) || (moduleMode === 'module1' ? objects[0] : undefined);
  const selectedMat = selectedObject ? MATERIALS_DATABASE[selectedObject.materialId] : null;
  const activeObjId = selectedObject?.id ?? null;

  const toggleOverlay = (key: keyof VisualOverlayConfig) => {
    setOverlayConfig((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }));
  };

  const handleUpdateSelectedObject = (updates: Partial<ElectroObject>) => {
    if (!activeObjId) return;
    setObjects((prev) =>
      prev.map((o) => {
        if (o.id !== activeObjId) return o;
        const updated: ElectroObject = {
          ...o,
          ...updates,
          surfaceCharges: o.surfaceCharges.map((sc) => ({ ...sc })),
          dipoles: o.dipoles.map((d) => ({ ...d })),
        };
        if (updates.isGrounded === true) {
          updated.charge = 0;
        }
        if (updates.charge !== undefined || updates.isGrounded !== undefined) {
          updateSurfaceChargeDots(updated);
        }
        return updated;
      })
    );
  };

  const handleDeleteSelected = () => {
    if (!activeObjId) return;
    setObjects((prev) => prev.filter((o) => o.id !== activeObjId));
    setSelectedObjectId(null);
  };

  const forces = calculateCoulombForces(objects);
  const peakForce = forces.reduce((max, f) => (f.magnitude > max ? f.magnitude : max), 0);

  // Module 1: Right Toolbar = Object 2 + Compact Stage Controls
  if (moduleMode === 'module1') {
    const obj1 =
      objects.find((o) => o.id.startsWith('slot-0-')) ||
      objects.find((o) => !o.id.startsWith('slot-1-'));
    const obj2 =
      objects.find((o) => o.id.startsWith('slot-1-')) ||
      objects.find((o, idx) => idx === 1 && !o.id.startsWith('slot-0-'));
    const obj2Mat = obj2 ? MATERIALS_DATABASE[obj2.materialId] : null;
    const isObj2Active = obj2 ? selectedObjectId === obj2.id : false;
    const waitingForObj1 = !obj1 && !obj2;
    const needsObj2Now = Boolean(obj1) && !obj2;
    const materialList = Object.values(MATERIALS_DATABASE);

    return (
      <aside
        className={`w-full lg:w-[244px] xl:w-[260px] h-full bg-slate-900/95 rounded-2xl p-2.5 flex flex-col gap-2 text-slate-100 shadow-2xl shrink-0 overflow-hidden border transition-all ${
          needsObj2Now
            ? 'border-orange-400 ring-2 ring-orange-400/40 shadow-[0_0_26px_rgba(251,146,60,0.20)]'
            : 'border-slate-800'
        }`}
      >
        {/* Object 2 Header */}
        <div
          onClick={() => obj2 && setSelectedObjectId(obj2.id)}
          className={`p-2.5 rounded-xl border transition-all space-y-1.5 shrink-0 ${
            obj2 ? 'cursor-pointer' : ''
          } ${
            needsObj2Now
              ? 'bg-orange-950/60 border-orange-400/85'
              : isObj2Active
              ? 'bg-orange-950/45 border-orange-400 shadow-md shadow-orange-950/25'
              : 'bg-slate-950/75 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[13px] font-bold uppercase tracking-wide ${waitingForObj1 ? 'text-slate-200' : 'text-orange-400'}`}>
              {needsObj2Now ? 'Step 2 · Object 2' : 'Object 2 (Right)'}
            </span>
            <span
              className={`text-xs font-mono font-semibold ${
                needsObj2Now || isObj2Active ? 'text-orange-300' : 'text-slate-300'
              }`}
            >
              {needsObj2Now
                ? 'Select Material'
                : waitingForObj1
                ? 'Step 2'
                : isObj2Active
                ? '● Selected'
                : '✓ Placed'}
            </span>
          </div>

          {obj2 && obj2Mat ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3.5 h-3.5 rounded-sm shrink-0 border border-white/20"
                    style={{ backgroundColor: obj2Mat.color }}
                  />
                  <span className="text-[15px] font-bold text-slate-100 truncate">{obj2.name}</span>
                </div>
                <span
                  className={`text-sm font-mono font-bold tabular-nums shrink-0 ${
                    obj2.charge > 0.05
                      ? 'text-cyan-400'
                      : obj2.charge < -0.05
                      ? 'text-pink-400'
                      : 'text-slate-300'
                  }`}
                >
                  {obj2.charge > 0.05 ? `+${obj2.charge.toFixed(1)}` : obj2.charge.toFixed(1)} nC
                </span>
              </div>

              {/* Direct Rub & Pin/Clear Actions (Manual Charge Q sliders live in Module 2) */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedObjectId(obj2.id);
                    onSingleRub(obj2.id);
                  }}
                  className="flex-1 py-1.5 px-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                  <span>Rub Object 2</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateSlotObject(1, { isPinned: !obj2.isPinned, vx: 0, vy: 0 });
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap ${
                    obj2.isPinned
                      ? 'bg-orange-950/80 border-orange-400 text-orange-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-slate-100'
                  }`}
                >
                  {obj2.isPinned ? 'Pinned' : 'Pin'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearSlot(1);
                  }}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                  title="Clear Object 2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <p className={`text-[13px] leading-snug ${needsObj2Now ? 'text-orange-100/95' : 'text-slate-300'}`}>
              {needsObj2Now ? (
                <>
                  Now choose a material below for <span className="font-bold text-orange-300">Object 2</span>.
                </>
              ) : (
                'Choose Object 2 below, or pick Object 1 on the left first.'
              )}
            </p>
          )}
        </div>

        {/* Choose Object 2 Material — Compact 2-Column Grid so all 13 fit cleanly on Chromebooks */}
        <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <span className={`text-[13px] font-bold flex items-center gap-1.5 ${needsObj2Now ? 'text-orange-300' : 'text-slate-100'}`}>
              <ArrowLeftRight className="w-4 h-4 text-orange-400" />
              <span>{needsObj2Now ? 'Pick Object 2 Material' : 'Object 2 Materials'}</span>
            </span>
            <span className="text-xs font-mono text-slate-400">{materialList.length} items</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 overflow-y-auto pr-0.5 content-start flex-1">
            {materialList.map((mat) => {
              const isSelectedMat = obj2?.materialId === mat.id;
              return (
                <button
                  key={mat.id}
                  onClick={() => onAssignSlotMaterial(1, mat.id)}
                  className={`w-full px-2 py-1.5 rounded-xl border text-left flex items-start justify-between gap-1.5 transition-all ${
                    isSelectedMat
                      ? 'bg-orange-950/65 border-orange-400 text-slate-100 shadow-sm'
                      : needsObj2Now
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
                      <div className="text-[11px] text-slate-400 truncate font-mono mt-0.5">
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
              );
            })}
          </div>
        </div>

        {/* Compact Stage Options */}
        <div className="pt-2 border-t border-slate-800 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Stage Options
            </span>
            <button
              onClick={onResetScene}
              className="text-xs font-semibold text-slate-300 hover:text-rose-300 transition-colors"
            >
              Reset Pair
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              onClick={() => toggleOverlay('liveCoulombMotion')}
              className={`px-2 py-1 rounded-lg border font-medium flex items-center justify-between transition-all ${
                overlayConfig.liveCoulombMotion
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400'
              }`}
            >
              <span>Motion</span>
              <span className="font-mono font-bold">{overlayConfig.liveCoulombMotion ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => toggleOverlay('showForceVectors')}
              className={`px-2 py-1 rounded-lg border font-medium flex items-center justify-between transition-all ${
                overlayConfig.showForceVectors
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400'
              }`}
            >
              <span>Force Arrows</span>
              <span className="font-mono font-bold">{overlayConfig.showForceVectors ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => toggleOverlay('showCharges')}
              className={`px-2 py-1 rounded-lg border font-medium flex items-center justify-between transition-all ${
                overlayConfig.showCharges
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400'
              }`}
            >
              <span>Charges</span>
              <span className="font-mono font-bold">{overlayConfig.showCharges ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => toggleOverlay('showFieldLines')}
              className={`px-2 py-1 rounded-lg border font-medium flex items-center justify-between transition-all ${
                overlayConfig.showFieldLines
                  ? 'bg-sky-950/60 border-sky-500/50 text-sky-300'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400'
              }`}
            >
              <span>Field Lines</span>
              <span className="font-mono font-bold">{overlayConfig.showFieldLines ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => toggleOverlay('showChargeMagnitude')}
              className={`px-2 py-1 rounded-lg border font-medium flex items-center justify-between transition-all ${
                overlayConfig.showChargeMagnitude
                  ? 'bg-orange-950/60 border-orange-400/70 text-orange-300'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400'
              }`}
            >
              <span>Labels (+/- nC)</span>
              <span className="font-mono font-bold">{overlayConfig.showChargeMagnitude ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => toggleOverlay('showFieldVectorGrid')}
              className={`px-2 py-1 rounded-lg border font-medium flex items-center justify-between transition-all ${
                overlayConfig.showFieldVectorGrid
                  ? 'bg-cyan-950/60 border-cyan-400/70 text-cyan-300'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400'
              }`}
            >
              <span>Vector Grid</span>
              <span className="font-mono font-bold">{overlayConfig.showFieldVectorGrid ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="space-y-1 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
            <div className="flex justify-between text-xs text-slate-200 font-mono tabular-nums">
              <span>Coulomb Damping (γ)</span>
              <span className="text-emerald-400 font-bold">{overlayConfig.coulombDamping.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayConfig.coulombDamping}
              onChange={(e) =>
                setOverlayConfig((prev) => ({ ...prev, coulombDamping: parseFloat(e.target.value) }))
              }
              className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </aside>
    );
  }

  // Module 3: Point Charges Manipulation, Vectors, Motion & Field Lines
  if (moduleMode === 'module3') {
    const selectedForce = selectedObject ? forces.find((f) => f.objectId === selectedObject.id) : undefined;
    const isPos = selectedObject ? selectedObject.charge > 0.05 : false;
    const isNeg = selectedObject ? selectedObject.charge < -0.05 : false;

    return (
      <div className="w-full lg:w-[272px] xl:w-72 h-full bg-slate-900/95 border border-slate-800 rounded-2xl p-3 overflow-y-auto flex flex-col gap-3 text-slate-100 shadow-2xl shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-pink-400" />
            <h2 className="text-sm font-bold text-slate-100">Point Charge Inspector</h2>
          </div>
          <button
            onClick={onResetScene}
            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-rose-300 hover:bg-rose-950/40 border border-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            Reset / Clear
          </button>
        </div>

        {/* 1. Selected Point Charge Manipulation */}
        {selectedObject ? (
          <div className="bg-slate-950/90 border border-orange-400/65 p-3.5 rounded-xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold text-white shrink-0 ${
                    isPos ? 'bg-sky-600' : isNeg ? 'bg-pink-600' : 'bg-slate-600'
                  }`}
                >
                  {isPos ? '+' : isNeg ? '−' : '0'}
                </span>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-slate-100 block truncate">{selectedObject.name}</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    ({Math.round(selectedObject.x)}, {Math.round(selectedObject.y)}) px
                  </span>
                </div>
              </div>
              <button
                onClick={handleDeleteSelected}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg transition-colors shrink-0"
                title="Remove selected point charge"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Charge Magnitude Slider (-30 to +30 nC) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline text-xs font-mono tabular-nums">
                <span className="text-slate-300 font-semibold">Charge Q</span>
                <span
                  className={`font-bold text-base ${
                    isPos ? 'text-cyan-400' : isNeg ? 'text-pink-400' : 'text-slate-300'
                  }`}
                >
                  {isPos ? `+${selectedObject.charge.toFixed(1)}` : selectedObject.charge.toFixed(1)} nC
                </span>
              </div>

              <input
                type="range"
                min="-30"
                max="30"
                step="0.5"
                value={selectedObject.charge}
                onChange={(e) => handleUpdateSelectedObject({ charge: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>−30 nC</span>
                <span>0 nC</span>
                <span>+30 nC</span>
              </div>
            </div>

            {/* Quick Charge Presets & Flip Sign */}
            <div className="grid grid-cols-5 gap-1 text-[11px] font-mono">
              {[-15, -5, 0, 5, 15].map((val) => (
                <button
                  key={val}
                  onClick={() => handleUpdateSelectedObject({ charge: val })}
                  className={`py-1 rounded-lg border font-bold transition-colors ${
                    Math.abs(selectedObject.charge - val) < 0.1
                      ? 'bg-orange-950/70 border-orange-400 text-orange-300'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  {val > 0 ? `+${val}` : val}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                onClick={() => handleUpdateSelectedObject({ charge: -selectedObject.charge })}
                className="px-2 py-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-400/60 text-slate-200 rounded-xl font-semibold flex items-center gap-1 justify-center transition-colors whitespace-nowrap"
                title="Invert charge polarity"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Flip ±</span>
              </button>

              <button
                onClick={() => handleUpdateSelectedObject({ isPinned: !selectedObject.isPinned, vx: 0, vy: 0 })}
                className={`px-2 py-1.5 rounded-xl border font-semibold flex items-center gap-1 justify-center transition-all whitespace-nowrap ${
                  selectedObject.isPinned
                    ? 'bg-amber-950/80 border-amber-400 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{selectedObject.isPinned ? 'Pinned' : 'Pin'}</span>
              </button>

              <button
                onClick={() => handleUpdateSelectedObject({ vx: 0, vy: 0 })}
                className="px-2 py-1.5 bg-slate-900 border border-slate-800 hover:border-rose-400/60 text-slate-200 rounded-xl font-semibold transition-colors whitespace-nowrap"
                title="Zero velocity"
              >
                Stop v
              </button>
            </div>

            {/* Live Force Readout for Selected Point Charge */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 space-y-1 text-xs font-mono tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">Net Force |F|:</span>
                <span className="text-amber-300 font-bold">
                  {(selectedForce?.magnitude ?? 0).toFixed(2)} µN
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Components (Fx, Fy):</span>
                <span className="text-slate-200">
                  {(selectedForce?.fx ?? 0).toFixed(1)}, {(selectedForce?.fy ?? 0).toFixed(1)} µN
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Speed |v|:</span>
                <span className="text-cyan-300">
                  {Math.hypot(selectedObject.vx, selectedObject.vy).toFixed(1)} px/s
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/40 border border-slate-800/70 p-4 rounded-xl text-center text-xs text-slate-300 flex flex-col items-center gap-2">
            <Crosshair className="w-5 h-5 text-pink-400" />
            <span>Click any point charge on the stage or left panel to edit its charge Q.</span>
          </div>
        )}

        {/* 2. Vectors, Motion, Field Lines & Magnitude Toggles */}
        <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Vectors, Motion &amp; Fields</span>
          </span>

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              onClick={() => toggleOverlay('liveCoulombMotion')}
              className={`col-span-2 px-2.5 py-2 rounded-xl border font-bold flex items-center justify-between transition-all ${
                overlayConfig.liveCoulombMotion
                  ? 'bg-emerald-950/75 border-emerald-400 text-emerald-200 shadow-sm'
                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-emerald-400/60'
              }`}
            >
              <span>Animate &amp; Move (Attract / Repel)</span>
              <span className={`font-mono font-bold ${overlayConfig.liveCoulombMotion ? 'text-emerald-300' : 'text-slate-400'}`}>
                {overlayConfig.liveCoulombMotion ? 'ON' : 'PAUSED'}
              </span>
            </button>

            <button
              onClick={() => toggleOverlay('showForceVectors')}
              className={`px-2.5 py-2 rounded-xl border font-semibold flex items-center justify-between transition-all ${
                overlayConfig.showForceVectors
                  ? 'bg-rose-950/60 border-rose-500/60 text-rose-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span>Force Arrows</span>
              <span className="font-mono font-bold">{overlayConfig.showForceVectors ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => toggleOverlay('showFieldVectors')}
              className={`px-2.5 py-2 rounded-xl border font-semibold flex items-center justify-between transition-all ${
                overlayConfig.showFieldVectors
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span>E-Vectors</span>
              <span className="font-mono font-bold">{overlayConfig.showFieldVectors ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => toggleOverlay('showFieldLines')}
              className={`px-2.5 py-2 rounded-xl border font-semibold flex items-center justify-between transition-all ${
                overlayConfig.showFieldLines
                  ? 'bg-sky-950/60 border-sky-500/60 text-sky-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span>Field Lines</span>
              <span className="font-mono font-bold">{overlayConfig.showFieldLines ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => toggleOverlay('animateFieldFlow')}
              className={`px-2.5 py-2 rounded-xl border font-semibold flex items-center justify-between transition-all ${
                overlayConfig.animateFieldFlow
                  ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span>Field Flow</span>
              <span className="font-mono font-bold">{overlayConfig.animateFieldFlow ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => toggleOverlay('showChargeMagnitude')}
              className={`px-2.5 py-2 rounded-xl border font-semibold flex items-center justify-between transition-all ${
                overlayConfig.showChargeMagnitude
                  ? 'bg-orange-950/60 border-orange-400/70 text-orange-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span>Magnitude</span>
              <span className="font-mono font-bold">{overlayConfig.showChargeMagnitude ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => toggleOverlay('showEquipotentials')}
              className={`px-2.5 py-2 rounded-xl border font-semibold flex items-center justify-between transition-all ${
                overlayConfig.showEquipotentials
                  ? 'bg-pink-950/60 border-pink-500/50 text-pink-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span>Equipotential</span>
              <span className="font-mono font-bold">{overlayConfig.showEquipotentials ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => toggleOverlay('showFieldVectorGrid')}
              className={`col-span-2 px-2.5 py-2 rounded-xl border font-semibold flex items-center justify-between transition-all ${
                overlayConfig.showFieldVectorGrid
                  ? 'bg-cyan-950/75 border-cyan-400 text-cyan-200 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500/50'
              }`}
              title="Enable background grid showing E-field vector direction and magnitude at every intersection"
            >
              <span className="flex items-center gap-1.5">
                <Grid3x3 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Field Vector Grid (E, |E|)</span>
              </span>
              <span className={`font-mono font-bold ${overlayConfig.showFieldVectorGrid ? 'text-cyan-300' : 'text-slate-400'}`}>
                {overlayConfig.showFieldVectorGrid ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              onClick={() => {
                setSensor((prev) => ({ ...prev, isActive: !prev.isActive }));
                toggleOverlay('showProbe');
              }}
              className={`col-span-2 px-2.5 py-2 rounded-xl border font-semibold flex items-center justify-between transition-all ${
                sensor.isActive && overlayConfig.showProbe
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span>Field &amp; Voltage Probe (|E|, V)</span>
              <span className="font-mono font-bold">
                {sensor.isActive && overlayConfig.showProbe ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* 3. Motion Damping & Simulation Speed */}
        <div className="space-y-2.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
          <div>
            <div className="flex justify-between text-xs text-slate-200 mb-1 font-mono tabular-nums">
              <span>Coulomb Damping (γ)</span>
              <span className="text-emerald-400 font-bold">{overlayConfig.coulombDamping.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayConfig.coulombDamping}
              onChange={(e) =>
                setOverlayConfig((prev) => ({ ...prev, coulombDamping: parseFloat(e.target.value) }))
              }
              className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-200 mb-1 font-mono tabular-nums">
              <span>Simulation Speed</span>
              <span className="text-cyan-400 font-bold">{overlayConfig.simulationSpeed.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="2"
              step="0.25"
              value={overlayConfig.simulationSpeed}
              onChange={(e) =>
                setOverlayConfig((prev) => ({ ...prev, simulationSpeed: parseFloat(e.target.value) }))
              }
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    );
  }

  // Module 2: Full Multi-Body & Advanced Electrostatic Data Controls
  return (
    <div className="w-full lg:w-[272px] xl:w-72 h-full bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 overflow-y-auto flex flex-col gap-3.5 text-slate-100 shadow-2xl shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100">Physics & Advanced Data</h2>
        </div>
        <button
          onClick={onResetScene}
          className="px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 border border-slate-800 rounded-lg transition-colors whitespace-nowrap"
        >
          Reset Scene
        </button>
      </div>

      {/* Live Advanced Electrostatic Telemetry */}
      <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1.5 text-[11px] font-mono tabular-nums">
        <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-cyan-400 pb-1 border-b border-slate-800/80">
          Advanced Electrostatic Telemetry
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Probe Potential V:</span>
          <span className="text-emerald-400 font-bold">{probeData.voltageV} V</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Field Magnitude |E|:</span>
          <span className="text-pink-400 font-bold">{probeData.fieldMagnitude} N/C</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Components (Ex, Ey):</span>
          <span className="text-slate-200">{probeData.fieldEx}, {probeData.fieldEy} N/C</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Peak Net Force:</span>
          <span className="text-amber-400 font-bold">{peakForce.toFixed(2)} µN</span>
        </div>
      </div>

      {/* 1. Selected Object Inspector */}
      {selectedObject && selectedMat ? (
        <div className="bg-slate-950/90 border border-orange-400/60 p-4 rounded-xl space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3.5 h-3.5 rounded-sm shadow-md shrink-0"
                style={{ backgroundColor: selectedMat.color }}
              />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-100 block truncate">{selectedObject.name}</span>
                <span className="text-[10px] text-slate-500 font-mono truncate block">{selectedMat.chemicalFormula}</span>
              </div>
            </div>
            <button
              onClick={handleDeleteSelected}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg transition-colors shrink-0"
              title="Delete Object"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Charge Manual Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono tabular-nums">
              <span className="text-slate-400">Net Static Charge Q</span>
              <span
                className={`font-bold text-sm ${
                  selectedObject.charge > 0.05
                    ? 'text-cyan-400'
                    : selectedObject.charge < -0.05
                    ? 'text-pink-400'
                    : 'text-slate-400'
                }`}
              >
                {selectedObject.charge > 0.05 ? `+${selectedObject.charge.toFixed(1)}` : selectedObject.charge.toFixed(1)} nC
              </span>
            </div>

            <input
              type="range"
              min="-25"
              max="25"
              step="0.5"
              value={selectedObject.charge}
              onChange={(e) => handleUpdateSelectedObject({ charge: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-25 nC (Excess e⁻)</span>
              <span>0 nC (Neutral)</span>
              <span>+25 nC (Deficit e⁻)</span>
            </div>
          </div>

          {/* Ground, Pin & Rotation Controls */}
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <button
              onClick={() => handleUpdateSelectedObject({ isGrounded: !selectedObject.isGrounded })}
              className={`px-2 py-2 rounded-xl border font-medium flex items-center gap-1 justify-center transition-all whitespace-nowrap ${
                selectedObject.isGrounded
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/80'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{selectedObject.isGrounded ? 'Grounded' : 'Ground'}</span>
            </button>

            <button
              onClick={() => handleUpdateSelectedObject({ isPinned: !selectedObject.isPinned, vx: 0, vy: 0 })}
              className={`px-2 py-2 rounded-xl border font-medium flex items-center gap-1 justify-center transition-all whitespace-nowrap ${
                selectedObject.isPinned
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/80'
              }`}
            >
              <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{selectedObject.isPinned ? 'Pinned' : 'Pin'}</span>
            </button>

            <button
              onClick={() =>
                handleUpdateSelectedObject({ rotation: (selectedObject.rotation + 45) % 360 })
              }
              className="px-2 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 text-slate-300 rounded-xl font-medium flex items-center gap-1 justify-center transition-colors whitespace-nowrap"
            >
              <RotateCw className="w-3.5 h-3.5 shrink-0" />
              <span>+45°</span>
            </button>
          </div>

          {/* Microscopic & Physical Material Properties */}
          <div className="text-[11px] text-slate-300 leading-snug bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 space-y-1 font-mono tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-500">Work Function (W):</span>
              <span className="text-amber-400 font-bold">{selectedMat.workFunctionEv} eV</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Permittivity (εᵣ):</span>
              <span className="text-pink-400 font-bold">{selectedMat.dielectricConstant}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mass / Density:</span>
              <span className="text-slate-200 font-bold">
                {selectedMat.massGrams} g · {selectedMat.densityGCm3} g/cm³
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Surface Friction (μₖ):</span>
              <span className="text-emerald-400 font-bold">{selectedMat.frictionCoeff.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Triboelectric Affinity:</span>
              <span className={selectedMat.triboOrder >= 0 ? 'text-cyan-400 font-bold' : 'text-pink-400 font-bold'}>
                {selectedMat.triboOrder >= 0 ? `+${selectedMat.triboOrder} Donor` : `${selectedMat.triboOrder} Acceptor`}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-xl text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <Compass className="w-5 h-5 text-slate-600" />
          <span>Click any object on the canvas or left toolbar to inspect its properties.</span>
        </div>
      )}

      {/* 2. Charge Visualization & Dynamic Motion Mode */}
      <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Charge View Mode
          </span>
          <span className="text-[10px] text-cyan-400 font-mono">Microscopic</span>
        </span>

        {/* Segmented Charge View Buttons */}
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            onClick={() => setOverlayConfig((prev) => ({ ...prev, chargeViewMode: 'all_charges' }))}
            className={`px-2.5 py-1.5 rounded-lg border text-left transition-all ${
              overlayConfig.chargeViewMode === 'all_charges'
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="truncate">All Charges</div>
            <div className="text-[10px] text-slate-500 font-normal">Nuclei (+) & e⁻ (-)</div>
          </button>

          <button
            onClick={() => setOverlayConfig((prev) => ({ ...prev, chargeViewMode: 'excess_and_free' }))}
            className={`px-2.5 py-1.5 rounded-lg border text-left transition-all ${
              overlayConfig.chargeViewMode === 'excess_and_free'
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="truncate">Excess Charges</div>
            <div className="text-[10px] text-slate-500 font-normal">Net static Q</div>
          </button>

          <button
            onClick={() => setOverlayConfig((prev) => ({ ...prev, chargeViewMode: 'hidden' }))}
            className={`px-2.5 py-1.5 rounded-lg border text-left transition-all col-span-2 ${
              overlayConfig.chargeViewMode === 'hidden'
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="truncate">Charges Hidden</div>
            <div className="text-[10px] text-slate-500 font-normal">Show only macroscopic matter & fields</div>
          </button>
        </div>

        {/* Real-time Dynamic Motion Toggles */}
        <div className="pt-1 space-y-1.5 border-t border-slate-800/80">
          <button
            onClick={() => toggleOverlay('animateMovingCharges')}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
              overlayConfig.animateMovingCharges
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Moving Electrons Animation</span>
            </span>
            <span className={overlayConfig.animateMovingCharges ? 'text-cyan-400 font-bold' : 'text-slate-600'}>
              {overlayConfig.animateMovingCharges ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => toggleOverlay('animateFieldFlow')}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
              overlayConfig.animateFieldFlow
                ? 'bg-sky-950/60 border-sky-500/50 text-sky-300 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <span>Field Flow Streamers</span>
            <span className={overlayConfig.animateFieldFlow ? 'text-sky-400 font-bold' : 'text-slate-600'}>
              {overlayConfig.animateFieldFlow ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => toggleOverlay('liveCoulombMotion')}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
              overlayConfig.liveCoulombMotion
                ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-md'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Force Motion (Attract / Repel)</span>
            </span>
            <span className={overlayConfig.liveCoulombMotion ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
              {overlayConfig.liveCoulombMotion ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => toggleOverlay('showHaloGlow')}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
              overlayConfig.showHaloGlow
                ? 'bg-pink-950/60 border-pink-500/50 text-pink-300 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <span>Voltage Potential Halo</span>
            <span className={overlayConfig.showHaloGlow ? 'text-pink-400 font-bold' : 'text-slate-600'}>
              {overlayConfig.showHaloGlow ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Field & Force Visual Overlays */}
      <div className="space-y-2.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          Field & Force Visual Overlays
        </span>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => toggleOverlay('showFieldVectors')}
            className={`px-3 py-2 rounded-xl border font-medium flex items-center justify-between transition-all ${
              overlayConfig.showFieldVectors
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <span>E-Vectors</span>
            <span className={overlayConfig.showFieldVectors ? 'text-cyan-400' : 'text-slate-600'}>
              {overlayConfig.showFieldVectors ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => toggleOverlay('showFieldLines')}
            className={`px-3 py-2 rounded-xl border font-medium flex items-center justify-between transition-all ${
              overlayConfig.showFieldLines
                ? 'bg-sky-950/60 border-sky-500/50 text-sky-300 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <span>Field Lines</span>
            <span className={overlayConfig.showFieldLines ? 'text-sky-400' : 'text-slate-600'}>
              {overlayConfig.showFieldLines ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => toggleOverlay('showEquipotentials')}
            className={`px-3 py-2 rounded-xl border font-medium flex items-center justify-between transition-all ${
              overlayConfig.showEquipotentials
                ? 'bg-pink-950/60 border-pink-500/50 text-pink-300 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <span>Equipotential V</span>
            <span className={overlayConfig.showEquipotentials ? 'text-pink-400' : 'text-slate-600'}>
              {overlayConfig.showEquipotentials ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => toggleOverlay('showForceVectors')}
            className={`px-3 py-2 rounded-xl border font-medium flex items-center justify-between transition-all ${
              overlayConfig.showForceVectors
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <span>Force Vectors</span>
            <span className={overlayConfig.showForceVectors ? 'text-rose-400' : 'text-slate-600'}>
              {overlayConfig.showForceVectors ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => toggleOverlay('showAtomicDipoles')}
            className={`px-3 py-2 rounded-xl border font-medium flex items-center justify-between transition-all ${
              overlayConfig.showAtomicDipoles
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <span>Atomic Dipoles</span>
            <span className={overlayConfig.showAtomicDipoles ? 'text-amber-400' : 'text-slate-600'}>
              {overlayConfig.showAtomicDipoles ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => {
              setSensor((prev) => ({ ...prev, isActive: !prev.isActive }));
              toggleOverlay('showProbe');
            }}
            className={`px-3 py-2 rounded-xl border font-medium flex items-center justify-between transition-all ${
              sensor.isActive && overlayConfig.showProbe
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <span>Voltage Probe</span>
            <span className={sensor.isActive && overlayConfig.showProbe ? 'text-emerald-400' : 'text-slate-600'}>
              {sensor.isActive && overlayConfig.showProbe ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => toggleOverlay('showFieldVectorGrid')}
            className={`col-span-2 px-3 py-2 rounded-xl border font-medium flex items-center justify-between transition-all ${
              overlayConfig.showFieldVectorGrid
                ? 'bg-cyan-950/75 border-cyan-400 text-cyan-200 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
            title="Enable background grid showing E-field vector direction and magnitude at every intersection"
          >
            <span className="flex items-center gap-1.5">
              <Grid3x3 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Field Vector Grid (E, |E|)</span>
            </span>
            <span className={overlayConfig.showFieldVectorGrid ? 'text-cyan-300 font-bold' : 'text-slate-600'}>
              {overlayConfig.showFieldVectorGrid ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => toggleOverlay('showChargeMagnitude')}
            className={`col-span-2 px-3 py-2 rounded-xl border font-medium flex items-center justify-between transition-all ${
              overlayConfig.showChargeMagnitude
                ? 'bg-orange-950/60 border-orange-400/70 text-orange-300 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <span>Charge Magnitude Labels (+/- nC)</span>
            <span className={overlayConfig.showChargeMagnitude ? 'text-orange-400 font-bold' : 'text-slate-600'}>
              {overlayConfig.showChargeMagnitude ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Coulomb Damping, Environment & Physical Constants */}
      <div className="space-y-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5 text-emerald-400" />
          Dynamics, Damping & Air Constraints
        </span>

        {/* Coulomb Damping Slider */}
        <div>
          <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono tabular-nums">
            <span>Coulomb Damping (γ)</span>
            <span className="text-emerald-400 font-bold">{overlayConfig.coulombDamping.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={overlayConfig.coulombDamping}
            onChange={(e) =>
              setOverlayConfig((prev) => ({ ...prev, coulombDamping: parseFloat(e.target.value) }))
            }
            className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>0.0 Vacuum</span>
            <span className="text-emerald-300">
              {overlayConfig.coulombDamping < 0.15
                ? 'Near-Vacuum'
                : overlayConfig.coulombDamping < 0.45
                ? 'Air Drag (1 atm)'
                : overlayConfig.coulombDamping < 0.75
                ? 'Bench Friction'
                : 'Overdamped Viscous'}
            </span>
            <span>1.0 High</span>
          </div>
        </div>

        {/* Relative Humidity Slider */}
        <div className="pt-2 border-t border-slate-800/70">
          <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono tabular-nums">
            <span className="flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-400" />
              Air Humidity (Leak)
            </span>
            <span className="text-cyan-400 font-bold">{overlayConfig.humidityPercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={overlayConfig.humidityPercent}
            onChange={(e) =>
              setOverlayConfig((prev) => ({ ...prev, humidityPercent: parseInt(e.target.value) }))
            }
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Known SI Constants & Breakdown Constraint */}
        <div className="text-[10px] text-slate-400 bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1 font-mono tabular-nums">
          <div className="flex justify-between">
            <span className="text-slate-500">Coulomb Constant kₑ:</span>
            <span className="text-slate-200">8.99×10⁹ N·m²/C²</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Air Viscosity η (20°C):</span>
            <span className="text-slate-200">{(AIR_VISCOSITY_ETA * 1e5).toFixed(2)}×10⁻⁵ Pa·s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Paschen Breakdown E_bd:</span>
            <span className="text-amber-400 font-semibold">
              {(getAirBreakdownThreshold(overlayConfig.humidityPercent) / 1e6).toFixed(2)} MV/m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
