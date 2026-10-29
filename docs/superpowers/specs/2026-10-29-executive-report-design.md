# Executive & Method Dashboard Report (A4 Preview + Print/PDF): Design

Status: draft 2026-10-29. Replaces the bare two-table `src/app/workbench/PrintReport.tsx`.
Read `docs/design/DESIGN.md` (tokens, typography, banned patterns) and `docs/design/MOTION.md` first.

## Intent

When an analyst, researcher, or student finishes a multi-criteria analysis and clicks **Report preview (PDF)**, the output must be worthy of placing directly on an executive's desk or attaching to a technical paper:

1. **Answer-first & visual ("10-second executive test"):** Page 1 must communicate *what won*, *by how much*, *why #1 beat #2* (criterion trade-offs), *whether other MCDM methods agree*, and *how stable the decision is under weight shifts*—using the workbench's semantic data-colour system (`--accent`, `--data-cat-1..8`, `--data-negative`), not colourless raw number dumps.
2. **Method-authentic dashboards:** Page 2 must showcase the mathematical mechanics of the chosen ranking and weighting methods using the workbench's existing 27 method-specific SVG stage views (`TopsisGeometry`, `VikorIdea`, `SawContributions`, `PrometheeIdea`, `CriticIdea`, `AhpMatrix`, `BwmRulers`, etc.), cross-method `RankLines`, and weight perturbation diagnostics.
3. **Zero awkward page breaks & WYSIWYG parity:** Pages 1 and 2 are deterministic, bounded A4 tear-sheets (`210mm × 297mm`) that never overflow onto accidental half-blank pages regardless of matrix size ($m \times n$). Users can preview the exact white A4 sheets on screen (even while using Dark Mode) and toggle an optional Page 3+ Audit Appendix for full tables and horizontally banded raw decision matrices.

## Goals

