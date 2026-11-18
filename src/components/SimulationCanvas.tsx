import React, { useRef, useEffect, useState } from 'react';
import { Maximize2, Minimize2, Sparkles, Check, Lock, X } from 'lucide-react';
import {
  ElectroObject,
  VisualOverlayConfig,
  ProbeSensor,
  ProbeData,
  DynamicChargeParticle,
  ContactMigrationEvent,
  InterfaceChargeParticle,
  FieldStreamParticle,
  ModuleMode,
} from '../types/electrostatics';
import { MATERIALS_DATABASE } from '../physics/materialsData';
import {
  calculateElectricField,
  calculateElectricPotential,
  calculateCoulombForces,
  processFrictionRubbing,
  rubSingleObjectWithLabCloth,
  processConductionAndGrounding,
  generateElectricFieldLines,
  updateDielectricDipoles,
  stepDampedCoulombDynamics,
  processAirBreakdownArcs,
  updateElectroscopePhysics,
  getElectroscopeTerminals,
} from '../physics/electrostaticsEngine';
import { drawRealisticMaterialBody, drawSurfaceChargeShimmer } from '../physics/materialRenderer';
import { getElectroscopeGuideState } from '../utils/electroscopeGuide';

interface SimulationCanvasProps {
  moduleMode?: ModuleMode;
  objects: ElectroObject[];
  setObjects: React.Dispatch<React.SetStateAction<ElectroObject[]>>;
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
  overlayConfig: VisualOverlayConfig;
  sensor: ProbeSensor;
  setSensor: React.Dispatch<React.SetStateAction<ProbeSensor>>;
  onProbeDataUpdate?: (data: ProbeData) => void;
  onFrictionLog?: (msg: string) => void;
  frictionTriggerEvent?: { sourceId: string; targetId: string; timestamp: number } | null;
  singleRubEvent?: { objectId: string; timestamp: number } | null;
  isStageExpanded?: boolean;
  onToggleExpandStage?: () => void;
  guidedElectroscopeMode?: boolean;
  onToggleGuidedElectroscope?: () => void;
  stagedPrepObject?: ElectroObject | null;
  onRubStagedPrep?: () => void;
  onPlaceStagedPrep?: () => void;
  onCancelStagedPrep?: () => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  moduleMode = 'module2',
  objects,
  setObjects,
  selectedObjectId,
  setSelectedObjectId,
  overlayConfig,
  sensor,
  setSensor,
  onProbeDataUpdate,
  onFrictionLog,
  frictionTriggerEvent,
  singleRubEvent,
  isStageExpanded = false,
  onToggleExpandStage,
  guidedElectroscopeMode = true,
  onToggleGuidedElectroscope,
  stagedPrepObject = null,
  onRubStagedPrep,
  onPlaceStagedPrep,
  onCancelStagedPrep,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs synced to latest props so the rAF loop runs smoothly at 60fps without teardown thrashing
  const moduleModeRef = useRef<ModuleMode>(moduleMode);
  const guidedElectroscopeModeRef = useRef<boolean>(guidedElectroscopeMode);
  const stagedPrepObjectRef = useRef<ElectroObject | null>(stagedPrepObject);
  const objectsRef = useRef<ElectroObject[]>(objects);
  const overlayConfigRef = useRef<VisualOverlayConfig>(overlayConfig);
  const sensorRef = useRef<ProbeSensor>(sensor);
  const selectedObjectIdRef = useRef<string | null>(selectedObjectId);
  const onProbeDataUpdateRef = useRef(onProbeDataUpdate);
  const onFrictionLogRef = useRef(onFrictionLog);
  const manuallyMovedScopeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    moduleModeRef.current = moduleMode;
  }, [moduleMode]);
  useEffect(() => {
    guidedElectroscopeModeRef.current = guidedElectroscopeMode;
  }, [guidedElectroscopeMode]);
  useEffect(() => {
    stagedPrepObjectRef.current = stagedPrepObject;
  }, [stagedPrepObject]);

  useEffect(() => {
    const prevById = new Map(objectsRef.current.map((o) => [o.id, o]));
    objectsRef.current = objects.map((o) => {
      const live = prevById.get(o.id);
      if (live && draggingId.current === o.id) {
        return { ...o, x: live.x, y: live.y, vx: 0, vy: 0 };
      }
      return o;
    });
  }, [objects]);
  useEffect(() => {
    overlayConfigRef.current = overlayConfig;
  }, [overlayConfig]);
  useEffect(() => {
    sensorRef.current = sensor;
  }, [sensor]);
  useEffect(() => {
    selectedObjectIdRef.current = selectedObjectId;
  }, [selectedObjectId]);
  useEffect(() => {
    onProbeDataUpdateRef.current = onProbeDataUpdate;
  }, [onProbeDataUpdate]);
  useEffect(() => {
    onFrictionLogRef.current = onFrictionLog;
  }, [onFrictionLog]);

  // Sparks, Corona Arcs, Cloth Rub Sweeps, Pair ΔW Stream, Per-Object Agitation & Transferring Animated Charges
  const sparksRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }>>([]);
  const coronaArcsRef = useRef<Array<{ x1: number; y1: number; x2: number; y2: number; life: number; seed: number }>>([]);
  const clothRubEffectsRef = useRef<Array<{ objectId: string; life: number; maxLife: number; deltaSign: 1 | -1 }>>([]);
  const pairRubEffectsRef = useRef<Array<{ donorId: string; acceptorId: string; deltaW: number; life: number; maxLife: number }>>([]);
  const rubAgitationRef = useRef<Record<string, number>>({});
  const movingTransferParticlesRef = useRef<DynamicChargeParticle[]>([]);
  const interfaceParticlesRef = useRef<InterfaceChargeParticle[]>([]);
  const activeContactsRef = useRef<ContactMigrationEvent[]>([]);
  const interfaceSpawnAccumRef = useRef<Record<string, number>>({});
  const lastContactLogTimeRef = useRef<Record<string, number>>({});
  const fieldStreamersRef = useRef<FieldStreamParticle[]>([]);

  const lastPointerPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const draggingId = useRef<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const probeOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastDragSyncTimeRef = useRef<number>(0);
  const isDraggingProbe = useRef<boolean>(false);
  const globalClockRef = useRef<number>(0);

  const probeReadoutRef = useRef<ProbeData>({
    x: 0,
    y: 0,
    voltageV: 0,
    fieldEx: 0,
    fieldEy: 0,
    fieldMagnitude: 0,
    netChargeDensity: 0,
  });

  const [canvasDimensions, setCanvasDimensions] = useState({ width: 900, height: 600 });
  const [isPrepRubbing, setIsPrepRubbing] = useState(false);

  useEffect(() => {
    if (!isPrepRubbing) return;
    const t = setTimeout(() => setIsPrepRubbing(false), 450);
    return () => clearTimeout(t);
  }, [isPrepRubbing]);

  // Handle Resize via ResizeObserver so expanding/collapsing sidebars resizes the canvas immediately
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setCanvasDimensions((prev) => {
        const nextW = Math.max(400, clientWidth);
        const nextH = Math.max(300, clientHeight);
        if (prev.width === nextW && prev.height === nextH) return prev;
        return { width: nextW, height: nextH };
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Keep the Gold-Leaf Electroscope cleanly centered in Module 4 until the user drags it manually
  useEffect(() => {
    if (moduleMode !== 'module4') return;
    const scope = objects.find((o) => o.shape === 'electroscope');
    if (!scope || manuallyMovedScopeIdsRef.current.has(scope.id) || draggingId.current === scope.id) return;

    const targetX = Math.round(canvasDimensions.width / 2);
    const targetY = Math.round(canvasDimensions.height / 2 - 4);
    if (Math.abs(scope.x - targetX) > 2 || Math.abs(scope.y - targetY) > 2) {
      setObjects((prev) =>
        prev.map((o) =>
          o.id === scope.id && !manuallyMovedScopeIdsRef.current.has(o.id)
            ? { ...o, x: targetX, y: targetY, vx: 0, vy: 0 }
            : o
        )
      );
    }
  }, [moduleMode, canvasDimensions.width, canvasDimensions.height, objects, setObjects]);

  // Handle programmatic friction trigger from the toolbar
  useEffect(() => {
    if (!frictionTriggerEvent) return;
    const { sourceId, targetId } = frictionTriggerEvent;
    const currentObjects = objectsRef.current;
    const sourceObj = currentObjects.find((o) => o.id === sourceId);
    const targetObj = currentObjects.find((o) => o.id === targetId);
    if (!sourceObj || !targetObj) return;

    const frictionResult = processFrictionRubbing(sourceObj, targetObj, 160, 0.75, true);
    if (frictionResult) {
      const deltaW = frictionResult.workFunctionDiffEv;
      rubAgitationRef.current[sourceObj.id] = 2.0;
      rubAgitationRef.current[targetObj.id] = 2.0;

      pairRubEffectsRef.current.push({
        donorId: frictionResult.donorId,
        acceptorId: frictionResult.acceptorId,
        deltaW,
        life: 1.15,
        maxLife: 1.15,
      });

      const sparkCount = Math.max(8, Math.min(20, Math.round(6 + deltaW * 7)));
      for (let s = 0; s < sparkCount; s++) {
        sparksRef.current.push({
          x: frictionResult.sparkX + (Math.random() - 0.5) * 34,
          y: frictionResult.sparkY + (Math.random() - 0.5) * 34,
          vx: (Math.random() - 0.5) * 165,
          vy: (Math.random() - 0.5) * 165,
          life: 0.9 + Math.random() * 0.45,
          color: Math.random() > 0.45 ? '#f472b6' : '#38bdf8',
          size: 3.5 + Math.random() * 2.5,
        });
      }

      // Staggered small electron-like particles scaling in count, speed & energy with ΔW (work function difference)
      const streamCount = Math.max(8, Math.min(28, Math.round(7 + deltaW * 11)));
      const speedScale = 1.1 + Math.min(1.6, deltaW * 0.75);
      const donorObj = currentObjects.find((o) => o.id === frictionResult.donorId) || sourceObj;

      for (let c = 0; c < streamCount; c++) {
        const arcOffset = ((c % 5) - 2) * 16 + (Math.random() - 0.5) * 10;
        movingTransferParticlesRef.current.push({
          id: `transfer-cmd-${Date.now()}-${c}`,
          x: donorObj.x + (Math.random() - 0.5) * donorObj.width * 0.4,
          y: donorObj.y + (Math.random() - 0.5) * donorObj.height * 0.4,
          vx: 0,
          vy: 0,
          sign: -1,
          sourceObjectId: frictionResult.donorId,
          targetObjectId: frictionResult.acceptorId,
          progress: 0,
          life: 1.5,
          delay: (c / streamCount) * 0.58,
          speedScale,
          radius: 2.8 + Math.min(1.2, deltaW * 0.45),
          arcOffset,
          trail: [{ x: donorObj.x, y: donorObj.y }],
        });
      }

      if (onFrictionLogRef.current) onFrictionLogRef.current(frictionResult.text);
      setObjects((prev) =>
        prev.map((o) => {
          const live = objectsRef.current.find((r) => r.id === o.id);
          return live ? { ...live, surfaceCharges: [...live.surfaceCharges], dipoles: [...live.dipoles] } : o;
        })
      );
    } else {
      const matA = MATERIALS_DATABASE[sourceObj.materialId];
      const matB = MATERIALS_DATABASE[targetObj.materialId];
      if (matA && matB && Math.abs(matA.triboOrder - matB.triboOrder) < 0.5) {
        if (onFrictionLogRef.current) {
          onFrictionLogRef.current(
            `Both objects are ${matA.name} (equal work function W=${matA.workFunctionEv} eV): rubbing them together transfers 0 e⁻. Use "Rub Object 1" or "Rub Object 2" to charge them individually!`
          );
        }
      }
    }
  }, [frictionTriggerEvent, setObjects]);

  // Handle single-object lab cloth rubbing trigger
  useEffect(() => {
    if (!singleRubEvent) return;
    const { objectId } = singleRubEvent;
    const targetObj = objectsRef.current.find((o) => o.id === objectId);
    if (!targetObj) return;

    const result = rubSingleObjectWithLabCloth(targetObj);
    if (result) {
      rubAgitationRef.current[targetObj.id] = 1.6;
      clothRubEffectsRef.current.push({
        objectId: targetObj.id,
        life: 0.75,
        maxLife: 0.75,
        deltaSign: result.deltaSign,
      });

      const padX = targetObj.x;
      const padY = targetObj.y - targetObj.height * 0.42;

      for (let s = 0; s < 10; s++) {
        sparksRef.current.push({
          x: targetObj.x + (Math.random() - 0.5) * targetObj.width * 0.6,
          y: targetObj.y + (Math.random() - 0.5) * targetObj.height * 0.6,
          vx: (Math.random() - 0.5) * 150,
          vy: (Math.random() - 0.5) * 150,
          life: 0.85 + Math.random() * 0.4,
          color: s % 3 === 0 ? '#fb923c' : result.deltaSign < 0 ? '#ec4899' : '#38bdf8',
          size: 3.5 + Math.random() * 2.5,
        });
      }

      // Emit flying e⁻ transfer particles between the lab exciter pad and the object surface
      if (result.transferredChargeNc > 0.1) {
        for (let c = 0; c < 10; c++) {
          const offsetX = (Math.random() - 0.5) * targetObj.width * 0.65;
          const offsetY = (Math.random() - 0.5) * targetObj.height * 0.55;
          const objPtX = targetObj.x + offsetX;
          const objPtY = targetObj.y + offsetY;
          const padPtX = padX + (Math.random() - 0.5) * 34;
          const padPtY = padY + (Math.random() - 0.5) * 16;

          const startX = result.deltaSign < 0 ? padPtX : objPtX;
          const startY = result.deltaSign < 0 ? padPtY : objPtY;
          const endX = result.deltaSign < 0 ? objPtX : padPtX;
          const endY = result.deltaSign < 0 ? objPtY : padPtY;

          movingTransferParticlesRef.current.push({
            id: `transfer-cloth-${Date.now()}-${c}`,
            x: startX,
            y: startY,
            vx: (endX - startX) * 2.1,
            vy: (endY - startY) * 2.1,
            sign: -1,
            progress: 0,
            life: 1.0,
            trail: [{ x: startX, y: startY }],
          });
        }
      }

      if (onFrictionLogRef.current) onFrictionLogRef.current(result.text);
      setObjects((prev) =>
        prev.map((o) => {
          const live = objectsRef.current.find((r) => r.id === o.id);
          return live ? { ...live, surfaceCharges: [...live.surfaceCharges], dipoles: [...live.dipoles] } : o;
        })
      );
    }
  }, [singleRubEvent, setObjects]);

  // Main Render & Physics Animation Loop (stable rAF loop)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let lastProbeEmitTime = 0;
    let lastChargeSyncTime = 0;
    let lastArcCheckTime = 0;
    let lastChargeMap: Record<string, number> = {};
    let lastPosMap: Record<string, { x: number; y: number }> = {};
    let lastLeafAngleMap: Record<string, number> = {};

    if (fieldStreamersRef.current.length === 0) {
      for (let i = 0; i < 60; i++) {
        fieldStreamersRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: 1.2 + Math.random() * 2.0,
          lineIdx: 0,
          progress: Math.random(),
        });
      }
    }

    const render = (time: number) => {
      const cfg = overlayConfigRef.current;
      const currentObjects = objectsRef.current;
      const currentSensor = sensorRef.current;
      const currentSelectedId = selectedObjectIdRef.current;

      const dt = Math.min(0.05, (time - lastTime) / 1000) * cfg.simulationSpeed;
      lastTime = time;
      globalClockRef.current += dt;
      const clock = globalClockRef.current;

      // 1. Physics Engine Step: Conduction, Grounding, Contact Migration, Electroscope Induction & Dipoles
      const contactEvents = processConductionAndGrounding(currentObjects, dt, cfg.humidityPercent);
      activeContactsRef.current = contactEvents;
      updateElectroscopePhysics(currentObjects, dt);
      updateDielectricDipoles(currentObjects);

      // 1B. Damped Newtonian Coulomb Dynamics (inertia, Stokes viscous air drag, surface friction)
      const forces = calculateCoulombForces(currentObjects);
      if (cfg.liveCoulombMotion && currentObjects.length >= 2) {
        stepDampedCoulombDynamics(
          currentObjects,
          forces,
          dt,
          cfg.coulombDamping ?? 0.35,
          draggingId.current,
          canvas.width,
          canvas.height
        );
      }

      // 1C. Paschen Dielectric Air Breakdown & Corona Discharge Arcs
      if (time - lastArcCheckTime > 260) {
        lastArcCheckTime = time;
        const newArcs = processAirBreakdownArcs(currentObjects, cfg.humidityPercent);
        for (const arc of newArcs) {
          coronaArcsRef.current.push({
            ...arc,
            life: 0.32,
            seed: Math.random() * 100,
          });
        }
      }

      // Periodically sync charge/position/leaf-angle readouts to React UI
      if (!isDraggingProbe.current && time - lastChargeSyncTime > 220) {
        lastChargeSyncTime = time;
        let changed = false;
        for (const o of currentObjects) {
          const prevQ = lastChargeMap[o.id];
          const prevP = lastPosMap[o.id];
          const prevA = lastLeafAngleMap[o.id];
          const angleNow = o.leafAngleDeg ?? 0;
          if (
            prevQ === undefined ||
            Math.abs(o.charge - prevQ) > 0.08 ||
            !prevP ||
            Math.hypot(o.x - prevP.x, o.y - prevP.y) > 6 ||
            prevA === undefined ||
            Math.abs(angleNow - prevA) > 0.8
          ) {
            changed = true;
            lastChargeMap[o.id] = o.charge;
            lastPosMap[o.id] = { x: o.x, y: o.y };
            lastLeafAngleMap[o.id] = angleNow;
          }
        }
        if (changed) {
          setObjects((prev) =>
            prev.map((o) => {
              const live = objectsRef.current.find((r) => r.id === o.id);
              if (!live) return o;
              if (draggingId.current === o.id) {
                return {
                  ...live,
                  surfaceCharges: [...live.surfaceCharges],
                  dipoles: [...live.dipoles],
                };
              }
              return { ...live, surfaceCharges: [...live.surfaceCharges], dipoles: [...live.dipoles] };
            })
          );
        }
      }

      // 2. Compute External E-Field per object & Animate Charge Drift / Rub Agitation / Induction
      const externalFieldById: Record<string, { Ex: number; Ey: number; magnitude: number }> = {};
      for (const obj of currentObjects) {
        if (rubAgitationRef.current[obj.id] > 0) {
          rubAgitationRef.current[obj.id] = Math.max(0, rubAgitationRef.current[obj.id] - dt);
        }
        externalFieldById[obj.id] =
          currentObjects.length > 1
            ? calculateElectricField(
                obj.x,
                obj.y,
                currentObjects.filter((other) => other.id !== obj.id)
              )
            : { Ex: 0, Ey: 0, magnitude: 0 };
      }

      if (cfg.animateMovingCharges) {
        for (const obj of currentObjects) {
          const mat = MATERIALS_DATABASE[obj.materialId];
          const isConductor = mat?.category === 'conductor';
          const extField = externalFieldById[obj.id] || { Ex: 0, Ey: 0, magnitude: 0 };
          const agitation = rubAgitationRef.current[obj.id] ?? 0;
          const fieldBoost = Math.min(2.6, extField.magnitude / 600);

          if (obj.surfaceCharges.length > 0) {
            const rotRad = (obj.rotation * Math.PI) / 180;
            const extAngleLocal = Math.atan2(extField.Ey, extField.Ex) - rotRad;

            for (let i = 0; i < obj.surfaceCharges.length; i++) {
              const sc = obj.surfaceCharges[i];
              if (sc.pulsePhase !== undefined) {
                sc.pulsePhase += dt * (3.0 + agitation * 8.0 + fieldBoost * 5.0);
              }

              if (isConductor) {
                // Free charges drift faster around surface when rubbed or exposed to another object's field,
                // and migrate toward the induced pole (along +E for (+), opposite E for (-))
                const r = Math.max(0.18, Math.hypot(sc.relX, sc.relY));
                let angle = Math.atan2(sc.relY, sc.relX);
                const dirSign = i % 3 === 0 ? -0.65 : 1;
                angle += dt * dirSign * (0.55 + agitation * 2.2 + fieldBoost * 2.0);

                if (extField.magnitude > 80) {
                  const targetAngle = sc.sign > 0 ? extAngleLocal : extAngleLocal + Math.PI;
                  const diff = Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle));
                  angle += diff * Math.min(1, dt * fieldBoost * 1.4);
                }

                sc.relX = Math.cos(angle) * r;
                sc.relY = Math.sin(angle) * r;
              }
            }
          }
        }
      }

      // 3. Update Friction Sparks & Corona Arcs
      if (sparksRef.current.length > 0) {
        sparksRef.current = sparksRef.current
          .map((s) => ({
            ...s,
            x: s.x + s.vx * dt,
            y: s.y + s.vy * dt,
            life: s.life - dt * 2.2,
          }))
          .filter((s) => s.life > 0);
      }

      if (coronaArcsRef.current.length > 0) {
        coronaArcsRef.current = coronaArcsRef.current
          .map((a) => ({ ...a, life: a.life - dt }))
          .filter((a) => a.life > 0);
      }

      if (clothRubEffectsRef.current.length > 0) {
        clothRubEffectsRef.current = clothRubEffectsRef.current
          .map((r) => ({ ...r, life: r.life - dt }))
          .filter((r) => r.life > 0);
      }

      if (pairRubEffectsRef.current.length > 0) {
        pairRubEffectsRef.current = pairRubEffectsRef.current
          .map((pr) => ({ ...pr, life: pr.life - dt }))
          .filter((pr) => pr.life > 0);
      }

      // 4. Update Moving Transfer Electrons / Charges
      if (movingTransferParticlesRef.current.length > 0) {
        movingTransferParticlesRef.current = movingTransferParticlesRef.current
          .map((p) => {
            if (p.delay && p.delay > 0) {
              const nextDelay = p.delay - dt;
              const srcObj = p.sourceObjectId ? currentObjects.find((o) => o.id === p.sourceObjectId) : undefined;
              const sx = srcObj ? srcObj.x : p.x;
              const sy = srcObj ? srcObj.y : p.y;
              return {
                ...p,
                delay: nextDelay,
                x: sx,
                y: sy,
                trail: [{ x: sx, y: sy }],
              };
            }

            const nextProgress = p.progress + dt * 1.45 * (p.speedScale ?? 1);
            const targetObj = currentObjects.find((o) => o.id === p.targetObjectId);
            const sourceObj = currentObjects.find((o) => o.id === p.sourceObjectId);

            let newX = p.x + p.vx * dt;
            let newY = p.y + p.vy * dt;

            if (targetObj && sourceObj) {
              const startX = sourceObj.x;
              const startY = sourceObj.y;
              const endX = targetObj.x;
              const endY = targetObj.y;
              const dx = endX - startX;
              const dy = endY - startY;
              const len = Math.max(1, Math.hypot(dx, dy));
              const perpX = -dy / len;
              const perpY = dx / len;
              const curveOffset = p.arcOffset ?? -32;

              const midX = (startX + endX) / 2 + perpX * curveOffset;
              const midY = (startY + endY) / 2 + perpY * curveOffset - 22;

              const t = Math.min(1, nextProgress);
              newX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
              newY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
            }

            const updatedTrail = [...p.trail, { x: newX, y: newY }].slice(-7);

            return {
              ...p,
              x: newX,
              y: newY,
              progress: nextProgress,
              life: p.life - dt * 1.35,
              trail: updatedTrail,
            };
          })
          .filter((p) => p.life > 0 && p.progress <= 1.02);
      }

      // 4B. Contact Interface Charge Migration Particle System (driven by ΔV & ΔW)
      if (contactEvents.length > 0) {
        for (const ev of contactEvents) {
          rubAgitationRef.current[ev.donorId] = Math.max(rubAgitationRef.current[ev.donorId] ?? 0, 0.55);
          rubAgitationRef.current[ev.acceptorId] = Math.max(rubAgitationRef.current[ev.acceptorId] ?? 0, 0.55);

          // Concise throttled educational log for active interface migration
          const prevLogAt = lastContactLogTimeRef.current[ev.pairKey] ?? 0;
          if (onFrictionLogRef.current && time - prevLogAt > 3500) {
            lastContactLogTimeRef.current[ev.pairKey] = time;
            const donorObj = currentObjects.find((o) => o.id === ev.donorId);
            const acceptorObj = currentObjects.find((o) => o.id === ev.acceptorId);
            if (donorObj && acceptorObj) {
              if (ev.mode === 'contact_potential') {
                onFrictionLogRef.current(
                  `Contact interface (${donorObj.name} ↔ ${acceptorObj.name}): ΔΦ = ${ev.deltaWorkFunctionEv.toFixed(2)} eV — electrons tunnel across boundary.`
                );
              } else {
                onFrictionLogRef.current(
                  `Interface migration (${donorObj.name} → ${acceptorObj.name}): ΔV = ${Math.round(ev.deltaPotentialV)} V drives e⁻ across contact until V equalizes.`
                );
              }
            }
          }

          if (cfg.animateMovingCharges) {
            const driveStrength =
              ev.mode === 'contact_potential'
                ? Math.min(18, Math.max(5, ev.deltaWorkFunctionEv * 9))
                : Math.min(46, Math.max(7, Math.sqrt(ev.deltaPotentialV) * 1.3 + ev.migratedChargeNc * 22));
            const accum = (interfaceSpawnAccumRef.current[ev.pairKey] ?? 0) + driveStrength * dt;
            const spawnCount = Math.min(6, Math.floor(accum));
            interfaceSpawnAccumRef.current[ev.pairKey] = accum - spawnCount;

            if (spawnCount > 0 && interfaceParticlesRef.current.length < 95) {
              const tangX = -ev.normalY;
              const tangY = ev.normalX;
              const particleSpeed =
                ev.mode === 'contact_potential'
                  ? 1.15 + ev.deltaWorkFunctionEv * 0.35
                  : Math.min(3.4, 1.1 + Math.sqrt(ev.deltaPotentialV) * 0.065);

              for (let s = 0; s < spawnCount; s++) {
                const donorSpread = (Math.random() - 0.5) * 26;
                const acceptorSpread = (Math.random() - 0.5) * 26;
                const pinchOffset = (Math.random() - 0.5) * 6;
                const donorDepth = 26 + Math.random() * 16;
                const acceptorDepth = 26 + Math.random() * 16;

                const sx = ev.interfaceX - ev.normalX * donorDepth + tangX * donorSpread;
                const sy = ev.interfaceY - ev.normalY * donorDepth + tangY * donorSpread;
                const ix = ev.interfaceX + tangX * pinchOffset;
                const iy = ev.interfaceY + tangY * pinchOffset;
                const ex = ev.interfaceX + ev.normalX * acceptorDepth + tangX * acceptorSpread;
                const ey = ev.interfaceY + ev.normalY * acceptorDepth + tangY * acceptorSpread;

                interfaceParticlesRef.current.push({
                  id: `iface-${Math.round(time)}-${s}-${Math.random()}`,
                  startX: sx,
                  startY: sy,
                  interfaceX: ix,
                  interfaceY: iy,
                  endX: ex,
                  endY: ey,
                  x: sx,
                  y: sy,
                  progress: 0,
                  speed: particleSpeed * (0.88 + Math.random() * 0.24),
                  radius: ev.mode === 'contact_potential' ? 2.6 : Math.min(4.0, 2.7 + Math.sqrt(ev.deltaPotentialV) * 0.025),
                  potentialV: ev.deltaPotentialV,
                  mode: ev.mode,
                  trail: [{ x: sx, y: sy }],
                });
              }
            }
          }
        }
      }

      if (interfaceParticlesRef.current.length > 0) {
        interfaceParticlesRef.current = interfaceParticlesRef.current
          .map((p) => {
            const nextProgress = p.progress + p.speed * dt;
            const t = Math.min(1, nextProgress);
            // Quadratic Bezier control point chosen so B(0.5) === (interfaceX, interfaceY)
            const ctrlX = 2 * p.interfaceX - 0.5 * (p.startX + p.endX);
            const ctrlY = 2 * p.interfaceY - 0.5 * (p.startY + p.endY);
            const omt = 1 - t;
            const nx = omt * omt * p.startX + 2 * omt * t * ctrlX + t * t * p.endX;
            const ny = omt * omt * p.startY + 2 * omt * t * ctrlY + t * t * p.endY;
            const nextTrail = [...p.trail, { x: nx, y: ny }].slice(-7);
            return {
              ...p,
              x: nx,
              y: ny,
              progress: nextProgress,
              trail: nextTrail,
            };
          })
          .filter((p) => p.progress < 1.0);
      }

      // 5. Update Voltmeter Sensor (canvas ref at 60fps, React parent throttled at ~140ms)
      if (cfg.showProbe && currentSensor.isActive) {
        const field = calculateElectricField(currentSensor.x, currentSensor.y, currentObjects);
        const voltage = calculateElectricPotential(currentSensor.x, currentSensor.y, currentObjects);
        const data: ProbeData = {
          x: currentSensor.x,
          y: currentSensor.y,
          voltageV: Math.round(voltage),
          fieldEx: Math.round(field.Ex),
          fieldEy: Math.round(field.Ey),
          fieldMagnitude: Math.round(field.magnitude),
          netChargeDensity: 0,
        };
        probeReadoutRef.current = data;
        if (time - lastProbeEmitTime > 140) {
          lastProbeEmitTime = time;
          if (onProbeDataUpdateRef.current) onProbeDataUpdateRef.current(data);
        }
      }

      // Clear Canvas & Draw Lab Bench Backdrop
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 6. Draw Background Grid OR Precision Field Vector Grid (60 px intersections)
      if (cfg.showFieldVectorGrid) {
        const majorStep = 60;
        const minorStep = 30;

        // Subtle 30 px half-step subdivision lines
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.52)';
        ctx.lineWidth = 1;
        for (let x = minorStep; x < canvas.width; x += minorStep) {
          if (x % majorStep === 0) continue;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = minorStep; y < canvas.height; y += minorStep) {
          if (y % majorStep === 0) continue;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Crisp 60 px major coordinate grid lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 1;
        for (let x = majorStep; x < canvas.width; x += majorStep) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = majorStep; y < canvas.height; y += majorStep) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Subtle coordinate scale ticks along left & bottom margins (avoiding top/bottom corner overlays)
        ctx.save();
        ctx.font = '9.5px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.72)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (let y = majorStep; y < canvas.height - 42; y += majorStep) {
          if (y < 46) continue;
          ctx.fillText(`${y}`, 6, y);
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        for (let x = majorStep; x < canvas.width - 150; x += majorStep) {
          if (x < 300) continue;
          ctx.fillText(`${x}`, x, canvas.height - 6);
        }
        ctx.restore();

        // Highlight nearest grid intersection while dragging for precision placement
        const draggedObj = draggingId.current
          ? currentObjects.find((o) => o.id === draggingId.current)
          : undefined;
        const nearestSnapX = draggedObj ? Math.round(draggedObj.x / majorStep) * majorStep : -1;
        const nearestSnapY = draggedObj ? Math.round(draggedObj.y / majorStep) * majorStep : -1;
        const isAligned =
          draggedObj &&
          Math.hypot(draggedObj.x - nearestSnapX, draggedObj.y - nearestSnapY) <= 4;

        // Draw intersection crosshairs + electric field vector direction & magnitude at every intersection
        for (let gx = majorStep; gx < canvas.width - 16; gx += majorStep) {
          for (let gy = majorStep; gy < canvas.height - 16; gy += majorStep) {
            const isTargetIntersection = draggedObj && gx === nearestSnapX && gy === nearestSnapY;

            // Precision crosshair marker at every grid intersection
            ctx.strokeStyle = isTargetIntersection
              ? isAligned
                ? 'rgba(52, 211, 153, 0.95)'
                : 'rgba(251, 146, 60, 0.85)'
              : 'rgba(148, 163, 184, 0.45)';
            ctx.lineWidth = isTargetIntersection ? 1.8 : 1;
            ctx.beginPath();
            ctx.moveTo(gx - 3.5, gy);
            ctx.lineTo(gx + 3.5, gy);
            ctx.moveTo(gx, gy - 3.5);
            ctx.lineTo(gx, gy + 3.5);
            ctx.stroke();

            if (isTargetIntersection) {
              ctx.save();
              ctx.strokeStyle = isAligned ? '#34d399' : '#fb923c';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(gx, gy, 8, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }

            // Skip vector & label directly inside a charge orb/object center so the specimen stays clear
            const tooCloseToCharge = currentObjects.some(
              (o) => Math.hypot(gx - o.x, gy - o.y) < (o.shape === 'point_charge' ? 24 : 20)
            );
            if (tooCloseToCharge || currentObjects.length === 0) continue;

            const field = calculateElectricField(gx, gy, currentObjects);
            if (field.magnitude > 0.5) {
              const angle = Math.atan2(field.Ey, field.Ex);
              const arrowLen = Math.min(25, Math.max(11, 8 + Math.log10(field.magnitude + 1) * 4.8));
              const intensity = Math.min(1, field.magnitude / 1800);

              // Smooth thermal-cyan color ramp by field strength
              let vecColor = '#38bdf8';
              if (intensity > 0.72) {
                vecColor = '#fb7185';
              } else if (intensity > 0.4) {
                vecColor = '#fbbf24';
              } else if (intensity > 0.16) {
                vecColor = '#34d399';
              }

              ctx.save();
              ctx.translate(gx, gy);
              ctx.rotate(angle);
              ctx.strokeStyle = vecColor;
              ctx.fillStyle = vecColor;
              ctx.lineWidth = 1.65;

              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(arrowLen, 0);
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(arrowLen + 2, 0);
              ctx.lineTo(arrowLen - 4.5, -3);
              ctx.lineTo(arrowLen - 4.5, 3);
              ctx.closePath();
              ctx.fill();
              ctx.restore();

              // Numeric magnitude |E| in N/C placed opposite the arrow's vertical side to prevent overlap
              const magText =
                field.magnitude >= 1000
                  ? `${(field.magnitude / 1000).toFixed(1)}k`
                  : field.magnitude >= 10
                  ? `${Math.round(field.magnitude)}`
                  : field.magnitude.toFixed(1);
              const arrowPointsDown = Math.sin(angle) > 0.4;
              const labelY = arrowPointsDown ? gy - 12 : gy + 13;

              ctx.save();
              ctx.font = 'bold 9.5px JetBrains Mono, monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.lineWidth = 3;
              ctx.strokeStyle = 'rgba(2, 6, 23, 0.92)';
              ctx.strokeText(magText, gx, labelY);
              ctx.fillStyle = vecColor;
              ctx.fillText(magText, gx, labelY);
              ctx.restore();
            } else {
              // Null / saddle point where superposition cancels E to ~0
              ctx.save();
              ctx.font = 'bold 9.5px JetBrains Mono, monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
              ctx.fillText('0', gx, gy + 12);
              ctx.restore();
            }
          }
        }
      } else if (cfg.showGrid) {
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.75)';
        ctx.lineWidth = 1;
        const gridStep = 40;
        for (let x = 0; x < canvas.width; x += gridStep) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridStep) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }

      // 7. Draw Electrostatic Potential Glow Halo around objects
      if (cfg.showHaloGlow) {
        for (const obj of currentObjects) {
          if (Math.abs(obj.charge) > 0.1) {
            const isPositive = obj.charge > 0;
            const haloRadius = Math.max(obj.width, obj.height) * (0.85 + Math.min(2.4, Math.abs(obj.charge) * 0.08));
            const gradient = ctx.createRadialGradient(
              obj.x,
              obj.y,
              Math.min(obj.width, obj.height) * 0.25,
              obj.x,
              obj.y,
              haloRadius
            );

            if (isPositive) {
              gradient.addColorStop(0, 'rgba(56, 189, 248, 0.26)');
              gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.10)');
              gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');
            } else {
              gradient.addColorStop(0, 'rgba(236, 72, 153, 0.26)');
              gradient.addColorStop(0.5, 'rgba(219, 39, 119, 0.10)');
              gradient.addColorStop(1, 'rgba(219, 39, 119, 0)');
            }

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, haloRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 8. Draw Lightweight Electric Field Vectors Grid (skipped if Precision Field Vector Grid is active)
      if (cfg.showFieldVectors && !cfg.showFieldVectorGrid) {
        const step = cfg.vectorDensity || 40;
        for (let x = step / 2; x < canvas.width; x += step) {
          for (let y = step / 2; y < canvas.height; y += step) {
            const field = calculateElectricField(x, y, currentObjects);
            if (field.magnitude > 5) {
              const maxLen = step * 0.45;
              const len = Math.min(maxLen, Math.log10(field.magnitude + 1) * 6);
              const angle = Math.atan2(field.Ey, field.Ex);

              const intensity = Math.min(1, field.magnitude / 2000);
              const r = Math.floor(255 * intensity);
              const g = Math.floor(180 * (1 - intensity) + 100);
              const b = Math.floor(255 * (1 - intensity));

              ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(0.8, intensity + 0.2)})`;
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(0.8, intensity + 0.2)})`;
              ctx.lineWidth = 1.2;

              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(angle);

              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(len, 0);
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(len, 0);
              ctx.lineTo(len - 4, -2.5);
              ctx.lineTo(len - 4, 2.5);
              ctx.closePath();
              ctx.fill();

              ctx.restore();
            }
          }
        }
      }

      // 9. Draw Electric Field Lines & Flow Tracer Particles
      const lines = cfg.showFieldLines ? generateElectricFieldLines(currentObjects, canvas.width, canvas.height) : [];
      if (cfg.showFieldLines && lines.length > 0) {
        ctx.lineWidth = 1.5;
        for (const line of lines) {
          if (line.length < 2) continue;
          ctx.beginPath();
          ctx.moveTo(line[0].x, line[0].y);
          for (let i = 1; i < line.length; i++) {
            ctx.lineTo(line[i].x, line[i].y);
          }
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
          ctx.stroke();

          const midIdx = Math.floor(line.length / 2);
          if (midIdx > 0 && midIdx < line.length) {
            const p1 = line[midIdx - 1];
            const p2 = line[midIdx];
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

            ctx.save();
            ctx.translate(p2.x, p2.y);
            ctx.rotate(angle);
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-6, -3);
            ctx.lineTo(-6, 3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }

        if (cfg.animateFieldFlow && lines.length > 0) {
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.length < 4) continue;
            const phase = (clock * 0.8 + i * 0.3) % 1;
            const targetIndex = Math.floor(phase * (line.length - 1));
            const pt = line[targetIndex];
            if (pt) {
              ctx.fillStyle = '#67e8f9';
              ctx.shadowColor = '#06b6d4';
              ctx.shadowBlur = 6;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
      }

      // 10. Draw Equipotential Isolines
      if (cfg.showEquipotentials) {
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        const sampleStep = 30;
        const potentialLevels = [-1200, -500, -200, -80, 80, 200, 500, 1200];

        for (const level of potentialLevels) {
          for (let x = 0; x < canvas.width; x += sampleStep) {
            for (let y = 0; y < canvas.height; y += sampleStep) {
              const V = calculateElectricPotential(x, y, currentObjects);
              if (Math.abs(V - level) < Math.max(35, Math.abs(level) * 0.16)) {
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.stroke();
              }
            }
          }
        }
        ctx.setLineDash([]);
      }

      // 11. Draw Realistic Material Specimens in Scene
      for (const obj of currentObjects) {
        const isSelected = currentSelectedId === obj.id;

        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate((obj.rotation * Math.PI) / 180);

        // Render high-fidelity procedural substance shader
        drawRealisticMaterialBody(ctx, obj, isSelected, clock);

        // 11B. Localized surface charge density particle-shimmer (emissive electron/ion points)
        const mat = MATERIALS_DATABASE[obj.materialId];
        const isConductor = mat?.category === 'conductor';
        const externalField = externalFieldById[obj.id] || { Ex: 0, Ey: 0, magnitude: 0 };
        const agitation = rubAgitationRef.current[obj.id] ?? 0;
        const fieldBoost = Math.min(2.6, externalField.magnitude / 600);
        const motionBoost = 1 + agitation * 2.2 + fieldBoost * 1.85;

        if (cfg.showCharges && cfg.chargeViewMode !== 'hidden') {
          drawSurfaceChargeShimmer(
            ctx,
            obj,
            isConductor,
            externalField,
            clock,
            cfg.animateMovingCharges,
            agitation
          );
        }

        // 12. Draw Surface Charges (+ and - Glowing Particles) & Electrostatic Induction inside finite object frame
        if (obj.shape !== 'point_charge' && obj.shape !== 'electroscope' && cfg.showCharges && cfg.chargeViewMode !== 'hidden') {
          // Local external E-field vector for induced electron displacement (F = -e * E)
          const rotRad = (obj.rotation * Math.PI) / 180;
          const extLocalX = externalField.Ex * Math.cos(-rotRad) - externalField.Ey * Math.sin(-rotRad);
          const extLocalY = externalField.Ex * Math.sin(-rotRad) + externalField.Ey * Math.cos(-rotRad);
          const extLocalMag = Math.hypot(extLocalX, extLocalY);
          const ux = extLocalMag > 1 ? extLocalX / extLocalMag : 0;
          const uy = extLocalMag > 1 ? extLocalY / extLocalMag : 0;
          const polarFactor = extLocalMag > 35 ? Math.min(1, extLocalMag / (extLocalMag + 220)) : 0;

          // Bound dielectric stretching vs macroscopic conductor electron sea migration
          const dielectricShift = 13.5 * polarFactor;
          const eShiftX = -ux * dielectricShift;
          const eShiftY = -uy * dielectricShift;
          const conductorDriftX = -ux * polarFactor * (obj.width * 0.31);
          const conductorDriftY = -uy * polarFactor * (obj.height * 0.31);

          if (cfg.chargeViewMode === 'all_charges') {
            const latticeCols = obj.shape === 'rod' ? 6 : 4;
            const latticeRows = obj.shape === 'rod' ? 2 : 3;
            const freqBoost = 1 + agitation * 1.6 + fieldBoost * 1.25;
            const ampBoost = cfg.animateMovingCharges ? 1.8 * motionBoost : 0;

            // Subtle Fermi-sea migration flow lines inside conductors during induction
            if (isConductor && polarFactor > 0.14) {
              ctx.save();
              ctx.strokeStyle = `rgba(244, 114, 182, ${(0.25 + polarFactor * 0.4).toFixed(2)})`;
              ctx.lineWidth = 1.3;
              ctx.setLineDash([4, 4]);
              if (cfg.animateMovingCharges) ctx.lineDashOffset = -clock * 28;
              for (const rowOff of [-0.18, 0, 0.18]) {
                const startX = ux * obj.width * 0.24 - uy * obj.height * rowOff;
                const startY = uy * obj.height * 0.24 + ux * obj.width * rowOff;
                const endX = -ux * obj.width * 0.24 - uy * obj.height * rowOff;
                const endY = -uy * obj.height * 0.24 + ux * obj.width * rowOff;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
              }
              ctx.setLineDash([]);
              ctx.restore();
            }

            for (let c = 0; c < latticeCols; c++) {
              for (let r = 0; r < latticeRows; r++) {
                const lx = ((c + 0.5) / latticeCols - 0.5) * (obj.width * 0.68);
                const ly = ((r + 0.5) / latticeRows - 0.5) * (obj.height * 0.62);
                const eJitterX = cfg.animateMovingCharges
                  ? Math.sin(clock * 5.2 * freqBoost + c * 1.9 + r) * ampBoost
                  : 0;
                const eJitterY = cfg.animateMovingCharges
                  ? Math.cos(clock * 4.8 * freqBoost + r * 2.3 + c) * ampBoost
                  : 0;

                const nucX = isConductor ? lx : lx - 4.0;
                const nucY = ly;

                let exPos: number;
                let eyPos: number;
                if (isConductor) {
                  // Conductors: free Fermi-sea electrons migrate across the whole body toward -E
                  const seaSwimX = cfg.animateMovingCharges
                    ? Math.sin(clock * 2.8 * freqBoost + c * 1.7 + r * 2.3) * (2.6 + agitation * 3.0)
                    : 0;
                  const seaSwimY = cfg.animateMovingCharges
                    ? Math.cos(clock * 2.5 * freqBoost + r * 1.9 + c * 2.1) * (2.6 + agitation * 3.0)
                    : 0;
                  exPos = lx + 4.0 + conductorDriftX + seaSwimX;
                  eyPos = ly + conductorDriftY + seaSwimY;
                  // Keep free electrons cleanly inside the conductor silhouette
                  if (obj.shape === 'sphere') {
                    const maxR = Math.min(obj.width, obj.height) * 0.41;
                    const dist = Math.hypot(exPos, eyPos);
                    if (dist > maxR && dist > 0.001) {
                      exPos = (exPos / dist) * maxR;
                      eyPos = (eyPos / dist) * maxR;
                    }
                  } else {
                    exPos = Math.max(-obj.width * 0.42, Math.min(obj.width * 0.42, exPos));
                    eyPos = Math.max(-obj.height * 0.40, Math.min(obj.height * 0.40, eyPos));
                  }
                } else {
                  // Dielectrics: bound valence electrons stretch locally away from parent nucleus (+ -> -)
                  exPos = lx + 4.0 + eShiftX + eJitterX;
                  eyPos = ly + eShiftY + eJitterY;

                  // Draw visible atomic dipole polarization tether when stretched by approaching field
                  if (dielectricShift > 1.8) {
                    ctx.beginPath();
                    ctx.moveTo(nucX, nucY);
                    ctx.lineTo(exPos, eyPos);
                    ctx.strokeStyle = `rgba(248, 250, 252, ${Math.min(0.65, 0.22 + polarFactor * 0.42).toFixed(2)})`;
                    ctx.lineWidth = 1.25;
                    ctx.stroke();
                  }
                }

                // Positive Nucleus (+)
                ctx.beginPath();
                ctx.arc(nucX, nucY, 4.1, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(14, 165, 233, 0.78)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(186, 230, 253, 0.8)';
                ctx.lineWidth = 0.8;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 7.5px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('+', nucX, nucY + 0.3);

                // Mobile or Valence Electron (-)
                ctx.beginPath();
                ctx.arc(exPos, eyPos, 3.8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(219, 39, 119, 0.85)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(251, 207, 232, 0.85)';
                ctx.lineWidth = 0.8;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.fillText('-', exPos, eyPos + 0.3);
              }
            }
          }

          // Induced surface poles on neutral/near-neutral conductors when external E-field separates free charges
          if (isConductor && Math.abs(obj.charge) < 0.2 && polarFactor > 0.18) {
            const poleCount = 4;
            const rimRx = obj.shape === 'sphere' ? Math.min(obj.width, obj.height) * 0.44 : obj.width * 0.42;
            const rimRy = obj.shape === 'sphere' ? Math.min(obj.width, obj.height) * 0.44 : obj.height * 0.40;
            const baseAngle = Math.atan2(uy, ux);

            for (const isPosPole of [true, false]) {
              const poleAngle = isPosPole ? baseAngle : baseAngle + Math.PI;
              for (let p = 0; p < poleCount; p++) {
                const spread = (p - (poleCount - 1) / 2) * 0.28;
                const a = poleAngle + spread;
                const px = Math.cos(a) * rimRx;
                const py = Math.sin(a) * rimRy;

                ctx.save();
                ctx.shadowColor = isPosPole ? '#38bdf8' : '#ec4899';
                ctx.shadowBlur = 8 * polarFactor;
                ctx.beginPath();
                ctx.arc(px, py, 4.6, 0, Math.PI * 2);
                ctx.fillStyle = isPosPole ? 'rgba(2, 132, 199, 0.92)' : 'rgba(190, 24, 93, 0.92)';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(isPosPole ? '+' : '-', px, py + 0.2);
                ctx.restore();
              }
            }
          }

          if (obj.surfaceCharges) {
            const scFreqBoost = 1 + agitation * 1.4 + fieldBoost * 1.35;
            const scAmp = cfg.animateMovingCharges ? 1.5 * motionBoost : 0;

            for (let idx = 0; idx < obj.surfaceCharges.length; idx++) {
              const sc = obj.surfaceCharges[idx];
              const pulse = cfg.animateMovingCharges
                ? 1 + (0.16 + agitation * 0.1 + fieldBoost * 0.08) * Math.sin(clock * 6 * scFreqBoost + (sc.pulsePhase || idx))
                : 1;
              const jitterX = cfg.animateMovingCharges ? Math.sin(clock * 9 * scFreqBoost + idx * 3) * scAmp : 0;
              const jitterY = cfg.animateMovingCharges ? Math.cos(clock * 9 * scFreqBoost + idx * 3) * scAmp : 0;

              // Polarized pull/push on excess surface charges when another charged body approaches
              const polarityBias = !isConductor ? sc.sign : 0;
              const biasX = polarityBias !== 0 && extLocalMag > 45 ? ux * polarityBias * dielectricShift * 0.55 : 0;
              const biasY = polarityBias !== 0 && extLocalMag > 45 ? uy * polarityBias * dielectricShift * 0.55 : 0;

              const scX = sc.relX * obj.width + jitterX + biasX;
              const scY = sc.relY * obj.height + jitterY + biasY;
              const isPositive = sc.sign > 0;

              ctx.shadowColor = isPositive ? '#0ea5e9' : '#ec4899';
              ctx.shadowBlur = cfg.animateMovingCharges ? (8 + agitation * 5 + fieldBoost * 3) * pulse : 4;

              ctx.beginPath();
              ctx.arc(scX, scY, 5.2 * pulse, 0, Math.PI * 2);
              ctx.fillStyle = isPositive ? '#0284c7' : '#be185d';
              ctx.fill();

              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.1;
              ctx.stroke();

              ctx.shadowBlur = 0;

              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 8.5px monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(isPositive ? '+' : '-', scX, scY);
            }
          }
        }

        // 13. Draw Microscopic Atomic Dipoles
        if (cfg.showAtomicDipoles && obj.dipoles) {
          for (const dip of obj.dipoles) {
            const dx = dip.relX * obj.width;
            const dy = dip.relY * obj.height;

            ctx.save();
            ctx.translate(dx, dy);

            ctx.fillStyle = 'rgba(241, 245, 249, 0.22)';
            ctx.strokeStyle = 'rgba(241, 245, 249, 0.65)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, 8, 4, Math.atan2(dip.py, dip.px), 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            const angle = Math.atan2(dip.py, dip.px);
            const dist = 5;
            ctx.fillStyle = '#38bdf8';
            ctx.font = '7px monospace';
            ctx.fillText('+', Math.cos(angle) * dist, Math.sin(angle) * dist);
            ctx.fillStyle = '#ec4899';
            ctx.fillText('-', -Math.cos(angle) * dist, -Math.sin(angle) * dist);

            ctx.restore();
          }
        }

        ctx.restore();

        // Crisp upright specimen label & Charge Magnitude (+/- nC) indicator positioned above object
        const labelOffsetTop = (Math.abs(Math.sin((obj.rotation * Math.PI) / 180)) * obj.width + Math.abs(Math.cos((obj.rotation * Math.PI) / 180)) * obj.height) / 2;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const objIdx = currentObjects.indexOf(obj);
        const slotNum = obj.id.startsWith('slot-0-')
          ? 1
          : obj.id.startsWith('slot-1-')
          ? 2
          : objIdx + 1;
        const prefix = moduleMode === 'module1' && slotNum >= 1 && slotNum <= 2 ? `Obj ${slotNum}: ` : '';
        const displayTitle = isSelected ? `${prefix}${obj.name} · Selected` : `${prefix}${obj.name}`;

        // Charge Magnitude numerical indicator (+/- nC) + Induced Polarization status above each object when toggled ON
        if (cfg.showChargeMagnitude) {
          const isScopeInduced = obj.shape === 'electroscope' && Math.abs(obj.charge) <= 0.15 && (obj.leafAngleDeg ?? 0) > 2;
          const isInducedNeutral =
            isScopeInduced ||
            (obj.shape !== 'point_charge' && obj.shape !== 'electroscope' && Math.abs(obj.charge) <= 0.15 && externalField.magnitude > 55);
          const chargeStr =
            obj.shape === 'electroscope'
              ? obj.charge > 0.05
                ? `+${obj.charge.toFixed(1)} nC · θ=${(obj.leafAngleDeg ?? 0).toFixed(0)}°`
                : obj.charge < -0.05
                ? `${obj.charge.toFixed(1)} nC · θ=${(obj.leafAngleDeg ?? 0).toFixed(0)}°`
                : isScopeInduced
                ? `0.0 nC · Induced ± (θ=${(obj.leafAngleDeg ?? 0).toFixed(0)}°)`
                : '0.0 nC · θ=0°'
              : obj.charge > 0.05
              ? `+${obj.charge.toFixed(1)} nC`
              : obj.charge < -0.05
              ? `${obj.charge.toFixed(1)} nC`
              : isInducedNeutral
              ? `0.0 nC · ${isConductor ? 'Induced ±' : 'Polarized ±'}`
              : '0.0 nC';
          const magY = obj.y - labelOffsetTop - 17;

          ctx.font = 'bold 12px JetBrains Mono, monospace';
          const textW = ctx.measureText(chargeStr).width;
          const badgeW = textW + 16;
          const badgeH = 22;

          ctx.fillStyle =
            obj.charge > 0.05
              ? 'rgba(8, 47, 73, 0.92)'
              : obj.charge < -0.05
              ? 'rgba(80, 7, 36, 0.92)'
              : isInducedNeutral
              ? 'rgba(49, 46, 129, 0.92)'
              : 'rgba(15, 23, 42, 0.88)';
          ctx.strokeStyle =
            obj.charge > 0.05
              ? '#38bdf8'
              : obj.charge < -0.05
              ? '#f472b6'
              : isInducedNeutral
              ? '#818cf8'
              : '#64748b';
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.roundRect(obj.x - badgeW / 2, magY - badgeH / 2, badgeW, badgeH, 5);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle =
            obj.charge > 0.05
              ? '#7dd3fc'
              : obj.charge < -0.05
              ? '#f9a8d4'
              : isInducedNeutral
              ? '#c7d2fe'
              : '#cbd5e1';
          ctx.fillText(chargeStr, obj.x, magY + 0.5);
        }

        // Specimen name cleanly above Charge Magnitude indicator (or directly above object if hidden)
        ctx.font = 'bold 12.5px Plus Jakarta Sans, sans-serif';
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = 'rgba(2, 6, 23, 0.88)';
        const nameY = obj.y - labelOffsetTop - (cfg.showChargeMagnitude ? 39 : 16);
        ctx.strokeText(displayTitle, obj.x, nameY);
        ctx.fillStyle = isSelected ? '#fdba74' : '#f1f5f9';
        ctx.fillText(displayTitle, obj.x, nameY);

        // Grounded / Pinned status tag tucked neatly below object
        const statusY = obj.y + labelOffsetTop + (obj.shape === 'ground_plate' ? 36 : obj.shape === 'balloon' ? 36 : 15);
        if (obj.isGrounded) {
          ctx.font = 'bold 10.5px Plus Jakarta Sans, sans-serif';
          ctx.fillStyle = '#34d399';
          ctx.fillText('⏚ GROUNDED (0 V)', obj.x, statusY);
        } else if (obj.isPinned) {
          ctx.font = 'bold 10.5px Plus Jakarta Sans, sans-serif';
          ctx.fillStyle = '#fbbf24';
          ctx.fillText('PINNED', obj.x, statusY);
        }

        ctx.restore();
      }

      // 13A. Guided Mode Step 3 Highlight Ring around Electroscope Brass Knob
      if (moduleModeRef.current === 'module4' && guidedElectroscopeModeRef.current) {
        const guide = getElectroscopeGuideState(currentObjects, stagedPrepObjectRef.current);
        if (guide.step === 3) {
          const scope = currentObjects.find((o) => o.shape === 'electroscope');
          if (scope) {
            const { knobX, knobY } = getElectroscopeTerminals(scope);
            const pulseR = 29 + Math.sin(clock * 4.5) * 4;

            ctx.save();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2.2;
            ctx.setLineDash([6, 5]);
            ctx.lineDashOffset = -clock * 20;
            ctx.beginPath();
            ctx.arc(knobX, knobY, pulseR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            const callout = 'Bring charged object near knob';
            ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
            const cw = ctx.measureText(callout).width + 18;
            const cy = Math.max(24, knobY - 52);
            ctx.fillStyle = 'rgba(69, 26, 3, 0.92)';
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.roundRect(knobX - cw / 2, cy - 13, cw, 26, 7);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fde68a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(callout, knobX, cy);
            ctx.restore();
          }
        }
      }

      // 13B. Draw Paschen Air-Breakdown Corona Discharge Plasma Arcs
      for (const arc of coronaArcsRef.current) {
        ctx.save();
        const alpha = Math.min(1, arc.life * 3);
        ctx.strokeStyle = `rgba(125, 211, 252, ${alpha})`;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.2;

        const segments = 6;
        ctx.beginPath();
        ctx.moveTo(arc.x1, arc.y1);
        for (let s = 1; s < segments; s++) {
          const t = s / segments;
          const jitter = Math.sin(arc.seed + s * 13 + clock * 40) * 11;
          const px = arc.x1 + (arc.x2 - arc.x1) * t + jitter;
          const py = arc.y1 + (arc.y2 - arc.y1) * t - jitter * 0.7;
          ctx.lineTo(px, py);
        }
        ctx.lineTo(arc.x2, arc.y2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // 14. Draw Coulomb Force Vectors & Inter-Body Attraction/Repulsion Dynamic Rays
      if (cfg.showForceVectors) {
        for (let i = 0; i < currentObjects.length; i++) {
          for (let j = i + 1; j < currentObjects.length; j++) {
            const oA = currentObjects[i];
            const oB = currentObjects[j];
            const bothCharged = Math.abs(oA.charge) >= 0.2 && Math.abs(oB.charge) >= 0.2;
            const oneNeutralPolarized =
              (Math.abs(oA.charge) < 0.2 && Math.abs(oB.charge) >= 0.35) ||
              (Math.abs(oB.charge) < 0.2 && Math.abs(oA.charge) >= 0.35);

            if (!bothCharged && !oneNeutralPolarized) continue;

            const dist = Math.hypot(oA.x - oB.x, oA.y - oB.y);
            if (dist > 950) continue;

            const forceA = forces.find((f) => f.objectId === oA.id);
            const forceB = forces.find((f) => f.objectId === oB.id);
            const isRepulsive = bothCharged && oA.charge * oB.charge > 0 && !(forceA?.isAttractive && forceB?.isAttractive);
            if (oneNeutralPolarized) {
              if (Math.max(forceA?.magnitude ?? 0, forceB?.magnitude ?? 0) < 0.015) continue;
            }

            ctx.save();
            ctx.setLineDash(isRepulsive ? [6, 6] : [10, 4]);
            ctx.lineWidth = bothCharged
              ? Math.min(3.5, 1 + (Math.abs(oA.charge * oB.charge) / Math.max(40, dist)) * 15)
              : 1.8;
            ctx.strokeStyle = isRepulsive ? 'rgba(244, 63, 94, 0.45)' : 'rgba(56, 189, 248, 0.55)';
            ctx.beginPath();
            ctx.moveTo(oA.x, oA.y);
            ctx.lineTo(oB.x, oB.y);
            ctx.stroke();
            ctx.setLineDash([]);

            const midX = (oA.x + oB.x) / 2;
            const midY = (oA.y + oB.y) / 2;
            const label = isRepulsive
              ? 'REPULSION ◄►'
              : oneNeutralPolarized
              ? 'INDUCED ATTRACTION ►◄'
              : 'ATTRACTION ►◄';
            const badgeWidth = oneNeutralPolarized ? 156 : 108;

            ctx.fillStyle = isRepulsive ? 'rgba(159, 18, 57, 0.88)' : 'rgba(14, 116, 144, 0.88)';
            ctx.strokeStyle = isRepulsive ? '#f43f5e' : '#38bdf8';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(midX - badgeWidth / 2, midY - 12, badgeWidth, 24, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, midX, midY);

            ctx.restore();
          }
        }

        for (const force of forces) {
          const obj = currentObjects.find((o) => o.id === force.objectId);
          if (!obj || force.magnitude < 0.015) continue;

          const isSelected = currentSelectedId === obj.id;
          const angle = Math.atan2(force.fy, force.fx);

          const arrowLength = Math.min(140, Math.max(28, 25 + Math.sqrt(force.magnitude) * 12));
          const strokeWidth = isSelected
            ? Math.min(6, 3.5 + Math.sqrt(force.magnitude) * 0.4)
            : Math.min(4.5, 2.5 + Math.sqrt(force.magnitude) * 0.2);

          ctx.save();
          ctx.translate(obj.x, obj.y);

          ctx.strokeStyle = force.isAttractive ? '#38bdf8' : '#f43f5e';
          ctx.fillStyle = force.isAttractive ? '#38bdf8' : '#f43f5e';
          ctx.shadowColor = force.isAttractive ? '#0ea5e9' : '#f43f5e';
          ctx.shadowBlur = isSelected ? 12 : 6;
          ctx.lineWidth = strokeWidth;

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * arrowLength, Math.sin(angle) * arrowLength);
          ctx.stroke();

          const headSize = Math.min(18, Math.max(10, arrowLength * 0.16));
          ctx.save();
          ctx.translate(Math.cos(angle) * arrowLength, Math.sin(angle) * arrowLength);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-headSize, -headSize * 0.55);
          ctx.lineTo(-headSize, headSize * 0.55);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          ctx.shadowBlur = 0;

          const labelDist = arrowLength + 22;
          const labelX = Math.cos(angle) * labelDist;
          const labelY = Math.sin(angle) * labelDist;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = force.isAttractive ? '#38bdf8' : '#f43f5e';
          ctx.lineWidth = 1;
          const formattedF = force.magnitude < 0.2 ? force.magnitude.toFixed(2) : force.magnitude.toFixed(1);
          const textStr = `${force.isAttractive ? 'Attract' : 'Repel'} F = ${formattedF} µN`;

          ctx.font = 'bold 11.5px JetBrains Mono, monospace';
          const textMetrics = ctx.measureText(textStr);
          const badgeW = textMetrics.width + 14;
          const badgeH = 22;
          ctx.beginPath();
          ctx.roundRect(labelX - badgeW / 2, labelY - badgeH / 2, badgeW, badgeH, 5);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(textStr, labelX, labelY);

          ctx.restore();
        }
      }

      // 14B. Active Rub 1 & 2 Work-Function Electron Flow Bridge
      for (const pr of pairRubEffectsRef.current) {
        const donorObj = currentObjects.find((o) => o.id === pr.donorId);
        const acceptorObj = currentObjects.find((o) => o.id === pr.acceptorId);
        if (!donorObj || !acceptorObj) continue;

        const alpha = Math.min(1, pr.life / (pr.maxLife * 0.35));
        const midX = (donorObj.x + acceptorObj.x) / 2;
        const midY = (donorObj.y + acceptorObj.y) / 2 - 42;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgba(244, 114, 182, 0.65)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -clock * 65;
        ctx.beginPath();
        ctx.moveTo(donorObj.x, donorObj.y);
        ctx.quadraticCurveTo(midX, midY, acceptorObj.x, acceptorObj.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const badgeStr = `ΔW = ${pr.deltaW.toFixed(2)} eV · e⁻ Flow →`;
        ctx.font = 'bold 11.5px JetBrains Mono, monospace';
        const bw = ctx.measureText(badgeStr).width + 16;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.roundRect(midX - bw / 2, midY - 28, bw, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fdba74';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeStr, midX, midY - 17);
        ctx.restore();
      }

      // 15. Draw Flying Moving Electron Transfer Particles with Glowing Tails
      for (const p of movingTransferParticlesRef.current) {
        if (p.delay && p.delay > 0) continue;

        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
          }
          ctx.strokeStyle = p.sign > 0 ? 'rgba(56, 189, 248, 0.55)' : 'rgba(244, 114, 182, 0.72)';
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }

        const r = p.radius ?? 3.6;
        ctx.save();
        ctx.shadowColor = p.sign > 0 ? '#38bdf8' : '#ec4899';
        ctx.shadowBlur = 11;
        ctx.fillStyle = p.sign > 0 ? '#0284c7' : '#ec4899';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Bright emissive electron core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fdf2f8';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.52, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.sign > 0 ? '+' : 'e⁻', p.x, p.y - r - 6);
        ctx.restore();
      }

      // 15B. Real-Time Contact Interface Charge Migration Junctions & Particles
      for (const ev of activeContactsRef.current) {
        const tangX = -ev.normalY;
        const tangY = ev.normalX;
        const pulse = 0.78 + 0.22 * Math.sin(clock * 14);
        const isContactPot = ev.mode === 'contact_potential';
        const glowRadius = (isContactPot ? 18 : Math.min(34, 18 + Math.sqrt(ev.deltaPotentialV) * 0.42)) * pulse;

        ctx.save();
        // Luminous contact junction aura centered right on the physical interface
        const jGrad = ctx.createRadialGradient(ev.interfaceX, ev.interfaceY, 1, ev.interfaceX, ev.interfaceY, glowRadius);
        if (ev.mode === 'grounding') {
          jGrad.addColorStop(0, 'rgba(110, 231, 183, 0.85)');
          jGrad.addColorStop(0.45, 'rgba(16, 185, 129, 0.35)');
          jGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        } else if (isContactPot) {
          jGrad.addColorStop(0, 'rgba(253, 186, 116, 0.72)');
          jGrad.addColorStop(0.5, 'rgba(244, 114, 182, 0.28)');
          jGrad.addColorStop(1, 'rgba(244, 114, 182, 0)');
        } else {
          jGrad.addColorStop(0, 'rgba(249, 168, 212, 0.9)');
          jGrad.addColorStop(0.45, 'rgba(236, 72, 153, 0.38)');
          jGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        }
        ctx.fillStyle = jGrad;
        ctx.beginPath();
        ctx.arc(ev.interfaceX, ev.interfaceY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Crisp interface seam line along tangent
        ctx.strokeStyle = ev.mode === 'grounding' ? 'rgba(110, 231, 183, 0.85)' : 'rgba(244, 114, 182, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ev.interfaceX - tangX * 15, ev.interfaceY - tangY * 15);
        ctx.lineTo(ev.interfaceX + tangX * 15, ev.interfaceY + tangY * 15);
        ctx.stroke();

        // Compact potential-difference flow badge offset beside the contact interface
        const flowArrow = Math.abs(ev.normalX) >= Math.abs(ev.normalY)
          ? (ev.normalX >= 0 ? 'e⁻ →' : '← e⁻')
          : (ev.normalY >= 0 ? 'e⁻ ↓' : 'e⁻ ↑');
        const badgeText = isContactPot
          ? `ΔΦ ${ev.deltaWorkFunctionEv.toFixed(2)} eV · ${flowArrow}`
          : `ΔV = ${Math.round(ev.deltaPotentialV)} V · ${flowArrow}`;

        const labelX = ev.interfaceX + tangX * 26;
        const labelY = ev.interfaceY + tangY * 26 - (Math.abs(tangY) < 0.3 ? 28 : 0);
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        const bw = ctx.measureText(badgeText).width + 14;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = ev.mode === 'grounding' ? '#34d399' : '#f472b6';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.roundRect(labelX - bw / 2, labelY - 11, bw, 22, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = ev.mode === 'grounding' ? '#6ee7b7' : '#fbcfe8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, labelX, labelY + 0.5);
        ctx.restore();
      }

      for (const p of interfaceParticlesRef.current) {
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
          }
          ctx.strokeStyle =
            p.mode === 'grounding' ? 'rgba(52, 211, 153, 0.72)' : 'rgba(244, 114, 182, 0.82)';
          ctx.lineWidth = 2.0;
          ctx.stroke();
        }

        ctx.save();
        ctx.shadowColor = p.mode === 'grounding' ? '#34d399' : '#ec4899';
        ctx.shadowBlur = 10;
        ctx.fillStyle = p.mode === 'grounding' ? '#10b981' : '#ec4899';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fdf2f8';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        if (p.radius >= 3.0) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 7.5px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('e⁻', p.x, p.y - p.radius - 5);
        }
        ctx.restore();
      }

      // 16. Draw Friction Sparks & Active Cloth-Rubbing Sweep
      for (const rub of clothRubEffectsRef.current) {
        const target = currentObjects.find((o) => o.id === rub.objectId);
        if (!target) continue;
        const progress = 1 - rub.life / rub.maxLife;
        const alpha = Math.sin(progress * Math.PI);
        const sweepX = target.x + Math.sin(progress * Math.PI * 4) * (target.width * 0.35);
        const sweepY = target.y - target.height * 0.28 + Math.cos(progress * Math.PI * 3) * 8;

        ctx.save();
        ctx.translate(sweepX, sweepY);
        ctx.rotate(-0.25 + Math.sin(progress * Math.PI * 4) * 0.2);
        ctx.globalAlpha = Math.max(0.15, alpha);
        ctx.fillStyle = rub.deltaSign < 0 ? '#f59e0b' : '#e2e8f0';
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(-24, -14, 48, 28, 7);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 8.5px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rub.deltaSign < 0 ? 'WOOL PAD' : 'PTFE PAD', 0, 0);
        ctx.restore();
      }

      for (const spark of sparksRef.current) {
        ctx.fillStyle = spark.color;
        ctx.shadowColor = spark.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, Math.max(1, spark.life * spark.size), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 17. Draw Voltmeter Sensor Probe
      if (cfg.showProbe && currentSensor.isActive) {
        const readout = probeReadoutRef.current;
        ctx.save();
        ctx.translate(currentSensor.x, currentSensor.y);

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(16, 0);
        ctx.moveTo(0, -16);
        ctx.lineTo(0, 16);
        ctx.stroke();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(14, -40, 178, 80, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px Plus Jakarta Sans';
        ctx.textAlign = 'left';
        ctx.fillText('FIELD & POTENTIAL PROBE', 22, -24);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12.5px JetBrains Mono';
        ctx.fillText(`V = ${readout.voltageV} V`, 22, -6);

        ctx.fillStyle = '#ec4899';
        ctx.fillText(`|E| = ${readout.fieldMagnitude} N/C`, 22, 12);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10.5px JetBrains Mono';
        ctx.fillText(`Ex: ${readout.fieldEx} | Ey: ${readout.fieldEy}`, 22, 28);

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [canvasDimensions, setObjects]);

  // Pointer Interaction Handlers (live ref hit-testing + zero-lag direct ref dragging)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    lastPointerPos.current = { x: px, y: py, time: performance.now() };

    const cfg = overlayConfigRef.current;
    const liveSensor = sensorRef.current;
    if (cfg.showProbe && liveSensor.isActive) {
      const distProbe = Math.hypot(px - liveSensor.x, py - liveSensor.y);
      if (distProbe <= 24) {
        isDraggingProbe.current = true;
        probeOffsetRef.current = { x: liveSensor.x - px, y: liveSensor.y - py };
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }

    const liveObjects = objectsRef.current;
    for (let i = liveObjects.length - 1; i >= 0; i--) {
      const obj = liveObjects[i];
      const dx = px - obj.x;
      const dy = py - obj.y;
      const rad = (-obj.rotation * Math.PI) / 180;
      const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

      if (Math.abs(localX) <= obj.width / 2 + 14 && Math.abs(localY) <= obj.height / 2 + 14) {
        draggingId.current = obj.id;
        dragOffsetRef.current = { x: obj.x - px, y: obj.y - py };
        obj.vx = 0;
        obj.vy = 0;
        if (selectedObjectIdRef.current !== obj.id) {
          setSelectedObjectId(obj.id);
        }
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }

    if (selectedObjectIdRef.current !== null) {
      setSelectedObjectId(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingProbe.current && !draggingId.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const now = performance.now();
    let velocity = 0;
    let moveDt = 0.016;
    if (lastPointerPos.current) {
      const rawDt = (now - lastPointerPos.current.time) / 1000;
      const dx = px - lastPointerPos.current.x;
      const dy = py - lastPointerPos.current.y;
      if (rawDt > 0.0005) {
        moveDt = Math.min(0.05, Math.max(0.004, rawDt));
        velocity = Math.hypot(dx, dy) / rawDt;
      }
    }
    lastPointerPos.current = { x: px, y: py, time: now };

    if (isDraggingProbe.current) {
      const nx = Math.max(12, Math.min(canvas.width - 12, px + probeOffsetRef.current.x));
      const ny = Math.max(12, Math.min(canvas.height - 12, py + probeOffsetRef.current.y));
      sensorRef.current = { ...sensorRef.current, x: nx, y: ny };
      if (now - lastDragSyncTimeRef.current > 100) {
        lastDragSyncTimeRef.current = now;
        setSensor((prev) => ({ ...prev, x: nx, y: ny }));
      }
      return;
    }

    if (draggingId.current) {
      const targetId = draggingId.current;
      const liveObjects = objectsRef.current;
      const refDragged = liveObjects.find((o) => o.id === targetId);
      if (!refDragged) return;

      let nx = Math.max(24, Math.min(canvas.width - 24, px + dragOffsetRef.current.x));
      let ny = Math.max(24, Math.min(canvas.height - 24, py + dragOffsetRef.current.y));

      // Gentle 6 px magnetic snap to 60 px grid intersections when Precision Vector Grid is enabled
      if (overlayConfigRef.current.showFieldVectorGrid) {
        const snapStep = 60;
        const snapX = Math.round(nx / snapStep) * snapStep;
        const snapY = Math.round(ny / snapStep) * snapStep;
        if (Math.hypot(nx - snapX, ny - snapY) <= 6) {
          nx = Math.max(snapStep, Math.min(canvas.width - 24, snapX));
          ny = Math.max(snapStep, Math.min(canvas.height - 24, snapY));
        }
      }

      refDragged.x = nx;
      refDragged.y = ny;
      refDragged.vx = 0;
      refDragged.vy = 0;
      if (refDragged.shape === 'electroscope') {
        manuallyMovedScopeIdsRef.current.add(refDragged.id);
      }

      // Evaluate triboelectric rubbing directly against live physics refs (zero React re-render storm)
      let chargeTransferred = false;
      const cfg = overlayConfigRef.current;
      for (const other of liveObjects) {
        if (other.id === targetId) continue;
        const frictionResult = processFrictionRubbing(refDragged, other, velocity, moveDt);
        if (frictionResult) {
          chargeTransferred = true;
          rubAgitationRef.current[refDragged.id] = 1.4;
          rubAgitationRef.current[other.id] = 1.4;
          for (let s = 0; s < 4; s++) {
            sparksRef.current.push({
              x: frictionResult.sparkX + (Math.random() - 0.5) * 24,
              y: frictionResult.sparkY + (Math.random() - 0.5) * 24,
              vx: (Math.random() - 0.5) * 140,
              vy: (Math.random() - 0.5) * 140,
              life: 0.8 + Math.random() * 0.4,
              color: Math.random() > 0.5 ? '#38bdf8' : '#ec4899',
              size: 3.5 + Math.random() * 2.5,
            });
          }

          if (cfg.animateMovingCharges) {
            for (let c = 0; c < frictionResult.count; c++) {
              movingTransferParticlesRef.current.push({
                id: `transfer-${now}-${Math.random()}`,
                x: frictionResult.sparkX,
                y: frictionResult.sparkY,
                vx: (Math.random() - 0.5) * 40,
                vy: (Math.random() - 0.5) * 40,
                sign: -1,
                sourceObjectId: frictionResult.donorId,
                targetObjectId: frictionResult.acceptorId,
                progress: 0,
                life: 1.0,
                trail: [{ x: frictionResult.sparkX, y: frictionResult.sparkY }],
              });
            }
          }

          if (onFrictionLogRef.current) onFrictionLogRef.current(frictionResult.text);
        }
      }

      // Only notify React during drag when charge actually changed (throttled), never on raw pointer motion
      if (chargeTransferred && now - lastDragSyncTimeRef.current > 100) {
        lastDragSyncTimeRef.current = now;
        setObjects((prev) =>
          prev.map((o) => {
            const live = objectsRef.current.find((r) => r.id === o.id);
            return live ? { ...live, surfaceCharges: [...live.surfaceCharges], dipoles: [...live.dipoles] } : o;
          })
        );
      }
    }
  };

  const handlePointerUp = () => {
    const wasDraggingObj = draggingId.current !== null;
    const wasDraggingProbe = isDraggingProbe.current;
    draggingId.current = null;
    isDraggingProbe.current = false;
    lastPointerPos.current = null;

    if (wasDraggingProbe) {
      setSensor({ ...sensorRef.current });
    }
    if (wasDraggingObj) {
      setObjects((prev) =>
        prev.map((o) => {
          const live = objectsRef.current.find((r) => r.id === o.id);
          return live ? { ...live, surfaceCharges: [...live.surfaceCharges], dipoles: [...live.dipoles] } : o;
        })
      );
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[340px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      <canvas
        ref={canvasRef}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        className="w-full h-full cursor-crosshair touch-none"
      />

      {/* Guided Empty / Partial Stage Prompt Overlay */}
      {(() => {
        const hasObj1 = Boolean(
          objects.find((o) => o.id.startsWith('slot-0-')) ||
            objects.find((o) => !o.id.startsWith('slot-1-'))
        );
        const hasObj2 = Boolean(
          objects.find((o) => o.id.startsWith('slot-1-')) ||
            objects.find((o, idx) => idx === 1 && !o.id.startsWith('slot-0-'))
        );

        if (moduleMode === 'module1' && (!hasObj1 || !hasObj2)) {
          return (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
                {/* Step 1: Object 1 Slot */}
                <div
                  className={`rounded-2xl border p-4 backdrop-blur-sm transition-all ${
                    !hasObj1
                      ? 'bg-orange-950/55 border-orange-400 shadow-[0_0_24px_rgba(251,146,60,0.22)]'
                      : 'bg-slate-900/50 border-slate-700/80 opacity-75'
                  }`}
                >
                  <div className={`text-xs font-mono uppercase tracking-wider font-bold ${!hasObj1 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {!hasObj1 ? 'Step 1 · Select Object 1' : 'Step 1 · Placed'}
                  </div>
                  <div className="text-base font-bold text-slate-100 mt-1">
                    {!hasObj1 ? '← Choose Object 1 on Left' : '✓ Object 1 Ready'}
                  </div>
                  <div className="text-sm text-slate-300 mt-1">
                    {!hasObj1
                      ? 'Pick any material from the highlighted left panel.'
                      : 'Placed on the left side of the lab bench.'}
                  </div>
                </div>

                {/* Step 2: Object 2 Slot */}
                <div
                  className={`rounded-2xl border p-4 backdrop-blur-sm transition-all ${
                    hasObj1 && !hasObj2
                      ? 'bg-orange-950/55 border-orange-400 shadow-[0_0_24px_rgba(251,146,60,0.22)]'
                      : 'bg-slate-900/45 border-slate-800/80 opacity-80'
                  }`}
                >
                  <div className={`text-xs font-mono uppercase tracking-wider font-bold ${hasObj1 && !hasObj2 ? 'text-orange-400' : 'text-slate-300'}`}>
                    {hasObj1 && !hasObj2 ? 'Step 2 · Select Object 2' : 'Step 2 · Next'}
                  </div>
                  <div className="text-base font-bold text-slate-100 mt-1">
                    {!hasObj2 ? 'Choose Object 2 on Right →' : '✓ Object 2 Ready'}
                  </div>
                  <div className="text-sm text-slate-300 mt-1">
                    {hasObj1 && !hasObj2
                      ? 'Pick a second material from the highlighted right panel.'
                      : 'Then choose a second material, and rub to initiate a charge!'}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (moduleMode === 'module2' && objects.length === 0) {
          return (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div className="bg-slate-900/75 border border-slate-800 rounded-2xl px-6 py-4 text-center max-w-md backdrop-blur-sm">
                <div className="text-base font-bold text-slate-100">Empty Multi-Object Stage</div>
                <div className="text-sm text-slate-300 mt-1">
                  Select materials or a learning setup from the left toolbar to place objects on the bench.
                </div>
              </div>
            </div>
          );
        }

        if (moduleMode === 'module3' && objects.length === 0) {
          return (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-6 py-4 text-center max-w-lg backdrop-blur-sm">
                <div className="text-base font-bold text-slate-100">Blank Point Charges Stage</div>
                <div className="text-sm text-slate-300 mt-1.5">
                  Place a first charge (+ or −) from the bar above or left panel to view its electric field lines and vectors. Add a second charge to see how the field lines interact, then toggle <span className="font-semibold text-emerald-300">Animate &amp; Move</span> whenever you want them to attract or repel.
                </div>
              </div>
            </div>
          );
        }

        return null;
      })()}

      {/* Compact Stage Header Pill + Expand Stage Toggle */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2 bg-slate-900/88 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 text-xs lg:text-[13px] text-slate-200 shadow-md">
        <span className="font-semibold text-cyan-400">
          {moduleMode === 'module1'
            ? 'Two-Object Stage'
            : moduleMode === 'module3'
            ? 'Point Charges Stage'
            : moduleMode === 'module4'
            ? 'Gold-Leaf Electroscope'
            : 'Multi-Object Stage'}
        </span>
        {moduleMode === 'module3' && objects.length === 1 && (
          <>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="hidden sm:inline text-slate-300">
              1 charge placed · Add another charge to see field-line interaction
            </span>
          </>
        )}
        {moduleMode === 'module4' && !guidedElectroscopeMode && (
          <>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="hidden sm:inline text-slate-300">
              Free Explore · Rub objects, approach knob to induce, or touch knob to charge
            </span>
          </>
        )}
        {moduleMode !== 'module4' && objects.length >= 2 && (
          <>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="hidden sm:inline text-slate-300">
              {moduleMode === 'module3'
                ? overlayConfig.liveCoulombMotion
                  ? 'Motion ON · Charges attract & repel freely'
                  : 'Field View (Stationary) · Drag charges or enable Animate & Move'
                : 'Drag objects close to induce charge or touch to migrate e⁻'}
            </span>
          </>
        )}
      </div>

      {/* Module 4 Prep Station: Require Rubbing Object Before Placing on Stage */}
      {moduleMode === 'module4' && stagedPrepObject && (() => {
        const mat = MATERIALS_DATABASE[stagedPrepObject.materialId];
        const isGround = stagedPrepObject.materialId === 'ground';
        const isCharged = Math.abs(stagedPrepObject.charge) >= 0.5;
        const canPlace = isGround || isCharged;
        const chargePct = Math.min(100, (Math.abs(stagedPrepObject.charge) / 25) * 100);
        const gainsElectrons = (mat?.triboOrder ?? 0) < 0;

        return (
          <div className="absolute left-3 top-14 z-20 w-[min(264px,calc(100%-24px))] bg-slate-900/95 backdrop-blur-md border-2 border-amber-400 rounded-2xl p-3 shadow-[0_0_32px_rgba(251,191,36,0.24)] space-y-2.5">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[11px] font-extrabold uppercase tracking-wide shrink-0">
                  Prep Station
                </span>
                <span className="text-xs font-bold text-amber-200 truncate">
                  {canPlace ? 'Ready to Place!' : 'Rub First'}
                </span>
              </div>
              {onCancelStagedPrep && (
                <button
                  onClick={onCancelStagedPrep}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Pick a different object"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Visual Specimen Preview + Animated Rub Sweep */}
            <div className="relative rounded-xl bg-slate-950/90 border border-slate-800 p-2.5 overflow-hidden space-y-1.5">
              {isPrepRubbing && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/25 to-transparent animate-pulse pointer-events-none" />
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-sm shrink-0 border border-white/25 transition-transform ${
                      isPrepRubbing ? 'scale-125 rotate-6' : ''
                    }`}
                    style={{ backgroundColor: mat?.color || '#94a3b8' }}
                  />
                  <span className="text-sm font-bold text-slate-100 truncate">
                    {stagedPrepObject.name}
                  </span>
                </div>
                <span
                  className={`text-sm font-mono font-extrabold tabular-nums shrink-0 ${
                    stagedPrepObject.charge > 0.2
                      ? 'text-cyan-300'
                      : stagedPrepObject.charge < -0.2
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

              <div className="text-xs text-slate-300 leading-snug">
                {isGround
                  ? 'Earth Ground Plate is always at 0 V.'
                  : gainsElectrons
                  ? 'Rubbing with Wool/Fur adds negative electrons (−).'
                  : 'Rubbing with PTFE Cloth removes electrons (+).'}
              </div>

              {!isGround && (
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-200 ${
                      stagedPrepObject.charge < 0
                        ? 'bg-gradient-to-r from-pink-500 to-fuchsia-400'
                        : stagedPrepObject.charge > 0
                        ? 'bg-gradient-to-r from-sky-500 to-cyan-300'
                        : 'bg-slate-700'
                    }`}
                    style={{ width: `${Math.max(4, chargePct)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Required Sequential Buttons: 1. Rub -> 2. Place */}
            <div className="space-y-1.5">
              {!isGround && (
                <button
                  onClick={() => {
                    setIsPrepRubbing(true);
                    onRubStagedPrep?.();
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-[13px] flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    !isCharged
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-lg ring-2 ring-amber-200 animate-pulse'
                      : 'bg-amber-950/70 hover:bg-amber-900/70 border border-amber-400/70 text-amber-200'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${!isCharged ? 'fill-slate-950' : 'text-amber-300'}`} />
                  <span>{isCharged ? '1. Rub Again (+More Charge)' : '1. Rub to Charge Object'}</span>
                </button>
              )}

              <button
                onClick={() => onPlaceStagedPrep?.()}
                disabled={!canPlace}
                className={`w-full py-2.5 px-3 rounded-xl border font-extrabold text-[13px] flex items-center justify-center gap-1.5 transition-all ${
                  canPlace
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg active:scale-95'
                    : 'bg-slate-950 border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {canPlace ? (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{isGround ? 'Place Ground Plate →' : '2. Place on Stage →'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>2. Rub Above to Unlock Place</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Module 4 Step-by-Step Student Guide Banner (Bottom-Center, Never Covers Centered Electroscope) */}
      {moduleMode === 'module4' && guidedElectroscopeMode && (() => {
        const guide = getElectroscopeGuideState(objects, stagedPrepObject);
        return (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 w-[min(94%,620px)] bg-slate-900/92 backdrop-blur-md border border-amber-400/70 rounded-xl px-3.5 py-2 shadow-xl flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="flex items-center gap-1 shrink-0">
                  {[1, 2, 3, 4].map((s) => (
                    <span
                      key={s}
                      className={`w-5 h-5 rounded-full text-[11px] font-mono font-bold flex items-center justify-center ${
                        s === guide.step
                          ? 'bg-amber-400 text-slate-950'
                          : s < guide.step
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 truncate">
                  {guide.shortTitle}
                </span>
              </div>
              <p className="text-[13px] text-slate-100 leading-snug">
                {guide.instruction}
              </p>
            </div>

            {onToggleGuidedElectroscope && (
              <button
                onClick={onToggleGuidedElectroscope}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 whitespace-nowrap shrink-0 transition-colors"
                title="Turn off step-by-step guidance"
              >
                Turn Off Guide
              </button>
            )}
          </div>
        );
      })()}

      {onToggleExpandStage && (
        <button
          onClick={onToggleExpandStage}
          className={`absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all shadow-md backdrop-blur-md ${
            isStageExpanded
              ? 'bg-orange-950/85 border-orange-400 text-orange-200 hover:bg-orange-900/90'
              : 'bg-slate-900/85 border-slate-700 text-slate-200 hover:border-cyan-400/70 hover:text-cyan-300'
          }`}
          title={isStageExpanded ? 'Show side material & control panels' : 'Hide side panels for full-width view'}
        >
          {isStageExpanded ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Show Panels</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expand Stage</span>
            </>
          )}
        </button>
      )}

      {/* Compact Charge Animation Legend in Bottom-Left Corner */}
      <div className="absolute bottom-2 left-2.5 z-10 flex items-center gap-2.5 bg-slate-900/88 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-xs text-slate-200 shadow-md font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#38bdf8]" />
          <span className="text-cyan-300 font-semibold">
            {moduleMode === 'module3' ? 'Positive (+Q)' : 'Nuclei (+)'}
          </span>
        </div>
        <span className="text-slate-600">·</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_5px_#ec4899]" />
          <span className="text-pink-300 font-semibold">
            {moduleMode === 'module3' ? 'Negative (−Q)' : 'Electrons (e⁻)'}
          </span>
        </div>
        {moduleMode === 'module3' && (
          <>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 font-semibold">F = kₑq₁q₂/r²</span>
          </>
        )}
      </div>

      {overlayConfig.showFieldVectorGrid && (
        <div className="absolute bottom-2 right-2.5 z-10 flex items-center gap-2 bg-slate-900/88 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-500/40 text-xs text-cyan-200 shadow-md font-mono">
          <span>Grid: 60 px</span>
          <span className="text-slate-600">·</span>
          <span>|E| in N/C</span>
        </div>
      )}
    </div>
  );
};
