# Method Comparison Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A workbench stage "Compare" that runs every ranking method on the same problem and weights, draws their ranks as crossing lines with a Borda rank and Kendall's W, and explains in words why two alternatives swap between methods.

**Architecture:** Pure core module `src/core/compare.ts` (run all methods through `prepareRanking`, Borda, W, pair facts), unit-tested. A lazy stage chunk `src/app/workbench/compare/` with its own i18n namespace `compare` (like `robustness`), a hand-written SVG rank-line chart inside `ChartFigure`, and a "why" panel that turns the pair facts into sentences.

**Tech Stack:** TypeScript, React, zustand store, i18next, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-17-method-comparison-design.md` (read it first; owner decisions 1-7 are binding).

## Global Constraints

- Code, comments, commits in English. Style: single quotes, no semicolons, width ~120, trailing commas. Do not run default prettier.
- Every user-visible string in `src/i18n/compare.en.json` and `compare.tr.json`; same keys and `{{vars}}` in both; no em or en dash, no emoji; Turkish address "siz"; write "min-maks", never "min-max".
- DESIGN.md copy rule: short title + at most one sentence per block; details in a disclosure.
- MOTION.md: motion only explains a state change; no entrance fades or staggers.
- Colours only from tokens (`data-cat="1".."8"|"other"`, `--data-cat-*`), no hex.
- The Borda ranking is shown next to the individual rankings, never instead of them.
- Each method runs with its own saved options: `paramsFor(data, id)`; weights = `useWeights().value.weights`.
- Method order = `RANKING_METHODS` in `RankingStage.tsx:27` (`topsis, saw, vikor, edas`); derive the list, do not hard-code it in the new code (import `rankingMethods` from core, whose order is the same).
- Done per task = `pnpm typecheck` and `pnpm test` pass; final task also `pnpm build`, `pnpm e2e`.

## Review Focus

- **A method that cannot rank** (SAW with a 0 cell, EDAS with a non-positive column average): its column is empty with its issue text, it is excluded from Borda and W, summary says "3 of 4 methods ranked". Test in Task 1 and Task 6.
- **Fewer than 2 methods rank**: the stage shows the blocked state, no chart. Test in Task 1 (`comparable: false`) and Task 3.
- **Tied ranks** inside a method or in Borda points: competition ranks shared, lines meet at the same y, the "why" panel never claims one is "above" the other when tied. Test in Task 1 and Task 2.
- **All methods identical**: no crossing; the panel says so in one sentence. Test in Task 2 and Task 5.
- **Many alternatives (47-item example)** and 390 px width: labels do not overlap into unreadability, no sideways page scroll. Checked in Task 6 e2e (`scrollWidth <= clientWidth`) and screenshots.

---

### Task 1: Core comparison: run all methods, Borda, Kendall's W

**Files:**
- Create: `src/core/compare.ts`
- Modify: `src/core/index.ts` (export the module)
- Test: `tests/compare.test.ts`

**Interfaces:**
- Consumes: `prepareRanking(problem, run): PreparedRanking`, `RankingRun`, `rankingMethods`, `rankScores(scores, order)` (`src/core/rank.ts`), `midRanks` (`src/core/robustness.ts:567`).
- Produces:
  ```ts
  export type MethodRun = { methodId: string; result: RankingResult | null; issues: ValidationIssue[] }
  export type Comparison = {
    runs: MethodRun[]            // one per method, registry order
    ranked: string[]             // methodIds with a result
    comparable: boolean          // ranked.length >= 2
    borda: { points: number[]; ranking: number[] } | null   // null when !comparable
    kendallW: number | null      // null when !comparable
    firstPlace: { alternative: number; methods: number; of: number } | null // most common first place
  }
  export function compareRankings(problem: Problem, weights: number[], runs: RankingRun[]): Comparison
  export function bordaCount(rankings: number[][]): { points: number[]; ranking: number[] }
  export function kendallW(rankings: number[][]): number
  ```

- [ ] **Step 1: Write the failing tests** in `tests/compare.test.ts`:
  - `bordaCount([[1,2,3],[2,1,3],[1,3,2]])` → points `[5,4,3]` (points = Σ(n − rank)), ranking `[1,2,3]`.
  - `bordaCount([[1,2],[2,1]])` → points `[1,1]`, ranking `[1,1]` (tie shared).
  - `kendallW` of identical rankings `[[1,2,3],[1,2,3]]` → `1`; of `[[1,2,3],[3,2,1]]` → `0`; of `[[1,2,3,4],[1,3,2,4],[2,1,3,4]]` → the value of the guide formula `W = 12 Σ(R_i − R̄)² / (m²(n³ − n))` with mid-ranks, computed by hand in the test (no tie correction, say so in a comment in compare.ts).
  - Reference example (`getExample('keshavarz-2015-ten-alternatives')`, its weights, runs for every `rankingMethods` id with `params: {}`): `comparable === true`, four rankings equal to TOPSIS `[1,4,6,10,7,8,2,3,5,9]`, SAW `[1,3,6,9,7,8,2,4,5,10]`, VIKOR `[2,5,7,9,6,8,1,3,4,10]`, EDAS `[1,4,6,10,7,8,2,3,5,9]`; `borda.points[0] === 35`, `borda.points[6] === 33`, `borda.ranking[0] === 1`, `borda.ranking[6] === 2`; `firstPlace` = `{ alternative: 0, methods: 3, of: 4 }`; `kendallW` equals `kendallW` of those four arrays and lies in (0.9, 1].
  - A zero cell in that problem (set `matrix[0][0] = 0`): the SAW run has `result === null` and an issue with code `non-positive-value`; `ranked` has 3 ids; `firstPlace.of === 3`.
  - Only one method can rank: the zero-cell problem with runs `[{ methodId: 'saw', params: {} }, { methodId: 'topsis', params: {} }]` → `ranked` = `['topsis']`, `comparable === false`, `borda === null`, `kendallW === null`.
- [ ] **Step 2:** Run `pnpm vitest run tests/compare.test.ts`; expected FAIL (module missing).
- [ ] **Step 3: Implement** `compareRankings`, `bordaCount`, `kendallW` in `src/core/compare.ts`. Borda ranking via `rankScores(points, 'desc')`. W over `midRanks` of each ranking. `firstPlace`: count, over ranked methods, which alternative has rank 1 (ties: count each tied alternative); pick the most common, lowest index on ties.
- [ ] **Step 4:** `pnpm vitest run tests/compare.test.ts` PASS; `pnpm typecheck` clean.
- [ ] **Step 5: Commit** `git add src/core/compare.ts src/core/index.ts tests/compare.test.ts && git commit -m "Compare core: every ranking method on the same weights, Borda count, Kendall's W, the common first place"`

### Task 2: Core pair facts for the "why" panel

**Files:**
- Modify: `src/core/compare.ts`
- Test: `tests/compare.test.ts`

**Interfaces:**
- Consumes: `Comparison` (Task 1); VIKOR step `vikor.weightedDistance` (m×n regret matrix, `vikor.ts:165-171`).
- Produces:
  ```ts
  export type PairFacts = {
    a: number; b: number                                   // alternative indices, a = Borda-higher (or lower index on tie)
    criteria: { col: number; better: 'a' | 'b' }[]         // 1 to 3, most decisive first
    methods: { methodId: string; higher: 'a' | 'b' | 'tie' }[]   // ranked methods only, from their actual ranking
    vikorRegret: { a: number; b: number } | null           // column giving each one's R (argmax of its row); null if VIKOR did not rank
    unanimous: boolean                                     // every ranked method orders a and b the same way
  }
  export function defaultPair(c: Comparison): [number, number] | null   // Borda rank 1 and the next alternative by Borda order
  export function pairFacts(problem: Problem, weights: number[], c: Comparison, i: number, k: number): PairFacts
  export function identicalRankings(c: Comparison): boolean
  ```

- [ ] **Step 1: Write the failing tests:**
  - Reference example: `defaultPair(c)` → `[0, 6]` (A1, A7).
  - `pairFacts(p, w, c, 0, 6)`: `methods` = topsis `'a'`, saw `'a'`, vikor `'b'`, edas `'a'`; `unanimous === false`; `criteria.length` between 1 and 3; every listed criterion has `better` consistent with the matrix and the criterion type (C3 benefit: A7 2.43 > A1 2.37 → if C3 is listed, `better === 'b'`; C5 cost: A7 160 < A1 167 → if listed, `'b'`).
  - `vikorRegret` for the pair: compute once from `vikor.weightedDistance` by hand while writing the test, check it against the matrix (A1 row max, A7 row max), then pin the two column indices as literals.
  - Criterion decisiveness rule (spec decision 7): per column, `weights[j] * |x_aj − x_bj| / (max_j − min_j)` (0 for a constant column), keep columns with a non-zero value, sort descending, top 3. Test on a 3×3 hand problem where the order is known.
  - Tie: a problem where two methods tie a and b → that method's `higher === 'tie'`, `unanimous` false only if another method disagrees.
  - `identicalRankings` true when all rankings are equal (e.g. a 3×2 problem with a dominating alternative order).
- [ ] **Step 2:** run, expect FAIL.
- [ ] **Step 3: Implement** in `src/core/compare.ts`. `higher` from the method's `ranking` (lower rank number = higher), `'tie'` when equal.
- [ ] **Step 4:** tests PASS, typecheck clean.
- [ ] **Step 5: Commit** `"Compare core: pair facts (decisive criteria, each method's side, VIKOR's regret criterion)"`

### Task 3: Stage wiring, namespace, blocked states, rail line

**Files:**
- Modify: `src/state/workbench.ts:27` (`STAGES` gets `'compare'` after `'robustness'`)
- Modify: `src/app/workbench/WorkbenchPage.tsx` (lazy chunk like `loadRobustness` at :24-34, `NO_ATTEMPTS` :111, preload in `goTo` :134-146 and idle warm :172-181, content chain :240-250, `stageMeta` :210-237)
- Modify: `src/app/workbench/ExplanationPanel.tsx:132` (compare branch: one short note about what the stage does, ≤60 words)
- Modify: `src/i18n/en.json`, `tr.json`: `workbench.stages.compare`, `workbench.empty.compare.{title,description}`, `workbench.continue.compare`, `workbench.loadingCompare`, `workbench.explanation.compare`, `workbench.rail.compare` (`"First place: {{name}} in {{n}} of {{of}}"`)
- Modify: `src/app/workbench/robustness/RobustnessStage.tsx` (a `ContinueBar to="compare"` at the end, like `ResultsStage.tsx:248`)
- Create: `src/app/workbench/compare/CompareStage.tsx`, `src/app/workbench/compare/text.ts`, `src/i18n/compare.en.json`, `src/i18n/compare.tr.json`
- Modify: `src/i18n/index.ts:15-17` (type the `compare` namespace)
- Test: `src/i18n/compare.test.ts` (copy of `src/i18n/robustness.test.ts` for the new namespace), `tests/e2e/a11y.spec.ts:230` (`PANEL_RUNS` add `compare`)

**Interfaces:**
- Consumes: `compareRankings`, `rankingMethods`, `paramsFor`, `useWeights`, `toProblem`, `alternativeName`, `criterionName`, `EmptyState`, `BlockedByIssues`, `useWorkbenchNav`.
- Produces: `export const COMPARE_NS = 'compare'`, `useCompareText()` (pattern of `robustness/text.ts`); `CompareStage` default export rendering `<CompareChart>` (Task 4) and `<WhyPanel>` (Task 5) once those exist (until then a placeholder `<div data-testid="compare-ready" />`).

- [ ] **Step 1:** Add `'compare'` to `STAGES`; run `pnpm typecheck`, follow every error (`NO_ATTEMPTS` etc.).
- [ ] **Step 2:** Create the namespace files and `text.ts`; add `src/i18n/compare.test.ts`; run `pnpm vitest run src/i18n` PASS.
- [ ] **Step 3:** `CompareStage`: empty problem → `EmptyState` with `workbench.empty.compare.*` and a button to Data (as `RobustnessStage.tsx:51-67`); weights blocked or `!comparison.comparable` → `EmptyState` + `BlockedByIssues` with the weights' issues, or with the issues of every method that could not rank. The comparison is `useMemo(() => compareRankings(problem, w, rankingMethods.map((m) => ({ methodId: m.id, params: paramsFor(data, m.id) }))), [...])` where `data` selects `methodParams` from the store.
- [ ] **Step 4:** Rail line: compute `compareRankings` in `WorkbenchPage` `stageMeta` when weights are valid (synchronous; the core is in the main chunk) → `t('workbench.rail.compare', { name, n, of })`, state `done` when `firstPlace.methods === firstPlace.of`, else `attention`.
- [ ] **Step 5:** `pnpm typecheck`, `pnpm test` PASS; open `pnpm dev` `/app?example=keshavarz-2015-ten-alternatives&stage=compare` once and see the rail entry and the stage.
- [ ] **Step 6: Commit** `"Compare stage: wiring, its own text namespace, empty and blocked states, rail line"`

### Task 4: Rank-line chart

**Files:**
- Create: `src/features/illustrations/RankLines.tsx` (+ export in `illustrations/index.ts`, styles in `illustrations.module.css`)
- Modify: `src/app/workbench/compare/CompareStage.tsx`
- Test: `tests/e2e/compare.spec.ts` (created here, extended in Task 6)

**Interfaces:**
- Consumes: `Comparison`, alternative names, method labels (`workbench.rankingMethod.<id>` from the default namespace), `vikorCompromise` result for the VIKOR note (Task decision 6), `ChartFigure` (`src/features/charts/ChartFigure.tsx:38`).
- Produces:
  ```ts
  type RankLinesProps = {
    columns: { methodId: string; label: string; ranking: number[] | null; note?: string; reason?: string }[]
    borda: number[] | null
    names: string[]
    selected: [number, number] | null
    onSelectPair: (pair: [number, number]) => void
    labels: Partial<RankLinesLabels>
  }
  export function RankLines(props: RankLinesProps): JSX.Element
  ```

- [ ] **Step 1: Write the failing e2e** `tests/e2e/compare.spec.ts` › "compare: four method columns, VIKOR's A7 first, Borda at the end": goto `/app?example=keshavarz-2015-ten-alternatives&stage=compare`; heading level 1 `Compare`; `getByTestId('rank-column')` count 4 in order TOPSIS, SAW, VIKOR, EDAS; the VIKOR column's rank-1 label is `A7`, the others `A1`; `getByTestId('vikor-note')` text `VIKOR's own rule: compromise set A7, A1, A8`; `getByTestId('borda-rank')` for A1 is `1`.
- [ ] **Step 2:** `pnpm e2e -g compare` FAIL.
- [ ] **Step 3: Implement** `RankLines`: one column per method, y = rank (ties share a y), one polyline per alternative (`data-cat` by alternative index, `other` beyond 8), names on the left at the first ranked column, Borda rank at the right end; a column with `ranking === null` shows its `reason` text instead of points. Crossings: every adjacent-column segment pair that swaps order is a focusable hit target (`data-testid="crossing"`, `data-pair="i-k"`), roving tabindex and arrow keys as in `EdasIdea.tsx` `move`; Enter/click calls `onSelectPair`. Selected pair: its two lines in full colour, others dimmed (state change only, MOTION.md). `ChartFigure` "Show as table" table: rows = alternatives, columns = methods + Borda. Height grows with alternatives (≥ 22 px per row) so 47 items stay readable; width fits the container (`useElementWidth`).
- [ ] **Step 4:** e2e PASS; `pnpm typecheck`, `pnpm test` PASS.
- [ ] **Step 5: Commit** `"Compare stage: rank lines with Borda, selectable crossings and a table view"`

