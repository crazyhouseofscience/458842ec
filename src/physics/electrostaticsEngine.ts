import {
  ElectroObject,
  ProbeData,
  Vector2D,
  CoulombForceVector,
  SurfaceCharge,
  AtomicDipole,
  ContactMigrationEvent,
} from '../types/electrostatics';
import { MATERIALS_DATABASE } from './materialsData';

// Exact SI Physical Constants (CODATA 2022 / NIST)
// Tabletop bench scale: 600 pixels = 1 meter (1 pixel ≈ 1.67 mm; 180 px rod ≈ 30 cm)
export const PIXELS_PER_METER = 600;
export const COULOMB_CONSTANT_KE = 8.9875517923e9; // N·m²/C² (1 / 4πε₀)
export const VACUUM_PERMITTIVITY_EPS0 = 8.8541878128e-12; // F/m (ε₀)
export const NC_TO_COULOMBS = 1e-9; // 1 nC = 10⁻⁹ C
export const ELEMENTARY_CHARGE_C = 1.602176634e-19; // C (exact SI)
export const AIR_VISCOSITY_ETA = 1.81e-5; // Pa·s (dynamic viscosity of air at 20 °C, 1 atm)
export const AIR_DIELECTRIC_BREAKDOWN_VM = 3.0e6; // V/m (Paschen dry air breakdown strength)
export const GRAVITY_G = 9.80665; // m/s²

/**
 * Calculates Electric Field E = (Ex, Ey) in N/C at point (px, py) from all charged objects.
 */
export function calculateElectricField(px: number, py: number, objects: ElectroObject[]): { Ex: number; Ey: number; magnitude: number } {
  let Ex = 0;
  let Ey = 0;

  for (const obj of objects) {
    // If object has zero net charge and no surface charges, skip direct monopole contribution
    if (Math.abs(obj.charge) < 0.001 && obj.surfaceCharges.length === 0) continue;

    if (obj.shape === 'electroscope') {
      const { knobX, knobY, leavesX, leavesY } = getElectroscopeTerminals(obj);
      const qKnob = (obj.knobChargeNc ?? obj.charge * 0.45) * NC_TO_COULOMBS;
      const qLeaves = (obj.leafChargeNc ?? obj.charge * 0.55) * NC_TO_COULOMBS;
      for (const [tx, ty, qCol] of [
        [knobX, knobY, qKnob],
        [leavesX, leavesY, qLeaves],
      ] as Array<[number, number, number]>) {
        if (Math.abs(qCol) < 1e-12) continue;
        const dxMeter = (px - tx) / PIXELS_PER_METER;
        const dyMeter = (py - ty) / PIXELS_PER_METER;
        const r2 = dxMeter * dxMeter + dyMeter * dyMeter + 0.00025;
        const r = Math.sqrt(r2);
        const dE = (COULOMB_CONSTANT_KE * qCol) / r2;
        Ex += dE * (dxMeter / r);
        Ey += dE * (dyMeter / r);
      }
    } else if (obj.surfaceCharges.length > 0) {
      const qPerPoint = (obj.charge * NC_TO_COULOMBS) / obj.surfaceCharges.length;
      const cosRot = Math.cos((obj.rotation * Math.PI) / 180);
      const sinRot = Math.sin((obj.rotation * Math.PI) / 180);

      for (const sc of obj.surfaceCharges) {
        // Transform relative sc coords to canvas space
        const localX = sc.relX * obj.width;
        const localY = sc.relY * obj.height;
        const scX = obj.x + (localX * cosRot - localY * sinRot);
        const scY = obj.y + (localX * sinRot + localY * cosRot);

        const dxMeter = (px - scX) / PIXELS_PER_METER;
        const dyMeter = (py - scY) / PIXELS_PER_METER;
        const r2 = dxMeter * dxMeter + dyMeter * dyMeter + 0.00015; // softening ~1.2 cm
        const r = Math.sqrt(r2);

        const dE = (COULOMB_CONSTANT_KE * qPerPoint) / r2;
        Ex += dE * (dxMeter / r);
        Ey += dE * (dyMeter / r);
      }
    } else {
      // Aggregate point model
      const qCol = obj.charge * NC_TO_COULOMBS;
      const dxMeter = (px - obj.x) / PIXELS_PER_METER;
      const dyMeter = (py - obj.y) / PIXELS_PER_METER;
      const softening = obj.shape === 'point_charge' ? 0.00018 : 0.0004;
      const r2 = dxMeter * dxMeter + dyMeter * dyMeter + softening;
      const r = Math.sqrt(r2);

      const dE = (COULOMB_CONSTANT_KE * qCol) / r2;
      Ex += dE * (dxMeter / r);
      Ey += dE * (dyMeter / r);
    }
  }

  const magnitude = Math.sqrt(Ex * Ex + Ey * Ey);
  return { Ex, Ey, magnitude };
}

/**
 * Calculates Electric Potential V in Volts at point (px, py).
 */
export function calculateElectricPotential(px: number, py: number, objects: ElectroObject[]): number {
  let V = 0;

  for (const obj of objects) {
    if (Math.abs(obj.charge) < 0.001) continue;

    const qCol = obj.charge * NC_TO_COULOMBS;
    const dxMeter = (px - obj.x) / PIXELS_PER_METER;
    const dyMeter = (py - obj.y) / PIXELS_PER_METER;
    const r = Math.max(0.012, Math.sqrt(dxMeter * dxMeter + dyMeter * dyMeter));

    V += (COULOMB_CONSTANT_KE * qCol) / r;
  }

  return V;
}

/**
 * Calculates Coulomb Force Vectors between all pairs of objects, including:
 * 1) Direct Coulomb interaction F = k_e * qA * qB / r^2
 * 2) Electrostatic induction / Clausius-Mossotti dipole attraction when a charged body approaches a neutral conductor or dielectric.
 */
