import React, { useState } from 'react';
import {
  ElectroObject,
  VisualOverlayConfig,
  ProbeSensor,
  ProbeData,
  ModuleMode,
} from './types/electrostatics';
import { INITIAL_PRESET_OBJECTS, MATERIALS_DATABASE } from './physics/materialsData';
import { updateSurfaceChargeDots, rubSingleObjectWithLabCloth } from './physics/electrostaticsEngine';

import { TopBar } from './components/TopBar';
import { ObjectSelectorToolbar } from './components/ObjectSelectorToolbar';
import { SimulationCanvas } from './components/SimulationCanvas';
import { ControlPanel } from './components/ControlPanel';
import { GraphingPanel } from './components/GraphingPanel';
import { LabGuidePanel } from './components/LabGuidePanel';
import { QuizPanel } from './components/QuizPanel';
import { MaterialChemistryModal } from './components/MaterialChemistryModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { StartupScreen } from './components/StartupScreen';
import { getElectroscopeGuideState } from './utils/electroscopeGuide';

import { Zap, Sparkles, Plus, Minus, Play, Pause, RotateCcw, Grid3x3, Shield, Compass, Check, Lock } from 'lucide-react';

function clonePreset(obj: ElectroObject): ElectroObject {
  return {
    ...obj,
    vx: 0,
    vy: 0,
    surfaceCharges: obj.surfaceCharges.map((sc) => ({ ...sc })),
    dipoles: obj.dipoles.map((d) => ({ ...d })),
  };
}

function getShapeAndDimsForMaterial(materialId: string): {
  shape: ElectroObject['shape'];
  width: number;
  height: number;
} {
  const shape: ElectroObject['shape'] =
    materialId === 'glass' ||
    materialId === 'ebonite' ||
    materialId === 'pvc' ||
    materialId === 'amber' ||
    materialId === 'plastic_ruler'
      ? 'rod'
      : materialId === 'teflon'
      ? 'balloon'
      : materialId === 'paper' || materialId === 'styrofoam' || materialId === 'scotch_tape'
      ? 'paper_strip'
      : materialId === 'copper'
      ? 'sphere'
      : materialId === 'ground'
      ? 'ground_plate'
      : materialId === 'electroscope'
      ? 'electroscope'
      : 'cloth_pad';

  const dims =
    materialId === 'electroscope'
      ? { width: 150, height: 220 }
      : materialId === 'plastic_ruler'
      ? { width: 205, height: 34 }
      : materialId === 'aluminum_can'
      ? { width: 68, height: 108 }
      : materialId === 'scotch_tape'
      ? { width: 116, height: 48 }
      : materialId === 'styrofoam'
      ? { width: 96, height: 74 }
      : shape === 'rod'
      ? { width: 170, height: 32 }
      : shape === 'balloon'
      ? { width: 110, height: 130 }
      : shape === 'paper_strip'
      ? { width: 90, height: 60 }
      : shape === 'sphere'
      ? { width: 96, height: 96 }
      : shape === 'ground_plate'
      ? { width: 220, height: 26 }
      : { width: 105, height: 95 };

  return { shape, ...dims };
}

function findSlotObject(objects: ElectroObject[], slotIndex: 0 | 1): ElectroObject | undefined {
  const prefix = `slot-${slotIndex}-`;
  const exact = objects.find((o) => o.id.startsWith(prefix));
  if (exact) return exact;
  if (slotIndex === 0) {
    return objects.find((o) => !o.id.startsWith('slot-1-'));
  }
  return objects.find((o, idx) => o.id.startsWith('slot-1-') || (idx === 1 && !o.id.startsWith('slot-0-')));
}

