export type ModuleMode = 'module1' | 'module2' | 'module3' | 'module4';

export type MaterialCategory = 'tribo_positive' | 'tribo_neutral' | 'tribo_negative' | 'conductor' | 'dielectric';

export type ObjectShape = 'rod' | 'balloon' | 'sphere' | 'paper_strip' | 'cloth_pad' | 'ground_plate' | 'point_charge' | 'electroscope';

export interface MaterialDef {
  id: string;
  name: string;
  category: MaterialCategory;
  workFunctionEv: number; // e.g. 5.3 eV for Fur, 4.2 eV for Teflon
  triboOrder: number; // -10 to +10 (positive = loses e-, negative = gains e-)
  dielectricConstant: number; // relative permittivity epsilon_r (e.g. 1.0 Air, 3.5 Paper, 7.0 Glass, 2.8 Rubber)
  conductivity: number; // 0 = insulator, 1 = conductor
  densityGCm3: number; // Real physical density in g/cm^3
  massGrams: number; // Realistic specimen mass in grams (determines inertia a = F/m)
  frictionCoeff: number; // Surface kinetic friction coefficient mu_k
  color: string;
  borderColor: string;
  chemicalFormula: string;
  electronAffinityText: string;
  description: string;
}

export interface SurfaceCharge {
  id: string;
  relX: number; // -0.5 to 0.5 relative to object bounds
  relY: number;
  sign: 1 | -1;
  isBound: boolean; // bound to atom vs free electron
  vx?: number; // drift velocity x for conductors
  vy?: number; // drift velocity y
  pulsePhase?: number; // phase for quantum/glow pulsation
}

export interface DynamicChargeParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  sign: 1 | -1;
  sourceObjectId?: string;
  targetObjectId?: string;
  progress: number; // 0 to 1 along flight trajectory
  life: number; // countdown
  delay?: number; // staggered launch delay in seconds
  speedScale?: number; // scales flight velocity with material work-function delta W
  radius?: number; // particle core radius in px
  arcOffset?: number; // perpendicular curve offset in px
  trail: Array<{ x: number; y: number }>;
}

export interface ContactMigrationEvent {
  pairKey: string;
  objAId: string;
  objBId: string;
  donorId: string; // Electron source (lower electrostatic potential V or lower work function W)
  acceptorId: string; // Electron destination (higher V or higher W)
  interfaceX: number;
  interfaceY: number;
  normalX: number; // Unit vector from donor toward acceptor across physical contact boundary
  normalY: number;
  deltaPotentialV: number; // Driving potential difference |V_acceptor - V_donor| in Volts
  deltaWorkFunctionEv: number; // |W_acceptor - W_donor| in eV
  migratedChargeNc: number; // Magnitude of charge migrated during this step (nC)
  mode: 'conduction' | 'grounding' | 'surface_bleed' | 'contact_potential';
}

export interface InterfaceChargeParticle {
  id: string;
  startX: number;
  startY: number;
  interfaceX: number;
  interfaceY: number;
  endX: number;
  endY: number;
  x: number;
  y: number;
  progress: number; // 0 to 1, passing directly through (interfaceX, interfaceY) at 0.5
  speed: number;
  radius: number;
  potentialV: number;
  mode: 'conduction' | 'grounding' | 'surface_bleed' | 'contact_potential';
  trail: Array<{ x: number; y: number }>;
}

export interface FieldStreamParticle {
  x: number;
  y: number;
  speed: number;
  lineIdx: number;
  progress: number;
}

export interface AtomicDipole {
  relX: number;
  relY: number;
  px: number; // dipole moment x component
  py: number; // dipole moment y component
  magnitude: number;
}

export type ElectroscopeFoilId = 'gold' | 'aluminum' | 'copper' | 'gum_wrapper';

export interface ElectroObject {
  id: string;
  name: string;
  materialId: string;
  shape: ObjectShape;
  x: number; // Canvas pixel position (center)
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  radius?: number;
  rotation: number; // in degrees
  isPinned: boolean;
  isGrounded: boolean;
  charge: number; // Net charge in nano-Coulombs (nC)
  capacityNc: number; // max charge capacity
  surfaceCharges: SurfaceCharge[];
  dipoles: AtomicDipole[];
  colorOverride?: string;
  isDragging?: boolean;
  foilType?: ElectroscopeFoilId; // Active electroscope leaf foil material ('gold' | 'aluminum' | 'copper')
  leafAngleDeg?: number; // Electroscope foil-leaf half-angle divergence (0 to 72 deg)
  leafAngularVel?: number;
  leafChargeNc?: number; // Effective charge sitting on foil leaves
  knobChargeNc?: number; // Effective charge sitting on top brass collector knob
}

export interface ProbeSensor {
  x: number;
  y: number;
  isActive: boolean;
  isDragging?: boolean;
}

export interface ProbeData {
  x: number;
  y: number;
  voltageV: number; // Electric Potential in Volts
  fieldEx: number; // Field x component N/C
  fieldEy: number; // Field y component N/C
  fieldMagnitude: number; // |E| in N/C
  netChargeDensity: number;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface CoulombForceVector {
  objectId: string;
  otherObjectId?: string;
  fx: number; // Force x component in Micro-Newtons (µN)
  fy: number;
  magnitude: number;
  isAttractive: boolean;
}

export type ChargeViewMode = 'all_charges' | 'net_charges_only' | 'excess_and_free' | 'hidden';

export interface VisualOverlayConfig {
  showFieldVectors: boolean;
  showFieldVectorGrid: boolean; // background coordinate grid displaying E-field direction & magnitude at every intersection
  showFieldLines: boolean;
  showEquipotentials: boolean;
  showForceVectors: boolean;
  showAtomicDipoles: boolean;
  showCharges: boolean;
  showChargeMagnitude: boolean; // displays numerical (+/- nC) readout directly above each object
  chargeViewMode: ChargeViewMode; // view modes for charges: all charges (atomic lattice), net excess charges, etc.
  animateMovingCharges: boolean; // active drift and transfer electron animations
  animateFieldFlow: boolean; // tracer particles flowing along E-field lines
  showHaloGlow: boolean; // electrostatic voltage halo surrounding charged bodies
  showGrid: boolean;
  showProbe: boolean;
  liveCoulombMotion: boolean; // Enables real dynamic physical attraction & repulsion motion
  coulombDamping: number; // 0.0 to 1.0 damping factor simulating air drag & surface friction
  vectorDensity: number; // grid step (e.g. 30px to 60px)
  humidityPercent: number; // 0% to 100% humidity affects charge decay
  simulationSpeed: number;
}

export type GraphType = 'voltage_pos' | 'field_pos' | 'force_dist' | 'oscilloscope_time';

export interface GraphPoint {
  x: number;
  y: number;
  timestamp?: number;
  label?: string;
}

export interface LabStep {
  id: string;
  title: string;
  instruction: string;
  hint: string;
  checkCondition: (objects: ElectroObject[], sensor: ProbeSensor, probeData?: ProbeData) => boolean;
}

export interface LabModule {
  id: string;
  title: string;
  subtitle: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  description: string;
  steps: LabStep[];
  initialObjects: ElectroObject[];
  initialOverlay?: Partial<VisualOverlayConfig>;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  conceptCategory: string;
}