export function calculateCoulombForces(objects: ElectroObject[]): CoulombForceVector[] {
  const forceVectors: CoulombForceVector[] = [];

  for (let i = 0; i < objects.length; i++) {
    const objA = objects[i];
    let netFx = 0;
    let netFy = 0;
    let strongestOtherId: string | undefined;
    let strongestPairForce = 0;
    let isAttractive = false;

    for (let j = 0; j < objects.length; j++) {
      if (i === j) continue;
      const objB = objects[j];

      const dxMeter = (objA.x - objB.x) / PIXELS_PER_METER;
      const dyMeter = (objA.y - objB.y) / PIXELS_PER_METER;
      const r2 = dxMeter * dxMeter + dyMeter * dyMeter + 0.0004;
      const r = Math.sqrt(r2);

      const qA = objA.charge * NC_TO_COULOMBS;
      const qB = objB.charge * NC_TO_COULOMBS;

      // 1. Direct Coulomb Monopole Force along unit vector from B -> A (> 0 repulsive, < 0 attractive)
      const F_monopole_uN = ((COULOMB_CONSTANT_KE * qA * qB) / r2) * 1e6;

      // 2. Induced polarization (Clausius-Mossotti dielectric) & conductor image-charge attraction
      const matA = MATERIALS_DATABASE[objA.materialId];
      const matB = MATERIALS_DATABASE[objB.materialId];
      const absQA = Math.abs(objA.charge);
      const absQB = Math.abs(objB.charge);

      let F_ind_A_uN = 0;
      if (objA.shape !== 'point_charge' && absQB >= 0.15 && matA) {
        const neutralWeightA = Math.max(0, 1 - absQA / (0.3 * absQB + 0.4));
        if (neutralWeightA > 0.01) {
          const clausiusA =
            matA.category === 'conductor'
              ? 1.0
              : Math.max(0.16, (matA.dielectricConstant - 1) / (matA.dielectricConstant + 2));
          const aEffA = Math.min(0.11, Math.max(0.055, Math.sqrt(objA.width * objA.height) / (2.0 * PIXELS_PER_METER)));
          const bEdge = getBoundaryPointToward(objB, objA.x, objA.y);
          const distEdgeA = Math.hypot(objA.x - bEdge.x, objA.y - bEdge.y) / PIXELS_PER_METER;
          const rPolA = Math.max(aEffA * 1.25, 0.55 * distEdgeA + 0.45 * r);
          const F_pol_A_N = (3.8 * clausiusA * COULOMB_CONSTANT_KE * qB * qB * Math.pow(aEffA, 3)) / Math.pow(rPolA, 5);
          F_ind_A_uN = F_pol_A_N * 1e6 * neutralWeightA;
        }
      }

      let F_ind_B_uN = 0;
      if (objB.shape !== 'point_charge' && absQA >= 0.15 && matB) {
        const neutralWeightB = Math.max(0, 1 - absQB / (0.3 * absQA + 0.4));
        if (neutralWeightB > 0.01) {
          const clausiusB =
            matB.category === 'conductor'
              ? 1.0
              : Math.max(0.16, (matB.dielectricConstant - 1) / (matB.dielectricConstant + 2));
          const aEffB = Math.min(0.11, Math.max(0.055, Math.sqrt(objB.width * objB.height) / (2.0 * PIXELS_PER_METER)));
          const aEdge = getBoundaryPointToward(objA, objB.x, objB.y);
          const distEdgeB = Math.hypot(objB.x - aEdge.x, objB.y - aEdge.y) / PIXELS_PER_METER;
          const rPolB = Math.max(aEffB * 1.25, 0.55 * distEdgeB + 0.45 * r);
          const F_pol_B_N = (3.8 * clausiusB * COULOMB_CONSTANT_KE * qA * qA * Math.pow(aEffB, 3)) / Math.pow(rPolB, 5);
          F_ind_B_uN = F_pol_B_N * 1e6 * neutralWeightB;
        }
      }

      // Unified signed pairwise force (> 0 repulsion, < 0 attraction), strictly obeying Newton's 3rd Law
      const signedPairForce_uN = F_monopole_uN - F_ind_A_uN - F_ind_B_uN;
      const absPairForce = Math.abs(signedPairForce_uN);

      if (absPairForce > 0.0001) {
        netFx += signedPairForce_uN * (dxMeter / r);
        netFy += signedPairForce_uN * (dyMeter / r);
        if (absPairForce > strongestPairForce) {
          strongestPairForce = absPairForce;
          strongestOtherId = objB.id;
          isAttractive = signedPairForce_uN < 0;
        }
      }
    }

    const magnitude = Math.sqrt(netFx * netFx + netFy * netFy);
    forceVectors.push({
      objectId: objA.id,
      otherObjectId: strongestOtherId,
      fx: netFx,
      fy: netFy,
      magnitude,
      isAttractive
    });
  }

  return forceVectors;
}

/**
 * Handles Friction Charging when Object A is dragged/rubbed against Object B.
 * Returns friction log event with detailed electron flow particles if transfer occurred.
 */
