# AHP and BWM: judgements, the shared pairwise screen, AHP ranking — design

Status: design, not implemented (2026-10-18, branch `methods-10` at `c750514`).
Inputs: method cards `docs/research/methods/ahp.md` and `bwm.md` (with `docs/research/scripts/ahp.py`, `bwm.py` and
their `.out`), the owner's decisions of 18.10 (below), `docs/design/ADDING-A-METHOD.md`, `MOTION.md`, `DESIGN.md`
and the 17.10 comparison spec (`2026-10-17-method-comparison-design.md`).
Read the two cards first: every formula, threshold, fixture and site sentence lives there; this document only says
how they fit the code.

Marking: **Owner** = Fatih decided. **Iroh's call** = decided while writing this, open to veto. Unmarked = follows
from the code as it is.

## Intent

The site has only objective weights (from the data) plus Equal and Manual. Most real MCDM work, and nearly every
Turkish thesis, weighs criteria from a person's judgement, usually with AHP, increasingly with BWM. Adding them makes
the workbench usable for that majority, and AHP as a ranking method covers the "full AHP" studies too.

The hard part is not the maths (both cards have closed, tested numerics) but the input: answers to pairwise questions
are a new kind of user data that the core interface, the store, persistence, robustness and Compare do not know yet.
This document designs that once, for both methods.

## Owner decisions (18.10)

- **AHP**: both a criteria-weighting method (Weights stage) and a ranking method (Ranking stage).
  - Alternatives' local priorities come from the decision matrix by default (distributive synthesis). While m ≤ 7
    the user may enter one criterion's alternatives by pairwise comparison instead.
  - CR ≥ 0.10 never blocks: a warning, the most inconsistent answer, and a one-tap suggested value.
  - Eigenvector by default, geometric mean as an option; CR from the true λmax (Perron root); Saaty's RI table;
    n ≤ 15; from n ≥ 8 suggest BWM; no group decisions.
- **BWM**: criteria weights only. Linear model, closed-form solver (Ratandhara & Kumar), no dependency. Liang 2020
  input-based CR^I as a warning with the offending criterion. Best ≠ worst, every answer ≤ a_BW, an "all equal"
  shortcut.
- **Shared input**: card by card, two taps per answer (pick the side, then 1–9 on a 3 × 3 grid), live CR and
  weight bars, mobile first. AHP and BWM use the same component.
- Project rules that apply: little text, a picture per section (29.09); TR address "siz"; motion only explains a
  state change (MOTION.md); TR spelling `min-maks`.

## Goals

1. A **judgement model** in core and store that both methods read, survives every problem edit the grid allows
   (add, delete, rename, reorder, undo, paste, example load, import, reset) and persists with the rest of the state.
2. `WeightingMethod` extended so a method can read judgements, **without touching the five objective methods**.
3. **BWM** and **AHP** as weighting methods on the Weights stage, through one `PairwiseCard` and one live panel.
4. **AHP ranking** as a ranking method (`RankingRun`), with matrix-derived local priorities and optional pairwise
   alternatives for m ≤ 7, working in Results, Robustness and Compare unchanged.
5. Method pages for AHP and BWM with "step through the idea", fixtures from the cards, tests.

## Non-goals

- Group decisions (several respondents, AIJ/AIP) — owner.
- Hierarchies (sub-criteria, clusters). The site's criteria list is flat.
- AHP ideal mode, B/C/O/R, ANP; other scales (balanced, power); decimal judgements (1.1–1.9).
- Final weights from an **incomplete** AHP matrix (incomplete LLSM is used only for provisional bars and for the
  leave-one-out suggestion, card step 6).
- Non-linear BWM, CR^O, interval weights (BWM card Decision 1).
- Importing judgements from a file. (Export: see Goal list of Phase 2.)
- URL sharing. The app has none today (state is localStorage only); nothing here adds one.
- Judgement-level Monte Carlo (see "Robustness").

## Anti-goals

- **No editable n × n matrix as the input.** It is fast for experts and error-prone on phones (AHP card, Input UX).
  The matrix appears only as a read-only picture and in "show the calculation".
