# Build plan

Status as of 2026-10-24. Read DESIGN.md first, then FOUNDATION.md, then this file.

## Where v1 stands
MCDM Workbench has all 26 catalogue methods implemented, verified against published reference examples, and reviewed.

- **Methods that compute (26/26):**
  - **Weighting (11 core + manual):** CRITIC, Entropy, SD, MEREC, LOPCOW, CILOS, Equal weights, BWM, AHP (Phase 1, 2 & 3: eigenvector, geometric mean, LLSM incomplete completion, 1–2 missing pair guidance and auto-completion), ROC (ROC/RS/RR), SWARA (`src/core/methods/`).
  - **Ranking (16):** TOPSIS, SAW, AHP (`ahp-ranking`: distributive synthesis from the decision matrix + optional per-criterion pairwise alternative comparisons for $m \le 7$), VIKOR, EDAS, WASPAS, COPRAS, MARCOS, CoCoSo, MABAC, MOORA, ARAS, CODAS, PROMETHEE II, ELECTRE I, ELECTRE III (`src/core/methods/`).
- **Robustness & Compare:** Fifth stage (`?stage=robustness`: single-weight sweep with exact stability intervals, ±5/10/20 % nudges, Monte Carlo N = 10,000 in a Web Worker, criterion removal with Spearman ρ and Salabun WS) and sixth stage (`?stage=compare`: cross-method rank comparison across all 16 ranking methods, pairwise Kendall τ_b, overall Kendall's W, Borda consensus, and "Why A vs B?" contribution breakdown).
- **Site & Performance:** landing (`/`), workbench (`/app` with Data, Weights, Ranking, Results, Robustness, and Compare stages), catalogue and method-choice guide (`/methods`), 26 method pages (`/methods/:id` with interactive `IdeaSteps` walkthroughs on all 26 methods), TR/EN (split into per-language chunks loaded on demand), light/dark, every route prerendered with its own `index.html`, responsive prerendered SVG charts visible before JS loads, single tab stop (roving tabindex) on the decision grid, `sitemap.xml`.
- **Quality:** 1,747 unit tests across 58 test files (`pnpm test`) and Playwright e2e tests (`pnpm e2e`); independent DSS and mathematical audits completed.
- **Brand:** MCDM Workbench mark, a matrix in brackets with the decision inside (`docs/brand/`, three drawings:
  16 px cut, 24 px cut, master), favicon and web icons, top bar and hero logo, sharing image. MIT licence.
- **Ship prep:** English README with screenshots, `.github/workflows/pages.yml` (triggers on `main`), `.nvmrc`.

## Decisions (Fatih)
- Same repo; site in Turkish and English; code, comments and commits in English.
- Methods are added one at a time; the 29.09 research is a general scan and each method is re-researched when added.
- Less text, more visuals (DESIGN.md §Copy).
- Name "MCDM Workbench" (TR subtitle "Çok kriterli karar analizi"); Turkish address form "siz"; MIT licence.
- Logo: concept C, brackets with a diamond. In the top bar the subtitle sits under the name; the header content
  lines up with the page container; the hero carries the mark on wide screens.

## Live deployment
- **GitHub Pages:** Live at `https://fatihaydost.github.io/MCDM-Workbench/` via `.github/workflows/pages.yml`.
