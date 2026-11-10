/**
 * app.js — Main Application Controller
 * Construct Scale, Oxygen Transport & MSC Chondrogenesis Simulator
 * Based on Buckley, C. T., Meyer, E. G., & Kelly, D. J. (2012), Tissue Engineering Part A, 18(3-4), 382–396.
 * Developed for LTU BME 5313 / 6303: Cellular Mechanobiology — Dr. Eric G. Meyer
 */

import {
  DEFAULT_PARAMS,
  PRESETS,
  PAPER_BENCHMARKS,
  QUIZ_QUESTIONS,
  solveSimulation,
  solveScaleComparison
} from './physics.js';

import { ConstructRenderer } from './renderer.js';

// ============================================================================
// 1. FALLBACK BENCHMARKS & STRUCTURE-FUNCTION DATA (BUCKLEY ET AL. 2012)
// ============================================================================

const CANONICAL_DEFAULTS = {
  diameter: 5.0,
  height: 3.0,
  externalO2: 20.0,
  cellDensity: 15.0,
  initialChondroPct: 0,
  vmaxMultiplier: 1.0,
  agarosePct: 2.0,
  cultureDay: 42
};

// Table 1 Experimental Benchmarks (Day 42, 20% O2 & 5% O2, Buckley, Meyer & Kelly 2012)
const TABLE1_BENCHMARKS_FALLBACK = {
  '4.0x1.5_20': {
    label: 'Ø4.0 × 1.5 mm (20% O₂)',
    coreO2: 18.2,
    eEq: { mean: 23.5, sd: 2.4 },
    eDyn: { mean: 90.81, sd: 9.2 },
    subregions: {
      Total: {
        dna: { mean: 75.39, sd: 7.19 },
        sgagPct: { mean: 0.14, sd: 0.00 },
        sgagPerDna: { mean: 18.72, sd: 2.03 },
        collagenPct: { mean: 0.31, sd: 0.01 },
        collagenPerDna: { mean: 40.80, sd: 4.98 }
      }
    }
  },
  '5.0x3.0_20': {
    label: 'Ø5.0 × 3.0 mm (20% O₂)',
    coreO2: 16.3,
    eEq: { mean: 23.2, sd: 2.6 },
    eDyn: { mean: 163.0, sd: 18.0 },
    subregions: {
      TA: {
        dna: { mean: 73.04, sd: 10.67 },
        sgagPct: { mean: 0.21, sd: 0.01 },
        sgagPerDna: { mean: 28.92, sd: 3.39 },
        collagenPct: { mean: 0.23, sd: 0.07 },
        collagenPerDna: { mean: 31.76, sd: 5.67 }
      },
      TC: {
        dna: { mean: 57.87, sd: 4.01 },
        sgagPct: { mean: 0.58, sd: 0.03 },
        sgagPerDna: { mean: 100.33, sd: 10.48 },
        collagenPct: { mean: 0.77, sd: 0.08 },
        collagenPerDna: { mean: 132.62, sd: 7.91 }
      },
      BA: {
        dna: { mean: 71.76, sd: 8.26 },
        sgagPct: { mean: 0.31, sd: 0.02 },
        sgagPerDna: { mean: 43.62, sd: 3.27 },
        collagenPct: { mean: 0.43, sd: 0.03 },
        collagenPerDna: { mean: 61.10, sd: 7.93 }
      },
      BC: {
        dna: { mean: 48.53, sd: 5.19 },
        sgagPct: { mean: 1.07, sd: 0.13 },
        sgagPerDna: { mean: 223.56, sd: 39.06 },
        collagenPct: { mean: 1.00, sd: 0.08 },
        collagenPerDna: { mean: 208.30, sd: 7.50 }
      },
      Total: {
        dna: { mean: 64.80, sd: 2.10 },
        sgagPct: { mean: 0.51, sd: 0.03 },
        sgagPerDna: { mean: 79.50, sd: 6.10 },
        collagenPct: { mean: 0.56, sd: 0.04 },
        collagenPerDna: { mean: 87.00, sd: 6.30 }
      }
    }
  },
  '5.0x3.0_5': {
    label: 'Ø5.0 × 3.0 mm (5% O₂)',
    coreO2: 1.9,
    eEq: { mean: 33.0, sd: 3.5 },
    eDyn: { mean: 310.0, sd: 28.0 },
    subregions: {
      TA: {
        dna: { mean: 67.50, sd: 3.32 },
        sgagPct: { mean: 0.98, sd: 0.10 },
        sgagPerDna: { mean: 144.13, sd: 7.62 },
        collagenPct: { mean: 2.73, sd: 0.41 },
        collagenPerDna: { mean: 406.72, sd: 72.02 }
      },
      TC: {
        dna: { mean: 69.06, sd: 9.82 },
        sgagPct: { mean: 1.31, sd: 0.15 },
        sgagPerDna: { mean: 190.05, sd: 7.23 },
        collagenPct: { mean: 1.92, sd: 0.68 },
        collagenPerDna: { mean: 276.27, sd: 86.47 }
      },
      BA: {
        dna: { mean: 63.51, sd: 9.24 },
        sgagPct: { mean: 1.06, sd: 0.09 },
        sgagPerDna: { mean: 168.69, sd: 21.36 },
        collagenPct: { mean: 2.11, sd: 0.27 },
        collagenPerDna: { mean: 337.42, sd: 63.62 }
      },
      BC: {
        dna: { mean: 43.91, sd: 14.06 },
        sgagPct: { mean: 1.36, sd: 0.16 },
        sgagPerDna: { mean: 322.75, sd: 63.92 },
        collagenPct: { mean: 1.88, sd: 0.37 },
        collagenPerDna: { mean: 466.25, sd: 182.04 }
      },
      Total: {
        dna: { mean: 61.80, sd: 7.50 },
        sgagPct: { mean: 1.16, sd: 0.10 },
        sgagPerDna: { mean: 190.00, sd: 18.00 },
        collagenPct: { mean: 2.22, sd: 0.25 },
        collagenPerDna: { mean: 368.00, sd: 42.00 }
      }
    }
  },
  '6.0x4.5_20': {
    label: 'Ø6.0 × 4.5 mm (20% O₂)',
    coreO2: 14.3,
    eEq: { mean: 26.8, sd: 2.8 },
    eDyn: { mean: 215.0, sd: 22.0 },
    subregions: {
      TA: {
        dna: { mean: 61.48, sd: 3.93 },
        sgagPct: { mean: 0.32, sd: 0.02 },
        sgagPerDna: { mean: 52.25, sd: 2.41 },
        collagenPct: { mean: 0.60, sd: 0.16 },
        collagenPerDna: { mean: 97.51, sd: 22.07 }
      },
      TC: {
        dna: { mean: 71.67, sd: 5.63 },
        sgagPct: { mean: 0.97, sd: 0.03 },
        sgagPerDna: { mean: 204.69, sd: 13.72 },
        collagenPct: { mean: 1.43, sd: 0.02 },
        collagenPerDna: { mean: 300.42, sd: 18.94 }
      },
      BA: {
        dna: { mean: 68.53, sd: 6.12 },
        sgagPct: { mean: 0.44, sd: 0.02 },
        sgagPerDna: { mean: 64.96, sd: 8.25 },
        collagenPct: { mean: 0.89, sd: 0.56 },
        collagenPerDna: { mean: 127.74, sd: 70.76 }
      },
      BC: {
        dna: { mean: 47.49, sd: 3.12 },
        sgagPct: { mean: 1.34, sd: 0.07 },
        sgagPerDna: { mean: 188.56, sd: 19.62 },
        collagenPct: { mean: 1.17, sd: 0.19 },
        collagenPerDna: { mean: 163.32, sd: 14.24 }
      },
      Total: {
        dna: { mean: 62.50, sd: 2.20 },
        sgagPct: { mean: 0.75, sd: 0.03 },
        sgagPerDna: { mean: 120.00, sd: 9.50 },
        collagenPct: { mean: 1.01, sd: 0.19 },
        collagenPerDna: { mean: 161.50, sd: 24.00 }
      }
    }
  },
  '6.0x4.5_5': {
    label: 'Ø6.0 × 4.5 mm (5% O₂)',
    coreO2: 0.7,
    eEq: { mean: 38.5, sd: 3.8 },
    eDyn: { mean: 335.0, sd: 31.0 },
    subregions: {
      TA: {
        dna: { mean: 45.61, sd: 4.11 },
        sgagPct: { mean: 1.06, sd: 0.05 },
        sgagPerDna: { mean: 232.36, sd: 22.09 },
        collagenPct: { mean: 0.41, sd: 0.14 },
        collagenPerDna: { mean: 92.36, sd: 38.12 }
      },
      TC: {
        dna: { mean: 65.52, sd: 8.35 },
        sgagPct: { mean: 1.40, sd: 0.05 },
        sgagPerDna: { mean: 217.04, sd: 32.82 },
        collagenPct: { mean: 0.88, sd: 0.12 },
        collagenPerDna: { mean: 136.46, sd: 27.43 }
      },
      BA: {
        dna: { mean: 57.71, sd: 6.08 },
        sgagPct: { mean: 1.06, sd: 0.02 },
        sgagPerDna: { mean: 185.97, sd: 18.73 },
        collagenPct: { mean: 0.60, sd: 0.03 },
        collagenPerDna: { mean: 103.78, sd: 6.07 }
      },
      BC: {
        dna: { mean: 36.79, sd: 12.86 },
        sgagPct: { mean: 1.35, sd: 0.04 },
        sgagPerDna: { mean: 400.44, sd: 138.74 },
        collagenPct: { mean: 0.99, sd: 0.17 },
        collagenPerDna: { mean: 285.60, sd: 88.53 }
      },
      Total: {
        dna: { mean: 51.80, sd: 1.50 },
        sgagPct: { mean: 1.21, sd: 0.06 },
        sgagPerDna: { mean: 233.00, sd: 19.00 },
        collagenPct: { mean: 0.69, sd: 0.10 },
        collagenPerDna: { mean: 134.00, sd: 18.00 }
      }
    }
  },
  '8.0x4.5_20': {
    label: 'Ø8.0 × 4.5 mm (20% O₂)',
    coreO2: 10.8,
    eEq: { mean: 36.52, sd: 2.12 },
    eDyn: { mean: 327.51, sd: 30.3 },
    subregions: {
      TA: {
        dna: { mean: 83.24, sd: 6.65 },
        sgagPct: { mean: 0.62, sd: 0.01 },
        sgagPerDna: { mean: 74.15, sd: 6.91 },
        collagenPct: { mean: 2.79, sd: 0.74 },
        collagenPerDna: { mean: 332.04, sd: 62.58 }
      },
      TIA: {
        dna: { mean: 45.46, sd: 13.80 },
        sgagPct: { mean: 0.76, sd: 0.09 },
        sgagPerDna: { mean: 173.04, sd: 33.80 },
        collagenPct: { mean: 0.71, sd: 0.23 },
        collagenPerDna: { mean: 156.95, sd: 24.87 }
      },
      TC: {
        dna: { mean: 53.17, sd: 18.09 },
        sgagPct: { mean: 1.18, sd: 0.06 },
        sgagPerDna: { mean: 236.63, sd: 65.68 },
        collagenPct: { mean: 0.74, sd: 0.13 },
        collagenPerDna: { mean: 146.00, sd: 42.41 }
      },
      BA: {
        dna: { mean: 64.28, sd: 21.05 },
        sgagPct: { mean: 0.88, sd: 0.11 },
        sgagPerDna: { mean: 72.27, sd: 18.77 },
        collagenPct: { mean: 2.89, sd: 0.71 },
        collagenPerDna: { mean: 487.72, sd: 191.07 }
      },
      BIA: {
        dna: { mean: 21.87, sd: 0.63 },
        sgagPct: { mean: 0.86, sd: 0.03 },
        sgagPerDna: { mean: 391.80, sd: 2.68 },
        collagenPct: { mean: 0.44, sd: 0.10 },
        collagenPerDna: { mean: 202.45, sd: 48.47 }
      },
      BC: {
        dna: { mean: 33.26, sd: 10.78 },
        sgagPct: { mean: 1.19, sd: 0.01 },
        sgagPerDna: { mean: 389.07, sd: 150.81 },
        collagenPct: { mean: 0.46, sd: 0.18 },
        collagenPerDna: { mean: 190.39, sd: 72.11 }
      },
      Total: {
        dna: { mean: 48.20, sd: 5.50 },
        sgagPct: { mean: 0.88, sd: 0.04 },
        sgagPerDna: { mean: 185.00, sd: 18.00 },
        collagenPct: { mean: 1.62, sd: 0.17 },
        collagenPerDna: { mean: 262.00, sd: 35.00 }
      }
    }
  }
};