export function processFrictionRubbing(
  objA: ElectroObject,
  objB: ElectroObject,
  dragVelocity: number, // pixels per sec
  dt: number, // delta time seconds
  ignoreDistance: boolean = false
): {
  transferredChargeNc: number;
  workFunctionDiffEv: number;
  sparkX: number;
  sparkY: number;
  text: string;
  donorId: string;
  acceptorId: string;
  count: number;
} | null {
  if (
    objA.shape === 'point_charge' ||
    objB.shape === 'point_charge' ||
    objA.shape === 'electroscope' ||
    objB.shape === 'electroscope'
  ) {
    return null;
  }

  // Check collision / overlap
  const dx = objA.x - objB.x;
  const dy = objA.y - objB.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minOverlap = (Math.min(objA.width, objA.height) + Math.min(objB.width, objB.height)) / 2;

  if (!ignoreDistance && dist > minOverlap * 1.25) return null; // Not touching
  if (dragVelocity < 10) return null; // Needs rubbing motion

  const matA = MATERIALS_DATABASE[objA.materialId];
  const matB = MATERIALS_DATABASE[objB.materialId];
  if (!matA || !matB) return null;

  // Work function difference defines electron flow: electrons flow from lower W (donor, +) to higher W (acceptor, -)
  const orderDiff = matA.triboOrder - matB.triboOrder;
  if (Math.abs(orderDiff) < 0.5) return null; // Identical or equal-affinity materials transfer negligible net charge
  const workFunctionDiffEv = Math.abs(matA.workFunctionEv - matB.workFunctionEv);

  // Rate of charge transfer in nC per second
  const frictionFactor = 0.0014 * dragVelocity * Math.abs(orderDiff);
  let dq = frictionFactor * dt;

  let donor = matA.name;
  let acceptor = matB.name;
  let donorId = objA.id;
  let acceptorId = objB.id;

  const isGroundA = objA.isGrounded || objA.materialId === 'ground';
  const isGroundB = objB.isGrounded || objB.materialId === 'ground';

  // Respect maximum charge capacity and Earth ground reservoir (V = 0)
  if (orderDiff > 0) {
    // objA donates e- to objB -> objA becomes (+), objB becomes (-)
    const capA = isGroundA ? 100 : objA.capacityNc - objA.charge;
    const capB = isGroundB ? 100 : objB.capacityNc + objB.charge;
    dq = Math.min(dq, capA, capB);
    if (dq > 0.001) {
      if (!isGroundA) objA.charge += dq;
      if (!isGroundB) objB.charge -= dq;
    }
  } else {
    // objB donates e- to objA -> objA becomes (-), objB becomes (+)
    donor = matB.name;
    acceptor = matA.name;
    donorId = objB.id;
    acceptorId = objA.id;
    const capA = isGroundA ? 100 : objA.capacityNc + objA.charge;
    const capB = isGroundB ? 100 : objB.capacityNc - objB.charge;
    dq = Math.min(dq, capA, capB);
    if (dq > 0.001) {
      if (!isGroundA) objA.charge -= dq;
      if (!isGroundB) objB.charge += dq;
    }
  }

  if (dq <= 0.001) return null;

  // Update microscopic surface charge markers on objects
  updateSurfaceChargeDots(objA);
  updateSurfaceChargeDots(objB);

  const sparkX = (objA.x + objB.x) / 2;
  const sparkY = (objA.y + objB.y) / 2;

  return {
    transferredChargeNc: dq,
    workFunctionDiffEv,
    sparkX,
    sparkY,
    text: `Electron transfer (ΔW=${workFunctionDiffEv.toFixed(2)} eV): ${donor} (W=${(orderDiff > 0 ? matA.workFunctionEv : matB.workFunctionEv).toFixed(2)} eV) shed e⁻ to ${acceptor} (W=${(orderDiff > 0 ? matB.workFunctionEv : matA.workFunctionEv).toFixed(2)} eV)!`,
    donorId,
    acceptorId,
    count: Math.max(1, Math.min(6, Math.ceil(dq * 15)))
  };
}

/**
 * Initiates a realistic triboelectric charge on a single selected specimen by rubbing it
 * with an opposing lab exciter cloth (Fur/Wool W=3.85 eV for electron acceptors, or PTFE W=5.80 eV for donors).
 */
export function rubSingleObjectWithLabCloth(
  obj: ElectroObject
): { transferredChargeNc: number; deltaSign: 1 | -1; clothName: string; text: string } | null {
  if (obj.shape === 'point_charge') return null;
  const mat = MATERIALS_DATABASE[obj.materialId];
  if (!mat) return null;

  if (obj.isGrounded || obj.materialId === 'ground') {
    obj.charge = 0;
    updateSurfaceChargeDots(obj);
    return {
      transferredChargeNc: 0,
      deltaSign: 1,
      clothName: 'Earth Ground',
      text: `${mat.name} is grounded at 0 V — excess charges drain straight to Earth!`,
    };
  }

  // Electron acceptors (triboOrder < 0) gain e- from Fur/Wool; donors (>= 0) lose e- to PTFE cloth
  const gainsElectrons = mat.triboOrder < 0;
  const clothName = gainsElectrons ? 'Wool/Fur Pad (3.85 eV)' : 'PTFE Exciter Cloth (5.80 eV)';
  const stepNc = Math.max(6.5, Math.min(11.0, 5.5 + Math.abs(mat.triboOrder) * 0.55));

  let applied = 0;
  if (gainsElectrons) {
    applied = Math.min(stepNc, obj.capacityNc + obj.charge);
    obj.charge -= applied;
  } else {
    applied = Math.min(stepNc, obj.capacityNc - obj.charge);
    obj.charge += applied;
  }

  updateSurfaceChargeDots(obj);

  return {
    transferredChargeNc: applied,
    deltaSign: gainsElectrons ? -1 : 1,
    clothName,
    text: gainsElectrons
      ? `Rubbed ${mat.name} with ${clothName}: gained ${applied.toFixed(1)} nC of e⁻ (Q = ${obj.charge.toFixed(1)} nC).`
      : `Rubbed ${mat.name} with ${clothName}: shed e⁻ leaving +${applied.toFixed(1)} nC net charge (Q = +${obj.charge.toFixed(1)} nC).`,
  };
}

/**
 * Regenerates surface charges dots (+ and -) on an object based on net charge Q,
 * adding lattice positions, drift speeds, and organic distribution.
 */
export function updateSurfaceChargeDots(obj: ElectroObject) {
  if (obj.shape === 'point_charge' || obj.shape === 'electroscope') {
    obj.surfaceCharges = [];
    return;
  }
  const numCharges = Math.min(48, Math.floor(Math.abs(obj.charge) * 1.8));
  const sign = obj.charge >= 0 ? 1 : -1;
  const dots: SurfaceCharge[] = [];

  if (numCharges > 0) {
    const isConductor = MATERIALS_DATABASE[obj.materialId]?.category === 'conductor';
    for (let i = 0; i < numCharges; i++) {
      let relX = 0;
      let relY = 0;

      if (isConductor) {
        // Conductors push charge strictly to outer perimeter / surface via mutual Coulomb repulsion!
        const angle = (i / numCharges) * Math.PI * 2 + (i % 2 === 0 ? 0 : 0.05);
        relX = Math.cos(angle) * 0.44;
        relY = Math.sin(angle) * 0.44;
      } else {
        // Insulators hold charge locally where rubbed across the surface
        const cols = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(numCharges * 1.5))));
        const col = i % cols;
        const row = Math.floor(i / cols);
        const maxRows = Math.ceil(numCharges / cols);
        
        relX = ((col + 0.5) / cols - 0.5) * 0.85 + (Math.sin(i * 1.7) * 0.03);
        relY = ((row + 0.5) / Math.max(1, maxRows) - 0.5) * 0.85 + (Math.cos(i * 2.3) * 0.03);
      }

      dots.push({
        id: `${obj.id}-sc-${i}`,
        relX,
        relY,
        sign,
        isBound: !isConductor,
        vx: isConductor ? (Math.random() - 0.5) * 0.04 : 0,
        vy: isConductor ? (Math.random() - 0.5) * 0.04 : 0,
        pulsePhase: (i / numCharges) * Math.PI * 2
      });
    }
  }

  obj.surfaceCharges = dots;
}