- Replace the blind `window.print()` button on `ResultsStage` with an **On-Screen A4 Report Preview Modal** (`ReportPreviewModal`) plus direct `Ctrl+P` / browser print support from `ResultsStage` backed by the same `<PrintReport />` document.
- **Page 1 — Executive Decision Brief (1 A4 sheet, bounded):**
  - Brand (`[◆] MCDM Workbench`) & provenance header (title, date, $m \times n$ size, source/citation, full weighting and ranking method labels).
  - Answer-first **Verdict Banner** (petrol accent for clear winner; warning amber when `verdict.failed.length > 0` such as VIKOR compromise set or ELECTRE I non-unique/cyclic kernel) + 1-line cross-method & robustness confidence summary.
  - **4 Executive KPI Cards:** (1) `#1 Winner & Margin over #2`, (2) `#1 vs #2 Key Criterion Trade-Off`, (3) `Method Consensus` (`firstPlace` count, Kendall's $W$, Borda leader), (4) `Weight Stability` (`±5/10/20%` held ratio + narrowest criterion switching interval `[w_min, w_max]`).
  - **7:5 Asymmetric Two-Column Visual Body:**
    - Left: **Leaderboard & Method Metrics Table** (bounded to top 8 rows on Page 1; rank badge, alternative name, up to 2 method-specific intermediate columns from `methodViews[rankingMethod].columns`, inline score bar, formatted score) + **Criterion Profile Stacked Bar SVG** (normalized benefit/cost-oriented weighted shares $w_j \tilde{r}_{ij}$ using `--data-cat-1..8` and legend).
    - Right: **#1 vs #2 Head-to-Head Tornado Delta SVG** (diverging horizontal bars around `0`, petrol right for `#1` advantage, muted red left for `#2` advantage) + **Criteria Weights & Stability Band Table** (bounded to top 8 criteria by weight; direction `↑`/`↓`, weight $w_j$, inline SVG range sparkbar for `[w_min, w_max]` where `#1` holds).
- **Page 2 — Method & Robustness Dashboard (1 A4 sheet, bounded):**
  - Compact running header + active method pair badge.
  - **Top 2-Column Method Mechanics Grid:**
    - Left: Active **Ranking Method Stage SVG** (`methodViews[rankingMethod].stage.Component`, or `ScoreChart` fallback) + method `constants` (`f(K-)/f(K+)`, `S_0`) / verdict notes.
    - Right: Active **Weighting Method Stage SVG** (`methodViews[weightMethod].stage.Component`, or `WeightsChart` for `manual`) + consistency/diagnostic summary (`AHP`: $\lambda_{\max}, CI, CR$ & worst pair; `BWM`: $\xi^*, CR^I$ & threshold; objective/ordinal methods: compact top-criteria intermediate metrics from `methodViews[weightMethod].columns`).
  - **Middle Band:** Cross-method **`RankLines` SVG** (bounded to top 10 alternatives by Borda rank when $m > 10$) + active algebraic echo badges.
  - **Bottom 2-Column Robustness & Synthesis Grid:**
    - Left: Compact **`±5% / ±10% / ±20%` Weight Perturbation Grid** (top 7 criteria by weight when $n > 7$).
    - Right: **Automated KDS Synthesis** (`whySentences` for the top pair + Leave-One-Out criterion removal summary from `removeCriteria` + active method warnings).
- **Page 3+ — Optional Audit Appendix (off by default, toggleable in preview; auto-hinted when $m > 8$ or $n > 8$):**
  - Full Ranking Table (all $m$ alternatives, all `methodViews[rankingMethod].columns`).
  - Full Criteria Weights Table (all $n$ criteria, all `methodViews[weightMethod].columns`).
  - **Raw Decision Matrix ($m \times n$):** Horizontally chunked into bands of at most `7` criteria columns per sub-table (repeating the `Alternative` column on each band, highlighting best-in-column raw values) with `thead { display: table-header-group }` so multi-page matrices paginate cleanly without horizontal clipping.
- Fix all Chromium `@media print` pagination, Dark Mode OKLCH token, and hidden-container SVG measurement bugs.
- Bilingual (`en.json` and `tr.json`), maintaining strict key parity and Turkish `"siz"` register.

## Non-goals

- Third-party client PDF rasterizers (`html2canvas`, `jspdf`, `@react-pdf/renderer`). Native browser vector PDF export via `window.print()` keeps selectable text, embedded `IBM Plex Sans`/`Mono`, crisp vector SVGs, and zero bundle bloat.
- Step-by-step worked calculation matrices (`result.steps`) inside the PDF report (already exported in full to `.xlsx` and copyable as LaTeX/TSV on screen).
- Editing weights, parameters, or matrix cells inside the report preview modal (the report is a read-only presentation view).

## Anti-goals

- Never allow Page 1 or Page 2 to spill over onto an unplanned extra page when $m$ or $n$ is large. Bounded row/series caps + fixed SVG `max-height` guarantee 1 sheet each.
- No AI-slop decoration (no gradients, no drop shadows inside printed sheets, no decorative status dots without text, no spider/radar charts). Stick strictly to `DESIGN.md` tokens, 2 px radii, and 1 px hairlines.
- Never show interactive UI chrome (`"Show as table"` `<details>`, segmented view switchers, scrollbars, or screen `<MethodWarnings>` banners) inside printed pages.

## Decided (owner, 2026-10-29)

1. Research-backed enterprise/academic MCDA tear-sheet architecture approved via interactive A4 browser mockup (**Option A: `2page-plus-optional-appendix`**).
2. **Default report scope:** 2 bounded A4 pages (Page 1 = Executive Decision Brief, Page 2 = Method & Robustness Dashboard), with an interactive toggle in the On-Screen A4 Preview to include **Page 3+ Audit Appendix** (Raw Decision Matrix & full untruncated tables).
3. Must be colourful, immediately legible to a manager/executive, include method-specific visual dashboards, and never overflow awkwardly across pages.

## Builder's calls (Iroh)

- **Entry point & backward compatibility with existing tests:**
  - `ResultsStage` keeps `<PrintReport includeAppendix={includeAppendix} />` mounted in the DOM (with `data-testid="print-report"`, `data-testid="print-verdict"`, `data-testid="print-weights-section"`, `data-testid="print-ranking-section"`, `data-testid="print-robustness-summary"`) so direct `Ctrl+P` works immediately and existing unit/E2E selectors remain valid without duplicating `data-testid="ranking-row"`.
  - Clicking `data-testid="print-report-button"` opens `ReportPreviewModal` showing the live `.report-sheet` A4 pages on screen, an **"Include appendix (raw matrix & full tables)"** switch (`data-testid="report-appendix-toggle"`), and a primary **"Print / Save PDF"** action (`data-testid="report-confirm-print"`) that temporarily sets `document.title = "MCDM-Report-<Weight>-<Ranking>-<YYYY-MM-DD>"` around `window.print()`.
- **Normalized criterion profile & `#1 vs #2` delta math (`src/app/workbench/report/reportMetrics.ts`):**
  - Because `PrintReport` supports all 16 ranking methods (including distance and outranking methods that do not emit additive `saw.weighted` steps), Page 1's **Criterion Profile Stacked Bar** and **#1 vs #2 Head-to-Head Tornado** use a shared, transparent min-max benefit/cost-oriented weighted score per criterion:
    $$\tilde{r}_{ij} = \begin{cases} \dfrac{x_{ij} - \min_k x_{kj}}{\max_k x_{kj} - \min_k x_{kj}} & \text{benefit} \\[6pt] \dfrac{\max_k x_{kj} - x_{ij}}{\max_k x_{kj} - \min_k x_{kj}} & \text{cost} \end{cases} \quad (\text{or } 0.5 \text{ when column } j \text{ is constant}), \qquad c_{ij} = w_j \tilde{r}_{ij}.$$
  - On additive min-max methods this equals the exact criterion utility contribution; on distance/outranking methods it is explicitly captioned as *"Normalized weighted criterion profile ($w_j \cdot \tilde{r}_{ij}$)"* so it never misrepresents a non-additive method's internal formula while giving executives an accurate visual breakdown of criterion strengths and `#1 vs #2` trade-offs ($\Delta_j = c_{1,j} - c_{2,j}$).
  - When $n > 8$, the stacked bar groups criteria ranked $9..n$ by weight into a neutral `"Others"` (`--data-context`) segment; the Tornado chart shows the top 6 criteria by $|\Delta_j|$.
- **Synchronous Weight Stability Intervals on Page 1:**
  - For each criterion $j$ shown on Page 1 (top 8 by weight), compute `sweepWeight(coreProblem, weights.weights, rankerFor(run), j, 51)` synchronously inside `useMemo` (51 grid points $\times 8$ criteria $= 408$ fast in-memory evaluations, $< 15\text{ ms}$ for typical problems; skipped/capped to 25 points if $m \times n > 400$). Extract `baseTopInterval: { from, to }` to draw the `[w_min, w_max]` safe band sparkbar and identify the most fragile criterion (smallest distance from current $w_j$ to a switching boundary `from` or `to` within $(0, 1)$).
- **Method-specific Stage SVGs on Page 2 without layout breakage:**
  - Call `preloadActiveStagePictures([weightMethod, rankingMethod])` when `ResultsStage` mounts so lazy chunks are ready before printing.
  - Wrap Page 2 charts in `<ChartTableModeProvider value="screen-reader">` so `<details><summary>Show as table</summary>` disclosures do not clutter the A4 page.
  - Render `<ReportDocument />` inside a container with a deterministic paper-column width (`~320px` per half-column, `~680px` full width) and enforce `.report-sheet svg { max-width: 100%; height: auto; }` + panel `max-height` caps (`62mm` for top method panels, `54mm` for `RankLines`) with `overflow: hidden` so multi-part stage views (like `cocoso`'s dual `CocosoLenses` + `WaspasLambda` or `topsis`'s view switcher) stay crisp and strictly inside Page 2's `273mm` height budget. Interactive controls inside stage views (`[role="radiogroup"]`, buttons) are hidden via CSS inside `.report-sheet`.
- **Chromium `@media print` & Dark Mode OKLCH isolation (`src/styles/app.css`):**
  - Scope all light-mode `oklch(...)` tokens from `tokens.css` (including `--data-context`, `--data-accent`, `--data-heat-0`, `--data-heat-1`, `--data-negative`, `--data-cat-1..8`, `--ok`, `--ok-bg`, `--warning`, `--warning-bg`, `--danger`, `--danger-bg`) onto `.report-sheet` AND `@media print :root, @media print :root[data-theme='dark']`. Using `oklch(...)` values ensures `parseOklch()` in `useHeatTokens.ts` succeeds even if re-evaluated during print.
  - Add `.no-print` to `<MethodWarnings>` in `ResultsStage.tsx` (warnings are already surfaced cleanly inside the report's synthesis/diagnostics).
  - Under `@media print`, reset `html, body, #root, main` and workbench layout wrappers to `display: block !important; height: auto !important; overflow: visible !important`, set `.report-sheet` to `break-after: page; break-inside: avoid`, and set `.report-appendix-sheet` tables to `break-inside: auto` with `thead { display: table-header-group }` and `tr { break-inside: avoid }`.

## Architecture & File Map

- `src/app/workbench/report/reportMetrics.ts` — Pure synchronous helpers (`computeExecutiveMetrics`: winner/runner-up margin, `c_{ij}` criterion profiles, `#1 vs #2` deltas $\Delta_j$, per-criterion `[w_min, w_max]` stability intervals & most sensitive criterion, method-specific diagnostic scalars like AHP $CR$/worst pair & BWM $\xi^*$/$CR^I$, Leave-One-Out summary, and horizontal `chunkCriteria(criteria, 7)` for Appendix matrices). Unit-tested independently.
- `src/app/workbench/report/ReportCharts.tsx` — Pure, deterministic `viewBox` SVG micro-charts for Page 1 (`CriterionProfileChart`, `HeadToHeadDeltaChart`, `StabilityBandSparkbar`) using `--data-cat-1..8`, `--data-accent`, and `--data-negative`.
- `src/app/workbench/report/ReportDocument.tsx` — The shared multi-sheet `.report-sheet` document rendering **Page 1 (Executive Decision Brief)**, **Page 2 (Method & Robustness Dashboard)**, and optional **Page 3+ (Audit Appendix)** with deterministic row/column caps.
- `src/app/workbench/report/ReportPreviewModal.tsx` — Accessible modal dialog presenting `<ReportDocument />` as scaled/scrollable A4 white paper sheets on a neutral `--surface-2` stage, with the Appendix toggle switch and `Print / Save PDF` button.
- `src/app/workbench/PrintReport.tsx` — Thin wrapper mounting `<ReportDocument />` for direct `@media print` on `ResultsStage` and re-exporting props for `ResultsStage`.
- `src/app/workbench/ResultsStage.tsx` — Adds `.no-print` to `<MethodWarnings>`, preloads active stage pictures, and wires the report preview button + `ReportPreviewModal`.
- `src/styles/app.css` — `.report-sheet` light-mode `oklch(...)` token scope, stage-control suppression inside `.report-sheet`, and fixed `@media print` Block Fragmentation & `@page` rules.
- `src/i18n/en.json` & `src/i18n/tr.json` — Complete bilingual strings for Page 1, Page 2, Page 3 Appendix, and Preview Modal.
- `tests/report-metrics.test.ts`, `tests/workbench.test.tsx`, `tests/e2e/workbench.spec.ts` — Unit tests for `reportMetrics.ts` (benefit/cost profiles, ties, ascending VIKOR margin, stability intervals, 7-column matrix chunking) + component/E2E verification of the A4 preview modal, appendix toggle, and zero overflow.