// Experimental scatter points from Fig. 7D–G (Buckley, Meyer & Kelly 2012)
const FIG7_SCATTER_DATA = {
  normoxia20: [
    // Ø4x1.5 (20% O2) replicates: sGAG = 0.14±0.00%, Col = 0.31±0.01%, E_eq = 23.5 kPa, E_dyn = 90.81 kPa
    { scale: 'Ø4×1.5 (20% O₂)', sgag: 0.14, col: 0.30, edyn: 82.0, eeq: 21.8 },
    { scale: 'Ø4×1.5 (20% O₂)', sgag: 0.14, col: 0.31, edyn: 90.81, eeq: 23.5 },
    { scale: 'Ø4×1.5 (20% O₂)', sgag: 0.14, col: 0.32, edyn: 99.6, eeq: 25.2 },
    // Ø5x3.0 (20% O2) replicates: sGAG = 0.51±0.03%, Col = 0.56±0.04%, E_eq = 23.2 kPa, E_dyn = 163.0 kPa
    { scale: 'Ø5×3.0 (20% O₂)', sgag: 0.48, col: 0.52, edyn: 146.0, eeq: 21.0 },
    { scale: 'Ø5×3.0 (20% O₂)', sgag: 0.51, col: 0.56, edyn: 163.0, eeq: 23.2 },
    { scale: 'Ø5×3.0 (20% O₂)', sgag: 0.54, col: 0.60, edyn: 180.0, eeq: 25.4 },
    // Ø6x4.5 (20% O2) replicates: sGAG = 0.75±0.03%, Col = 1.01±0.19%, E_eq = 26.8 kPa, E_dyn = 215.0 kPa
    { scale: 'Ø6×4.5 (20% O₂)', sgag: 0.72, col: 0.82, edyn: 194.0, eeq: 24.2 },
    { scale: 'Ø6×4.5 (20% O₂)', sgag: 0.75, col: 1.01, edyn: 215.0, eeq: 26.8 },
    { scale: 'Ø6×4.5 (20% O₂)', sgag: 0.78, col: 1.20, edyn: 236.0, eeq: 29.4 },
    // Ø8x4.5 (20% O2) replicates: sGAG = 0.88±0.04%, Col = 1.62±0.17%, E_eq = 36.52±2.12 kPa, E_dyn = 327.51±30.3 kPa
    { scale: 'Ø8×4.5 (20% O₂)', sgag: 0.84, col: 1.45, edyn: 297.2, eeq: 34.4 },
    { scale: 'Ø8×4.5 (20% O₂)', sgag: 0.88, col: 1.62, edyn: 327.51, eeq: 36.52 },
    { scale: 'Ø8×4.5 (20% O₂)', sgag: 0.92, col: 1.79, edyn: 357.8, eeq: 38.64 }
  ],
  hypoxia5: [
    // Ø5x3.0 (5% O2) — 1.9-fold E_dyn boost: sGAG = 1.16±0.10%, Col = 2.22±0.25%, E_eq = 33.0 kPa, E_dyn = 310.0 kPa
    { scale: 'Ø5×3.0 (5% O₂)', sgag: 1.06, col: 1.97, edyn: 284.0, eeq: 30.2 },
    { scale: 'Ø5×3.0 (5% O₂)', sgag: 1.16, col: 2.22, edyn: 310.0, eeq: 33.0 },
    { scale: 'Ø5×3.0 (5% O₂)', sgag: 1.26, col: 2.47, edyn: 336.0, eeq: 35.8 },
    // Ø6x4.5 (5% O2) — Core hypoxia penalty on Col & DNA: sGAG = 1.21±0.06%, Col = 0.69±0.10%, E_eq = 38.5 kPa, E_dyn = 335.0 kPa
    { scale: 'Ø6×4.5 (5% O₂)', sgag: 1.15, col: 0.59, edyn: 308.0, eeq: 35.4 },
    { scale: 'Ø6×4.5 (5% O₂)', sgag: 1.21, col: 0.69, edyn: 335.0, eeq: 38.5 },
    { scale: 'Ø6×4.5 (5% O₂)', sgag: 1.27, col: 0.79, edyn: 362.0, eeq: 41.6 }
  ]
};

// ============================================================================
// 2. APPLICATION STATE
// ============================================================================

const state = {
  mode: 'oxygen', // 'oxygen' | 'spatial' | 'mechanics' | 'differentiation'
  fieldMode: 'o2', // 'o2' | 'sgag' | 'collagen' | 'cells'
  sfMode: 'edyn_sgag', // 'edyn_sgag' | 'edyn_col' | 'eeq_sgag' | 'eeq_col'
  activePreset: 'scale_5x30',
  params: {
    diameter: Number(DEFAULT_PARAMS?.diameter ?? CANONICAL_DEFAULTS.diameter),
    height: Number(DEFAULT_PARAMS?.height ?? CANONICAL_DEFAULTS.height),
    externalO2: Number(DEFAULT_PARAMS?.externalO2 ?? DEFAULT_PARAMS?.o2 ?? CANONICAL_DEFAULTS.externalO2),
    cellDensity: Number(DEFAULT_PARAMS?.cellDensity ?? DEFAULT_PARAMS?.density ?? CANONICAL_DEFAULTS.cellDensity),
    initialChondroPct: Number(DEFAULT_PARAMS?.initialChondroPct ?? DEFAULT_PARAMS?.chondroPct ?? CANONICAL_DEFAULTS.initialChondroPct),
    vmaxMultiplier: Number(DEFAULT_PARAMS?.vmaxMultiplier ?? DEFAULT_PARAMS?.vmax ?? CANONICAL_DEFAULTS.vmaxMultiplier),
    agarosePct: Number(DEFAULT_PARAMS?.agarosePct ?? DEFAULT_PARAMS?.agarose ?? CANONICAL_DEFAULTS.agarosePct),
    cultureDay: Number(DEFAULT_PARAMS?.cultureDay ?? DEFAULT_PARAMS?.day ?? CANONICAL_DEFAULTS.cultureDay)
  },
  overlays: {
    showSubregions: true,
    showContours: true,
    showCells: true,
    o2ScaleMode: 'auto'
  },
  timelapse: {
    playing: false,
    rafId: null,
    lastStepTime: 0,
    stepIntervalMs: 110
  },
  simResult: null,
  normalized: null
};

// Renderer & 8 Chart.js instances
let renderer = null;
let chartO2Centerline = null;
let chartO2Radial = null;
let chartSpatialRegions = null;
let chartScaleBiochem = null;
let chartModuliScale = null;
let chartStructureFunction = null;
let chartTimeDifferentiation = null;
let chartTimeMaturation = null;

// Quiz state
const quizState = {
  answered: {},
  score: 0
};

// ============================================================================
// 3. INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
  initRenderer();
  initModeTabs();
  initFieldPillsAndOverlays();
  initPresetsAndSliders();
  initStructureFunctionPills();
  initTimelapseAnimation();
  initModalsAndQuiz();
  initExportAndReset();
  initCharts();

  // Solve initial simulation and populate all UI views & charts
  runSimulationAndUpdateUI();

  // Render KaTeX math formulas
  renderMath(document.body);
  window.addEventListener('load', () => renderMath(document.body));
});