/**
 * Updates microscopic atomic dipole alignment for neutral dielectrics.
 */
export function updateDielectricDipoles(objects: ElectroObject[]) {
  for (const obj of objects) {
    if (obj.shape === 'point_charge' || obj.shape === 'electroscope') {
      obj.dipoles = [];
      continue;
    }
    const mat = MATERIALS_DATABASE[obj.materialId];
    if (!mat || mat.category === 'conductor' || Math.abs(obj.charge) >= 0.5) {
      obj.dipoles = [];
      continue;
    }

    // Sample electric field at object center from external objects
    const otherObjs = objects.filter((o) => o.id !== obj.id);
    const field = calculateElectricField(obj.x, obj.y, otherObjs);

    if (field.magnitude > 35) {
      const chi = Math.max(0.2, mat.dielectricConstant - 1); // susceptibility
      const dipoleCount = 8;
      const dipoles: AtomicDipole[] = [];

      for (let i = 0; i < dipoleCount; i++) {
        const angle = (i / dipoleCount) * Math.PI * 2;
        const r = 0.25;
        const relX = Math.cos(angle) * r;
        const relY = Math.sin(angle) * r;

        // Dipole moment aligns parallel to E field
        const px = (field.Ex / field.magnitude) * chi * 0.12;
        const py = (field.Ey / field.magnitude) * chi * 0.12;

        dipoles.push({
          relX,
          relY,
          px,
          py,
          magnitude: field.magnitude
        });
      }
      obj.dipoles = dipoles;
    } else {
      obj.dipoles = [];
    }
  }
}

/**
 * Computes effective isolated self-capacitance C (Farads) of an object from its physical dimensions.
 */
export function computeObjectCapacitanceF(obj: ElectroObject): number {
  if (obj.isGrounded || obj.materialId === 'ground') return Infinity;
  const aEff = Math.min(0.11, Math.max(0.055, Math.sqrt(obj.width * obj.height) / (2.0 * PIXELS_PER_METER)));
  const capScale = Math.max(0.4, obj.capacityNc / 30);
  return 4 * Math.PI * VACUUM_PERMITTIVITY_EPS0 * aEff * capScale;
}

/**
 * Computes self electrostatic potential V = Q / C (Volts) of an object; Earth ground is 0 V.
 */
export function computeObjectPotentialV(obj: ElectroObject): number {
  if (obj.isGrounded || obj.materialId === 'ground') return 0;
  const capF = computeObjectCapacitanceF(obj);
  return (obj.charge * NC_TO_COULOMBS) / capF;
}

function getBoundaryPointToward(obj: ElectroObject, targetX: number, targetY: number): Vector2D {
  const dx = targetX - obj.x;
  const dy = targetY - obj.y;
  const rotRad = (obj.rotation * Math.PI) / 180;
  const cosR = Math.cos(-rotRad);
  const sinR = Math.sin(-rotRad);
  const lx = dx * cosR - dy * sinR;
  const ly = dx * sinR + dy * cosR;

  let bx = 0;
  let by = 0;
  if (obj.shape === 'sphere') {
    const r = Math.min(obj.width, obj.height) / 2;
    const d = Math.hypot(lx, ly) || 1;
    bx = (lx / d) * r;
    by = (ly / d) * r;
  } else {
    const hw = obj.width / 2;
    const hh = obj.height / 2;
    if (Math.abs(lx) > 0.001 || Math.abs(ly) > 0.001) {
      const tx = Math.abs(lx) > 0.001 ? hw / Math.abs(lx) : Infinity;
      const ty = Math.abs(ly) > 0.001 ? hh / Math.abs(ly) : Infinity;
      const t = Math.min(tx, ty);
      bx = lx * t;
      by = ly * t;
    }
  }

  const cosF = Math.cos(rotRad);
  const sinF = Math.sin(rotRad);
  return {
    x: obj.x + (bx * cosF - by * sinF),
    y: obj.y + (bx * sinF + by * cosF),
  };
}

/**
 * Computes exact surface-to-surface gap and physical contact interface coordinates between two shapes.
 */
export function computeContactGeometry(objA: ElectroObject, objB: ElectroObject): {
  touching: boolean;
  signedGapPx: number;
  interfaceX: number;
  interfaceY: number;
} {
  const aEdge = getBoundaryPointToward(objA, objB.x, objB.y);
  const bEdge = getBoundaryPointToward(objB, objA.x, objA.y);
  const dx = objB.x - objA.x;
  const dy = objB.y - objA.y;
  const ex = bEdge.x - aEdge.x;
  const ey = bEdge.y - aEdge.y;
  const overlapDot = ex * dx + ey * dy;
  const rawGap = Math.hypot(ex, ey);
  const signedGapPx = overlapDot <= 0 ? -rawGap : rawGap;
  return {
    touching: signedGapPx <= 14,
    signedGapPx,
    interfaceX: (aEdge.x + bEdge.x) / 2,
    interfaceY: (aEdge.y + bEdge.y) / 2,
  };
}

/**
 * Handles time-resolved electrical conduction, grounding, and contact electrification
 * when objects come into physical contact, returning interface migration events driven by ΔV and ΔW.
 */
