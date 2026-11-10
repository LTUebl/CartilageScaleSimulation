/**
 * renderer.js — Interactive Dual-Viewport HTML5 Canvas Visualizer
 * Buckley, Meyer, & Kelly (2012), Tissue Engineering Part A, 18(3-4), 382–396:
 * "The Influence of Construct Scale on the Composition and Functional Properties
 *  of Cartilaginous Tissues Engineered Using Bone Marrow-Derived Mesenchymal Stem Cells"
 *
 * Left Viewport (~40% width):
 *   - 3D Axisymmetric Cylindrical Agarose Construct inside Polystyrene Culture Well
 *     with translucent phenol-red hgDMEM + TGF-β3 medium (Fig. 1A)
 *   - Hatched top surface + 90° 3D wedge cutaway revealing internal (r, z) plane
 *     with Centerline & Central Radial guide lines and B.C. badges (Fig. 1B)
 *
 * Right Viewport (~60% width):
 *   - High-resolution bilinearly-interpolated 2D Axisymmetric Half-Section [0, R] × [0, H]
 *   - Colormaps:
 *       'o2'       : COMSOL Multiphysics Jet/Rainbow (Figs. 2A–B, 3A–B)
 *       'sgag'     : Virtual Alcian Blue 8GX histological stain (Fig. 4 Row 1)
 *       'collagen' : Virtual Picrosirius Red histological stain (Fig. 4 Row 2)
 *       'cells'    : MSC → Chondrocyte Differentiation & Collagen II DAB / Viability (Fig. 4 Row 3)
 *   - Overlays:
 *       showSubregions  : Biopsy punch sectioning lines (TA, BA, TIA, BIA, TC, BC) + live value pills
 *       showContours    : Marching-squares iso-level contours + inward O₂ diffusion flux arrows (-D∇C_ox)
 *       showCells       : Histological cell morphology (isolated spindle MSCs vs clustered chondrocytes in lacunae)
 *   - Interactive Mouse Probe with precision crosshair, 3D sync marker, and glassmorphic tooltip
 */