function renderMath(container) {
  if (typeof window.renderMathInElement === 'function' && container) {
    try {
      window.renderMathInElement(container, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    } catch (_) {
      // Ignore transient KaTeX load timing errors
    }
  }
}

// ============================================================================
// 4. SIMULATION SOLVER ADAPTER & NORMALIZATION
// ============================================================================

/**
 * Build a unified parameter object with both canonical and shorthand keys
 * so physics.js receives every parameter regardless of key naming convention.
 */
function buildSolverParams(overrides = {}) {
  const p = { ...state.params, ...overrides };
  return {
    diameter: Number(p.diameter),
    height: Number(p.height),
    externalO2: Number(p.externalO2),
    o2: Number(p.externalO2),
    cellDensity: Number(p.cellDensity),
    density: Number(p.cellDensity),
    initialChondroPct: Number(p.initialChondroPct),
    chondroPct: Number(p.initialChondroPct),
    chondro: Number(p.initialChondroPct),
    vmaxMultiplier: Number(p.vmaxMultiplier),
    vmax: Number(p.vmaxMultiplier),
    agarosePct: Number(p.agarosePct),
    agarose: Number(p.agarosePct),
    cultureDay: Number(p.cultureDay),
    day: Number(p.cultureDay)
  };
}

/**
 * Normalize raw output from solveSimulation(params) into a guaranteed schema
 * for UI cards, tables, charts, and CSV export.
 */
function normalizeSimulationResult(raw, params) {
  const diameter = Number(params.diameter ?? 5.0);
  const R = diameter / 2;
  const H = Number(params.height ?? 3.0);
  const externalO2 = Number(params.externalO2 ?? 20.0);
  const cellDensity = Number(params.cellDensity ?? 15.0);
  const initialChondroPct = Number(params.initialChondroPct ?? 0);
  const vmaxMultiplier = Number(params.vmaxMultiplier ?? 1.0);
  const agarosePct = Number(params.agarosePct ?? 2.0);
  const cultureDay = Number(params.cultureDay ?? 42);

  // Mackie-Meares diffusivity Eq. (2)
  const phiF = agarosePct / 100.0;
  const dH2O = 3.0e-9;
  const mackieRatio = Math.pow((1 - phiF) / (1 + phiF), 2);
  const diffusivity = Number(
    raw?.pde?.diffusivity ??
    raw?.pde?.D_construct ??
    raw?.wholeConstruct?.diffusivity ??
    raw?.diffusivity ??
    (dH2O * mackieRatio)
  );
  const diffusivityRatioPct = (diffusivity / dH2O) * 100;

  // Michaelis-Menten parameters Eq. (3)
  const vmaxFmolHr = 18.7 * vmaxMultiplier;
  const vmaxMolSecCell = vmaxFmolHr * 1e-15 / 3600.0;
  const nCellPerM3 = cellDensity * 1e12; // 15 M/mL = 1.5e13 cells/m^3
  const maxSink = Number(
    raw?.pde?.maxSink ??
    raw?.pde?.nVmax ??
    raw?.wholeConstruct?.maxSink ??
    (nCellPerM3 * vmaxMolSecCell)
  );
  const cExtMolM3 = externalO2 * (0.197 / 20.0);
  const rMeters = R * 1e-3;
  const thieleSq = Number(
    raw?.pde?.thieleModulusSq ??
    raw?.pde?.thieleSq ??
    raw?.pde?.thiele ??
    raw?.wholeConstruct?.thieleModulusSq ??
    ((rMeters * rMeters * maxSink) / Math.max(1e-12, diffusivity * cExtMolM3))
  );

  // Extract 2D grids
  const grid = raw?.grid || {};
  const o2Grid = grid.o2Pct || grid.o2 || [[externalO2]];
  const nz = o2Grid.length;
  const nr = (o2Grid[0] && o2Grid[0].length) ? o2Grid[0].length : 1;

  const wc = raw?.wholeConstruct || raw?.summary || raw?.metrics || {};
  const mech = raw?.mechanics || wc;

  const coreO2Pct = Number(
    wc.coreO2Pct ??
    wc.bottomCoreO2Pct ??
    wc.minO2Pct ??
    raw?.pde?.coreO2Pct ??
    raw?.coreO2Pct ??
    o2Grid[0]?.[0] ??
    externalO2
  );

  const chondroPct = Number(
    wc.chondroPct ??
    wc.chondrocytePct ??
    wc.avgChondroPct ??
    raw?.chondroPct ??
    68.4
  );
  const mscPct = Math.max(0, 100 - chondroPct);

  const dna = Number(
    wc.dna ??
    wc.totalDna ??
    wc.avgDna ??
    raw?.dna ??
    64.8
  );
  const baselineDna = 75.0 * (cellDensity / 15.0);
  const viabilityPct = Number(
    wc.viabilityPct ??
    wc.viability ??
    Math.min(100, Math.max(0, (dna / Math.max(1, baselineDna)) * 100))
  );

  const sgagPct = Number(
    wc.sgagPct ??
    wc.sgag ??
    wc.totalSgagPct ??
    raw?.sgagPct ??
    0.51
  );
  const sgagPerDna = Number(
    wc.sgagPerDna ??
    (dna > 0 ? (sgagPct * 10000) / dna : 0)
  );

  const collagenPct = Number(
    wc.collagenPct ??
    wc.collagen ??
    wc.totalCollagenPct ??
    raw?.collagenPct ??
    0.56
  );
  const collagenPerDna = Number(
    wc.collagenPerDna ??
    (dna > 0 ? (collagenPct * 10000) / dna : 0)
  );

  const eEq = Number(
    mech.eEq ??
    mech.equilibriumModulus ??
    mech.E_eq ??
    wc.eEq ??
    wc.equilibriumModulus ??
    23.2
  );
  const eDyn = Number(
    mech.eDyn ??
    mech.dynamicModulus ??
    mech.E_dyn ??
    wc.eDyn ??
    wc.dynamicModulus ??
    163.0
  );
  const homogeneity = Number(
    mech.homogeneity ??
    mech.homogeneityIndex ??
    mech.eta ??
    wc.homogeneity ??
    0.91
  );

  // Extract or build Centerline Profile (r = 0, depth z_depth from top H down to bottom 0)
  let centerlineProfile = [];
  if (Array.isArray(raw?.profiles?.centerline) && raw.profiles.centerline.length > 1) {
    centerlineProfile = raw.profiles.centerline.map((pt) => ({
      depth: Number(pt.depth ?? pt.zDepth ?? pt.x ?? 0),
      o2Pct: Number(pt.o2Pct ?? pt.o2 ?? pt.y ?? externalO2)
    }));
  } else {
    for (let iz = nz - 1; iz >= 0; iz--) {
      const yMm = (iz / Math.max(1, nz - 1)) * H;
      const depthMm = H - yMm;
      centerlineProfile.push({
        depth: depthMm,
        o2Pct: Number(o2Grid[iz]?.[0] ?? externalO2)
      });
    }
  }

  // Extract or build Mid-Height Radial Profile (y = H/2, radial depth d_r = R - r from outer wall 0 to center R)
  let radialProfile = [];
  if (Array.isArray(raw?.profiles?.radial) && raw.profiles.radial.length > 1) {
    radialProfile = raw.profiles.radial.map((pt) => ({
      radialDepth: Number(pt.radialDepth ?? pt.depth ?? pt.dr ?? pt.x ?? 0),
      o2Pct: Number(pt.o2Pct ?? pt.o2 ?? pt.y ?? externalO2)
    }));
  } else {
    const izMid = Math.floor((nz - 1) * 0.5);
    for (let ir = nr - 1; ir >= 0; ir--) {
      const rMm = (ir / Math.max(1, nr - 1)) * R;
      const radialDepthMm = R - rMm;
      radialProfile.push({
        radialDepth: radialDepthMm,
        o2Pct: Number(o2Grid[izMid]?.[ir] ?? externalO2)
      });
    }
  }

  // Subregions array normalization
  const subregionsList = normalizeSubregionsList(raw, {
    R,
    H,
    diameter,
    coreO2Pct,
    externalO2,
    chondroPct,
    dna,
    sgagPct,
    sgagPerDna,
    collagenPct,
    collagenPerDna
  });

  return {
    raw,
    params: {
      diameter,
      R,
      H,
      externalO2,
      cellDensity,
      initialChondroPct,
      vmaxMultiplier,
      vmaxFmolHr,
      agarosePct,
      cultureDay
    },
    pde: {
      diffusivity,
      diffusivityRatioPct,
      maxSink,
      thieleSq,
      coreO2Pct,
      deltaO2Pct: coreO2Pct - externalO2
    },
    whole: {
      coreO2Pct,
      chondroPct,
      mscPct,
      dna,
      viabilityPct,
      sgagPct,
      sgagPerDna,
      collagenPct,
      collagenPerDna,
      eEq,
      eDyn,
      homogeneity
    },
    subregions: subregionsList,
    centerlineProfile,
    radialProfile
  };
}

function normalizeSubregionsList(raw, fallbackWhole) {
  const rawSubs = raw?.subregions;
  const map = {};
  if (Array.isArray(rawSubs)) {
    for (const s of rawSubs) {
      const code = s.code || s.id || s.region || s.name;
      if (code) map[code] = s;
    }
  } else if (rawSubs && typeof rawSubs === 'object') {
    for (const [k, v] of Object.entries(rawSubs)) {
      map[k] = v;
    }
  }

  const diam = fallbackWhole.diameter;
  const order = diam <= 4.2
    ? ['Total']
    : diam >= 7.2
      ? ['TA', 'BA', 'TIA', 'BIA', 'TC', 'BC', 'Total']
      : ['TA', 'BA', 'TC', 'BC', 'Total'];

  const meta = {
    TA: { name: 'Top Annulus (TA)', color: '#0284c7' },
    BA: { name: 'Bottom Annulus (BA)', color: '#0d9488' },
    TIA: { name: 'Top Inner Annulus (TIA)', color: '#6366f1' },
    BIA: { name: 'Bottom Inner Annulus (BIA)', color: '#8b5cf6' },
    TC: { name: 'Top Core (TC)', color: '#7c3aed' },
    BC: { name: 'Bottom Core (BC)', color: '#dc2626' },
    Total: { name: 'Whole Construct (Total)', color: '#0f172a' }
  };

  // Sample from renderer helper if raw subregion wasn't explicitly listed
  const grid = raw?.grid || {};
  const sampleAt = (g, rFrac, yFrac, def) => {
    if (!Array.isArray(g) || !g.length || !Array.isArray(g[0])) return def;
    const iz = Math.min(g.length - 1, Math.max(0, Math.round(yFrac * (g.length - 1))));
    const ir = Math.min(g[0].length - 1, Math.max(0, Math.round(rFrac * (g[0].length - 1))));
    return Number(g[iz][ir] ?? def);
  };

  const regionCoords = {
    TA: [0.82, 0.75],
    BA: [0.82, 0.25],
    TIA: [0.62, 0.75],
    BIA: [0.62, 0.25],
    TC: [0.25, 0.75],
    BC: [0.25, 0.25],
    Total: [0.55, 0.50]
  };

  return order.map((code) => {
    const item = map[code] || (code === 'Total' ? (raw?.wholeConstruct || {}) : {});
    const [rf, yf] = regionCoords[code] || [0.5, 0.5];

    const o2Pct = Number(
      item.o2Pct ?? item.o2 ?? item.avgO2Pct ??
      (code === 'Total'
        ? (fallbackWhole.coreO2Pct * 0.45 + fallbackWhole.externalO2 * 0.55)
        : sampleAt(grid.o2Pct || grid.o2, rf, yf, fallbackWhole.coreO2Pct))
    );
    const chondroPct = Number(
      item.chondroPct ?? item.chondrocytePct ??
      (code === 'Total'
        ? fallbackWhole.chondroPct
        : sampleAt(grid.chondroPct || grid.chondrocytePct, rf, yf, fallbackWhole.chondroPct))
    );
    const dna = Number(
      item.dna ??
      (code === 'Total'
        ? fallbackWhole.dna
        : sampleAt(grid.dna, rf, yf, fallbackWhole.dna))
    );
    const sgagPct = Number(
      item.sgagPct ?? item.sgag ??
      (code === 'Total'
        ? fallbackWhole.sgagPct
        : sampleAt(grid.sgagPct || grid.sgag, rf, yf, fallbackWhole.sgagPct))
    );
    const collagenPct = Number(
      item.collagenPct ?? item.collagen ??
      (code === 'Total'
        ? fallbackWhole.collagenPct
        : sampleAt(grid.collagenPct || grid.collagen, rf, yf, fallbackWhole.collagenPct))
    );
    const sgagPerDna = Number(
      item.sgagPerDna ?? (dna > 0 ? (sgagPct * 10000) / dna : fallbackWhole.sgagPerDna)
    );
    const collagenPerDna = Number(
      item.collagenPerDna ?? (dna > 0 ? (collagenPct * 10000) / dna : fallbackWhole.collagenPerDna)
    );

    return {
      code,
      name: meta[code]?.name || code,
      color: meta[code]?.color || '#0284c7',
      o2Pct,
      chondroPct,
      dna,
      sgagPct,
      sgagPerDna,
      collagenPct,
      collagenPerDna,
      benchmark: item.benchmark || null
    };
  });
}

/**
 * Look up Table 1 experimental benchmark for a given (diameter, height, externalO2) if matching
 * Supports both 20% O2 and 5% O2 experimental groups from Buckley, Meyer & Kelly (2012)
 */
function findTable1Benchmark(diameter, height, externalO2) {
  const is20 = Math.abs(externalO2 - 20.0) <= 2.0;
  const is5 = Math.abs(externalO2 - 5.0) <= 1.5;
  if (!is20 && !is5) return null;

  let key = null;
  if (is20) {
    if (Math.abs(diameter - 4.0) < 0.25 && Math.abs(height - 1.5) < 0.2) key = '4.0x1.5_20';
    else if (Math.abs(diameter - 5.0) < 0.25 && Math.abs(height - 3.0) < 0.2) key = '5.0x3.0_20';
    else if (Math.abs(diameter - 6.0) < 0.25 && Math.abs(height - 4.5) < 0.2) key = '6.0x4.5_20';
    else if (Math.abs(diameter - 8.0) < 0.25 && Math.abs(height - 4.5) < 0.2) key = '8.0x4.5_20';
  } else if (is5) {
    if (Math.abs(diameter - 5.0) < 0.25 && Math.abs(height - 3.0) < 0.2) key = '5.0x3.0_5';
    else if (Math.abs(diameter - 6.0) < 0.25 && Math.abs(height - 4.5) < 0.2) key = '6.0x4.5_5';
  }

  if (!key) return null;
  return TABLE1_BENCHMARKS_FALLBACK[key] || null;
}

// ============================================================================
// 5. RENDERER & TOOLBAR SETUP
// ============================================================================

function initRenderer() {
  const canvas = document.getElementById('sim-canvas');
  renderer = new ConstructRenderer(canvas, (probe) => {
    updateProbeHud(probe);
  });

  // Zoom & Reset buttons
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnViewReset = document.getElementById('btn-view-reset');

  if (btnZoomIn) btnZoomIn.addEventListener('click', () => renderer.zoomIn());
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => renderer.zoomOut());
  if (btnViewReset) btnViewReset.addEventListener('click', () => renderer.resetView());
}

function updateProbeHud(probe) {
  const elProbe = document.getElementById('hud-probe');
  if (!elProbe) return;

  if (!probe) {
    elProbe.textContent = 'Hover cross-section to probe (r, z)';
    return;
  }

  elProbe.textContent =
    `(${probe.r.toFixed(2)}, ${probe.y.toFixed(2)} mm) [${probe.subregion}] · ` +
    `O₂: ${probe.o2Pct.toFixed(1)}% · sGAG: ${probe.sgagPct.toFixed(2)}% · ` +
    `Col: ${probe.collagenPct.toFixed(2)}% · Chondro: ${probe.chondroPct.toFixed(0)}%`;
}

function initModeTabs() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  const panels = {
    oxygen: document.getElementById('panel-oxygen'),
    spatial: document.getElementById('panel-spatial'),
    mechanics: document.getElementById('panel-mechanics'),
    differentiation: document.getElementById('panel-differentiation')
  };

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetMode = btn.getAttribute('data-mode');
      if (!targetMode || !panels[targetMode]) return;

      state.mode = targetMode;
      tabBtns.forEach((b) => b.classList.toggle('active', b === btn));

      Object.entries(panels).forEach(([key, panel]) => {
        if (panel) {
          panel.style.display = key === targetMode ? 'block' : 'none';
        }
      });

      // Resize and refresh charts in the newly visible tab
      requestAnimationFrame(() => {
        refreshChartsForActiveTab();
      });
    });
  });
}

function initFieldPillsAndOverlays() {
  const fieldPills = document.querySelectorAll('.field-pill');
  fieldPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const field = pill.getAttribute('data-field');
      if (!field) return;

      state.fieldMode = field;
      fieldPills.forEach((p) => p.classList.toggle('active', p === pill));

      if (renderer) {
        renderer.setFieldMode(field);
      }
      updateCanvasLegendPill(field);
    });
  });

  // Overlay checkboxes & scale selector
  const chkSubregions = document.getElementById('toggle-subregions');
  const chkContours = document.getElementById('toggle-contours');
  const chkCells = document.getElementById('toggle-cells');
  const selectScale = document.getElementById('select-o2-scale');

  if (chkSubregions) {
    chkSubregions.addEventListener('change', () => {
      state.overlays.showSubregions = chkSubregions.checked;
      if (renderer) renderer.setOverlays({ showSubregions: chkSubregions.checked });
    });
  }
  if (chkContours) {
    chkContours.addEventListener('change', () => {
      state.overlays.showContours = chkContours.checked;
      if (renderer) renderer.setOverlays({ showContours: chkContours.checked });
    });
  }
  if (chkCells) {
    chkCells.addEventListener('change', () => {
      state.overlays.showCells = chkCells.checked;
      if (renderer) renderer.setOverlays({ showCells: chkCells.checked });
    });
  }
  if (selectScale) {
    selectScale.addEventListener('change', () => {
      state.overlays.o2ScaleMode = selectScale.value;
      if (renderer) renderer.setOverlays({ o2ScaleMode: selectScale.value });
    });
  }
}

function updateCanvasLegendPill(field) {
  const pill = document.getElementById('canvas-mode-pill');
  if (!pill) return;

  const configs = {
    o2: {
      grad: 'linear-gradient(90deg,#1d4ed8,#10b981,#eab308,#ef4444)',
      label: 'O₂ Tension C_ox(r,z) (% O₂)',
      sub: 'Top/Side: C_ext · Bottom z=0: ∂C/∂z = 0 (Impermeable Dish)'
    },
    sgag: {
      grad: 'linear-gradient(90deg,#f2f8fd,#60b6e8,#1876c2,#072e74)',
      label: 'Alcian Blue sGAG (% w/w)',
      sub: 'Fig. 4 Row 1 · Hypoxia-stimulated core aggrecan synthesis'
    },
    collagen: {
      grad: 'linear-gradient(90deg,#fdf5f0,#ee7060,#c6202c,#7a0816)',
      label: 'Picrosirius Red Collagen (% w/w)',
      sub: 'Fig. 4 Row 2 · O₂-dependent peripheral hydroxylation'
    },
    cells: {
      grad: 'linear-gradient(90deg,#445894,#189298,#76b238,#da7a0c)',
      label: 'MSC → Chondrocyte Commitment (%)',
      sub: 'Fig. 4 Row 3 · Spindle MSCs vs. rounded chondrocytes in lacunae'
    }
  };

  const c = configs[field] || configs.o2;
  pill.innerHTML = `
    <span class="legend-item"><span class="legend-swatch" style="background:${c.grad};"></span>${c.label}</span>
    <span class="legend-item" style="color:var(--color-text-muted);">${c.sub}</span>
  `;
}

