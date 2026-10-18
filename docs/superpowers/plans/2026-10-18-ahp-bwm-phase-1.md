# AHP and BWM, Phase 1: Judgement Model, Pairwise Card, BWM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BWM as a working weighting method on the Weights stage, entered card by card through a shared `PairwiseCard` and a live `JudgementPanel`, on a judgement model in core and store that AHP (Phase 2) reuses; plus the BWM method page with "Step through the idea".

**Architecture:** Core gets a `Judgements` type (full n × n reciprocal matrix of answers, index-aligned with the criteria, plus BWM anchors) and an optional third `compute` argument read only by methods with `reads: 'judgements'`. BWM is a pure closed-form solver (Ratandhara & Kumar) with Liang's input-based CR. The store carries judgements exactly where it carries `manualWeights`, through one shared criterion-matching function. The input UI is a pure queue model (`pairwiseQueue.ts`) plus three presentational components in `src/features/pairwise/`, composed on the Weights stage by `JudgementWeights`.

**Tech Stack:** TypeScript, React 19, zustand persist, Radix toggle group, i18next, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-18-ahp-bwm-judgments-design.md` (Phase 1 only; "Resolved (Fatih, 18.10)" and "Iroh's calls after the builder check" are binding). Method card: `docs/research/methods/bwm.md` (formulas, thresholds, fixtures, copy). Read `docs/research/methods/ahp.md` "Input UX" for the two-sided card mode. Checklist: `docs/design/ADDING-A-METHOD.md`.

## Global Constraints

- Code, comments, commits in English; commit messages without any `Co-Authored-By` line; no push. Style: single quotes, no semicolons, width ~120, trailing commas (never run default prettier).
- No new runtime dependency. BWM is the **linear model only**, solved in **closed form** (card Algorithm step 4); no LP or simplex in the bundle. One dev dependency is allowed: `@axe-core/playwright` (spec §7 "axe on the card").
- `WorkbenchData.judgements` is optional; no `STORAGE_VERSION` bump. `alternativeJudgements`, `RankingRun.judgements`, the `ahp` id, the xlsx "Judgements" sheet and removal-recompute with judgements are **not** in this phase.
- The five objective methods (`critic`, `entropy`, `sd`, `merec`, `equal`) and their tests do not change.
- Judgement invariants (spec §1): `pairs` is n × n, `pairs[i][i] = 1`, `pairs[j][i] = 1 / pairs[i][j]`, every value one of the 17 scale values 1/9 … 1/2, 1, 2 … 9; `null` = unanswered. BWM reads a_Bj = pairs[B][j], a_jW = pairs[j][W], a_BW = pairs[B][W].
- **Never block on consistency**; CR^I over Liang's threshold is a warning with the criterion. **No silent clamping:** an answer above a_BW (in BWM's direction) counts as unanswered and is asked again; the stored value is never rewritten. **No hint before an answer:** a suggestion appears only on a flagged, answered card. Best ≠ worst.
- Weights selector order: CRITIC, Entropy, SD, MEREC, Equal weights, Manual, BWM (7 options in Phase 1; AHP is inserted before BWM in Phase 2). Below `sm` it is a 4-column grid.
- MOTION.md: no entry animation, no card slide, no confetti. Progress indicator moves with `--dur-slow`, panel bars with `--dur-data` (transform only). Reduced motion: 0. No literal `ms` in components.
- Targets ≥ 44 px; value cells ≥ 56 px; side row 48 px tall. Colour is never the only signal (flag = icon + text).
- `src/features/*` components: own `*.module.css` reading tokens only, no Tailwind, no `src/ui` import, every string through props.
- Copy: EN and TR keys identical with identical `{{vars}}`; TR address "siz"; no em/en dash, no emoji; scale words and labels from the BWM card ("UI labels"): 1 equal/eşit, 3 moderately/biraz, 5 strongly/güçlü, 7 very strongly/çok güçlü, 9 extremely/son derece; "Most important (best)"/"En önemli (en iyi)", "Least important (worst)"/"En önemsiz (en kötü)", "Consistency (CR)"/"Tutarlılık (CR)".
- Done per task: `pnpm typecheck` and `pnpm test` green. Tasks touching UI also `pnpm e2e` (starts its own Vite on 127.0.0.1:5191). Final task also `pnpm build`.

## Review Focus

- **a_BW lowered after the other answers were given**: answers now above a_BW turn unanswered (store unchanged), the queue walks back to them, raising a_BW again restores them. Tests: Task 2 (`bwmAnswers` cap), Task 4 (`answerOf` cap), Task 7 e2e.
- **The best or worst criterion is deleted in the grid**: the anchor becomes null and BWM asks for it again; undo brings the anchor and every answer back. Test: Task 3.
- **Switching the weighting method away from BWM and back** (or to Manual and back): the answers are still there and the flow resumes at the first unanswered question. Tests: Task 3 (store), Task 7 e2e.
- **A reload in the middle of the questions**: persisted answers load, the card opens on the first unanswered question, nothing is re-asked. Test: Task 7 e2e (`page.reload()`).
- **n = 2 and n > 9**: n = 2 asks only a_BW and the panel shows "not applicable" instead of a gauge; n = 10 computes with the n = 9 threshold and a `bwm.threshold-approximate` warning. Tests: Task 2, Task 5 (panel), Task 6.

---

### Task 1: Judgement model in core

**Files:**
- Modify: `src/core/types.ts` (add `Ratio`, `Judgements`; extend `WeightingMethod`)
- Create: `src/core/judgements.ts`
- Modify: `src/core/index.ts` (`export * from './judgements'`)
- Test: `tests/judgements.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `types.ts`: `export type Ratio = number`; `export type Judgements = { pairs: (Ratio | null)[][]; best: number | null; worst: number | null }` (doc comments verbatim from spec §1); `WeightingMethod` gains `reads?: 'data' | 'judgements'` and `compute(problem: Problem, params: P, judgements?: Judgements): WeightingResult`.
  - `judgements.ts`:
    - `export const SCALE: readonly Ratio[]` (17 values ascending, 1/9 … 9)
    - `export function toScale(v: unknown): Ratio | null` (the scale value within 1e-9, else null)
    - `export function emptyJudgements(n: number): Judgements` (diagonal 1, rest null, anchors null)
    - `export function setPair(j: Judgements, i: number, k: number, v: Ratio | null): Judgements` (writes `[i][k] = v`, `[k][i] = 1 / v`; immutable)
    - `export function remapJudgements(j: Judgements, map: readonly (number | undefined)[]): Judgements` (`next[a][b] = old[map[a]][map[b]]`, an unmapped row/column is null, anchors follow the map or become null)
    - `export function sanitizeJudgements(raw: unknown, n: number): Judgements` (trust boundary: refit to n × n, off-scale → null, rebuild the lower triangle from the upper, diagonal 1, anchor out of range / non-integer / best = worst → null)
    - `export function judgementsFromBwm(n: number, best: number, worst: number, bestToOthers: readonly number[], othersToWorst: readonly number[]): Judgements` (fills pairs[B][j] and pairs[j][W]; used by tests, the method-page example and content tests)

- [ ] **Step 1: Write the failing tests** in `tests/judgements.test.ts`:

```ts
it('has the 17 scale values', () => {
  expect(SCALE).toHaveLength(17)
  expect(SCALE[0]).toBeCloseTo(1 / 9, 15); expect(SCALE[8]).toBe(1); expect(SCALE[16]).toBe(9)
  expect(toScale(0.5000000001)).toBe(0.5); expect(toScale(10)).toBeNull(); expect(toScale(2.5)).toBeNull(); expect(toScale('3')).toBeNull()
})
it('setPair keeps reciprocity and the diagonal', () => {
  const j = setPair(emptyJudgements(3), 0, 2, 4)
  expect(j.pairs[0]![2]).toBe(4); expect(j.pairs[2]![0]).toBe(0.25); expect(j.pairs[1]![1]).toBe(1)
  expect(setPair(j, 0, 2, null).pairs[2]![0]).toBeNull()
})
it('remapJudgements permutes rows and columns, drops and adds', () => {
  const j = { ...judgementsFromBwm(3, 0, 2, [1, 2, 4], [4, 2, 1]) }
  const r = remapJudgements(j, [2, undefined, 0]) // new 0 = old 2, new 1 = new criterion, new 2 = old 0
  expect(r.pairs[2]![0]).toBe(4); expect(r.pairs[0]![2]).toBe(0.25); expect(r.pairs[1]![0]).toBeNull()
  expect(r.best).toBe(2); expect(r.worst).toBe(0)
  expect(remapJudgements(j, [1, 2]).best).toBeNull() // old best (0) is gone
})
it('sanitizeJudgements repairs hand-edited state', () => {
  const s = sanitizeJudgements({ pairs: [[1, 7, 11], [0.5, 1]], best: 1, worst: 1 }, 3)
  expect(s.pairs).toEqual([[1, 7, null], [1 / 7, 1, null], [null, null, 1]]) // upper wins, 11 off-scale, refit to 3
  expect(s.best).toBeNull(); expect(s.worst).toBeNull()
  expect(sanitizeJudgements(undefined, 2)).toEqual(emptyJudgements(2))
  expect(sanitizeJudgements({ pairs: [], best: 5, worst: 0 }, 3).best).toBeNull()
})
```

- [ ] **Step 2:** `pnpm test tests/judgements.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement the types and `src/core/judgements.ts` as specified; export from `src/core/index.ts`. The five objective methods are not touched (the third parameter is optional).
- [ ] **Step 4:** `pnpm typecheck && pnpm test` → PASS.
- [ ] **Step 5: Commit** `git add src/core/types.ts src/core/judgements.ts src/core/index.ts tests/judgements.test.ts && git commit -m "Core: judgement model (reciprocal pairs, anchors) and the optional judgements argument of WeightingMethod"`

---

### Task 2: BWM core (closed form, CR^I, Liang thresholds, suggestion, progress), not registered yet

**Files:**
- Create: `src/core/methods/bwm.ts`
- Modify: `src/core/validate.ts` (`ValidationCode` += `'judgements-incomplete' | 'anchors-missing'`)
- Modify: `src/core/index.ts` (`export { bwm, bwmAnswers, bwmSolve, bwmConsistency, liangThreshold, bwmSuggestion, bwmProgress, type BwmAnswers, type BwmProgress } from './methods/bwm'`)
- Modify: `docs/research/scripts/bwm.py` (an `--oracle` mode)
- Create fixtures (JSON copied verbatim from the card, `published` and `expected` kept apart): `tests/fixtures/bwm-rezaei2016-car.json` (F1), `tests/fixtures/bwm-ratandhara-kumar.json` (F2), `tests/fixtures/bwm-demir-bircan2020.json` (F3), `tests/fixtures/bwm-arsu2021.json` (F4), `tests/fixtures/bwm-lp-oracle.json` (generated)
- Test: `tests/bwm.test.ts`

**Interfaces:**
- Consumes: `Judgements`, `Ratio`, `judgementsFromBwm` (Task 1); `ProblemValidationError`, `assertValid` (validate.ts).
- Produces:
  - `type BwmAnswers = { best: number; worst: number; bestToOthers: (number | null)[]; othersToWorst: (number | null)[] }`
  - `bwmAnswers(j: Judgements): BwmAnswers | null` — null when an anchor is missing or best = worst. Entry [B] of bestToOthers is 1, [W] is a_BW; othersToWorst [W] = 1, [B] = a_BW. Any other entry is the stored ratio only when it is an integer in 1..cap (cap = a_BW, or 9 while a_BW is unanswered), else null (wrong direction from AHP, above the cap).
  - `bwmSolve(bestToOthers: readonly number[], othersToWorst: readonly number[], best: number, worst: number): { weights: number[]; xi: number }` — card step 4 (Eqs. 16–18, η = 0 → step 2).
  - `bwmConsistency(bestToOthers, othersToWorst, best, worst): { local: number[]; crInput: number; mostInconsistent: number }` — card step 5–6 (0 when a_BW = 1; argmax, first on ties).
  - `liangThreshold(aBW: number, n: number): { value: number; approximate: boolean } | null` — Liang Table 3 embedded as a constant (card table, rows a_BW 3..9, columns n 3..9); a_BW ≤ 2 → `{ value: 0 }`; n > 9 → column 9, `approximate: true`; n < 3 → null.
  - `bwmSuggestion(bestToOthers, othersToWorst, best, worst, j): { side: 'bestToOthers' | 'othersToWorst'; value: number }` — the single value in 1..a_BW, on either side, that brings a_Bj · a_jW closest to a_BW; ties: `othersToWorst` first, then the smaller value.
  - `type BwmProgress = { answered: number; total: number; weights: number[] | null; provisional: boolean; crInput: number | null; threshold: { value: number; approximate: boolean } | null; flagged: number | null; suggestion: { side: 'bestToOthers' | 'othersToWorst'; value: number } | null }`
  - `bwmProgress(j: Judgements, n: number): BwmProgress` — total = 2n − 3 (n ≥ 2). Complete → weights from `bwmSolve`, `provisional: false`. Incomplete with a_BW known → provisional weights: v_B = a_BW, v_W = 1, v_j = mean of the answered positions {a_BW / a_Bj, a_jW}, criteria with neither answer left out (weight 0, not drawn), normalized; else null. CR^I over criteria with both answers; `flagged` = mostInconsistent only when crInput > threshold (strict); `suggestion` only when flagged.
  - `bwm: WeightingMethod` — `id: 'bwm'`, `kind: 'weighting'`, `reads: 'judgements'`, no params. Throws `ProblemValidationError` with `too-few-criteria` (n < 2), `anchors-missing`, or `judgements-incomplete` (`value` = answered count). Steps: `bwm.bestToOthers` (vector, criteria), `bwm.othersToWorst` (vector, criteria), `bwm.consistencyLocal` (vector, criteria), `bwm.xi` (scalar), `bwm.weights` (vector, criteria). Diagnostics `{ xiL, crInput, crThreshold, mostInconsistent }` (crThreshold NaN when n < 3). Warnings: `{ code: 'bwm.inconsistent', col: mostInconsistent }` when crInput > threshold; `{ code: 'bwm.threshold-approximate' }` when n > 9. The decision matrix is never read.

- [ ] **Step 1: Generate the oracle.** Add to `bwm.py`: when `sys.argv[1:] == ['--oracle']`, print JSON `{ "source": "bwm.py linear_lp (HiGHS), seed 20261019", "cases": [{ "bestToOthers", "othersToWorst", "best", "worst", "weights", "xi" }] }` for 50 cases from `random_pcs(n)` with n cycling 3..15 and its own `np.random.default_rng(20261019)`; the default run (and `bwm.out`) is unchanged. Run `cd docs/research/scripts && python3 -W ignore bwm.py --oracle > ../../../tests/fixtures/bwm-lp-oracle.json` (needs numpy + scipy; use a scratch venv if missing).
- [ ] **Step 2: Write the failing tests** in `tests/bwm.test.ts` (helper: `run(bo, ow, B, W) = bwm.compute(problemOf(n), {}, judgementsFromBwm(n, B, W, bo, ow))`, `problemOf(n)` = n criteria, 2 alternatives, any matrix):

```ts
it('F1 Rezaei 2016: all three cases vs expected (1e-6) and published (6e-5)')   // weights, xiL, crInput, mostInconsistent, threshold 0.2958
it('F2 Ratandhara & Kumar: one case per closed-form branch')                   // ex1 Eq.16, ex2/ex4 Eq.17, ex3 Eq.18; published_xi within 6e-5
it('F3 Demir & Bircan 2020: weights match, CR^I 0.541667 over 0.3662 warns on K7') // expect(r.warnings).toContainEqual({ code: 'bwm.inconsistent', col: 6 }); xiL within 5e-4 of 0.1040
it('F4 Arsu & Uğuz Arsu 2021: CR^I 0.333333 over 0.2819 warns on K1')          // col 0
it('matches the LP oracle on 50 random inputs to 1e-12')
it('properties on the oracle inputs: Σw = 1, w > 0, xi equals the largest deviation of w') // max_j max(|w_B − a_Bj w_j|, |w_j − a_jW w_W|) === xi within 1e-12
it('consistent input: xi 0 and w ∝ othersToWorst')                             // F1 ex1
it('permuting criteria permutes the weights')                                 // F1 ex2 reversed order, best/worst re-indexed
it('n = 2 gives (a_BW, 1) / (1 + a_BW)')                                      // a_BW 3 → [0.75, 0.25], xi 0
it('all ones: equal weights, xi 0, CR^I 0, no warning')                        // n 4 → [0.25, 0.25, 0.25, 0.25]
it('liangThreshold')  // (8,5)→0.2958; (9,9)→0.3662; (7,5)→0.2819; (2,5)→0; (9,12)→{0.3662, approximate: true}; (5,2)→null
it('n = 10 warns that the threshold is approximate')                          // warnings contain { code: 'bwm.threshold-approximate' }
it('bwmSuggestion: a_BW 9, a_Bj 4, a_jW 4 → othersToWorst 2')                  // card step 6
it('bwmAnswers: an answer above a_BW or in AHP direction is unanswered; raising a_BW brings it back')
  // F1 ex2 judgements, then setPair(j, 1, 4, 3) (a_BW = 3): bestToOthers[2] (was 4) and othersToWorst[0] (was 4) are null,
  // bestToOthers[4] === 3; setPair(j, 1, 4, 8) → both are 4 again
  // setPair(j, 0, 1, 0.5) (price over quality is now < 1 from B's side) → bestToOthers[0] null
it('throws anchors-missing and judgements-incomplete with the answered count')  // emptyJudgements(5) with anchors 1/4 and only a_BW → value 1
it('bwmProgress: provisional bars after a_BW and best-to-others (F1 ex2)')
  // answered 4, total 7, provisional true, weights ≈ [0.226415, 0.452830, 0.113208, 0.150943, 0.056604] (1e-6)
it('bwmProgress: flags only over the threshold, with the suggestion')
  // F1 ex2 with othersToWorst[2] = 8: crInput 0.428571 > 0.2958 → flagged 2, suggestion { side: 'othersToWorst', value: 2 }
  // F1 ex3: crInput 0.142857 ≤ 0.2958 → flagged null, suggestion null
```

- [ ] **Step 3:** `pnpm test tests/bwm.test.ts` → FAIL.
- [ ] **Step 4:** Implement `src/core/methods/bwm.ts` (header comment: linear model, Rezaei 2016 model (19), closed form Ratandhara & Kumar Theorem 2, CR^I Liang et al. 2020, "See docs/research/methods/bwm.md"); add the two validation codes.
- [ ] **Step 5:** `pnpm typecheck && pnpm test` → PASS. (i18n for the new codes comes in Task 6, when they can reach the screen; `tests/i18n.test.ts` lists codes explicitly, so it stays green.)
- [ ] **Step 6: Commit** `git add src/core docs/research/scripts/bwm.py tests/bwm.test.ts tests/fixtures/bwm-*.json && git commit -m "BWM core: closed-form linear model, Liang input-based CR and thresholds, suggestion, live progress; fixtures F1-F4 and an LP oracle"`

---

### Task 3: Store: judgements travel with the criteria

**Files:**
- Modify: `src/state/workbench.ts`
- Test: `tests/judgements-state.test.ts` (new; same imports and `draftOf` pattern as `tests/workbench-state.test.ts`)

**Interfaces:**
- Consumes: `emptyJudgements`, `setPair`, `remapJudgements`, `sanitizeJudgements` (Task 1).
- Produces:
  - `WorkbenchData.judgements?: Judgements` (in `partialize`; `initialWorkbench()` gives `emptyJudgements(0)`).
  - `export function matchCriteria(oldCriteria: readonly Criterion[], next: readonly Criterion[], byPosition: boolean, remembered?: (c: Criterion) => boolean): (number | undefined)[]` — the identity → name → position passes of today's `carryWeights` (`workbench.ts:167`), returning next index → old index; a criterion for which `remembered(c)` is true is skipped by the name and position passes (keeps today's order: identity, memory, name, position).
  - `carryWeights` keeps its signature and result, rewritten on `matchCriteria` + `weightMemory`.
  - `function carryJudgements(oldCriteria, old: Judgements | undefined, next, byPosition): Judgements` — `matchCriteria` + a pair memory (`WeakMap<Criterion, WeakMap<Criterion, Ratio | null>>`) and an anchor memory (`WeakMap<Criterion, 'best' | 'worst'>`) filled by `memorizeJudgements(criteria, j)` wherever `memorize` is called today.
  - Actions: `setJudgement(i: number, k: number, value: Ratio | null): void` (via `setPair`), `setAnchors(best: number | null, worst: number | null): void` (best = worst → the other becomes null).
  - `Setup` gains `judgements`; `remember`/`recall` treat it exactly like `manualWeights`.
  - persist `merge: (persisted, current)` → `{ ...current, ...persisted, judgements: sanitizeJudgements(persisted.judgements, persisted.problem.criteria.length) }` (guard a missing `problem`).
  - Events (spec §1 table): `setProblem` carries byPosition true; `importProblem` byPosition false; `addCriterion` / `removeCriterion` via `remapJudgements` (append `undefined` / drop the index); `setCriterion` untouched; `loadExample`, `startBlank`, `reset` → `emptyJudgements(n)` after `memorizeJudgements`.

- [ ] **Step 1: Write the failing tests** (Krishnan example, n = 5; answers via `setAnchors(1, 4)`, `setJudgement(1, 4, 8)`, `setJudgement(1, 0, 2)`, `setJudgement(0, 4, 4)`):

```ts
it('setJudgement writes both cells; setAnchors never keeps best = worst')  // pairs[4][1] === 1/8; setAnchors(2, 2) → { best: 2, worst: null }
it('grid delete of a plain criterion re-indexes, undo brings everything back')
  // setProblem(deleteCriterion(before, 0)) → best 0, worst 3, pairs[0][3] === 8; setProblem(before) → best 1, worst 4, pairs[1][0] === 2, pairs[0][4] === 4
it('deleting the best criterion clears the anchor; undo restores it')      // deleteCriterion(before, 1) → best null; undo → best 1
it('insert, rename and type change keep answers on their criteria')         // insertCriterion(p, 2, 'New') → pairs[1][5] === 8, row 2 all null but [2][2] 1; writeCell rename + setType keep pairs
it('addCriterion and removeCriterion actions')                             // shapes 6 × 6 and 4 × 4, anchors shifted
it('import matches by name only')                                         // file with 'Mass' at index 0 → pairs[...] follow the name, worst 0
it('loading an example starts empty; undo restores the earlier answers')   // loadExample podvezko → all off-diagonal null; setProblem(krishnan) → pairs[1][4] === 8
it('answers survive switching the weighting method away and back')        // setWeightMethod('manual'), ('critic') → judgements unchanged (toBe same object)
it('a saved state without judgements, or with broken ones, loads sanitized') // rehydrate { pairs 2 × 2 for n = 5, value 11, best = worst } → 5 × 5, null, anchors null
it('startBlank and reset empty the answers')
it('carryWeights still gives the same results')                           // existing workbench-state tests stay green unchanged
```

- [ ] **Step 2:** `pnpm test tests/judgements-state.test.ts` → FAIL.
- [ ] **Step 3:** Implement as specified. No second matching algorithm.
- [ ] **Step 4:** `pnpm typecheck && pnpm test` → PASS (incl. `tests/workbench-state.test.ts` unchanged).
- [ ] **Step 5: Commit** `git add src/state/workbench.ts tests/judgements-state.test.ts && git commit -m "Store: judgements follow their criteria (shared matchCriteria), undo memory, remember/recall, sanitized on load"`

---

### Task 4: Pairwise queue model

**Files:**
- Create: `src/features/pairwise/pairwiseQueue.ts`
- Test: `src/features/pairwise/pairwiseQueue.test.ts`

**Interfaces:**
- Consumes: `Ratio`, `Judgements` (Task 1).
- Produces:
  - `export type Question = { a: number; b: number; fixed?: 'a' }` (fixed: BWM, a always wins; the stored answer is `pairs[a][b]`)
  - `export type Mode = { kind: 'ahp' } | { kind: 'bwm'; cap: number }`
  - `ahpQuestions(n: number): Question[]` — spanning path (0–1, 1–2, …), then the rest by distance d = 2 … n − 1, each distance in ascending a.
  - `bwmQuestions(n: number, best: number, worst: number): Question[]` — (B, W), then (B, j) for j ∉ {B, W} ascending, then (j, W) ascending; all `fixed: 'a'`; n = 2 → only (B, W).
  - `modeFor(q: Question, j: Judgements): Mode` — BWM cap 9 for the anchor question (B, W), else a_BW (9 while unanswered); used for both `answerOf` and the card's disabled chips.
  - `answerOf(q: Question, pairs: Judgements['pairs'], mode: Mode): Ratio | null` — AHP: `pairs[a][b]`; BWM: the value only when an integer in 1..cap.
  - `nextUnanswered(questions: readonly Question[], pairs, modeOf: (q: Question) => Mode, from: number): number | null` — first unanswered index after `from`, wrapping; null when all answered.
  - `progress(questions, pairs, modeOf): { answered: number; total: number }`

- [ ] **Step 1: Write the failing tests:**

```ts
it('AHP order: spanning path first, then by distance')  // ahpQuestions(4) → (0,1),(1,2),(2,3),(0,2),(1,3),(0,3); ahpQuestions(2) → (0,1); length(15) === 105
it('BWM order: anchor, best to others, others to worst') // bwmQuestions(5, 1, 4) → (1,4),(1,0),(1,2),(1,3),(0,4),(2,4),(3,4), all fixed 'a'; bwmQuestions(2, 1, 0) → [(1,0)]; length(9 criteria) === 15
it('BWM cap: an answer above a_BW is unanswered until a_BW is raised')
  // judgementsFromBwm(5,1,4,[2,1,4,3,8],[4,8,2,3,1]) then setPair(1,4,3): answerOf((1,2)) null, answerOf((1,0)) 2; setPair(1,4,8): answerOf((1,2)) 4
it('BWM ignores answers in the other direction')        // setPair(1,0,0.5) → answerOf((1,0), bwm) null; AHP mode → 0.5
it('nextUnanswered wraps and ends with null')           // from the last index back to index 2; all answered → null
it('progress counts answered over total')               // 4 of 7 after a_BW and the three best-to-others
```

- [ ] **Step 2:** `pnpm test src/features/pairwise` → FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5: Commit** `git add src/features/pairwise && git commit -m "Pairwise queue: question order for AHP and BWM, answers under the a_BW cap, next unanswered"`

---

### Task 5: PairwiseCard, AnchorPicker, JudgementPanel (both modes) and the dev page

**Files:**
- Create: `src/features/pairwise/PairwiseCard.tsx`, `src/features/pairwise/AnchorPicker.tsx`, `src/features/pairwise/JudgementPanel.tsx`, `src/features/pairwise/PairList.tsx`, `src/features/pairwise/pairwise.module.css`, `src/features/pairwise/index.ts`
- Modify: `src/app/dev/DevUi.tsx` (section "Pairwise card")
- Modify: `package.json`, `pnpm-lock.yaml` (`pnpm add -D @axe-core/playwright`)
- Test: `tests/e2e/pairwise.spec.ts`

**Interfaces:**
- Consumes: `Question`, `Mode` (Task 4), `Ratio`.
- Produces (all strings via a `labels` prop; the builder names the label fields):
  - `PairwiseCard({ question, mode, names, value, position: { index, total }, flag, onAnswer, onBack, labels, className })` — `value` = stored `pairs[a][b]` or null; `flag?: { suggestion: Ratio } | null`; `onAnswer(v: Ratio)` with v from a's side (AHP: v when a wins, 1 / v when b wins, 1 for `=`). States per spec §5 table: Unanswered (AHP side row `[A] [=] [B]`; BWM the fixed sentence), Side chosen (3 × 3 grid 1–9, words on 1/3/5/7/9), Answered ("A ▸ 5 · strongly", editable in place), Flagged (accent marker with icon + "Your other answers suggest 3" + `[Use 3]`), Disabled values (BWM: chips > `mode.cap` disabled with a tooltip "at most a_BW"; native `title` is enough, no `src/ui` import). `=` answers 1 in one tap. Side row and grid are Radix `ToggleGroup` type single (role radio); Up/Down in the grid move by 3. Keyboard while the card has focus: digits 1–9 set the value (in AHP only after a side is chosen), ←/→ pick the side, `=` equal, Backspace = `onBack`. `role="group"`, `aria-labelledby` the question, `aria-describedby` the progress "4 / 10". Every radio has a full name ("5, strongly more important").
  - `AnchorPicker({ names, best, worst, onChange(best, worst), labels })` — two radio groups of criterion chips; the best chip is disabled in the worst group.
  - `JudgementPanel({ names, weights, provisional, consistency, flagged, labels })` — `weights: number[] | null`; bars by `transform: scaleX()` with `--dur-data`; provisional bars hatched; `consistency: { value: number; threshold: number | null; approximate: boolean } | null` (null → "not applicable"); badge in the warning colour over the threshold, naming `names[flagged]`. One polite live region that changes text only when the consistency state changes (ok ↔ flagged criterion).
  - `PairList({ questions, answers, current, flagged, names, onJump, labels })` — the desktop list of all pairs (answer or "—", flagged marked).

- [ ] **Step 1:** `pnpm add -D @axe-core/playwright`.
- [ ] **Step 2:** Add the DevUi section: an AHP card over 4 sample criteria (live state, answers kept in `useState`, `JudgementPanel` with `consistency={null}` and fixed sample weights), a BWM card with `cap: 3` (chips 4–9 disabled), a flagged card (`flag={{ suggestion: 3 }}`), and a two-criterion panel showing "not applicable". English sample strings are fine on the dev page.
- [ ] **Step 3: Write the failing e2e** `tests/e2e/pairwise.spec.ts` on `/dev/ui`:

```ts
test('AHP card at 390 px: two taps answer, = answers in one, the next card takes focus')
  // tap 'Comfort' side then '5, strongly more important' → card 2 of 6 focused side row; previous card shows 'Comfort ▸ 5'
  // = on card 2 → 3 / 6
test('AHP card at 1440 px: arrows pick the side, digits set the value, Backspace goes back')
  // ArrowRight then '7' → answered; Backspace → previous card focused
test('BWM card: values above the cap are disabled and say why')   // chips 4..9 disabled, title 'At most 3'
test('flagged card: Use 3 calls onAnswer(3)')                      // the answer text changes to '▸ 3'
test('every value cell is at least 56 px and the side row 48 px at 390 px')
test('axe finds no violations on the pairwise section in each state') // AxeBuilder.include('[data-dev="pairwise"]'), after side chosen, answered, flagged
```

- [ ] **Step 4:** `pnpm e2e -g pairwise` → FAIL. **Step 5:** implement the components (CSS module, tokens only; no entry animation). **Step 6:** `pnpm typecheck && pnpm test && pnpm e2e -g pairwise` → PASS.
- [ ] **Step 7: Commit** `git add src/features/pairwise src/app/dev/DevUi.tsx tests/e2e/pairwise.spec.ts package.json pnpm-lock.yaml && git commit -m "Pairwise card, anchor picker and live judgement panel (AHP and BWM modes) on the dev page; axe in e2e"`

---

### Task 6: Register BWM: compute through the store, steps, content, copy

**Files:**
- Modify: `src/core/registry.ts` (`WEIGHTING_IDS = ['critic', 'entropy', 'sd', 'merec', 'equal', 'bwm']`, `weightingById`)
- Modify: `src/state/workbench.ts` (`computeWeights`: branch for `reads === 'judgements'`; `computeWeights`/`computeRanking`/`useWeights`/`useRanking` read `judgements`)
- Modify: `src/app/workbench/shared.ts` (`ids.pairwise = 'wb-pairwise'`, `placeIssue` cases)
- Create: `src/content/steps/bwm.ts`; Modify: `src/content/steps/index.ts` (add `bwm` to `modules`, after `manual`)
- Create: `src/app/methods/views/bwm.ts` (`{ kind: 'weighting' }` for now); Modify: `src/app/methods/views/index.ts` (entry after `manual`)
- Modify: `src/content/methods/bwm.ts`, `src/content/methods/catalog.ts` (status `available`)
- Modify: `src/i18n/en.json`, `src/i18n/tr.json`
- Modify tests: `tests/validate.test.ts:78-80`, `src/content/content.test.ts` (`runsOf`, available list :109), `tests/i18n.test.ts` (codes list, a BWM block), `tests/workbench-state.test.ts` (through-the-store case)

**Interfaces:**
- Consumes: `bwm` and helpers (Task 2), `WorkbenchData.judgements` (Task 3).
- Produces: `computeWeights(data: Pick<WorkbenchData, 'problem' | 'weightMethod' | 'manualWeights' | 'methodParams' | 'judgements'>)` — for `reads === 'judgements'` the matrix is not validated; `n < 2` → `too-few-criteria` from `validateProblem`; else `method.compute(problem, params, data.judgements ?? emptyJudgements(n))`, `ProblemValidationError` → its issues. `placeIssue`: `judgements-incomplete` and `anchors-missing` → `{ stage: 'weights', targetId: ids.pairwise }`.

- [ ] **Step 1: Update the failing tests first:**
  - `validate.test.ts`: lists with `'bwm'` after `'equal'`.
  - `content.test.ts`: `runsOf` passes `judgementsFromBwm(n, 0, n - 1, ones, ones)` to a `reads: 'judgements'` method; available list gains `'bwm'` (sorted first).
  - `i18n.test.ts`: codes list += `'judgements-incomplete'`, `'anchors-missing'`; a BWM block computing F3 (inconsistent) and an n = 10 all-ones case, asserting `new Set(codes)` equals `{'bwm.inconsistent', 'bwm.threshold-approximate'}`, and their steps/warnings join `steps` and `warnings`.
  - `workbench-state.test.ts`: `it('BWM through the store: Rezaei 2016 Ex2 answers on the Krishnan criteria give the paper weights; incomplete answers block the ranking with judgements-incomplete')` — `setWeightMethod('bwm')`, answers via `setAnchors`/`setJudgement` (best 1, worst 4, a_BW 8, best-to-others 2, 4, 3 for j = 0, 2, 3, others-to-worst 4, 2, 3), weights within 1e-6 of `[0.229508, 0.448087, 0.114754, 0.153005, 0.054645]`; with a_BW alone `computeRanking(...).issues` contains `{ code: 'judgements-incomplete', value: 1 }`; without anchors `anchors-missing`.
- [ ] **Step 2:** `pnpm test` → FAIL on those.
- [ ] **Step 3: Implement.** Steps module `src/content/steps/bwm.ts` (copy `sd.ts`; keys `bwm.bestToOthers`, `bwm.othersToWorst`, `bwm.consistencyLocal` (symbol `CR^I_j`), `bwm.xi` (symbol `ξ^L`), `bwm.weights` (symbol `w`); TeX from the card steps 1, 3, 5; one sentence ≤ 14 words each; `edgeCase` on `bwm.consistencyLocal`: "0 when a_BW = 1."). i18n (both files): `workbench.weightMethod.bwm` "BWM"; `workbench.weights.methodHint.bwm` (card "For users", one sentence); `steps.bwm.*`; `workbench.stepNames.bwm.*` (step names; "Deviation ξ" / "Sapma ξ" for `xi`); `warnings.bwm.inconsistent` ("Answers about {{criterion}} fit worst; the weights are still computed." / TR with "siz"); `warnings.bwm.threshold-approximate`; `validation.codes.judgements-incomplete` ("{{value}} of the questions answered; answer the rest to get the weights.") and `validation.codes.anchors-missing`; `methods.names.bwm` "BWM"; the `workbench.pairwise.*` labels the Task 5 components take (scale words, side/equal names, BWM sentences "How many times more important is {{a}} than {{b}}?" / "{{a}}, {{b}} kriterinden kaç kat daha önemli?", anchor labels, progress "{{index}} / {{total}}", back, at most, suggestion, use, consistency ok/check/not applicable/threshold, provisional, all pairs, all equal "All equally important" / "Hepsi eşit önemde"). Content card `src/content/methods/bwm.ts`: `status: 'available'`; reference note rewritten as a test result without "not computed here yet" (linear weights match Ex1 and Ex2 within 4.6e-5, ξ^L 0.0109; the site computes the linear model only); inputs drop "Model option" (replace with "Answers are capped at a_BW." / TR, same count); the "Non-linear model (option)" step becomes "Non-linear model (not offered)" with a one-sentence note; first pitfall = the card's "more than about nine criteria" bullet.
- [ ] **Step 4:** `pnpm typecheck && pnpm test` → PASS.
- [ ] **Step 5: Commit** `git add -u src tests && git add src/content/steps/bwm.ts src/app/methods/views/bwm.ts && git commit -m "Register BWM: judgement branch in computeWeights, step content, validation and warning copy, card available"`

---

### Task 7: BWM on the Weights stage (JudgementWeights), robustness renormalize-only

**Files:**
- Create: `src/app/workbench/JudgementWeights.tsx`
- Modify: `src/app/workbench/WeightsStage.tsx` (render `JudgementWeights` for a `reads: 'judgements'` method; export `ComputedWeights`; selector grid `max-sm:grid-cols-4`, comment updated)
- Modify: `src/app/workbench/robustness/helpers.ts` (`recomputable(weightMethod: WeightMethodId): WeightingMethod | undefined`), `src/app/workbench/robustness/RobustnessStage.tsx:67` (use it)
- Test: `src/app/workbench/robustness/helpers.test.ts`, `tests/e2e/bwm.spec.ts` (new), `tests/e2e/workbench.spec.ts` (selector)

**Interfaces:**
- Consumes: Task 3 actions, Task 4 queue, Task 5 components, Task 6 `computeWeights`, `bwmProgress`, `bwmAnswers`.
- Produces: `JudgementWeights({ problem: DraftProblem; method: 'bwm'; result: Computed<WeightingResult> })`. Behaviour:
  - No anchors → `AnchorPicker` (+ "All equally important" → `setWeightMethod('equal')`, answers kept).
  - Anchors set → one `PairwiseCard` for the current question (local state; initial and after each answer = `nextUnanswered`), `mode = modeFor(q, judgements)`, `flag` when `bwmProgress(...).flagged` is this question's criterion and the suggestion's side matches the question; `[Use v]` → `setJudgement`. Changing an anchor goes through `AnchorPicker` kept above the card (compact).
  - `JudgementPanel` under the card (one column) or to its right (`lg:` two columns) with `PairList` below it on desktop; consistency from `bwmProgress` (`null` for n = 2).
  - The view's `stage` picture (Task 8) above both, once anchors and a_BW exist (`Suspense`, `judgements` passed).
  - Complete (`result.value`) → card area becomes the summary `PairList` (tap to edit), then `ComputedWeights` (table, `MethodWarnings`, calculation).
  - The card container has `id={ids.pairwise}`, so `placeIssue` links land on it.
- `recomputable`: `undefined` for `equal` and for any `reads: 'judgements'` method; the registry method otherwise.

- [ ] **Step 1: Write the failing tests.**
  - `helpers.test.ts`: `expect(recomputable('bwm')).toBeUndefined(); expect(recomputable('equal')).toBeUndefined(); expect(recomputable('critic')?.id).toBe('critic')`.
  - `tests/e2e/bwm.spec.ts` (Krishnan example; criteria Price, Screen size, Pixel density, Thickness, Mass):

```ts
test('390 px: pick best and worst, answer 7 questions with one tap each, weights equal the core')
  // best 'Screen size', worst 'Mass'; answers 8; 2, 4, 3; 4, 2, 3 → counter 1 / 7 … 7 / 7
  // weights column toHaveText(bwm.compute(...).weights.map(f4)) === ['0.2295', '0.4481', '0.1148', '0.1530', '0.0546']
test('1440 px: digits answer, the pair list jumps to any question, Continue reaches the ranking')
test('lowering a_BW sends the answers above it back to the queue, raising it restores them')
  // after all answers: jump to the anchor pair, answer 3 → 5 / 7 (Pixel density's 4 and Price's 4 exceed 3, the card returns to them);
  // jump to the anchor pair again, answer 8 → 7 / 7, same weights
test('an inconsistent answer is flagged with a suggestion; Use 2 clears the warning')
  // others-to-worst for Pixel density = 8 → badge names 'Pixel density', 'CR 0.43' and threshold '0.30' (2 decimals, spec §5); card shows 'Your other answers suggest 2'; Use 2 → badge 'Consistent', weights as above
test('switching to Manual and back keeps the answers; a reload resumes at the first unanswered question')
  // 3 answers, Manual, BWM → 3 / 7 answered; page.reload() → card shows question 4 of 7
test('All equally important switches to Equal weights')
test('the live region speaks only consistency changes')  // text changes once when flagged, not on every answer
test('Robustness offers no recompute for BWM')            // removal section has no 'Recompute BWM' option
```
  - `workbench.spec.ts`: the keyboard test is unchanged (BWM sits after Manual); add `test('the weighting control is two rows at 375 px: four, then three')` in the style of `:819`.
- [ ] **Step 2:** `pnpm test && pnpm e2e -g "BWM|weighting control"` → FAIL.
- [ ] **Step 3:** Implement. Focus moves to the next card after an answer (wait for it in e2e, Kurallar Radix trap). No animation on the card swap; progress indicator `--dur-slow`.
- [ ] **Step 4:** `pnpm typecheck && pnpm test && pnpm e2e` → PASS (whole suite: `a11y.spec`, `robustness.spec` "Recompute CRITIC" unchanged).
- [ ] **Step 5: Commit** `git add src/app/workbench tests/e2e && git commit -m "Weights stage: BWM card by card with the live panel and pair list; robustness removal renormalizes BWM weights"`

---

### Task 8: BWM method page: "two rulers" picture, step through the idea, catalogue, ledger

**Files:**
- Create: `src/features/illustrations/BwmRulers.tsx` (+ styles in `illustrations.module.css`)
- Create: `src/data/judgementExamples.ts`
- Create: `src/app/methods/views/bwm.pictures.tsx`; Modify: `src/app/methods/views/bwm.ts`, `src/app/methods/views/types.ts`, `src/app/methods/views/parts.tsx` (`IdeaSource` takes `{ example: { name: Localized } }`), `src/app/methods/views/views.test.ts`
- Modify: `src/app/methods/MethodIdea.tsx` (`judgementIdea` and `preloadIdea`), `src/app/landing/Verified.tsx` (citation fallback)
- Modify: `src/i18n/en.json`, `tr.json` (`methods.page.idea.bwm.*` incl. `steps.s1..s4`, `workbench.visual.bwm.*`, `methods.catalog.oneLiner.bwm`, `landing.verified.bwm.claim`)
- Modify: `package.json` `description`, `README.md` method table/count, `index.html` meta if it lists methods
- Test: `tests/bwm.test.ts` (example), `tests/e2e/idea-steps.spec.ts`

**Interfaces:**
- Consumes: `bwmAnswers`, `bwmSolve`, `bwmConsistency`, `judgementsFromBwm` (Tasks 1–2).
- Produces:
  - `judgementExamples.ts`: `export type JudgementExample = { id: string; name: Localized; citation: Citation; criteria: readonly Localized[]; judgements: Judgements }`, `export const judgementExamples: readonly JudgementExample[]`, `export const getJudgementExample = (id: string): JudgementExample | undefined`. One entry `rezaei-2016-car`: Rezaei 2016 Ex3 (card visual default), criteria quality/kalite, price/fiyat, comfort/konfor, safety/güvenlik, style/stil, best 1, worst 4, `judgementsFromBwm(5, 1, 4, [2, 1, 4, 3, 8], [4, 8, 4, 2, 1])`; citation Rezaei (2016), Omega 64, 126–130, DOI 10.1016/j.omega.2015.12.001, tables "Table 4 (input)" / "Tablo 4 (girdi)". Workbench examples (`examples.ts`) are not touched: no paper with both judgements and a matrix (Resolved 1, option (c)).
  - `views/types.ts`: `StagePictureProps` += `judgements?: Judgements`; `export type JudgementIdeaProps = { example: JudgementExample; criteria: readonly string[] }`; `MethodView.judgementIdea?: { example: string; Picture: Preloadable<JudgementIdeaProps> }`.
  - `BwmRulers({ criteria, best, worst, bestToOthers, othersToWorst, weights, flagged, format, labels, step, explain, className })` and `export const BWM_IDEA_STEPS = 4` — card "Visual proposal": rows sorted by final weight (input order while weights are null), axis "times the worst criterion" (worst at 1), best's tick at a_BW / a_Bj, worst's tick at a_jW, grey band between, the `flagged` row's band in the accent (by CR^I, not width), weight dot at w_j / w_W and the weight column in step 4. Unanswered entries draw no tick. Table equivalent through `ChartFigure` as in `SdIdea`. Steps 1–4 as in the card; the last step is the full picture.
  - `views/bwm.ts`: `judgementIdea: { example: 'rezaei-2016-car', Picture }`, `stage` (rulers on the store's judgements, flagged from `bwmProgress`), `thumb: ({ geometry }) => ({ kind: 'bars', values: <Ex3 weights>, highlight: geometry.argMax(...) })`, `ledger: { example: 'rezaei-2016-car', fixture: 'bwm-rezaei2016-car.json#tolerance_vs_published', tolerance: 6e-5 }`.

- [ ] **Step 1: Write the failing tests.**
  - `tests/bwm.test.ts`: `it('the method page example is Rezaei 2016 Ex3 from the fixture')` — `bwmAnswers(getJudgementExample('rezaei-2016-car')!.judgements)` equals F1 ex3 vectors, best 1, worst 4.
  - `views.test.ts`: ideas and ledger rows resolve through `getExample` or `getJudgementExample`; the tolerance check reads `tolerance_vs_published`.
  - `idea-steps.spec.ts`: add `['bwm', 4]` to the sentence-height list (`:193`) and `test('BWM: four steps; step 3 marks comfort, whose ticks sit at 2 and 4; the last step is the full picture')` — at step 3 `#idea [data-flagged]` contains 'comfort'; the comfort row's ticks carry `data-value="2"` and `data-value="4"`; step 4 shows '0.2462' … weights of Ex3 (0.246154, 0.430769, 0.123077, 0.153846, 0.046154 at 4 d.p.); Finish → drawing equals the full one (both reduced-motion settings, like TOPSIS).
- [ ] **Step 2:** `pnpm test && pnpm e2e -g BWM` → FAIL.
- [ ] **Step 3:** Implement. Sentences `methods.page.idea.bwm.steps.s1..s4` = card IdeaSteps EN/TR verbatim. Landing ledger claim: "Linear BWM weights match {{citation}} to {{decimals}} decimals." / TR. Package and README copy name BWM among the weighting methods.
- [ ] **Step 4:** `pnpm typecheck && pnpm test && pnpm e2e` → PASS.
- [ ] **Step 5: Commit** `git add -u src tests package.json README.md index.html && git add src/features/illustrations/BwmRulers.tsx src/data/judgementExamples.ts src/app/methods/views/bwm.pictures.tsx && git commit -m "BWM method page: two rulers with step through the idea, catalogue card, landing ledger row"`

---

### Task 9: Gate: screenshots for Fatih (phone and desktop)

**Files:**
- Modify: `tests/e2e/bwm.spec.ts` (one test skipped unless `SHOTS=1`)
- Output (not committed): `.shots/`

**Interfaces:**
- Consumes: everything above.
- Produces: PNGs for the owner's review; nothing else.

- [ ] **Step 1:** Add `test('owner screenshots', ...)` with `test.skip(!process.env.SHOTS)`, Turkish (`addInitScript` setting `kds.lang = 'tr'` and `kds.theme`), two passes: 390 × 844 `colorScheme: 'dark'` and 1440 × 900 `colorScheme: 'light'`, `reducedMotion: 'reduce'`. Krishnan example → BWM. Save `.shots/bwm-{anchors,card,flagged,complete}-{dark-390,light-1440}-tr.png`: anchors picked, mid-flow card 4 / 7 with the panel, the flagged card with "2 kullanın", the completed summary with the weights table.
- [ ] **Step 2:** `SHOTS=1 pnpm e2e -g "owner screenshots"` → 8 files written.
- [ ] **Step 3:** `pnpm shot /methods/bwm /dev/ui --lang tr --theme dark --width 390` and `pnpm shot /methods/bwm /dev/ui --lang tr --theme light --width 1440` → 4 more files in `.shots/`.
- [ ] **Step 4:** `pnpm build && pnpm e2e` → green. Look at every shot yourself (text overflow at 390 px, Turkish label lengths in the 4-column selector, flag readable without colour).
- [ ] **Step 5: Commit** `git add tests/e2e/bwm.spec.ts && git commit -m "BWM: owner screenshot run (TR, 390 dark and 1440 light)"`. Then stop: list the 12 files for Fatih. Phase 2 starts only after he approves the card on phone and desktop.