export function processConductionAndGrounding(
  objects: ElectroObject[],
  dt: number,
  humidityPercent: number
): ContactMigrationEvent[] {
  const events: ContactMigrationEvent[] = [];
  const stepDt = Math.max(0.001, dt);

  // 1. Humidity leakage (charge decays over time into humid air for macroscopic lab specimens)
  if (humidityPercent > 5) {
    const decayRate = 0.0005 * (humidityPercent / 100);
    for (const obj of objects) {
      if (obj.shape === 'point_charge') continue;
      if (Math.abs(obj.charge) > 0.01 && obj.materialId !== 'ground') {
        obj.charge *= (1 - decayRate * stepDt * 60);
        updateSurfaceChargeDots(obj);
      }
    }
  }

  // 2. Self-grounding reservoir & physical interface charge migration
  for (let i = 0; i < objects.length; i++) {
    const objA = objects[i];
    if (objA.shape === 'point_charge') continue;
    const isGroundA = objA.isGrounded || objA.materialId === 'ground';
    // Note: a grounded electroscope tracks Q_target = -C * V_ext(knob) in updateElectroscopePhysics
    // so grounding near a charged rod enables permanent induction charging!
    if (isGroundA && objA.shape !== 'electroscope' && Math.abs(objA.charge) > 0.01) {
      objA.charge *= Math.exp(-6.0 * stepDt);
      updateSurfaceChargeDots(objA);
    }

    for (let j = i + 1; j < objects.length; j++) {
      const objB = objects[j];
      if (objB.shape === 'point_charge') continue;
      const isGroundB = objB.isGrounded || objB.materialId === 'ground';

      const isScopeA = objA.shape === 'electroscope';
      const isScopeB = objB.shape === 'electroscope';
      let contact = computeContactGeometry(objA, objB);
      let isElectroscopeKnobTouch = false;

      if (isScopeA !== isScopeB) {
        const scope = isScopeA ? objA : objB;
        const other = isScopeA ? objB : objA;
        const { knobX, knobY } = getElectroscopeTerminals(scope);
        const otherPt = getBoundaryPointToward(other, knobX, knobY);
        const knobDist = Math.hypot(otherPt.x - knobX, otherPt.y - knobY);
        if (knobDist <= 30) {
          isElectroscopeKnobTouch = true;
          contact = {
            touching: true,
            signedGapPx: knobDist - 18,
            interfaceX: (knobX + otherPt.x) / 2,
            interfaceY: (knobY + otherPt.y) / 2,
          };
        } else {
          // Only trigger conduction with an electroscope at its brass collector knob (glass bell jar insulates the sides)
          contact.touching = false;
        }
      }

      if (!contact.touching) continue;

      const matA = MATERIALS_DATABASE[objA.materialId];
      const matB = MATERIALS_DATABASE[objB.materialId];
      if (!matA || !matB) continue;

      const isCondA = matA.category === 'conductor';
      const isCondB = matB.category === 'conductor';
      const vA = computeObjectPotentialV(objA);
      const vB = computeObjectPotentialV(objB);
      const deltaV = vB - vA; // > 0 means B has higher potential, so e- flow A -> B
      const absDeltaV = Math.abs(deltaV);
      const deltaW = matB.workFunctionEv - matA.workFunctionEv;
      const absDeltaW = Math.abs(deltaW);

      const pairKey = [objA.id, objB.id].sort().join('::');

      let donor: ElectroObject | null = null;
      let acceptor: ElectroObject | null = null;
      let migratedNc = 0;
      let mode: ContactMigrationEvent['mode'] = 'conduction';

      if (isGroundA && !isGroundB) {
        // Ground is infinite e- source/sink at V = 0 V
        if (Math.abs(objB.charge) > 0.04) {
          const rate = isCondB ? 3.8 : 1.15;
          const dq = Math.abs(objB.charge) * (1 - Math.exp(-rate * stepDt));
          if (dq > 0.0004) {
            if (objB.charge < 0) {
              objB.charge += dq;
              donor = objB;
              acceptor = objA;
            } else {
              objB.charge -= dq;
              donor = objA;
              acceptor = objB;
            }
            migratedNc = dq;
            mode = 'grounding';
            updateSurfaceChargeDots(objB);
          }
        }
      } else if (isGroundB && !isGroundA) {
        if (Math.abs(objA.charge) > 0.04) {
          const rate = isCondA ? 3.8 : 1.15;
          const dq = Math.abs(objA.charge) * (1 - Math.exp(-rate * stepDt));
          if (dq > 0.0004) {
            if (objA.charge < 0) {
              objA.charge += dq;
              donor = objA;
              acceptor = objB;
            } else {
              objA.charge -= dq;
              donor = objB;
              acceptor = objA;
            }
            migratedNc = dq;
            mode = 'grounding';
            updateSurfaceChargeDots(objA);
          }
        }
      } else if (isCondA && isCondB) {
        // Two conductors equalize potential V_A == V_B smoothly via ΔV
        const cA = computeObjectCapacitanceF(objA);
        const cB = computeObjectCapacitanceF(objB);
        const qEqA = (objA.charge + objB.charge) * (cA / (cA + cB));
        const qDiff = qEqA - objA.charge;

        if (absDeltaV > 10 && Math.abs(qDiff) > 0.03) {
          const rate = 3.4;
          const dqSigned = qDiff * (1 - Math.exp(-rate * stepDt));
          if (Math.abs(dqSigned) > 0.0004) {
            objA.charge += dqSigned;
            objB.charge -= dqSigned;
            donor = dqSigned > 0 ? objA : objB;
            acceptor = dqSigned > 0 ? objB : objA;
            migratedNc = Math.abs(dqSigned);
            mode = 'conduction';
            updateSurfaceChargeDots(objA);
            updateSurfaceChargeDots(objB);
          }
        }
      } else if (isCondA !== isCondB && absDeltaV > 20) {
        // Charged insulator touching conductor or electroscope knob: transfer static charge by conduction
        const cA = computeObjectCapacitanceF(objA);
        const cB = computeObjectCapacitanceF(objB);
        const qEqA = (objA.charge + objB.charge) * (cA / (cA + cB));
        const qDiff = qEqA - objA.charge;
        if (Math.abs(qDiff) > 0.05) {
          const rate = isElectroscopeKnobTouch ? 2.1 : 0.72;
          const dqSigned = qDiff * (1 - Math.exp(-rate * stepDt));
          if (Math.abs(dqSigned) > 0.0003) {
            objA.charge += dqSigned;
            objB.charge -= dqSigned;
            donor = dqSigned > 0 ? objA : objB;
            acceptor = dqSigned > 0 ? objB : objA;
            migratedNc = Math.abs(dqSigned);
            mode = isElectroscopeKnobTouch ? 'conduction' : 'surface_bleed';
            updateSurfaceChargeDots(objA);
            updateSurfaceChargeDots(objB);
          }
        }
      } else if (!isElectroscopeKnobTouch && absDeltaW >= 0.35 && Math.abs(objA.charge) < 2.2 && Math.abs(objB.charge) < 2.2) {
        // Contact electrification (Fermi-level equilibration ΔΦ = W_B - W_A) between dissimilar materials in contact
        const qContactTarget = Math.min(2.4, absDeltaW * 1.05);
        const targetA = deltaW > 0 ? qContactTarget : -qContactTarget;
        const qDiff = targetA - objA.charge;
        if (Math.abs(qDiff) > 0.04) {
          const rate = 0.85;
          const dqSigned = qDiff * (1 - Math.exp(-rate * stepDt));
          if (Math.abs(dqSigned) > 0.0003) {
            objA.charge += dqSigned;
            objB.charge -= dqSigned;
            donor = dqSigned > 0 ? objA : objB;
            acceptor = dqSigned > 0 ? objB : objA;
            migratedNc = Math.abs(dqSigned);
            mode = 'contact_potential';
            updateSurfaceChargeDots(objA);
            updateSurfaceChargeDots(objB);
          }
        }
      }

      if (donor && acceptor && migratedNc > 0) {
        const dirDx = acceptor.x - donor.x;
        const dirDy = acceptor.y - donor.y;
        const dirLen = Math.hypot(dirDx, dirDy) || 1;
        events.push({
          pairKey,
          objAId: objA.id,
          objBId: objB.id,
          donorId: donor.id,
          acceptorId: acceptor.id,
          interfaceX: contact.interfaceX,
          interfaceY: contact.interfaceY,
          normalX: dirDx / dirLen,
          normalY: dirDy / dirLen,
          deltaPotentialV: absDeltaV,
          deltaWorkFunctionEv: absDeltaW,
          migratedChargeNc: migratedNc,
          mode,
        });
      }
    }
  }

  return events;
}