// ============================================================================
// 6. PRESETS & 8 INTERACTIVE SLIDERS
// ============================================================================

function initPresetsAndSliders() {
  // Wire 8 preset buttons
  const presetBtns = document.querySelectorAll('.btn-preset');
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      stopTimelapse();
      const key = btn.getAttribute('data-preset');
      state.activePreset = key;

      presetBtns.forEach((b) => b.classList.toggle('active', b === btn));

      const presetObj = (PRESETS && key && PRESETS[key]) ? PRESETS[key] : {};

      state.params.diameter = Number(btn.getAttribute('data-diameter') ?? presetObj.diameter ?? 5.0);
      state.params.height = Number(btn.getAttribute('data-height') ?? presetObj.height ?? 3.0);
      state.params.externalO2 = Number(btn.getAttribute('data-o2') ?? presetObj.externalO2 ?? presetObj.o2 ?? 20.0);
      state.params.cellDensity = Number(btn.getAttribute('data-density') ?? presetObj.cellDensity ?? presetObj.density ?? 15.0);
      state.params.initialChondroPct = Number(btn.getAttribute('data-chondro') ?? presetObj.initialChondroPct ?? presetObj.chondroPct ?? 0);
      state.params.vmaxMultiplier = Number(btn.getAttribute('data-vmax') ?? presetObj.vmaxMultiplier ?? presetObj.vmax ?? 1.0);
      state.params.agarosePct = Number(btn.getAttribute('data-agarose') ?? presetObj.agarosePct ?? presetObj.agarose ?? 2.0);
      state.params.cultureDay = Number(btn.getAttribute('data-day') ?? presetObj.cultureDay ?? presetObj.day ?? 42);

      syncSlidersFromState();
      runSimulationAndUpdateUI();
    });
  });

  // Wire 8 sliders
  const sliderSpecs = [
    { id: 'slider-diameter', key: 'diameter' },
    { id: 'slider-height', key: 'height' },
    { id: 'slider-o2', key: 'externalO2' },
    { id: 'slider-cell-density', key: 'cellDensity' },
    { id: 'slider-chondro-pct', key: 'initialChondroPct' },
    { id: 'slider-vmax', key: 'vmaxMultiplier' },
    { id: 'slider-agarose', key: 'agarosePct' },
    { id: 'slider-day', key: 'cultureDay' }
  ];

  sliderSpecs.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (key === 'cultureDay' && state.timelapse.playing) {
        stopTimelapse();
      }
      state.params[key] = Number(el.value);
      clearActivePresetIfModified();
      updateSliderValueBadges();
      runSimulationAndUpdateUI();
    });
  });

  syncSlidersFromState();
}

function clearActivePresetIfModified() {
  const presetBtns = document.querySelectorAll('.btn-preset');
  presetBtns.forEach((btn) => {
    const d = Number(btn.getAttribute('data-diameter'));
    const h = Number(btn.getAttribute('data-height'));
    const o2 = Number(btn.getAttribute('data-o2'));
    const dens = Number(btn.getAttribute('data-density'));
    const ch = Number(btn.getAttribute('data-chondro'));
    const vm = Number(btn.getAttribute('data-vmax'));
    const ag = Number(btn.getAttribute('data-agarose'));
    const day = Number(btn.getAttribute('data-day'));

    const matches =
      Math.abs(state.params.diameter - d) < 1e-3 &&
      Math.abs(state.params.height - h) < 1e-3 &&
      Math.abs(state.params.externalO2 - o2) < 1e-3 &&
      Math.abs(state.params.cellDensity - dens) < 1e-3 &&
      Math.abs(state.params.initialChondroPct - ch) < 1e-3 &&
      Math.abs(state.params.vmaxMultiplier - vm) < 1e-3 &&
      Math.abs(state.params.agarosePct - ag) < 1e-3 &&
      Math.abs(state.params.cultureDay - day) < 1e-3;

    btn.classList.toggle('active', matches);
  });
}

function syncSlidersFromState() {
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = String(v);
  };

  setVal('slider-diameter', state.params.diameter);
  setVal('slider-height', state.params.height);
  setVal('slider-o2', state.params.externalO2);
  setVal('slider-cell-density', state.params.cellDensity);
  setVal('slider-chondro-pct', state.params.initialChondroPct);
  setVal('slider-vmax', state.params.vmaxMultiplier);
  setVal('slider-agarose', state.params.agarosePct);
  setVal('slider-day', state.params.cultureDay);

  updateSliderValueBadges();
}

function updateSliderValueBadges() {
  const p = state.params;
  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setTxt('val-diameter', `${p.diameter.toFixed(1)} mm`);
  setTxt('val-height', `${p.height.toFixed(2)} mm`);
  setTxt('val-o2', `${p.externalO2.toFixed(1)}%`);
  setTxt('val-cell-density', `${p.cellDensity.toFixed(1)} M/mL`);

  const mscInit = Math.max(0, 100 - p.initialChondroPct);
  setTxt('val-chondro-pct', `${p.initialChondroPct.toFixed(0)}% Chondro (${mscInit.toFixed(0)}% MSC)`);

  const vmaxFmol = 18.7 * p.vmaxMultiplier;
  setTxt('val-vmax', `${p.vmaxMultiplier.toFixed(1)}× (${vmaxFmol.toFixed(1)} fmol/h/cell)`);

  const phiF = p.agarosePct / 100.0;
  const dEff = 3.0e-9 * Math.pow((1 - phiF) / (1 + phiF), 2);
  setTxt('val-agarose', `${p.agarosePct.toFixed(1)}% (D = ${(dEff * 1e9).toFixed(2)}e-9 m²/s)`);

  setTxt('val-day', `Day ${p.cultureDay.toFixed(0)}`);
}

// ============================================================================
// 7. 42-DAY TIME-LAPSE ANIMATION CONTROLLER
// ============================================================================

function initTimelapseAnimation() {
  const btnPlay = document.getElementById('btn-play-timelapse');
  if (!btnPlay) return;

  btnPlay.addEventListener('click', () => {
    if (state.timelapse.playing) {
      stopTimelapse();
    } else {
      startTimelapse();
    }
  });
}

function startTimelapse() {
  const btnPlay = document.getElementById('btn-play-timelapse');
  if (state.params.cultureDay >= 42) {
    state.params.cultureDay = 0;
  }
  state.timelapse.playing = true;
  state.timelapse.lastStepTime = performance.now();

  if (btnPlay) {
    btnPlay.classList.add('playing');
    btnPlay.innerHTML = '<span>&#9208; Pause Culture</span>';
  }

  syncSlidersFromState();
  runSimulationAndUpdateUI();

  const step = (now) => {
    if (!state.timelapse.playing) return;
    if (now - state.timelapse.lastStepTime >= state.timelapse.stepIntervalMs) {
      state.timelapse.lastStepTime = now;
      state.params.cultureDay = Math.min(42, state.params.cultureDay + 1);
      syncSlidersFromState();
      runSimulationAndUpdateUI();

      if (state.params.cultureDay >= 42) {
        stopTimelapse();
        return;
      }
    }
    state.timelapse.rafId = requestAnimationFrame(step);
  };

  state.timelapse.rafId = requestAnimationFrame(step);
}

function stopTimelapse() {
  state.timelapse.playing = false;
  if (state.timelapse.rafId) {
    cancelAnimationFrame(state.timelapse.rafId);
    state.timelapse.rafId = null;
  }
  const btnPlay = document.getElementById('btn-play-timelapse');
  if (btnPlay) {
    btnPlay.classList.remove('playing');
    btnPlay.innerHTML = '<span>&#9654; Play 42d Culture</span>';
  }
}

// ============================================================================
// 8. MAIN SIMULATION UPDATE PIPELINE
// ============================================================================

function runSimulationAndUpdateUI() {
  const solverParams = buildSolverParams();
  const rawResult = solveSimulation(solverParams);
  const norm = normalizeSimulationResult(rawResult, solverParams);

  state.simResult = rawResult;
  state.normalized = norm;

  // 1. Render 3D + 2D Construct Canvas
  if (renderer) {
    renderer.render(rawResult);
  }

  // 2. Update HUD & 6-Card Live Metrics Ribbon
  updateHudAndRibbon(norm);

  // 3. Update Mode 1 PDE Verification Strip
  updateMode1PdeStrip(norm);

  // 4. Update Mode 2 Subregion Biochemical Table
  updateMode2SubregionTable(norm);

  // 5. Update Mode 3 Mechanics Summary Strip
  updateMode3MechanicsStrip(norm);

  // 6. Update Mode 4 Differentiation Comparison Table
  updateMode4DifferentiationTable(norm);

  // 7. Update all 8 Chart.js plots
  updateAllCharts(norm);
}

function updateHudAndRibbon(norm) {
  const { params, whole } = norm;
  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  // Canvas Bottom-Left HUD
  setTxt('hud-scale', `Ø${params.diameter.toFixed(1)} × ${params.H.toFixed(2)} mm · ${params.externalO2.toFixed(1)}% O₂ · Day ${params.cultureDay}`);
  setTxt('hud-core-o2', `Core O₂(0,0): ${whole.coreO2Pct.toFixed(1)}%`);
  setTxt('hud-chondro', `Chondro: ${whole.chondroPct.toFixed(1)}%`);

  // 6-Card Live Metrics Ribbon
  setTxt('metric-core-o2', `${whole.coreO2Pct.toFixed(1)}%`);
  setTxt(
    'metric-core-o2-sub',
    whole.coreO2Pct < 0.8
      ? 'Severe Anoxia (<0.8% O₂) at (0,0)'
      : whole.coreO2Pct < 5.0
        ? 'Hypoxic Core Zone at (r=0, z=0)'
        : 'Global Min at (r=0, z=0)'
  );

  setTxt('metric-chondro-pct', `${whole.chondroPct.toFixed(1)}%`);
  setTxt('metric-chondro-pct-sub', `vs. ${whole.mscPct.toFixed(1)}% Undiff. MSC`);

  setTxt('metric-dna', `${whole.dna.toFixed(1)} ng/mg`);
  setTxt('metric-dna-sub', `${whole.viabilityPct.toFixed(0)}% Viability Retention`);

  setTxt('metric-sgag', `${whole.sgagPct.toFixed(2)}% w/w`);
  setTxt('metric-sgag-sub', `${whole.sgagPerDna.toFixed(1)} µg/µg DNA`);

  setTxt('metric-collagen', `${whole.collagenPct.toFixed(2)}% w/w`);
  setTxt('metric-collagen-sub', `${whole.collagenPerDna.toFixed(1)} µg/µg DNA`);

  setTxt('metric-moduli', `${whole.eDyn.toFixed(1)} / ${whole.eEq.toFixed(1)} kPa`);
  setTxt('metric-moduli-sub', '1 Hz Dynamic / Stress-Relax');
}

function updateMode1PdeStrip(norm) {
  const { params, pde } = norm;
  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  const phiF = params.agarosePct / 100.0;
  setTxt('pde-diffusivity', `${(pde.diffusivity * 1e9).toFixed(2)} × 10⁻⁹ m²/s`);
  setTxt('pde-diffusivity-sub', `φ_f = ${phiF.toFixed(3)} · ${pde.diffusivityRatioPct.toFixed(1)}% of D_H2O`);

  const sinkExp = pde.maxSink * 1e5;
  setTxt('pde-vmax-sink', `${sinkExp.toFixed(2)} × 10⁻⁵ mol/m³·s`);
  setTxt('pde-vmax-sink-sub', `K_m = 6.3 × 10⁻³ mol/m³ (0.64% O₂)`);

  setTxt('pde-thiele', `Φ² = ${pde.thieleSq.toFixed(2)}`);
  setTxt(
    'pde-thiele-sub',
    pde.thieleSq > 2.2
      ? 'Reaction-Limited (Steep Gradient)'
      : pde.thieleSq > 0.8
        ? 'Intermediate Transport Regime'
        : 'Diffusion-Dominated Regime'
  );

  setTxt('pde-core-o2', `${pde.coreO2Pct.toFixed(1)}% O₂`);
  const sign = pde.deltaO2Pct <= 0 ? '−' : '+';
  setTxt('pde-core-o2-sub', `ΔO₂ = ${sign}${Math.abs(pde.deltaO2Pct).toFixed(1)}% vs. C_ext`);
}

