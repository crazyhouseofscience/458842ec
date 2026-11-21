import { MaterialDef } from '../types/electrostatics';

export interface PhysicsTooltipEntry {
  title: string;
  badge?: string;
  definition: string;
  formula?: string;
}

export const PHYSICS_GLOSSARY: Record<string, PhysicsTooltipEntry> = {
  // Core Physics Terms
  workFunction: {
    title: 'Work Function (W)',
    badge: 'eV · Quantum',
    definition:
      'Minimum energy needed to remove a surface electron from a material. Lower-W materials donate electrons (+); higher-W materials pull electrons (−).',
    formula: 'ΔW = W_acceptor − W_donor',
  },
  ionization: {
    title: 'Ionization & Air Breakdown',
    badge: 'Paschen Law',
    definition:
      'When an electric field is intense enough (~3 MV/m in dry air), air molecules are stripped of electrons (ionized), creating a conductive spark arc.',
    formula: 'E > E_bd → Corona / Spark Arc',
  },
  permittivity: {
    title: 'Relative Permittivity (εᵣ)',
    badge: 'Dielectric Constant',
    definition:
      'Measures how easily a material polarizes inside an electric field. Higher εᵣ materials form stronger internal dipoles and store more field energy.',
    formula: 'ε = ε₀ · εᵣ',
  },
  triboAffinity: {
    title: 'Triboelectric Affinity',
    badge: 'Triboelectric Series',
    definition:
      'Ranking that predicts electron flow during friction. Materials further apart in the series exchange more static charge when rubbed.',
  },
  electronDonor: {
    title: 'Electron Donor (+)',
    badge: 'Low W',
    definition:
      'Holds outer valence electrons loosely. Rubbing strips electrons away, leaving excess positive protons (+) on its surface.',
  },
  electronAcceptor: {
    title: 'Electron Acceptor (−)',
    badge: 'High W',
    definition:
      'Attracts valence electrons strongly. Rubbing captures extra electrons (e⁻), giving the surface a net negative (−) charge.',
  },
  conductor: {
    title: 'Electrical Conductor',
    badge: 'Free e⁻ Sea',
    definition:
      'Contains delocalized electrons that move freely across the entire object, migrating quickly to the outer surface or between touching conductors.',
  },
  dielectric: {
    title: 'Dielectric Insulator',
    badge: 'Bound Charges',
    definition:
      'Electrons remain bound to local atoms rather than flowing freely. External fields stretch atoms into aligned microscopic dipoles.',
  },
  coulombForce: {
    title: 'Coulomb Force (F)',
    badge: 'Electrostatics',
    definition:
      'Electrostatic push or pull between charges. Opposite signs attract; like signs repel with force proportional to charge product and inverse-square distance.',
    formula: 'F = kₑ · |q₁ · q₂| / r²',
  },
  coulombConstant: {
    title: "Coulomb's Constant (kₑ)",
    badge: 'SI Constant',
    definition:
      'Proportionality constant setting electrostatic force strength in vacuum/air, equal to 1/(4πε₀).',
    formula: 'kₑ ≈ 8.99 × 10⁹ N·m²/C²',
  },
  airViscosity: {
    title: 'Air Viscosity (η)',
    badge: 'Fluid Drag',
    definition:
      'Internal friction of air molecules at 20°C that gently resists fast-moving charged dust, foam, or paper objects.',
    formula: 'η = 1.81 × 10⁻⁵ Pa·s',
  },
  coulombDamping: {
    title: 'Coulomb Damping (γ)',
    badge: 'Motion Drag',
    definition:
      'Controls air drag and bench friction acting on moving charges. Set to 0 for near-vacuum motion, or higher to stabilize oscillations.',
  },
  humidityLeak: {
    title: 'Relative Humidity (Ion Leak)',
    badge: 'Moisture Discharge',
    definition:
      'Water vapor forms a microscopic conductive film and airborne ions that bleed static charge away faster—that is why static shocks happen mostly in dry air!',
  },
  netCharge: {
    title: 'Net Static Charge (Q)',
    badge: 'nC (10⁻⁹ C)',
    definition:
      'Total imbalance between protons (+) and electrons (−), measured in nanocoulombs (nC). Positive means electron deficit; negative means excess electrons.',
    formula: 'Q = (N_p − N_e) · e',
  },
  voltagePotential: {
    title: 'Electric Potential (V)',
    badge: 'Volts (J/C)',
    definition:
      'Electrostatic potential energy per unit charge at a point in space. Positive charges raise voltage (+V); negative charges lower voltage (−V).',
    formula: 'V = kₑ · Q / r',
  },
  electricField: {
    title: 'Electric Field Strength (|E|)',
    badge: 'N/C or V/m',
    definition:
      'Force per unit positive test charge at a location. Points away from (+) charges and toward (−) charges.',
    formula: 'E = F / q = kₑ · Q / r²',
  },
  fieldComponents: {
    title: 'Field Components (Ex, Ey)',
    badge: 'Vector E',
    definition:
      'Horizontal (Ex) and vertical (Ey) parts of the electric field vector measured at the probe crosshair.',
    formula: '|E| = √(Ex² + Ey²)',
  },
  densityMass: {
    title: 'Mass & Material Density (ρ)',
    badge: 'Inertia',
    definition:
      'Heavier objects resist Coulomb acceleration (a = F/m), whereas ultra-light materials like paper or Styrofoam leap rapidly.',
    formula: 'a = F / m',
  },
  surfaceFriction: {
    title: 'Surface Friction (μₖ)',
    badge: 'Tribo-Contact',
    definition:
      'Kinetic friction coefficient determining mechanical resistance and contact energy available to transfer electrons during rubbing.',
  },

  // Lab Actions & Buttons
  rubSingle: {
    title: 'Rub with Lab Cloth',
    badge: 'Triboelectric Charging',
    definition:
      'Rubs this object against a standard lab pad (Wool/Fur or PTFE cloth) to strip or deposit electrons according to its work function.',
  },
  rubPair: {
    title: 'Rub Pair Together',
    badge: 'Contact Electrification',
    definition:
      'Rubs both selected materials against each other so electrons flow from the lower-W donor (+) to the higher-W acceptor (−).',
    formula: 'e⁻ flow: Low W → High W',
  },
  pinObject: {
    title: 'Pin in Place',
    badge: 'Fixed Anchor',
    definition:
      'Locks this object at its current coordinates so electrostatic forces cannot push or pull it across the bench.',
  },
  groundObject: {
    title: 'Earth Ground (0 V)',
    badge: 'Infinite Reservoir',
    definition:
      'Connects the conductor to Earth (0 V). Excess charge drains away—or when held near a charged rod, opposite charge is trapped by induction!',
  },
  dischargeZero: {
    title: 'Discharge (Neutralize)',
    badge: '0.0 nC',
    definition:
      'Balances protons and electrons so the object returns to an electrically neutral state (Q = 0 nC).',
  },
  rotateObject: {
    title: 'Rotate (+45°)',
    badge: 'Orientation',
    definition:
      'Rotates the specimen by 45 degrees to inspect geometry effects, contact points, and sharp-edge charge concentration.',
  },
  removeObject: {
    title: 'Remove Object',
    badge: 'Bench Action',
    definition: 'Deletes this specimen or point charge from the active simulation stage.',
  },
  resetScene: {
    title: 'Reset / Clear Stage',
    badge: 'Fresh Bench',
    definition:
      'Clears active test objects from the stage (and resets the electroscope to neutral) so you can start a new trial.',
  },

  // Overlays & Visualization Modes
  liveMotion: {
    title: 'Coulomb Motion (Attract / Repel)',
    badge: 'Physics Engine',
    definition:
      'Toggles live kinematic motion (F = ma) under electrostatic attraction, repulsion, and induced dipole/conductor forces.',
  },
  forceVectors: {
    title: 'Force Arrows (F)',
    badge: 'Vector Overlay',
    definition:
      'Displays arrows showing the net electrostatic force direction and relative strength acting on each object.',
  },
  chargesDots: {
    title: 'Surface Charges (+ / e⁻)',
    badge: 'Microscopic View',
    definition:
      'Shows positive atomic nuclei (+) and negative electrons (e⁻) on surfaces so you can see polarization and charge migration.',
  },
  chargeLabels: {
    title: 'Magnitude Labels (± nC)',
    badge: 'Readout',
    definition:
      'Displays exact net static charge in nanocoulombs (nC) and gold-leaf deflection angles directly on the stage.',
  },
  fieldVectors: {
    title: 'Electric Field Vectors (E)',
    badge: 'Vector Field',
    definition:
      'Draws arrows showing which direction a tiny positive test charge (+q₀) would be pushed at points across the stage.',
  },
  fieldLines: {
    title: 'Electric Field Lines',
    badge: 'Faraday Lines',
    definition:
      'Traces continuous lines starting on positive (+) charges and ending on negative (−) charges. Closer lines mean a stronger field!',
  },
  fieldFlow: {
    title: 'Field Flow Streamers',
    badge: 'Animation',
    definition:
      'Animates glowing pulses moving along electric field lines from positive sources toward negative sinks.',
  },
  equipotentials: {
    title: 'Equipotential Contours (V)',
    badge: 'Constant Voltage',
    definition:
      'Contour lines where electric potential V is constant—always perpendicular to electric field lines.',
  },
  vectorGrid: {
    title: 'Precision Field Vector Grid',
    badge: '60 px Grid',
    definition:
      'Overlays a 60 px coordinate grid displaying exact E-field direction and magnitude (N/C) at every intersection, with gentle placement snap.',
  },
  voltageProbe: {
    title: 'Field & Voltage Probe',
    badge: 'Sensor Tool',
    definition:
      'Places a draggable sensor crosshair on the stage to measure exact electric potential (V) and field vector (E) anywhere.',
  },
  atomicDipoles: {
    title: 'Induced Atomic Dipoles',
    badge: 'Polarization',
    definition:
      'Shows neutral insulator molecules shifting slightly inside an external field, explaining why charged rods attract neutral paper!',
  },
  haloGlow: {
    title: 'Voltage Potential Halo',
    badge: 'Glow Overlay',
    definition:
      'Displays a soft electrostatic potential aura around charged objects (cyan = +V, magenta = −V).',
  },
  movingElectrons: {
    title: 'Moving Electron Stream',
    badge: 'Particle Transfer',
    definition:
      'Animates individual electrons (e⁻) jumping across contact interfaces and friction boundaries.',
  },
  chargeViewAll: {
    title: 'All Charges View',
    badge: 'Balanced + Excess',
    definition:
      'Displays both balanced lattice pairs (+/−) and excess static charges so polarization shifts are easy to spot.',
  },
  chargeViewExcess: {
    title: 'Excess Charges Only',
    badge: 'Net Q',
    definition:
      'Hides balanced neutral pairs and shows only the unpaired excess charges creating the net charge Q.',
  },
  chargeViewHidden: {
    title: 'Hide Charge Particles',
    badge: 'Macroscopic View',
    definition:
      'Hides microscopic charge dots so you can focus purely on macroscopic attraction, repulsion, and field lines.',
  },

  // Point Charges Module Controls
  pointChargeAdd: {
    title: 'Place Point Charge (q)',
    badge: 'Source Charge',
    definition:
      'Adds an idealized point charge onto the stage, generating a radial 1/r² electric field that interacts with all other charges.',
  },
  flipPolarity: {
    title: 'Flip Polarity (+ ↔ −)',
    badge: 'Sign Inversion',
    definition:
      'Reverses the charge sign without changing magnitude—turning attraction into repulsion or flipping field-line direction.',
  },
  stopVelocity: {
    title: 'Stop Velocity (v = 0)',
    badge: 'Zero Momentum',
    definition: 'Halts the moving point charge immediately while keeping its position and charge Q.',
  },
  simSpeed: {
    title: 'Simulation Time Scale',
    badge: '0.25× – 2.0×',
    definition:
      'Adjusts how fast Coulomb accelerations and electron animations evolve over time.',
  },

  // Electroscope Module Controls
  leafAngle: {
    title: 'Gold-Leaf Deflection (θ)',
    badge: 'Repulsion Meter',
    definition:
      'Angle between the two thin gold leaves. Like charges pushed into the leaves repel each other wider as net or induced charge increases.',
  },
  brassKnob: {
    title: 'Brass Collector Knob',
    badge: 'Induction Terminal',
    definition:
      'Approaching a charged object induces opposite charge on the knob and drives like charge down into the gold leaves.',
  },
  goldLeaves: {
    title: 'Electroscope Foil Leaves (Au / Al / Cu / Gum)',
    badge: 'Conductive Foil',
    definition:
      'Thin foil strips hanging from the conductive stem. Deflection angle depends on electrostatic repulsion versus gravitational weight (areal mass σ = ρ · t).',
  },
  foilGold: {
    title: '24k Gold Leaf (Au)',
    badge: '0.15 µm · W=5.10 eV',
    definition:
      'Noble non-oxidizing gold beaten to 0.15 µm (0.29 mg/cm²). Lowest areal mass gives highest deflection sensitivity and instant electron equilibration.',
    formula: 'ρ = 19.32 g/cm³ · σ = 0.29 mg/cm²',
  },
  foilAluminum: {
    title: 'Aluminum Foil (Al / Al₂O₃)',
    badge: '14 µm · W=4.28 eV',
    definition:
      'Low-density metal (2.70 g/cm³) rolled to 14 µm with a ~3 nm Al₂O₃ passive oxide skin. Higher areal mass (3.78 mg/cm²) yields smaller θ than gold leaf.',
    formula: 'ρ = 2.70 g/cm³ · σ = 3.78 mg/cm²',
  },
  foilCopper: {
    title: 'Copper Foil Leaf (Cu / Cu₂O)',
    badge: '8 µm · W=4.65 eV',
    definition:
      'High-conductivity copper (59.6 MS/m) with a thin Cu₂O tarnish film. Heavy areal mass (7.17 mg/cm²) produces strong restoring torque and conservative θ.',
    formula: 'ρ = 8.96 g/cm³ · σ = 7.17 mg/cm²',
  },
  foilGumWrapper: {
    title: 'Gum Wrapper (Al + Cellulose Paper)',
    badge: '28.5 µm · W=4.28 eV',
    definition:
      'Classic classroom DIY leaf: 6.5 µm aluminum foil laminated to 22 µm cellulose paper. Paper backing adds hinge stiffness and slightly faster humid-air bleed.',
    formula: 'ρ_eff = 1.27 g/cm³ · σ = 3.63 mg/cm²',
  },
  preChargeScope: {
    title: 'Pre-Charge Electroscope',
    badge: 'Polarity Test',
    definition:
      'Gives the electroscope a known initial charge (−12 or +12 nC). Approaching a same-sign rod spreads leaves wider; opposite sign makes them drop!',
  },
  guideToggle: {
    title: 'Guided Lab Mode',
    badge: 'Step-by-Step',
    definition:
      'Turns step-by-step highlights and the "Rub Before Placing" prep workflow ON or OFF.',
  },
  placeStagedObject: {
    title: 'Place Charged Object on Bench',
    badge: 'Step 2 Action',
    definition:
      'Moves your rubbed object onto the electroscope stage so you can drag it near the brass knob (induction) or touch it (conduction).',
  },
  adjustChargeStep: {
    title: 'Step Net Charge (±2 nC)',
    badge: 'Charge Control',
    definition:
      'Adjusts the net point charge in 2 nC steps, scaling its radial electric field strength and Coulomb force proportionally.',
  },
  expandStage: {
    title: 'Expand Simulation Stage',
    badge: 'Viewport Toggle',
    definition:
      'Temporarily hides the side toolbars to give maximum screen space for observing field lines and charge animations.',
  },
  allMaterials: {
    title: 'All Lab Materials',
    badge: 'Full Catalog',
    definition:
      'Displays all conductors, dielectrics, electron donors (+), and electron acceptors (−) in the materials library.',
  },

  // Quick Presets & Learning Setups
  presetDipole: {
    title: 'Electric Dipole (+ / −)',
    badge: '2-Charge Field',
    definition:
      'Equal and opposite charges (+10 nC & −10 nC) whose field lines curve cleanly from positive source to negative sink.',
  },
  presetLikePos: {
    title: 'Like-Charge Repulsion (+ / +)',
    badge: 'Null Point',
    definition:
      'Two +10 nC charges whose field lines push away from each other, creating a zero-field saddle point midway between them.',
  },
  presetQuadrupole: {
    title: 'Pinned Quadrupole Array',
    badge: '4-Charge Symmetry',
    definition:
      'Alternating +/− square arrangement showing higher-order field symmetry and faster field decay with distance.',
  },
  presetTriad: {
    title: '3-Charge Vector Triangle',
    badge: 'Superposition',
    definition:
      'Demonstrates the Superposition Principle: net force on any charge equals the vector sum of forces from all other charges.',
  },
  presetTapeRepel: {
    title: '2× Scotch Tape Repulsion',
    badge: 'Classroom Classic',
    definition:
      'Both tape strips carry excess negative electrons (−10 nC) and strongly repel each other across the bench.',
  },
  presetStyrofoamRepel: {
    title: '2× Styrofoam Repulsion',
    badge: 'Ultra-Low Mass',
    definition:
      'Ultra-light foam blocks (−10 nC each) accelerate rapidly apart because of their tiny mass (0.9 g).',
  },
  presetGlassSilk: {
    title: 'Glass Rod + Silk Cloth',
    badge: 'Positive Donor',
    definition:
      'Glass (W = 4.05 eV) loses valence electrons to higher-affinity silk (W = 4.50 eV), leaving the glass positively charged.',
  },
  presetFurBalloon: {
    title: 'Fur Pad + Teflon Balloon',
    badge: 'Strong ΔW',
    definition:
      'Extreme triboelectric pair: keratin fur (3.85 eV) readily donates electrons to fluoropolymer Teflon (5.80 eV).',
  },
  presetBalloonPaper: {
    title: 'Charged Balloon + Paper',
    badge: 'Dipole Induction',
    definition:
      'A negatively charged balloon polarizes neutral cellulose paper dipoles, pulling the closer positive ends to create attraction!',
  },
  presetCopperGround: {
    title: 'Copper Sphere + Ground',
    badge: 'Conduction & Drain',
    definition:
      'Touching a charged copper conductor to Earth ground equalizes potential to 0 V by flowing electrons to/from Earth.',
  },
  presetAirScrubber: {
    title: 'Electrostatic Precipitator',
    badge: 'Clean Air Tech',
    definition:
      'Smokestack scrubber that ionizes fly-ash & soot particles negatively so a high-voltage (+) collector captures them before exhaust leaves.',
  },
  presetLaserToner: {
    title: 'Xerographic Laser Toner',
    badge: 'Printer Physics',
    definition:
      'Negatively charged polymer toner beads are pulled across the air gap onto positively charged regions of a photoconductor drum.',
  },
  presetScopeRulerWool: {
    title: 'Ruler + Wool Electroscope Lab',
    badge: 'Negative Probe',
    definition:
      'Rub the plastic ruler with wool to charge it negatively (−), then test induction and conduction at the brass knob.',
  },
  presetScopeGlassSilk: {
    title: 'Glass + Silk Electroscope Lab',
    badge: 'Positive Probe',
    definition:
      'Rub the glass rod with silk to charge it positively (+), pulling electrons upward into the brass knob as it approaches.',
  },
  presetScopeInduction: {
    title: 'Charging by Induction Lab',
    badge: 'Permanent Opposite Q',
    definition:
      'Hold a (−) balloon near the knob, click "Ground Knob" to drain pushed electrons, unground, then pull the balloon away to trap permanent (+) charge!',
  },
  presetScopePolarity: {
    title: 'Electroscope Polarity Test',
    badge: 'Charge Identifier',
    definition:
      'Starts the electroscope pre-charged (−12 nC). Same-sign (−) rods push leaves wider; opposite-sign (+) rods draw leaves down.',
  },

  // Top Navigation & Module Switcher
  navHome: {
    title: 'Startup Module Selector',
    badge: 'Overview',
    definition: 'Return to the main landing screen to switch modules or review simulation features.',
  },
  navSandbox: {
    title: 'Interactive Simulation Lab',
    badge: 'Workspace',
    definition: 'Run hands-on triboelectric, field-line, point-charge, and electroscope experiments.',
  },
  navLabs: {
    title: 'Guided Lab Activities',
    badge: 'Curriculum',
    definition: 'Step-by-step inquiry worksheets with live measurement checkpoints.',
  },
  navGraphs: {
    title: 'Real-Time Field Graphs',
    badge: '1/r² & 1/r Plots',
    definition: 'Plot electric field strength |E| and voltage V versus distance from charged objects.',
  },
  navQuiz: {
    title: 'Electrostatics Concept Quiz',
    badge: 'Self-Check',
    definition: 'Test your understanding of triboelectric charging, induction, grounding, and Coulomb forces.',
  },
  navTribo: {
    title: 'Triboelectric & Chemistry Table',
    badge: 'Reference',
    definition: 'Compare material work functions (eV), chemical formulas, and electron donor/acceptor rankings.',
  },
  navAITutor: {
    title: 'Ask Physics Lab Assistant',
    badge: 'Help',
    definition: 'Get guided explanations of what is happening on your current simulation stage.',
  },
  mod1Tab: {
    title: 'Module 1: Two-Object Explorer',
    badge: 'Beginner Lab',
    definition: 'Pick two classroom materials, rub them together or with a cloth, and observe attraction, repulsion, and dipole induction.',
  },
  mod2Tab: {
    title: 'Module 2: Multi-Object Lab',
    badge: 'Advanced Sandbox',
    definition: 'Combine multiple conductors and insulators, adjust humidity/damping, probe V and |E|, and explore industrial applications.',
  },
  mod3Tab: {
    title: 'Module 3: Point Charges Studio',
    badge: 'Vector Fields',
    definition: 'Place isolated point charges, inspect 2D vector grids and field lines, edit Q magnitudes, and toggle Coulomb motion.',
  },
  mod4Tab: {
    title: 'Module 4: Gold-Leaf Electroscope',
    badge: 'Detection & Induction',
    definition: 'Rub materials and approach or ground the brass knob to explore electrostatic induction, conduction, and polarity testing.',
  },
};

export function getMaterialTooltip(mat: MaterialDef): PhysicsTooltipEntry {
  const roleLabel =
    mat.id === 'ground'
      ? 'Infinite Earth Sink (0 V)'
      : mat.category === 'conductor'
      ? 'Conductor (Free e⁻)'
      : mat.triboOrder > 0
      ? `Donor (+${mat.triboOrder})`
      : mat.triboOrder < 0
      ? `Acceptor (${mat.triboOrder})`
      : 'Dielectric (0)';

  return {
    title: mat.name,
    badge: `${roleLabel} · W=${mat.workFunctionEv} eV`,
    definition: mat.electronAffinityText,
    formula: `${mat.chemicalFormula} · εᵣ=${mat.dielectricConstant} · m=${mat.massGrams} g`,
  };
}