/**
 * Traces Electric Field Lines starting from positive charges or grid sources.
 */
export function generateElectricFieldLines(objects: ElectroObject[], boundsWidth: number, boundsHeight: number): Vector2D[][] {
  const lines: Vector2D[][] = [];
  const chargedObjects = objects.filter((o) => Math.abs(o.charge) > 0.05);

  if (chargedObjects.length === 0) return lines;

  // Trace seed points around positive charges (or negative if only negatives exist)
  for (const obj of chargedObjects) {
    const isPositive = obj.charge > 0;
    const isPoint = obj.shape === 'point_charge';
    const numSeeds = isPoint
      ? Math.min(20, Math.max(8, Math.round(Math.abs(obj.charge) * 1.1)))
      : Math.min(16, Math.max(8, Math.floor(Math.abs(obj.charge) * 1.2)));

    for (let s = 0; s < numSeeds; s++) {
      const angle = (s / numSeeds) * Math.PI * 2;
      const seedRx = isPoint ? obj.width / 2 + 4 : obj.width / 2 + 10;
      const seedRy = isPoint ? obj.height / 2 + 4 : obj.height / 2 + 10;
      let currX = obj.x + Math.cos(angle) * seedRx;
      let currY = obj.y + Math.sin(angle) * seedRy;

      const path: Vector2D[] = [{ x: currX, y: currY }];
      const maxSteps = 160;
      const stepSize = 6; // pixels
      const stepSign = isPositive ? 1 : -1;
      let hitTargetPositive = false;

      for (let step = 0; step < maxSteps; step++) {
        const field = calculateElectricField(currX, currY, objects);
        if (field.magnitude < 4) break; // Near null/saddle point or vanishing field

        const dx = stepSign * (field.Ex / field.magnitude) * stepSize;
        const dy = stepSign * (field.Ey / field.magnitude) * stepSize;

        currX += dx;
        currY += dy;

        // Check canvas bounds
        if (currX < 0 || currX > boundsWidth || currY < 0 || currY > boundsHeight) {
          path.push({ x: currX, y: currY });
          break;
        }

        // Check if hit another charged object
        let hitObject = false;
        for (const targetObj of chargedObjects) {
          if (targetObj.id === obj.id) continue;
          const odx = currX - targetObj.x;
          const ody = currY - targetObj.y;
          if (Math.sqrt(odx * odx + ody * ody) < Math.min(targetObj.width, targetObj.height) / 2) {
            path.push({ x: currX, y: currY });
            hitObject = true;
            if (!isPositive && targetObj.charge > 0.05) {
              hitTargetPositive = true;
            }
            break;
          }
        }

        path.push({ x: currX, y: currY });
        if (hitObject) break;
      }

      if (path.length > 3 && !hitTargetPositive) {
        // Reverse negative-seeded lines so arrows and streamers always flow strictly along +E (into negative charges)
        if (!isPositive) {
          path.reverse();
        }
        lines.push(path);
      }
    }
  }

  return lines;
}

/**
 * Computes air breakdown electric field threshold in V/m adjusted for relative humidity.
 * Dry air breaks down at ~3.0 MV/m; moisture lowers the ionization threshold.
 */
export function getAirBreakdownThreshold(humidityPercent: number): number {
  const humidityFactor = Math.max(0.4, 1 - 0.55 * (humidityPercent / 100));
  return AIR_DIELECTRIC_BREAKDOWN_VM * humidityFactor;
}