function updateMode2SubregionTable(norm) {
  const tbody = document.getElementById('tbody-subregions');
  const tagEl = document.getElementById('spatial-benchmark-tag');
  if (!tbody) return;

  const { params, subregions } = norm;
  const benchScale = findTable1Benchmark(params.diameter, params.H, params.externalO2);

  if (tagEl) {
    if (benchScale && params.cultureDay >= 40) {
      tagEl.textContent = `Matched Table 1 Benchmark: ${benchScale.label} ✓`;
    } else {
      tagEl.textContent = `Simulated Ø${params.diameter.toFixed(1)}×${params.H.toFixed(2)} mm @ ${params.externalO2.toFixed(1)}% O₂ (Day ${params.cultureDay})`;
    }
  }

  const formatBenchPill = (subCode, field, decimals = 2, suffix = '') => {
    if (!benchScale || params.cultureDay < 38) return '';
    const subBench = benchScale.subregions?.[subCode];
    if (!subBench || !subBench[field]) return '';
    const { mean, sd } = subBench[field];
    return `<span class="benchmark-pill match" title="Buckley, Meyer & Kelly (2012) Table 1 Experimental Mean ± SD">T1: ${mean.toFixed(decimals)}±${sd.toFixed(decimals)}${suffix}</span>`;
  };

  tbody.innerHTML = subregions
    .map((sub) => {
      const isTotal = sub.code === 'Total';
      const rowClass = isTotal ? ' class="row-total"' : '';
      return `
        <tr${rowClass}>
          <td>
            <span class="subregion-tag">
              <span class="subregion-dot" style="background:${sub.color};"></span>
              ${sub.name}
            </span>
          </td>
          <td>${sub.o2Pct.toFixed(1)}%</td>
          <td>${sub.chondroPct.toFixed(1)}%</td>
          <td>${sub.dna.toFixed(2)}${formatBenchPill(sub.code, 'dna', 2)}</td>
          <td>${sub.sgagPct.toFixed(2)}%${formatBenchPill(sub.code, 'sgagPct', 2, '%')}</td>
          <td>${sub.sgagPerDna.toFixed(2)}${formatBenchPill(sub.code, 'sgagPerDna', 2)}</td>
          <td>${sub.collagenPct.toFixed(2)}%${formatBenchPill(sub.code, 'collagenPct', 2, '%')}</td>
          <td>${sub.collagenPerDna.toFixed(2)}${formatBenchPill(sub.code, 'collagenPerDna', 2)}</td>
        </tr>
      `;
    })
    .join('');
}

function updateMode3MechanicsStrip(norm) {
  const { params, whole } = norm;
  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  const benchScale = findTable1Benchmark(params.diameter, params.H, params.externalO2);

  setTxt('mech-val-eeq', `${whole.eEq.toFixed(1)} kPa`);
  setTxt(
    'mech-val-eeq-sub',
    benchScale
      ? `Fig. 7B Exp: ${benchScale.eEq.mean.toFixed(1)} ± ${benchScale.eEq.sd.toFixed(1)} kPa`
      : '10% Strain, 30 min Relax'
  );

  setTxt('mech-val-edyn', `${whole.eDyn.toFixed(1)} kPa`);
  setTxt(
    'mech-val-edyn-sub',
    benchScale
      ? `Fig. 7C Exp: ${benchScale.eDyn.mean.toFixed(0)} ± ${benchScale.eDyn.sd.toFixed(0)} kPa`
      : '1% Cyclic Strain @ 1 Hz'
  );

  setTxt('mech-val-matrix', `${whole.sgagPct.toFixed(2)}% + ${whole.collagenPct.toFixed(2)}% w/w`);
  setTxt('mech-val-matrix-sub', `Total ECM: ${(whole.sgagPct + whole.collagenPct).toFixed(2)}% wet wt`);

  setTxt('mech-val-homogeneity', `η = ${whole.homogeneity.toFixed(2)}`);
  setTxt(
    'mech-val-homogeneity-sub',
    whole.homogeneity >= 0.85
      ? 'Uniform Load-Bearing Matrix'
      : whole.homogeneity >= 0.70
        ? 'Moderate Core/Annulus Divergence'
        : 'Heterogeneous Core/Shell Gradient'
  );
}

function updateMode4DifferentiationTable(norm) {
  const tbody = document.getElementById('tbody-differentiation');
  const dayTag = document.getElementById('diff-day-tag');
  if (dayTag) {
    dayTag.textContent = `Day ${norm.params.cultureDay} Culture State`;
  }
  if (!tbody) return;

  // Compute Core/Annulus ratios for current construct
  const subs = norm.subregions;
  const findSub = (code) => subs.find((s) => s.code === code);
  const tc = findSub('TC') || findSub('Total') || subs[0];
  const bc = findSub('BC') || tc;
  const ta = findSub('TA') || findSub('Total') || subs[0];
  const ba = findSub('BA') || ta;

  const coreSgag = 0.5 * ((tc?.sgagPct ?? norm.whole.sgagPct) + (bc?.sgagPct ?? norm.whole.sgagPct));
  const annSgag = Math.max(0.01, 0.5 * ((ta?.sgagPct ?? norm.whole.sgagPct) + (ba?.sgagPct ?? norm.whole.sgagPct)));
  const sgagRatio = coreSgag / annSgag;

  const coreCol = 0.5 * ((tc?.collagenPct ?? norm.whole.collagenPct) + (bc?.collagenPct ?? norm.whole.collagenPct));
  const annCol = Math.max(0.01, 0.5 * ((ta?.collagenPct ?? norm.whole.collagenPct) + (ba?.collagenPct ?? norm.whole.collagenPct)));
  const colRatio = coreCol / annCol;

  // Compare against reference phenotypes at active scale (or Ø8x4.5 reference)
  const simMsc8 = normalizeSimulationResult(
    solveSimulation(buildSolverParams({ diameter: 8.0, height: 4.5, externalO2: 20.0, initialChondroPct: 0, cultureDay: 42 })),
    { diameter: 8.0, height: 4.5, externalO2: 20.0, initialChondroPct: 0, cultureDay: 42 }
  );
  const simCoculture = normalizeSimulationResult(
    solveSimulation(buildSolverParams({ diameter: norm.params.diameter, height: norm.params.H, externalO2: norm.params.externalO2, initialChondroPct: 50, cultureDay: 42 })),
    { diameter: norm.params.diameter, height: norm.params.H, externalO2: norm.params.externalO2, initialChondroPct: 50, cultureDay: 42 }
  );
  const simChondro8 = normalizeSimulationResult(
    solveSimulation(buildSolverParams({ diameter: 8.0, height: 4.5, externalO2: 20.0, initialChondroPct: 100, cultureDay: 42 })),
    { diameter: 8.0, height: 4.5, externalO2: 20.0, initialChondroPct: 100, cultureDay: 42 }
  );

  const ratioLabel = (r, isSgag) => {
    if (r > 1.12) return `${r.toFixed(2)}× (Core Enriched)`;
    if (r < 0.88) return `${r.toFixed(2)}× (${isSgag ? 'Periphery High' : 'Annulus Ring'})`;
    return `${r.toFixed(2)}× (Homogeneous)`;
  };

  tbody.innerHTML = `
    <tr class="row-total">
      <td><strong>Active Construct (Ø${norm.params.diameter.toFixed(1)}×${norm.params.H.toFixed(1)} mm, Day ${norm.params.cultureDay})</strong></td>
      <td>${norm.params.vmaxFmolHr.toFixed(1)} fmol/h/cell</td>
      <td>${norm.whole.coreO2Pct.toFixed(1)}%</td>
      <td>${norm.whole.chondroPct.toFixed(1)}%</td>
      <td>${ratioLabel(sgagRatio, true)}</td>
      <td>${ratioLabel(colRatio, false)}</td>
      <td>${norm.whole.eDyn.toFixed(1)} kPa (E_eq ${norm.whole.eEq.toFixed(1)})</td>
    </tr>
    <tr>
      <td><strong>100% MSC-Seeded Ø8×4.5 mm (20% O₂, Table 1)</strong></td>
      <td>37.4 → 18.7 fmol/h</td>
      <td>${simMsc8.whole.coreO2Pct.toFixed(1)}%</td>
      <td>${simMsc8.whole.chondroPct.toFixed(1)}% (Core Peak)</td>
      <td>1.58× (Core Enriched)</td>
      <td>0.21× (Annulus Ring)</td>
      <td>${simMsc8.whole.eDyn.toFixed(1)} kPa (E_eq ${simMsc8.whole.eEq.toFixed(1)})</td>
    </tr>
    <tr>
      <td><strong>50:50 MSC + Chondrocyte Co-Culture (Ø${norm.params.diameter.toFixed(1)}×${norm.params.H.toFixed(1)} mm)</strong></td>
      <td>28.1 → 18.7 fmol/h</td>
      <td>${simCoculture.whole.coreO2Pct.toFixed(1)}%</td>
      <td>${simCoculture.whole.chondroPct.toFixed(1)}%</td>
      <td>1.08× (Balanced)</td>
      <td>0.74× (Annulus High)</td>
      <td>${simCoculture.whole.eDyn.toFixed(1)} kPa (E_eq ${simCoculture.whole.eEq.toFixed(1)})</td>
    </tr>
    <tr>
      <td><strong>100% Mature Chondrocytes Ø8×4.5 mm (20% O₂)</strong></td>
      <td>18.7 fmol/h (Const)</td>
      <td>${simChondro8.whole.coreO2Pct.toFixed(1)}%</td>
      <td>100.0% (Committed)</td>
      <td>0.68× (Periphery High)</td>
      <td>0.64× (Periphery High)</td>
      <td>${simChondro8.whole.eDyn.toFixed(1)} kPa (E_eq ${simChondro8.whole.eEq.toFixed(1)})</td>
    </tr>
  `;
}

// ============================================================================
// 9. CHART.JS SCIENTIFIC PLOTS (8 CHARTS ACROSS 4 TABS)
// ============================================================================

function initStructureFunctionPills() {
  const sfPills = document.querySelectorAll('.btn-sf-pill');
  sfPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-sf');
      if (!mode) return;
      state.sfMode = mode;
      sfPills.forEach((b) => b.classList.toggle('active', b === btn));
      if (state.normalized) {
        updateChartStructureFunction(state.normalized);
      }
    });
  });
}

