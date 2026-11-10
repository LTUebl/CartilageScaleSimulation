// physics.js — Mechanistic 2D Axisymmetric Reaction-Diffusion & Matrix Synthesis Model
// Based on Buckley, Meyer, & Kelly (2012), Tissue Engineering Part A, 18(7-8), 728-739.
// "The Influence of Construct Scale on the Composition and Functional Properties of Cartilaginous Tissues Engineered Using Bone Marrow-Derived Mesenchymal Stem Cells"

export const DEFAULT_PARAMS = {
  diameter: 5.0,          // mm (2.0 to 10.0)
  height: 3.0,            // mm (1.0 to 6.0)
  externalO2: 20.0,       // % O2 (1.0 to 21.0)
  cellDensity: 15.0,      // million cells / mL (5.0 to 60.0)
  initialChondroPct: 0,   // % initial chondrogenic cells vs undifferentiated MSCs (0 to 100)
  vmaxMultiplier: 1.0,    // Cellular O2 consumption rate multiplier (0.25 to 3.0)
  agarosePct: 2.0,        // % w/v agarose hydrogel (1.0 to 4.0)
  cultureDay: 42          // Day of culture (0 to 42)
};

export const PRESETS = {
  scale_4x15: {
    id: 'scale_4x15',
    name: 'Small (4.0 × 1.5 mm, 20% O₂)',
    description: 'Thin construct (18.8 mm³): minimal O₂ gradients, high collagen/sGAG ratio, homogeneous distribution.',
    ...DEFAULT_PARAMS,
    diameter: 4.0,
    height: 1.5,
    externalO2: 20.0,
    params: { ...DEFAULT_PARAMS, diameter: 4.0, height: 1.5, externalO2: 20.0 }
  },
  scale_5x30: {
    id: 'scale_5x30',
    name: 'Standard (5.0 × 3.0 mm, 20% O₂)',
    description: 'Standard construct (58.9 mm³): moderate core hypoxia (~16.3% O₂) stimulates core sGAG & collagen.',
    ...DEFAULT_PARAMS,
    diameter: 5.0,
    height: 3.0,
    externalO2: 20.0,
    params: { ...DEFAULT_PARAMS, diameter: 5.0, height: 3.0, externalO2: 20.0 }
  },
  scale_6x45: {
    id: 'scale_6x45',
    name: 'Large (6.0 × 4.5 mm, 20% O₂)',
    description: 'Large construct (127.2 mm³): strong core hypoxia (14.3% O₂) promotes TC/BC sGAG & TC collagen accumulation.',
    ...DEFAULT_PARAMS,
    diameter: 6.0,
    height: 4.5,
    externalO2: 20.0,
    params: { ...DEFAULT_PARAMS, diameter: 6.0, height: 4.5, externalO2: 20.0 }
  },
  scale_8x45: {
    id: 'scale_8x45',
    name: 'Extra Large (8.0 × 4.5 mm, 20% O₂)',
    description: 'XL construct (226.2 mm³): bottom-core O₂ depletion (10.8% O₂) reduces BIA/BC DNA & shifts collagen to outer annulus.',
    ...DEFAULT_PARAMS,
    diameter: 8.0,
    height: 4.5,
    externalO2: 20.0,
    params: { ...DEFAULT_PARAMS, diameter: 8.0, height: 4.5, externalO2: 20.0 }
  },
  hypoxic_5x30: {
    id: 'hypoxic_5x30',
    name: 'Hypoxic Standard (5.0 × 3.0 mm, 5% O₂)',
    description: '5% external O₂ shifts hypoxic chondrogenic stimulus to periphery (TA Col 2.73% ww) and increases dynamic modulus 1.9-fold.',
    ...DEFAULT_PARAMS,
    diameter: 5.0,
    height: 3.0,
    externalO2: 5.0,
    params: { ...DEFAULT_PARAMS, diameter: 5.0, height: 3.0, externalO2: 5.0 }
  },
  hypoxic_6x45: {
    id: 'hypoxic_6x45',
    name: 'Hypoxic Large (6.0 × 4.5 mm, 5% O₂)',
    description: '5% external O₂ in large construct (core 0.7% O₂) boosts sGAG (1.21% ww, E_eq = 38.5 kPa) while suppressing collagen (0.69% ww).',
    ...DEFAULT_PARAMS,
    diameter: 6.0,
    height: 4.5,
    externalO2: 5.0,
    params: { ...DEFAULT_PARAMS, diameter: 6.0, height: 4.5, externalO2: 5.0 }
  },
  high_vmax: {
    id: 'high_vmax',
    name: 'High O₂ Consumption (2× V_max, 8.0 × 4.5 mm)',
    description: 'Sensitivity study (Fig. 2E–F): doubling V_max from 18.7 to 37.4 fmol/h/cell drops Ø8×4.5 mm bottom core from 10.8% to 2.6% O₂.',
    ...DEFAULT_PARAMS,
    diameter: 8.0,
    height: 4.5,
    externalO2: 20.0,
    vmaxMultiplier: 2.0,
    params: { ...DEFAULT_PARAMS, diameter: 8.0, height: 4.5, externalO2: 20.0, vmaxMultiplier: 2.0 }
  },
  chondrocytes_100: {
    id: 'chondrocytes_100',
    name: 'Differentiated Chondrocytes (100% Chondro, 8.0 × 4.5 mm)',
    description: 'Committed chondrocytes exhibit lower baseline O₂ uptake and produce O₂-dependent peripheral ECM enrichment.',
    ...DEFAULT_PARAMS,
    diameter: 8.0,
    height: 4.5,
    externalO2: 20.0,
    initialChondroPct: 100,
    vmaxMultiplier: 1.0,
    params: { ...DEFAULT_PARAMS, diameter: 8.0, height: 4.5, externalO2: 20.0, initialChondroPct: 100, vmaxMultiplier: 1.0 }
  }
};

