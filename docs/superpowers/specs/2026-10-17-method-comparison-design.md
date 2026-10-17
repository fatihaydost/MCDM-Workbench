# Method comparison stage: design

Status: implemented 2026-10-17. Builds on `RankingRun` (`src/core/run.ts`, commit 0e3a892).
Read `docs/design/DESIGN.md` (copy and layout rules), `MOTION.md` and `ADDING-A-METHOD.md` §14 first.

## Intent

A user who has weights and a ranking wants to know two things: **is my result solid** (do other ranking methods
agree?) and, when they do not, **why do they differ**. The answer to "why" is not a dump of intermediate numbers but
"which criterion, and how each method treats it": e.g. A1 is ahead on most criteria but behind on C5; TOPSIS, SAW and
EDAS let the other criteria make up for it, VIKOR looks at the largest single regret, so it puts A7 first.

## Goals

- A new workbench stage **Compare** that runs every available ranking method on the same problem and weights.
- A **rank-line chart** (owner's choice, mockup "A" of 2026-10-17): one column per method, one line per alternative
  across the columns, crossing lines = disagreement; the Borda rank at the right end of each line.
- One summary line under it: Kendall's W over all methods and "first place is the same in N of M methods".
- A **"why" panel**. By default it explains the **top two contenders** (owner); clicking/selecting any crossing in the
  chart explains that pair instead (owner). The text is generated from the computation.

## Non-goals

- Choosing which methods to compare (all available ranking methods run; the owner agreed with this).
- Merge methods other than Borda (Copeland etc.), parameter sensitivity, xlsx export of the comparison.
- Weighting-method comparison. Store shape stays `rankingMethod` + `methodParams` (Kurallar, 17.10).

## Anti-goals

- The Borda ranking must never replace the individual rankings; it sits next to them (`src/content/guide.ts`
  "agreement" card; the guide copy for this exists at `guide.ts:~826-846`).
- No wall of numbers in the "why" panel; short sentences, criterion names, the method's behaviour. DESIGN.md: short
  title + at most one sentence per block, details in a disclosure.
- Motion only to explain a state change (MOTION.md): no entrance fades or staggers.

## Decided (owner, 2026-10-17)

1. Purpose: confirm the result and see where/why methods differ.
2. Explanation level: "which criterion, how each method behaves", not raw intermediate values.
3. Layout: rank lines (A), not the rank table (B).
4. Placement: a separate stage next to Robustness; every available ranking method runs automatically.
5. "Why" panel: default the top two; any other pair on click.
6. VIKOR's column shows its **Q order** (A7 first on the reference data), same shape as the other methods; Borda and W
   use it. Under the column one line states VIKOR's own rule when it gives no single winner: "VIKOR's own rule:
   compromise set A7, A1, A8" (from `vikorCompromise`), so Compare never contradicts the Results stage.
7. Explanation precision: **the pair's real differences + the method's fixed character sentence**. The criteria named
   come from one shared, method-independent function (weighted gap relative to the criterion's spread, top 1-3);
   which side each method falls on always comes from its actual ranking, never inferred. For VIKOR only, the panel
   names the criterion that gives each alternative its largest regret R (from VIKOR's steps), and that is pinned by a
   unit test on the reference example. No per-criterion decomposition for TOPSIS or EDAS.

## Builder's calls already made (Iroh, marked as such; owner saw them in chat and did not object)

- Each method runs with **its own saved options** (`methodParams[id]`, e.g. VIKOR v), resolved through
  `prepareRanking(problem, { methodId, params })`. The weights are the workbench's computed weights.
- The method set = the ranking methods in the registry (`rankingMethods`), in the segmented-control order of
  `RankingStage.tsx` `RANKING_METHODS`.
- **Borda** on competition ranks (`rankScores` semantics: ties share the best rank): points = sum over methods of
  (n − rank); Borda rank = competition rank of the points, ties shared.
- **Kendall's W** over the m method rankings using mid-ranks (`midRanks`), the formula on the guide card; with tie
  correction (state which in the code comment). Pairwise `kendallTauB` exists and may be shown in a disclosure.
- **All agree** (identical rankings): the lines are straight, the panel says so in one sentence ("All four methods put
  A1 first; their rankings are identical."). "Top two" = Borda rank 1 and rank 2. If every method orders these two
  the same way, the panel says so in one sentence and points to the crossings below them.
- **A method that cannot rank** (blocking issues, e.g. SAW with a 0, EDAS with a non-positive average): its column is
  shown empty with a one-line reason (the issue text); it is left out of W and Borda, and the summary says
  "3 of 4 methods ranked". If fewer than 2 methods rank, the stage shows the blocked state like Robustness does.

## The "why" text: how it is generated (builder's design, constraints here)

Generated, not hand-written per example. For a pair (a, b):

1. Which criteria separate them: per criterion, which one is better (respecting benefit/cost) and by how much,
   relative to the criterion's spread; keep the 1-3 criteria that matter most given the weights.
2. Per method, which one it ranks higher, plus **one fixed sentence about the method's character** that explains
   the direction (owner's example, worded by the builder, bilingual i18n):
   - TOPSIS: distance to the ideal and the anti-ideal; strengths can make up for a weakness.
   - SAW: weighted sum; strengths make up for a weakness fully.
   - VIKOR: balances the total against the single largest regret (v); one big weakness weighs heavily.
   - EDAS: distance above and below the average; strengths make up for a weakness.
3. Group the methods that agree ("TOPSIS, SAW and EDAS → A1; VIKOR → A7").

The character sentence lives on the method's content (one i18n key per method, e.g.
`compare.character.<id>`), so new methods (WASPAS, COPRAS) add one line. Precision bar: owner decision 7 above.

## Reference data for tests and screenshots

`keshavarz-2015-ten-alternatives`, weight set 1 (`src/data/examples.ts`). Ranks today
(A1..A10): TOPSIS [1,4,6,10,7,8,2,3,5,9], SAW [1,3,6,9,7,8,2,4,5,10], VIKOR v=0.5 [2,5,7,9,6,8,1,3,4,10],
EDAS [1,4,6,10,7,8,2,3,5,9]. First place: A1 in 3 of 4, VIKOR A7 (by Q; its compromise set is A7, A1, A8). Borda top two: A1 (35 points), A7
(33), checked by the builder check. W are to be computed, not copied from
the mockup (its numbers were illustrative).

## Constraints

- Core logic pure TS in `src/core` (Borda, W, pair explanation facts), unit-tested with Vitest; UI only renders.
- Stage wiring like Robustness (`WorkbenchPage.tsx` lazy stage, `Stage` union, `NO_ATTEMPTS`, rail entry,
  `?stage=compare`), its own lazy chunk and i18n namespace; TR and EN; light and dark; 1440 and 390 px; keyboard
  reachable crossings (the chart is SVG, hand-written, tokens only: `--data-cat-*` palette, no hex).
- Chart has a "Show as table" disclosure like the other pictures (accessibility).
- e2e: one run on the reference example (stage opens, four columns, VIKOR's A7 first, default panel names A1 and A7,
  clicking another crossing changes the pair).
- Done = `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e` pass; screenshots both themes, both languages,
  1440 and 390.

## Left to the builder

Exact component split, chart geometry and label collision handling at 10+ alternatives, how a crossing is hit-tested
and focused, wording of every string (within DESIGN.md rules), whether pairwise τ_b is shown, the rail summary text
for the stage.
