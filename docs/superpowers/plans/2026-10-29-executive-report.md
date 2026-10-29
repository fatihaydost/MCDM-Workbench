# Executive & Method Dashboard Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare monochrome `PrintReport.tsx` with a colourful, executive-grade, method-authentic 2-page A4 Decision Report (plus an optional Page 3+ Audit Appendix) featuring an on-screen A4 paper preview modal, method stage SVG dashboards, and deterministic zero-overflow `@media print` pagination.

**Architecture:** Shared TypeScript contracts live in `src/app/workbench/report/types.ts`. Pure synchronous report math (`reportMetrics.ts`), deterministic Page 1 SVG micro-charts (`ReportCharts.tsx`), and light-paper OKLCH CSS/i18n/heatmap scoping (`app.css`, `useHeatTokens.ts`, `en.json`, `tr.json`) build independently in isolated worktrees, then compose into `ReportDocument.tsx`, `ReportPreviewModal.tsx`, `PrintReport.tsx`, and `ResultsStage.tsx`.

**Tech Stack:** TypeScript, React 19, Tailwind CSS v4 (strict OKLCH tokens in `tokens.css`), Radix Dialog, i18next (`en` + `tr`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-executive-report-design.md`

## Global Constraints

- Zero third-party PDF rasterizers (`html2canvas`, `jspdf`, `@react-pdf/renderer`); vector PDF export uses native `window.print()`.
- Stick strictly to `docs/design/DESIGN.md` tokens (`--accent`, `--data-cat-1..8`, `--data-context`, `--data-negative`, `--warning`, `--ok`), `IBM Plex Sans`/`Mono`, `.num` (`tabular-nums`), 2 px control radii, 1 px hairlines; no gradients, no radar charts, no drop shadows inside printed pages.
- Code, comments, and git commit messages in English; no `Co-Authored-By` trailer.
- Bilingual (`src/i18n/en.json` and `src/i18n/tr.json`): identical keys and `{{interpolation}}` variables, no en/em dashes (`–` or `—`), no emoji (`\p{Extended_Pictographic}`), no banned buzzwords, Turkish `"siz"` register, and Turkish spelling `min-maks` (never `"min-max"`).
- Existing DOM contracts preserved: `ResultsStage` renders `data-testid="print-report-button"`, `data-testid="print-report"`, `data-testid="print-verdict"`, `data-testid="print-weights-section"`, `data-testid="print-ranking-section"`, and `data-testid="print-robustness-summary"`, and `.print-only` NEVER emits `data-testid="ranking-row"`.

## Review Focus

1. **Lower-is-better (`order: 'asc'`, e.g. VIKOR `Q`) and signed/negative scores (`MABAC`, `CODAS`, `PROMETHEE II`):** Winner margin must be non-negative (`runnerUpScore - bestScore` when `asc`) and `MiniScoreBar` must draw the strongest bar for `#1` under `asc` and a zero-axis diverging bar when `minScore < 0 < maxScore`.
2. **Tied `#1` leaders or non-unique method verdict (`VIKOR` compromise set, `ELECTRE I` kernel, all-equal rows):** Must not crash when `runnerUpIndex === null`, must compare `leaders[0]` vs `leaders[1]` in Head-to-Head deltas when `#1` is tied, and must switch the Page 1 Verdict Banner to warning amber when `verdict.failed.length > 0`.
3. **Constant criterion columns and wide/tall matrices (`m > 10`, `n > 8`):** A constant column must yield finite $\tilde{r}_{ij} = 0.5$ (never `NaN`) and highlight zero best cells in the Appendix matrix; Page 1 caps at 8 alternatives / 8 criteria (grouping tail criteria into `"others"`), Page 2 caps `RankLines` at top 10 alternatives and perturbation grid at top 7 criteria, and Page 3 chunks the raw matrix into bands of `<= 7` criteria columns.
4. **Dark Mode on-screen paper preview & Radix Portal print duplication:** When `<html data-theme="dark">` is active, `.report-sheet` (including `<Heatmap />` via element-scoped `useHeatTokens(target)`) must resolve light-mode `oklch(...)` paper tokens on screen, and `@media print` must hide `[data-radix-portal]` so clicking `"Print / Save PDF"` inside the modal prints `<PrintReport />` once.
5. **i18n lint gates & hidden-DOM testid isolation:** `en.json` and `tr.json` must pass `tests/i18n.test.ts` (zero `–`/`—` characters, zero emoji, Turkish `min-maks`), and `page.getByTestId('ranking-row').first()` on screen must never match a hidden `.print-only` row.

---

### Task 1: Executive Report Metrics Engine (`reportMetrics.ts`)

**Files:**
- Create: `src/app/workbench/report/reportMetrics.ts`
- Test: `tests/report-metrics.test.ts`

**Interfaces:**
- Consumes: `ComputeExecutiveMetricsInput`, `ExecutiveReportMetrics`, `CriteriaBand` from `src/app/workbench/report/types.ts`; `ahpProgress`, `bwmProgress`, `DEFAULT_DELTAS`, `getWeightingMethod`, `perturbWeights`, `rankerFor`, `removeCriteria`, `sweepWeight` from `src/core`; `runFor` from `src/state/workbench`; `methodViews` from `src/app/methods/views`; `rankOrder` from `src/app/workbench/RankingStage`; `findStep` from `src/app/workbench/shared`.
- Produces:
  - `computeExecutiveMetrics(input: ComputeExecutiveMetricsInput): ExecutiveReportMetrics`
  - `chunkCriteria(n: number, maxCols?: number): CriteriaBand[]`
  - `bestRowsPerCriterion(problem: Problem): Set<number>[]`

- [ ] **Step 1: Write failing unit tests in `tests/report-metrics.test.ts`**

Cover:
1. `topsis` + `critic` on a $4 \times 4$ mixed benefit/cost matrix: `winner.order === 'desc'`, `winner.rawMargin > 0`, `criterionProfiles` row `totalProfile` equals $\sum_j w_j \tilde{r}_{ij}$ within `1e-9`, `headToHeadDeltas` sum to `profile(#1) - profile(#2)`, `criterionStability` returns `[from, to]` intervals containing $w_j$, and `bestMatrixRows` marks max for `'benefit'` and min for `'cost'`.
2. `vikor` (`order: 'asc'`): `winner.bestScore <= winner.runnerUpScore!`, `winner.rawMargin` equals `runnerUpScore - bestScore >= 0`.
3. Tied `#1` leaders & constant criterion column: 2 tied top rows produce `winner.leaders` of length 2, `headToHeadPair` equals `[leaders[0], leaders[1]]`, constant column gives finite $\tilde{r}_{ij} = 0.5$ (`Number.isFinite`) and an empty `Set` in `bestMatrixRows`.
4. High-dimensional problem ($m = 12, n = 10$): `criterionProfiles` has length `8` (`truncatedAlternatives === 4`), `profileLegend` has 7 criteria + 1 `'others'` entry (`restCount: 3`, `catSlot: 'other'`), `criterionStability` has length `8` (`truncatedStabilityCriteria === 2`), `perturbationGrid.rows` has length `7` (`truncatedCriteria === 3`), and `chunkCriteria(10, 7)` yields bands `[0..6]` and `[7..9]`.
5. `ahp` and `bwm` weight diagnostics: `weightDiagnostics.kind === 'ahp'` exposes `cr` & `worstPair`; `weightDiagnostics.kind === 'bwm'` exposes `xi` & `crInput`; `critic` exposes `kind === 'columns'`; `equal` exposes `kind === 'none'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/report-metrics.test.ts`
Expected: FAIL (`Cannot find module '../src/app/workbench/report/reportMetrics'`)

- [ ] **Step 3: Implement `src/app/workbench/report/reportMetrics.ts`**

Key rules pinned by the spec:
- `criteriaByWeight`: indices `0..n-1` sorted by `(weights.weights[b] ?? 0) - (weights.weights[a] ?? 0) || a - b`.
- Normalized profile matrix $\tilde{r}_{ij}$: benefit `(x - min) / span`, cost `(max - x) / span`, constant (`span <= 1e-12`) `0.5`; $c_{ij} = w_j \tilde{r}_{ij}$.
- When `n <= 8`, `profileLegend` uses `criteriaByWeight` with `catSlot = ((idx % 8) + 1) as 1..8`; when `n > 8`, first 7 in `criteriaByWeight` get `catSlot: 1..7` and remaining `n - 7` criteria sum into `{ key: 'others', col: 'others', catSlot: 'other', weight: restWeight, restCount: n - 7 }`.
- Stability sweep: for `col` in `criteriaByWeight.slice(0, 8)`, run `sweepWeight(problem, weights.weights, ranker, col, { steps: m * n > 400 ? 25 : 50 })`. Compute `leftMargin = iv.from > 1e-4 ? Math.max(0, w - iv.from) : Infinity`, `rightMargin = iv.to < 1 - 1e-4 ? Math.max(0, iv.to - w) : Infinity`, `headroom = Number.isFinite(Math.min(leftMargin, rightMargin)) ? Math.min(leftMargin, rightMargin) : null`. `criticalCriterion` is the item with smallest non-null `headroom`.
- Leave-One-Out `removalSummary`: call `removeCriteria(problem, weights.weights, ranker)` (renormalize mode only so it stays instant and judgment-safe), filter `!r.blocked`, count `held` (`r.sameTop`), and collect `flippedCols` (`!r.sameTop`, `newLeaderIndices` where `r.ranking[i] === 1`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/report-metrics.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/workbench/report/reportMetrics.ts tests/report-metrics.test.ts
git commit -m "feat(report): add executive report metrics and stability helpers"
```

---

### Task 2: Deterministic Vector SVG Micro-Charts (`ReportCharts.tsx`)

**Files:**
- Create: `src/app/workbench/report/ReportCharts.tsx`
- Test: `tests/report-charts.test.tsx`

**Interfaces:**
- Consumes: `CatSlot`, `CriterionDeltaItem`, `CriterionProfileLegendItem`, `CriterionProfileRow` from `src/app/workbench/report/types.ts`.
- Produces:
  - `catColorVar(slot: CatSlot): string` (`slot === 'other' ? 'var(--data-context)' : \`var(--data-cat-${slot})\``)
  - `CriterionProfileChart(props: { rows: readonly CriterionProfileRow[]; legend: readonly CriterionProfileLegendItem[]; altNames: readonly string[]; criterionLabel: (col: number | 'others', restCount?: number) => string; formatValue: (v: number) => string; ariaLabel: string }): JSX.Element`
  - `HeadToHeadDeltaChart(props: { items: readonly CriterionDeltaItem[]; pairNames: readonly [string, string]; critNames: readonly string[]; formatDelta: (v: number) => string; emptyText: string; ariaLabel: string }): JSX.Element`
  - `StabilityBandSparkbar(props: { weight: number; interval: { from: number; to: number } | null; ariaLabel: string }): JSX.Element`
  - `MiniScoreBar(props: { value: number; scores: readonly number[]; order: 'asc' | 'desc'; isLeader: boolean }): JSX.Element`

- [ ] **Step 1: Write failing component tests in `tests/report-charts.test.tsx`**

Render each component via `renderToStaticMarkup` and assert:
1. `CriterionProfileChart` renders `<svg` with `viewBox`, stacked `<rect` segments separated by gaps using `var(--data-cat-1)`..`var(--data-context)`, alternative labels, and legend swatches.
2. `HeadToHeadDeltaChart` renders a centered zero axis, positive delta bars extending right in `var(--data-accent)`, negative delta bars extending left in `var(--data-negative)`, signed formatted values, and `emptyText` when all `|delta| <= 1e-12`.
3. `StabilityBandSparkbar` renders `[from, to]` safe interval band and current weight marker tick within `viewBox="0 0 88 14"`, and a neutral track when `interval === null`.
4. `MiniScoreBar` handles three regimes cleanly:
   - `order: 'desc'` positive scores (`[0.8, 0.4]` -> leader width `100%`, second `50%`),
   - `order: 'asc'` (`VIKOR` `[0, 0.5, 1.0]` -> `Q = 0` leader gets full `100%` bar, `Q = 1.0` worst gets minimal `8%` stub, never inverted!),
   - `order: 'desc'` signed/diverging scores (`MABAC` `[-0.2, 0.4]` -> positive bar starts at zero-axis `33.33%` in `var(--data-accent)` / `var(--data-context)`, negative bar extends left from zero-axis in `var(--data-negative)`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/report-charts.test.tsx`
Expected: FAIL (`Cannot find module '../src/app/workbench/report/ReportCharts'`)

- [ ] **Step 3: Implement `src/app/workbench/report/ReportCharts.tsx`**

All SVGs use fixed deterministic coordinate `viewBox` attributes (`width="100%"`), `font-variant-numeric: tabular-nums`, and semantic CSS variables (`var(--data-cat-1..8)`, `var(--data-context)`, `var(--data-accent)`, `var(--data-negative)`, `var(--surface-2)`, `var(--line-strong)`, `var(--text)`, `var(--text-2)`). No `ResizeObserver` needed inside Page 1 micro-charts, so they render identically in SSR, hidden `.print-only`, on-screen A4 preview, and `@media print`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/report-charts.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/workbench/report/ReportCharts.tsx tests/report-charts.test.tsx
git commit -m "feat(report): add deterministic SVG micro-charts for executive report"
```

---

### Task 3: Paper OKLCH Token Scope, `@media print` Fragmentation, Heatmap Element Scope & Bilingual Copy

**Files:**
- Modify: `src/styles/app.css:235-299`
- Modify: `src/features/charts/useHeatTokens.ts:1-36`
- Modify: `src/features/charts/Heatmap.tsx:47-86`
- Modify: `src/i18n/en.json:838-850`
- Modify: `src/i18n/tr.json:838-850`

**Interfaces:**
- Produces:
  - CSS classes `.report-preview-stage`, `.report-sheet`, `.report-appendix-sheet`, `[data-print-block]` print resets, `[data-radix-portal]` print suppression, and `.report-sheet` stage-control suppression.
  - `useHeatTokens(target?: Element | null): HeatTokens | null` reading `getComputedStyle(target ?? document.documentElement)` and updating on `MutationObserver`, `matchMedia('(prefers-color-scheme: dark)')`, and `matchMedia('print')`.
  - Complete EN/TR `workbench.results.print.*` keys.

- [ ] **Step 1: Update `useHeatTokens.ts` and `Heatmap.tsx` for element-scoped tokens + print media**

In `src/features/charts/useHeatTokens.ts`:
- Change `readTokens(target?: Element | null)` to inspect `getComputedStyle(target ?? document.documentElement)`.
- Subscribe to both `window.matchMedia('(prefers-color-scheme: dark)')` and `window.matchMedia('print')` (`addEventListener?.('change', update)`), re-running whenever `target` changes.
In `src/features/charts/Heatmap.tsx`:
- Keep a `const [hostEl, setHostEl] = useState<HTMLDivElement | null>(null)` merged with `plotRef` (`const ref = useCallback((node: HTMLDivElement | null) => { plotRef(node); setHostEl(node) }, [plotRef])`) and pass `hostEl` to `useHeatTokens(hostEl)`.

- [ ] **Step 2: Add `.report-sheet` light-mode `oklch(...)` paper scope and fixed `@media print` rules in `src/styles/app.css`**

In `src/styles/app.css`:
- Define `.report-sheet` with exact light-mode `oklch(...)` values from `tokens.css` (`color-scheme: light`, `--bg: oklch(1 0 0)`, `--surface: oklch(1 0 0)`, `--surface-2: oklch(0.962 0.004 250)`, `--line`, `--line-strong`, `--text`, `--text-2`, `--text-3`, `--accent`, `--accent-hover`, `--accent-fg`, `--accent-bg`, `--danger`, `--danger-bg`, `--warning`, `--warning-bg`, `--ok`, `--ok-bg`, `--data-context`, `--data-accent`, `--data-heat-0`, `--data-heat-1`, `--data-negative`, `--data-cat-1..8`), `background: var(--surface)`, `color: var(--text)`.
- On screen (`.report-preview-stage .report-sheet`): `width: 210mm; min-height: 297mm; padding: 11mm 13mm; box-sizing: border-box; border: 1px solid var(--line); box-shadow: var(--shadow-float);`.
- Inside `.report-sheet`:
  - `svg { max-width: 100%; height: auto; }`
  - Suppress interactive stage controls that do not belong on paper: `.report-sheet [role='radiogroup'], .report-sheet details, .report-sheet [data-idea-controls] { display: none !important; }`
  - `.report-sheet .overflow-auto, .report-sheet .overflow-x-auto { overflow: visible !important; }`
- Inside `@media print`:
  - `@page { size: A4 portrait; margin: 10mm 12mm; }`
  - Apply the exact same light-mode `oklch(...)` token block to `:root, :root[data-theme='dark']` so `parseOklch` always succeeds during print!
  - Reset flex fragmentation ancestors: `html, body, #root, main, [data-print-block] { display: block !important; height: auto !important; min-height: 0 !important; overflow: visible !important; padding: 0 !important; margin: 0 !important; }`
  - Hide screen chrome & Radix modal portals (prevents double-printing when printing from inside `ReportPreviewModal`): `header:not(.print-only header), nav, aside, .no-print, [data-radix-portal] { display: none !important; }`
  - `.print-only { display: block !important; }`
  - Bounded sheets (`.report-sheet:not(.report-appendix-sheet)`): `width: 100% !important; min-height: 0 !important; max-height: 276mm !important; overflow: hidden !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; break-inside: avoid; page-break-inside: avoid; break-after: page; page-break-after: always;` (and `:last-child { break-after: auto; page-break-after: auto; }`).
  - Flowing appendix sheet (`.report-appendix-sheet`): `width: 100% !important; min-height: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; break-inside: auto; page-break-inside: auto;` with `table, tbody, section { break-inside: auto; page-break-inside: auto; }`, `thead { display: table-header-group; }`, `tr, .report-matrix-band { break-inside: avoid; page-break-inside: avoid; }`.

- [ ] **Step 3: Add complete bilingual `workbench.results.print.*` strings in `src/i18n/en.json` and `src/i18n/tr.json`**

Preserve existing keys (`title`, `verdictTitle`, `weightsTitle`, `rankingTitle`, `summaryTitle`, `kendallW`, `bordaLeader`, `firstPlaceAgreement`, `weightStability`) and update/add:
- `button`: `"Report preview (PDF)"` / `"Rapor önizleme (PDF)"`
- `modalTitle`: `"Executive decision report (A4)"` / `"Yönetici karar raporu (A4)"`
- `modalDescription`: `"Two-page executive and method dashboard ready for A4 print or vector PDF export."` / `"A4 baskı veya vektör PDF dışa aktarımı için hazır iki sayfalık yönetici ve yöntem panosu."`
- `includeAppendix`: `"Include audit appendix (full tables and raw matrix)"` / `"Denetim ekini dahil edin (tam tablolar ve ham matris)"`
- `appendixRecommended`: `"Recommended ({{m}}x{{n}})"` / `"Önerilir ({{m}}x{{n}})"`
- `printAction`: `"Print / Save PDF"` / `"Yazdır / PDF kaydet"`
- `page1Badge`: `"Page 1 of {{total}} - Executive brief"` / `"Sayfa 1 / {{total}} - Yönetici özeti"`
- `page2Badge`: `"Page 2 of {{total}} - Method and robustness"` / `"Sayfa 2 / {{total}} - Yöntem ve sağlamlık"`
- `page3Badge`: `"Appendix - Full audit tables"` / `"Ek - Tam denetim tabloları"`
- `problemSize`: `"{{m}} alternatives x {{n}} criteria"` / `"{{m}} alternatif x {{n}} kriter"`
- `verdictClear`: `"Recommended decision"` / `"Önerilen karar"`
- `verdictCompromise`: `"Compromise / conditional result"` / `"Uzlaşık / koşullu sonuç"`
- `kpiWinner`: `"Top alternative"` / `"Birinci alternatif"`
- `kpiMargin`: `"Lead over #2 ({{name}}): {{raw}} ({{pct}}% of span)"` / `"#2 ({{name}}) önünde fark: {{raw}} (aralığın %{{pct}} kadarı)"`
- `kpiMarginRawOnly`: `"Lead over #2 ({{name}}): {{raw}}"` / `"#2 ({{name}}) önünde fark: {{raw}}"`
- `kpiMarginTied`: `"Tied for first place ({{count}} alternatives)"` / `"Birinciliği paylaşıyor ({{count}} alternatif)"`
- `kpiTradeoff`: `"#1 vs #2 key trade-off"` / `"#1 ve #2 temel ödünleşim"`
- `kpiTradeoffGain`: `"Leads most on {{criterion}} (+{{delta}})"` / `"En büyük üstünlük: {{criterion}} (+{{delta}})"`
- `kpiTradeoffLoss`: `"Trails on {{criterion}} ({{delta}})"` / `"Geride olduğu kriter: {{criterion}} ({{delta}})"`
- `kpiTradeoffDominates`: `"No criterion disadvantage against {{name}}"` / `"{{name}} karşısında hiçbir kriterde geride değil"`
- `kpiTradeoffEqual`: `"Equal weighted profile with {{name}}"` / `"{{name}} ile eşit ağırlıklı profil"`
- `kpiConsensus`: `"Cross-method consensus"` / `"Yöntemler arası uzlaşı"`
- `kpiConsensusValue`: `"{{n}} / {{of}} methods"` / `"{{n}} / {{of}} yöntem"`
- `kpiConsensusSingle`: `"Single compatible method"` / `"Tek uyumlu yöntem"`
- `kpiStability`: `"Weight stability"` / `"Ağırlık kararlılığı"`
- `kpiStabilityHeld`: `"{{held}} / {{total}} nudges"` / `"{{held}} / {{total}} oynatma"`
- `kpiStabilityCritical`: `"Most sensitive: {{criterion}} [{{from}}, {{to}}]"` / `"En duyarlı: {{criterion}} [{{from}}, {{to}}]"`
- `kpiStabilityUnconditional`: `"Holds across [0, 1] on every criterion"` / `"Her kriterde [0, 1] boyunca korunuyor"`
- `leaderboardTitle`: `"Ranking leaderboard"` / `"Sıralama liderlik tablosu"`
- `topRowsNote`: `"Showing top {{shown}} of {{total}} (full list in appendix)"` / `"İlk {{shown}} / {{total}} gösteriliyor (tam liste ekte)"`
- `profileTitle`: `"Weighted criterion profile"` / `"Ağırlıklı kriter profili"`
- `profileCaption`: `"Min-max oriented weighted shares (w_j * r_ij) across criteria"` / `"Kriterler genelinde min-maks yönlü ağırlıklı paylar (w_j * r_ij)"`
- `othersCount`: `"Others ({{count}})"` / `"Diğerleri ({{count}})"`
- `headToHeadTitle`: `"#1 vs #2 criterion trade-offs ({{a}} vs {{b}})"` / `"#1 ve #2 kriter ödünleşimi ({{a}} ve {{b}})"`
- `headToHeadCaption`: `"Positive favours {{a}}; negative favours {{b}}"` / `"Pozitif {{a}} lehine; negatif {{b}} lehine"`
- `headToHeadEqual`: `"Identical weighted contributions across all criteria."` / `"Tüm kriterlerde ağırlıklı katkılar eşit."`
- `stabilityTableTitle`: `"Criteria weights and #1 safe range"` / `"Kriter ağırlıkları ve #1 güvenli aralığı"`
- `safeRangeCol`: `"#1 safe band"` / `"#1 güvenli bant"`
- `rankingMechanicsTitle`: `"Ranking mechanics: {{method}}"` / `"Sıralama mekaniği: {{method}}"`
- `weightingMechanicsTitle`: `"Weighting mechanics: {{method}}"` / `"Ağırlıklandırma mekaniği: {{method}}"`
- `ahpDiagnostics`: `"lambda_max = {{lambda}}, CI = {{ci}}, CR = {{cr}} (limit {{threshold}})"` / `"lambda_max = {{lambda}}, CI = {{ci}}, CR = {{cr}} (eşik {{threshold}})"`
- `ahpWorstPair`: `"Most inconsistent pair: {{a}} vs {{b}} (entered {{actual}}, suggested {{suggested}})"` / `"En tutarsız çift: {{a}} ve {{b}} (girilen {{actual}}, önerilen {{suggested}})"`
- `bwmDiagnostics`: `"Anchors: best {{best}}, worst {{worst}} | xi* = {{xi}}, CR-I = {{cr}} (limit {{threshold}})"` / `"Çapalar: en iyi {{best}}, en kötü {{worst}} | xi* = {{xi}}, CR-I = {{cr}} (eşik {{threshold}})"`
- `consistencyOk`: `"Consistent"` / `"Tutarlı"`
- `consistencyReview`: `"Review consistency"` / `"Tutarlılığı inceleyin"`
- `rankLinesTitle`: `"Cross-method rank trajectories"` / `"Yöntemler arası sıra yörüngeleri"`
- `rankLinesTopNote`: `"Top {{shown}} of {{total}} alternatives by Borda consensus"` / `"Borda uzlaşısına göre ilk {{shown}} / {{total}} alternatif"`
- `perturbTitle`: `"Weight perturbation grid (±5%, ±10%, ±20%)"` / `"Ağırlık oynatma ızgarası (±%5, ±%10, ±%20)"`
- `perturbLegend`: `"Petrol = #1 holds; amber = new leader under nudged weight"` / `"Petrol = #1 korundu; kehribar = ağırlık oynatılınca yeni lider"`
- `synthesisTitle`: `"Decision synthesis and diagnostics"` / `"Karar sentezi ve tanılar"`
- `removalAllHeld`: `"Leave-one-out check: removing any single criterion ({{held}}/{{tested}}) keeps the top decision unchanged."` / `"Tek-kriter-çıkarma testi: herhangi bir kriter çıkarıldığında ({{held}}/{{tested}}) birinci karar değişmiyor."`
- `removalFlips`: `"Leave-one-out check: #1 holds in {{held}}/{{tested}} removals; sensitive to dropping {{list}}."` / `"Tek-kriter-çıkarma testi: birinci {{held}}/{{tested}} çıkarmada korunuyor; {{list}} çıkarılmasına duyarlı."`
- `noWarnings`: `"No methodological warnings triggered on this dataset."` / `"Bu veri setinde yöntemsel uyarı tetiklenmedi."`
- `appendixTitle`: `"Audit appendix: full tables and raw decision matrix"` / `"Denetim eki: tam tablolar ve ham karar matrisi"`
- `rawMatrixTitle`: `"Raw decision matrix"` / `"Ham karar matrisi"`
- `rawMatrixBand`: `"Criteria {{from}}-{{to}} of {{total}} (highlighted cells mark best raw value per criterion)"` / `"Kriter {{from}}-{{to}} / {{total}} (vurgulu hücreler kriter başına en iyi ham değeri gösterir)"`

- [ ] **Step 4: Run i18n and chart unit tests**

Run: `pnpm test tests/i18n.test.ts`
Expected: PASS (0 dash errors, 0 emoji errors, 100% EN/TR key and variable parity)

- [ ] **Step 5: Commit**

```bash
git add src/styles/app.css src/features/charts/useHeatTokens.ts src/features/charts/Heatmap.tsx src/i18n/en.json src/i18n/tr.json
git commit -m "feat(report): add A4 paper OKLCH scope, print fragmentation rules, and bilingual report copy"
```

---

### Task 4: Multi-Sheet `ReportDocument`, `ReportPreviewModal`, `ResultsStage` Integration & E2E Verification

**Files:**
- Create: `src/app/workbench/report/ReportDocument.tsx`
- Create: `src/app/workbench/report/ReportPreviewModal.tsx`
- Modify: `src/app/workbench/PrintReport.tsx`
- Modify: `src/app/workbench/ResultsStage.tsx`
- Modify: `src/app/App.tsx:96`
- Modify: `src/app/shell/WorkbenchLayout.tsx:93,123`
- Test: `tests/workbench.test.tsx`, `tests/e2e/workbench.spec.ts`

**Interfaces:**
- Consumes: `computeExecutiveMetrics` from `reportMetrics.ts`, micro-charts from `ReportCharts.tsx`, `ReportDocumentProps` from `types.ts`, `.report-sheet` & `.report-preview-stage` from `app.css`, `ChartTableModeProvider` from `src/features/charts`, `RankLines` from `src/features/illustrations/RankLines`, `whySentences` from `src/app/workbench/compare/why`, `methodViews` and `preloadActiveStagePictures` from `src/app/methods/views`.
- Produces:
  - `ReportDocument(props: ReportDocumentProps): JSX.Element`
  - `ReportPreviewModal(props: ReportDocumentProps & { open: boolean; onOpenChange: (open: boolean) => void; onIncludeAppendixChange: (next: boolean) => void; onPrint: () => void }): JSX.Element`
  - Updated `PrintReport` and `ResultsStage` with on-screen A4 preview modal + `Ctrl+P` parity.

- [ ] **Step 1: Add `data-print-block` to outer flex shell wrappers in `App.tsx` and `WorkbenchLayout.tsx`**

Add `data-print-block` on `<div className="flex min-h-dvh flex-col">` in `src/app/App.tsx` and on `<div className="flex min-h-0 flex-1">` + `<div className="flex min-w-0 flex-1 flex-col">` in `src/app/shell/WorkbenchLayout.tsx` so `@media print` switches every nested flex wrapper to `display: block !important`.

- [ ] **Step 2: Implement `src/app/workbench/report/ReportDocument.tsx`**

Render 2 bounded `.report-sheet` pages (+ optional 3rd `.report-sheet.report-appendix-sheet` when `includeAppendix` is true):
- **Page 1 (`data-testid="report-page-1"`):**
  - Brand (`[◆]` mark + `common.wordmark`) & provenance header (title, page badge, created date, $m \times n$, data source, weighting & ranking full labels).
  - Answer-first Verdict Banner (`data-testid="print-verdict"`): petrol left accent bar (`border-l-[3px] border-l-accent bg-accent-bg/45`) for single clear winner; amber warning bar (`border-l-[3px] border-l-warning bg-warning-bg/55`) when `verdict && verdict.failed.length > 0` or `winner.leaders.length > 1`.
  - **4 KPI Cards Grid (`grid-cols-4 gap-2`):** Winner & Margin, `#1 vs #2` Trade-Off, Cross-Method Consensus (`firstPlace`, Kendall's $W$, Borda leader), Weight Stability (`held/total` + `criticalCriterion` `[w_min, w_max]`).
  - **7:5 Two-Column Visual Body (`grid-cols-12 gap-3`):**
    - Left (`col-span-7`, `data-testid="print-ranking-section"`): Top-8 Leaderboard Table (rank badge, alternative name, up to 2 method-specific columns from `methodViews[rankingMethod].columns`, `MiniScoreBar`, formatted score — NO `data-testid="ranking-row"`!) + `CriterionProfileChart`.
    - Right (`col-span-5`, `data-testid="print-weights-section"`): `HeadToHeadDeltaChart` + Top-8 Criteria Weights & `[w_min, w_max]` `StabilityBandSparkbar` table.
- **Page 2 (`data-testid="report-page-2"`):**
  - Wrapped in `<ChartTableModeProvider value="screen-reader">` so stage charts omit `<details>` table disclosures.
  - Compact running header + method pair badge.
  - **Top 2-Column Method Mechanics Grid (`grid-cols-2 gap-3`):**
    - Left (`max-h-[64mm] overflow-hidden`): Active Ranking Stage SVG (`methodViews[rankingMethod].stage?.Component` in `<Suspense>`, plus `ScoreChart` fallback when `!stage`) + method `constants` (`MARCOS` `f(K-)/f(K+)`, `ARAS` `S_0`).
    - Right (`max-h-[64mm] overflow-hidden`): Active Weighting Stage SVG (`methodViews[weightMethod].stage?.Component` in `<Suspense>`, or `WeightsChart` fallback for `manual`) + `weightDiagnostics` summary (`AHP` $\lambda_{\max}, CI, CR$ & worst pair; `BWM` anchors, $\xi^*, CR^I$; or compact top-4 objective/ordinal intermediate metrics).
  - **Middle Cross-Method `RankLines` Band (`max-h-[56mm] overflow-hidden`):** When `comparison.comparable`, render `RankLines` (bounded to top 10 alternatives by Borda rank when $m > 10$, re-indexing `selected` pair if present) + algebraic echo badges.
  - **Bottom 2-Column Robustness & Synthesis Grid (`grid-cols-2 gap-3`, `data-testid="print-robustness-summary"`):**
    - Left: Compact `±5% / ±10% / ±20%` Weight Perturbation Grid (top 7 criteria by weight; petrol cell when `sameTop`, amber cell with new leader short label when flipped) + explicit `kendallW`, `bordaLeader`, `firstPlaceAgreement`, `weightStability` summary strip.
    - Right: Automated KDS Synthesis (`whySentences` for `defaultPair(comparison)`, `removalSummary` Leave-One-Out verdict, and active method warnings).
- **Page 3+ (`data-testid="report-page-appendix"`, rendered when `includeAppendix` is true):**
  - Full untruncated Ranking Table (all $m$ alternatives, all `methodViews[rankingMethod].columns`).
  - Full untruncated Criteria Weights Table (all $n$ criteria, all `methodViews[weightMethod].columns`).
  - Horizontally chunked Raw Decision Matrix (`metrics.matrixBands`, `<= 7` criteria columns per `.report-matrix-band`, repeating `Alternative` column and highlighting `bestMatrixRows[col].has(row)` in `bg-accent-bg font-semibold text-accent`).

- [ ] **Step 3: Implement `src/app/workbench/report/ReportPreviewModal.tsx`, `PrintReport.tsx`, and wire `ResultsStage.tsx`**

- `ReportPreviewModal.tsx`: Uses `Dialog` + `DialogContent` (`className="no-print !max-w-[960px]"`) with header action toolbar containing the **"Include audit appendix"** checkbox/toggle (`data-testid="report-appendix-toggle"`, showing `"Recommended (mxn)"` badge when `m > 8 || n > 8`) and primary **"Print / Save PDF"** button (`data-testid="report-confirm-print"`), above a scrollable `.report-preview-stage` (`bg-surface-2 p-4`) displaying `<ReportDocument />`.
- `PrintReport.tsx`: Thin wrapper computing/forwarding `ReportDocumentProps` inside `<article aria-label={t('workbench.results.print.title')} className="print-only hidden" data-testid="print-report">`.
- `ResultsStage.tsx`:
  - Wrap `<MethodWarnings>` in `<div className="no-print">` so screen warnings do not leak above Page 1.
  - Call `useEffect(() => { void preloadActiveStagePictures([weightMethod, rankingMethod]) }, [weightMethod, rankingMethod])`.
  - Add `[previewOpen, setPreviewOpen] = useState(false)` and `[includeAppendix, setIncludeAppendix] = useState(false)`.
  - Implement `triggerPrint()` that temporarily sets `document.title = \`MCDM-Report-${weightMethod.toUpperCase()}-${rankingMethod.toUpperCase()}-${date}\`` around `window.print()` and restores the previous title on `afterprint` / `finally`.
  - Clicking `data-testid="print-report-button"` opens `ReportPreviewModal` (`setPreviewOpen(true)`).

- [ ] **Step 4: Update/add unit and Playwright E2E tests in `tests/workbench.test.tsx` and `tests/e2e/workbench.spec.ts`**

- In `tests/workbench.test.tsx`: Verify `ResultsStage` SSR HTML contains `print-report-button`, `print-report`, `print-verdict`, `print-weights-section`, `print-ranking-section`, `print-robustness-summary`, `report-page-1`, `report-page-2`, KPI cards, `CriterionProfileChart` & `HeadToHeadDeltaChart` SVGs, and `report-page-appendix` when `includeAppendix` is enabled; also verify VIKOR compromise verdict renders warning banner styling.
- In `tests/e2e/workbench.spec.ts`: Add E2E test that navigates to Results, verifies `ranking-row` visibility on screen, opens `ReportPreviewModal` via `print-report-button`, verifies Page 1 & Page 2 A4 sheets and charts render without horizontal overflow and keep light paper background even under `data-theme="dark"`, toggles `report-appendix-toggle` to reveal `report-page-appendix` with raw matrix bands, and verifies `window.print` trigger via `report-confirm-print`.

- [ ] **Step 5: Run full verification suite and commit**

Run:
```bash
pnpm test
pnpm e2e
pnpm build
```
Expected: 100% unit tests pass, 100% Playwright E2E tests pass, production build succeeds cleanly.

```bash
git add src/app/App.tsx src/app/shell/WorkbenchLayout.tsx src/app/workbench/PrintReport.tsx src/app/workbench/ResultsStage.tsx src/app/workbench/report/ReportDocument.tsx src/app/workbench/report/ReportPreviewModal.tsx tests/workbench.test.tsx tests/e2e/workbench.spec.ts
git commit -m "feat(report): ship executive 2-page A4 dashboard report and preview modal"
```