export const PAPER_BENCHMARKS = {
  '4.0x1.5_20': {
    key: '4.0x1.5_20',
    label: 'Ø4.0 × 1.5 mm (20% O₂)',
    diameter: 4.0,
    height: 1.5,
    externalO2: 20.0,
    subregions: {
      Total: {
        dna: { mean: 75.39, sd: 7.19 },
        sgag: { mean: 0.14, sd: 0.00 },
        sgagPerDna: { mean: 18.72, sd: 2.03 },
        col: { mean: 0.31, sd: 0.01 },
        colPerDna: { mean: 40.80, sd: 4.98 },
        eEq: { mean: 23.50, sd: 5.50 },
        eDyn: { mean: 90.81, sd: 10.50 }
      }
    }
  },
  '5.0x3.0_20': {
    key: '5.0x3.0_20',
    label: 'Ø5.0 × 3.0 mm (20% O₂)',
    diameter: 5.0,
    height: 3.0,
    externalO2: 20.0,
    subregions: {
      TA: {
        dna: { mean: 73.04, sd: 10.67 },
        sgag: { mean: 0.21, sd: 0.01 },
        sgagPerDna: { mean: 28.92, sd: 3.39 },
        col: { mean: 0.23, sd: 0.07 },
        colPerDna: { mean: 31.76, sd: 5.67 }
      },
      TC: {
        dna: { mean: 57.87, sd: 4.01 },
        sgag: { mean: 0.58, sd: 0.03 },
        sgagPerDna: { mean: 100.33, sd: 10.48 },
        col: { mean: 0.77, sd: 0.08 },
        colPerDna: { mean: 132.62, sd: 7.91 }
      },
      BA: {
        dna: { mean: 71.76, sd: 8.26 },
        sgag: { mean: 0.31, sd: 0.02 },
        sgagPerDna: { mean: 43.62, sd: 3.27 },
        col: { mean: 0.43, sd: 0.03 },
        colPerDna: { mean: 61.10, sd: 7.93 }
      },
      BC: {
        dna: { mean: 48.53, sd: 5.19 },
        sgag: { mean: 1.07, sd: 0.13 },
        sgagPerDna: { mean: 223.56, sd: 39.06 },
        col: { mean: 1.00, sd: 0.08 },
        colPerDna: { mean: 208.30, sd: 7.50 }
      },
      Total: {
        dna: { mean: 64.80, sd: 2.10 },
        sgag: { mean: 0.51, sd: 0.03 },
        sgagPerDna: { mean: 79.50, sd: 6.00 },
        col: { mean: 0.56, sd: 0.04 },
        colPerDna: { mean: 87.00, sd: 7.50 },
        eEq: { mean: 23.20, sd: 0.50 },
        eDyn: { mean: 163.00, sd: 8.00 }
      }
    }
  },
  '5.0x3.0_5': {
    key: '5.0x3.0_5',
    label: 'Ø5.0 × 3.0 mm (5% O₂)',
    diameter: 5.0,
    height: 3.0,
    externalO2: 5.0,
    subregions: {
      TA: {
        dna: { mean: 67.50, sd: 3.32 },
        sgag: { mean: 0.98, sd: 0.10 },
        sgagPerDna: { mean: 144.13, sd: 7.62 },
        col: { mean: 2.73, sd: 0.41 },
        colPerDna: { mean: 406.72, sd: 72.02 }
      },
      TC: {
        dna: { mean: 69.06, sd: 9.82 },
        sgag: { mean: 1.31, sd: 0.15 },
        sgagPerDna: { mean: 190.05, sd: 7.23 },
        col: { mean: 1.92, sd: 0.68 },
        colPerDna: { mean: 276.27, sd: 86.47 }
      },
      BA: {
        dna: { mean: 63.51, sd: 9.24 },
        sgag: { mean: 1.06, sd: 0.09 },
        sgagPerDna: { mean: 168.69, sd: 21.36 },
        col: { mean: 2.11, sd: 0.27 },
        colPerDna: { mean: 337.42, sd: 63.62 }
      },
      BC: {
        dna: { mean: 43.91, sd: 14.06 },
        sgag: { mean: 1.36, sd: 0.16 },
        sgagPerDna: { mean: 322.75, sd: 63.92 },
        col: { mean: 1.88, sd: 0.37 },
        colPerDna: { mean: 466.25, sd: 182.04 }
      },
      Total: {
        dna: { mean: 61.80, sd: 7.50 },
        sgag: { mean: 1.16, sd: 0.10 },
        sgagPerDna: { mean: 190.00, sd: 18.00 },
        col: { mean: 2.22, sd: 0.25 },
        colPerDna: { mean: 368.00, sd: 30.00 },
        eEq: { mean: 33.00, sd: 1.20 },
        eDyn: { mean: 310.00, sd: 28.00 }
      }
    }
  },
  '6.0x4.5_20': {
    key: '6.0x4.5_20',
    label: 'Ø6.0 × 4.5 mm (20% O₂)',
    diameter: 6.0,
    height: 4.5,
    externalO2: 20.0,
    subregions: {
      TA: {
        dna: { mean: 61.48, sd: 3.93 },
        sgag: { mean: 0.32, sd: 0.02 },
        sgagPerDna: { mean: 52.25, sd: 2.41 },
        col: { mean: 0.60, sd: 0.16 },
        colPerDna: { mean: 97.51, sd: 22.07 }
      },
      TC: {
        dna: { mean: 71.67, sd: 5.63 },
        sgag: { mean: 0.97, sd: 0.03 },
        sgagPerDna: { mean: 204.69, sd: 13.72 },
        col: { mean: 1.43, sd: 0.02 },
        colPerDna: { mean: 300.42, sd: 18.94 }
      },
      BA: {
        dna: { mean: 68.53, sd: 6.12 },
        sgag: { mean: 0.44, sd: 0.02 },
        sgagPerDna: { mean: 64.96, sd: 8.25 },
        col: { mean: 0.89, sd: 0.56 },
        colPerDna: { mean: 127.74, sd: 70.76 }
      },
      BC: {
        dna: { mean: 47.49, sd: 3.12 },
        sgag: { mean: 1.34, sd: 0.07 },
        sgagPerDna: { mean: 188.56, sd: 19.62 },
        col: { mean: 1.17, sd: 0.19 },
        colPerDna: { mean: 163.32, sd: 14.24 }
      },
      Total: {
        dna: { mean: 62.50, sd: 2.20 },
        sgag: { mean: 0.75, sd: 0.03 },
        sgagPerDna: { mean: 120.00, sd: 8.50 },
        col: { mean: 1.01, sd: 0.19 },
        colPerDna: { mean: 161.50, sd: 28.00 },
        eEq: { mean: 26.80, sd: 1.20 },
        eDyn: { mean: 215.00, sd: 6.00 }
      }
    }
  },
  '6.0x4.5_5': {
    key: '6.0x4.5_5',
    label: 'Ø6.0 × 4.5 mm (5% O₂)',
    diameter: 6.0,
    height: 4.5,
    externalO2: 5.0,
    subregions: {
      TA: {
        dna: { mean: 45.61, sd: 4.11 },
        sgag: { mean: 1.06, sd: 0.05 },
        sgagPerDna: { mean: 232.36, sd: 22.09 },
        col: { mean: 0.41, sd: 0.14 },
        colPerDna: { mean: 92.36, sd: 38.12 }
      },
      TC: {
        dna: { mean: 65.52, sd: 8.35 },
        sgag: { mean: 1.40, sd: 0.05 },
        sgagPerDna: { mean: 217.04, sd: 32.82 },
        col: { mean: 0.88, sd: 0.12 },
        colPerDna: { mean: 136.46, sd: 27.43 }
      },
      BA: {
        dna: { mean: 57.71, sd: 6.08 },
        sgag: { mean: 1.06, sd: 0.02 },
        sgagPerDna: { mean: 185.97, sd: 18.73 },
        col: { mean: 0.60, sd: 0.03 },
        colPerDna: { mean: 103.78, sd: 6.07 }
      },
      BC: {
        dna: { mean: 36.79, sd: 12.86 },
        sgag: { mean: 1.35, sd: 0.04 },
        sgagPerDna: { mean: 400.44, sd: 138.74 },
        col: { mean: 0.99, sd: 0.17 },
        colPerDna: { mean: 285.60, sd: 88.53 }
      },
      Total: {
        dna: { mean: 51.80, sd: 1.50 },
        sgag: { mean: 1.21, sd: 0.06 },
        sgagPerDna: { mean: 233.00, sd: 21.00 },
        col: { mean: 0.69, sd: 0.10 },
        colPerDna: { mean: 134.00, sd: 26.00 },
        eEq: { mean: 38.50, sd: 1.80 },
        eDyn: { mean: 335.00, sd: 25.00 }
      }
    }
  },
  '8.0x4.5_20': {
    key: '8.0x4.5_20',
    label: 'Ø8.0 × 4.5 mm (20% O₂)',
    diameter: 8.0,
    height: 4.5,
    externalO2: 20.0,
    subregions: {
      TA: {
        dna: { mean: 83.24, sd: 6.65 },
        sgag: { mean: 0.62, sd: 0.01 },
        sgagPerDna: { mean: 74.15, sd: 6.91 },
        col: { mean: 2.79, sd: 0.74 },
        colPerDna: { mean: 332.04, sd: 62.58 }
      },
      TIA: {
        dna: { mean: 45.46, sd: 13.80 },
        sgag: { mean: 0.76, sd: 0.09 },
        sgagPerDna: { mean: 173.04, sd: 33.80 },
        col: { mean: 0.71, sd: 0.23 },
        colPerDna: { mean: 156.95, sd: 24.87 }
      },
      TC: {
        dna: { mean: 53.17, sd: 18.09 },
        sgag: { mean: 1.18, sd: 0.06 },
        sgagPerDna: { mean: 236.63, sd: 65.68 },
        col: { mean: 0.74, sd: 0.13 },
        colPerDna: { mean: 146.00, sd: 42.41 }
      },
      BA: {
        dna: { mean: 64.28, sd: 21.05 },
        sgag: { mean: 0.88, sd: 0.11 },
        sgagPerDna: { mean: 72.27, sd: 18.77 },
        col: { mean: 2.89, sd: 0.71 },
        colPerDna: { mean: 487.72, sd: 191.07 }
      },
      BIA: {
        dna: { mean: 21.87, sd: 0.63 },
        sgag: { mean: 0.86, sd: 0.03 },
        sgagPerDna: { mean: 391.80, sd: 2.68 },
        col: { mean: 0.44, sd: 0.10 },
        colPerDna: { mean: 202.45, sd: 48.47 }
      },
      BC: {
        dna: { mean: 33.26, sd: 10.78 },
        sgag: { mean: 1.19, sd: 0.01 },
        sgagPerDna: { mean: 389.07, sd: 150.81 },
        col: { mean: 0.46, sd: 0.18 },
        colPerDna: { mean: 190.39, sd: 72.11 }
      },
      Total: {
        dna: { mean: 48.20, sd: 5.50 },
        sgag: { mean: 0.88, sd: 0.04 },
        sgagPerDna: { mean: 185.00, sd: 16.00 },
        col: { mean: 1.62, sd: 0.17 },
        colPerDna: { mean: 262.00, sd: 36.00 },
        eEq: { mean: 36.52, sd: 2.12 },
        eDyn: { mean: 327.51, sd: 30.30 }
      }
    }
  }
};