- **No slider** for intensity (small targets on phones, card Input UX).
- **Never block on consistency.** Neither CR ≥ 0.10 nor CR^I above Liang's threshold stops the user.
- **No hint before an answer.** Showing "your answers so far imply about 3" on an unanswered card anchors the
  user and quietly removes the consistency check (Iroh's call; the AHP card listed it as possible, we do not do it).
  Suggestions appear only on a flagged, already answered card.
- **No silent clamping.** An answer that does not fit (BWM cap after a_BW was lowered, a value from AHP above a_BW)
  becomes unanswered and is asked again; it is never rewritten to a nearby value.
- No entry animation, no card slide, no confetti on completion (MOTION.md).

## 1. Judgement data model

### Core types (`src/core/types.ts`) — Iroh's call

```ts
/** Saaty's scale as stored: 1/9 … 1/2, 1, 2 … 9 (17 values). */
export type Ratio = number

/**
 * The user's answers about the criteria, index-aligned with problem.criteria (like the store's manualWeights).
 * pairs[i][j]: how many times criterion i matters more than j; null = not answered.
 * Invariants (kept by every writer and re-established on load): pairs is n × n, pairs[i][i] = 1,
 * pairs[j][i] = 1 / pairs[i][j], every value one of the 17 scale values.
 */
export type Judgements = {
  pairs: (Ratio | null)[][]
  /** BWM anchors, criterion indices; null until picked. AHP ignores them. */
  best: number | null
  worst: number | null
}

/**
 * AHP ranking: one entry per criterion (index-aligned). null = local priorities from the decision matrix;
 * a matrix = the user's pairwise answers over the alternatives on that criterion (m × m, same conventions).
 */
export type AlternativeJudgements = readonly ((Ratio | null)[][] | null)[]
```

Why this shape:

- **One answer per pair, shared by AHP and BWM** (Iroh's call). BWM's a_Bj, a_jW and a_BW are pairwise ratios
  with fixed direction: a_Bj = pairs[B][j], a_jW = pairs[j][W], a_BW = pairs[B][W]. So a user who switches
  BWM → AHP keeps the 2n − 3 answers and is asked only the rest; AHP → BWM keeps every answer that fits BWM's
  domain (≥ 1 in BWM's direction and ≤ a_BW) and asks the others. The BWM card proposed this (Input UX §5).
- **Full matrix, index-aligned, not keyed by names.** Criterion names may repeat (there is no duplicate-name
  validation code in `validate.ts`), so name keys would collide. Index alignment is what `manualWeights` already
  does, and a full matrix makes any criterion re-mapping a plain permutation: `next[a][b] = old[map[a]][map[b]]`
  (the AHP card sketched name keys; this replaces it).
- **Indices, not names, for best and worst**, carried by the same map.
- The size is trivial (n ≤ 15: 225 numbers; alternatives ≤ 7 × 7 per criterion).

### Store (`src/state/workbench.ts`)

`WorkbenchData` gains two optional fields (optional so a state saved today loads; no `STORAGE_VERSION` bump):

```ts
judgements?: Judgements
alternativeJudgements?: AlternativeJudgements
```

**Rule: judgements travel exactly where `manualWeights` travels.** Every action that fits, carries, memorizes or
resets `manualWeights` does the same to the judgements. Concretely:

| Event | Today (`manualWeights`) | Judgements |
|---|---|---|
| Grid edit, paste, undo/redo → `setProblem` (l. 251) | `carryWeights(old, w, next, byPosition = true)` | Same criterion map, rows and columns permuted; new criteria get null rows; best/worst re-mapped or null |
| Import → `importProblem` (l. 260) | carry by name only | Same (byPosition false) |
| Add criterion (l. 379) | append null | append a null row and column |
| Remove criterion (l. 391) | drop index | drop row and column; best/worst null if it was one, else shifted |
| Rename / change type → `setCriterion` | untouched (index-aligned) | untouched. A criterion's type does not change an importance judgement |
| Undo of a criterion delete | `weightMemory` (WeakMap by criterion object) | A sibling memory keyed by the pair of criterion objects, so the deleted criterion's answers come back |
| Load example (l. 268) | the paper's weights or empty | the paper's judgements if the example has them, else empty |
| `startBlank`, `reset` | empty | empty |
| Leaving an example and undoing back (`remember`/`recall`) | part of `Setup` | add both fields to `Setup` |

Implementation: split `carryWeights` (l. 167) into `matchCriteria(old, next, byPosition): (number | undefined)[]`
(the index map it already computes in four passes) and two thin users: weights and judgements. No second
matching algorithm.

`alternativeJudgements` is carried with the same criterion map, and additionally re-mapped when alternatives
change: an alternative map by name first, then by position when the count is unchanged (alternatives are plain
strings, there are no objects to match). A new alternative adds a null row/column to every pairwise criterion.

**Loading saved state** (persist `merge`) is a trust boundary (hand-edited or stale localStorage): sizes that do
not match the criteria / alternatives are refitted, values outside the 17-value scale become null, the lower
triangle is rebuilt from the upper, best/worst out of range or equal become null.

New actions: `setJudgement(i, j, value | null)` (writes both cells), `setAnchors(best, worst)`,
`setCriterionSource(col, 'matrix' | 'pairwise')`, `setAlternativeJudgement(col, i, k, value | null)`.

### Example data

`ExampleDataset` (`src/data/examples.ts`) gains `judgements?: { upper: number[]; best?: number; worst?: number }`
in the card's `upper` form, and optionally `alternativeJudgements`. Datasets stay "published only".
The judgement fixtures in the cards (Saaty 2008, Rezaei 2016) have **no decision matrix**, so they cannot be a
workbench example as the type stands. See Open question 1.

## 2. Extending `WeightingMethod` (Iroh's call)

```ts
export interface WeightingMethod<P = {}> {
  id: string
  kind: 'weighting'
  /** What the method reads: the decision matrix ('data', default) or the user's pairwise answers. */
  reads?: 'data' | 'judgements'
  params?: readonly ParamDescriptor[]
  compute(problem: Problem, params: P, judgements?: Judgements): WeightingResult
}
```

- The five objective methods do not change: the third argument is optional and they ignore it; `reads` defaults
  to `'data'`. Every existing call site (`computeWeights`, `removeCriteria` l. 631) still type-checks.
- `computeWeights` (l. 472) gets one branch, next to `manual` and `equal`: for `reads === 'judgements'` the matrix
  is **not** validated (like Equal; weights do not need the data), only `too-few-criteria`, then
  `method.compute(problem, params, data.judgements)`.
- Incomplete answers: the method throws `ProblemValidationError` with a new error code `judgements-incomplete`
  (`value` = answered, plus the first unanswered pair for navigation). `placeIssue` sends it to the Weights stage,
  focused on that card. Ranking is then blocked the same way it is blocked by missing manual weights.
- New codes: errors `judgements-incomplete`, `too-many-criteria` (AHP n > 15), `anchors-missing` (BWM);
  warnings (`MethodWarning`) `ahp.inconsistent`, `ahp.many-questions` (n ≥ 8, BWM hint), `bwm.inconsistent`
  (with `col`), `bwm.threshold-approximate` (n > 9). Diagnostics as in the cards (`lambdaMax`, `ci`, `cr`;
  `crInput`, `crThreshold`, `xiL`).
- Live feedback while answering does not go through `compute`: the panel calls pure core helpers directly
  (`ahpProgress(pairs, priority)` → provisional weights from incomplete LLSM once the answered graph is
  connected, CR when complete, the inconsistency ranking with leave-one-out suggestions; `bwmProgress(j)` →
  provisional weights from the implied positions, CR^I and the flagged criterion). They are microseconds at
  n ≤ 15 (cards), so they run on every answer, synchronously.
- AHP params: `priority` choice `['eigen', 'geometric']`, default `eigen` (owner). The card's `additive` option is
  **not** built (Iroh's call: the owner listed two; F2's additive numbers stay verified in `ahp.py`, the TS test
  checks F2 against our eigen and geometric values). BWM: no params.
- **No `WeightingRun`** yet (Kurallar 17.10: until a second consumer). Robustness is the only other consumer and
  needs only the judgements object (§4).

## 3. AHP ranking in `RankingRun`

**Id** (Iroh's call): weighting `ahp`, ranking `ahp-ranking`. One id cannot be both kinds: `methodViews` is keyed
by id with one `kind`, `getMethod` returns the first match, and `methodParams` is keyed by id. Both show the label
"AHP" in their selectors; the view of `ahp-ranking` gets a new optional field `page: 'ahp'` so links, the
catalogue and the method count treat AHP as one method with one page.

**Run and interface:**

```ts
export type RankingRun = { methodId: string; params: MethodParams; judgements?: AlternativeJudgements }
compute(problem: Problem, weights: number[], params: P, judgements?: AlternativeJudgements): RankingResult
```

Still plain data, so worker messages carry it unchanged. `prepareRanking` passes `run.judgements` through; the
other nine methods ignore the argument. One helper `runFor(data, methodId)` in the store builds a run with params
and, for `ahp-ranking`, the judgements; `rankingRunFor` and the Compare stage both use it (today Compare builds
runs itself, `CompareStage.tsx` l. 30–36).

**Synthesis (distributive):**
- Matrix criterion j: local priority benefit x_ij / Σ_i x_ij, cost (1/x_ij) / Σ_i (1/x_ij). Requires positive
  values (`requires.positiveValues`, same error as SAW).
- Pairwise criterion j: the priority vector of its m × m matrix (same `priority` option and same code as the
  criteria matrix; CR per criterion, warning `ahp.inconsistent` with `col`). The criterion type is ignored for a
  pairwise criterion: the question is "which is better on Price", not "which has the higher price".
- Score S_i = Σ_j w_j · local_ij; higher is better; Σ_i S_i = 1.
- Steps: `ahpRanking.local` (alternatives × criteria), `ahpRanking.weighted`, `ahpRanking.scores`, and per
  pairwise criterion its `ahpRanking.pairwise` matrix (axes alternatives × alternatives).

**Verified: with every criterion from the matrix, AHP ranking = SAW with `normalization: 'sum'`.** `saw.ts` l. 37–42
computes benefit x / Σx and cost (1/x) / Σ(1/x), then Σ_j w_j r_ij — the same formula term by term. Iroh's call:
AHP calls SAW's normalization helper (extract it from `saw.ts`), so the identity is bit-for-bit and a test pins
it. Consequences: (a) the page says so, with a SAW(sum)–AHP scatter like MARCOS's; (b) AHP ranking from the matrix
inherits SAW-sum's rank reversal when an alternative is added (the page notes it; it is AHP's known distributive
behaviour); (c) Compare — next paragraph.

**Compare: count once?** Recommendation (Open question 3): follow the MARCOS/MABAC precedent exactly.
`findEchoes` (`compare.ts` l. 23) gets a second rule: `ahp-ranking` echoes `saw` **when SAW's run uses `sum` and
no criterion is pairwise**; then it is drawn but counted once, with the badge "same order as SAW (sum)". With
SAW on its default `linearMax`, AHP-from-matrix orders differently in general (different per-criterion scaling),
so it is an independent vote, as MABAC is against SAW. With one or more pairwise criteria it is always
independent. `COMPARE_ORDER` puts `ahp-ranking` next to `saw`.

**Pairwise alternatives (m ≤ 7):** a per-criterion source switch "From the table / Pairwise" on the Ranking stage,
shown only when AHP ranking is selected and m ≤ 7. Choosing "Pairwise" opens the same `PairwiseCard` flow over
the alternatives of that criterion (m(m − 1)/2 questions, 21 at m = 7). If m later grows above 7, the stored
answers stay but are inactive, the criterion uses the table and a notice says why (Iroh's call: no data loss on
an accidental extra row). In v1 the decision matrix must still be complete and valid, also in a pairwise column,
because every other method, Compare and Robustness read it (Open question 2).

## 4. Robustness with subjective weights

All four analyses take a weight vector and a `RankerFor`; neither knows where the weights came from. So:

- **Weight sweep, ±perturbation, Monte Carlo (Dirichlet around w)**: unchanged and meaningful. They answer "what
  if the weights were somewhat different", which for judgement weights is exactly the doubt a CR warning raises.
- **Is a judgement-level analysis needed?** Not for v1 (Iroh's call). The honest extra question for AHP/BWM is
  "which single answer, moved one scale step, changes the first place?" — n(n − 1) recomputes plus rankings, cheap.
  It belongs in the Weights stage panel or Robustness, but it is a new analysis with its own copy and picture;
  park it as a follow-up candidate, not a blocker.
- **Criterion removal, "recompute" mode**: today `removeCriteria` calls `weighting.compute(reduced, params)`
  (l. 631). It gains `opts.judgements`; for a `reads: 'judgements'` method it passes the judgements with row and
  column j dropped. For **AHP** this is meaningful (the eigenvector of the sub-matrix differs from the renormalized
  weights exactly when the answers are inconsistent — a nice teaching point). For **BWM** removing the best or the
  worst destroys the model, so BWM offers **renormalize only** (Iroh's call; `RobustnessStage.tsx` l. 67 passes no
  weighting for BWM, as it does for Equal).
- **AHP ranking with pairwise criteria in removal**: the reduced problem drops criterion j, so the run's
  `judgements[j]` must drop too. `RankerFor` becomes `(problem, removed?: number) => Ranker`; `rankerFor(run)`
  drops index `removed` from `run.judgements` before `prepareRanking`; `removeCriteria` passes j. Nothing else in
  robustness changes.

## 5. Shared `PairwiseCard` and live panel

One component pair in `src/features/pairwise/`: `PairwiseCard` (one question) and `JudgementPanel` (bars +
consistency), driven by a pure queue model (`pairwiseQueue.ts`, testable without DOM, like `ideaSteps.ts`):

```ts
type Question = { a: number; b: number; fixed?: 'a' }   // fixed: BWM, side is given (a always wins)
type Mode = { kind: 'ahp' } | { kind: 'bwm'; cap: number }   // cap = a_BW; values above are disabled
```

**Question order.** AHP: spanning path first (1–2, 2–3, …, (n−1)–n), then the rest by distance (AHP card: provisional
bars after n − 1 answers, every later answer is a check). BWM: pick best → pick worst → a_BW → best-to-others →
others-to-worst (2n − 3; n = 2: only a_BW). Alternatives (AHP ranking): same as AHP.

**States of one card**

| State | Shows | Input |
|---|---|---|
| Unanswered | question, side row `[A] [=] [B]` (AHP) or the fixed sentence (BWM) | side tap |
| Side chosen | 3 × 3 grid 1–9 (words on 1/3/5/7/9 from the card's scale labels) | value tap → saved, next card |
| Answered | "A ▸ 5 · strongly", editable in place | re-tap side or value |
| Flagged | answered + accent marker + "Your other answers suggest 3" + `[Use 3]` | one tap applies |
| Disabled values | BWM: chips > a_BW disabled with a tooltip "at most a_BW" | — |
| Not applicable | n = 2: no CR gauge, the text "not applicable" (AHP n = 2 has CR 0/0) | — |

`=` answers 1 in one tap (Iroh's call: "equal" should not need two taps). Tapping a value saves and moves to the
next **unanswered** card at once, without animation; the progress indicator moves (`--dur-slow`) and the bars move
to their new lengths (`--dur-data`, object constancy). When all are answered the card area becomes a summary list of
all pairs (tap one to edit).

**Mobile (≤ 640 px), one column**

```
┌───────────────────────────────────┐
│ Which matters more?        4 / 10 │
│ ┌─────────┐ ┌───┐ ┌─────────┐     │
│ │  Price  │ │ = │ │ Comfort │     │   side row, 48 px tall
│ └─────────┘ └───┘ └─────────┘     │
│   ┌──────┐ ┌──────┐ ┌──────┐      │
│   │  1   │ │  2   │ │  3   │      │   3 × 3 grid, ≥ 56 px cells
│   │equal │ │      │ │ mod. │      │
│   ├──────┤ ├──────┤ ├──────┤      │
│   │  4   │ │  5   │ │  6   │      │
│   │      │ │strong│ │      │      │
│   ├──────┤ ├──────┤ ├──────┤      │
│   │  7   │ │  8   │ │  9   │      │
│   │v.str.│ │      │ │extr. │      │
│   └──────┘ └──────┘ └──────┘      │
│ ‹ Back                            │
├───────────────────────────────────┤
│ Price    ████████░░  0.41         │   live panel, below the card
│ Comfort  ███░░░░░░░  0.18         │   (provisional bars hatched)
│ …                                 │
│ CR 0.06 ●  ok          [All pairs]│
└───────────────────────────────────┘
```

**Desktop (≥ 1024 px), two columns**: card left (same card, same size); right: the live panel and under it a
compact list of all pairs (answered value or "—", flagged one marked) to jump to any question. The read-only
matrix picture (AHP) or the two rulers (BWM) sits above both, from the method view's `stage` picture.

**Consistency badge.** AHP: "CR 0.06" with a tick at 0.10; at ≥ 0.10 the badge takes the warning colour and the
flagged card is linked ("Look at Price vs Comfort"). BWM: "CR^I 0.14 / threshold 0.30", flagged criterion named.
Text and numbers follow the cards' UI labels (EN/TR, "siz").

**Keyboard and accessibility**

- Each card: `role="group"`, `aria-labelledby` the question. Side row and value grid are radio groups
  (Radix; arrows move, 2-D in the grid). Digits `1`–`9` set the value directly when the card has focus, `←`/`→`
  pick the side, `=` picks equal, `Backspace` goes back one card. Focus moves to the next card's side row after
  an answer (wait for the focus move in e2e, Kurallar trap on Radix arrow focus).
- Every radio has a full accessible name ("5, strongly more important").
- One polite live region announces only consistency **state changes** ("Consistency warning: Price vs Comfort"),
  never every recomputed number. Progress "4 of 10" is in the group's description.
- Targets ≥ 44 px; colour is never the only signal (flag has an icon and text). Reduced motion: all transitions 0.
- The BWM best/worst pickers are radio groups of criterion chips; picking best disables it in the worst picker.

**Weights stage wiring.** `WeightsStage` (l. 65) shows the selector with 8 options; on phones the 3 × 2 grid
becomes 4 × 2, order: CRITIC, Entropy, SD, MEREC, Equal, Manual, AHP, BWM (Iroh's call: the four data methods,
then the four "from you"). For `ahp`/`bwm` the stage renders `JudgementWeights` (editor + panel; then, once
complete, the usual weights table and `MethodWarnings`) instead of `ComputedWeights`. BWM's "all equal" shortcut
switches the method to Equal and keeps the BWM answers (Iroh's call: no fake answers). AHP at n ≥ 8 shows the
question counts ("AHP 28, BWM 13") and a one-tap switch to BWM; AHP at n > 15 is an error that offers BWM.

## 6. Method pages and "step through the idea"

- **AHP page** (`/methods/ahp`, catalogue family stays `weighting-subjective`, status `available`): the card's
  picture "a matrix of ratios, one vector that fits it" with its 4 IdeaSteps (card lines 26–32). A second section
  "AHP as a ranking method" (Iroh's call): a small picture of local priorities per criterion (columns summing to
  1), weighted and stacked into the global priority, 3 steps (shares per criterion → times the weight → summed),
  and the SAW(sum) scatter with one sentence. Steps content `src/content/steps/ahp.ts` (one module for both
  ids; TeX from the existing `src/content/methods/ahp.ts`).
- **BWM page**: the card's "two rulers" picture with its 4 IdeaSteps.
- Idea pictures take judgements: `IdeaPictureProps` and `StagePictureProps` gain an optional `judgements`.
- Catalogue: AHP and BWM `available`; the landing method count counts AHP once (`page: 'ahp'`).
- Ledger rows: AHP weights (Saaty 2008 job, tolerance 5e-4), BWM (Rezaei 2016 car, 6e-5).

## 7. Fixtures and tests

**Fixtures** (`tests/fixtures/`, JSON copied from the cards, `published` and `expected` kept apart):
- AHP weights: `ahp-saaty2008-job` (main), `ahp-saaty2008-drinks-corrected`, `ahp-saaty2008-3x3`,
  `ahp-doguc2022-recruitment` (eigen and geometric expected; published additive values documented only),
  `ahp-bozoki2010-incomplete` (incomplete LLSM for provisional weights and connectivity).
- BWM: `bwm-rezaei2016-car` (main, 3 cases), `bwm-ratandhara-kumar` (one case per closed-form branch),
  `bwm-demir-bircan2020`, `bwm-arsu2021` (Turkish; both over the CR^I threshold), plus ~50 random cases dumped from
  `bwm.py`'s LP as an oracle (1e-12).
- AHP ranking: **none yet in the card** (its scope was weights). Phase 3 starts with a card re-check that extracts a
  full-AHP fixture (Doğuç 2022 was read in full and has 4 candidates × 5 criteria; Saaty 2008's job ratings are
  printed transposed, card F1 note ii) and, if one exists, an AHP-with-decision-matrix paper (Open question 1).

**Tests**
- Core (Vitest): every fixture; properties from the cards (consistent matrix → CR 0 and w recovered; eigen =
  geometric at n = 3; n = 2 → CR NaN, no warning; n = 16 → error; planted error flagged and suggestion recovers it;
  BWM Σw = 1, w > 0, ξ^L = max deviation, permutation equivariance); AHP ranking from the matrix equals SAW `sum`
  scores exactly; `ahp-ranking` passes the registry-wide `RankingRun` test with no judgements.
- Store: judgements follow add, delete, rename, type change, reorder, undo of a delete, paste, import (by name),
  example load, reset; persistence sanitizing (wrong size, off-scale value, broken reciprocity, best = worst).
- Robustness: removal drops row/column j (AHP recompute) and `judgements[j]` (AHP ranking); BWM gives no
  recompute rows.
- Compare: echo only with SAW `sum` and no pairwise criterion.
- Queue model: order (spanning path first; BWM sequence), next-unanswered, cap handling after a_BW changes.
- e2e (Playwright): two-tap answer on the mobile viewport; digits on desktop; full AHP and BWM flow to a ranking;
  flagged answer → "Use 3" lowers CR; axe on the card in all states; `idea-steps.spec` covers `ahp` and `bwm`
  (the sentence-height test, c750514); `workbench.spec` selector assumptions updated for 8 weighting options.
- i18n: EN/TR key parity (existing test).

## 8. Phases

Each phase ends green (`pnpm test`, e2e), with the ADDING-A-METHOD checklist done for what it adds, and with
screenshots for the owner.

**Phase 1 — judgement model, PairwiseCard, BWM weights.**
Core types and `reads`; `matchCriteria` split; store fields, actions, carrying and sanitizing; `pairwiseQueue`;
`PairwiseCard` + `JudgementPanel` with **both** modes built (the AHP two-sided mode is exercised by the queue tests
and the dev page `src/app/dev/DevUi.tsx`, not yet selectable); `bwm.ts` closed form, CR^I, Liang table;
BWM in the Weights stage, view, page, steps, fixtures, e2e; removal renormalize-only for BWM.
Why BWM first: fewer questions, a closed form, and the fixed-side mode is the simpler half of the card.
**Gate:** owner reviews the card on a phone and on desktop before AHP builds on it (as with the IdeaSteps pilot).

**Phase 2 — AHP weights.**
`ahp.ts` (power iteration, geometric, Perron CR, Saaty RI, inconsistency ranking with leave-one-out LLSM
suggestion, incomplete LLSM for provisional bars); side mode on; flagged state and "Use v"; BWM hint at n ≥ 8, error
above 15; AHP ↔ BWM switching keeps answers; removal recompute with judgements; AHP page section 1 with 4 steps;
fixtures F1–F3; the downloaded workbook gets a "Judgements" sheet (matrix, CR) so a result can be reproduced
(Iroh's call, small).

**Phase 3 — AHP ranking, then pairwise alternatives.**
3a: card re-check for ranking fixtures; `ahp-ranking` with matrix-derived locals (SAW-sum helper shared);
`RankingRun.judgements`, `RankerFor(problem, removed)`; Compare echo rule and order; AHP page section 2.
3b: source switch per criterion for m ≤ 7, alternatives through `PairwiseCard`, per-criterion CR, carrying on
alternative edits, the m > 7 inactive notice.

## 9. Open questions (only the owner can answer; each changes the product)

1. **Example data for AHP and BWM.** The site loads published datasets only, and the cards' judgement fixtures
   (Saaty, Rezaei) have no decision matrix. Options: (a) find for each method one published paper that gives both
   the judgements and a numeric decision matrix (AHP→TOPSIS papers are common in Turkish journals; BWM ones less
   so) and use it as the workbench example; (b) let a judgement example load criteria + answers onto an empty
   alternatives table; (c) use the judgement fixtures only on the method page (idea picture, tests), with no
   workbench example button. **Recommendation:** (a) where a paper exists, else (c) for that method; (b) looks broken
   on the Ranking stage.
2. **A pairwise-entered criterion still needs numbers in the matrix (v1)?** People choose pairwise exactly for
   qualitative criteria without numbers. **Recommendation:** yes in v1 (every other method, Compare and Robustness
   read the matrix); later, an explicit "fill this column with the AHP local priorities" action, so other methods
   can use them too, visibly.
3. **Compare: AHP ranking from the matrix is SAW (sum).** **Recommendation:** the MARCOS/MABAC rule — echo (drawn,
   counted once, badge) only when SAW also runs with `sum` and no criterion is pairwise; otherwise an independent
   vote, with the identity shown on the method page.

### Resolved (Fatih, 18.10)

1. Example data: (a) where a published paper gives both judgements and a numeric matrix; otherwise (c) the
   judgement fixture lives on the method page only, and the workbench tests use a Python-recomputed oracle
   labelled "recomputed" (also for the Phase 3b pairwise-alternatives path).
2. Yes: a pairwise-entered criterion still needs its matrix column in v1.
3. The MARCOS/MABAC rule as recommended. Only SAW's `normalization` matters; AHP's `priority` option does not
   change matrix-derived locals, so it does not affect the echo. If SAW runs twice, any SAW run with `sum` counts.
4. `ahp-ranking` runs with whatever weights the Weights stage produced (CRITIC included); the Ranking stage shows a
   short note "for classic AHP, give the weights with AHP" with a link to the Weights stage. No new coupling.

### Iroh's calls after the builder check

- The SAW normalization helper is extracted once in Phase 3, used by both `saw.ts` and AHP; SAW's existing
  fixtures and tests are the regression guard and must stay green unchanged.
- Phase 1 registers only `bwm`; the `ahp` weighting id is registered in Phase 2. The Weights selector shows 6
  options after Phase 1, 7 after Phase 2; the mobile grid and the selector e2e are updated in the phase that adds
  the option. No feature flag.
- The workbook export adds one "Judgements" sheet (criteria matrix, CR or CR^I, and in Phase 3b one block per
  pairwise criterion), in the existing xlsx export module.
- `Setup` remember/recall treats judgements exactly like `manualWeights`: loading an example stores the user's
  judgements, undo restores them; judgements typed on top of an example belong to that example's session and are
  dropped when the user returns to their own setup.

## 10. Left to the builder

File and component names beyond those above; i18n key names (copy from the cards' "For users" and UI labels);
exact layout breakpoints and spacing within DESIGN.md; the provisional-bar styling; the pair-object memory for undo;
power-iteration and Laplacian solver details (cards' Implementation notes); the Liang table's embedding; how a
BWM removal table shows the absence of recompute rows; the queue's order among non-path AHP pairs; whether the
summary list on desktop is a list or a small matrix; e2e selectors.