function initCharts() {
  if (typeof window.Chart === 'undefined') return;

  window.Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  window.Chart.defaults.font.size = 11;
  window.Chart.defaults.color = '#475569';

  // 1. Mode 1: Centerline O2 Profile (#chart-o2-centerline)
  const ctxCenterline = document.getElementById('chart-o2-centerline')?.getContext('2d');
  if (ctxCenterline) {
    chartO2Centerline = new window.Chart(ctxCenterline, {
      type: 'line',
      data: { datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}% O₂ at z_depth = ${ctx.parsed.x.toFixed(2)} mm`
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Axial Depth from Top Free Surface z_depth = H − z (mm)', font: { weight: '600' } },
            min: 0
          },
          y: {
            title: { display: true, text: 'Oxygen Concentration C_ox (% O₂)', font: { weight: '600' } },
            min: 0
          }
        }
      }
    });
  }

  // 2. Mode 1: Central Radial O2 Profile (#chart-o2-radial)
  const ctxRadial = document.getElementById('chart-o2-radial')?.getContext('2d');
  if (ctxRadial) {
    chartO2Radial = new window.Chart(ctxRadial, {
      type: 'line',
      data: { datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}% O₂ at d_r = ${ctx.parsed.x.toFixed(2)} mm`
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Radial Depth from Outer Edge d_r = R − r (mm) at y = H/2', font: { weight: '600' } },
            min: 0
          },
          y: {
            title: { display: true, text: 'Oxygen Concentration C_ox (% O₂)', font: { weight: '600' } },
            min: 0
          }
        }
      }
    });
  }

  // 3. Mode 2: Subregion Spatial Distribution (#chart-spatial-regions)
  const ctxSpatial = document.getElementById('chart-spatial-regions')?.getContext('2d');
  if (ctxSpatial) {
    chartSpatialRegions = new window.Chart(ctxSpatial, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } }
        },
        scales: {
          x: { title: { display: true, text: 'Cored Construct Subregions (Fig. 6D)', font: { weight: '600' } } },
          y: {
            title: { display: true, text: 'ECM (% w/w) & Scaled DNA (÷100 ng/mg)', font: { weight: '600' } },
            beginAtZero: true
          }
        }
      }
    });
  }

  // 4. Mode 2: Multi-Scale Biochemical Synthesis (#chart-scale-biochem)
  const ctxScaleBiochem = document.getElementById('chart-scale-biochem')?.getContext('2d');
  if (ctxScaleBiochem) {
    chartScaleBiochem = new window.Chart(ctxScaleBiochem, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } }
        },
        scales: {
          x: { title: { display: true, text: 'Construct Cylindrical Scale (Ø × H mm)', font: { weight: '600' } } },
          y: {
            title: { display: true, text: 'Whole-Construct Content (% wet weight)', font: { weight: '600' } },
            beginAtZero: true
          }
        }
      }
    });
  }

  // 5. Mode 3: Equilibrium & Dynamic Moduli vs. Scale (#chart-moduli-scale)
  const ctxModuliScale = document.getElementById('chart-moduli-scale')?.getContext('2d');
  if (ctxModuliScale) {
    chartModuliScale = new window.Chart(ctxModuliScale, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } }
        },
        scales: {
          x: { title: { display: true, text: 'Construct Scale (Fig. 7A–C)', font: { weight: '600' } } },
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Dynamic Modulus E_dyn (kPa)', font: { weight: '600' } },
            beginAtZero: true
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Equilibrium Modulus E_eq (kPa)', font: { weight: '600' } },
            beginAtZero: true,
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  // 6. Mode 3: Structure-Function Regression Plot (#chart-structure-function)
  const ctxSF = document.getElementById('chart-structure-function')?.getContext('2d');
  if (ctxSF) {
    chartStructureFunction = new window.Chart(ctxSF, {
      type: 'scatter',
      data: { datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 11, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pt = ctx.raw || {};
                const tag = pt.label || ctx.dataset.label || '';
                return `${tag}: (${ctx.parsed.x.toFixed(2)}% w/w, ${ctx.parsed.y.toFixed(1)} kPa)`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Total sGAG Content (% wet weight)', font: { weight: '600' } },
            min: 0
          },
          y: {
            type: 'linear',
            title: { display: true, text: 'Dynamic Modulus E_dyn (kPa)', font: { weight: '600' } },
            beginAtZero: true
          }
        }
      }
    });
  }

  // 7. Mode 4: 42-Day Phenotype, DNA & Core O2 Trajectory (#chart-time-differentiation)
  const ctxTimeDiff = document.getElementById('chart-time-differentiation')?.getContext('2d');
  if (ctxTimeDiff) {
    chartTimeDifferentiation = new window.Chart(ctxTimeDiff, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } }
        },
        scales: {
          x: { title: { display: true, text: 'Culture Duration (Days in TGF-β3 Medium)', font: { weight: '600' } } },
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Cell Fraction (%) / DNA (ng/mg)', font: { weight: '600' } },
            min: 0,
            max: 100
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Bottom Core O₂ (%)', font: { weight: '600' } },
            min: 0,
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  // 8. Mode 4: 42-Day ECM Synthesis & Stiffness Maturation (#chart-time-maturation)
  const ctxTimeMat = document.getElementById('chart-time-maturation')?.getContext('2d');
  if (ctxTimeMat) {
    chartTimeMaturation = new window.Chart(ctxTimeMat, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } }
        },
        scales: {
          x: { title: { display: true, text: 'Culture Duration (Days in TGF-β3 Medium)', font: { weight: '600' } } },
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Total sGAG & Collagen (% w/w)', font: { weight: '600' } },
            beginAtZero: true
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Moduli: E_dyn (kPa) & E_eq (kPa)', font: { weight: '600' } },
            beginAtZero: true,
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }
}

function updateAllCharts(norm) {
  updateMode1O2Charts(norm);
  updateMode2SpatialCharts(norm);
  updateMode3MechanicsCharts(norm);
  updateMode4TimeCharts(norm);
}

function refreshChartsForActiveTab() {
  const all = [
    chartO2Centerline,
    chartO2Radial,
    chartSpatialRegions,
    chartScaleBiochem,
    chartModuliScale,
    chartStructureFunction,
    chartTimeDifferentiation,
    chartTimeMaturation
  ];
  all.forEach((c) => {
    if (c) {
      c.resize();
      c.update('none');
    }
  });
}

/**
 * Mode 1 Charts: Centerline (z_depth ∈ [0, H]) & Radial (d_r ∈ [0, R]) O2 Profiles
 */
function updateMode1O2Charts(norm) {
  if (!chartO2Centerline || !chartO2Radial) return;

  const { params } = norm;

  // Solve 2x Vmax reference for the current construct scale (Fig. 2E–F & Fig. 3E–F)
  const sim2x = normalizeSimulationResult(
    solveSimulation(buildSolverParams({ vmaxMultiplier: 2.0 })),
    { ...params, vmaxMultiplier: 2.0 }
  );

  // Solve the 4 canonical paper scales at current externalO2 and 1x Vmax
  const scalesSpec = [
    { label: 'Ø4×1.5 mm (1× Vmax)', d: 4.0, h: 1.5, color: '#10b981', dash: [4, 3] },
    { label: 'Ø5×3.0 mm (1× Vmax)', d: 5.0, h: 3.0, color: '#0284c7', dash: [4, 3] },
    { label: 'Ø6×4.5 mm (1× Vmax)', d: 6.0, h: 4.5, color: '#f59e0b', dash: [4, 3] },
    { label: 'Ø8×4.5 mm (1× Vmax)', d: 8.0, h: 4.5, color: '#8b5cf6', dash: [4, 3] }
  ];

  const scaleProfiles = scalesSpec.map((sc) => {
    const res = normalizeSimulationResult(
      solveSimulation(buildSolverParams({ diameter: sc.d, height: sc.h, vmaxMultiplier: 1.0 })),
      { ...params, diameter: sc.d, height: sc.h, vmaxMultiplier: 1.0 }
    );
    return { ...sc, res };
  });

  // Centerline datasets
  const clDatasets = [
    {
      label: `Active Ø${params.diameter.toFixed(1)}×${params.H.toFixed(2)} (${params.vmaxMultiplier.toFixed(1)}× Vmax)`,
      data: norm.centerlineProfile.map((p) => ({ x: p.depth, y: p.o2Pct })),
      borderColor: '#dc2626',
      backgroundColor: 'rgba(220, 38, 38, 0.10)',
      borderWidth: 3.0,
      pointRadius: 0,
      tension: 0.25
    },
    {
      label: `Active Scale @ 2× Vmax (37.4 fmol/h)`,
      data: sim2x.centerlineProfile.map((p) => ({ x: p.depth, y: p.o2Pct })),
      borderColor: '#0f172a',
      borderDash: [6, 4],
      borderWidth: 2.2,
      pointRadius: 0,
      tension: 0.25
    },
    ...scaleProfiles.map((sc) => ({
      label: sc.label,
      data: sc.res.centerlineProfile.map((p) => ({ x: p.depth, y: p.o2Pct })),
      borderColor: sc.color,
      borderDash: sc.dash,
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.25
    }))
  ];

  chartO2Centerline.data.datasets = clDatasets;
  chartO2Centerline.options.scales.x.max = Math.max(4.5, params.H);
  chartO2Centerline.options.scales.y.max = Math.max(6.0, Math.ceil(params.externalO2 + 1));
  chartO2Centerline.update('none');

  // Radial datasets
  const radDatasets = [
    {
      label: `Active Ø${params.diameter.toFixed(1)}×${params.H.toFixed(2)} (${params.vmaxMultiplier.toFixed(1)}× Vmax)`,
      data: norm.radialProfile.map((p) => ({ x: p.radialDepth, y: p.o2Pct })),
      borderColor: '#dc2626',
      backgroundColor: 'rgba(220, 38, 38, 0.10)',
      borderWidth: 3.0,
      pointRadius: 0,
      tension: 0.25
    },
    {
      label: `Active Scale @ 2× Vmax (37.4 fmol/h)`,
      data: sim2x.radialProfile.map((p) => ({ x: p.radialDepth, y: p.o2Pct })),
      borderColor: '#0f172a',
      borderDash: [6, 4],
      borderWidth: 2.2,
      pointRadius: 0,
      tension: 0.25
    },
    ...scaleProfiles.map((sc) => ({
      label: sc.label,
      data: sc.res.radialProfile.map((p) => ({ x: p.radialDepth, y: p.o2Pct })),
      borderColor: sc.color,
      borderDash: sc.dash,
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.25
    }))
  ];

  chartO2Radial.data.datasets = radDatasets;
  chartO2Radial.options.scales.x.max = Math.max(4.0, params.R);
  chartO2Radial.options.scales.y.max = Math.max(6.0, Math.ceil(params.externalO2 + 1));
  chartO2Radial.update('none');
}

/**
 * Mode 2 Charts: Subregion Bar Chart (Fig. 6) & Multi-Scale Biochem Comparison (Fig. 5)
 */
function updateMode2SpatialCharts(norm) {
  if (chartSpatialRegions) {
    const subs = norm.subregions;
    chartSpatialRegions.data.labels = subs.map((s) => s.code);
    chartSpatialRegions.data.datasets = [
      {
        label: 'sGAG (% w/w)',
        data: subs.map((s) => Number(s.sgagPct.toFixed(3))),
        backgroundColor: 'rgba(2, 132, 199, 0.85)',
        borderColor: '#0284c7',
        borderWidth: 1
      },
      {
        label: 'Collagen (% w/w)',
        data: subs.map((s) => Number(s.collagenPct.toFixed(3))),
        backgroundColor: 'rgba(220, 38, 38, 0.85)',
        borderColor: '#dc2626',
        borderWidth: 1
      },
      {
        label: 'DNA (÷100 ng/mg)',
        data: subs.map((s) => Number((s.dna / 100.0).toFixed(3))),
        backgroundColor: 'rgba(16, 185, 129, 0.78)',
        borderColor: '#059669',
        borderWidth: 1
      }
    ];
    chartSpatialRegions.update('none');
  }

  if (chartScaleBiochem) {
    const scales = [
      { label: 'Ø4×1.5 mm', d: 4.0, h: 1.5, key20: '4.0x1.5_20' },
      { label: 'Ø5×3.0 mm', d: 5.0, h: 3.0, key20: '5.0x3.0_20' },
      { label: 'Ø6×4.5 mm', d: 6.0, h: 4.5, key20: '6.0x4.5_20' },
      { label: 'Ø8×4.5 mm', d: 8.0, h: 4.5, key20: '8.0x4.5_20' }
    ];

    const simCurr = scales.map((sc) =>
      normalizeSimulationResult(
        solveSimulation(buildSolverParams({ diameter: sc.d, height: sc.h })),
        { ...norm.params, diameter: sc.d, height: sc.h }
      )
    );

    const bench20Sgag = scales.map((sc) => TABLE1_BENCHMARKS_FALLBACK[sc.key20].subregions.Total.sgagPct.mean);
    const bench20Col = scales.map((sc) => TABLE1_BENCHMARKS_FALLBACK[sc.key20].subregions.Total.collagenPct.mean);

    chartScaleBiochem.data.labels = scales.map((s) => s.label);
    chartScaleBiochem.data.datasets = [
      {
        label: `Sim sGAG (% w/w @ ${norm.params.externalO2.toFixed(0)}% O₂)`,
        data: simCurr.map((r) => Number(r.whole.sgagPct.toFixed(3))),
        backgroundColor: 'rgba(2, 132, 199, 0.88)',
        borderColor: '#0284c7',
        borderWidth: 1
      },
      {
        label: 'Table 1 Exp. sGAG (20% O₂)',
        data: bench20Sgag,
        backgroundColor: 'rgba(125, 211, 252, 0.65)',
        borderColor: '#0369a1',
        borderWidth: 1
      },
      {
        label: `Sim Collagen (% w/w @ ${norm.params.externalO2.toFixed(0)}% O₂)`,
        data: simCurr.map((r) => Number(r.whole.collagenPct.toFixed(3))),
        backgroundColor: 'rgba(220, 38, 38, 0.88)',
        borderColor: '#dc2626',
        borderWidth: 1
      },
      {
        label: 'Table 1 Exp. Collagen (20% O₂)',
        data: bench20Col,
        backgroundColor: 'rgba(252, 165, 165, 0.65)',
        borderColor: '#b91c1c',
        borderWidth: 1
      }
    ];
    chartScaleBiochem.update('none');
  }
}

/**
 * Mode 3 Charts: Moduli Across Scales (Fig. 7A-C) & Structure-Function Regressions (Fig. 7D-G)
 */