/**
 * Applies physically grounded damped Newtonian dynamics:
 * - Real material inertia m (kg) derived from specimen massGrams
 * - Viscous air drag (Stokes-inspired: F_drag = -b * v) + kinetic surface friction (mu_k * m * g)
 * - Unconditionally stable exponential velocity damping v(t+dt) = v_next * exp(-gamma * dt)
 */
export function stepDampedCoulombDynamics(
  objects: ElectroObject[],
  forces: CoulombForceVector[],
  dt: number,
  coulombDamping: number,
  draggingObjId: string | null,
  boundsWidth: number,
  boundsHeight: number
) {
  if (dt <= 0) return;

  // Map dimensionless slider [0.00 .. 1.00] to physical damping rate gamma (s^-1)
  // 0.0 -> 0.15 s^-1 (near vacuum), 0.35 -> ~2.6 s^-1 (air drag), 1.0 -> ~14 s^-1 (high bench friction)
  const baseGamma = 0.15 + Math.pow(coulombDamping, 1.45) * 14.0;

  for (const force of forces) {
    const obj = objects.find((o) => o.id === force.objectId);
    if (!obj || obj.isPinned || draggingObjId === obj.id) continue;

    const isPoint = obj.shape === 'point_charge';
    const mat = MATERIALS_DATABASE[obj.materialId];
    // Real lab mass (kg) with sub-linear inertial compression so both 1.2g paper & 85g copper respond smoothly on screen
    const massKg = isPoint ? 0.008 : Math.max(0.001, (mat?.massGrams ?? 25) / 1000);
    const effectiveMassKg = isPoint ? 0.018 : Math.pow(massKg, 0.45) * 0.08;
    const muK = isPoint ? 0.08 : mat?.frictionCoeff ?? 0.3;

    // Force in Newtons converted to canvas pixel acceleration (scaled for lab bench visualization)
    const fxNewtons = force.fx * 1e-6;
    const fyNewtons = force.fy * 1e-6;
    const fMagNewtons = Math.sqrt(fxNewtons * fxNewtons + fyNewtons * fyNewtons);

    // Static/kinetic surface friction threshold only resists negligible stray micro-forces
    const frictionThresholdN = isPoint ? 0 : coulombDamping * muK * massKg * GRAVITY_G * 1.0e-6;
    let effectiveFx = fxNewtons;
    let effectiveFy = fyNewtons;

    if (!isPoint && fMagNewtons <= frictionThresholdN && Math.hypot(obj.vx, obj.vy) < 4) {
      // Static friction holds the object steady against negligible stray fields
      effectiveFx = 0;
      effectiveFy = 0;
      obj.vx = 0;
      obj.vy = 0;
    }

    // Acceleration scaled to px/s^2 (1 m = 600 px, calibrated for smooth tabletop micro-Newton motion)
    const visualForceScale = 340000;
    const ax = (effectiveFx / effectiveMassKg) * visualForceScale;
    const ay = (effectiveFy / effectiveMassKg) * visualForceScale;

    // Material-coupled damping rate (lighter/larger-area objects experience slightly higher air drag per unit mass)
    const areaFactor = Math.min(1.6, Math.max(0.75, (obj.width * obj.height) / 8000));
    const gamma = baseGamma * (0.65 + 0.35 * muK) * areaFactor;
    const expDecay = Math.exp(-gamma * dt);

    obj.vx = (obj.vx + ax * dt) * expDecay;
    obj.vy = (obj.vy + ay * dt) * expDecay;

    // Clamp erratic high velocities
    const speed = Math.hypot(obj.vx, obj.vy);
    const maxSpeed = 240;
    if (speed > maxSpeed) {
      obj.vx = (obj.vx / speed) * maxSpeed;
      obj.vy = (obj.vy / speed) * maxSpeed;
    }

    // Clean stop threshold when damped near rest
    if (speed < 0.8 && fMagNewtons <= frictionThresholdN) {
      obj.vx = 0;
      obj.vy = 0;
    }

    obj.x += obj.vx * dt;
    obj.y += obj.vy * dt;

    // Collision separation against other objects to prevent overlap collapse
    for (const other of objects) {
      if (other.id === obj.id) continue;
      const cdx = obj.x - other.x;
      const cdy = obj.y - other.y;
      const cdist = Math.hypot(cdx, cdy);
      const minAllowedDist = (Math.min(obj.width, obj.height) + Math.min(other.width, other.height)) / 2 + 10;
      if (cdist < minAllowedDist && cdist > 0.001) {
        const otherFixed = other.isPinned || draggingObjId === other.id;
        const pushAway = otherFixed ? (minAllowedDist - cdist) : (minAllowedDist - cdist) / 2;
        obj.x += (cdx / cdist) * pushAway;
        obj.y += (cdy / cdist) * pushAway;
        const restitution = otherFixed ? 0.08 : Math.max(0.05, 0.35 * (1 - coulombDamping));
        obj.vx *= -restitution;
        obj.vy *= -restitution;
      }
    }

    // Canvas bounds containment
    const halfW = obj.width / 2;
    const halfH = obj.height / 2;
    const wallRestitution = Math.max(0.1, 0.5 * (1 - coulombDamping));
    if (obj.x < halfW + 12) {
      obj.x = halfW + 12;
      obj.vx = Math.abs(obj.vx) * wallRestitution;
    } else if (obj.x > boundsWidth - halfW - 12) {
      obj.x = boundsWidth - halfW - 12;
      obj.vx = -Math.abs(obj.vx) * wallRestitution;
    }
    if (obj.y < halfH + 12) {
      obj.y = halfH + 12;
      obj.vy = Math.abs(obj.vy) * wallRestitution;
    } else if (obj.y > boundsHeight - halfH - 12) {
      obj.y = boundsHeight - halfH - 12;
      obj.vy = -Math.abs(obj.vy) * wallRestitution;
    }
  }
}

/**
 * Checks for dielectric air breakdown (arcing discharge) when strong opposite charges approach closely.
 */