export class ConstructRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Function|null} onHoverProbe - Callback invoked with probeData on hover (or null on mouse leave)
   */
  constructor(canvas, onHoverProbe = null) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.onHoverProbe = onHoverProbe;

    // High-DPI display metrics
    this.dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    this.width = 960;
    this.height = 560;

    // Active visualization mode: 'o2' | 'sgag' | 'collagen' | 'cells'
    this.fieldMode = 'o2';

    // Overlay settings
    this.overlays = {
      showSubregions: true,
      showContours: true,
      showCells: true,
      showFluxVectors: true,
      o2ScaleMode: 'auto' // 'auto' | '20' | '5'
    };

    // View & 3D orientation state
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.yaw3D = -0.66;   // Azimuthal rotation for 3D cutaway cylinder
    this.pitch3D = 0.44;  // Elevation angle (radians) for isometric-like view

    // Pointer interaction state
    this.isDragging3D = false;
    this.isDragging2D = false;
    this.dragStart = { x: 0, y: 0, yaw: 0, pitch: 0, panX: 0, panY: 0 };
    this.mousePos = { x: -1000, y: -1000 };
    this.hoverProbe = null; // { r, y, z, depth, radialDepth, subregion, ... }

    // Cached layout rectangles for hit-testing
    this._layout = {
      leftPanel: { x: 0, y: 0, w: 380, h: 560 },
      rightPanel: { x: 380, y: 0, w: 580, h: 560 },
      plot2D: { x: 440, y: 80, w: 380, h: 360 },
      colorbar: { x: 845, y: 80, w: 18, h: 360 }
    };

    // Offscreen canvas for fast bilinearly-interpolated 2D heatmap rendering
    this._offscreen = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
    this._offCtx = this._offscreen ? this._offscreen.getContext('2d') : null;

    // Last simulation result for re-rendering on resize/interaction
    this.lastSimResult = null;

    if (this.canvas) {
      this._initEvents();
      this._initResizeObserver();
      this.resize();
    }
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Set active spatial field visualization mode
   * @param {'o2'|'sgag'|'collagen'|'cells'} mode
   */
  setFieldMode(mode) {
    const validModes = ['o2', 'sgag', 'collagen', 'cells'];
    if (validModes.includes(mode)) {
      this.fieldMode = mode;
      if (this.lastSimResult) {
        this._updateHoverProbeFromMouse();
        this.render(this.lastSimResult);
      }
    }
  }

  /**
   * Update visual overlay flags and O2 colorbar scale mode
   * @param {Object} overlays
   */
  setOverlays(overlays = {}) {
    if (!overlays || typeof overlays !== 'object') return;
    Object.assign(this.overlays, overlays);
    // If showContours is toggled and showFluxVectors wasn't explicitly specified in this call,
    // keep flux vectors synced with showContours for the UI "Iso-Contours & Flux" toggle
    if ('showContours' in overlays && !('showFluxVectors' in overlays)) {
      this.overlays.showFluxVectors = Boolean(overlays.showContours);
    }
    if (this.lastSimResult) {
      this.render(this.lastSimResult);
    }
  }

  /**
   * Set zoom level (clamped to [0.65, 2.5])
   * @param {number} zoomFactor
   */
  setZoom(zoomFactor) {
    if (typeof zoomFactor === 'number' && !Number.isNaN(zoomFactor)) {
      this.zoom = Math.max(0.65, Math.min(2.5, zoomFactor));
      if (this.lastSimResult) {
        this.render(this.lastSimResult);
      }
    }
  }

  /**
   * Convenience zoom step helpers
   */
  zoomIn() {
    this.setZoom(this.zoom * 1.18);
  }

  zoomOut() {
    this.setZoom(this.zoom / 1.18);
  }

  getZoom() {
    return this.zoom;
  }

  /**
   * Reset zoom, pan, and 3D camera angles to default
   */
  resetView() {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.yaw3D = -0.66;
    this.pitch3D = 0.44;
    if (this.lastSimResult) {
      this.render(this.lastSimResult);
    }
  }

  /**
   * Resize canvas to match container CSS dimensions with High-DPI scaling
   */
  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement || this.canvas;
    const rect = parent.getBoundingClientRect();
    this.dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;

    const cssWidth = Math.max(360, Math.floor(rect.width || 960));
    const cssHeight = Math.max(420, Math.floor(rect.height || 560));

    this.width = cssWidth;
    this.height = cssHeight;

    const targetW = Math.round(cssWidth * this.dpr);
    const targetH = Math.round(cssHeight * this.dpr);

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    if (this.lastSimResult) {
      this.render(this.lastSimResult);
    }
  }

  /**
   * Render the dual-viewport visualization for a simulation result object
   * @param {Object} simResult - Result returned by solveSimulation(params)
   */
  render(simResult) {
    if (!this.ctx || !simResult) return;
    this.lastSimResult = simResult;

    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Normalize data structures from simResult
    const data = this._extractSimData(simResult);

    // Compute responsive dual-panel layout
    this._computeLayout(data);

    // 1. Background & Subtle Scientific Grid
    this._drawBackground(ctx);

    // 2. Left Viewport (~40% width): 3D Axisymmetric Cutaway Construct in Culture Well (Fig. 1A–B)
    this._drawLeft3DViewport(ctx, data);

    // 3. Center Panel Divider
    this._drawPanelDivider(ctx);

    // 4. Right Viewport (~60% width): 2D Axisymmetric Half-Section [0, R] × [0, H] + Colorbar (Figs. 2–4)
    this._drawRight2DViewport(ctx, data);

    // 5. Interactive Hover Crosshair & Floating Glassmorphic Tooltip
    if (this.hoverProbe) {
      this._drawHoverProbeOverlay(ctx, data, this.hoverProbe);
    }

    ctx.restore();
  }

  // ===========================================================================
  // EVENT LISTENERS & RESIZE OBSERVER
  // ===========================================================================

  _initResizeObserver() {
    if (typeof ResizeObserver !== 'undefined' && this.canvas) {
      this._resizeObserver = new ResizeObserver(() => this.resize());
      this._resizeObserver.observe(this.canvas.parentElement || this.canvas);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.resize());
    }
  }

  _initEvents() {
    const c = this.canvas;
    if (!c) return;

    c.addEventListener('mousemove', (e) => {
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.mousePos = { x: mx, y: my };

      if (this.isDragging3D) {
        const dx = mx - this.dragStart.x;
        const dy = my - this.dragStart.y;
        this.yaw3D = this.dragStart.yaw + dx * 0.0085;
        this.pitch3D = Math.max(0.18, Math.min(1.15, this.dragStart.pitch + dy * 0.0065));
        if (this.lastSimResult) this.render(this.lastSimResult);
        return;
      }

      if (this.isDragging2D) {
        const dx = mx - this.dragStart.x;
        const dy = my - this.dragStart.y;
        this.panX = Math.max(-180, Math.min(180, this.dragStart.panX + dx));
        this.panY = Math.max(-140, Math.min(140, this.dragStart.panY + dy));
        if (this.lastSimResult) this.render(this.lastSimResult);
        return;
      }

      this._updateHoverProbeFromMouse();
      if (this.lastSimResult) {
        this.render(this.lastSimResult);
      }
    });

    c.addEventListener('mousedown', (e) => {
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (mx <= this._layout.leftPanel.w) {
        this.isDragging3D = true;
        this.dragStart = {
          x: mx,
          y: my,
          yaw: this.yaw3D,
          pitch: this.pitch3D,
          panX: this.panX,
          panY: this.panY
        };
        c.style.cursor = 'grabbing';
      } else if (e.shiftKey || e.button === 1 || this.zoom > 1.05) {
        // Allow panning 2D section when zoomed in or Shift+drag
        const p = this._layout.plot2D;
        if (mx < p.x || mx > p.x + p.w || my < p.y || my > p.y + p.h) {
          this.isDragging2D = true;
          this.dragStart = {
            x: mx,
            y: my,
            yaw: this.yaw3D,
            pitch: this.pitch3D,
            panX: this.panX,
            panY: this.panY
          };
        }
      }
    });

    const endDrag = () => {
      if (this.isDragging3D || this.isDragging2D) {
        this.isDragging3D = false;
        this.isDragging2D = false;
        this._updateCursor();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mouseup', endDrag);
    }

    c.addEventListener('mouseleave', () => {
      this.isDragging3D = false;
      this.isDragging2D = false;
      this.mousePos = { x: -1000, y: -1000 };
      if (this.hoverProbe !== null) {
        this.hoverProbe = null;
        if (typeof this.onHoverProbe === 'function') {
          this.onHoverProbe(null);
        }
        if (this.lastSimResult) {
          this.render(this.lastSimResult);
        }
      }
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : (1 / 1.1);
      this.setZoom(this.zoom * factor);
    }, { passive: false });
  }

  _updateCursor() {
    if (!this.canvas) return;
    const { x, y } = this.mousePos;
    const p = this._layout.plot2D;
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
      this.canvas.style.cursor = 'crosshair';
    } else if (x >= 0 && x <= this._layout.leftPanel.w) {
      this.canvas.style.cursor = this.isDragging3D ? 'grabbing' : 'grab';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  _updateHoverProbeFromMouse() {
    if (!this.lastSimResult) return;
    this._updateCursor();

    const { x, y } = this.mousePos;
    const p = this._layout.plot2D;

    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
      const data = this._extractSimData(this.lastSimResult);
      const rNorm = Math.max(0, Math.min(1, (x - p.x) / Math.max(1, p.w)));
      const yNorm = Math.max(0, Math.min(1, 1 - (y - p.y) / Math.max(1, p.h)));
      const rMm = rNorm * data.R;
      const yMm = yNorm * data.H;

      const probe = this._probeAtCoordinates(data, rMm, yMm);
      this.hoverProbe = probe;
      if (typeof this.onHoverProbe === 'function') {
        this.onHoverProbe(probe);
      }
    } else if (this.hoverProbe !== null) {
      this.hoverProbe = null;
      if (typeof this.onHoverProbe === 'function') {
        this.onHoverProbe(null);
      }
    }
  }

  // ===========================================================================
  // DATA NORMALIZATION & BILINEAR INTERPOLATION
  // ===========================================================================

  _extractSimData(simResult) {
    const params = simResult.params || {};
    const diameter = Number(params.diameter ?? 5.0);
    const R = diameter / 2;
    const H = Number(params.height ?? 3.0);
    const externalO2 = Number(params.externalO2 ?? 20.0);
    const cellDensity = Number(params.cellDensity ?? 15.0);
    const initialChondroPct = Number(params.initialChondroPct ?? 0);
    const vmaxMultiplier = Number(params.vmaxMultiplier ?? 1.0);
    const agarosePct = Number(params.agarosePct ?? 2.0);
    const cultureDay = Number(params.cultureDay ?? 42);

    const grid = simResult.grid || {};
    const o2Grid = grid.o2Pct || grid.o2 || [[externalO2]];
    const nz = o2Grid.length;
    const nr = (o2Grid[0] && o2Grid[0].length) ? o2Grid[0].length : 1;

    const sgagGrid = grid.sgagPct || grid.sgag || this._createConstantGrid(nz, nr, 0.5);
    const colGrid = grid.collagenPct || grid.collagen || this._createConstantGrid(nz, nr, 0.5);
    const chondroGrid = grid.chondroPct || grid.chondrocytePct || this._createConstantGrid(nz, nr, 50);
    const mscGrid = grid.mscPct || chondroGrid.map(row => row.map(v => Math.max(0, 100 - v)));
    const dnaGrid = grid.dna || this._createConstantGrid(nz, nr, 65);
    const viableGrid = grid.viableCellDensity || this._createConstantGrid(nz, nr, cellDensity);
    const sgagDnaGrid = grid.sgagPerDna || this._createConstantGrid(nz, nr, 100);
    const colDnaGrid = grid.collagenPerDna || this._createConstantGrid(nz, nr, 100);
    const glucoseGrid = grid.glucoseNorm || this._createConstantGrid(nz, nr, 0.85);

    // Whole construct info
    const wc = simResult.wholeConstruct || {};
    const volumeMm3 = Number(wc.volumeMm3 ?? (Math.PI * R * R * H));

    // Culture well metadata from Fig. 1A
    let wellType = wc.wellType || '12-Well Plate';
    let mediaVolumeMl = wc.mediaVolumeMl;
    if (!mediaVolumeMl) {
      if (diameter <= 4.2 && H <= 2.0) {
        wellType = '24-Well Plate';
        mediaVolumeMl = 1.0;
      } else if (diameter <= 5.5 && H <= 3.5) {
        wellType = '12-Well Plate';
        mediaVolumeMl = 2.5;
      } else if (diameter <= 6.8) {
        wellType = '6-Well Plate';
        mediaVolumeMl = 6.2;
      } else {
        wellType = '6-Well Plate';
        mediaVolumeMl = 9.0;
      }
    }

    // Active field 2D array & scale configuration
    const fieldConfig = this._getFieldConfig(externalO2, {
      o2Grid,
      sgagGrid,
      colGrid,
      chondroGrid
    });

    // Normalize subregions for Fig. 1A biopsy punch sectioning
    const subregions = this._normalizeSubregions(simResult.subregions, R, H, {
      o2Grid,
      sgagGrid,
      colGrid,
      chondroGrid,
      dnaGrid
    });

    return {
      raw: simResult,
      params: {
        diameter,
        R,
        H,
        externalO2,
        cellDensity,
        initialChondroPct,
        vmaxMultiplier,
        agarosePct,
        cultureDay
      },
      R,
      H,
      diameter,
      externalO2,
      volumeMm3,
      wellType,
      mediaVolumeMl,
      nr,
      nz,
      grids: {
        o2: o2Grid,
        sgag: sgagGrid,
        collagen: colGrid,
        cells: chondroGrid,
        chondro: chondroGrid,
        msc: mscGrid,
        dna: dnaGrid,
        viable: viableGrid,
        sgagPerDna: sgagDnaGrid,
        collagenPerDna: colDnaGrid,
        glucose: glucoseGrid
      },
      fieldConfig,
      subregions,
      wholeConstruct: wc
    };
  }

  _createConstantGrid(nz, nr, val) {
    return Array.from({ length: nz }, () => new Array(nr).fill(val));
  }

  _getFieldConfig(externalO2, { o2Grid, sgagGrid, colGrid, chondroGrid }) {
    const mode = this.fieldMode;
    if (mode === 'sgag') {
      return {
        mode: 'sgag',
        title: 'FIG. 4 (ROW 1) · VIRTUAL ALCIAN BLUE HISTOLOGY — sGAG DISTRIBUTION',
        shortLabel: 'sGAG',
        colorbarTitle: 'sGAG (% w/w)',
        unit: '% w/w',
        minVal: 0.0,
        maxVal: 1.5,
        ticks: [0.0, 0.3, 0.6, 0.9, 1.2, 1.5],
        contourLevels: [0.25, 0.50, 0.75, 1.00, 1.25],
        grid: sgagGrid,
        format: (v) => `${v.toFixed(2)}%`
      };
    }
    if (mode === 'collagen') {
      return {
        mode: 'collagen',
        title: 'FIG. 4 (ROW 2) · VIRTUAL PICROSIRIUS RED HISTOLOGY — COLLAGEN',
        shortLabel: 'Collagen',
        colorbarTitle: 'Collagen (% w/w)',
        unit: '% w/w',
        minVal: 0.0,
        maxVal: 3.0,
        ticks: [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
        contourLevels: [0.4, 0.8, 1.2, 1.8, 2.4],
        grid: colGrid,
        format: (v) => `${v.toFixed(2)}%`
      };
    }
    if (mode === 'cells') {
      return {
        mode: 'cells',
        title: 'FIG. 4 (ROW 3) · MSC → CHONDROCYTE PHENOTYPE & COLLAGEN II STAIN',
        shortLabel: 'Chondro',
        colorbarTitle: 'Chondrocyte (%)',
        unit: '% Chondro',
        minVal: 0.0,
        maxVal: 100.0,
        ticks: [0, 20, 40, 60, 80, 100],
        contourLevels: [20, 40, 60, 80],
        grid: chondroGrid,
        format: (v) => `${v.toFixed(0)}%`
      };
    }

    // Default: 'o2' (COMSOL Oxygen Tension % O2, Figs. 2–3)
    const scaleSetting = String(this.overlays.o2ScaleMode || 'auto');
    let maxO2 = 20.0;
    if (scaleSetting === '5') {
      maxO2 = 5.0;
    } else if (scaleSetting === '20') {
      maxO2 = 20.0;
    } else {
      // 'auto'
      maxO2 = externalO2 <= 6.0 ? Math.max(5.0, externalO2) : Math.max(20.0, externalO2);
    }

    const isLowScale = maxO2 <= 6.0;
    const ticks = isLowScale
      ? [0, 1, 2, 3, 4, 5]
      : [0, 4, 8, 12, 16, 20];
    const contourLevels = isLowScale
      ? [0.5, 1.0, 2.0, 3.0, 4.0]
      : [2.0, 5.0, 8.0, 11.0, 14.0, 17.0];

    const figRef = isLowScale ? 'FIG. 3A–B (5% O₂ HYPOXIA)' : 'FIG. 2A–B (20% O₂ NORMOXIA)';

    return {
      mode: 'o2',
      title: `${figRef} · 2D AXISYMMETRIC OXYGEN PROFILE C_ox(r, y)`,
      shortLabel: 'O₂',
      colorbarTitle: 'Oxygen (% O₂)',
      unit: '% O₂',
      minVal: 0.0,
      maxVal: maxO2,
      ticks,
      contourLevels,
      grid: o2Grid,
      format: (v) => `${v.toFixed(1)}%`
    };
  }

  /**
   * Bilinear interpolation on a 2D [iz][ir] grid where rNorm ∈ [0,1], yNorm ∈ [0,1]
   */
  _sampleGridBilinear(grid2D, rNorm, yNorm) {
    if (!grid2D || !grid2D.length) return 0;
    const nz = grid2D.length;
    const nr = grid2D[0].length;

    const fr = Math.max(0, Math.min(1, rNorm)) * (nr - 1);
    const fz = Math.max(0, Math.min(1, yNorm)) * (nz - 1);

    const ir0 = Math.floor(fr);
    const iz0 = Math.floor(fz);
    const ir1 = Math.min(nr - 1, ir0 + 1);
    const iz1 = Math.min(nz - 1, iz0 + 1);

    const dr = fr - ir0;
    const dz = fz - iz0;

    const v00 = grid2D[iz0][ir0] ?? 0;
    const v10 = grid2D[iz0][ir1] ?? v00;
    const v01 = grid2D[iz1][ir0] ?? v00;
    const v11 = grid2D[iz1][ir1] ?? v00;

    return (1 - dz) * ((1 - dr) * v00 + dr * v10) + dz * ((1 - dr) * v01 + dr * v11);
  }

  /**
   * Normalize subregion geometry and live values for any construct scale (Fig. 1A)
   */
  _normalizeSubregions(rawSubregions, R, H, grids) {
    const midY = H / 2;
    const diam = R * 2;

    // Define canonical subregion geometry bounds per Buckley et al. (2012) Fig. 1A
    let specs = [];
    if (diam <= 4.2) {
      specs = [
        { code: 'Total', name: 'Whole Construct (Total)', rMin: 0, rMax: R, yMin: 0, yMax: H }
      ];
    } else if (diam <= 5.5) {
      // Ø5×3 mm: Ø3 mm core (r = 1.5 mm, or 0.6 R)
      const rc = Math.abs(diam - 5.0) < 0.3 ? 1.5 : 0.60 * R;
      specs = [
        { code: 'TC', name: 'Top Core (TC)', rMin: 0, rMax: rc, yMin: midY, yMax: H },
        { code: 'BC', name: 'Bottom Core (BC)', rMin: 0, rMax: rc, yMin: 0, yMax: midY },
        { code: 'TA', name: 'Top Annulus (TA)', rMin: rc, rMax: R, yMin: midY, yMax: H },
        { code: 'BA', name: 'Bottom Annulus (BA)', rMin: rc, rMax: R, yMin: 0, yMax: midY }
      ];
    } else if (diam <= 7.0) {
      // Ø6×4.5 mm: Ø4 mm core (r = 2.0 mm, or 2/3 R)
      const rc = Math.abs(diam - 6.0) < 0.3 ? 2.0 : (2 / 3) * R;
      specs = [
        { code: 'TC', name: 'Top Core (TC)', rMin: 0, rMax: rc, yMin: midY, yMax: H },
        { code: 'BC', name: 'Bottom Core (BC)', rMin: 0, rMax: rc, yMin: 0, yMax: midY },
        { code: 'TA', name: 'Top Annulus (TA)', rMin: rc, rMax: R, yMin: midY, yMax: H },
        { code: 'BA', name: 'Bottom Annulus (BA)', rMin: rc, rMax: R, yMin: 0, yMax: midY }
      ];
    } else {
      // Ø8×4.5 mm: Ø4 mm core (r1 = 2.0 mm = 0.5 R), Ø6 mm inner annulus (r2 = 3.0 mm = 0.75 R)
      const r1 = Math.abs(diam - 8.0) < 0.3 ? 2.0 : 0.50 * R;
      const r2 = Math.abs(diam - 8.0) < 0.3 ? 3.0 : 0.75 * R;
      specs = [
        { code: 'TC', name: 'Top Core (TC)', rMin: 0, rMax: r1, yMin: midY, yMax: H },
        { code: 'BC', name: 'Bottom Core (BC)', rMin: 0, rMax: r1, yMin: 0, yMax: midY },
        { code: 'TIA', name: 'Top Inner Annulus (TIA)', rMin: r1, rMax: r2, yMin: midY, yMax: H },
        { code: 'BIA', name: 'Bottom Inner Annulus (BIA)', rMin: r1, rMax: r2, yMin: 0, yMax: midY },
        { code: 'TA', name: 'Top Annulus (TA)', rMin: r2, rMax: R, yMin: midY, yMax: H },
        { code: 'BA', name: 'Bottom Annulus (BA)', rMin: r2, rMax: R, yMin: 0, yMax: midY }
      ];
    }

    // Map any solver-supplied subregion metrics by code
    const rawMap = {};
    if (Array.isArray(rawSubregions)) {
      for (const item of rawSubregions) {
        const key = item.code || item.id || item.region || item.name;
        if (key) rawMap[key] = item;
      }
    } else if (rawSubregions && typeof rawSubregions === 'object') {
      for (const [k, v] of Object.entries(rawSubregions)) {
        rawMap[k] = v;
      }
    }

    return specs.map(spec => {
      const provided = rawMap[spec.code] || {};
      const rMidNorm = ((spec.rMin + spec.rMax) * 0.5) / Math.max(1e-6, R);
      const yMidNorm = ((spec.yMin + spec.yMax) * 0.5) / Math.max(1e-6, H);

      const o2Pct = Number(provided.o2Pct ?? provided.o2 ?? this._sampleGridBilinear(grids.o2Grid, rMidNorm, yMidNorm));
      const sgagPct = Number(provided.sgagPct ?? provided.sgag ?? this._sampleGridBilinear(grids.sgagGrid, rMidNorm, yMidNorm));
      const collagenPct = Number(provided.collagenPct ?? provided.collagen ?? this._sampleGridBilinear(grids.colGrid, rMidNorm, yMidNorm));
      const chondroPct = Number(provided.chondroPct ?? provided.chondrocytePct ?? this._sampleGridBilinear(grids.chondroGrid, rMidNorm, yMidNorm));
      const dna = Number(provided.dna ?? this._sampleGridBilinear(grids.dnaGrid, rMidNorm, yMidNorm));

      return {
        ...spec,
        rMin: Number(provided.rMin ?? spec.rMin),
        rMax: Number(provided.rMax ?? spec.rMax),
        yMin: Number(provided.yMin ?? provided.zMin ?? spec.yMin),
        yMax: Number(provided.yMax ?? provided.zMax ?? spec.yMax),
        o2Pct,
        sgagPct,
        collagenPct,
        chondroPct,
        dna
      };
    });
  }

  /**
   * Probe simulation state at physical coordinates (r, y) in mm
   */
  _probeAtCoordinates(data, rMm, yMm) {
    const r = Math.max(0, Math.min(data.R, rMm));
    const y = Math.max(0, Math.min(data.H, yMm));
    const rNorm = r / Math.max(1e-6, data.R);
    const yNorm = y / Math.max(1e-6, data.H);

    let externalProbe = {};
    if (this.lastSimResult && typeof this.lastSimResult.probeAt === 'function') {
      try {
        externalProbe = this.lastSimResult.probeAt(r, y) || {};
      } catch (_) {
        externalProbe = {};
      }
    }

    // Determine subregion containing (r, y)
    let matchedSub = data.subregions[0] || { code: 'Total', name: 'Whole Construct' };
    for (const sub of data.subregions) {
      if (r >= sub.rMin - 1e-4 && r <= sub.rMax + 1e-4 && y >= sub.yMin - 1e-4 && y <= sub.yMax + 1e-4) {
        matchedSub = sub;
        break;
      }
    }

    const o2Pct = Number(externalProbe.o2Pct ?? externalProbe.o2 ?? this._sampleGridBilinear(data.grids.o2, rNorm, yNorm));
    const sgagPct = Number(externalProbe.sgagPct ?? externalProbe.sgag ?? this._sampleGridBilinear(data.grids.sgag, rNorm, yNorm));
    const collagenPct = Number(externalProbe.collagenPct ?? externalProbe.collagen ?? this._sampleGridBilinear(data.grids.collagen, rNorm, yNorm));
    const chondroPct = Number(externalProbe.chondroPct ?? externalProbe.chondrocytePct ?? this._sampleGridBilinear(data.grids.chondro, rNorm, yNorm));
    const mscPct = Number(externalProbe.mscPct ?? Math.max(0, 100 - chondroPct));
    const dna = Number(externalProbe.dna ?? this._sampleGridBilinear(data.grids.dna, rNorm, yNorm));
    const viableCellDensity = Number(externalProbe.viableCellDensity ?? this._sampleGridBilinear(data.grids.viable, rNorm, yNorm));
    const sgagPerDna = Number(externalProbe.sgagPerDna ?? this._sampleGridBilinear(data.grids.sgagPerDna, rNorm, yNorm));
    const collagenPerDna = Number(externalProbe.collagenPerDna ?? this._sampleGridBilinear(data.grids.collagenPerDna, rNorm, yNorm));
    const glucoseNorm = Number(externalProbe.glucoseNorm ?? this._sampleGridBilinear(data.grids.glucose, rNorm, yNorm));

    return {
      ...externalProbe,
      r,
      y,
      z: y,
      depth: Math.max(0, data.H - y),         // Centerline depth downward from top free surface (Fig. 2C)
      radialDepth: Math.max(0, data.R - r),   // Central radial depth inward from outer edge (Fig. 2D)
      subregion: externalProbe.subregion || matchedSub.code,
      subregionName: externalProbe.subregionName || matchedSub.name,
      o2Pct,
      o2Molar: o2Pct * 0.0102,                // Henry's law mol/m³ at 37°C
      chondroPct,
      mscPct,
      dna,
      viableCellDensity,
      sgagPct,
      sgagPerDna,
      collagenPct,
      collagenPerDna,
      glucoseNorm
    };
  }

  // ===========================================================================
  // SCIENTIFIC COLORMAPS (COMSOL JET, ALCIAN BLUE, PICROSIRIUS RED, PHENOTYPE)
  // ===========================================================================

  /**
   * Map field value to [r, g, b] color array (0-255)
   * @param {number} value - Value in active field units
   * @param {Object} fieldConfig - Active field config
   * @param {number} [dnaVal=70] - Local DNA value for viability modulation in 'cells' mode
   */
  _mapValueToRGB(value, fieldConfig, dnaVal = 70) {
    const { mode, minVal, maxVal } = fieldConfig;
    const t = Math.max(0, Math.min(1, (value - minVal) / Math.max(1e-9, maxVal - minVal)));

    if (mode === 'o2') {
      // Classic COMSOL Multiphysics Jet/Rainbow Colormap (Figs. 2A–B & 3A–B)
      // 0.00: Deep dark blue (0, 0, 130)
      // 0.14: Royal blue     (0, 50, 245)
      // 0.36: Bright cyan    (0, 228, 255)
      // 0.52: Emerald green  (45, 255, 110)
      // 0.68: Sunny yellow   (255, 238, 0)
      // 0.84: Vivid orange   (255, 95, 0)
      // 1.00: Deep red       (180, 0, 0)
      const stops = [
        { p: 0.00, c: [0, 0, 130] },
        { p: 0.14, c: [0, 55, 245] },
        { p: 0.36, c: [0, 228, 255] },
        { p: 0.52, c: [50, 250, 105] },
        { p: 0.68, c: [255, 238, 0] },
        { p: 0.84, c: [255, 98, 0] },
        { p: 1.00, c: [182, 0, 0] }
      ];
      return this._interpolateColorStops(stops, t);
    }

    if (mode === 'sgag') {
      // Virtual Alcian Blue 8GX Histological Stain (Fig. 4 Row 1)
      // 0.0% w/w: Pale translucent agarose background (242, 248, 253)
      // 1.5% w/w: Deep royal Alcian blue (7, 47, 119)
      const stops = [
        { p: 0.00, c: [243, 248, 253] },
        { p: 0.18, c: [194, 229, 249] },
        { p: 0.42, c: [96, 182, 232] },
        { p: 0.70, c: [24, 118, 194] },
        { p: 1.00, c: [7, 46, 116] }
      ];
      return this._interpolateColorStops(stops, t);
    }

    if (mode === 'collagen') {
      // Virtual Picrosirius Red Histological Stain (Fig. 4 Row 2)
      // 0.0% w/w: Pale cream-blush agarose background (253, 245, 240)
      // 3.0% w/w: Deep crimson Picrosirius red (125, 8, 24)
      const stops = [
        { p: 0.00, c: [253, 245, 240] },
        { p: 0.20, c: [250, 198, 186] },
        { p: 0.45, c: [238, 112, 96] },
        { p: 0.72, c: [198, 32, 44] },
        { p: 1.00, c: [122, 8, 22] }
      ];
      return this._interpolateColorStops(stops, t);
    }

    // 'cells': MSC → Chondrocyte Differentiation & Collagen Type II DAB Gold
    // 0% Chondrocyte (100% MSC): Cool slate-indigo (68, 88, 148)
    // 50% Chondrocyte: Vibrant teal-emerald (22, 156, 136)
    // 100% Chondrocyte: Warm amber / DAB Collagen II gold-ochre (218, 124, 14)
    const stops = [
      { p: 0.00, c: [68, 88, 148] },
      { p: 0.35, c: [24, 146, 152] },
      { p: 0.68, c: [118, 178, 56] },
      { p: 1.00, c: [218, 122, 12] }
    ];
    const rgb = this._interpolateColorStops(stops, t);

    // Modulate brightness/saturation softly by local DNA viability when DNA drops below 45 ng/mg
    const viabilityFactor = Math.max(0.45, Math.min(1.0, dnaVal / 55.0));
    if (viabilityFactor < 0.98) {
      const deadTint = [205, 212, 222];
      const w = 1 - viabilityFactor;
      return [
        Math.round(rgb[0] * (1 - 0.55 * w) + deadTint[0] * (0.55 * w)),
        Math.round(rgb[1] * (1 - 0.55 * w) + deadTint[1] * (0.55 * w)),
        Math.round(rgb[2] * (1 - 0.55 * w) + deadTint[2] * (0.55 * w))
      ];
    }
    return rgb;
  }

  _interpolateColorStops(stops, t) {
    if (t <= stops[0].p) return stops[0].c.slice();
    const last = stops[stops.length - 1];
    if (t >= last.p) return last.c.slice();

    for (let i = 0; i < stops.length - 1; i++) {
      const s0 = stops[i];
      const s1 = stops[i + 1];
      if (t >= s0.p && t <= s1.p) {
        const u = (t - s0.p) / Math.max(1e-9, s1.p - s0.p);
        return [
          Math.round(s0.c[0] + u * (s1.c[0] - s0.c[0])),
          Math.round(s0.c[1] + u * (s1.c[1] - s0.c[1])),
          Math.round(s0.c[2] + u * (s1.c[2] - s0.c[2]))
        ];
      }
    }
    return last.c.slice();
  }

  _rgbToCss(rgb, alpha = 1) {
    if (alpha >= 0.999) {
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  }

  // ===========================================================================
  // LAYOUT & BACKGROUND
  // ===========================================================================

  _computeLayout(data) {
    const W = this.width;
    const H = this.height;

    // Reserve top for floating legend/zoom pills and bottom for HUD bar
    const topSafe = 44;
    const bottomSafe = 48;

    const leftW = Math.round(W * 0.41);
    const rightW = W - leftW;

    this._layout.leftPanel = {
      x: 0,
      y: topSafe,
      w: leftW,
      h: H - topSafe - bottomSafe
    };

    this._layout.rightPanel = {
      x: leftW,
      y: topSafe,
      w: rightW,
      h: H - topSafe - bottomSafe
    };

    // Compute 2D axisymmetric cross-section plot area inside rightPanel
    const rp = this._layout.rightPanel;
    const padLeft = 56;
    const padRight = 100; // Room for right depth axis + vertical colorbar
    const padTop = 52;
    const padBottom = 52;

    const maxPlotW = Math.max(140, rp.w - padLeft - padRight);
    const maxPlotH = Math.max(140, rp.h - padTop - padBottom);

    // Physical aspect ratio R : H, blended with reference scale so both aspect ratio
    // and relative scale changes (Ø4×1.5 vs Ø8×4.5) are visually clear and readable
    const physRatio = data.R / Math.max(0.25, data.H);
    const refScaleFactor = Math.min(1.0, Math.max(0.58, Math.sqrt((data.R * data.H) / (4.0 * 4.5)) * 0.45 + 0.58));

    let targetW = maxPlotW * refScaleFactor * this.zoom;
    let targetH = targetW / physRatio;

    if (targetH > maxPlotH * this.zoom) {
      targetH = maxPlotH * refScaleFactor * this.zoom;
      targetW = targetH * physRatio;
    }

    // Clamp to fit nicely within the right viewport frame
    targetW = Math.max(130, Math.min(maxPlotW * 1.15, targetW));
    targetH = Math.max(120, Math.min(maxPlotH * 1.08, targetH));

    const centerX = rp.x + padLeft + maxPlotW * 0.5 + this.panX * 0.35;
    const centerY = rp.y + padTop + maxPlotH * 0.5 + this.panY * 0.35;

    const plotX = Math.round(centerX - targetW * 0.5);
    const plotY = Math.round(centerY - targetH * 0.5);

    this._layout.plot2D = {
      x: plotX,
      y: plotY,
      w: Math.round(targetW),
      h: Math.round(targetH)
    };

    this._layout.colorbar = {
      x: Math.round(rp.x + rp.w - 58),
      y: Math.round(rp.y + padTop + 8),
      w: 16,
      h: Math.round(maxPlotH - 16)
    };
  }

  _drawBackground(ctx) {
    const W = this.width;
    const H = this.height;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#f8fafc');
    bgGrad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle scientific graph grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.lineWidth = 1;
    const step = 28;
    ctx.beginPath();
    for (let x = step; x < W; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
    }
    for (let y = step; y < H; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
    }
    ctx.stroke();
  }

  _drawPanelDivider(ctx) {
    const x = Math.round(this._layout.leftPanel.w) + 0.5;
    const yTop = 44;
    const yBot = this.height - 46;

    const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
    grad.addColorStop(0, 'rgba(148, 163, 184, 0.05)');
    grad.addColorStop(0.15, 'rgba(148, 163, 184, 0.45)');
    grad.addColorStop(0.85, 'rgba(148, 163, 184, 0.45)');
    grad.addColorStop(1, 'rgba(148, 163, 184, 0.05)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    ctx.lineTo(x, yBot);
    ctx.stroke();
  }

  // ===========================================================================
  // LEFT VIEWPORT: 3D AXISYMMETRIC CUTAWAY CONSTRUCT IN CULTURE WELL (FIG. 1A–B)
  // ===========================================================================

  _drawLeft3DViewport(ctx, data) {
    const lp = this._layout.leftPanel;
    const cx = lp.x + lp.w * 0.50;
    const cy = lp.y + lp.h * 0.55;

    // Viewport Section Header
    ctx.save();
    ctx.font = '700 11px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.fillText('FIG. 1A–B · 3D CONSTRUCT IN CULTURE WELL & 90° CUTAWAY', cx, lp.y + 16);

    ctx.font = '500 10.5px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      `${data.wellType} (${data.mediaVolumeMl.toFixed(1)} mL hgDMEM + TGF-β3) · Day ${data.params.cultureDay}`,
      cx,
      lp.y + 32
    );

    // 3D Projection scale: map physical mm to screen pixels
    // Reference max radius ~5 mm, max height ~6 mm
    const baseScale = Math.min(lp.w, lp.h) * 0.072 * Math.pow(this.zoom, 0.55);

    // Physical construct radius R and height H (with visual floor so tiny constructs stay clear)
    const rConstruct = data.R * baseScale;
    const hConstruct = data.H * baseScale * 1.12;

    // Culture well geometry surrounding the construct
    const rWell = Math.max(rConstruct * 1.55, (data.R + 2.2) * baseScale);
    const hMedia = Math.max(hConstruct * 1.38, hConstruct + 18);
    const hWellWall = hMedia + 14;

    // Vertical shift so construct rests at y = 0 on the well bottom plate
    const baseCenterY = cy + hConstruct * 0.36;

    // 3D -> 2D isometric-like projection helper
    // World coordinates: (X, Y_up, Z_depth) in screen-scaled units
    const cosY = Math.cos(this.yaw3D);
    const sinY = Math.sin(this.yaw3D);
    const sinP = Math.sin(this.pitch3D);
    const cosP = Math.cos(this.pitch3D);

    const project3D = (wx, wy, wz) => {
      const rx = wx * cosY - wz * sinY;
      const rz = wx * sinY + wz * cosY;
      return {
        x: cx + rx,
        y: baseCenterY - wy * cosP + rz * sinP,
        depth: rz
      };
    };

    // 1. Draw Impermeable Polystyrene Well Bottom Plate (y = 0)
    this._drawWellBottomAndBackMedia(ctx, cx, baseCenterY, rWell, hMedia, hWellWall, sinP, cosP);

    // 2. Draw 3D Cylindrical Agarose Construct with 90° Wedge Cutaway (Fig. 1B)
    this._draw3DCutawayConstruct(ctx, data, project3D, cx, baseCenterY, rConstruct, hConstruct, sinP, cosP);

    // 3. Draw Front Translucent Culture Medium Meniscus & Polystyrene Well Rim
    this._drawWellFrontMediaAndRim(ctx, cx, baseCenterY, rWell, hMedia, hWellWall, sinP, cosP, data);

    // 4. Draw Dimension Callouts & Boundary Condition Badges (Fig. 1A–B)
    this._draw3DBoundaryAndScaleBadges(ctx, lp, data, project3D, cx, baseCenterY, rConstruct, hConstruct, rWell, hMedia, sinP, cosP);

    ctx.restore();
  }

  _drawWellBottomAndBackMedia(ctx, cx, baseCenterY, rWell, hMedia, hWellWall, sinP, cosP) {
    const ryWell = rWell * sinP;
    const mediaTopY = baseCenterY - hMedia * cosP;
    const wallTopY = baseCenterY - hWellWall * cosP;

    // Shadow beneath culture well plate
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, baseCenterY + 7, rWell * 1.04, ryWell * 1.06, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.10)';
    ctx.fill();

    // Polystyrene well bottom disc (impermeable boundary z = 0)
    const botGrad = ctx.createRadialGradient(cx - rWell * 0.2, baseCenterY - ryWell * 0.2, 4, cx, baseCenterY, rWell);
    botGrad.addColorStop(0, '#f1f5f9');
    botGrad.addColorStop(0.7, '#cbd5e1');
    botGrad.addColorStop(1, '#94a3b8');
    ctx.beginPath();
    ctx.ellipse(cx, baseCenterY, rWell, ryWell, 0, 0, Math.PI * 2);
    ctx.fillStyle = botGrad;
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Subtle concentric molded well ring on bottom plate
    ctx.beginPath();
    ctx.ellipse(cx, baseCenterY, rWell * 0.88, ryWell * 0.88, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Back half of phenol-red chondrogenic culture medium (hgDMEM + TGF-β3)
    const mediaBackGrad = ctx.createLinearGradient(cx - rWell, mediaTopY, cx + rWell, baseCenterY);
    mediaBackGrad.addColorStop(0, 'rgba(244, 63, 94, 0.14)');
    mediaBackGrad.addColorStop(0.5, 'rgba(251, 113, 133, 0.19)');
    mediaBackGrad.addColorStop(1, 'rgba(225, 29, 72, 0.22)');

    ctx.beginPath();
    ctx.ellipse(cx, baseCenterY, rWell, ryWell, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(cx + rWell, mediaTopY);
    ctx.ellipse(cx, mediaTopY, rWell, ryWell, 0, 0, Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = mediaBackGrad;
    ctx.fill();

    // Back wall of polystyrene well above media
    ctx.beginPath();
    ctx.ellipse(cx, wallTopY, rWell, ryWell, 0, Math.PI, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }

  _draw3DCutawayConstruct(ctx, data, project3D, cx, baseCenterY, rConstruct, hConstruct, sinP, cosP) {
    const { fieldConfig, grids } = data;
    // The 90° cutaway wedge faces the viewer on the front-right quadrant:
    // In world coordinates (wx = r cos θ, wz = r sin θ), let cutaway span θ ∈ [θ_cut1, θ_cut2]
    // so that as user orbits yaw3D slightly, the cutaway rotates naturally with the construct!
    const thetaCut1 = 0.05;               // Face A (right cutaway face, ~3°)
    const thetaCut2 = Math.PI * 0.55;     // Face B (front-left cutaway face, ~99°)

    // 1. Outer Cylindrical Wall (back + side segments outside cutaway)
    // Render angular strips from θ = thetaCut2 around the back to θ = thetaCut1 + 2π
    const nTheta = 44;
    const totalArc = Math.PI * 2 - (thetaCut2 - thetaCut1);
    const outerBoundaryVal = this._sampleGridBilinear(fieldConfig.grid, 1.0, 0.5);
    const outerDnaVal = this._sampleGridBilinear(grids.dna, 1.0, 0.5);
    const baseOuterRGB = this._mapValueToRGB(outerBoundaryVal, fieldConfig, outerDnaVal);

    // Sort angular strips back-to-front by average depth
    const strips = [];
    for (let i = 0; i < nTheta; i++) {
      const a0 = thetaCut2 + (i / nTheta) * totalArc;
      const a1 = thetaCut2 + ((i + 1) / nTheta) * totalArc;
      const aMid = 0.5 * (a0 + a1);
      const pMid = project3D(rConstruct * Math.cos(aMid), hConstruct * 0.5, rConstruct * Math.sin(aMid));
      strips.push({ a0, a1, aMid, depth: pMid.depth });
    }
    strips.sort((a, b) => a.depth - b.depth);

    // Draw back-facing outer wall strips first (depth < 0)
    const drawOuterStrip = (s) => {
      const pBot0 = project3D(rConstruct * Math.cos(s.a0), 0, rConstruct * Math.sin(s.a0));
      const pBot1 = project3D(rConstruct * Math.cos(s.a1), 0, rConstruct * Math.sin(s.a1));
      const pTop1 = project3D(rConstruct * Math.cos(s.a1), hConstruct, rConstruct * Math.sin(s.a1));
      const pTop0 = project3D(rConstruct * Math.cos(s.a0), hConstruct, rConstruct * Math.sin(s.a0));

      // Cylindrical diffuse lighting based on screen normal
      const nx = Math.cos(s.aMid + this.yaw3D);
      const light = 0.80 + 0.22 * nx;
      const shaded = [
        Math.min(255, Math.round(baseOuterRGB[0] * light)),
        Math.min(255, Math.round(baseOuterRGB[1] * light)),
        Math.min(255, Math.round(baseOuterRGB[2] * light))
      ];

      ctx.beginPath();
      ctx.moveTo(pBot0.x, pBot0.y);
      ctx.lineTo(pBot1.x, pBot1.y);
      ctx.lineTo(pTop1.x, pTop1.y);
      ctx.lineTo(pTop0.x, pTop0.y);
      ctx.closePath();
      ctx.fillStyle = this._rgbToCss(shaded, 0.94);
      ctx.fill();
      ctx.strokeStyle = this._rgbToCss(shaded, 0.96);
      ctx.lineWidth = 0.6;
      ctx.stroke();
    };

    for (const s of strips) {
      if (s.depth <= 0) drawOuterStrip(s);
    }

    // 2. Draw Bottom Confined Cutaway Wedge Sector on Well Plate (y = 0)
    ctx.save();
    ctx.beginPath();
    const pOriginBot = project3D(0, 0, 0);
    ctx.moveTo(pOriginBot.x, pOriginBot.y);
    for (let k = 0; k <= 16; k++) {
      const ang = thetaCut1 + (k / 16) * (thetaCut2 - thetaCut1);
      const pt = project3D(rConstruct * Math.cos(ang), 0, rConstruct * Math.sin(ang));
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.fill();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 3. Draw Front-Facing Outer Cylindrical Strips (depth > 0)
    for (const s of strips) {
      if (s.depth > 0) drawOuterStrip(s);
    }

    // 4. Draw Top Free Surface (270° sector at y = H) with Paper's Hatched Pattern (Fig. 1B, p. 383)
    ctx.save();
    const pTopCenter = project3D(0, hConstruct, 0);
    ctx.beginPath();
    ctx.moveTo(pTopCenter.x, pTopCenter.y);
    for (let i = 0; i <= nTheta; i++) {
      const ang = thetaCut2 + (i / nTheta) * totalArc;
      const pt = project3D(rConstruct * Math.cos(ang), hConstruct, rConstruct * Math.sin(ang));
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();

    const topRGB = [
      Math.min(255, Math.round(baseOuterRGB[0] * 1.06 + 12)),
      Math.min(255, Math.round(baseOuterRGB[1] * 1.06 + 12)),
      Math.min(255, Math.round(baseOuterRGB[2] * 1.06 + 12))
    ];
    ctx.fillStyle = this._rgbToCss(topRGB, 0.95);
    ctx.fill();

    // Clip to top 270° sector and draw diagonal hatch lines (Fig. 1B: "top surface of the construct is hatched")
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.32)';
    ctx.lineWidth = 1.0;
    const hatchSpan = rConstruct * 2.4;
    const hatchStep = 6.5;
    ctx.beginPath();
    for (let d = -hatchSpan; d <= hatchSpan; d += hatchStep) {
      ctx.moveTo(pTopCenter.x + d - hatchSpan * 0.6, pTopCenter.y - hatchSpan * 0.45);
      ctx.lineTo(pTopCenter.x + d + hatchSpan * 0.6, pTopCenter.y + hatchSpan * 0.45);
    }
    ctx.stroke();
    ctx.restore();

    // Crisp outer rim stroke on top surface
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();

    // 5. Draw the Two Internal 90° Cutaway Radial-Axial (r, z) Planes!
    // Each plane spans r ∈ [0, R] and y ∈ [0, H], revealing the internal gradient field
    const drawCutawayFace = (thetaAngle, shadeFactor) => {
      const cosT = Math.cos(thetaAngle);
      const sinT = Math.sin(thetaAngle);
      const nrSub = 22;
      const nzSub = 22;

      for (let iz = 0; iz < nzSub; iz++) {
        const y0 = (iz / nzSub);
        const y1 = ((iz + 1) / nzSub);
        const yMid = 0.5 * (y0 + y1);

        for (let ir = 0; ir < nrSub; ir++) {
          const r0 = (ir / nrSub);
          const r1 = ((ir + 1) / nrSub);
          const rMid = 0.5 * (r0 + r1);

          const val = this._sampleGridBilinear(fieldConfig.grid, rMid, yMid);
          const dnaVal = this._sampleGridBilinear(grids.dna, rMid, yMid);
          const rgb = this._mapValueToRGB(val, fieldConfig, dnaVal);
          const shaded = [
            Math.min(255, Math.round(rgb[0] * shadeFactor)),
            Math.min(255, Math.round(rgb[1] * shadeFactor)),
            Math.min(255, Math.round(rgb[2] * shadeFactor))
          ];

          const p00 = project3D(r0 * rConstruct * cosT, y0 * hConstruct, r0 * rConstruct * sinT);
          const p10 = project3D(r1 * rConstruct * cosT, y0 * hConstruct, r1 * rConstruct * sinT);
          const p11 = project3D(r1 * rConstruct * cosT, y1 * hConstruct, r1 * rConstruct * sinT);
          const p01 = project3D(r0 * rConstruct * cosT, y1 * hConstruct, r0 * rConstruct * sinT);

          ctx.beginPath();
          ctx.moveTo(p00.x, p00.y);
          ctx.lineTo(p10.x, p10.y);
          ctx.lineTo(p11.x, p11.y);
          ctx.lineTo(p01.x, p01.y);
          ctx.closePath();
          ctx.fillStyle = this._rgbToCss(shaded);
          ctx.fill();
          ctx.strokeStyle = this._rgbToCss(shaded);
          ctx.lineWidth = 0.45;
          ctx.stroke();
        }
      }

      // Draw subregion sectioning lines on the cutaway face if enabled
      if (this.overlays.showSubregions) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.lineWidth = 1.1;
        ctx.setLineDash([3, 2.5]);

        // Horizontal mid-plane (y = H/2)
        const pm0 = project3D(0, 0.5 * hConstruct, 0);
        const pm1 = project3D(rConstruct * cosT, 0.5 * hConstruct, rConstruct * sinT);
        ctx.beginPath();
        ctx.moveTo(pm0.x, pm0.y);
        ctx.lineTo(pm1.x, pm1.y);
        ctx.stroke();

        // Vertical biopsy punch core lines
        const uniqueRadii = new Set();
        for (const sub of data.subregions) {
          if (sub.rMax < data.R - 0.05) uniqueRadii.add(sub.rMax / data.R);
        }
        for (const rFrac of uniqueRadii) {
          const pb = project3D(rFrac * rConstruct * cosT, 0, rFrac * rConstruct * sinT);
          const pt = project3D(rFrac * rConstruct * cosT, hConstruct, rFrac * rConstruct * sinT);
          ctx.beginPath();
          ctx.moveTo(pb.x, pb.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Outline border of the cutaway plane
      const b00 = project3D(0, 0, 0);
      const b10 = project3D(rConstruct * cosT, 0, rConstruct * sinT);
      const b11 = project3D(rConstruct * cosT, hConstruct, rConstruct * sinT);
      const b01 = project3D(0, hConstruct, 0);

      ctx.beginPath();
      ctx.moveTo(b00.x, b00.y);
      ctx.lineTo(b10.x, b10.y);
      ctx.lineTo(b11.x, b11.y);
      ctx.lineTo(b01.x, b01.y);
      ctx.closePath();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    };

    // Sort the two cutaway faces by depth so the further one is drawn first
    const pFace1 = project3D(0.5 * rConstruct * Math.cos(thetaCut1), 0.5 * hConstruct, 0.5 * rConstruct * Math.sin(thetaCut1));
    const pFace2 = project3D(0.5 * rConstruct * Math.cos(thetaCut2), 0.5 * hConstruct, 0.5 * rConstruct * Math.sin(thetaCut2));

    if (pFace1.depth < pFace2.depth) {
      drawCutawayFace(thetaCut1, 0.94);
      drawCutawayFace(thetaCut2, 1.02);
    } else {
      drawCutawayFace(thetaCut2, 0.94);
      drawCutawayFace(thetaCut1, 1.02);
    }

    // 6. Highlight Fig. 1B Centerline (r = 0) & Central Radial Line (y = H/2) on primary cutaway face
    const cTop = project3D(0, hConstruct, 0);
    const cBot = project3D(0, 0, 0);

    ctx.save();
    // Vertical Centerline arrow (top -> bottom, Fig. 1B)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cTop.x, cTop.y);
    ctx.lineTo(cBot.x, cBot.y);
    ctx.stroke();

    // Central Radial line arrow (outer edge -> centerline at y = H/2, Fig. 1B)
    const rEdgeMid = project3D(
      rConstruct * Math.cos(thetaCut1),
      0.5 * hConstruct,
      rConstruct * Math.sin(thetaCut1)
    );
    const rCenterMid = project3D(0, 0.5 * hConstruct, 0);
    ctx.beginPath();
    ctx.moveTo(rEdgeMid.x, rEdgeMid.y);
    ctx.lineTo(rCenterMid.x, rCenterMid.y);
    ctx.stroke();

    // Synchronized 3D Probe Marker if user is hovering on the 2D section
    if (this.hoverProbe) {
      const rFrac = Math.max(0, Math.min(1, this.hoverProbe.r / Math.max(1e-6, data.R)));
      const yFrac = Math.max(0, Math.min(1, this.hoverProbe.y / Math.max(1e-6, data.H)));
      const p3 = project3D(
        rFrac * rConstruct * Math.cos(thetaCut1),
        yFrac * hConstruct,
        rFrac * rConstruct * Math.sin(thetaCut1)
      );

      ctx.beginPath();
      ctx.arc(p3.x, p3.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawWellFrontMediaAndRim(ctx, cx, baseCenterY, rWell, hMedia, hWellWall, sinP, cosP, data) {
    const ryWell = rWell * sinP;
    const mediaTopY = baseCenterY - hMedia * cosP;
    const wallTopY = baseCenterY - hWellWall * cosP;

    ctx.save();
    // Translucent front wash of phenol-red chondrogenic medium
    const frontMediaGrad = ctx.createLinearGradient(cx, mediaTopY, cx, baseCenterY);
    frontMediaGrad.addColorStop(0, 'rgba(251, 113, 133, 0.12)');
    frontMediaGrad.addColorStop(1, 'rgba(225, 29, 72, 0.16)');

    ctx.beginPath();
    ctx.ellipse(cx, baseCenterY, rWell, ryWell, 0, 0, Math.PI);
    ctx.lineTo(cx - rWell, mediaTopY);
    ctx.ellipse(cx, mediaTopY, rWell, ryWell, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fillStyle = frontMediaGrad;
    ctx.fill();

    // Upper liquid meniscus ellipse (z = media surface)
    ctx.beginPath();
    ctx.ellipse(cx, mediaTopY, rWell, ryWell, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(253, 164, 175, 0.14)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(225, 29, 72, 0.55)';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Polystyrene well vertical side walls
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - rWell, baseCenterY);
    ctx.lineTo(cx - rWell, wallTopY);
    ctx.moveTo(cx + rWell, baseCenterY);
    ctx.lineTo(cx + rWell, wallTopY);
    ctx.stroke();

    // Polystyrene well top rim (front arc)
    ctx.beginPath();
    ctx.ellipse(cx, wallTopY, rWell, ryWell, 0, 0, Math.PI);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.restore();
  }

  _draw3DBoundaryAndScaleBadges(ctx, lp, data, project3D, cx, baseCenterY, rConstruct, hConstruct, rWell, hMedia, sinP, cosP) {
    const ryWell = rWell * sinP;
    const mediaTopY = baseCenterY - hMedia * cosP;

    ctx.save();

    // 1. Construct Scale & Volume Summary Pill beneath the well
    const scaleY = Math.min(lp.y + lp.h - 22, baseCenterY + ryWell + 26);
    const scaleText = `Ø${data.diameter.toFixed(1)} × ${data.H.toFixed(2)} mm  |  R = ${data.R.toFixed(2)} mm  |  V = ${data.volumeMm3.toFixed(1)} mm³ (µL)`;
    this._drawBadgePill(ctx, cx, scaleY, scaleText, {
      bg: 'rgba(15, 23, 42, 0.88)',
      fg: '#f8fafc',
      border: 'rgba(56, 189, 248, 0.55)',
      font: '600 10.5px "JetBrains Mono", monospace'
    });

    // 2. Boundary Condition Badge: Free Surfaces (Top & Outer Radial Edge: C_ox = C_ext)
    const bcTopY = Math.max(lp.y + 52, mediaTopY - ryWell - 12);
    this._drawBadgePill(
      ctx,
      cx,
      bcTopY,
      `Top & Radial Edge: C_ox = C_ext (${data.externalO2.toFixed(1)}% O₂)`,
      {
        bg: 'rgba(255, 241, 242, 0.94)',
        fg: '#be123c',
        border: 'rgba(244, 63, 94, 0.45)',
        font: '600 9.5px "JetBrains Mono", monospace'
      }
    );

    // 3. Boundary Condition Badge: Centerline Symmetry (r = 0: ∂C_ox/∂r = 0)
    const cMid = project3D(0, hConstruct * 0.62, 0);
    const symBadgeX = Math.max(lp.x + 68, cMid.x - rConstruct * 0.85 - 24);
    const symBadgeY = cMid.y - 10;

    // Leader line from Centerline to Symmetry Badge
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cMid.x, cMid.y);
    ctx.lineTo(symBadgeX + 28, symBadgeY);
    ctx.stroke();

    this._drawBadgePill(ctx, symBadgeX, symBadgeY, 'Centerline: ∂C_ox/∂r = 0', {
      bg: 'rgba(248, 250, 252, 0.94)',
      fg: '#0f172a',
      border: 'rgba(100, 116, 139, 0.55)',
      font: '600 9px "JetBrains Mono", monospace'
    });

    // 4. Boundary Condition Badge: Impermeable Well Bottom Plate (y = 0: ∂C_ox/∂z = 0)
    const botPt = project3D(rConstruct * 0.45, 0, rConstruct * 0.45);
    const botBadgeX = Math.min(lp.x + lp.w - 86, cx + rWell * 0.42);
    const botBadgeY = Math.min(scaleY - 24, baseCenterY + ryWell * 0.55 + 6);

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.beginPath();
    ctx.moveTo(botPt.x, botPt.y);
    ctx.lineTo(botBadgeX - 20, botBadgeY - 6);
    ctx.stroke();

    this._drawBadgePill(ctx, botBadgeX, botBadgeY, 'Well Bottom: ∂C_ox/∂z = 0', {
      bg: 'rgba(241, 245, 249, 0.95)',
      fg: '#334155',
      border: 'rgba(100, 116, 139, 0.55)',
      font: '600 9px "JetBrains Mono", monospace'
    });

    ctx.restore();
  }

  _drawBadgePill(ctx, x, y, text, opts = {}) {
    const font = opts.font || '600 10px "Inter", sans-serif';
    const padX = opts.padX ?? 8;
    const padY = opts.padY ?? 4;
    ctx.save();
    ctx.font = font;
    const m = ctx.measureText(text);
    const w = m.width + padX * 2;
    const h = 14 + padY * 2;
    const rx = x - w * 0.5;
    const ry = y - h * 0.5;

    this._roundRect(ctx, rx, ry, w, h, 5);
    ctx.fillStyle = opts.bg || 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = opts.fg || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5);
    ctx.restore();
  }

  // ===========================================================================
  // RIGHT VIEWPORT: 2D AXISYMMETRIC HALF-SECTION [0, R] × [0, H] + COLORBAR
  // ===========================================================================

  _drawRight2DViewport(ctx, data) {
    const rp = this._layout.rightPanel;
    const p = this._layout.plot2D;
    const cb = this._layout.colorbar;
    const { fieldConfig } = data;

    ctx.save();

    // 1. Section Header Title & Subtitle
    const headerX = rp.x + (rp.w - 40) * 0.5;
    ctx.font = '700 11px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(fieldConfig.title, headerX, rp.y + 16);

    ctx.font = '500 10.5px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      `Axisymmetric Half-Section r ∈ [0, ${data.R.toFixed(2)} mm] × y ∈ [0, ${data.H.toFixed(2)} mm] · V_max = ${(18.7 * data.params.vmaxMultiplier).toFixed(1)} fmol/h/cell`,
      headerX,
      rp.y + 32
    );

    // 2. Render Smooth Bilinearly-Interpolated 2D Heatmap inside plot2D
    this._drawBilinearHeatmap2D(ctx, data, p);

    // 3. Clip to plot2D for internal overlays
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();

    // 3a. Histological Cell Morphology & Lacunae Overlay (Fig. 4 Row 3)
    if (this.overlays.showCells) {
      this._drawCellMorphologyOverlay(ctx, data, p);
    }

    // 3b. Iso-Level Contours & Inward Diffusion Flux Arrows (Figs. 2–3)
    if (this.overlays.showContours) {
      this._drawIsoContoursOverlay(ctx, data, p);
    }
    if (this.overlays.showContours && this.overlays.showFluxVectors !== false) {
      this._drawDiffusionFluxVectors(ctx, data, p);
    }

    // 3c. Centerline (r = 0) & Central Radial Line (y = H/2) Guide Overlay (Fig. 1B)
    this._drawProfileGuideLines(ctx, data, p);

    // 3d. Biopsy-Punch Subregion Grid & Live Value Pill Tags (Fig. 1A & Table 1)
    if (this.overlays.showSubregions) {
      this._drawSubregionsOverlay(ctx, data, p);
    }

    ctx.restore(); // End clip to plot2D

    // 4. Plot Frame, Physical Millimeter Axes, and Boundary Annotations
    this._draw2DAxesAndBoundaries(ctx, data, p);

    // 5. Vertical Scientific Colorbar on Right
    this._drawColorbar(ctx, data, cb);

    ctx.restore();
  }

  /**
   * Render pixel-accurate bilinearly-interpolated 2D heatmap via offscreen ImageData
   */
  _drawBilinearHeatmap2D(ctx, data, p) {
    if (!this._offscreen || !this._offCtx) return;

    // Render at a crisp internal resolution (e.g., 220 × 200 pixels) and scale smoothly
    const texW = Math.min(320, Math.max(140, Math.round(p.w)));
    const texH = Math.min(300, Math.max(120, Math.round(p.h)));

    if (this._offscreen.width !== texW || this._offscreen.height !== texH) {
      this._offscreen.width = texW;
      this._offscreen.height = texH;
    }

    const imgData = this._offCtx.createImageData(texW, texH);
    const buf = imgData.data;
    const { fieldConfig, grids } = data;
    const activeGrid = fieldConfig.grid;
    const dnaGrid = grids.dna;

    let idx = 0;
    for (let py = 0; py < texH; py++) {
      // py = 0 is top surface (yNorm = 1), py = texH - 1 is bottom confined plate (yNorm = 0)
      const yNorm = 1 - (py / Math.max(1, texH - 1));
      for (let px = 0; px < texW; px++) {
        const rNorm = px / Math.max(1, texW - 1);
        const val = this._sampleGridBilinear(activeGrid, rNorm, yNorm);
        const dnaVal = this._sampleGridBilinear(dnaGrid, rNorm, yNorm);
        const rgb = this._mapValueToRGB(val, fieldConfig, dnaVal);

        buf[idx] = rgb[0];
        buf[idx + 1] = rgb[1];
        buf[idx + 2] = rgb[2];
        buf[idx + 3] = 255;
        idx += 4;
      }
    }

    this._offCtx.putImageData(imgData, 0, 0);

    // Subtle drop shadow behind 2D cross-section frame
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.restore();

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this._offscreen, p.x, p.y, p.w, p.h);
  }

  /**
   * Marching-Squares Iso-Contour Lines with Inline Value Labels
   */
  _drawIsoContoursOverlay(ctx, data, p) {
    const { fieldConfig, nr, nz } = data;
    const grid = fieldConfig.grid;
    const levels = fieldConfig.contourLevels || [];
    if (!grid || nr < 2 || nz < 2) return;

    const isDarkBg = fieldConfig.mode === 'o2' || fieldConfig.mode === 'cells';
    const lineColor = isDarkBg ? 'rgba(255, 255, 255, 0.68)' : 'rgba(15, 23, 42, 0.45)';
    const labelBg = isDarkBg ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.88)';
    const labelFg = isDarkBg ? '#f8fafc' : '#0f172a';

    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.25;

    const toScreenX = (irFrac) => p.x + (irFrac / (nr - 1)) * p.w;
    const toScreenY = (izFrac) => p.y + (1 - (izFrac / (nz - 1))) * p.h;

    for (const level of levels) {
      if (level < fieldConfig.minVal || level > fieldConfig.maxVal) continue;

      ctx.beginPath();
      let labelPos = null;
      let segCount = 0;

      for (let iz = 0; iz < nz - 1; iz++) {
        for (let ir = 0; ir < nr - 1; ir++) {
          const v00 = grid[iz][ir];
          const v10 = grid[iz][ir + 1];
          const v11 = grid[iz + 1][ir + 1];
          const v01 = grid[iz + 1][ir];

          let mask = 0;
          if (v00 >= level) mask |= 1;
          if (v10 >= level) mask |= 2;
          if (v11 >= level) mask |= 4;
          if (v01 >= level) mask |= 8;
          if (mask === 0 || mask === 15) continue;

          const interp = (va, vb) => {
            const dv = vb - va;
            if (Math.abs(dv) < 1e-9) return 0.5;
            return Math.max(0, Math.min(1, (level - va) / dv));
          };

          // Edges: 0=bottom (v00-v10), 1=right (v10-v11), 2=top (v01-v11), 3=left (v00-v01)
          const edgePt = (edge) => {
            switch (edge) {
              case 0: return { x: toScreenX(ir + interp(v00, v10)), y: toScreenY(iz) };
              case 1: return { x: toScreenX(ir + 1), y: toScreenY(iz + interp(v10, v11)) };
              case 2: return { x: toScreenX(ir + interp(v01, v11)), y: toScreenY(iz + 1) };
              case 3: return { x: toScreenX(ir), y: toScreenY(iz + interp(v00, v01)) };
              default: return { x: 0, y: 0 };
            }
          };

          const segments = [];
          if (mask === 1 || mask === 14) segments.push([3, 0]);
          else if (mask === 2 || mask === 13) segments.push([0, 1]);
          else if (mask === 4 || mask === 11) segments.push([1, 2]);
          else if (mask === 8 || mask === 7) segments.push([2, 3]);
          else if (mask === 3 || mask === 12) segments.push([3, 1]);
          else if (mask === 6 || mask === 9) segments.push([0, 2]);
          else if (mask === 5) { segments.push([3, 2]); segments.push([0, 1]); }
          else if (mask === 10) { segments.push([3, 0]); segments.push([1, 2]); }

          for (const [eA, eB] of segments) {
            const pA = edgePt(eA);
            const pB = edgePt(eB);
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            segCount++;
            if (!labelPos && iz > nz * 0.25 && iz < nz * 0.78 && ir > nr * 0.22 && ir < nr * 0.78) {
              labelPos = { x: 0.5 * (pA.x + pB.x), y: 0.5 * (pA.y + pB.y) };
            }
          }
        }
      }
      ctx.stroke();

      // Draw compact contour label pill
      if (labelPos && segCount >= 4) {
        const txt = fieldConfig.mode === 'o2'
          ? `${level.toFixed(level < 2 ? 1 : 0)}%`
          : fieldConfig.mode === 'cells'
            ? `${level.toFixed(0)}%`
            : `${level.toFixed(2)}`;
        ctx.save();
        ctx.font = '600 8.5px "JetBrains Mono", monospace';
        const tw = ctx.measureText(txt).width + 6;
        const th = 12;
        this._roundRect(ctx, labelPos.x - tw * 0.5, labelPos.y - th * 0.5, tw, th, 3);
        ctx.fillStyle = labelBg;
        ctx.fill();
        ctx.fillStyle = labelFg;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, labelPos.x, labelPos.y + 0.5);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  /**
   * Draw inward oxygen diffusion flux vectors J = -D_construct ∇C_ox
   */
  _drawDiffusionFluxVectors(ctx, data, p) {
    const o2Grid = data.grids.o2;
    const cols = 7;
    const rows = 6;
    const eps = 0.025;

    ctx.save();
    const isDark = data.fieldConfig.mode === 'o2' || data.fieldConfig.mode === 'cells';
    const arrowColor = isDark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(15, 23, 42, 0.52)';
    ctx.strokeStyle = arrowColor;
    ctx.fillStyle = arrowColor;
    ctx.lineWidth = 1.2;

    for (let iy = 0; iy < rows; iy++) {
      const yNorm = (iy + 0.6) / rows;
      for (let ix = 0; ix < cols; ix++) {
        const rNorm = (ix + 0.6) / cols;

        // Compute spatial gradient ∂C/∂r and ∂C/∂y
        const dCdr = (
          this._sampleGridBilinear(o2Grid, Math.min(1, rNorm + eps), yNorm) -
          this._sampleGridBilinear(o2Grid, Math.max(0, rNorm - eps), yNorm)
        ) / (2 * eps * data.R);

        const dCdy = (
          this._sampleGridBilinear(o2Grid, rNorm, Math.min(1, yNorm + eps)) -
          this._sampleGridBilinear(o2Grid, rNorm, Math.max(0, yNorm - eps))
        ) / (2 * eps * data.H);

        // Flux J = -D ∇C points down the concentration gradient (inward from top & right edge)
        const jx = -dCdr;
        const jy = -dCdy; // In screen space, +y is downward, so -jy is screen dy = +dCdy!
        const mag = Math.hypot(jx, jy);
        if (mag < 0.04) continue;

        const sx = p.x + rNorm * p.w;
        const sy = p.y + (1 - yNorm) * p.h;

        // Normalize arrow length with gentle scaling by log-magnitude
        const len = Math.min(15, Math.max(6, 5.5 + 2.8 * Math.sqrt(mag)));
        const ux = jx / mag;
        const uy = dCdy / mag; // Screen Y increases downward, so downward flux (-dCdy > 0) has +uy

        const ex = sx + ux * len * 0.5;
        const ey = sy + uy * len * 0.5;
        const bx = sx - ux * len * 0.5;
        const by = sy - uy * len * 0.5;

        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Arrowhead at (ex, ey)
        const headLen = 3.8;
        const angle = Math.atan2(uy, ux);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - 0.52), ey - headLen * Math.sin(angle - 0.52));
        ctx.lineTo(ex - headLen * Math.cos(angle + 0.52), ey - headLen * Math.sin(angle + 0.52));
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Histological Cell Morphology, Clustering & Pericellular Lacunae Overlay (Fig. 4 Row 3)
   * - High O2 / Low Chondro% (Undifferentiated MSCs): small isolated spindle/stellate cells
   * - Hypoxic Chondrogenic Zone (Differentiated Chondrocytes): enlarged rounded cells in
   *   isogenous clusters (doublets/triplets) surrounded by pericellular matrix (PCM) halos/lacunae
   * - Severe Anoxic / Low-DNA Zone: sparse, faded ghost cells reflecting viability loss
   */
  _drawCellMorphologyOverlay(ctx, data, p) {
    const cols = Math.max(7, Math.min(13, Math.round(p.w / 32)));
    const rows = Math.max(6, Math.min(11, Math.round(p.h / 32)));
    const { grids, fieldConfig } = data;

    // Modulate density slightly by user's initial cellDensity slider (ref = 15 M/mL)
    const seedingFactor = Math.max(0.45, Math.min(1.45, Math.sqrt(data.params.cellDensity / 15.0)));

    ctx.save();

    for (let ir = 0; ir < rows; ir++) {
      for (let ic = 0; ic < cols; ic++) {
        // Deterministic pseudo-random jitter so cell positions look organic like histology
        const seed = (ir * 73 + ic * 37 + 19) % 97;
        const jx = ((seed % 13) / 13 - 0.5) * 0.55;
        const jy = (((seed * 7) % 17) / 17 - 0.5) * 0.55;

        const rNorm = Math.max(0.04, Math.min(0.96, (ic + 0.5 + jx) / cols));
        const yNorm = Math.max(0.05, Math.min(0.95, (ir + 0.5 + jy) / rows));

        const chondroPct = this._sampleGridBilinear(grids.chondro, rNorm, yNorm);
        const dnaVal = this._sampleGridBilinear(grids.dna, rNorm, yNorm);
        const sgagVal = this._sampleGridBilinear(grids.sgag, rNorm, yNorm);

        // Viability retention ratio relative to healthy ~70 ng/mg
        const viability = Math.max(0.15, Math.min(1.0, dnaVal / 68.0));

        // Skip some lattice sites in low-DNA necrotic regions or very low seeding densities
        const siteThreshold = viability * seedingFactor;
        const siteHash = ((ir * 31 + ic * 53) % 29) / 29;
        if (siteHash > siteThreshold) continue;

        const sx = p.x + rNorm * p.w;
        const sy = p.y + (1 - yNorm) * p.h;
        const chonFrac = Math.max(0, Math.min(1, chondroPct / 100));

        const isDarkMap = fieldConfig.mode === 'o2' || fieldConfig.mode === 'cells';
        const alpha = Math.max(0.25, Math.min(0.92, viability * 0.88));

        if (chonFrac < 0.35) {
          // Undifferentiated MSC Morphology (Fig. 4 Row 3 Top/Peripheral Insets):
          // Small, isolated, elongated/spindle cell without lacunar halo
          const angle = ((seed * 11) % 180) * (Math.PI / 180);
          const rx = 3.2 * seedingFactor;
          const ry = 1.35 * seedingFactor;

          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = isDarkMap
            ? `rgba(226, 232, 240, ${alpha * 0.82})`
            : `rgba(71, 85, 105, ${alpha * 0.72})`;
          ctx.fill();
          ctx.strokeStyle = isDarkMap
            ? `rgba(15, 23, 42, ${alpha * 0.65})`
            : `rgba(30, 41, 59, ${alpha * 0.65})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();

          // Tiny dark nucleus
          ctx.beginPath();
          ctx.arc(0, 0, 0.9, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
          ctx.fill();
          ctx.restore();
        } else {
          // Differentiated Chondrocyte Morphology (Fig. 4 Row 3 Core/Hypoxic Insets):
          // Enlarged rounded cells in isogenous clusters with pericellular matrix (PCM) lacuna halo!
          const haloRadius = (4.2 + 3.2 * chonFrac + 1.4 * Math.min(1, sgagVal)) * Math.min(1.15, seedingFactor);

          // Pericellular Matrix (PCM / Lacuna) Halo
          ctx.beginPath();
          ctx.arc(sx, sy, haloRadius, 0, Math.PI * 2);
          if (fieldConfig.mode === 'sgag') {
            ctx.fillStyle = `rgba(14, 116, 144, ${alpha * 0.28})`;
            ctx.strokeStyle = `rgba(224, 242, 254, ${alpha * 0.75})`;
          } else if (fieldConfig.mode === 'collagen') {
            ctx.fillStyle = `rgba(190, 18, 60, ${alpha * 0.22})`;
            ctx.strokeStyle = `rgba(255, 228, 230, ${alpha * 0.75})`;
          } else {
            ctx.fillStyle = `rgba(254, 243, 199, ${alpha * 0.28})`;
            ctx.strokeStyle = `rgba(253, 224, 71, ${alpha * 0.72})`;
          }
          ctx.lineWidth = 1.0;
          ctx.fill();
          ctx.stroke();

          // Number of clustered chondrocytes inside lacuna (1 -> 2 -> 3 as chonFrac increases)
          const nCluster = chonFrac > 0.72 ? 3 : (chonFrac > 0.48 ? 2 : 1);
          const cellR = 2.0 + 0.7 * chonFrac;
          const baseAng = (seed % 12) * (Math.PI / 6);

          for (let k = 0; k < nCluster; k++) {
            const cAng = baseAng + (k * Math.PI * 2) / nCluster;
            const dist = nCluster === 1 ? 0 : cellR * 0.85;
            const cxCell = sx + Math.cos(cAng) * dist;
            const cyCell = sy + Math.sin(cAng) * dist;

            // Rounded chondrocyte soma (stained golden-brown for Collagen Type II / DAB)
            ctx.beginPath();
            ctx.arc(cxCell, cyCell, cellR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(245, 158, 11, ${alpha * 0.88})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(120, 53, 15, ${alpha * 0.85})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Chondrocyte nucleus
            ctx.beginPath();
            ctx.arc(cxCell, cyCell, 0.85, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(69, 26, 3, ${alpha})`;
            ctx.fill();
          }
        }
      }
    }

    ctx.restore();
  }

  /**
   * Highlight Centerline (r = 0), Central Radial Line (y = H/2), and Global Min O₂ at (0, 0)
   */
  _drawProfileGuideLines(ctx, data, p) {
    ctx.save();

    // Central Radial Guide Line at y = H/2 (Fig. 1B horizontal arrow)
    const midY = p.y + p.h * 0.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(p.x, midY);
    ctx.lineTo(p.x + p.w, midY);
    ctx.stroke();

    // Global Minimum Oxygen Marker at Bottom Core (r = 0, y = 0)
    const minO2 = this._sampleGridBilinear(data.grids.o2, 0, 0);
    const bx = p.x + 2;
    const by = p.y + p.h - 2;

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Small callout tag for Bottom Core Min O2
    const minTag = `Core Min O₂: ${minO2.toFixed(1)}%`;
    ctx.font = '600 9px "JetBrains Mono", monospace';
    const tw = ctx.measureText(minTag).width + 10;
    const tx = p.x + 10;
    const ty = p.y + p.h - 20;
    this._roundRect(ctx, tx, ty, tw, 15, 4);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#e0f2fe';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(minTag, tx + 5, ty + 7.5);

    ctx.restore();
  }

  /**
   * Draw Biopsy-Punch Subregion Sectioning Grid & Live Value Pill Tags (Fig. 1A & Table 1)
   */
  _drawSubregionsOverlay(ctx, data, p) {
    const { subregions, fieldConfig } = data;
    if (!subregions || !subregions.length) return;

    ctx.save();

    // 1. Dashed biopsy punch boundaries
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 4]);

    // Draw dark shadow pass for contrast on bright histology stains
    const drawBoundaries = (strokeStyle, lineWidth) => {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      for (const sub of subregions) {
        const x0 = p.x + (sub.rMin / data.R) * p.w;
        const x1 = p.x + (sub.rMax / data.R) * p.w;
        const y0 = p.y + (1 - sub.yMax / data.H) * p.h;
        const y1 = p.y + (1 - sub.yMin / data.H) * p.h;
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
      }
      ctx.stroke();
    };

    drawBoundaries('rgba(15, 23, 42, 0.55)', 2.8);
    drawBoundaries('rgba(255, 255, 255, 0.92)', 1.5);
    ctx.setLineDash([]);

    // 2. Subregion Pill Tags at each subregion centroid
    for (const sub of subregions) {
      const cx = p.x + ((sub.rMin + sub.rMax) * 0.5 / data.R) * p.w;
      const cy = p.y + (1 - ((sub.yMin + sub.yMax) * 0.5 / data.H)) * p.h;

      let val = sub.o2Pct;
      if (fieldConfig.mode === 'sgag') val = sub.sgagPct;
      else if (fieldConfig.mode === 'collagen') val = sub.collagenPct;
      else if (fieldConfig.mode === 'cells') val = sub.chondroPct;

      const valStr = fieldConfig.format(val);
      const pillText = `${sub.code}: ${valStr}`;

      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      const tw = ctx.measureText(pillText).width + 12;
      const th = 18;

      this._roundRect(ctx, cx - tw * 0.5, cy - th * 0.5, tw, th, 5);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.80)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, cx, cy + 0.5);
    }

    ctx.restore();
  }

  /**
   * Draw Physical Millimeter Axes, Ticks, and Boundary Condition Callouts on 2D Half-Section
   */
  _draw2DAxesAndBoundaries(ctx, data, p) {
    ctx.save();

    // Crisp outer border of 2D cross-section
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(p.x, p.y, p.w, p.h);

    // Highlight symmetry axis (left edge r = 0) with a dashed accent line
    ctx.save();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y + p.h);
    ctx.stroke();
    ctx.restore();

    // Highlight impermeable bottom plate (bottom edge y = 0) with hatch ticks
    ctx.save();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + p.h);
    ctx.lineTo(p.x + p.w, p.y + p.h);
    ctx.stroke();
    ctx.restore();

    // Bottom X-Axis: Construct Radius r (mm) ∈ [0, R] (Figs. 2A–B, 3A–B)
    const nTicksR = Math.min(6, Math.max(4, Math.round(data.R * 2)));
    ctx.font = '600 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i <= nTicksR; i++) {
      const frac = i / nTicksR;
      const rVal = frac * data.R;
      const tx = p.x + frac * p.w;
      const ty = p.y + p.h;

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx, ty + 5);
      ctx.stroke();

      ctx.fillText(rVal.toFixed(rVal % 1 === 0 ? 1 : 2), tx, ty + 7);
    }

    ctx.font = '700 10.5px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(
      `Construct Radius r (mm)  [r = 0 Centerline → r = ${data.R.toFixed(2)} mm Outer Edge]`,
      p.x + p.w * 0.5,
      p.y + p.h + 23
    );

    // Top X-Axis Boundary Label: Free Top Surface (y = H, C_ox = C_ext)
    ctx.font = '600 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#be123c';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `Top Free Surface (y = ${data.H.toFixed(2)} mm, Depth z = 0): C_ox = ${data.externalO2.toFixed(1)}% O₂`,
      p.x + p.w * 0.5,
      p.y - 6
    );

    // Left Y-Axis: Construct Height y (mm) ∈ [0, H] (Figs. 2A–B, 3A–B)
    const nTicksH = Math.min(6, Math.max(3, Math.round(data.H * 2)));
    ctx.font = '600 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= nTicksH; i++) {
      const frac = i / nTicksH;
      const yVal = frac * data.H;
      const ty = p.y + (1 - frac) * p.h;

      ctx.beginPath();
      ctx.moveTo(p.x - 5, ty);
      ctx.lineTo(p.x, ty);
      ctx.stroke();

      ctx.fillText(yVal.toFixed(2), p.x - 8, ty);
    }

    // Rotated Left Y-Axis Label
    ctx.save();
    ctx.translate(p.x - 42, p.y + p.h * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '700 10.5px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Construct Height y (mm)', 0, 0);
    ctx.restore();

    // Right Edge Boundary Label (r = R: Radial Media Interface)
    ctx.save();
    ctx.translate(p.x + p.w + 15, p.y + p.h * 0.5);
    ctx.rotate(Math.PI / 2);
    ctx.font = '600 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#be123c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Outer Radial Edge (r = R): C_ox = ${data.externalO2.toFixed(1)}% O₂`, 0, 0);
    ctx.restore();

    ctx.restore();
  }

  /**
   * Draw Vertical Scientific Colorbar on the Right Side of the 2D Viewport
   */
  _drawColorbar(ctx, data, cb) {
    const { fieldConfig } = data;
    ctx.save();

    // Render vertical gradient bar pixel-by-pixel for exact colormap fidelity
    const steps = 64;
    const stepH = cb.h / steps;
    for (let i = 0; i < steps; i++) {
      const frac = 1 - (i / (steps - 1));
      const val = fieldConfig.minVal + frac * (fieldConfig.maxVal - fieldConfig.minVal);
      const rgb = this._mapValueToRGB(val, fieldConfig, 70);
      ctx.fillStyle = this._rgbToCss(rgb);
      ctx.fillRect(cb.x, cb.y + i * stepH, cb.w, Math.ceil(stepH) + 0.5);
    }

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cb.x, cb.y, cb.w, cb.h);

    // Colorbar Title at Top
    ctx.font = '700 9.5px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(fieldConfig.colorbarTitle, cb.x + cb.w * 0.5, cb.y - 7);

    // Ticks & Numeric Labels on Right of Colorbar
    ctx.font = '600 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (const tickVal of fieldConfig.ticks) {
      const frac = (tickVal - fieldConfig.minVal) / Math.max(1e-9, fieldConfig.maxVal - fieldConfig.minVal);
      const ty = cb.y + (1 - frac) * cb.h;

      ctx.beginPath();
      ctx.moveTo(cb.x + cb.w, ty);
      ctx.lineTo(cb.x + cb.w + 4, ty);
      ctx.stroke();

      const decimals = fieldConfig.mode === 'o2' || fieldConfig.mode === 'cells'
        ? (tickVal % 1 === 0 ? 0 : 1)
        : 2;
      ctx.fillText(tickVal.toFixed(decimals), cb.x + cb.w + 6, ty);
    }

    // Live Indicator Triangle on Colorbar when hovering on 2D cross-section
    if (this.hoverProbe) {
      let probeVal = this.hoverProbe.o2Pct;
      if (fieldConfig.mode === 'sgag') probeVal = this.hoverProbe.sgagPct;
      else if (fieldConfig.mode === 'collagen') probeVal = this.hoverProbe.collagenPct;
      else if (fieldConfig.mode === 'cells') probeVal = this.hoverProbe.chondroPct;

      const frac = Math.max(0, Math.min(1, (probeVal - fieldConfig.minVal) / Math.max(1e-9, fieldConfig.maxVal - fieldConfig.minVal)));
      const py = cb.y + (1 - frac) * cb.h;

      ctx.beginPath();
      ctx.moveTo(cb.x - 1, py);
      ctx.lineTo(cb.x - 7, py - 4.5);
      ctx.lineTo(cb.x - 7, py + 4.5);
      ctx.closePath();
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ===========================================================================
  // INTERACTIVE MOUSE HOVER CROSSHAIR & GLASSMORPHIC TOOLTIP
  // ===========================================================================

  _drawHoverProbeOverlay(ctx, data, probe) {
    const p = this._layout.plot2D;
    const rFrac = Math.max(0, Math.min(1, probe.r / Math.max(1e-6, data.R)));
    const yFrac = Math.max(0, Math.min(1, probe.y / Math.max(1e-6, data.H)));

    const px = p.x + rFrac * p.w;
    const py = p.y + (1 - yFrac) * p.h;

    ctx.save();

    // 1. Precision Crosshair inside plot2D
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(px, p.y);
    ctx.lineTo(px, p.y + p.h);
    ctx.moveTo(p.x, py);
    ctx.lineTo(p.x + p.w, py);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px, p.y);
    ctx.lineTo(px, p.y + p.h);
    ctx.moveTo(p.x, py);
    ctx.lineTo(p.x + p.w, py);
    ctx.stroke();
    ctx.setLineDash([]);

    // Target bullseye at (px, py)
    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.restore();

    // 2. Floating Glassmorphic Tooltip Card
    const cardW = 224;
    const cardH = 148;
    let tx = px + 16;
    let ty = py - cardH - 12;

    if (tx + cardW > this.width - 14) {
      tx = px - cardW - 16;
    }
    if (ty < 48) {
      ty = Math.min(this.height - cardH - 52, py + 14);
    }

    // Shadow & Glass Card
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.28)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    this._roundRect(ctx, tx, ty, cardW, cardH, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fill();
    ctx.restore();

    this._roundRect(ctx, tx, ty, cardW, cardH, 8);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Tooltip Header: Coordinates & Subregion Badge
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `r = ${probe.r.toFixed(2)} mm · y = ${probe.y.toFixed(2)} mm`,
      tx + 10,
      ty + 9
    );

    // Subregion pill on top-right of tooltip
    const subTag = probe.subregion || 'Total';
    const subW = ctx.measureText(subTag).width + 10;
    this._roundRect(ctx, tx + cardW - subW - 9, ty + 7, subW, 15, 4);
    ctx.fillStyle = 'rgba(2, 132, 199, 0.35)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#e0f2fe';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(subTag, tx + cardW - subW * 0.5 - 9, ty + 14.5);

    // Divider line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx + 10, ty + 27);
    ctx.lineTo(tx + cardW - 10, ty + 27);
    ctx.stroke();

    // Rows of quantitative readouts
    const rows = [
      { label: 'Depth from Top (z):', val: `${probe.depth.toFixed(2)} mm`, color: '#cbd5e1' },
      { label: 'Local Oxygen (O₂):', val: `${probe.o2Pct.toFixed(2)}% (${(probe.o2Molar * 1000).toFixed(0)} µM)`, color: '#7dd3fc' },
      { label: 'Chondrocyte / MSC:', val: `${probe.chondroPct.toFixed(1)}% / ${probe.mscPct.toFixed(1)}%`, color: '#fcd34d' },
      { label: 'Viable DNA Content:', val: `${probe.dna.toFixed(1)} ng/mg w/w`, color: '#86efac' },
      { label: 'sGAG (Alcian Blue):', val: `${probe.sgagPct.toFixed(2)}% w/w (${probe.sgagPerDna.toFixed(0)} µg/µg)`, color: '#93c5fd' },
      { label: 'Collagen (Picrosirius):', val: `${probe.collagenPct.toFixed(2)}% w/w (${probe.collagenPerDna.toFixed(0)} µg/µg)`, color: '#fda4af' }
    ];

    let ry = ty + 34;
    for (const row of rows) {
      ctx.font = '500 9.5px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(row.label, tx + 10, ry);

      ctx.font = '600 9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = row.color;
      ctx.textAlign = 'right';
      ctx.fillText(row.val, tx + cardW - 10, ry);
      ry += 18;
    }

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}