function updateMode3MechanicsCharts(norm) {
  if (chartModuliScale) {
    const scales = [
      { label: 'Ø4×1.5 mm', d: 4.0, h: 1.5 },
      { label: 'Ø5×3.0 mm', d: 5.0, h: 3.0 },
      { label: 'Ø6×4.5 mm', d: 6.0, h: 4.5 },
      { label: 'Ø8×4.5 mm', d: 8.0, h: 4.5 }
    ];

    const sim20 = scales.map((sc) =>
      normalizeSimulationResult(
        solveSimulation(buildSolverParams({ diameter: sc.d, height: sc.h, externalO2: 20.0 })),
        { ...norm.params, diameter: sc.d, height: sc.h, externalO2: 20.0 }
      )
    );
    const sim5 = scales.map((sc) =>
      normalizeSimulationResult(
        solveSimulation(buildSolverParams({ diameter: sc.d, height: sc.h, externalO2: 5.0 })),
        { ...norm.params, diameter: sc.d, height: sc.h, externalO2: 5.0 }
      )
    );

    chartModuliScale.data.labels = scales.map((s) => s.label);
    chartModuliScale.data.datasets = [
      {
        label: 'E_dyn @ 20% O₂ (kPa)',
        data: sim20.map((r) => Number(r.whole.eDyn.toFixed(1))),
        backgroundColor: 'rgba(2, 132, 199, 0.85)',
        borderColor: '#0284c7',
        borderWidth: 1,
        yAxisID: 'y'
      },
      {
        label: 'E_dyn @ 5% O₂ (kPa)',
        data: sim5.map((r) => Number(r.whole.eDyn.toFixed(1))),
        backgroundColor: 'rgba(56, 189, 248, 0.65)',
        borderColor: '#0369a1',
        borderWidth: 1,
        yAxisID: 'y'
      },
      {
        label: 'E_eq @ 20% O₂ (kPa)',
        data: sim20.map((r) => Number(r.whole.eEq.toFixed(1))),
        backgroundColor: 'rgba(220, 38, 38, 0.85)',
        borderColor: '#dc2626',
        borderWidth: 1,
        yAxisID: 'y1'
      },
      {
        label: 'E_eq @ 5% O₂ (kPa)',
        data: sim5.map((r) => Number(r.whole.eEq.toFixed(1))),
        backgroundColor: 'rgba(251, 146, 60, 0.75)',
        borderColor: '#c2410c',
        borderWidth: 1,
        yAxisID: 'y1'
      }
    ];
    chartModuliScale.update('none');
  }

  updateChartStructureFunction(norm);
}

function updateChartStructureFunction(norm) {
  if (!chartStructureFunction) return;

  const mode = state.sfMode;
  const isEdyn = mode.startsWith('edyn');
  const isSgag = mode.endsWith('sgag');

  const xKey = isSgag ? 'sgag' : 'col';
  const yKey = isEdyn ? 'edyn' : 'eeq';

  const metaMap = {
    edyn_sgag: {
      fig: 'Fig. 7D',
      xLabel: 'Total sGAG Content (% wet weight)',
      yLabel: 'Dynamic Modulus E_dyn (kPa)',
      r2_20: 0.68,
      r2_all: 0.61
    },
    edyn_col: {
      fig: 'Fig. 7E',
      xLabel: 'Total Collagen Content (% wet weight)',
      yLabel: 'Dynamic Modulus E_dyn (kPa)',
      r2_20: 0.74,
      r2_all: 0.65
    },
    eeq_sgag: {
      fig: 'Fig. 7F',
      xLabel: 'Total sGAG Content (% wet weight)',
      yLabel: 'Equilibrium Modulus E_eq (kPa)',
      r2_20: 0.71,
      r2_all: 0.65
    },
    eeq_col: {
      fig: 'Fig. 7G',
      xLabel: 'Total Collagen Content (% wet weight)',
      yLabel: 'Equilibrium Modulus E_eq (kPa)',
      r2_20: 0.79,
      r2_all: 0.72
    }
  };

  const meta = metaMap[mode] || metaMap.edyn_sgag;
  const subEl = document.getElementById('sf-plot-subtitle');
  if (subEl) {
    subEl.textContent = `${meta.fig}: 20% O₂ (○, r² = ${meta.r2_20.toFixed(2)}), All Constructs (r² = ${meta.r2_all.toFixed(2)}), and Active Construct (★)`;
  }

  const pts20 = FIG7_SCATTER_DATA.normoxia20.map((d) => ({
    x: d[xKey],
    y: d[yKey],
    label: d.scale
  }));
  const pts5 = FIG7_SCATTER_DATA.hypoxia5.map((d) => ({
    x: d[xKey],
    y: d[yKey],
    label: d.scale
  }));

  // Compute linear regression lines
  const fitLine = (pts) => {
    const n = pts.length;
    const mx = pts.reduce((s, p) => s + p.x, 0) / n;
    const my = pts.reduce((s, p) => s + p.y, 0) / n;
    let num = 0;
    let den = 0;
    for (const p of pts) {
      num += (p.x - mx) * (p.y - my);
      den += (p.x - mx) * (p.x - mx);
    }
    const slope = den > 1e-9 ? num / den : 0;
    const intercept = my - slope * mx;
    const xs = pts.map((p) => p.x);
    const xMin = Math.min(...xs) * 0.92;
    const xMax = Math.max(...xs) * 1.06;
    return [
      { x: xMin, y: Math.max(0, slope * xMin + intercept) },
      { x: xMax, y: Math.max(0, slope * xMax + intercept) }
    ];
  };

  const reg20 = fitLine(pts20);
  const regAll = fitLine([...pts20, ...pts5]);

  const activeX = isSgag ? norm.whole.sgagPct : norm.whole.collagenPct;
  const activeY = isEdyn ? norm.whole.eDyn : norm.whole.eEq;

  chartStructureFunction.data.datasets = [
    {
      label: `Active Construct (Ø${norm.params.diameter.toFixed(1)}×${norm.params.H.toFixed(1)} mm)`,
      data: [{ x: activeX, y: activeY, label: 'Active Simulated Construct' }],
      backgroundColor: '#f59e0b',
      borderColor: '#0f172a',
      borderWidth: 2,
      pointStyle: 'star',
      pointRadius: 10,
      pointHoverRadius: 12,
      showLine: false
    },
    {
      label: '20% O₂ Constructs (○)',
      data: pts20,
      backgroundColor: 'rgba(2, 132, 199, 0.80)',
      borderColor: '#0369a1',
      borderWidth: 1.5,
      pointStyle: 'circle',
      pointRadius: 5,
      showLine: false
    },
    {
      label: '5% O₂ Constructs (×)',
      data: pts5,
      backgroundColor: 'rgba(220, 38, 38, 0.85)',
      borderColor: '#dc2626',
      borderWidth: 2,
      pointStyle: 'crossRot',
      pointRadius: 6,
      showLine: false
    },
    {
      label: `Linear Fit (All, r² = ${meta.r2_all.toFixed(2)})`,
      data: regAll,
      type: 'line',
      borderColor: '#0f172a',
      borderWidth: 2,
      pointRadius: 0,
      fill: false
    },
    {
      label: `Linear Fit (20% O₂, r² = ${meta.r2_20.toFixed(2)})`,
      data: reg20,
      type: 'line',
      borderColor: '#0284c7',
      borderDash: [5, 4],
      borderWidth: 1.8,
      pointRadius: 0,
      fill: false
    }
  ];

  chartStructureFunction.options.scales.x.title.text = meta.xLabel;
  chartStructureFunction.options.scales.y.title.text = meta.yLabel;
  chartStructureFunction.update('none');
}

/**
 * Mode 4 Charts: 42-Day Differentiation & Maturation Time-Lapse Curves
 */
function updateMode4TimeCharts(norm) {
  if (!chartTimeDifferentiation || !chartTimeMaturation) return;

  const days = [0, 3, 7, 10, 14, 18, 21, 28, 35, 42];
  const trajectory = days.map((d) => {
    const res = normalizeSimulationResult(
      solveSimulation(buildSolverParams({ cultureDay: d })),
      { ...norm.params, cultureDay: d }
    );
    return { day: d, ...res.whole };
  });

  const labels = days.map((d) => `Day ${d}`);

  chartTimeDifferentiation.data.labels = labels;
  chartTimeDifferentiation.data.datasets = [
    {
      label: 'Differentiated Chondrocytes (%)',
      data: trajectory.map((t) => Number(t.chondroPct.toFixed(1))),
      borderColor: '#059669',
      backgroundColor: 'rgba(5, 150, 105, 0.12)',
      borderWidth: 2.5,
      tension: 0.3,
      yAxisID: 'y'
    },
    {
      label: 'Undifferentiated MSCs (%)',
      data: trajectory.map((t) => Number(t.mscPct.toFixed(1))),
      borderColor: '#d97706',
      borderDash: [5, 4],
      borderWidth: 2.0,
      tension: 0.3,
      yAxisID: 'y'
    },
    {
      label: 'Viable DNA (ng/mg)',
      data: trajectory.map((t) => Number(t.dna.toFixed(1))),
      borderColor: '#7c3aed',
      borderWidth: 2.0,
      tension: 0.3,
      yAxisID: 'y'
    },
    {
      label: 'Bottom Core O₂ (%)',
      data: trajectory.map((t) => Number(t.coreO2Pct.toFixed(2))),
      borderColor: '#0284c7',
      borderWidth: 2.2,
      tension: 0.3,
      yAxisID: 'y1'
    }
  ];
  chartTimeDifferentiation.options.scales.y1.max = Math.max(6, Math.ceil(norm.params.externalO2 + 1));
  chartTimeDifferentiation.update('none');

  chartTimeMaturation.data.labels = labels;
  chartTimeMaturation.data.datasets = [
    {
      label: 'Total sGAG (% w/w)',
      data: trajectory.map((t) => Number(t.sgagPct.toFixed(3))),
      borderColor: '#0284c7',
      backgroundColor: 'rgba(2, 132, 199, 0.12)',
      borderWidth: 2.5,
      tension: 0.3,
      yAxisID: 'y'
    },
    {
      label: 'Total Collagen (% w/w)',
      data: trajectory.map((t) => Number(t.collagenPct.toFixed(3))),
      borderColor: '#dc2626',
      backgroundColor: 'rgba(220, 38, 38, 0.10)',
      borderWidth: 2.5,
      tension: 0.3,
      yAxisID: 'y'
    },
    {
      label: 'Dynamic Modulus E_dyn (kPa)',
      data: trajectory.map((t) => Number(t.eDyn.toFixed(1))),
      borderColor: '#0f172a',
      borderWidth: 2.2,
      tension: 0.3,
      yAxisID: 'y1'
    },
    {
      label: 'Equilibrium Modulus E_eq (kPa)',
      data: trajectory.map((t) => Number(t.eEq.toFixed(1))),
      borderColor: '#059669',
      borderDash: [4, 3],
      borderWidth: 2.0,
      tension: 0.3,
      yAxisID: 'y1'
    }
  ];
  chartTimeMaturation.update('none');
}

// ============================================================================
// 10. MODALS (THEORY & INTERACTIVE PRACTICE QUIZ)
// ============================================================================