### Task 5: "Why" panel

**Files:**
- Create: `src/app/workbench/compare/WhyPanel.tsx`
- Modify: `src/i18n/compare.en.json`, `compare.tr.json` (sentences below), `CompareStage.tsx`
- Test: `tests/compare-text.test.ts` (pure sentence builder), e2e in Task 6

**Interfaces:**
- Consumes: `PairFacts`, `defaultPair`, `identicalRankings` (Task 2), names, criterion names, method labels.
- Produces: `export function whySentences(f: PairFacts, ctx: { names: string[]; criteria: string[]; methodLabel: (id: string) => string; t: TFunction }): string[]` (in `WhyPanel.tsx` or a sibling `why.ts`), and `WhyPanel` rendering a short title (`"{{a}} or {{b}}?"`) plus those sentences.

Sentence keys (one sentence each; owner's example is the target meaning, wording is the builder's within DESIGN.md):
- `why.title`: `{{a}} or {{b}}?`
- `why.criteria`: `{{a}} is ahead on most criteria but behind on {{list}}.` (and `why.criteriaAhead` for when `a` is behind on none: `{{a}} is ahead on {{list}}.`)
- `why.group`: `{{methods}} put {{name}} first.` (one per side; list joined with the locale's "and")
- `why.character.topsis|saw|vikor|edas`: TOPSIS: distance to the ideal and the anti-ideal, strengths can make up for a weakness; SAW: weighted sum, strengths make up for a weakness fully; VIKOR: weighs the total against the single largest regret, one big weakness weighs heavily; EDAS: distance above and below the average, strengths make up for a weakness.
- `why.vikorRegret`: `VIKOR's largest regret for {{a}} is on {{ca}}, for {{b}} on {{cb}}.`
- `why.unanimous`: `All {{n}} methods put {{a}} above {{b}}.`
- `why.identical`: `All {{n}} methods give the same ranking.`
- `why.tie`: `{{method}} ranks {{a}} and {{b}} equal.`

- [ ] **Step 1: Write the failing test** `tests/compare-text.test.ts`: with `pairFacts` of the reference A1/A7 and the real `i18n` EN bundle: sentences contain `TOPSIS, SAW and EDAS put A1 first.`, `VIKOR put A7 first.` (or the plural/singular form you choose; pin what you write), the VIKOR character sentence, and the `vikorRegret` sentence with the criterion names pinned in Task 2; for an identical-ranking problem → exactly one sentence `why.identical`; for a unanimous pair → contains `why.unanimous`.
- [ ] **Step 2:** run, FAIL.
- [ ] **Step 3: Implement** `whySentences` and `WhyPanel`; the panel shows the default pair on load and follows `selected` from the chart; character sentences only for methods present on the losing side of a disagreement (keep the panel short: ≤ 5 sentences).
- [ ] **Step 4:** tests PASS; TR bundle has the same keys (namespace test from Task 3 covers it).
- [ ] **Step 5: Commit** `"Compare stage: the why panel, generated from the pair facts"`

### Task 6: End-to-end, screenshots, docs

**Files:**
- Modify: `tests/e2e/compare.spec.ts`
- Modify: `docs/design/ADDING-A-METHOD.md` (§4 or §5: a new ranking method adds `why.character.<id>` in the compare namespace; §14 now describes the Compare stage)
- Modify: `docs/superpowers/specs/2026-10-17-method-comparison-design.md` status line → `implemented <date>`

- [ ] **Step 1: Write the e2e cases:**
  - "compare: the why panel opens on A1 and A7, and a crossing changes the pair": panel title `A1 or A7?`, contains `VIKOR`; focus the first `crossing` that is not `0-6`, press Enter, title changes to that pair.
  - "compare: a zero cell leaves SAW out with its reason": `/app?example=keshavarz-2015-ten-alternatives&stage=data`, type `0` into `#wb-cell-0-0` (pattern of the SAW e2e at `workbench.spec.ts`), go to Compare; SAW column shows the issue text; summary contains `3 of 4`.
  - "compare: Turkish": click the TR button in the top bar, heading `Karşılaştır` (or your TR stage name), panel title `A1 mi A7 mi?`.
  - "compare: no sideways scroll at 390 px and with 47 items": `keshavarz-2015-inventory` at width 390, `document.documentElement.scrollWidth <= clientWidth`.
- [ ] **Step 2:** `pnpm e2e -g compare` PASS (fix code, not assertions, when they fail for a real reason).
- [ ] **Step 3:** Full gate: `pnpm typecheck && pnpm test && pnpm build && pnpm e2e` all PASS.
- [ ] **Step 4:** Screenshots: `pnpm shot "/app?example=keshavarz-2015-ten-alternatives&stage=compare" --theme both --width 1440,390` and `--lang tr`; look at every PNG (labels, dimming, VIKOR note, panel length).
- [ ] **Step 5:** Docs updates above.
- [ ] **Step 6: Commit** `"Compare stage: end-to-end runs, docs"`
