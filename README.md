# Construct Scale, Oxygen Transport & MSC Chondrogenesis Simulator
**Interactive 2D Axisymmetric Reaction–Diffusion PDE Solver, Spatial ECM Synthesis (sGAG / Collagen), Subregion Biochemical Assay, and Unconfined Compression Biomechanics Simulator**  
*Developed for **LTU Cellular Mechanobiology (BME 5313 / 6303)** — Dr. Eric G. Meyer, Experimental Biomechanics Laboratory (EBL), Lawrence Technological University.*  
*Based on **Buckley, C. T., Meyer, E. G., & Kelly, D. J. (2012)**, "The Influence of Construct Scale on the Composition and Functional Properties of Cartilaginous Tissues Engineered Using Bone Marrow-Derived Mesenchymal Stem Cells," **Tissue Engineering Part A**, 18(3–4), 382–396.*

🌐 **Live Web Application**: [https://ltuebl.github.io/CartilageScaleSimulation/](https://ltuebl.github.io/CartilageScaleSimulation/)

---

## Pedagogical & Bioengineering Overview

Engineering functional articular cartilage grafts using **bone marrow-derived mesenchymal stem cells (MSCs)** encapsulated in 3D hydrogels (such as $2\%\text{ w/v}$ agarose) presents a critical **scale-up challenge**. While small laboratory cylindrical constructs ($\varnothing 4\times 1.5\text{ mm}$ or $\varnothing 5\times 3.0\text{ mm}$) achieve relatively uniform nutrient and oxygen transport, clinically relevant osteochondral defects require scaling up construct thickness and diameter ($\varnothing 6\times 4.5\text{ mm}$, $\varnothing 8\times 4.5\text{ mm}$, and larger).

In **Buckley, Meyer, & Kelly (2012)**, MSC-seeded $2\%$ agarose constructs ($15\times 10^6\text{ cells/mL}$) were cultured for 42 days in chondrogenic medium ($\text{TGF-}\beta 3$) across four cylindrical scales under either normoxic ($20\%\text{ O}_2$) or low-oxygen ($5\%\text{ O}_2$) external incubator conditions:
1. **$\varnothing 4.0 \times 1.5\text{ mm}$** (Volume $18.8\text{ mm}^3$, 24-well plate, $1.0\text{ mL}$ medium)
2. **$\varnothing 5.0 \times 3.0\text{ mm}$** (Volume $58.9\text{ mm}^3$, 12-well plate, $2.5\text{ mL}$ medium)
3. **$\varnothing 6.0 \times 4.5\text{ mm}$** (Volume $127.2\text{ mm}^3$, 6-well plate, $6.2\text{ mL}$ medium)
4. **$\varnothing 8.0 \times 4.5\text{ mm}$** (Volume $226.2\text{ mm}^3$, 6-well plate, $9.0\text{ mL}$ medium)

Unlike differentiated articular chondrocytes—where both sulfated glycosaminoglycans (sGAG) and collagen accumulate preferentially at the well-oxygenated construct periphery—**MSC-seeded hydrogels exhibit a paradoxical spatial divergence**:
* **sGAG peaks in the hypoxic construct core** ($\text{TC} / \text{BC}$), because moderate self-induced physiological hypoxia ($\sim 5\text{–}12\%\text{ O}_2$) stabilizes $\text{HIF-1}\alpha$ and accelerates $\text{SOX9}$-driven MSC chondrogenesis and aggrecan synthesis.
* **Collagen peaks in the normoxic outer annulus** ($\text{TA} / \text{BA}$), because post-translational hydroxylation of proline and lysine residues by prolyl-4-hydroxylase and lysyl oxidase requires molecular $\text{O}_2$ to form stable triple-helical collagen fibrils.

This interactive simulator allows students in **BME 5313 / 6303** to solve the exact axisymmetric reaction–diffusion PDE in real time, inspect virtual histological sections (Alcian Blue, Picrosirius Red, and Collagen II / phenotype commitment), compare cored subregion biochemical assays against **Table 1** of the paper, and explore structure–function correlations between ECM composition and compressive moduli ($E_{\text{eq}}$ and $E_{\text{dyn}}$).

---

## Complete Theoretical & Mathematical Framework

### 1. Axisymmetric Michaelis–Menten Reaction–Diffusion PDE (Eqs. 1–3)
Within a cylindrical cell-seeded hydrogel construct of radius $R = \varnothing / 2$ and height $H$, the local molar concentration of dissolved oxygen $C_{\text{ox}}(r, z, t)$ ($\text{mol/m}^3$) is governed by Fickian diffusion coupled with nonlinear Michaelis–Menten cellular respiration (**Equation 1**):

$$\frac{\partial C_{\text{ox}}}{\partial t} = \nabla \cdot \left(D_{\text{construct}} \nabla C_{\text{ox}}\right) - n_{\text{cell}}\,\frac{V_{\max}\,C_{\text{ox}}}{K_m + C_{\text{ox}}}$$

In axisymmetric cylindrical coordinates $(r, z)$ at quasi-steady state ($\partial C_{\text{ox}} / \partial t = 0$):

$$D_{\text{construct}}\left(\frac{\partial^2 C_{\text{ox}}}{\partial r^2} + \frac{1}{r}\frac{\partial C_{\text{ox}}}{\partial r} + \frac{\partial^2 C_{\text{ox}}}{\partial z^2}\right) = n_{\text{cell}}\,\frac{V_{\max}\,C_{\text{ox}}}{K_m + C_{\text{ox}}}$$

At the central symmetry axis ($r = 0$), L'Hôpital's rule gives $\lim_{r \to 0} \frac{1}{r}\frac{\partial C_{\text{ox}}}{\partial r} = \frac{\partial^2 C_{\text{ox}}}{\partial r^2}$, so the radial Laplacian becomes $2\frac{\partial^2 C_{\text{ox}}}{\partial r^2}$.

---

### 2. Hydrogel Obstruction Diffusivity — Mackie & Meares Relation (Eq. 2)
The effective oxygen diffusivity $D_{\text{construct}}$ through a hydrogel of polymer volume fraction $\phi_f$ (where $\phi_f = 0.02$ for $2\%\text{ w/v}$ agarose) is modeled using the **Mackie and Meares (1955)** obstruction equation (**Equation 2**):

$$D_{\text{construct}} = D_{\text{H}_2\text{O}}\,\frac{(1 - \phi_f)^2}{(1 + \phi_f)^2}$$

* Free-solution oxygen diffusivity in culture medium at $37^\circ\text{C}$: $D_{\text{H}_2\text{O}} = 3.0 \times 10^{-9}\text{ m}^2/\text{s}$
* Effective diffusivity in $2\%\text{ w/v}$ agarose ($\phi_f = 0.02$):
  $$D_{\text{construct}} = 3.0 \times 10^{-9}\,\frac{(0.98)^2}{(1.02)^2} \approx 2.77 \times 10^{-9}\text{ m}^2/\text{s} \quad (92.4\%\text{ of } D_{\text{H}_2\text{O}})$$

---

### 3. Michaelis–Menten Cellular Oxygen Uptake Kinetics (Eq. 3)
The local volumetric oxygen consumption rate $R_{\text{ox}}$ ($\text{mol}\cdot\text{m}^{-3}\cdot\text{s}^{-1}$) follows Michaelis–Menten saturation kinetics (**Equation 3**):

$$R_{\text{ox}}(C_{\text{ox}}) = n_{\text{cell}}\,\frac{V_{\max}\,C_{\text{ox}}}{K_m + C_{\text{ox}}}$$

| Parameter | Symbol | Paper Value (Buckley et al. 2012) | Physical Interpretation |
| :--- | :---: | :--- | :--- |
| **Cell Seeding Density** | $n_{\text{cell}}$ | $15 \times 10^6\text{ cells/mL} = 1.5 \times 10^{13}\text{ cells/m}^3$ | Homogeneous initial encapsulation density in agarose |
| **Chondrocyte Max Uptake** | $V_{\max}$ ($1\times$) | $18.7\text{ fmol/h/cell} = 5.194 \times 10^{-18}\text{ mol/s/cell}$ | Baseline maximum $\text{O}_2$ consumption rate for committed chondrocytes |
| **Undifferentiated MSC Uptake** | $2\times V_{\max}$ | $37.4\text{ fmol/h/cell} = 1.039 \times 10^{-17}\text{ mol/s/cell}$ | Elevated metabolic $\text{O}_2$ uptake rate of uncommitted MSCs prior to chondrogenesis |
| **Michaelis–Menten Constant** | $K_m$ | $6.3 \times 10^{-3}\text{ mol/m}^3 \approx 0.64\%\text{ O}_2$ | Oxygen concentration at half-maximal cellular consumption ($R_{\text{ox}} = \frac{1}{2}n_{\text{cell}}V_{\max}$) |
| **Henry's Law Solubility ($37^\circ\text{C}$)** | $C_{\text{ext}}$ | $0.197\text{ mol/m}^3$ at $20\%\text{ O}_2$<br>$0.0493\text{ mol/m}^3$ at $5\%\text{ O}_2$ | Dissolved molar $\text{O}_2$ at exposed top and lateral surfaces ($0.00985\text{ mol/m}^3\text{ per }\%\text{ O}_2$) |

The dimensionless **Thiele Modulus** $\Phi^2$ characterizes the ratio of maximum cellular reaction rate to diffusive transport rate:

$$\Phi^2 = \frac{R^2\,n_{\text{cell}}\,V_{\max}}{D_{\text{construct}}\,C_{\text{ext}}}$$

When $\Phi^2 \ll 1$, diffusion dominates and internal oxygen gradients are shallow; when $\Phi^2 \gtrsim 1$, reaction outpaces diffusion and steep core hypoxia or anoxia ($C_{\text{ox}} \to 0$) develops.

---

### 4. Boundary Conditions & The Impermeable Culture Dish Base (Figs. 1–3)
As illustrated in **Figure 1B** of Buckley, Meyer, & Kelly (2012), constructs rest freely at the bottom of standard polystyrene tissue culture wells:
1. **Top Exposed Surface ($z = H$, $0 \le r \le R$):** Dirichlet boundary condition exposed to culture medium, $C_{\text{ox}}(r, H) = C_{\text{ext}}$.
2. **Outer Lateral Wall ($r = R$, $0 \le z \le H$):** Dirichlet boundary condition exposed to culture medium, $C_{\text{ox}}(R, z) = C_{\text{ext}}$.
3. **Central Axis of Symmetry ($r = 0$, $0 \le z \le H$):** Zero radial flux, $\left.\frac{\partial C_{\text{ox}}}{\partial r}\right|_{r=0} = 0$.
4. **Bottom Culture Dish Base ($z = 0$, $0 \le r \le R$):** Impermeable polystyrene dish base enforcing a zero-flux Neumann boundary condition:
   $$\left.\frac{\partial C_{\text{ox}}}{\partial z}\right|_{z=0} = 0$$

> **Key Physical Insight:** Because oxygen cannot diffuse through the bottom dish surface ($z = 0$), the axial oxygen profile along the centerline ($r = 0$, depth $z_{\text{depth}} = H - z \in [0, H]$) is **asymmetric** and decreases monotonically all the way to the dish floor. Consequently, the **Global Minimum Oxygen Tension always occurs at the Bottom Core $(r = 0, z = 0)$**!

---

## Experimental Benchmarks from Table 1 & Figs. 2–7 (Buckley, Meyer & Kelly 2012)

### Whole-Construct Day 42 Experimental Values ($15 \times 10^6\text{ MSCs/mL}$)

| Construct Scale & $\text{O}_2$ | Core Min $\text{O}_2$ ($1\times V_{\max}$) | Total DNA ($\text{ng/mg}$) | Total sGAG ($\%\text{ w/w}$) | sGAG/DNA ($\mu\text{g}/\mu\text{g}$) | Total Collagen ($\%\text{ w/w}$) | Collagen/DNA ($\mu\text{g}/\mu\text{g}$) | $E_{\text{eq}}$ ($\text{kPa}$) | $E_{\text{dyn}}$ ($\text{kPa}$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **$\varnothing 4\times 1.5\text{ mm}$ ($20\%\text{ O}_2$)** | $18.2\%$ | $75.39 \pm 7.19$ | $0.14 \pm 0.00$ | $18.72 \pm 2.03$ | $0.31 \pm 0.01$ | $40.80 \pm 4.98$ | $23.5$ | $90.81$ |
| **$\varnothing 5\times 3.0\text{ mm}$ ($20\%\text{ O}_2$)** | $16.3\%$ | $64.80 \pm 2.10$ | $0.51 \pm 0.03$ | $79.5$ | $0.56 \pm 0.04$ | $87.0$ | $23.2$ | $163.0$ |
| **$\varnothing 6\times 4.5\text{ mm}$ ($20\%\text{ O}_2$)** | $14.3\%$ | $62.50 \pm 2.20$ | $0.75 \pm 0.03$ | $120.0$ | $1.01 \pm 0.19$ | $161.5$ | $26.8$ | $215.0$ |
| **$\varnothing 8\times 4.5\text{ mm}$ ($20\%\text{ O}_2$)** | $10.8\%$ ($2.6\%$ at $2\times V_{\max}$) | $48.20 \pm 5.50$ | $0.88 \pm 0.04$ | $185.0$ | $1.62 \pm 0.17$ | $262.0$ | $36.52 \pm 2.12$ | $327.51 \pm 30.3$ |
| **$\varnothing 5\times 3.0\text{ mm}$ ($5\%\text{ O}_2$)** | $1.9\%$ ($0.26\%$ at $2\times V_{\max}$) | $61.80 \pm 7.50$ | $1.16 \pm 0.10$ | $190.0$ | $2.22 \pm 0.25$ | $368.0$ | $33.0$ | $310.0$ ($1.9\times$) |
| **$\varnothing 6\times 4.5\text{ mm}$ ($5\%\text{ O}_2$)** | $0.7\%$ | $51.80 \pm 1.50$ | $1.21 \pm 0.06$ | $233.0$ | $0.69 \pm 0.10$ | $134.0$ | $38.5$ | $335.0$ |

### Subregion Biochemical Benchmarks from Table 1 (Day 42)

At Day 42 under $20\%\text{ O}_2$ and $5\%\text{ O}_2$ culture, constructs were cored using concentric biopsy punches and bisected horizontally into **Top Annulus (TA)**, **Bottom Annulus (BA)**, **Top Core (TC)**, and **Bottom Core (BC)** subregions (plus **Top/Bottom Inner Annulus TIA/BIA** for $\varnothing 8\times 4.5\text{ mm}$ constructs):

| Construct Scale & $\text{O}_2$ | Subregion | DNA ($\text{ng/mg}$) | sGAG ($\%\text{ w/w}$) | sGAG/DNA ($\mu\text{g}/\mu\text{g}$) | Collagen ($\%\text{ w/w}$) | Collagen/DNA ($\mu\text{g}/\mu\text{g}$) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **$\varnothing 4\times 1.5\text{ mm}$ ($20\%\text{ O}_2$)** | **Total** | $75.39 \pm 7.19$ | $0.14 \pm 0.00$ | $18.72 \pm 2.03$ | $0.31 \pm 0.01$ | $40.80 \pm 4.98$ |
| **$\varnothing 5\times 3.0\text{ mm}$ ($20\%\text{ O}_2$)** | **TA** | $73.04 \pm 10.67$ | $0.21 \pm 0.01$ | $28.92 \pm 3.39$ | $0.23 \pm 0.07$ | $31.76 \pm 5.67$ |
| | **TC** | $57.87 \pm 4.01$ | $0.58 \pm 0.03$ | $100.33 \pm 10.48$ | $0.77 \pm 0.08$ | $132.62 \pm 7.91$ |
| | **BA** | $71.76 \pm 8.26$ | $0.31 \pm 0.02$ | $43.62 \pm 3.27$ | $0.43 \pm 0.03$ | $61.10 \pm 7.93$ |
| | **BC** | $48.53 \pm 5.19$ | $1.07 \pm 0.13$ | $223.56 \pm 39.06$ | $1.00 \pm 0.08$ | $208.30 \pm 7.50$ |
| | **Total** | $64.80 \pm 2.10$ | $0.51 \pm 0.03$ | $79.5$ | $0.56 \pm 0.04$ | $87.0$ |
| **$\varnothing 5\times 3.0\text{ mm}$ ($5\%\text{ O}_2$)** | **TA** | $67.50 \pm 3.32$ | $0.98 \pm 0.10$ | $144.13 \pm 7.62$ | $2.73 \pm 0.41$ | $406.72 \pm 72.02$ |
| | **TC** | $69.06 \pm 9.82$ | $1.31 \pm 0.15$ | $190.05 \pm 7.23$ | $1.92 \pm 0.68$ | $276.27 \pm 86.47$ |
| | **BA** | $63.51 \pm 9.24$ | $1.06 \pm 0.09$ | $168.69 \pm 21.36$ | $2.11 \pm 0.27$ | $337.42 \pm 63.62$ |
| | **BC** | $43.91 \pm 14.06$ | $1.36 \pm 0.16$ | $322.75 \pm 63.92$ | $1.88 \pm 0.37$ | $466.25 \pm 182.04$ |
| | **Total** | $61.80 \pm 7.50$ | $1.16 \pm 0.10$ | $190.0$ | $2.22 \pm 0.25$ | $368.0$ |
| **$\varnothing 6\times 4.5\text{ mm}$ ($20\%\text{ O}_2$)** | **TA** | $61.48 \pm 3.93$ | $0.32 \pm 0.02$ | $52.25 \pm 2.41$ | $0.60 \pm 0.16$ | $97.51 \pm 22.07$ |
| | **TC** | $71.67 \pm 5.63$ | $0.97 \pm 0.03$ | $204.69 \pm 13.72$ | $1.43 \pm 0.02$ | $300.42 \pm 18.94$ |
| | **BA** | $68.53 \pm 6.12$ | $0.44 \pm 0.02$ | $64.96 \pm 8.25$ | $0.89 \pm 0.56$ | $127.74 \pm 70.76$ |
| | **BC** | $47.49 \pm 3.12$ | $1.34 \pm 0.07$ | $188.56 \pm 19.62$ | $1.17 \pm 0.19$ | $163.32 \pm 14.24$ |
| | **Total** | $62.50 \pm 2.20$ | $0.75 \pm 0.03$ | $120.0$ | $1.01 \pm 0.19$ | $161.5$ |
| **$\varnothing 6\times 4.5\text{ mm}$ ($5\%\text{ O}_2$)** | **TA** | $45.61 \pm 4.11$ | $1.06 \pm 0.05$ | $232.36 \pm 22.09$ | $0.41 \pm 0.14$ | $92.36 \pm 38.12$ |
| | **TC** | $65.52 \pm 8.35$ | $1.40 \pm 0.05$ | $217.04 \pm 32.82$ | $0.88 \pm 0.12$ | $136.46 \pm 27.43$ |
| | **BA** | $57.71 \pm 6.08$ | $1.06 \pm 0.02$ | $185.97 \pm 18.73$ | $0.60 \pm 0.03$ | $103.78 \pm 6.07$ |
| | **BC** | $36.79 \pm 12.86$ | $1.35 \pm 0.04$ | $400.44 \pm 138.74$ | $0.99 \pm 0.17$ | $285.60 \pm 88.53$ |
| | **Total** | $51.80 \pm 1.50$ | $1.21 \pm 0.06$ | $233.0$ | $0.69 \pm 0.10$ | $134.0$ |
| **$\varnothing 8\times 4.5\text{ mm}$ ($20\%\text{ O}_2$)** | **TA** | $83.24 \pm 6.65$ | $0.62 \pm 0.01$ | $74.15 \pm 6.91$ | $2.79 \pm 0.74$ | $332.04 \pm 62.58$ |
| | **TIA** | $45.46 \pm 13.80$ | $0.76 \pm 0.09$ | $173.04 \pm 33.80$ | $0.71 \pm 0.23$ | $156.95 \pm 24.87$ |
| | **TC** | $53.17 \pm 18.09$ | $1.18 \pm 0.06$ | $236.63 \pm 65.68$ | $0.74 \pm 0.13$ | $146.00 \pm 42.41$ |
| | **BA** | $64.28 \pm 21.05$ | $0.88 \pm 0.11$ | $72.27 \pm 18.77$ | $2.89 \pm 0.71$ | $487.72 \pm 191.07$ |
| | **BIA** | $21.87 \pm 0.63$ | $0.86 \pm 0.03$ | $391.80 \pm 2.68$ | $0.44 \pm 0.10$ | $202.45 \pm 48.47$ |
| | **BC** | $33.26 \pm 10.78$ | $1.19 \pm 0.01$ | $389.07 \pm 150.81$ | $0.46 \pm 0.18$ | $190.39 \pm 72.11$ |
| | **Total** | $48.20 \pm 5.50$ | $0.88 \pm 0.04$ | $185.0$ | $1.62 \pm 0.17$ | $262.0$ |

---

## Interactive Simulator Architecture & Features

### 🖥️ Dual-Viewport 3D + 2D Axisymmetric Canvas (`renderer.js`)
* **Left Viewport (3D Cutaway Hydrogel in Polystyrene Culture Well, Fig. 1A–B):**
  * Interactive 3D cylindrical construct submerged in translucent phenol-red $\text{hgDMEM + TGF-}\beta 3$ medium inside a scaled 24-well, 12-well, or 6-well plate.
  * $90^\circ$ wedge cutaway exposing the internal $(r, z)$ reaction–diffusion plane with dashed **Centerline ($r=0$)** and **Central Radial ($z=H/2$)** profile guide lines and boundary condition callouts.
  * Drag horizontally/vertically to orbit the 3D cylinder in real time.
* **Right Viewport (High-Resolution Bilinearly Interpolated $r\text{–}z$ Cross-Section, Figs. 2–4 & 6D):**
  * **4 Histological & Biophysical Field Modes:**
    1. **$\text{O}_2$ Tension ($\%$):** COMSOL Multiphysics Jet/Rainbow colormap reproducing Figs. 2A–B ($20\%\text{ O}_2$) and Figs. 3A–B ($5\%\text{ O}_2$).
    2. **sGAG (Alcian Blue):** Virtual Alcian Blue 8GX histological staining (% wet weight) reproducing Fig. 4 Row 1.
    3. **Collagen (Picrosirius Red):** Virtual Picrosirius Red histological staining (% wet weight) reproducing Fig. 4 Row 2.
    4. **MSC $\to$ Chondrocyte & DNA:** Spatial lineage commitment (% differentiated chondrocytes vs. spindle MSCs) and local cell viability reproducing Fig. 4 Row 3.
  * **Toggleable Scientific Overlays:** Biopsy punch subregion grid ($\text{TA, BA, TIA, BIA, TC, BC}$), marching-squares iso-concentration contours, inward Fickian $\text{O}_2$ flux arrows ($-D\nabla C_{\text{ox}}$), and discrete cell morphologies (spindle MSCs vs. rounded chondrocytes in pericellular lacunae).
  * **Interactive Crosshair Probe:** Hover anywhere on the 2D section to inspect local $(r, z)$, depth from top surface, radial depth, subregion ID, $C_{\text{ox}}$ ($\%$ and $\text{mol/m}^3$), sGAG, Collagen, DNA, and chondrocyte fraction, with a synchronized 3D marker on the cutaway cylinder.

---

### 📊 Four Pedagogical Analytical Tabs & 8 Interactive Charts (`app.js`)
1. **Tab 1 — $\text{O}_2$ Reaction–Diffusion PDE (`Figs. 1–3 COMSOL`):**
   * Live verification strip displaying Mackie–Meares diffusivity $D_{\text{construct}}$, maximum volumetric sink $n_{\text{cell}}V_{\max}$, Thiele modulus $\Phi^2$, and bottom-core oxygen $C_{\text{ox}}(0,0)$.
   * **Chart 1A (`#chart-o2-centerline`):** Axial centerline oxygen profile ($r=0$, depth $z_{\text{depth}} \in [0, H]$) comparing active $V_{\max}$, $1\times V_{\max}$ ($18.7$), $2\times V_{\max}$ ($37.4$), and all four paper construct scales ($\varnothing 4\times 1.5$ to $\varnothing 8\times 4.5\text{ mm}$, Figs. 2C/E & 3C/E).
   * **Chart 1B (`#chart-o2-radial`):** Mid-height radial oxygen profile ($z=H/2$, radial depth $d_r = R - r \in [0, R]$) from outer radial wall to center across construct scales (Figs. 2D/F & 3D/F).
2. **Tab 2 — Spatial ECM & Subregions (`Figs. 4–6 & Table 1`):**
   * Live subregion biochemical table ($\text{TA, BA, TIA, BIA, TC, BC, Total}$) with side-by-side **Table 1 experimental benchmark pills ($\pm\text{SD}$)** when matching a paper scale.
   * **Chart 2A (`#chart-spatial-regions`):** Grouped bar chart of subregion sGAG ($\%\text{ w/w}$), Collagen ($\%\text{ w/w}$), and DNA ($\div 50\text{ ng/mg}$) reproducing Fig. 6A–C.
   * **Chart 2B (`#chart-scale-biochem`):** Multi-scale biochemical comparison across all four construct scales at $20\%\text{ O}_2$ vs. $5\%\text{ O}_2$ alongside paper experimental benchmarks (Fig. 5A–F).
3. **Tab 3 — Biomechanics & Structure–Function (`Fig. 7 Moduli`):**
   * Live unconfined compression metrics: Equilibrium Modulus $E_{\text{eq}}$ ($10\%$ ramp stress-relaxation), $1\text{ Hz}$ Dynamic Modulus $E_{\text{dyn}}$ ($1\%$ cyclic strain), bulk matrix density, and spatial homogeneity factor $\eta$.
   * **Chart 3A (`#chart-moduli-scale`):** Multi-scale comparison of $E_{\text{eq}}$ and $E_{\text{dyn}}$ at $20\%\text{ O}_2$ vs. $5\%\text{ O}_2$ (Fig. 7A–C), highlighting how self-induced physiological hypoxia increases bulk matrix and stiffness with scale at $20\%\text{ O}_2$ ($E_{\text{dyn}} = 90.81 \to 327.51\text{ kPa}$), how $5\%\text{ O}_2$ produces a $1.9\text{-fold}$ boost in $E_{\text{dyn}}$ ($163 \to 310\text{ kPa}$) in $\varnothing 5\times 3\text{ mm}$ constructs, and how severe core hypoxia ($0.7\%\text{ O}_2$) in $\varnothing 6\times 4.5\text{ mm}$ constructs at $5\%\text{ O}_2$ reduces DNA ($62.5 \to 51.8\text{ ng/mg}$) and suppresses collagen ($2.22\% \to 0.69\%\text{ w/w}$).
   * **Chart 3B (`#chart-structure-function`):** Interactive scatter and linear regression plot reproducing **Fig. 7D–G** (`E_dyn vs. sGAG`, `E_dyn vs. Col`, `E_eq vs. sGAG`, `E_eq vs. Col`) with $20\%\text{ O}_2$ circles ($\circ$), $5\%\text{ O}_2$ crosses ($\times$), linear regression lines with $r^2$, and a prominent star marker ($\star$) for the **Live Simulated Construct**.
4. **Tab 4 — MSC $\to$ Chondrocyte Maturation (`42-Day Time-Lapse`):**
   * Quantitative comparison table contrasting **Active Construct**, **MSC-Seeded ($0\%$ initial chondro)**, **Co-Culture ($50\%$)**, and **Mature Chondrocyte-Seeded ($100\%$ initial chondro)** constructs across scales.
   * **Chart 4A (`#chart-time-differentiation`):** 42-day trajectory of % Differentiated Chondrocytes, % Undifferentiated MSCs, Viable DNA ($\text{ng/mg}$), and Bottom Core $\text{O}_2$ ($\%$) as metabolic $V_{\max}$ shifts during chondrogenesis.
   * **Chart 4B (`#chart-time-maturation`):** 42-day accumulation curves of sGAG ($\%\text{ w/w}$), Collagen ($\%\text{ w/w}$), Equilibrium Modulus $E_{\text{eq}}$, and Dynamic Modulus $E_{\text{dyn}}$.

---

## Running Locally

### Option A: Standalone Edition (No Server Required)
Open `index_standalone.html` directly in any modern web browser (Chrome, Edge, Firefox, Safari). All HTML, CSS, ES module JavaScript (`physics.js`, `renderer.js`, `app.js`), and the LTU EBL logo are bundled into a single self-contained file that runs offline via `file://`.

### Option B: Local Development Server
```bash
python -m http.server 8000
```
Then navigate to `http://localhost:8000/index.html`.

### Rebuilding `index_standalone.html`
After editing any source file (`index.html`, `style.css`, `physics.js`, `renderer.js`, or `app.js`), run:
```bash
node bundle.mjs
```

---

## File Structure

```
CartilageScaleSimulation/
├── index_standalone.html        # Self-contained offline single-file edition (file:// compatible)
├── index.html                   # Modular HTML5 application & KaTeX derivation modals
├── style.css                    # Responsive stylesheet & LTU EBL design system
├── physics.js                   # 2D axisymmetric FDM PDE solver, ECM kinetics & Table 1 benchmarks
├── renderer.js                  # Dual-viewport 3D cutaway + 2D histological heatmap canvas engine
├── app.js                       # UI controller, 8 Chart.js plots, 42d animation, quiz & CSV exporter
├── bundle.mjs                   # Node.js bundler script to generate index_standalone.html
├── EBLlogo.png                  # Lawrence Tech Experimental Biomechanics Laboratory logo
├── .gitignore                   # Git ignore rules
├── .github/workflows/deploy.yml # GitHub Actions automated Pages deployment
└── README.md                    # Complete documentation, PDE derivations & Table 1 reference
```

---

## References

1. **Buckley, C. T., Meyer, E. G., & Kelly, D. J.** (2012). "The Influence of Construct Scale on the Composition and Functional Properties of Cartilaginous Tissues Engineered Using Bone Marrow-Derived Mesenchymal Stem Cells." *Tissue Engineering Part A*, 18(3–4), 382–396. [doi:10.1089/ten.tea.2011.0145](https://doi.org/10.1089/ten.tea.2011.0145)
2. **Mackie, J. S., & Meares, P.** (1955). "The diffusion of electrolytes in a cation-exchange resin membrane. I. Theoretical." *Proceedings of the Royal Society of London. Series A*, 232(1191), 498–509.
3. **Buckley, C. T., Vinardell, T., & Kelly, D. J.** (2010). "Oxygen tension differentially regulates the functional properties of cartilaginous tissues engineered from Infrapatellar Fat Pad Derived MSCs and Articular Chondrocytes." *Osteoarthritis and Cartilage*, 18(10), 1345–1354.
4. **Meyer, E. G., Buckley, C. T., Steward, A. J., & Kelly, D. J.** (2011). "The effect of cyclic hydrostatic pressure on the functional development of cartilaginous tissues engineered using bone marrow derived mesenchymal stem cells." *Journal of the Mechanical Behavior of Biomedical Materials*, 4(7), 1257–1265.

---

&copy; 2026 Lawrence Technological University &middot; Experimental Biomechanics Laboratory (EBL) &middot; Dr. Eric G. Meyer