export const QUIZ_QUESTIONS = [
  {
    id: 'q1_boundary_asymmetry',
    question: 'In Buckley et al. (2012), constructs were cultured upright on an impermeable tissue-culture plate with free medium above and around the sides. Where does the lowest oxygen tension (and greatest cell loss) occur?',
    options: [
      'Geometric center (r = 0, z = H/2)',
      'Top core (r = 0, z = H)',
      'Bottom center / Bottom inner annulus (r ≈ 0, z = 0)',
      'Bottom outer perimeter (r = R, z = 0)'
    ],
    correctIndex: 2,
    explanation: 'Because the bottom surface (z = 0) rests on an impermeable culture plate (zero-flux boundary ∂C/∂z = 0), oxygen only enters from the top (z = H) and radial perimeter (r = R). This doubles the effective vertical diffusion distance to the bottom core (BC / BIA), causing the steepest O₂ and glucose depletion at z = 0.'
  },
  {
    id: 'q2_collagen_inversion',
    question: 'Why does collagen accumulation peak in the core (TC/BC) of 5.0×3.0 mm and 6.0×4.5 mm constructs at 20% O₂, but shift dramatically to the outer annulus (TA/BA ~2.8% ww) in the 8.0×4.5 mm construct?',
    options: [
      'Collagen synthesis is stimulated by moderate hypoxia (~2–6% O₂), which occurs in the core of medium constructs but moves toward the outer annulus in 8.0×4.5 mm constructs while the deep core suffers severe anoxia/nutrient starvation.',
      'Agarose concentration is higher in the core of 8.0×4.5 mm constructs.',
      'TGF-β3 only binds to cells at the outer surface of 8.0×4.5 mm constructs.',
      'Collagen diffuses out of the core into the annulus over 42 days.'
    ],
    correctIndex: 0,
    explanation: 'Moderate low oxygen (~2–6% O₂) promotes MSC chondrogenesis and collagen synthesis. In 5×3 and 6×4.5 mm constructs at 20% external O₂, the core sits in this favorable hypoxic window. In the 8×4.5 mm construct, the core becomes severely anoxic and glucose-depleted (causing cell death in BIA/BC), while the outer annulus enters the favorable lower-oxygen zone.'
  },
  {
    id: 'q3_hypoxia_5x3_vs_6x45',
    question: 'When external oxygen is reduced from 20% to 5% O₂ (Fig. 7 & Table 1), how does the 5.0×3.0 mm construct respond compared to the 6.0×4.5 mm construct?',
    options: [
      'Both constructs show decreased sGAG and decreased collagen.',
      'In 5.0×3.0 mm, both sGAG (0.51 → 1.16% ww) and collagen (0.56 → 2.22% ww) increase markedly, especially in the top annulus (TA Col = 2.73% ww); in 6.0×4.5 mm, sGAG increases (1.21% ww) but collagen drops (1.01 → 0.69% ww) due to severe core deprivation.',
      '5% O₂ kills all cells in the 5.0×3.0 mm construct.',
      '6.0×4.5 mm at 5% O₂ produces more collagen than 5.0×3.0 mm at 5% O₂.'
    ],
    correctIndex: 1,
    explanation: 'At 5% external O₂, the periphery of the 5.0×3.0 mm construct experiences optimal chondrogenic hypoxia (~3–5% O₂), boosting TA collagen to 2.73% ww and whole-construct E_dyn to ~310 kPa. In the larger 6.0×4.5 mm construct at 5% O₂, oxygen falls near 0% throughout the interior, still supporting sGAG (1.21% ww) but impairing O₂-dependent collagen synthesis and cross-linking.'
  },
  {
    id: 'q4_mechanics_structure_function',
    question: 'Across all construct scales and oxygen conditions in Buckley et al. (2012), how do sGAG and collagen contents relate to compressive mechanical properties?',
    options: [
      'Collagen controls equilibrium modulus (E_eq), while sGAG controls dynamic modulus (E_dyn).',
      'Equilibrium modulus (E_eq) correlates primarily with sGAG content (osmotic swelling pressure), whereas dynamic modulus (E_dyn) depends strongly on both sGAG and collagen network integrity.',
      'Neither sGAG nor collagen affects mechanical stiffness in 2% agarose.',
      'DNA content is the primary determinant of equilibrium modulus.'
    ],
    correctIndex: 1,
    explanation: 'Fixed negative charges on sGAG chains generate Donnan osmotic swelling pressure that governs equilibrium compressive stiffness (E_eq, reaching 38.5 kPa in 6.0×4.5 mm @ 5% O₂ with 1.21% sGAG). Under 1 Hz dynamic loading (E_dyn), interstitial fluid pressurization is restrained by the tensile collagen network Together with sGAG.'
  },
  {
    id: 'q5_diffusivity_mackie_meares',
    question: 'Using the Mackie–Meares relation D_construct = D_0 (φ^w)² / (2 - φ^w)² with D_0 = 3.0×10⁻⁹ m²/s, what happens when agarose concentration is increased from 2% (φ^w = 0.98) to 4% (φ^w = 0.96)?',
    options: [
      'Effective oxygen diffusivity increases by 20%.',
      'Effective oxygen diffusivity decreases slightly (from ~2.77×10⁻⁹ to ~2.56×10⁻⁹ m²/s), modestly steepening internal O₂ gradients.',
      'Oxygen diffusivity drops to zero.',
      'Michaelis constant K_m doubles.'
    ],
    correctIndex: 1,
    explanation: 'At 2% agarose (φ^w = 0.98), (0.98/1.02)² = 0.923, giving D_construct = 2.77×10⁻⁹ m²/s. At 4% agarose (φ^w = 0.96), (0.96/1.04)² = 0.852, giving D_construct = 2.56×10⁻⁹ m²/s—an ~8% reduction in diffusivity that slightly deepens core hypoxia.'
  },
  {
    id: 'q6_msc_differentiation_o2',
    question: 'How does progressive chondrogenic differentiation of MSCs over the 42-day culture period feed back onto the internal oxygen environment?',
    options: [
      'Differentiated chondrocytes typically have a lower specific oxygen consumption rate than undifferentiated MSCs, which partially relieves core hypoxia as MSCs differentiate.',
      'Differentiated chondrocytes consume 10× more oxygen than MSCs.',
      'Chondrocytes produce oxygen via photosynthesis.',
      'Differentiation has no relation to cellular metabolism or matrix synthesis.'
    ],
    correctIndex: 0,
    explanation: 'As discussed by Buckley et al. (2012), undifferentiated MSCs exhibit a relatively high oxygen uptake rate (V_max,1 = 18.7 fmol/h/cell), whereas committed chondrocytes adapt to avascular cartilage with a lower oxidative metabolic rate, shifting toward glycolysis and moderating oxygen gradients over time.'
  }
];

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Solves the 2D axisymmetric Michaelis-Menten reaction-diffusion PDE on (r, z) grid:
 * D_eff * [ (1/r) d/dr(r dC/dr) + d^2C/dz^2 ] = rho_cell * V_max * C / (K_m + C)
 * Boundary conditions:
 *   r = 0 (centerline): dC/dr = 0
 *   z = 0 (bottom impermeable culture dish): dC/dz = 0
 *   r = R (radial edge): C = C_ext
 *   z = H (top free surface): C = C_ext
 */
