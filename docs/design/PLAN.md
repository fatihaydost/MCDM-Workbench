# Build plan

Status as of 2026-10-24. Read DESIGN.md first, then FOUNDATION.md, then this file.

## Where v1 stands
MCDM Workbench has all 26 catalogue methods implemented, verified against published reference examples, and reviewed.

- **Methods that compute (26/26):**
  - **Weighting (11 core + manual):** CRITIC, Entropy, SD, MEREC, LOPCOW, CILOS, Equal weights, BWM, AHP (Phase 1 & 2: eigenvector, geometric mean, LLSM incomplete completion), ROC (ROC/RS/RR), SWARA (`src/core/methods/`).
  - **Ranking (15):** TOPSIS, SAW, VIKOR, EDAS, WASPAS, COPRAS, MARCOS, CoCoSo, MABAC, MOORA, ARAS, CODAS, PROMETHEE II, ELECTRE I, ELECTRE III (`src/core/methods/`).
- **Site:** landing (`/`), workbench (`/app` with Data, Weights, Ranking, Results, Robustness, and Compare stages), catalogue and method-choice guide (`/methods`), 26 method pages (`/methods/:id`), TR/EN, light/dark, every route prerendered with its own `index.html`, `sitemap.xml`.
- **Quality:** 1,732 unit tests across 57 test files (`pnpm test`) and Playwright e2e tests (`pnpm e2e`); independent DSS and mathematical audits completed.
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

## Next
1. **Publish** (needs Fatih): GitHub repo Settings → Pages → Source: **GitHub Actions**, then approve the push of
   `main`. After the Pages run, open every route on the live site and check it (deep links, TR/EN, icons, OG).
2. **Small leftovers:** `/app` Lighthouse 82 (the shared entry bundle is about 370 kB; split the inactive language
   and heavy modules); prerendered charts stay hidden until the app loads (review-2 P2-6); the grid has no
   single tab stop (roving tabindex).
3. **Robustness panel:** built on the `robustness` branch as the workbench's fifth stage (`?stage=robustness`, its own
   lazy chunk and text namespace): move one weight (closeness against w_k with the stability intervals of the core,
   a slider, the live ranking whose rows slide to their new places), ±5/10/20 % nudges per criterion, Monte Carlo
   weights (uniform or κ 20 / 100 / 500, N = 10,000, seed 1, in a Web Worker) with rank acceptability and mean rank
   intervals, criterion removal (rescale or recompute CRITIC) with ρ and WS. Still open: agreement between methods
   (Kendall τ_b, Kendall's W) and the Borda merge, which need a second ranking method. Sources and formulas:
   `docs/research/combinations.md` §C and §D.
4. **Methods, one at a time**, in the order `combinations.md` §E suggests (first: Entropy, SD, MEREC, ROC, AHP; SAW,
   VIKOR, EDAS, WASPAS, COPRAS, MOORA, PROMETHEE II, ELECTRE I). For each: review the card with Fatih, re-research
   it, implement in `src/core`, reference test from the published example (not pyDecision), method page and
   illustration, flip its status to available.
