import { ElectroscopeFoilId } from '../types/electrostatics';

export interface ElectroscopeFoilSpec {
  id: ElectroscopeFoilId;
  name: string;
  shortName: string;
  symbol: string;
  baseTag: string;
  atomicNumber: number;
  chemicalFormula: string;
  surfaceChemistry: string;
  workFunctionEv: number;
  densityGCm3: number;
  thicknessUm: number;
  arealMassMgCm2: number; // density * thickness (mg/cm^2) governing gravitational restoring torque
  conductivityMSm: number; // 10^6 S/m
  oxideTransmission: number; // 0..1 surface electron equilibration factor across native oxide/composite layer
  halfAngleChargeNc: number; // leaf charge (nC) for half-maximum divergence
  stiffness: number;
  damping: number;
  sensitivityLabel: string;
  swatchColor: string;
  gradStops: [string, string, string, string];
  strokeColor: string;
  physicsSummary: string;
}

export const ELECTROSCOPE_FOILS: Record<ElectroscopeFoilId, ElectroscopeFoilSpec> = {
  gold: {
    id: 'gold',
    name: '24k Gold Leaf',
    shortName: 'Gold',
    symbol: 'Au',
    baseTag: 'Au',
    atomicNumber: 79,
    chemicalFormula: 'Au (Pure Noble FCC)',
    surfaceChemistry: 'Non-oxidizing noble surface (no dielectric barrier)',
    workFunctionEv: 5.10,
    densityGCm3: 19.32,
    thicknessUm: 0.15,
    arealMassMgCm2: 0.29,
    conductivityMSm: 41.1,
    oxideTransmission: 1.0,
    halfAngleChargeNc: 5.2,
    stiffness: 135,
    damping: 13.5,
    sensitivityLabel: 'High (1.00×)',
    swatchColor: '#facc15',
    gradStops: ['#fef08a', '#facc15', '#eab308', '#ca8a04'],
    strokeColor: '#fef9c3',
    physicsSummary:
      'Extreme malleability allows 0.15 µm leaf (0.29 mg/cm²), giving minimal gravity torque and maximum θ deflection.',
  },
  aluminum: {
    id: 'aluminum',
    name: 'Aluminum Foil',
    shortName: 'Aluminum',
    symbol: 'Al',
    baseTag: 'Al',
    atomicNumber: 13,
    chemicalFormula: 'Al + Al₂O₃ (Passivated)',
    surfaceChemistry: '~3 nm Al₂O₃ dielectric oxide passivation skin',
    workFunctionEv: 4.28,
    densityGCm3: 2.70,
    thicknessUm: 14.0,
    arealMassMgCm2: 3.78,
    conductivityMSm: 35.0,
    oxideTransmission: 0.80,
    halfAngleChargeNc: 9.6,
    stiffness: 105,
    damping: 15.2,
    sensitivityLabel: 'Medium (0.58×)',
    swatchColor: '#cbd5e1',
    gradStops: ['#f8fafc', '#cbd5e1', '#94a3b8', '#64748b'],
    strokeColor: '#f1f5f9',
    physicsSummary:
      'Low bulk density (2.70 g/cm³) but thicker 14 µm rolled foil (3.78 mg/cm²) increases restoring weight and lowers θ.',
  },
  copper: {
    id: 'copper',
    name: 'Copper Leaf Foil',
    shortName: 'Copper',
    symbol: 'Cu',
    baseTag: 'Cu',
    atomicNumber: 29,
    chemicalFormula: 'Cu + Cu₂O (Surface Film)',
    surfaceChemistry: 'Thin cuprous oxide (Cu₂O) tarnish layer',
    workFunctionEv: 4.65,
    densityGCm3: 8.96,
    thicknessUm: 8.0,
    arealMassMgCm2: 7.17,
    conductivityMSm: 59.6,
    oxideTransmission: 0.90,
    halfAngleChargeNc: 13.3,
    stiffness: 92,
    damping: 17.0,
    sensitivityLabel: 'Low (0.42×)',
    swatchColor: '#fb923c',
    gradStops: ['#fed7aa', '#fb923c', '#ea580c', '#9a3412'],
    strokeColor: '#ffedd5',
    physicsSummary:
      'Highest conductivity (59.6 MS/m) but heavy areal mass (7.17 mg/cm²) requires stronger charge to lift leaves.',
  },
  gum_wrapper: {
    id: 'gum_wrapper',
    name: 'Gum Wrapper',
    shortName: 'Gum Wrapper',
    symbol: 'Al/Cell',
    baseTag: 'Gum',
    atomicNumber: 13,
    chemicalFormula: 'Al (6.5µm) + Cellulose (C₆H₁₀O₅)ₙ',
    surfaceChemistry: 'Conductive Al foil laminated onto insulating paper backing',
    workFunctionEv: 4.28,
    densityGCm3: 1.27,
    thicknessUm: 28.5,
    arealMassMgCm2: 3.63,
    conductivityMSm: 16.5,
    oxideTransmission: 0.68,
    halfAngleChargeNc: 10.8,
    stiffness: 86,
    damping: 16.5,
    sensitivityLabel: 'Med-Low (0.52×)',
    swatchColor: '#e2e8f0',
    gradStops: ['#ffffff', '#e2e8f0', '#94a3b8', '#cbd5e1'],
    strokeColor: '#fde68a',
    physicsSummary:
      'Bilayer foil-paper laminate (3.63 mg/cm²): paper backing adds hinge stiffness and slight hygroscopic humidity bleed.',
  },
};

export const ELECTROSCOPE_FOIL_LIST: ElectroscopeFoilSpec[] = [
  ELECTROSCOPE_FOILS.gold,
  ELECTROSCOPE_FOILS.aluminum,
  ELECTROSCOPE_FOILS.copper,
  ELECTROSCOPE_FOILS.gum_wrapper,
];

export function getElectroscopeFoilSpec(foilType?: ElectroscopeFoilId): ElectroscopeFoilSpec {
  if (foilType && foilType in ELECTROSCOPE_FOILS) {
    return ELECTROSCOPE_FOILS[foilType];
  }
  return ELECTROSCOPE_FOILS.gold;
}