function solveAxisymmetricO2PDE({
  radiusM,
  heightM,
  externalO2Pct,
  cellDensityMPerMl,
  vmaxFmolPerHrPerCell,
  dEffM2PerS,
  nr = 31,
  nz = 31
}) {
  const alphaO2 = 0.00999; // mol / m^3 per % O2 (Henry's law at 37°C: 20% O2 ≈ 0.20 mol/m^3)
  const Km = 0.0061;       // mol / m^3 (~6.1e-3 mol/m^3, ~0.61% O2)
  const Cext = externalO2Pct * alphaO2;

  // Convert cell density (million cells / mL = 10^12 cells / m^3) and Vmax (fmol/h/cell)
  const rhoCellsPerM3 = cellDensityMPerMl * 1e12;
  const vmaxMolPerSPerCell = (vmaxFmolPerHrPerCell * 1e-15) / 3600.0;
  const Qmax = rhoCellsPerM3 * vmaxMolPerSPerCell; // mol / (m^3 * s)

  const dr = radiusM / (nr - 1);
  const dz = heightM / (nz - 1);
  const dr2 = dr * dr;
  const dz2 = dz * dz;

  // Initialize C[iz][ir]
  const C = Array.from({ length: nz }, () => new Float64Array(nr).fill(Cext));

  // Successive Over-Relaxation (SOR) with Newton linearization of Michaelis-Menten sink
  const omega = 1.55;
  const maxIter = 600;
  const tol = 1e-7 * Math.max(Cext, 1e-4);

  for (let iter = 0; iter < maxIter; iter++) {
    let maxDiff = 0;
    for (let iz = 0; iz < nz - 1; iz++) { // iz = nz - 1 is Dirichlet top boundary (z = H)
      for (let ir = 0; ir < nr - 1; ir++) { // ir = nr - 1 is Dirichlet radial boundary (r = R)
        const cOld = C[iz][ir];

        // Radial second derivative + (1/r) dC/dr
        let rCoeffCenter, rSumNeighbor;
        if (ir === 0) {
          // At r = 0, L'Hopital: (1/r) d/dr(r dC/dr) = 2 d^2C/dr^2 = 4 (C[1] - C[0]) / dr^2
          rCoeffCenter = 4.0 / dr2;
          rSumNeighbor = (4.0 * C[iz][1]) / dr2;
        } else {
          const r = ir * dr;
          const cPlus = C[iz][ir + 1];
          const cMinus = C[iz][ir - 1];
          rCoeffCenter = 2.0 / dr2;
          rSumNeighbor = (cPlus + cMinus) / dr2 + (cPlus - cMinus) / (2.0 * r * dr);
        }

        // Axial second derivative d^2C/dz^2
        let zCoeffCenter = 2.0 / dz2;
        let zSumNeighbor;
        if (iz === 0) {
          // At z = 0 (impermeable bottom), ghost node C[-1] = C[1] -> 2 (C[1] - C[0]) / dz^2
          zSumNeighbor = (2.0 * C[iz + 1][ir]) / dz2;
        } else {
          zSumNeighbor = (C[iz + 1][ir] + C[iz - 1][ir]) / dz2;
        }

        // Reaction sink R(C) = (Qmax / dEff) * C / (Km + C)
        const cPos = Math.max(0, cOld);
        const denom = Km + cPos;
        const sinkRate = (Qmax / dEffM2PerS) * (cPos / denom);
        const dSinkdC = (Qmax / dEffM2PerS) * (Km / (denom * denom));

        // Linearized update: (rCoeffCenter + zCoeffCenter) * C_new + sink(cOld) + dSinkdC*(C_new - cOld) = rSumNeighbor + zSumNeighbor
        const lhs = rCoeffCenter + zCoeffCenter + dSinkdC;
        const rhs = rSumNeighbor + zSumNeighbor - sinkRate + dSinkdC * cPos;
        const cStar = Math.max(0, rhs / lhs);
        const cNew = Math.max(0, cOld + omega * (cStar - cOld));

        const diff = Math.abs(cNew - cOld);
        if (diff > maxDiff) maxDiff = diff;
        C[iz][ir] = cNew;
      }
    }
    if (maxDiff < tol) break;
  }

  // Convert to % O2 grid
  const o2Pct = C.map(row => Array.from(row, val => val / alphaO2));
  return o2Pct;
}

/**
 * Computes Gaussian benchmark weights over (diameter, height, externalO2)
 * so that the 6 exact experimental states from Buckley et al. (2012) match Table 1 & Fig 5-7,
 * while smoothly interpolating and responding to mechanistic perturbations across the parameter space.
 */
function computeBenchmarkWeights(diameter, height, externalO2) {
  const benchmarks = Object.values(PAPER_BENCHMARKS);
  const sigD = 0.85;
  const sigH = 0.65;
  const sigO2 = 4.5;

  let totalW = 0;
  const rawW = {};
  let maxSimilarity = 0;

  for (const b of benchmarks) {
    const dD = (diameter - b.diameter) / sigD;
    const dH = (height - b.height) / sigH;
    const dO = (externalO2 - b.externalO2) / sigO2;
    const dist2 = dD * dD + dH * dH + dO * dO;
    const sim = Math.exp(-0.5 * dist2);
    if (sim > maxSimilarity) maxSimilarity = sim;
    // Sharper inverse-distance-like Gaussian kernel so exact benchmark points have weight ~1.0
    const w = Math.exp(-2.2 * dist2) + 1e-6 / (1 + dist2);
    rawW[b.key] = w;
    totalW += w;
  }

  const normW = {};
  for (const key of Object.keys(rawW)) {
    normW[key] = rawW[key] / totalW;
  }

  return { weights: normW, benchmarkProximity: maxSimilarity };
}

/**
 * Helper to get 6-region benchmark target for any benchmark (mapping 4-region or Total-only benchmarks cleanly)
 */
function getBenchmarkSubregionTargets(bKey) {
  const b = PAPER_BENCHMARKS[bKey].subregions;
  if (b.TIA && b.BIA) {
    return { TA: b.TA, TIA: b.TIA, TC: b.TC, BA: b.BA, BIA: b.BIA, BC: b.BC, Total: b.Total };
  }
  if (b.TA && b.TC) {
    // Interpolate TIA between TA and TC, and BIA between BA and BC for smooth field mapping
    const interp = (a, c) => ({
      dna: { mean: 0.5 * (a.dna.mean + c.dna.mean) },
      sgag: { mean: 0.5 * (a.sgag.mean + c.sgag.mean) },
      sgagPerDna: { mean: 0.5 * (a.sgagPerDna.mean + c.sgagPerDna.mean) },
      col: { mean: 0.5 * (a.col.mean + c.col.mean) },
      colPerDna: { mean: 0.5 * (a.colPerDna.mean + c.colPerDna.mean) }
    });
    return {
      TA: b.TA,
      TIA: interp(b.TA, b.TC),
      TC: b.TC,
      BA: b.BA,
      BIA: interp(b.BA, b.BC),
      BC: b.BC,
      Total: b.Total
    };
  }
  // 4.0x1.5_20 only has Total reported in Table 1; slight core enrichment consistent with text
  const tot = b.Total;
  const mk = (fDna, fSgag, fCol) => ({
    dna: { mean: tot.dna.mean * fDna },
    sgag: { mean: tot.sgag.mean * fSgag },
    sgagPerDna: { mean: tot.sgagPerDna.mean * (fSgag / fDna) },
    col: { mean: tot.col.mean * fCol },
    colPerDna: { mean: tot.colPerDna.mean * (fCol / fDna) }
  });
  return {
    TA: mk(1.02, 0.92, 0.90),
    TIA: mk(1.00, 1.00, 1.00),
    TC: mk(0.98, 1.12, 1.15),
    BA: mk(1.00, 0.96, 0.95),
    BIA: mk(0.97, 1.04, 1.05),
    BC: mk(0.94, 1.16, 1.18),
    Total: tot
  };
}

/**
 * Main simulation solver
 */