function createPointChargeObject(
  label: string,
  x: number,
  y: number,
  chargeNc: number,
  isPinned = false
): ElectroObject {
  return {
    id: `pc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: label,
    materialId: 'point_charge',
    shape: 'point_charge',
    x,
    y,
    vx: 0,
    vy: 0,
    width: 44,
    height: 44,
    rotation: 0,
    isPinned,
    isGrounded: false,
    charge: chargeNc,
    capacityNc: 30,
    surfaceCharges: [],
    dipoles: [],
  };
}

function createElectroscopeObject(x = 530, y = 265, chargeNc = 0): ElectroObject {
  return {
    id: `scope-${Date.now()}`,
    name: 'Gold-Leaf Electroscope',
    materialId: 'electroscope',
    shape: 'electroscope',
    x,
    y,
    vx: 0,
    vy: 0,
    width: 150,
    height: 220,
    rotation: 0,
    isPinned: true,
    isGrounded: false,
    charge: chargeNc,
    capacityNc: 30,
    surfaceCharges: [],
    dipoles: [],
    leafAngleDeg: 0,
    leafAngularVel: 0,
    leafChargeNc: chargeNc * 0.58,
    knobChargeNc: chargeNc * 0.42,
  };
}

function createSpecimenObject(
  materialId: string,
  x: number,
  y: number,
  chargeNc = 0,
  isPinned = false
): ElectroObject {
  const mat = MATERIALS_DATABASE[materialId];
  const { shape, width, height } = getShapeAndDimsForMaterial(materialId);
  const obj: ElectroObject = {
    id: `obj-${materialId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: mat?.name ?? materialId,
    materialId,
    shape,
    x,
    y,
    vx: 0,
    vy: 0,
    width,
    height,
    rotation: 0,
    isPinned,
    isGrounded: materialId === 'ground',
    charge: chargeNc,
    capacityNc: 30,
    surfaceCharges: [],
    dipoles: [],
  };
  updateSurfaceChargeDots(obj);
  return obj;
}

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('es_studio_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [showStartup, setShowStartup] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'sandbox' | 'labs' | 'graphs' | 'quiz' | 'chemistry'>('sandbox');
  const [moduleMode, setModuleMode] = useState<ModuleMode>('module1');

  // Start with an empty stage so students intentionally pick Object 1 (Left), then Object 2 (Right)
  const [objects, setObjects] = useState<ElectroObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isStageExpanded, setIsStageExpanded] = useState(false);
  const [guidedElectroscopeMode, setGuidedElectroscopeMode] = useState<boolean>(true);
  const [stagedPrepObject, setStagedPrepObject] = useState<ElectroObject | null>(null);

  const [overlayConfig, setOverlayConfig] = useState<VisualOverlayConfig>({
    showFieldVectors: false,
    showFieldVectorGrid: false,
    showFieldLines: false,
    showEquipotentials: false,
    showForceVectors: true,
    showAtomicDipoles: true,
    showCharges: true,
    showChargeMagnitude: true,
    chargeViewMode: 'all_charges',
    animateMovingCharges: true,
    animateFieldFlow: true,
    showHaloGlow: true,
    showGrid: true,
    showProbe: false,
    liveCoulombMotion: true,
    coulombDamping: 0.35,
    vectorDensity: 40,
    humidityPercent: 15,
    simulationSpeed: 1.0,
  });

  const [sensor, setSensor] = useState<ProbeSensor>({
    x: 480,
    y: 200,
    isActive: true,
  });

  const [probeData, setProbeData] = useState<ProbeData>({
    x: 480,
    y: 200,
    voltageV: 0,
    fieldEx: 0,
    fieldEy: 0,
    fieldMagnitude: 0,
    netChargeDensity: 0,
  });

  const [frictionLog, setFrictionLog] = useState<string | null>(
    'Step 1: Select Object 1 from the Left panel — Step 2: Select Object 2 from the Right panel.'
  );

  const [frictionTriggerEvent, setFrictionTriggerEvent] = useState<{
    sourceId: string;
    targetId: string;
    timestamp: number;
  } | null>(null);

  const [singleRubEvent, setSingleRubEvent] = useState<{
    objectId: string;
    timestamp: number;
  } | null>(null);

  const [isAITutorOpen, setIsAITutorOpen] = useState(false);
  const [isChemistryOpen, setIsChemistryOpen] = useState(false);

  const handleLoadPointChargePreset = (presetKey: string) => {
    let list: ElectroObject[] = [];
    let msg = '';

    if (presetKey === 'dipole') {
      list = [
        createPointChargeObject('q₁ (+)', 290, 260, 10, false),
        createPointChargeObject('q₂ (−)', 510, 260, -10, false),
      ];
      msg = 'Loaded Electric Dipole (+10 nC & −10 nC): Observe attraction vectors, field lines, and live motion.';
    } else if (presetKey === 'repel_pos') {
      list = [
        createPointChargeObject('q₁ (+)', 330, 260, 10, false),
        createPointChargeObject('q₂ (+)', 470, 260, 10, false),
      ];
      msg = 'Loaded Like-Charge Repulsion (+10 nC & +10 nC): Positive point charges accelerate apart!';
    } else if (presetKey === 'repel_neg') {
      list = [
        createPointChargeObject('q₁ (−)', 330, 260, -10, false),
        createPointChargeObject('q₂ (−)', 470, 260, -10, false),
      ];
      msg = 'Loaded Negative Repulsion (−10 nC & −10 nC): Like negative point charges repel radially.';
    } else if (presetKey === 'quadrupole') {
      list = [
        createPointChargeObject('q₁ (+)', 310, 185, 10, true),
        createPointChargeObject('q₂ (−)', 490, 185, -10, true),
        createPointChargeObject('q₃ (−)', 310, 345, -10, true),
        createPointChargeObject('q₄ (+)', 490, 345, 10, true),
      ];
      msg = 'Loaded Pinned Quadrupole Array: Unpin any charge or adjust Q sliders to explore net field symmetry.';
    } else if (presetKey === 'test_probe') {
      list = [
        createPointChargeObject('Q Source', 390, 260, 15, true),
        createPointChargeObject('q₀ Test', 250, 260, 2, false),
      ];
      msg = 'Loaded Pinned Source (+15 nC) + Mobile Test Charge (+2 nC): Drag q₀ around to trace Coulomb repulsion!';
    } else if (presetKey === 'triangle') {
      list = [
        createPointChargeObject('q₁ (+)', 400, 165, 12, true),
        createPointChargeObject('q₂ (−)', 305, 335, -10, true),
        createPointChargeObject('q₃ (+)', 495, 335, 8, false),
      ];
      msg = 'Loaded 3-Charge Triangle: Observe vector superposition of Coulomb forces acting on q₃.';
    }

    setObjects(list);
    setSelectedObjectId(list[0]?.id ?? null);
    if (msg) setFrictionLog(msg);
  };

  const handleAddPointCharge = (chargeNc: number) => {
    const existingCount = objects.filter((o) => o.shape === 'point_charge').length;
    const idx = existingCount + 1;
    const presets: Array<[number, number]> = [
      [300, 240],
      [480, 240],
      [360, 120],
      [360, 360],
      [180, 120],
      [180, 360],
    ];
    const [x, y] =
      existingCount < presets.length
        ? presets[existingCount]
        : [240 + (existingCount % 4) * 120, 120 + (Math.floor(existingCount / 4) % 3) * 120];

    const label = chargeNc > 0 ? `q${idx} (+)` : chargeNc < 0 ? `q${idx} (−)` : `q${idx} (0)`;
    const next = createPointChargeObject(label, x, y, chargeNc, false);
    setObjects((prev) => [...prev, next]);
    setSelectedObjectId(next.id);
    if (existingCount === 0) {
      setFrictionLog(
        `Placed ${label} (${chargeNc > 0 ? `+${chargeNc}` : chargeNc} nC): Field lines & E-vectors active. Add a 2nd charge to see field interactions.`
      );
    } else {
      setFrictionLog(
        `Placed ${label} (${chargeNc > 0 ? `+${chargeNc}` : chargeNc} nC): Field lines & forces updated (${overlayConfig.liveCoulombMotion ? 'Animate & Move ON' : 'stationary until you toggle Animate & Move'}).`
      );
    }
  };

  const handleUpdatePointCharge = (id: string, updates: Partial<ElectroObject>) => {
    setObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const handleSwitchModule = (nextMode: ModuleMode) => {
    setActiveTab('sandbox');
    setIsStageExpanded(false);
    setStagedPrepObject(null);
    setModuleMode(nextMode);
    if (nextMode === 'module1') {
      setObjects((prev) => {
        const nonPoint = prev.filter((o) => o.shape !== 'point_charge');
        if (nonPoint.length === 0) {
          setSelectedObjectId(null);
          return [];
        }
        const pair = nonPoint.slice(0, 2).map((o, idx) => ({
          ...o,
          id: o.id.startsWith('slot-0-') || o.id.startsWith('slot-1-') ? o.id : `slot-${idx}-${o.materialId}-${Date.now()}`,
          vx: 0,
          vy: 0,
          isPinned: false,
          x: o.x || (idx === 0 ? 300 : 460),
          y: o.y || 260,
        }));
        setSelectedObjectId(pair[0]?.id ?? null);
        return pair;
      });
      setOverlayConfig((prev) => ({
        ...prev,
        showFieldVectors: false,
        showFieldLines: false,
        showEquipotentials: false,
        showProbe: false,
        showForceVectors: true,
        showCharges: true,
        showChargeMagnitude: true,
        liveCoulombMotion: true,
        chargeViewMode: 'all_charges',
      }));
      setFrictionLog(
        'Module 1 (Two-Body Explorer): Select Object 1 on the Left, then Object 2 on the Right.'
      );
    } else if (nextMode === 'module3') {
      if (moduleMode !== 'module3') {
        setObjects([]);
        setSelectedObjectId(null);
      }
      setOverlayConfig((prev) => ({
        ...prev,
        showFieldVectors: true,
        showFieldLines: true,
        animateFieldFlow: true,
        showEquipotentials: false,
        showForceVectors: true,
        showChargeMagnitude: true,
        showCharges: true,
        showHaloGlow: true,
        showProbe: false,
        liveCoulombMotion: false,
        coulombDamping: 0.25,
      }));
      setFrictionLog(
        'Module 3 (Point Charges): Blank stage ready. Add 1 or more charges to inspect field lines & vectors; toggle Animate & Move when ready.'
      );
    } else if (nextMode === 'module4') {
      const scope = createElectroscopeObject(380, 260, 0);
      setObjects([scope]);
      setSelectedObjectId(null);
      setOverlayConfig((prev) => ({
        ...prev,
        showFieldVectors: false,
        showFieldLines: false,
        showEquipotentials: false,
        showForceVectors: false,
        showProbe: false,
        showCharges: true,
        showChargeMagnitude: true,
        showHaloGlow: true,
        liveCoulombMotion: false,
        chargeViewMode: 'all_charges',
      }));
      setFrictionLog(
        'Module 4 (Electroscope Lab): Step 1 — Pick a classroom object from the Left panel to begin.'
      );
    } else {
      setObjects((prev) => {
        const cleaned = prev.filter((o) => o.shape !== 'point_charge' && o.shape !== 'electroscope');
        if (cleaned.length !== prev.length) {
          setSelectedObjectId(cleaned[0]?.id ?? null);
        }
        return cleaned;
      });
      setOverlayConfig((prev) => ({
        ...prev,
        showFieldVectors: true,
        showProbe: true,
        showForceVectors: true,
        showCharges: true,
        showChargeMagnitude: true,
        liveCoulombMotion: true,
        chargeViewMode: 'all_charges',
      }));
      setFrictionLog(
        'Module 2 (Multi-Object & Advanced Lab): Add multiple objects, test practical engineering apps, and analyze electric fields & potentials.'
      );
    }
  };

  const handleAssignSlotMaterial = (slotIndex: 0 | 1, materialId: string) => {
    const mat = MATERIALS_DATABASE[materialId];
    if (!mat) return;
    const { shape, width, height } = getShapeAndDimsForMaterial(materialId);
    const otherSlotIndex: 0 | 1 = slotIndex === 0 ? 1 : 0;

    let hasOtherSlot = false;

    setObjects((prev) => {
      const existingThis = findSlotObject(prev, slotIndex);
      const existingOther = findSlotObject(prev, otherSlotIndex);
      hasOtherSlot = Boolean(existingOther);

      const isGround = materialId === 'ground';
      const updated: ElectroObject = {
        id: `slot-${slotIndex}-${materialId}-${Date.now()}`,
        name: mat.name,
        materialId,
        shape,
        x: existingThis ? existingThis.x : slotIndex === 0 ? 270 : 480,
        y: existingThis ? existingThis.y : 250,
        vx: 0,
        vy: 0,
        width,
        height,
        rotation: 0,
        isPinned: false,
        isGrounded: isGround,
        charge: isGround ? 0 : existingThis ? existingThis.charge : 0,
        capacityNc: 30,
        surfaceCharges: [],
        dipoles: [],
      };
      updateSurfaceChargeDots(updated);
      setSelectedObjectId(updated.id);

      const nextList: ElectroObject[] = [];
      const obj0 = slotIndex === 0 ? updated : existingOther;
      const obj1 = slotIndex === 1 ? updated : existingOther;
      if (obj0) nextList.push(obj0);
      if (obj1 && obj1 !== obj0) nextList.push(obj1);
      return nextList;
    });

    if (!hasOtherSlot) {
      setFrictionLog(
        slotIndex === 0
          ? `Object 1 (${mat.name}) placed! Step 2: Now select Object 2 on the Right.`
          : `Object 2 (${mat.name}) placed! Step 2: Now select Object 1 on the Left.`
      );
    } else {
      setFrictionLog(
        `Step 3: ${mat.name} assigned to Object ${slotIndex + 1}. Click "Rub Object 1", "Rub Object 2", or "Rub 1 & 2 Together" to initiate a static charge!`
      );
    }
  };

  const handleUpdateSlotObject = (slotIndex: 0 | 1, updates: Partial<ElectroObject>) => {
    setObjects((prev) => {
      const target = findSlotObject(prev, slotIndex);
      if (!target) return prev;
      const updated: ElectroObject = {
        ...target,
        ...updates,
        surfaceCharges: target.surfaceCharges.map((sc) => ({ ...sc })),
        dipoles: target.dipoles.map((d) => ({ ...d })),
      };
      if (updates.isGrounded === true) {
        updated.charge = 0;
      }
      if (updates.charge !== undefined || updates.isGrounded !== undefined) {
        updateSurfaceChargeDots(updated);
      }
      return prev.map((o) => (o.id === target.id ? updated : o));
    });
  };

  const handleLoadRepelPair = (materialId: 'scotch_tape' | 'styrofoam') => {
    const mat = MATERIALS_DATABASE[materialId];
    if (!mat) return;
    const { shape, width, height } = getShapeAndDimsForMaterial(materialId);
    const now = Date.now();
    const pair: ElectroObject[] = [0, 1].map((idx) => {
      const obj: ElectroObject = {
        id: `slot-${idx}-${materialId}-${now}`,
        name: mat.name,
        materialId,
        shape,
        x: idx === 0 ? 300 : 460,
        y: 260,
        vx: 0,
        vy: 0,
        width,
        height,
        rotation: 0,
        isPinned: false,
        isGrounded: false,
        charge: -10.0,
        capacityNc: 30,
        surfaceCharges: [],
        dipoles: [],
      };
      updateSurfaceChargeDots(obj);
      return obj;
    });
    setObjects(pair);
    setSelectedObjectId(pair[0].id);
    setFrictionLog(
      `Loaded 2× ${mat.name} (-10 nC each): Both hold excess negative electrons and visibly repel!`
    );
  };

  const handleSetPairPolarity = (mode: 'attract' | 'repel' | 'neutral') => {
    setObjects((prev) => {
      if (prev.length < 2) return prev;
      const updated = prev.map((obj, idx) => {
        const nextCharge =
          mode === 'neutral' || obj.isGrounded
            ? 0
            : mode === 'attract'
            ? idx === 0
              ? 10.0
              : -10.0
            : -10.0;
        const clone: ElectroObject = {
          ...obj,
          charge: nextCharge,
          vx: 0,
          vy: 0,
          surfaceCharges: [],
        };
        updateSurfaceChargeDots(clone);
        return clone;
      });
      return updated;
    });
    setFrictionLog(
      mode === 'attract'
        ? 'Set opposite charges (+10 nC & -10 nC): Objects now attract each other.'
        : mode === 'repel'
        ? 'Set like negative charges (-10 nC & -10 nC): Objects now repel each other.'
        : 'Reset both objects to neutral (0 nC).'
    );
  };

  // Add Object to Scene with organized canvas placement & realistic specimen proportions
  const handleAddObject = (materialId: string) => {
    const mat = MATERIALS_DATABASE[materialId];
    if (!mat) return;

    let defaultX = 220 + (objects.length % 4) * 160;
    let defaultY = 220 + Math.floor(objects.length / 4) * 120;

    if (moduleMode === 'module4') {
      // Place test specimens cleanly beside the centered electroscope so they never overlap it
      const testCount = objects.filter((o) => o.shape !== 'electroscope' && o.shape !== 'point_charge').length;
      const slots: Array<[number, number]> = [
        [155, 165],
        [155, 325],
        [615, 165],
        [615, 325],
        [155, 245],
        [615, 245],
      ];
      const slot = slots[testCount % slots.length];
      defaultX = slot[0];
      defaultY = slot[1];
    }

    const { shape, width, height } = getShapeAndDimsForMaterial(materialId);

    const newObj: ElectroObject = {
      id: `obj-${materialId}-${Date.now()}`,
      name: mat.name,
      materialId,
      shape,
      x: defaultX,
      y: defaultY,
      vx: 0,
      vy: 0,
      width,
      height,
      rotation: 0,
      isPinned: false,
      isGrounded: materialId === 'ground',
      charge: 0,
      capacityNc: 30,
      surfaceCharges: [],
      dipoles: [],
    };

    updateSurfaceChargeDots(newObj);

    // In Guided Electroscope mode, stage the object in the Prep Station so the student rubs it BEFORE placing it on the stage
    if (moduleMode === 'module4' && guidedElectroscopeMode) {
      setStagedPrepObject(newObj);
      setFrictionLog(
        materialId === 'ground'
          ? `Prepared ${mat.name} (0 V). Click "Place on Stage" to add it beside the electroscope.`
          : `Step 2: Rub your ${mat.name} in the Prep Station to charge it before placing it on the stage!`
      );
      return;
    }

    setObjects((prev) => [...prev, newObj]);
    setSelectedObjectId(newObj.id);
    if (moduleMode === 'module4') {
      setFrictionLog(
        `Added ${mat.name}. Click "Rub" to charge it, then drag it near the brass knob!`
      );
    } else {
      setFrictionLog(`Added ${mat.name} (${mat.massGrams} g, ρ=${mat.densityGCm3} g/cm³). Work Function W = ${mat.workFunctionEv} eV.`);
    }
  };

  const handleRubStagedPrep = () => {
    if (!stagedPrepObject) return;
    const cloned: ElectroObject = {
      ...stagedPrepObject,
      surfaceCharges: stagedPrepObject.surfaceCharges.map((sc) => ({ ...sc })),
      dipoles: stagedPrepObject.dipoles.map((d) => ({ ...d })),
    };
    const result = rubSingleObjectWithLabCloth(cloned);
    setStagedPrepObject(cloned);
    if (result) {
      setFrictionLog(`${result.text} Click "Place on Stage →" when ready!`);
    }
  };

  const handlePlaceStagedPrep = () => {
    if (!stagedPrepObject) return;
    if (stagedPrepObject.materialId !== 'ground' && Math.abs(stagedPrepObject.charge) < 0.5) {
      setFrictionLog(`Rub your ${stagedPrepObject.name} at least once to charge it before placing it on the stage!`);
      return;
    }

    const testCount = objects.filter((o) => o.shape !== 'electroscope' && o.shape !== 'point_charge').length;
    const slots: Array<[number, number]> = [
      [155, 165],
      [155, 325],
      [615, 165],
      [615, 325],
      [155, 245],
      [615, 245],
    ];
    const [slotX, slotY] = slots[testCount % slots.length];
    const placed: ElectroObject = {
      ...stagedPrepObject,
      x: slotX,
      y: slotY,
      surfaceCharges: stagedPrepObject.surfaceCharges.map((sc) => ({ ...sc })),
      dipoles: stagedPrepObject.dipoles.map((d) => ({ ...d })),
    };

    setObjects((prev) => [...prev, placed]);
    setSelectedObjectId(placed.id);
    setStagedPrepObject(null);
    const chargeText = placed.charge > 0.05 ? `+${placed.charge.toFixed(1)}` : placed.charge.toFixed(1);
    setFrictionLog(
      `Placed charged ${placed.name} (${chargeText} nC)! Step 3: Drag it close to the Brass Knob.`
    );
  };

  const handleCancelStagedPrep = () => {
    setStagedPrepObject(null);
    setFrictionLog('Step 1: Pick any classroom object from the Left panel.');
  };

  const handleToggleGuidedElectroscope = () => {
    setGuidedElectroscopeMode((prev) => {
      const next = !prev;
      if (!next && stagedPrepObject) {
        // When turning Guide OFF while an object is in prep, place it directly onto the bench so work isn't lost
        const testCount = objects.filter((o) => o.shape !== 'electroscope' && o.shape !== 'point_charge').length;
        const slots: Array<[number, number]> = [
          [155, 165],
          [155, 325],
          [615, 165],
          [615, 325],
          [155, 245],
          [615, 245],
        ];
        const [slotX, slotY] = slots[testCount % slots.length];
        const placed: ElectroObject = {
          ...stagedPrepObject,
          x: slotX,
          y: slotY,
          surfaceCharges: stagedPrepObject.surfaceCharges.map((sc) => ({ ...sc })),
          dipoles: stagedPrepObject.dipoles.map((d) => ({ ...d })),
        };
        setObjects((curr) => [...curr, placed]);
        setSelectedObjectId(placed.id);
        setStagedPrepObject(null);
      }
      return next;
    });
  };

  const handleRemoveObject = (id: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    if (selectedObjectId === id) {
      setSelectedObjectId(null);
    }
  };

  // Preset Learning Scenarios & Real-Life Practical Engineering Applications
  const handleLoadScenario = (scenarioKey: string) => {
    setStagedPrepObject(null);
    if (scenarioKey === 'classic_silk_glass') {
      setObjects([
        { ...clonePreset(INITIAL_PRESET_OBJECTS[0]), x: 420, y: 260, charge: 0 },
        { ...clonePreset(INITIAL_PRESET_OBJECTS[1]), x: 260, y: 260, charge: 0 },
      ]);
      setSelectedObjectId('obj-glass-rod');
      setFrictionLog('Loaded Classic Scenario: Glass Rod (+) & Silk Cloth (-). Rub them together to transfer electrons.');
    } else if (scenarioKey === 'fur_teflon_balloon') {
      const furMat = MATERIALS_DATABASE['fur'];
      const teflonMat = MATERIALS_DATABASE['teflon'];
      setObjects([
        {
          id: 'obj-balloon-teflon',
          name: teflonMat.name,
          materialId: 'teflon',
          shape: 'balloon',
          x: 480,
          y: 260,
          vx: 0,
          vy: 0,
          width: 110,
          height: 130,
          rotation: 0,
          isPinned: false,
          isGrounded: false,
          charge: 0,
          capacityNc: 30,
          surfaceCharges: [],
          dipoles: [],
        },
        {
          id: 'obj-fur-pad',
          name: furMat.name,
          materialId: 'fur',
          shape: 'cloth_pad',
          x: 280,
          y: 260,
          vx: 0,
          vy: 0,
          width: 110,
          height: 110,
          rotation: 0,
          isPinned: false,
          isGrounded: false,
          charge: 0,
          capacityNc: 30,
          surfaceCharges: [],
          dipoles: [],
        },
      ]);
      setSelectedObjectId('obj-balloon-teflon');
      setFrictionLog('Loaded Setup: Fur Pad & Teflon Balloon. Fur donates electrons to high-affinity Teflon!');
    } else if (scenarioKey === 'balloon_paper_dipole') {
      const balloonObj: ElectroObject = {
        ...clonePreset(INITIAL_PRESET_OBJECTS[2]),
        x: 320,
        y: 260,
        charge: -12.0,
      };
      updateSurfaceChargeDots(balloonObj);

      const paperObj: ElectroObject = {
        ...clonePreset(INITIAL_PRESET_OBJECTS[3]),
        x: 520,
        y: 260,
        charge: 0,
      };
      updateSurfaceChargeDots(paperObj);

      setObjects([balloonObj, paperObj]);
      setSelectedObjectId(balloonObj.id);
      setFrictionLog('Loaded Scenario: Negatively Charged Balloon near Neutral Paper. Observe induced atomic dipoles!');
    } else if (scenarioKey === 'conductors_and_ground') {
      const copperMat = MATERIALS_DATABASE['copper'];
      const groundMat = MATERIALS_DATABASE['ground'];

      const copperObj: ElectroObject = {
        id: 'obj-copper-sphere',
        name: copperMat.name,
        materialId: 'copper',
        shape: 'sphere',
        x: 340,
        y: 240,
        vx: 0,
        vy: 0,
        width: 96,
        height: 96,
        rotation: 0,
        isPinned: false,
        isGrounded: false,
        charge: 15.0,
        capacityNc: 30,
        surfaceCharges: [],
        dipoles: [],
      };
      updateSurfaceChargeDots(copperObj);

      const groundObj: ElectroObject = {
        id: 'obj-ground-plate',
        name: groundMat.name,
        materialId: 'ground',
        shape: 'ground_plate',
        x: 520,
        y: 340,
        vx: 0,
        vy: 0,
        width: 220,
        height: 26,
        rotation: 0,
        isPinned: true,
        isGrounded: true,
        charge: 0,
        capacityNc: 100,
        surfaceCharges: [],
        dipoles: [],
      };

      setObjects([copperObj, groundObj]);
      setSelectedObjectId(copperObj.id);
      setFrictionLog('Loaded Scenario: Charged Conductor Sphere & Earth Ground Plate. Touch them to discharge!');
    } else if (scenarioKey === 'electrostatic_precipitator') {
      // Real-Life Practical Engineering App #1: Industrial Electrostatic Air Scrubber / Precipitator
      const copperCollector: ElectroObject = {
        id: 'obj-precipitator-collector',
        name: 'HV Copper Collector (+)',
        materialId: 'copper',
        shape: 'sphere',
        x: 540,
        y: 230,
        vx: 0,
        vy: 0,
        width: 100,
        height: 100,
        rotation: 0,
        isPinned: true,
        isGrounded: false,
        charge: 22.0,
        capacityNc: 40,
        surfaceCharges: [],
        dipoles: [],
      };
      updateSurfaceChargeDots(copperCollector);

      const groundReturn: ElectroObject = {
        id: 'obj-precipitator-ground',
        name: 'Grounded Chassis (0 V)',
        materialId: 'ground',
        shape: 'ground_plate',
        x: 540,
        y: 390,
        vx: 0,
        vy: 0,
        width: 220,
        height: 24,
        rotation: 0,
        isPinned: true,
        isGrounded: true,
        charge: 0,
        capacityNc: 100,
        surfaceCharges: [],
        dipoles: [],
      };

      const ashParticulate: ElectroObject = {
        id: 'obj-ash-particle',
        name: 'Ionized Fly-Ash (1.2 g)',
        materialId: 'paper',
        shape: 'paper_strip',
        x: 200,
        y: 170,
        vx: 0,
        vy: 0,
        width: 78,
        height: 48,
        rotation: -10,
        isPinned: false,
        isGrounded: false,
        charge: -8.0,
        capacityNc: 20,
        surfaceCharges: [],
        dipoles: [],
      };
      updateSurfaceChargeDots(ashParticulate);

      const sootSpeck: ElectroObject = {
        id: 'obj-soot-particle',
        name: 'Ionized Soot Dust (3.5 g)',
        materialId: 'teflon',
        shape: 'balloon',
        x: 210,
        y: 310,
        vx: 0,
        vy: 0,
        width: 72,
        height: 84,
        rotation: 0,
        isPinned: false,
        isGrounded: false,
        charge: -9.5,
        capacityNc: 25,
        surfaceCharges: [],
        dipoles: [],
      };
      updateSurfaceChargeDots(sootSpeck);

      setOverlayConfig((prev) => ({ ...prev, liveCoulombMotion: true, coulombDamping: 0.4 }));
      setObjects([copperCollector, groundReturn, ashParticulate, sootSpeck]);
      setSelectedObjectId(ashParticulate.id);
      setFrictionLog(
        'Practical App — Electrostatic Precipitator: Air drag (Coulomb Damping = 0.40) stabilizes ionized ash & soot capture onto the +22 nC collector!'
      );
    } else if (scenarioKey === 'xerographic_toner') {
      // Real-Life Practical Engineering App #2: Laser Printer Xerographic Toner Deposition
      const drumPlate: ElectroObject = {
        id: 'obj-imaging-drum',
        name: 'Photoconductor Drum (+)',
        materialId: 'glass',
        shape: 'rod',
        x: 520,
        y: 250,
        vx: 0,
        vy: 0,
        width: 190,
        height: 36,
        rotation: 90,
        isPinned: true,
        isGrounded: false,
        charge: 19.0,
        capacityNc: 35,
        surfaceCharges: [],
        dipoles: [],
      };
      updateSurfaceChargeDots(drumPlate);

      const amberToner: ElectroObject = {
        id: 'obj-toner-resin',
        name: 'Resin Toner Bead (-)',
        materialId: 'amber',
        shape: 'rod',
        x: 250,
        y: 190,
        vx: 0,
        vy: 0,
        width: 82,
        height: 24,
        rotation: 0,
        isPinned: false,
        isGrounded: false,
        charge: -9.0,
        capacityNc: 25,
        surfaceCharges: [],
        dipoles: [],
      };
      updateSurfaceChargeDots(amberToner);

      const pvcToner: ElectroObject = {
        id: 'obj-toner-polymer',
        name: 'Polymer Toner (-)',
        materialId: 'pvc',
        shape: 'rod',
        x: 245,
        y: 315,
        vx: 0,
        vy: 0,
        width: 82,
        height: 24,
        rotation: 0,
        isPinned: false,
        isGrounded: false,
        charge: -10.0,
        capacityNc: 25,
        surfaceCharges: [],
        dipoles: [],
      };
      updateSurfaceChargeDots(pvcToner);

      setOverlayConfig((prev) => ({ ...prev, liveCoulombMotion: true, coulombDamping: 0.35 }));
      setObjects([drumPlate, amberToner, pvcToner]);
      setSelectedObjectId(amberToner.id);
      setFrictionLog(
        'Practical App — Xerographic Toner Transfer: Negatively charged polymer toner beads drift across the air gap toward the +19 nC imaging drum.'
      );
    } else if (scenarioKey === 'scope_ruler_wool') {
      const scope = createElectroscopeObject(530, 265, 0);
      const ruler = createSpecimenObject('plastic_ruler', 220, 190, 0, false);
      const wool = createSpecimenObject('wool', 220, 325, 0, false);
      setObjects([scope, ruler, wool]);
      setSelectedObjectId(ruler.id);
      setFrictionLog('Loaded Ruler + Wool Lab: Rub them together to charge the ruler (−), then approach or touch the brass knob!');
    } else if (scenarioKey === 'scope_glass_silk') {
      const scope = createElectroscopeObject(530, 265, 0);
      const glass = createSpecimenObject('glass', 220, 190, 0, false);
      const silk = createSpecimenObject('silk', 220, 325, 0, false);
      setObjects([scope, glass, silk]);
      setSelectedObjectId(glass.id);
      setFrictionLog('Loaded Glass + Silk Lab: Rub them together to charge the Glass Rod (+), then test induction & conduction!');
    } else if (scenarioKey === 'scope_induction_demo') {
      const scope = createElectroscopeObject(530, 265, 0);
      const balloon = createSpecimenObject('teflon', 340, 145, -16.0, false);
      setObjects([scope, balloon]);
      setSelectedObjectId(balloon.id);
      setFrictionLog('Induction Lab: Leaves diverge while (−) balloon is near knob! Click "Ground Knob", unground, then drag balloon away to trap permanent (+) charge!');
    } else if (scenarioKey === 'scope_charged_test') {
      const scope = createElectroscopeObject(530, 265, -12.0);
      const ruler = createSpecimenObject('plastic_ruler', 210, 175, -12.0, false);
      const glass = createSpecimenObject('glass', 210, 315, 12.0, false);
      setObjects([scope, ruler, glass]);
      setSelectedObjectId(ruler.id);
      setFrictionLog('Polarity Test: Scope is (−12 nC). Bring (−) Ruler near knob to spread leaves wider, or (+) Glass Rod to drop them!');
    }
  };

  // Programmatic Friction trigger from toolbar
  const handleTriggerFriction = (sourceId: string, targetId: string) => {
    setFrictionTriggerEvent({
      sourceId,
      targetId,
      timestamp: Date.now(),
    });
  };

  // Single-object lab cloth rub trigger
  const handleSingleRub = (objectId: string) => {
    setSingleRubEvent({
      objectId,
      timestamp: Date.now(),
    });
  };

  // Clear one slot in Module 1
  const handleClearSlot = (slotIndex: 0 | 1) => {
    setIsStageExpanded(false);
    setObjects((prev) => {
      const target = findSlotObject(prev, slotIndex);
      if (!target) return prev;
      const remaining = prev.filter((o) => o.id !== target.id);
      if (selectedObjectId === target.id) {
        setSelectedObjectId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
    setFrictionLog(
      slotIndex === 0
        ? 'Cleared Object 1. Select a new material from the Left panel.'
        : 'Cleared Object 2. Select a new material from the Right panel.'
    );
  };

  // Reset Scene
  const handleResetScene = () => {
    setIsStageExpanded(false);
    if (moduleMode === 'module1') {
      setObjects([]);
      setSelectedObjectId(null);
      setFrictionLog('Stage cleared. Step 1: Select Object 1 on the Left, then Step 2: Select Object 2 on the Right.');
    } else if (moduleMode === 'module3') {
      setObjects([]);
      setSelectedObjectId(null);
      setOverlayConfig((prev) => ({ ...prev, liveCoulombMotion: false }));
      setFrictionLog('Point Charges stage cleared. Add a + or − charge to inspect field lines and vectors.');
    } else if (moduleMode === 'module4') {
      const scope = createElectroscopeObject(380, 260, 0);
      setObjects([scope]);
      setSelectedObjectId(null);
      setStagedPrepObject(null);
      setFrictionLog('Electroscope bench reset. Step 1: Pick a classroom object from the Left panel.');
    } else {
      setObjects([]);
      setSelectedObjectId(null);
      setSensor({ x: 480, y: 200, isActive: true });
      setFrictionLog('Stage cleared. Select materials from the left catalog to begin.');
    }
  };

  const slot0Obj = findSlotObject(objects, 0);
  const slot1Obj = findSlotObject(objects, 1);

  if (!isUnlocked || showStartup) {
    return (
      <>
        <StartupScreen
          isUnlocked={isUnlocked}
          onUnlockSuccess={() => {
            try {
              sessionStorage.setItem('es_studio_unlocked', 'true');
            } catch {
              // Ignore storage restrictions
            }
            setIsUnlocked(true);
          }}
          onLock={() => {
            try {
              sessionStorage.removeItem('es_studio_unlocked');
            } catch {
              // Ignore storage restrictions
            }
            setIsUnlocked(false);
            setShowStartup(true);
          }}
          onSelectModule={(mode) => {
            setShowStartup(false);
            handleSwitchModule(mode);
          }}
          onOpenToolTab={(tab) => {
            setShowStartup(false);
            if (tab === 'chemistry') {
              setActiveTab('sandbox');
              setIsChemistryOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
        />
        <MaterialChemistryModal
          isOpen={isChemistryOpen}
          onClose={() => setIsChemistryOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* 3-Zone Top Bar Contract */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAITutor={() => setIsAITutorOpen(true)}
        onOpenChemistry={() => setIsChemistryOpen(true)}
        onOpenStartup={() => setShowStartup(true)}
      />

      {/* Workspace Module Switcher & Status Banner */}
      <div className="px-3 lg:px-4 py-1 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[13px] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Segmented Module Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => handleSwitchModule('module1')}
              className={`px-2.5 py-1 rounded-md text-xs lg:text-[13px] font-semibold transition-all whitespace-nowrap shrink-0 ${
                moduleMode === 'module1'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              Module 1: Two Objects
            </button>
            <button
              onClick={() => handleSwitchModule('module2')}
              className={`px-2.5 py-1 rounded-md text-xs lg:text-[13px] font-semibold transition-all whitespace-nowrap shrink-0 ${
                moduleMode === 'module2'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              Module 2: Multi-Object
            </button>
            <button
              onClick={() => handleSwitchModule('module3')}
              className={`px-2.5 py-1 rounded-md text-xs lg:text-[13px] font-semibold transition-all whitespace-nowrap shrink-0 ${
                moduleMode === 'module3'
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              Module 3: Point Charges
            </button>
            <button
              onClick={() => handleSwitchModule('module4')}
              className={`px-2.5 py-1 rounded-md text-xs lg:text-[13px] font-semibold transition-all whitespace-nowrap shrink-0 ${
                moduleMode === 'module4'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              Module 4: Electroscope
            </button>
          </div>

          <span className="text-slate-600 hidden xl:inline">·</span>

          {frictionLog && (
            <span className="text-slate-200 font-medium truncate max-w-lg hidden xl:inline text-[13px]">
              {frictionLog}
            </span>
          )}
        </div>

        {moduleMode === 'module1' ? (
          <div className="hidden sm:flex items-center gap-3 font-mono text-xs lg:text-[13px] text-slate-200 tabular-nums">
            <span className="flex items-center gap-1.5 text-orange-300 font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>2-Body Explorer</span>
            </span>
          </div>
        ) : moduleMode === 'module3' ? (
          <div className="hidden sm:flex items-center gap-4 font-mono text-xs lg:text-[13px] text-slate-200 tabular-nums">
            <div>Charges: <span className="text-pink-400 font-bold">{objects.length}</span></div>
            <div>
              ΣQ:{' '}
              <span className="text-cyan-400 font-bold">
                {(() => {
                  const sumQ = objects.reduce((acc, o) => acc + o.charge, 0);
                  return `${sumQ > 0.05 ? '+' : ''}${sumQ.toFixed(1)} nC`;
                })()}
              </span>
            </div>
            {overlayConfig.showProbe && (
              <div>|E|: <span className="text-emerald-400 font-bold">{probeData.fieldMagnitude} N/C</span></div>
            )}
          </div>
        ) : moduleMode === 'module4' ? (
          <div className="hidden sm:flex items-center gap-3 font-mono text-xs lg:text-[13px] text-slate-200 tabular-nums">
            {(() => {
              const scope = objects.find((o) => o.shape === 'electroscope');
              return (
                <>
                  <div>Leaf θ: <span className="text-amber-300 font-bold">{(scope?.leafAngleDeg ?? 0).toFixed(1)}°</span></div>
                  <div>Scope Q: <span className="text-cyan-300 font-bold">{(scope?.charge ?? 0) > 0.05 ? `+${(scope?.charge ?? 0).toFixed(1)}` : (scope?.charge ?? 0).toFixed(1)} nC</span></div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-4 font-mono text-xs lg:text-[13px] text-slate-200 tabular-nums">
            <div>Objects: <span className="text-cyan-400 font-bold">{objects.length}</span></div>
            <div>Probe: <span className="text-emerald-400 font-bold">{probeData.voltageV} V</span></div>
            <div>|E|: <span className="text-pink-400 font-bold">{probeData.fieldMagnitude} N/C</span></div>
          </div>
        )}
      </div>

      {/* Main Work Area: 3-Column Architecture: [Object Toolbar (Left)] -> [Simulation Canvas (Center)] -> [Physics Controls & Inspector (Right)] */}
      <main className="flex-1 p-2 overflow-hidden flex flex-col lg:flex-row gap-2">
        {activeTab === 'sandbox' && (
          <>
            {/* 1. Left Toolbar */}
            {!isStageExpanded && (
              <ObjectSelectorToolbar
                moduleMode={moduleMode}
                objects={objects}
                selectedObjectId={selectedObjectId}
                setSelectedObjectId={setSelectedObjectId}
                onAddObject={handleAddObject}
                onRemoveObject={handleRemoveObject}
                onAssignSlotMaterial={handleAssignSlotMaterial}
                onUpdateSlotObject={handleUpdateSlotObject}
                onSingleRub={handleSingleRub}
                onClearSlot={handleClearSlot}
                onLoadScenario={handleLoadScenario}
                onTriggerFriction={handleTriggerFriction}
                onAddPointCharge={handleAddPointCharge}
                onUpdatePointCharge={handleUpdatePointCharge}
                onLoadPointChargePreset={handleLoadPointChargePreset}
                guidedElectroscopeMode={guidedElectroscopeMode}
                stagedPrepObject={stagedPrepObject}
                onRubStagedPrep={handleRubStagedPrep}
                onPlaceStagedPrep={handlePlaceStagedPrep}
                onCancelStagedPrep={handleCancelStagedPrep}
              />
            )}

            {/* 2. Center: Interactive Stage Canvas + Guided Step 3 Rub Controls */}
            <div className="flex-1 h-full min-h-[360px] flex flex-col gap-1.5 min-w-0">
              {moduleMode === 'module1' && (
                <div
                  className={`rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[13px] shrink-0 border transition-all ${
                    slot0Obj && slot1Obj
                      ? 'bg-orange-950/25 border-orange-400/70 shadow-[0_0_20px_rgba(251,146,60,0.12)]'
                      : 'bg-slate-900/95 border-slate-800'
                  }`}
                >
                  {slot0Obj && slot1Obj ? (
                    <>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-orange-400 mr-1 whitespace-nowrap">
                          Step 3 · Rub to Charge
                        </span>
                        <button
                          onClick={() => handleSingleRub(slot0Obj.id)}
                          className="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                          <span>Rub Object 1</span>
                        </button>
                        <button
                          onClick={() => handleSingleRub(slot1Obj.id)}
                          className="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                          <span>Rub Object 2</span>
                        </button>
                        <button
                          onClick={() => handleTriggerFriction(slot0Obj.id, slot1Obj.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-orange-400/60 text-orange-200 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          Rub 1 &amp; 2 Together
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <button
                          onClick={() => handleSetPairPolarity('neutral')}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold whitespace-nowrap shrink-0"
                        >
                          Discharge (0)
                        </button>
                        <button
                          onClick={handleResetScene}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500/50 hover:text-rose-300 text-slate-300 font-semibold whitespace-nowrap shrink-0"
                        >
                          Clear Stage
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
                        <span className="text-orange-300 font-semibold text-[13px] truncate">
                          {!slot0Obj
                            ? 'Step 1: Select Object 1 from the Left panel.'
                            : 'Step 2: Select Object 2 from the Right panel.'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <button
                          onClick={() => handleLoadRepelPair('scotch_tape')}
                          className="px-2.5 py-1 bg-sky-950/60 border border-sky-500/40 hover:bg-sky-900/60 text-sky-200 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          2× Scotch Tape (Repel)
                        </button>
                        <button
                          onClick={() => handleLoadRepelPair('styrofoam')}
                          className="px-2.5 py-1 bg-slate-800/80 border border-slate-600/60 hover:bg-slate-700/80 text-slate-100 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          2× Styrofoam (Repel)
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {moduleMode === 'module3' && (
                <div className="rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[13px] shrink-0 border bg-slate-900/95 border-slate-800">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleAddPointCharge(10)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950/75 border border-cyan-500/60 hover:bg-cyan-900/75 text-cyan-100 font-bold text-xs flex items-center gap-1 whitespace-nowrap shrink-0 transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add +10 nC</span>
                    </button>
                    <button
                      onClick={() => handleAddPointCharge(-10)}
                      className="px-2.5 py-1 rounded-lg bg-pink-950/75 border border-pink-500/60 hover:bg-pink-900/75 text-pink-100 font-bold text-xs flex items-center gap-1 whitespace-nowrap shrink-0 transition-all active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Add −10 nC</span>
                    </button>

                    <button
                      onClick={() =>
                        setOverlayConfig((prev) => ({
                          ...prev,
                          liveCoulombMotion: !prev.liveCoulombMotion,
                        }))
                      }
                      className={`px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                        overlayConfig.liveCoulombMotion
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-sm'
                          : 'bg-slate-950 hover:border-emerald-400/70 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {overlayConfig.liveCoulombMotion ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Animate &amp; Move: ON</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Animate &amp; Move: OFF</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() =>
                        setOverlayConfig((prev) => ({
                          ...prev,
                          showFieldVectorGrid: !prev.showFieldVectorGrid,
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                        overlayConfig.showFieldVectorGrid
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm'
                          : 'bg-slate-950 hover:border-cyan-400/60 text-slate-300 border-slate-700'
                      }`}
                      title="Toggle background grid showing E-field vector direction and magnitude at every intersection"
                    >
                      <Grid3x3 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Vector Grid: {overlayConfig.showFieldVectorGrid ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <button
                      onClick={handleResetScene}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500/50 hover:text-rose-300 text-slate-200 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset / Clear</span>
                    </button>
                  </div>
                </div>
              )}

              {moduleMode === 'module4' && (() => {
                const guide = getElectroscopeGuideState(objects, stagedPrepObject);
                const scope = objects.find((o) => o.shape === 'electroscope');
                const selectedRub =
                  objects.find(
                    (o) => o.id === selectedObjectId && o.shape !== 'electroscope' && o.shape !== 'point_charge'
                  ) || objects.find((o) => o.shape !== 'electroscope' && o.shape !== 'point_charge');
                const rubPartner = selectedRub
                  ? objects.find(
                      (o) => o.id !== selectedRub.id && o.shape !== 'electroscope' && o.shape !== 'point_charge'
                    )
                  : undefined;
                const canPlaceStaged = Boolean(
                  stagedPrepObject &&
                    (stagedPrepObject.materialId === 'ground' || Math.abs(stagedPrepObject.charge) >= 0.5)
                );

                return (
                  <div className="rounded-xl px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs lg:text-[13px] shrink-0 border bg-slate-900/95 border-slate-800">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={handleToggleGuidedElectroscope}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                          guidedElectroscopeMode
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                        title="Toggle step-by-step student guidance on or off"
                      >
                        <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Guide: {guidedElectroscopeMode ? 'ON' : 'OFF'}</span>
                      </button>

                      {guidedElectroscopeMode && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/40 text-amber-200 font-semibold text-xs whitespace-nowrap">
                          {guide.shortTitle}
                        </span>
                      )}

                      {stagedPrepObject ? (
                        <>
                          {stagedPrepObject.materialId !== 'ground' && (
                            <button
                              onClick={handleRubStagedPrep}
                              className={`px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1 whitespace-nowrap shrink-0 ${
                                !canPlaceStaged ? 'ring-2 ring-amber-200 animate-pulse' : ''
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                              <span>1. Rub {stagedPrepObject.name}</span>
                            </button>
                          )}
                          <button
                            onClick={handlePlaceStagedPrep}
                            disabled={!canPlaceStaged}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0 transition-all ${
                              canPlaceStaged
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-sm active:scale-95'
                                : 'bg-slate-950 border-slate-700 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {canPlaceStaged ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Lock className="w-3.5 h-3.5 shrink-0" />}
                            <span>2. Place on Stage</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {selectedRub && (
                            <button
                              onClick={() => handleSingleRub(selectedRub.id)}
                              className={`px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1 whitespace-nowrap shrink-0 ${
                                guidedElectroscopeMode && guide.step === 2
                                  ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-slate-900'
                                  : ''
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                              <span>Rub {selectedRub.name}</span>
                            </button>
                          )}

                          {selectedRub && rubPartner && (
                            <button
                              onClick={() => handleTriggerFriction(selectedRub.id, rubPartner.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-amber-400/60 text-amber-200 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0"
                            >
                              Rub Pair Together
                            </button>
                          )}
                        </>
                      )}

                      {scope && (
                        <button
                          onClick={() =>
                            setObjects((prev) =>
                              prev.map((o) =>
                                o.id === scope.id ? { ...o, isGrounded: !o.isGrounded } : o
                              )
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0 transition-all ${
                            scope.isGrounded
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : guidedElectroscopeMode && guide.step === 4
                              ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/40'
                              : 'bg-slate-950 border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/50'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>{scope.isGrounded ? 'Grounded (0 V)' : 'Ground Knob'}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <button
                        onClick={() =>
                          setObjects((prev) =>
                            prev.map((o) =>
                              o.shape === 'electroscope'
                                ? { ...o, charge: 0, leafChargeNc: 0, knobChargeNc: 0, isGrounded: false }
                                : o
                            )
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-400/60 text-slate-200 font-semibold whitespace-nowrap shrink-0"
                      >
                        Discharge Scope
                      </button>
                      <button
                        onClick={handleResetScene}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500/50 hover:text-rose-300 text-slate-200 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Bench</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="flex-1 min-h-0">
                <SimulationCanvas
                  moduleMode={moduleMode}
                  objects={objects}
                  setObjects={setObjects}
                  selectedObjectId={selectedObjectId}
                  setSelectedObjectId={setSelectedObjectId}
                  overlayConfig={overlayConfig}
                  sensor={sensor}
                  setSensor={setSensor}
                  onProbeDataUpdate={setProbeData}
                  onFrictionLog={setFrictionLog}
                  frictionTriggerEvent={frictionTriggerEvent}
                  singleRubEvent={singleRubEvent}
                  isStageExpanded={isStageExpanded}
                  onToggleExpandStage={() => setIsStageExpanded((v) => !v)}
                  guidedElectroscopeMode={guidedElectroscopeMode}
                  onToggleGuidedElectroscope={handleToggleGuidedElectroscope}
                  stagedPrepObject={stagedPrepObject}
                  onRubStagedPrep={handleRubStagedPrep}
                  onPlaceStagedPrep={handlePlaceStagedPrep}
                  onCancelStagedPrep={handleCancelStagedPrep}
                />
              </div>
            </div>

            {/* 3. Right: Object 2 (Module 1) OR Physics Controls & Advanced Inspector */}
            {!isStageExpanded && (
              <ControlPanel
                moduleMode={moduleMode}
                overlayConfig={overlayConfig}
                setOverlayConfig={setOverlayConfig}
                sensor={sensor}
                setSensor={setSensor}
                probeData={probeData}
                objects={objects}
                setObjects={setObjects}
                selectedObjectId={selectedObjectId}
                setSelectedObjectId={setSelectedObjectId}
                onAssignSlotMaterial={handleAssignSlotMaterial}
                onUpdateSlotObject={handleUpdateSlotObject}
                onSingleRub={handleSingleRub}
                onClearSlot={handleClearSlot}
                onResetScene={handleResetScene}
                guidedElectroscopeMode={guidedElectroscopeMode}
                onToggleGuidedElectroscope={handleToggleGuidedElectroscope}
                stagedPrepObject={stagedPrepObject}
              />
            )}
          </>
        )}

        {activeTab === 'labs' && (
          <div className="flex-1 h-full overflow-y-auto flex flex-col lg:flex-row gap-5">
            <div className="flex-1 h-full min-h-[400px]">
              <SimulationCanvas
                objects={objects}
                setObjects={setObjects}
                selectedObjectId={selectedObjectId}
                setSelectedObjectId={setSelectedObjectId}
                overlayConfig={overlayConfig}
                sensor={sensor}
                setSensor={setSensor}
                onProbeDataUpdate={setProbeData}
                onFrictionLog={setFrictionLog}
                frictionTriggerEvent={frictionTriggerEvent}
                singleRubEvent={singleRubEvent}
              />
            </div>
            <div className="w-full lg:w-96">
              <LabGuidePanel
                objects={objects}
                sensor={sensor}
                probeData={probeData}
                setObjects={setObjects}
                setOverlayConfig={setOverlayConfig}
              />
            </div>
          </div>
        )}

        {activeTab === 'graphs' && (
          <div className="flex-1 h-full overflow-y-auto flex flex-col gap-5">
            <GraphingPanel objects={objects} probeData={probeData} />
            <div className="h-[360px]">
              <SimulationCanvas
                objects={objects}
                setObjects={setObjects}
                selectedObjectId={selectedObjectId}
                setSelectedObjectId={setSelectedObjectId}
                overlayConfig={overlayConfig}
                sensor={sensor}
                setSensor={setSensor}
                onProbeDataUpdate={setProbeData}
                onFrictionLog={setFrictionLog}
                frictionTriggerEvent={frictionTriggerEvent}
              />
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="flex-1 h-full overflow-y-auto">
            <QuizPanel />
          </div>
        )}
      </main>

      {/* Modals */}
      <MaterialChemistryModal
        isOpen={isChemistryOpen}
        onClose={() => setIsChemistryOpen(false)}
      />

      <AIAssistantModal
        isOpen={isAITutorOpen}
        onClose={() => setIsAITutorOpen(false)}
        objects={objects}
        probeData={probeData}
      />
    </div>
  );
}
