import { ElectroObject } from '../types/electrostatics';

export type ElectroscopeStep = 1 | 2 | 3 | 4;

export interface ElectroscopeGuideState {
  step: ElectroscopeStep;
  hasTestObject: boolean;
  hasChargedTestObject: boolean;
  isScopeActive: boolean;
  isScopeGrounded: boolean;
  shortTitle: string;
  instruction: string;
}

export function getElectroscopeGuideState(objects: ElectroObject[]): ElectroscopeGuideState {
  const scope = objects.find((o) => o.shape === 'electroscope');
  const testObjects = objects.filter((o) => o.shape !== 'electroscope' && o.shape !== 'point_charge');
  const hasTestObject = testObjects.length > 0;
  const hasChargedTestObject = testObjects.some((o) => Math.abs(o.charge) >= 0.5);
  const isScopeActive = Boolean(
    scope && ((scope.leafAngleDeg ?? 0) >= 3 || Math.abs(scope.charge) >= 0.4)
  );
  const isScopeGrounded = Boolean(scope?.isGrounded);

  if (!hasTestObject) {
    return {
      step: 1,
      hasTestObject,
      hasChargedTestObject,
      isScopeActive,
      isScopeGrounded,
      shortTitle: 'Step 1 of 4 · Pick an Object',
      instruction: 'Choose any material from the highlighted Left panel (e.g., Plastic Ruler or Glass Rod).',
    };
  }

  if (!hasChargedTestObject && !isScopeActive) {
    return {
      step: 2,
      hasTestObject,
      hasChargedTestObject,
      isScopeActive,
      isScopeGrounded,
      shortTitle: 'Step 2 of 4 · Charge Object',
      instruction: 'Click the highlighted "Rub" button on the Left panel or Top bar to build static charge.',
    };
  }

  if (!isScopeActive) {
    return {
      step: 3,
      hasTestObject,
      hasChargedTestObject,
      isScopeActive,
      isScopeGrounded,
      shortTitle: 'Step 3 of 4 · Approach Brass Knob',
      instruction: 'Drag your charged object close to the highlighted Brass Knob to induce the gold leaves (or touch to transfer charge).',
    };
  }

  return {
    step: 4,
    hasTestObject,
    hasChargedTestObject,
    isScopeActive,
    isScopeGrounded,
    shortTitle: 'Step 4 of 4 · Observe & Experiment',
    instruction: isScopeGrounded
      ? 'Knob is grounded (0 V)! Unground now, then pull your charged object away to trap opposite charge.'
      : 'Gold leaves diverged! Try "Ground Knob" on the Right panel, or test adding a second object.',
  };
}