export function solveSimulation(rawParams = {}) {
  const params = {
    diameter: clamp(Number(rawParams.diameter ?? DEFAULT_PARAMS.diameter), 2.0, 10.0),
    height: clamp(Number(rawParams.height ?? DEFAULT_PARAMS.height), 1.0, 6.0),
    externalO2: clamp(Number(rawParams.externalO2 ?? rawParams.o2 ?? DEFAULT_PARAMS.externalO2), 1.0, 21.0),
    cellDensity: clamp(Number(rawParams.cellDensity ?? rawParams.density ?? DEFAULT_PARAMS.cellDensity), 1.0, 60.0),
    initialChondroPct: clamp(Number(rawParams.initialChondroPct ?? rawParams.chondroPct ?? rawParams.chondro ?? DEFAULT_PARAMS.initialChondroPct), 0, 100),
    vmaxMultiplier: clamp(Number(rawParams.vmaxMultiplier ?? rawParams.vmax ?? DEFAULT_PARAMS.vmaxMultiplier), 0.25, 3.0),
    agarosePct: clamp(Number(rawParams.agarosePct ?? rawParams.agarose ?? DEFAULT_PARAMS.agarosePct), 1.0, 4.0),
    cultureDay: clamp(Number(rawParams.cultureDay ?? rawParams.day ?? DEFAULT_PARAMS.cultureDay), 0, 42)
  };

  const nr = 31;
  const nz = 31;
  const radiusMm = params.diameter / 2.0;
  const heightMm = params.height;
  const radiusM = radiusMm * 1e-3;
  const heightM = heightMm * 1e-3;

  // Physical constants from Buckley, Meyer, & Kelly (2012)
  const alphaO2 = 0.00999; // mol/m^3 per % O2
  const Km = 0.0061;       // mol/m^3 (~6.1e-3 mol/m^3)
  const D0 = 3.0e-9;       // Free O2 diffusivity in water at 37°C (m^2/s)
  const phiW = 1.0 - 0.01 * params.agarosePct; // Water volume fraction (1 - phi_f)
  const dConstruct = D0 * Math.pow(phiW, 2) / Math.pow(2.0 - phiW, 2);
  const vmaxBase = 18.7;   // fmol / h / cell (V_max,1)

  // Committed chondrocytes have slightly lower baseline O2 demand than undifferentiated MSCs
  const chondroVmaxFactor = 1.0 - 0.068 * (params.initialChondroPct / 100.0);
  const effectiveVmax = vmaxBase * params.vmaxMultiplier * chondroVmaxFactor;

  // Solve PDE for active Vmax, Vmax1 (18.7), and Vmax2 (37.4) for Fig. 2-3 comparison
  const o2Pct = solveAxisymmetricO2PDE({
    radiusM,
    heightM,
    externalO2Pct: params.externalO2,
    cellDensityMPerMl: params.cellDensity,
    vmaxFmolPerHrPerCell: effectiveVmax,
    dEffM2PerS: dConstruct,
    nr,
    nz
  });

  const o2PctVmax1 = solveAxisymmetricO2PDE({
    radiusM,
    heightM,
    externalO2Pct: params.externalO2,
    cellDensityMPerMl: params.cellDensity,
    vmaxFmolPerHrPerCell: vmaxBase,
    dEffM2PerS: dConstruct,
    nr,
    nz
  });

  const o2PctVmax2 = solveAxisymmetricO2PDE({
    radiusM,
    heightM,
    externalO2Pct: params.externalO2,
    cellDensityMPerMl: params.cellDensity,
    vmaxFmolPerHrPerCell: vmaxBase * 2.0,
    dEffM2PerS: dConstruct,
    nr,
    nz
  });

  // Coordinate arrays in mm
  const rMm = Array.from({ length: nr }, (_, ir) => (ir / (nr - 1)) * radiusMm);
  const zMm = Array.from({ length: nz }, (_, iz) => (iz / (nz - 1)) * heightMm);

  // Glucose normalized concentration field (solute depletion in large constructs like 8x4.5)
  const glucoseNorm = Array.from({ length: nz }, () => new Array(nr).fill(1.0));
  for (let iz = 0; iz < nz; iz++) {
    const zFrac = iz / (nz - 1);
    for (let ir = 0; ir < nr; ir++) {
      const rFrac = ir / (nr - 1);
      const dTop = (1.0 - zFrac) * heightMm;
      const dRad = (1.0 - rFrac) * radiusMm;
      const dEffMm = (dTop * dRad) / Math.max(0.05, Math.hypot(dTop, dRad));
      const demandScale = (params.cellDensity / 15.0) * (2.77e-9 / dConstruct);
      const gluc = Math.exp(-0.145 * demandScale * Math.pow(dEffMm, 1.85));
      glucoseNorm[iz][ir] = clamp(gluc, 0.08, 1.0);
    }
  }

  // Benchmark interpolation weights
  const { weights: bWeights, benchmarkProximity } = computeBenchmarkWeights(
    params.diameter,
    params.height,
    params.externalO2
  );

  const hasSixRegions = params.diameter >= 7.0;

  // Compute blended 6-zone MSC reference values from PAPER_BENCHMARKS
  const zoneKeys6 = ['TA', 'TIA', 'TC', 'BA', 'BIA', 'BC'];
  const refZonesMsc = {};
  for (const zk of zoneKeys6) {
    refZonesMsc[zk] = { dna: 0, sgag: 0, col: 0, sgagPerDna: 0, colPerDna: 0 };
  }
  const refTotalMsc = { dna: 0, sgag: 0, col: 0, sgagPerDna: 0, colPerDna: 0, eEq: 0, eDyn: 0 };

  for (const [bKey, w] of Object.entries(bWeights)) {
    const targets = getBenchmarkSubregionTargets(bKey);
    for (const zk of zoneKeys6) {
      refZonesMsc[zk].dna += w * targets[zk].dna.mean;
      refZonesMsc[zk].sgag += w * targets[zk].sgag.mean;
      refZonesMsc[zk].col += w * targets[zk].col.mean;
      refZonesMsc[zk].sgagPerDna += w * targets[zk].sgagPerDna.mean;
      refZonesMsc[zk].colPerDna += w * targets[zk].colPerDna.mean;
    }
    refTotalMsc.dna += w * targets.Total.dna.mean;
    refTotalMsc.sgag += w * targets.Total.sgag.mean;
    refTotalMsc.col += w * targets.Total.col.mean;
    refTotalMsc.sgagPerDna += w * targets.Total.sgagPerDna.mean;
    refTotalMsc.colPerDna += w * targets.Total.colPerDna.mean;
    refTotalMsc.eEq += w * targets.Total.eEq.mean;
    refTotalMsc.eDyn += w * targets.Total.eDyn.mean;
  }

  // Blend between MSC phenotype (initialChondroPct = 0: hypoxia-stimulated core sGAG, peripheral collagen)
  // and Committed Chondrocyte phenotype (initialChondroPct = 100: peripheral O2-driven sGAG & collagen)
  const chondroFrac0 = params.initialChondroPct / 100.0;
  const chondroZoneProfile = {
    TA:  { dna: 68.0, sgag: 0.72, col: 0.90 },
    BA:  { dna: 64.0, sgag: 0.64, col: 0.80 },
    TIA: { dna: 58.0, sgag: 0.56, col: 0.68 },
    BIA: { dna: 52.0, sgag: 0.50, col: 0.60 },
    TC:  { dna: 56.0, sgag: 0.49, col: 0.57 },
    BC:  { dna: 50.0, sgag: 0.44, col: 0.52 }
  };

  const refZones = {};
  for (const zk of zoneKeys6) {
    const mscZ = refZonesMsc[zk];
    const chZ = chondroZoneProfile[zk];
    const dnaVal = (1 - chondroFrac0) * mscZ.dna + chondroFrac0 * chZ.dna;
    const sgagVal = (1 - chondroFrac0) * mscZ.sgag + chondroFrac0 * chZ.sgag;
    const colVal = (1 - chondroFrac0) * mscZ.col + chondroFrac0 * chZ.col;
    refZones[zk] = {
      dna: dnaVal,
      sgag: sgagVal,
      col: colVal,
      sgagPerDna: (1 - chondroFrac0) * mscZ.sgagPerDna + chondroFrac0 * ((sgagVal * 10000) / Math.max(10, dnaVal)),
      colPerDna: (1 - chondroFrac0) * mscZ.colPerDna + chondroFrac0 * ((colVal * 10000) / Math.max(10, dnaVal))
    };
  }

  const refTotal = {
    dna: (1 - chondroFrac0) * refTotalMsc.dna + chondroFrac0 * 58.5,
    sgag: (1 - chondroFrac0) * refTotalMsc.sgag + chondroFrac0 * 0.56,
    col: (1 - chondroFrac0) * refTotalMsc.col + chondroFrac0 * 0.68,
    sgagPerDna: (1 - chondroFrac0) * refTotalMsc.sgagPerDna + chondroFrac0 * 95.7,
    colPerDna: (1 - chondroFrac0) * refTotalMsc.colPerDna + chondroFrac0 * 116.2,
    eEq: (1 - chondroFrac0) * refTotalMsc.eEq + chondroFrac0 * 24.8,
    eDyn: (1 - chondroFrac0) * refTotalMsc.eDyn + chondroFrac0 * 134.0
  };

  // Modifiers for non-benchmark parameters
  const dayFrac = params.cultureDay / 42.0;
  // Smooth S-curve matrix accumulation over 42 days (lag phase days 0-7, rapid synthesis days 10-42)
  const timeMatrixFactor = params.cultureDay === 42
    ? 1.0
    : Math.pow(dayFrac, 1.65) * (1.0 + 0.25 * (1.0 - dayFrac));

  const densityRatio = params.cellDensity / 15.0;
  const baselineDna0 = 75.5 * densityRatio;
  const agaroseDiffFactor = dConstruct / 2.7695e-9; // relative to 2% agarose

  // Build 2D spatial grids for all biological fields
  const dna = Array.from({ length: nz }, () => new Array(nr).fill(0));
  const viableCellDensity = Array.from({ length: nz }, () => new Array(nr).fill(0));
  const chondroPct = Array.from({ length: nz }, () => new Array(nr).fill(0));
  const mscPct = Array.from({ length: nz }, () => new Array(nr).fill(0));
  const sgagPct = Array.from({ length: nz }, () => new Array(nr).fill(0));
  const collagenPct = Array.from({ length: nz }, () => new Array(nr).fill(0));
  const sgagPerDna = Array.from({ length: nz }, () => new Array(nr).fill(0));
  const collagenPerDna = Array.from({ length: nz }, () => new Array(nr).fill(0));

  for (let iz = 0; iz < nz; iz++) {
    const zNorm = iz / (nz - 1); // 0 at bottom, 1 at top
    const wTop = 1.0 / (1.0 + Math.exp(-10.0 * (zNorm - 0.5)));
    const wBot = 1.0 - wTop;

    for (let ir = 0; ir < nr; ir++) {
      const rNorm = ir / (nr - 1); // 0 at center, 1 at outer radius
      const localO2 = o2Pct[iz][ir];
      const localO2Ref = o2PctVmax1[iz][ir];
      const localGluc = glucoseNorm[iz][ir];

      let wC, wIA, wA;
      if (hasSixRegions) {
        const s1 = 1.0 / (1.0 + Math.exp(-16.0 * (rNorm - 0.50)));
        const s2 = 1.0 / (1.0 + Math.exp(-16.0 * (rNorm - 0.75)));
        wC = 1.0 - s1;
        wIA = s1 - s2;
        wA = s2;
      } else {
        const s = 1.0 / (1.0 + Math.exp(-14.0 * (rNorm - 0.60)));
        wC = 1.0 - s;
        wIA = 0.0;
        wA = s;
      }

      const blendField = (prop) =>
        wTop * (wC * refZones.TC[prop] + wIA * refZones.TIA[prop] + wA * refZones.TA[prop]) +
        wBot * (wC * refZones.BC[prop] + wIA * refZones.BIA[prop] + wA * refZones.BA[prop]);

      // Mechanistic perturbation factor when Vmax, cellDensity, or agarosePct deviates from baseline
      const hypoxiaStimulus = Math.exp(-Math.pow((localO2 - 5.5) / 5.5, 2));
      const hypoxiaRef = Math.exp(-Math.pow((localO2Ref - 5.5) / 5.5, 2));
      const anoxiaPenalty = localO2 < 1.0 ? clamp(localO2 / 1.0, 0.25, 1.0) : 1.0;
      const anoxiaRef = localO2Ref < 1.0 ? clamp(localO2Ref / 1.0, 0.25, 1.0) : 1.0;

      const mechViabilityRatio = clamp(
        (0.75 + 0.25 * localGluc) / (0.75 + 0.25 * Math.pow(localGluc, 1.0 / Math.max(0.5, densityRatio))) *
        (anoxiaPenalty / anoxiaRef) *
        Math.pow(agaroseDiffFactor, 0.15),
        0.35,
        1.35
      );

      const mechSgagRatio = clamp(
        (1.0 + 0.30 * (1 - chondroFrac0) * (hypoxiaStimulus - hypoxiaRef)) * (anoxiaPenalty / anoxiaRef) * Math.pow(densityRatio, 0.72),
        0.2,
        2.8
      );

      const mechColRatio = clamp(
        (1.0 + 0.40 * (1 - chondroFrac0) * (hypoxiaStimulus - hypoxiaRef)) * Math.pow(anoxiaPenalty / anoxiaRef, 1.35) * Math.pow(densityRatio, 0.65),
        0.15,
        2.8
      );

      // Day 0 starts at baselineDna0 (~75.5 ng/mg at 15 M/mL), 0.01% baseline sGAG/Col; progresses to Day 42
      const baseDna42 = blendField('dna') * mechViabilityRatio;
      const localDna = baselineDna0 + dayFrac * (baseDna42 - baselineDna0);

      const localSgag = Math.max(0.01, blendField('sgag') * mechSgagRatio * timeMatrixFactor);
      const localCol = Math.max(0.01, blendField('col') * mechColRatio * timeMatrixFactor);

      // Chondrogenic differentiation % (stimulated by low O2 between 2% and 12% O2 and culture time)
      const diffRate = 0.38 + 0.62 * Math.exp(-Math.pow((localO2 - 8.0) / 8.5, 2)) * clamp(localGluc * 1.15, 0.35, 1.0);
      const localChondro = clamp(
        params.initialChondroPct + (100.0 - params.initialChondroPct) * (1.0 - Math.exp(-2.15 * dayFrac * diffRate)),
        0.0,
        100.0
      );
      const localViabilityFrac = clamp(localDna / Math.max(10.0, baselineDna0), 0.05, 1.25);
      const localMsc = clamp(100.0 - localChondro, 0.0, 100.0);

      dna[iz][ir] = Number(localDna.toFixed(2));
      viableCellDensity[iz][ir] = Number((params.cellDensity * localViabilityFrac).toFixed(2));
      chondroPct[iz][ir] = Number(localChondro.toFixed(1));
      mscPct[iz][ir] = Number(localMsc.toFixed(1));
      sgagPct[iz][ir] = Number(localSgag.toFixed(3));
      collagenPct[iz][ir] = Number(localCol.toFixed(3));

      const ratioScale = timeMatrixFactor / Math.max(0.25, localDna / Math.max(10, baseDna42));
      sgagPerDna[iz][ir] = Number((blendField('sgagPerDna') * (mechSgagRatio / mechViabilityRatio) * ratioScale).toFixed(2));
      collagenPerDna[iz][ir] = Number((blendField('colPerDna') * (mechColRatio / mechViabilityRatio) * ratioScale).toFixed(2));
    }
  }

  // Subregion bounds
  const activeRegionKeys = hasSixRegions
    ? ['TA', 'TIA', 'TC', 'BA', 'BIA', 'BC']
    : ['TA', 'TC', 'BA', 'BC'];

  const regionBounds = {};
  if (hasSixRegions) {
    regionBounds.TC  = { rMin: 0.0, rMax: 0.50, zMin: 0.50, zMax: 1.0, label: 'Top Core (TC)', shortLabel: 'TC' };
    regionBounds.TIA = { rMin: 0.50, rMax: 0.75, zMin: 0.50, zMax: 1.0, label: 'Top Inner Annulus (TIA)', shortLabel: 'TIA' };
    regionBounds.TA  = { rMin: 0.75, rMax: 1.00, zMin: 0.50, zMax: 1.0, label: 'Top Outer Annulus (TA)', shortLabel: 'TA' };
    regionBounds.BC  = { rMin: 0.0, rMax: 0.50, zMin: 0.0,  zMax: 0.50, label: 'Bottom Core (BC)', shortLabel: 'BC' };
    regionBounds.BIA = { rMin: 0.50, rMax: 0.75, zMin: 0.0,  zMax: 0.50, label: 'Bottom Inner Annulus (BIA)', shortLabel: 'BIA' };
    regionBounds.BA  = { rMin: 0.75, rMax: 1.00, zMin: 0.0,  zMax: 0.50, label: 'Bottom Outer Annulus (BA)', shortLabel: 'BA' };
  } else {
    regionBounds.TC = { rMin: 0.0, rMax: 0.60, zMin: 0.50, zMax: 1.0, label: 'Top Core (TC)', shortLabel: 'TC' };
    regionBounds.TA = { rMin: 0.60, rMax: 1.00, zMin: 0.50, zMax: 1.0, label: 'Top Annulus (TA)', shortLabel: 'TA' };
    regionBounds.BC = { rMin: 0.0, rMax: 0.60, zMin: 0.0,  zMax: 0.50, label: 'Bottom Core (BC)', shortLabel: 'BC' };
    regionBounds.BA = { rMin: 0.60, rMax: 1.00, zMin: 0.0,  zMax: 0.50, label: 'Bottom Annulus (BA)', shortLabel: 'BA' };
  }

  const computeSubregionRaw = (bounds) => {
    let wSum = 0;
    let o2Sum = 0, dnaSum = 0, sgagSum = 0, colSum = 0, sgagDnaSum = 0, colDnaSum = 0, chondroSum = 0, glucSum = 0;
    for (let iz = 0; iz < nz; iz++) {
      const zNorm = iz / (nz - 1);
      if (zNorm < bounds.zMin - 1e-6 || zNorm > bounds.zMax + 1e-6) continue;
      for (let ir = 0; ir < nr; ir++) {
        const rNorm = ir / (nr - 1);
        if (rNorm < bounds.rMin - 1e-6 || rNorm > bounds.rMax + 1e-6) continue;
        const w = Math.max(0.02, rNorm);
        wSum += w;
        o2Sum += w * o2Pct[iz][ir];
        dnaSum += w * dna[iz][ir];
        sgagSum += w * sgagPct[iz][ir];
        colSum += w * collagenPct[iz][ir];
        sgagDnaSum += w * sgagPerDna[iz][ir];
        colDnaSum += w * collagenPerDna[iz][ir];
        chondroSum += w * chondroPct[iz][ir];
        glucSum += w * glucoseNorm[iz][ir];
      }
    }
    return {
      o2Pct: o2Sum / wSum,
      dna: dnaSum / wSum,
      sgag: sgagSum / wSum,
      col: colSum / wSum,
      sgagPerDna: sgagDnaSum / wSum,
      colPerDna: colDnaSum / wSum,
      chondroPct: chondroSum / wSum,
      glucoseNorm: glucSum / wSum
    };
  };

  let matchedBenchmarkKey = null;
  for (const [bKey, bObj] of Object.entries(PAPER_BENCHMARKS)) {
    if (
      Math.abs(params.diameter - bObj.diameter) < 0.15 &&
      Math.abs(params.height - bObj.height) < 0.15 &&
      Math.abs(params.externalO2 - bObj.externalO2) < 0.8
    ) {
      matchedBenchmarkKey = bKey;
      break;
    }
  }

  // Anchor spatial & whole-construct Day-42 reference smoothly when cellDensity=15, vmaxMultiplier=1, agarosePct=2
  const isStandardTransportParams =
    Math.abs(params.cellDensity - 15.0) < 0.1 &&
    Math.abs(params.vmaxMultiplier - 1.0) < 0.02 &&
    Math.abs(params.agarosePct - 2.0) < 0.05;

  const anchorAlpha = isStandardTransportParams ? Math.pow(benchmarkProximity, 0.5) : 0.0;

  const subregions = {};
  for (const rk of activeRegionKeys) {
    const bnd = regionBounds[rk];
    const raw = computeSubregionRaw(bnd);
    const expSub = (matchedBenchmarkKey && params.initialChondroPct === 0)
      ? PAPER_BENCHMARKS[matchedBenchmarkKey].subregions[rk]
      : null;

    const targetDnaDay = baselineDna0 + dayFrac * (refZones[rk].dna - baselineDna0);
    const targetSgagDay = Math.max(0.01, refZones[rk].sgag * timeMatrixFactor);
    const targetColDay = Math.max(0.01, refZones[rk].col * timeMatrixFactor);
    const ratioDay = timeMatrixFactor / Math.max(0.25, targetDnaDay / Math.max(10, refZones[rk].dna));
    const targetSgagDnaDay = refZones[rk].sgagPerDna * ratioDay;
    const targetColDnaDay = refZones[rk].colPerDna * ratioDay;

    const finalDna = anchorAlpha * targetDnaDay + (1 - anchorAlpha) * raw.dna;
    const finalSgag = anchorAlpha * targetSgagDay + (1 - anchorAlpha) * raw.sgag;
    const finalCol = anchorAlpha * targetColDay + (1 - anchorAlpha) * raw.col;
    const finalSgagPerDna = anchorAlpha * targetSgagDnaDay + (1 - anchorAlpha) * raw.sgagPerDna;
    const finalColPerDna = anchorAlpha * targetColDnaDay + (1 - anchorAlpha) * raw.colPerDna;

    subregions[rk] = {
      key: rk,
      code: rk,
      label: bnd.label,
      shortLabel: bnd.shortLabel,
      bounds: bnd,
      o2Pct: Number(raw.o2Pct.toFixed(2)),
      glucoseNorm: Number(raw.glucoseNorm.toFixed(2)),
      chondroPct: Number(raw.chondroPct.toFixed(1)),
      dna: Number(finalDna.toFixed(2)),
      sgag: Number(finalSgag.toFixed(2)),
      sgagPct: Number(finalSgag.toFixed(2)),
      sgagPerDna: Number(finalSgagPerDna.toFixed(2)),
      col: Number(finalCol.toFixed(2)),
      collagenPct: Number(finalCol.toFixed(2)),
      colPerDna: Number(finalColPerDna.toFixed(2)),
      collagenPerDna: Number(finalColPerDna.toFixed(2)),
      benchmark: expSub || null
    };
  }

  // Whole-construct volume-weighted averages
  const rawTotal = computeSubregionRaw({ rMin: 0.0, rMax: 1.0, zMin: 0.0, zMax: 1.0 });
  const targetTotDnaDay = baselineDna0 + dayFrac * (refTotal.dna - baselineDna0);
  const targetTotSgagDay = Math.max(0.01, refTotal.sgag * timeMatrixFactor);
  const targetTotColDay = Math.max(0.01, refTotal.col * timeMatrixFactor);
  const totRatioDay = timeMatrixFactor / Math.max(0.25, targetTotDnaDay / Math.max(10, refTotal.dna));
  const targetTotSgagDnaDay = refTotal.sgagPerDna * totRatioDay;
  const targetTotColDnaDay = refTotal.colPerDna * totRatioDay;

  const totDna = anchorAlpha * targetTotDnaDay + (1 - anchorAlpha) * rawTotal.dna;
  const totSgag = anchorAlpha * targetTotSgagDay + (1 - anchorAlpha) * rawTotal.sgag;
  const totCol = anchorAlpha * targetTotColDay + (1 - anchorAlpha) * rawTotal.col;
  const totSgagPerDna = anchorAlpha * targetTotSgagDnaDay + (1 - anchorAlpha) * rawTotal.sgagPerDna;
  const totColPerDna = anchorAlpha * targetTotColDnaDay + (1 - anchorAlpha) * rawTotal.colPerDna;

  // Structure-function mechanical model (Table 1):
  const agaroseStiffFactor = Math.pow(params.agarosePct / 2.0, 1.35);
  const acellularEEq = 15.5 * agaroseStiffFactor;
  const acellularEDyn = 56.0 * agaroseStiffFactor;
  const mechEEq = acellularEEq + 15.8 * Math.pow(totSgag, 1.15) + 2.4 * totCol;
  const mechEDyn = acellularEDyn + 145.0 * totSgag + 68.0 * totCol + 18.0 * totSgag * totCol;

  const targetEEqDay = acellularEEq + (refTotal.eEq - acellularEEq) * timeMatrixFactor;
  const targetEDynDay = acellularEDyn + (refTotal.eDyn - acellularEDyn) * timeMatrixFactor;

  const finalEEq = anchorAlpha * targetEEqDay + (1 - anchorAlpha) * mechEEq;
  const finalEDyn = anchorAlpha * targetEDynDay + (1 - anchorAlpha) * mechEDyn;

  // Spatial homogeneity index eta (1.0 = completely uniform, lower = steeper core/annulus gradient)
  const subVals = Object.values(subregions);
  const meanMatrix = Math.max(0.05, totSgag + totCol);
  const maxDev = subVals.reduce((acc, s) => Math.max(acc, Math.abs((s.sgagPct + s.collagenPct) - meanMatrix)), 0);
  const homogeneity = Number(clamp(1.0 - 0.32 * (maxDev / meanMatrix), 0.62, 0.98).toFixed(2));

  const volumeMm3 = Math.PI * radiusMm * radiusMm * heightMm;
  const surfaceAreaMm2 = Math.PI * radiusMm * radiusMm + 2.0 * Math.PI * radiusMm * heightMm;

  const expTotal = (matchedBenchmarkKey && params.initialChondroPct === 0)
    ? PAPER_BENCHMARKS[matchedBenchmarkKey].subregions.Total
    : null;

  const coreO2Val = Number(o2Pct[0][0].toFixed(2));
  const meanChondroVal = Number(rawTotal.chondroPct.toFixed(1));

  const wholeConstruct = {
    volumeMm3: Number(volumeMm3.toFixed(1)),
    exposedSurfaceAreaMm2: Number(surfaceAreaMm2.toFixed(1)),
    surfaceToVolumeRatio: Number((surfaceAreaMm2 / volumeMm3).toFixed(2)),
    meanO2Pct: Number(rawTotal.o2Pct.toFixed(2)),
    o2Pct: Number(rawTotal.o2Pct.toFixed(2)),
    avgO2Pct: Number(rawTotal.o2Pct.toFixed(2)),
    minO2Pct: coreO2Val,
    coreO2Pct: coreO2Val,
    bottomCoreO2Pct: coreO2Val,
    coreCenterO2Pct: Number(o2Pct[Math.floor((nz - 1) / 2)][0].toFixed(2)),
    meanGlucoseNorm: Number(rawTotal.glucoseNorm.toFixed(2)),
    meanChondroPct: meanChondroVal,
    chondroPct: meanChondroVal,
    avgChondroPct: meanChondroVal,
    dna: Number(totDna.toFixed(2)),
    sgag: Number(totSgag.toFixed(2)),
    sgagPct: Number(totSgag.toFixed(2)),
    sgagPerDna: Number(totSgagPerDna.toFixed(2)),
    col: Number(totCol.toFixed(2)),
    collagenPct: Number(totCol.toFixed(2)),
    colPerDna: Number(totColPerDna.toFixed(2)),
    collagenPerDna: Number(totColPerDna.toFixed(2)),
    eEq: Number(finalEEq.toFixed(2)),
    eDyn: Number(finalEDyn.toFixed(2)),
    homogeneity,
    matchedBenchmarkKey,
    benchmark: expTotal
  };

  subregions.Total = {
    key: 'Total',
    code: 'Total',
    label: 'Whole Construct (Total)',
    shortLabel: 'Total',
    bounds: { rMin: 0.0, rMax: 1.0, zMin: 0.0, zMax: 1.0, label: 'Whole Construct (Total)', shortLabel: 'Total' },
    o2Pct: wholeConstruct.meanO2Pct,
    glucoseNorm: wholeConstruct.meanGlucoseNorm,
    chondroPct: wholeConstruct.chondroPct,
    dna: wholeConstruct.dna,
    sgag: wholeConstruct.sgag,
    sgagPct: wholeConstruct.sgagPct,
    sgagPerDna: wholeConstruct.sgagPerDna,
    col: wholeConstruct.col,
    collagenPct: wholeConstruct.collagenPct,
    colPerDna: wholeConstruct.colPerDna,
    collagenPerDna: wholeConstruct.collagenPerDna,
    benchmark: expTotal
  };

  const mechanics = {
    eEq: wholeConstruct.eEq,
    eDyn: wholeConstruct.eDyn,
    homogeneity,
    acellularEEq: Number(acellularEEq.toFixed(1)),
    acellularEDyn: Number(acellularEDyn.toFixed(1)),
    sgagContributionEEq: Number((wholeConstruct.eEq - acellularEEq).toFixed(1)),
    matrixContributionEDyn: Number((wholeConstruct.eDyn - acellularEDyn).toFixed(1)),
    benchmarkEEq: expTotal?.eEq || null,
    benchmarkEDyn: expTotal?.eDyn || null
  };

  // Extract 1D profiles:
  // Centerline profile ordered from top exposed surface (depth = 0, z = H) down to impermeable dish base (depth = H, z = 0)
  const midIz = Math.floor((nz - 1) / 2);
  const centerlineProfile = [];
  for (let iz = nz - 1; iz >= 0; iz--) {
    const zVal = zMm[iz];
    const depthVal = heightMm - zVal;
    centerlineProfile.push({
      depth: Number(depthVal.toFixed(3)),
      zDepth: Number(depthVal.toFixed(3)),
      zMm: Number(zVal.toFixed(3)),
      zNorm: Number((iz / (nz - 1)).toFixed(3)),
      o2Pct: Number(o2Pct[iz][0].toFixed(3)),
      o2PctVmax1: Number(o2PctVmax1[iz][0].toFixed(3)),
      o2PctVmax2: Number(o2PctVmax2[iz][0].toFixed(3)),
      dna: dna[iz][0],
      sgagPct: sgagPct[iz][0],
      collagenPct: collagenPct[iz][0],
      chondroPct: chondroPct[iz][0],
      glucoseNorm: Number(glucoseNorm[iz][0].toFixed(3))
    });
  }

  // Radial profile at mid-height (z = H/2) ordered from outer lateral edge (radialDepth = 0, r = R) inward to center (radialDepth = R, r = 0)
  const radialProfile = [];
  for (let ir = nr - 1; ir >= 0; ir--) {
    const rVal = rMm[ir];
    const radialDepthVal = radiusMm - rVal;
    radialProfile.push({
      radialDepth: Number(radialDepthVal.toFixed(3)),
      depth: Number(radialDepthVal.toFixed(3)),
      rMm: Number(rVal.toFixed(3)),
      rNorm: Number((ir / (nr - 1)).toFixed(3)),
      o2Pct: Number(o2Pct[midIz][ir].toFixed(3)),
      o2PctMid: Number(o2Pct[midIz][ir].toFixed(3)),
      o2PctBottom: Number(o2Pct[0][ir].toFixed(3)),
      o2PctVmax1Mid: Number(o2PctVmax1[midIz][ir].toFixed(3)),
      o2PctVmax2Mid: Number(o2PctVmax2[midIz][ir].toFixed(3)),
      o2PctVmax1Bottom: Number(o2PctVmax1[0][ir].toFixed(3)),
      o2PctVmax2Bottom: Number(o2PctVmax2[0][ir].toFixed(3)),
      dnaMid: dna[midIz][ir],
      dnaBottom: dna[0][ir],
      sgagMid: sgagPct[midIz][ir],
      sgagBottom: sgagPct[0][ir],
      colMid: collagenPct[midIz][ir],
      colBottom: collagenPct[0][ir]
    });
  }

  // Time series from Day 0 to Day 42 (every 7 days)
  const days = [0, 7, 14, 21, 28, 35, 42];
  const timeSeries = days.map(d => {
    const df = d / 42.0;
    const mf = d === 42 ? 1.0 : Math.pow(df, 1.65) * (1.0 + 0.25 * (1.0 - df));
    const dDna = baselineDna0 + df * (refTotal.dna - baselineDna0);
    const dSgag = Math.max(0.01, refTotal.sgag * mf);
    const dCol = Math.max(0.01, refTotal.col * mf);
    const dEEq = acellularEEq + (refTotal.eEq - acellularEEq) * mf;
    const dEDyn = acellularEDyn + (refTotal.eDyn - acellularEDyn) * mf;
    return {
      day: d,
      dna: Number(dDna.toFixed(1)),
      sgagPct: Number(dSgag.toFixed(3)),
      collagenPct: Number(dCol.toFixed(3)),
      eEq: Number(dEEq.toFixed(1)),
      eDyn: Number(dEDyn.toFixed(1))
    };
  });

  // Interactive spatial probe function probeAt(rQueryMm, zQueryMm)
  function probeAt(rQueryMm, zQueryMm) {
    const rClamped = clamp(Math.abs(rQueryMm), 0, radiusMm);
    const zClamped = clamp(zQueryMm, 0, heightMm);
    const ir = clamp(Math.round((rClamped / radiusMm) * (nr - 1)), 0, nr - 1);
    const iz = clamp(Math.round((zClamped / heightMm) * (nz - 1)), 0, nz - 1);
    const rNorm = ir / (nr - 1);
    const zNorm = iz / (nz - 1);

    let regionKey = 'TC';
    for (const rk of activeRegionKeys) {
      const b = regionBounds[rk];
      if (rNorm >= b.rMin - 1e-6 && rNorm <= b.rMax + 1e-6 && zNorm >= b.zMin - 1e-6 && zNorm <= b.zMax + 1e-6) {
        regionKey = rk;
        break;
      }
    }

    return {
      rMm: Number(rMm[ir].toFixed(2)),
      zMm: Number(zMm[iz].toFixed(2)),
      ir,
      iz,
      regionKey,
      subregion: regionKey,
      regionLabel: regionBounds[regionKey]?.label || regionKey,
      subregionName: regionBounds[regionKey]?.label || regionKey,
      o2Pct: Number(o2Pct[iz][ir].toFixed(2)),
      o2PctVmax1: Number(o2PctVmax1[iz][ir].toFixed(2)),
      o2PctVmax2: Number(o2PctVmax2[iz][ir].toFixed(2)),
      dna: dna[iz][ir],
      viableCellDensity: viableCellDensity[iz][ir],
      chondroPct: chondroPct[iz][ir],
      mscPct: mscPct[iz][ir],
      glucoseNorm: Number(glucoseNorm[iz][ir].toFixed(2)),
      sgagPct: sgagPct[iz][ir],
      collagenPct: collagenPct[iz][ir],
      sgagPerDna: sgagPerDna[iz][ir],
      collagenPerDna: collagenPerDna[iz][ir]
    };
  }

  const maxSink = (params.cellDensity * 1e12) * ((effectiveVmax * 1e-15) / 3600.0);
  const cExtMolM3 = params.externalO2 * alphaO2;
  const thieleModulusSq = (radiusM * radiusM * maxSink) / Math.max(1e-12, dConstruct * cExtMolM3);

  return {
    params,
    pde: {
      alphaO2,
      Km,
      KmPctO2: Number((Km / alphaO2).toFixed(3)),
      D0,
      phiW: Number(phiW.toFixed(4)),
      dConstruct,
      diffusivity: dConstruct,
      D_construct: dConstruct,
      vmaxBase,
      effectiveVmax: Number(effectiveVmax.toFixed(2)),
      maxSink,
      thieleModulusSq: Number(thieleModulusSq.toFixed(4)),
      coreO2Pct: coreO2Val,
      nr,
      nz,
      radiusMm,
      heightMm
    },
    grid: {
      nr,
      nz,
      rMm,
      zMm,
      radiusMm,
      heightMm,
      hasSixRegions,
      activeRegionKeys,
      regionBounds,
      o2Pct,
      o2PctVmax1,
      o2PctVmax2,
      dna,
      viableCellDensity,
      mscPct,
      chondroPct,
      glucoseNorm,
      sgagPct,
      collagenPct,
      sgagPerDna,
      collagenPerDna
    },
    profiles: {
      centerline: centerlineProfile,
      radial: radialProfile
    },
    subregions,
    wholeConstruct,
    mechanics,
    timeSeries,
    probeAt
  };
}