export function processAirBreakdownArcs(
  objects: ElectroObject[],
  humidityPercent: number
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const arcs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const breakdownLimit = getAirBreakdownThreshold(humidityPercent);

  for (let i = 0; i < objects.length; i++) {
    if (objects[i].shape === 'point_charge') continue;
    for (let j = i + 1; j < objects.length; j++) {
      if (objects[j].shape === 'point_charge') continue;
      const a = objects[i];
      const b = objects[j];
      const qDiff = Math.abs(a.charge - b.charge);
      if (qDiff < 12) continue;

      // Require opposite signs or grounded target
      const oppositeOrGround = (a.charge * b.charge < -20) || ((a.isGrounded || b.isGrounded) && qDiff > 15);
      if (!oppositeOrGround) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const centerDist = Math.hypot(dx, dy);
      const surfaceGapPx = Math.max(4, centerDist - (Math.min(a.width, a.height) + Math.min(b.width, b.height)) / 2);
      const gapMeters = surfaceGapPx / PIXELS_PER_METER;

      if (gapMeters < 0.045) {
        // Approximate gap field E ~ |V_a - V_b| / d
        const Vdiff = Math.abs((COULOMB_CONSTANT_KE * (a.charge - b.charge) * NC_TO_COULOMBS) / Math.max(0.015, gapMeters));
        const gapField = Vdiff / Math.max(0.008, gapMeters);

        // Close-range corona breakdown (~1.35 MV/m localized tip field)
        if (gapField > breakdownLimit * 0.45) {
          // Equalize 15% of difference during micro-arc
          const dq = (a.charge - b.charge) * 0.08;
          if (!a.isGrounded && a.materialId !== 'ground') a.charge -= dq;
          if (!b.isGrounded && b.materialId !== 'ground') b.charge += dq;
          updateSurfaceChargeDots(a);
          updateSurfaceChargeDots(b);

          const ux = dx / Math.max(1, centerDist);
          const uy = dy / Math.max(1, centerDist);
          arcs.push({
            x1: a.x + ux * (Math.min(a.width, a.height) * 0.45),
            y1: a.y + uy * (Math.min(a.width, a.height) * 0.45),
            x2: b.x - ux * (Math.min(b.width, b.height) * 0.45),
            y2: b.y - uy * (Math.min(b.width, b.height) * 0.45),
          });
        }
      }
    }
  }
  return arcs;
}

/**
 * Returns world coordinates of the electroscope's top brass collector knob and internal gold leaves.
 */
export function getElectroscopeTerminals(scope: ElectroObject): {
  knobX: number;
  knobY: number;
  leavesX: number;
  leavesY: number;
} {
  const rotRad = (scope.rotation * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  const knobLocalY = -scope.height * 0.41;
  const leavesLocalY = scope.height * 0.08;
  return {
    knobX: scope.x - knobLocalY * sinR,
    knobY: scope.y + knobLocalY * cosR,
    leavesX: scope.x - leavesLocalY * sinR,
    leavesY: scope.y + leavesLocalY * cosR,
  };
}

/**
 * Updates electrostatic induction, grounding-induction (0 V clamp), charge partitioning
 * between the brass knob & gold leaves, and damped 2nd-order leaf divergence physics.
 */
export function updateElectroscopePhysics(objects: ElectroObject[], dt: number) {
  const stepDt = Math.max(0.001, Math.min(0.05, dt));
  const cScopeNcPerV = 0.011; // ~11 pF calibrated bench scale
  const cPolarNcPerV = 0.015; // differential knob-vs-leaf polarization capacitance

  for (const scope of objects) {
    if (scope.shape !== 'electroscope') continue;
    const others = objects.filter((o) => o.id !== scope.id);
    const { knobX, knobY, leavesX, leavesY } = getElectroscopeTerminals(scope);

    const vKnob = calculateElectricPotential(knobX, knobY, others);
    const vLeaves = calculateElectricPotential(leavesX, leavesY, others);

    if (scope.isGrounded) {
      // Grounding holds the conductor at V = 0: Q_scope -> -C_scope * V_ext(knob)
      // Leaves are connected to Earth (0 V) so leaf charge collapses while opposite charge collects on the knob!
      const qTarget = Math.max(-scope.capacityNc, Math.min(scope.capacityNc, -cScopeNcPerV * vKnob));
      scope.charge += (qTarget - scope.charge) * (1 - Math.exp(-8.5 * stepDt));
      scope.leafChargeNc = (scope.leafChargeNc ?? 0) * Math.exp(-10 * stepDt);
      scope.knobChargeNc = scope.charge;
    } else {
      // Isolated electroscope: potential gradient (V_knob - V_leaves) drives electrons between knob and leaves!
      // Example: (-) rod near knob -> V_knob < V_leaves -> qIndLeaves < 0 (leaves become -, knob becomes +)
      const qIndLeaves = cPolarNcPerV * (vKnob - vLeaves);
      const rawLeafQ = 0.58 * scope.charge + qIndLeaves;
      const rawKnobQ = 0.42 * scope.charge - qIndLeaves;
      scope.leafChargeNc = rawLeafQ;
      scope.knobChargeNc = rawKnobQ;
    }

    const absLeafQ = Math.abs(scope.leafChargeNc ?? 0);
    // Electrostatic torque vs gravitational restoring torque: smooth saturation up to 68 degrees half-angle
    const targetAngleDeg = absLeafQ < 0.12 ? 0 : Math.min(68, 68 * (absLeafQ / (absLeafQ + 5.2)));

    const currentAngle = scope.leafAngleDeg ?? 0;
    const currentVel = scope.leafAngularVel ?? 0;
    const stiffness = 135;
    const damping = 13.5;

    const angularAcc = stiffness * (targetAngleDeg - currentAngle) - damping * currentVel;
    let nextVel = currentVel + angularAcc * stepDt;
    let nextAngle = currentAngle + nextVel * stepDt;

    if (nextAngle < 0) {
      nextAngle = 0;
      nextVel = Math.max(0, -nextVel * 0.15);
    } else if (nextAngle > 72) {
      nextAngle = 72;
      nextVel = Math.min(0, -nextVel * 0.2);
    }

    scope.leafAngleDeg = nextAngle;
    scope.leafAngularVel = nextVel;
  }
}