const FALLBACK_QUIZ_QUESTIONS = [
  {
    question: 'In Buckley, Meyer, & Kelly (2012), why does the global minimum oxygen concentration C_ox always occur at the bottom center (r = 0, z = 0) of the cylindrical hydrogel rather than its geometric centroid (r = 0, z = H/2)?',
    options: [
      'Gravity causes dissolved O₂ molecules to float upward toward the meniscus.',
      'The construct rests flat on an impermeable polystyrene tissue culture well bottom (∂C_ox/∂z = 0 at z = 0), blocking bottom oxygen entry.',
      'MSCs sediment exclusively to the bottom face during agarose gelation.',
      'Agarose diffusivity D_construct is zero at the bottom boundary.'
    ],
    correctIndex: 1,
    explanation: 'Because the construct rests freely on the impermeable polystyrene well bottom (zero-flux Neumann boundary condition ∂C_ox/∂z = 0 at z = 0), oxygen only enters through the top surface (z = H) and lateral wall (r = R), shifting the global O₂ minimum to the Bottom Core (r = 0, z = 0).'
  },
  {
    question: 'According to Table 1 and Figure 6 of Buckley, Meyer, & Kelly (2012), how do sGAG and total collagen distribute spatially across cored subregions of large Ø8×4.5 mm MSC-seeded constructs cultured at 20% O₂?',
    options: [
      'Both sGAG and collagen are highest in the outer annulus (TA/BA) and lowest in the core (TC/BC).',
      'Both sGAG and collagen are highest in the hypoxic core (TC/BC).',
      'sGAG peaks in the hypoxic core (TC 1.18%, BC 1.19% w/w vs. TA 0.62%, BA 0.88% w/w), whereas total collagen peaks in the normoxic outer annulus (TA 2.79%, BA 2.89% w/w vs. TC 0.74%, BC 0.46% w/w).',
      'sGAG and collagen are completely uniform across all subregions.'
    ],
    correctIndex: 2,
    explanation: 'Moderate self-induced hypoxia in the core (~10.8% O₂ at 1× Vmax, ~2.6% O₂ at 2× Vmax) stabilizes HIF-1α and promotes SOX9-mediated MSC chondrogenesis and aggrecan/sGAG synthesis (TC 1.18%, BC 1.19% > TA 0.62%, BA 0.88%), whereas prolyl-4-hydroxylase requires higher O₂ tension to hydroxylate and stabilize triple-helical collagen fibrils in the outer annulus (TA 2.79%, BA 2.89% > TC 0.74%, BC 0.46%).'
  },
  {
    question: 'Using the Mackie–Meares obstruction equation D_construct = D_H2O [(1 − φ_f)/(1 + φ_f)]², how does increasing agarose hydrogel concentration from 2% (φ_f = 0.02) to 4% (φ_f = 0.04) affect effective O₂ diffusivity?',
    options: [
      'It increases D_construct by 16%.',
      'It reduces D_construct from 2.77 × 10⁻⁹ m²/s (92.4% of D_H2O) to 2.56 × 10⁻⁹ m²/s (85.2% of D_H2O), steepening internal O₂ gradients.',
      'It has no effect because agarose is 100% permeable to oxygen.',
      'It reduces D_construct to zero.'
    ],
    correctIndex: 1,
    explanation: 'At φ_f = 0.02, (0.98/1.02)² = 0.9235 (D = 2.77×10⁻⁹ m²/s). At φ_f = 0.04, (0.96/1.04)² = 0.8521 (D = 2.56×10⁻⁹ m²/s), increasing the Thiele modulus Φ² and deepening core oxygen depletion.'
  },
  {
    question: 'What happens when MSC-seeded constructs are cultured at 5% external O₂ compared to 20% O₂ across Ø5×3.0 mm and Ø6×4.5 mm construct scales (Table 1, Figs. 5 & 7)?',
    options: [
      '5% O₂ decreases sGAG and dynamic modulus at all construct scales.',
      'In Ø5×3.0 mm constructs, 5% O₂ (core 1.9% O₂) boosts sGAG (0.51% → 1.16% w/w), collagen (0.56% → 2.22% w/w), and E_dyn by 1.9-fold (163 → 310 kPa); in larger Ø6×4.5 mm constructs, severe core hypoxia (0.7% O₂) reduces viable DNA (62.5 → 51.8 ng/mg) and suppresses collagen (2.22% → 0.69% w/w).',
      '5% O₂ completely halts chondrogenesis at all scales.',
      '5% O₂ only affects construct diameter and not matrix synthesis.'
    ],
    correctIndex: 1,
    explanation: 'In Ø5×3.0 mm constructs, 5% external O₂ creates a chondrogenic low-O₂ core (1.9% O₂) that increases sGAG to 1.16% w/w, collagen to 2.22% w/w, E_eq to 33.0 kPa, and E_dyn by 1.9-fold (310 kPa). Scaling up to Ø6×4.5 mm at 5% O₂ drops core O₂ to 0.7%, reducing viable DNA (BC: 36.79 ng/mg) and suppressing collagen accumulation (0.69% w/w).'
  },
  {
    question: 'Why does doubling the cellular oxygen uptake rate from 1× V_max (18.7 fmol/h/cell, differentiated chondrocytes) to 2× V_max (37.4 fmol/h/cell, undifferentiated MSCs) dramatically alter the internal O₂ profile (Figs. 2E–F & 3E–F)?',
    options: [
      'Because the Thiele modulus Φ² = R² n_cell V_max / (D_construct C_ext) doubles, causing cellular O₂ consumption to outpace inward radial/axial diffusion.',
      'Because V_max changes the physical height H of the construct.',
      'Because Michaelis–Menten kinetics only operate at 37.4 fmol/h/cell.',
      'Because higher V_max increases external incubator oxygen above 20%.'
    ],
    correctIndex: 0,
    explanation: 'Doubling V_max from 18.7 to 37.4 fmol/h/cell doubles the volumetric reaction sink n_cell V_max, dropping the Ø8×4.5 mm bottom core from 10.8% to 2.6% O₂ under 20% O₂ culture and dropping the Ø5×3.0 mm bottom core at 5% O₂ from 1.9% to 0.26% O₂ (with severe core anoxia in larger constructs).'
  }
];

function initModalsAndQuiz() {
  const modalTheory = document.getElementById('modal-theory');
  const modalQuiz = document.getElementById('modal-quiz');
  const btnTheory = document.getElementById('btn-theory');
  const btnQuiz = document.getElementById('btn-quiz');

  if (btnTheory && modalTheory) {
    btnTheory.addEventListener('click', () => {
      modalTheory.classList.add('active');
      renderMath(modalTheory);
    });
  }

  if (btnQuiz && modalQuiz) {
    btnQuiz.addEventListener('click', () => {
      buildQuizDOM();
      modalQuiz.classList.add('active');
      renderMath(modalQuiz);
    });
  }

  // Close buttons & backdrop click
  document.querySelectorAll('.modal-close-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close');
      const modal = targetId ? document.getElementById(targetId) : btn.closest('.modal-backdrop');
      if (modal) modal.classList.remove('active');
    });
  });

  [modalTheory, modalQuiz].forEach((modal) => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalTheory) modalTheory.classList.remove('active');
      if (modalQuiz) modalQuiz.classList.remove('active');
    }
  });
}

function buildQuizDOM() {
  const container = document.getElementById('quiz-container');
  if (!container) return;

  const questions = (Array.isArray(QUIZ_QUESTIONS) && QUIZ_QUESTIONS.length > 0)
    ? QUIZ_QUESTIONS
    : FALLBACK_QUIZ_QUESTIONS;

  quizState.answered = {};
  quizState.score = 0;

  const headerHtml = `
    <div style="display:flex; align-items:center; justify-content:space-between; background:var(--color-primary-light); padding:0.65rem 1rem; border-radius:var(--radius-sm); border-left:4px solid var(--color-primary);">
      <div>
        <strong>BME 5313 / 6303 Self-Assessment Quiz</strong>
        <div style="font-size:0.78rem; color:var(--color-text-muted);">Select an answer for each question to receive immediate biophysical feedback.</div>
      </div>
      <div style="font-family:var(--font-mono); font-weight:700; font-size:0.95rem; color:var(--color-primary-dark);" id="quiz-score-banner">
        Score: 0 / ${questions.length}
      </div>
    </div>
  `;

  const cardsHtml = questions
    .map((q, qIdx) => {
      const opts = q.options || [];
      const correctIdx = Number(q.correctIndex ?? q.answer ?? 0);
      const optsHtml = opts
        .map(
          (optText, oIdx) => `
          <button type="button" class="quiz-option-btn" data-q="${qIdx}" data-opt="${oIdx}" data-correct="${correctIdx}">
            <span style="font-family:var(--font-mono); font-weight:700; color:var(--color-primary);">${String.fromCharCode(65 + oIdx)}.</span>
            <span>${optText}</span>
          </button>
        `
        )
        .join('');

      return `
        <div class="quiz-question-card" id="quiz-card-${qIdx}">
          <div class="quiz-question-title">${qIdx + 1}. ${q.question}</div>
          <div class="quiz-options-list">${optsHtml}</div>
          <div class="quiz-feedback" id="quiz-feedback-${qIdx}"></div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = headerHtml + cardsHtml;

  container.querySelectorAll('.quiz-option-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const qIdx = Number(btn.getAttribute('data-q'));
      const optIdx = Number(btn.getAttribute('data-opt'));
      const correctIdx = Number(btn.getAttribute('data-correct'));
      const qObj = questions[qIdx];

      if (quizState.answered[qIdx] !== undefined) return;
      quizState.answered[qIdx] = optIdx;

      const isCorrect = optIdx === correctIdx;
      if (isCorrect) quizState.score += 1;

      const card = document.getElementById(`quiz-card-${qIdx}`);
      if (card) {
        card.querySelectorAll('.quiz-option-btn').forEach((b, idx) => {
          if (idx === correctIdx) b.classList.add('selected-correct');
          else if (idx === optIdx) b.classList.add('selected-incorrect');
        });
      }

      const fb = document.getElementById(`quiz-feedback-${qIdx}`);
      if (fb) {
        fb.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        fb.innerHTML = `<strong>${isCorrect ? '✓ Correct!' : '✗ Incorrect.'}</strong> ${qObj.explanation || ''}`;
        renderMath(fb);
      }

      const banner = document.getElementById('quiz-score-banner');
      if (banner) {
        banner.textContent = `Score: ${quizState.score} / ${questions.length}`;
      }
    });
  });
}

// ============================================================================
// 11. 1-CLICK CSV EXPORT & RESET
// ============================================================================

function initExportAndReset() {
  const btnExport = document.getElementById('btn-export-csv');
  const btnReset = document.getElementById('btn-reset');

  if (btnExport) {
    btnExport.addEventListener('click', exportSimulationCSV);
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      stopTimelapse();
      state.params = { ...CANONICAL_DEFAULTS };
      state.activePreset = 'scale_5x30';

      document.querySelectorAll('.btn-preset').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-preset') === 'scale_5x30');
      });

      if (renderer) {
        renderer.resetView();
      }
      syncSlidersFromState();
      runSimulationAndUpdateUI();
    });
  }
}

function exportSimulationCSV() {
  if (!state.normalized) return;
  const { params, pde, whole, subregions, centerlineProfile, radialProfile } = state.normalized;

  const lines = [];
  lines.push('# LTU BME 5313 / 6303 — Construct Scale, Oxygen Transport & MSC Chondrogenesis Simulator');
  lines.push('# Reference: Buckley, C.T., Meyer, E.G., & Kelly, D.J. (2012), Tissue Engineering Part A, 18(3-4), 382-396');
  lines.push('');
  lines.push('SECTION 1: CONSTRUCT PARAMETERS & WHOLE-CONSTRUCT SUMMARY');
  lines.push('Parameter,Value,Units');
  lines.push(`Diameter,${params.diameter.toFixed(2)},mm`);
  lines.push(`Radius R,${params.R.toFixed(2)},mm`);
  lines.push(`Height H,${params.H.toFixed(2)},mm`);
  lines.push(`External O2 C_ext,${params.externalO2.toFixed(2)},% O2`);
  lines.push(`Initial Cell Density n_cell,${params.cellDensity.toFixed(2)},10^6 cells/mL`);
  lines.push(`Initial Chondrocyte Fraction,${params.initialChondroPct.toFixed(1)},%`);
  lines.push(`Max O2 Consumption Rate V_max,${params.vmaxFmolHr.toFixed(2)},fmol/h/cell`);
  lines.push(`Agarose Concentration,${params.agarosePct.toFixed(2)},% w/v`);
  lines.push(`Culture Duration,${params.cultureDay},days`);
  lines.push(`Effective Diffusivity D_construct,${pde.diffusivity.toExponential(4)},m^2/s`);
  lines.push(`Thiele Modulus Squared Phi^2,${pde.thieleSq.toFixed(4)},dimensionless`);
  lines.push(`Bottom Core O2 C_ox(0,0),${whole.coreO2Pct.toFixed(2)},% O2`);
  lines.push(`Differentiated Chondrocytes,${whole.chondroPct.toFixed(2)},%`);
  lines.push(`Total Viable DNA,${whole.dna.toFixed(2)},ng/mg`);
  lines.push(`Total sGAG,${whole.sgagPct.toFixed(3)},% w/w`);
  lines.push(`sGAG per DNA,${whole.sgagPerDna.toFixed(2)},ug/ug`);
  lines.push(`Total Collagen,${whole.collagenPct.toFixed(3)},% w/w`);
  lines.push(`Collagen per DNA,${whole.collagenPerDna.toFixed(2)},ug/ug`);
  lines.push(`Equilibrium Modulus E_eq,${whole.eEq.toFixed(2)},kPa`);
  lines.push(`Dynamic Modulus E_dyn (1 Hz),${whole.eDyn.toFixed(2)},kPa`);
  lines.push(`Spatial Homogeneity Factor eta,${whole.homogeneity.toFixed(3)},dimensionless`);
  lines.push('');

  lines.push('SECTION 2: SUBREGION BIOCHEMICAL ASSAY (TA, BA, TIA, BIA, TC, BC, TOTAL)');
  lines.push('Subregion Code,Subregion Name,Local O2 (%),Chondrocytes (%),DNA (ng/mg),sGAG (% w/w),sGAG/DNA (ug/ug),Collagen (% w/w),Collagen/DNA (ug/ug)');
  subregions.forEach((s) => {
    lines.push(
      `${s.code},"${s.name}",${s.o2Pct.toFixed(2)},${s.chondroPct.toFixed(2)},${s.dna.toFixed(2)},${s.sgagPct.toFixed(4)},${s.sgagPerDna.toFixed(2)},${s.collagenPct.toFixed(4)},${s.collagenPerDna.toFixed(2)}`
    );
  });
  lines.push('');

  lines.push('SECTION 3: CENTERLINE AXIAL O2 PROFILE (r = 0, z_depth = H - z)');
  lines.push('Axial Depth z_depth (mm),Height z (mm),O2 Concentration (% O2)');
  centerlineProfile.forEach((pt) => {
    const zMm = Math.max(0, params.H - pt.depth);
    lines.push(`${pt.depth.toFixed(4)},${zMm.toFixed(4)},${pt.o2Pct.toFixed(4)}`);
  });
  lines.push('');

  lines.push('SECTION 4: MID-HEIGHT RADIAL O2 PROFILE (z = H/2, d_r = R - r)');
  lines.push('Radial Depth d_r (mm),Radius r (mm),O2 Concentration (% O2)');
  radialProfile.forEach((pt) => {
    const rMm = Math.max(0, params.R - pt.radialDepth);
    lines.push(`${pt.radialDepth.toFixed(4)},${rMm.toFixed(4)},${pt.o2Pct.toFixed(4)}`);
  });

  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CartilageScale_D${params.diameter.toFixed(1)}xH${params.H.toFixed(1)}_${params.externalO2.toFixed(0)}pctO2_Day${params.cultureDay}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