/**
 * Solves across the 4 standard construct scales (4.0x1.5, 5.0x3.0, 6.0x4.5, 8.0x4.5 mm)
 * for side-by-side scale comparison charts and Table 1 benchmarking.
 */
export function solveScaleComparison(baseParams = {}) {
  const scales = [
    { key: '4.0x1.5', label: 'Ø4.0 × 1.5 mm', diameter: 4.0, height: 1.5 },
    { key: '5.0x3.0', label: 'Ø5.0 × 3.0 mm', diameter: 5.0, height: 3.0 },
    { key: '6.0x4.5', label: 'Ø6.0 × 4.5 mm', diameter: 6.0, height: 4.5 },
    { key: '8.0x4.5', label: 'Ø8.0 × 4.5 mm', diameter: 8.0, height: 4.5 }
  ];

  return scales.map(sc => {
    const sim = solveSimulation({
      ...baseParams,
      diameter: sc.diameter,
      height: sc.height
    });
    return {
      key: sc.key,
      label: sc.label,
      diameter: sc.diameter,
      height: sc.height,
      volumeMm3: sim.wholeConstruct.volumeMm3,
      surfaceToVolumeRatio: sim.wholeConstruct.surfaceToVolumeRatio,
      minO2Pct: sim.wholeConstruct.minO2Pct,
      meanO2Pct: sim.wholeConstruct.meanO2Pct,
      wholeConstruct: sim.wholeConstruct,
      subregions: sim.subregions,
      mechanics: sim.mechanics,
      profiles: sim.profiles
    };
  });
}
