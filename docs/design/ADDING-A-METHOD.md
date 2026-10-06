# Adding a method

The path from a research card (`docs/research/methods/<id>.md`) to a method that computes in the workbench,
with every place the code has to change. Worked from CRITIC (weighting) and TOPSIS (ranking) as of 2026-10-05.
Line numbers drift; search for the quoted symbol when they do.

Legend: **[T]** forgetting it breaks `pnpm typecheck`, **[U]** breaks a unit test, **[E]** breaks an e2e test,
**[S]** nothing fails but the site is wrong (raw key on screen, method missing, wrong picture). Optional items say so.

Order per method (Kurallar): review the card with Fatih, re-research it, then work through §1 to §9, then §10.

## 0. What the card gives you

| Card section | Goes to |
|---|---|
| For users, When to use / not, Inputs, Pitfalls, Commonly combined with, Sources | already in `src/content/methods/<id>.ts` (draft); recheck after re-research |
| Algorithm | `steps` of the content card (method page) and `src/content/steps.ts` (worked calculation, per core step) |
| Reference example (JSON) | `tests/fixtures/<id>-<author><year>.json`, optionally a dataset in `src/data/examples.ts` |
| Implementation notes, edge cases | the core function, its `MethodWarning`s and validation |

Fixture shape used by the existing tests and by the landing ledger: `{ id, source, alternatives, criteria, types,
matrix, weights?, expected: { ..., tolerance } }` (see `tests/fixtures/critic-krishnan2021.json`). When the paper has
a typo, keep both the printed and the corrected values (card rule) and test against the corrected one.

## 1. Core (`src/core`)

- [ ] **Method file** `src/core/methods/<id>.ts`, a pure object implementing the interface from `src/core/types.ts`:
  - weighting: `WeightingMethod` (types.ts:39), `compute(problem, params): WeightingResult` (`weights`, `steps`,
    `diagnostics?`, `warnings?`). Example `critic.ts:14`.
  - ranking: `RankingMethod` (types.ts:56), `compute(problem, weights, params): RankingResult` with `scores`,
    `order: 'desc' | 'asc'` and `ranking: rankScores(scores, order)` (`src/core/rank.ts`, competition ranks).
    Example `topsis.ts:10`, return at `topsis.ts:64`.
  - Start with `assertValid(validateProblem(problem))` (critic.ts:18); a ranking method also validates the weights
    (`topsis.ts:15`). Never read an empty cell as 0.
  - Emit one `Step` per intermediate result with a stable key `<id>.<camelCase>` (`critic.ts:72-80`). Use `matrix`
    (m x n or n x n), `vector` (length m or n) or `scalar`. Every key you emit drives §2 and §3.
  - Header comment: variant chosen, source, `See docs/research/methods/<id>.md`.
- [ ] **Registry** `src/core/registry.ts:6-7`: add to `weighting` or `ranking`. [S] without it the workbench computes
  nothing (`computeWeights` / `computeRanking` look methods up by id, `src/state/workbench.ts:312,328`) and the
  robustness worker answers "unknown ranking method" (`robustness.worker.ts:31`).
  [U] `tests/validate.test.ts:78-79` hard-codes the registry lists; update them.
- [ ] **Barrel** `src/core/index.ts:4-6`: `export { <id> } from './methods/<id>'`. Optional, but every caller and test
  imports from `../core`.
- [ ] **Types** only if the method needs something new (see §11 parameters, §12 `order: 'asc'`).
- [ ] **Validation** only if the method has data requirements (§13).

## 2. Step content (worked calculation)

- [ ] `src/content/steps.ts`: add every emitted key to the `StepKey` union (steps.ts:15) and an entry to
  `stepContent` (steps.ts:31): `en`, `tr` (one sentence, at most 14 words), `tex` (no words inside TeX, no `--`),
  `edgeCase?` when the code deviates from the plain formula. [T] a union member without an entry.
  [U] `src/content/content.test.ts:193-199` compares `STEP_KEYS` with the keys emitted by critic and topsis:
  **add your method's `compute` call to the `emitted` list there**, otherwise your new entries fail the test.
  Without entries at all nothing fails [S]: the block shows no formula.
- [ ] `src/i18n/en.json` and `tr.json`:
  - `steps.<id>.<key>` (en.json:623): one line per step. [U] `tests/i18n.test.ts:68-86` checks this for the steps
    critic and topsis emit: **add your method's `compute` to that test** so it is checked too.
  - `workbench.stepNames.<id>.<key>` (en.json:358): short block title, also the xlsx header and row label.
    [S] untested: a missing one prints the raw key in the calculation and in the downloaded workbook.
  - `workbench.flow.<id>.<nodeKey>` (en.json:440): only if you add a step map (below).
  - Both files must have the same keys and `{{vars}}`, no em or en dash, no emoji [U] `tests/i18n.test.ts:22-48`.
- [ ] `src/app/workbench/WorkedCalculation.tsx`: `PLAIN_SYMBOL` (:17) and `TEX_SYMBOL` (:33) give the row label of a
  vector or scalar step ("σ", `$\sigma_j$`). Optional; without it the step name is used.
  `LOCAL_TEX` (:49) is only for steps the store makes itself (equal, manual).
- [ ] Step map (optional, recommended for 4+ steps): a `<ID>_FLOW: FlowNode[]` next to `CRITIC_FLOW` in
  `src/features/illustrations/geometry.ts:291` (node key = first step key of the node, `stepKeys` = the steps it
  covers), export it from `src/features/illustrations/index.ts`, add it to `FLOWS` (`WorkedCalculation.tsx:70`),
  plus the `workbench.flow.*` labels.
- [ ] `src/features/io/table.ts:39` `KNOWN_STEP_AXES`: the axes of every step (`'alternatives'`, `'criteria'`, or a
  pair for matrices). [S] without it a square problem (m = n) guesses the axis and marks the table ambiguous in
  the TSV / LaTeX copy and the xlsx. The xlsx export itself (`src/features/io/xlsx.ts`) is generic.

## 3. Workbench state (`src/state/workbench.ts`)

- [ ] `WeightMethodId` / `RankingMethodId` (:25-26): add the id. This is what makes §4 fail the typecheck until it is
  done, which is useful.
- [ ] `computeWeights` (:290) and `computeRanking` (:323) need no change for a registry method; equal and manual
  are the only special cases.
- [ ] `loadExample` (:144-158) sets `weightMethod` to `'manual'` when the example has weights, otherwise `'critic'`,
  and never touches `rankingMethod`. [S] a new method's "Open in workbench" link (`/app?example=<id>`, from
  `MethodPage.tsx:113`) would open with CRITIC / TOPSIS. Make it pick the method from `example.referenceFor`
  when that is a weighting (or ranking) method in the registry.
- [ ] The store has no URL state: `?example` and `?stage` are read once and removed (`WorkbenchPage.tsx:53-74`);
  the chosen methods live only in localStorage `kds.workbench.v1`. Adding an id to a union needs no storage bump.
- [ ] `tests/workbench-state.test.ts`: add a "through the store" case like `:48-60` (example or fixture in,
  published numbers out).

## 4. Workbench UI (`src/app/workbench`)

Weighting method:

- [ ] `WeightsStage.tsx:22` `METHODS`: add the id where it should appear in the segmented control.
  [E] `tests/e2e/workbench.spec.ts:201-213` walks CRITIC → Equal weights → Manual with the arrow keys; inserting
  between them changes the sequence. Update the test or append after Manual (decide with the design).
- [ ] i18n `workbench.weightMethod.<id>` (en.json:163) and `workbench.weights.methodHint.<id>` (en.json:255).
  [T] both keys are built from the typed id (`shared.ts:37`, `WeightsStage.tsx:73`).
- [ ] `ComputedWeights` (`WeightsStage.tsx:89`) is typed `method: 'critic' | 'equal'` [T]. Widen it, then decide what
  the stage shows: the method's own columns (CRITIC adds σ, conflict, information at :135-155 from its steps), its
  picture (CRITIC's `CriticIdea` at :105), and **the "Show the calculation" toggle, which is CRITIC-only at :167**
  [S] (a new method would have no worked calculation on the Weights stage).
- [ ] Optional: a "Fill with <method> weights" button in `ManualWeights` (CRITIC's at :253-257, `startCritic` key).

Ranking method:

- [ ] `RankingStage.tsx:24` `RANKING_METHODS`: add the id where it should appear in the segmented control. i18n
  `workbench.rankingMethod.<id>` and `workbench.ranking.methodHint.<id>` [T].
- [ ] `RankingStage.tsx:33` `RANKING_VIEWS` (a `Record` over `RankingMethodId`, so a missing entry is [T]): the
  method's extra table `columns` (step key + header key; TOPSIS D+ and D−, SAW none) and its `Picture` (TOPSIS
  `TopsisPicture`, SAW `SawPicture`; props `problem`, `weights`, `params`) and `pictureShowsScores` (true when the
  picture already draws every score as a bar in rank order, as SAW's does: it then replaces the score chart).
  Everything else on the stage is generic:
  the score chart sorts by `result.order`, `CalculationToggle` takes the steps.
- [ ] The score's words, `workbench.ranking.score.<id>` in en.json and tr.json [T] (read by `scoreWords`,
  `shared.ts`): `name` ("Closeness C", "Score S": table column, workbook column, sweep table), `title` ("Closeness
  coefficient C", "Weighted sum S": score chart, robustness sweep chart `{{score}}`) and `symbol` ("C", "S": the
  best sentence and the Results headline, `{{symbol}} = {{value}}`). The step line of the score key says which way
  ranks higher ("A higher value ranks higher").
- [ ] `ResultsStage.tsx` is generic (compact `RankingTable` with `method`, headline and workbook from `scoreWords`,
  the byline and the About sheet name the variant through `rankingMethodFullLabel`, e.g. "SAW (sum)"). The CRITIC
  correlation heatmap is gated on CRITIC.
- [ ] A `ParamDescriptor` on the method shows its control under the selector by itself (`MethodParams`).

Both:

- [ ] `ExplanationPanel.tsx:11` `PanelMethod` and `preloadPanelCards` (:14-16): add the id [T] (`MethodNote id=` at
  :130-138 takes the store's id). The panel shows the card's first summary sentence and first pitfall; keep a stage
  under 60 words [E] `tests/e2e/a11y.spec.ts:224` (checked for the example's methods).
- [ ] `MethodWarnings` (`parts.tsx:146`) renders `warnings.<code>` generically (§13).
- [ ] `WorkbenchPage.tsx:195`: the rail treats any blocking issue whose code contains "weight" as a weights problem;
  keep new code names honest.

## 5. Robustness (`src/app/workbench/robustness`, `src/core/robustness.ts`)

- [ ] Nothing to register: every function takes a `RankingMethod` (robustness.ts:6) and the worker resolves the id
  through the registry (`robustness.worker.ts:31`). It honours `order` (`robustness.ts:97`).
- [ ] `RobustnessStage.tsx:58` offers "Recompute" in criterion removal for CRITIC only. For a new objective weighting
  method use `getWeightingMethod(weightMethod)` (Entropy, SD, MEREC can all be recomputed on the reduced matrix).
  [E] `tests/e2e/robustness.spec.ts:148-154` expects the label "Recompute CRITIC" on the CRITIC example; keep it.
- [ ] Copy: generic. The sweep chart title takes the method's `score.title` and the sweep table its `score.name`
  (`SweepSection.tsx`, `scoreWords`).
- [ ] Every call passes `{}` as params (robustness.ts:30, :507; worker :39; `SweepSection.tsx:69`); see §11.

## 6. Method page and catalogue

- [ ] Status flips in **two** files: `src/content/methods/<id>.ts` (`status: 'available'`) and the row in
  `src/content/methods/catalog.ts:10-37` [U] `src/content/catalog.test.ts:8-13` requires them equal.
- [ ] [U] `src/content/content.test.ts:107-112` requires available = registry and hard-codes
  `['critic', 'equal', 'topsis']`: update the list.
- [ ] [U] `content.test.ts:171-178`: the card's `reference.note` must drop "not computed here yet" / "henüz
  hesaplanmıyor" once available. Rewrite the note as a test result (what matched, to how many decimals), set
  `reference.match` from your own test.
- [ ] `src/app/methods/Catalog.tsx:16-17` `Available` type and `AVAILABLE` list, a thumbnail in `useThumbs()` (:25-39,
  `MethodThumb` kinds `bars` or `plane`), and i18n `methods.catalog.oneLiner.<id>` (en.json:528).
  [S] **without this the method disappears from `/methods`**: the research section filters `status === 'research'`
  and the available section only renders `AVAILABLE`.
- [ ] `MethodPage.tsx` is generic: status label, the reference block's wording (`available` at :112) and the "Open in
  workbench" buttons (examples whose `referenceFor` includes the id, :113) switch by themselves.
- [ ] `MethodIdea.tsx`: the picture at the top. TOPSIS and CRITIC have one (`:25-105`); any other method falls back to
  its family glyph (:110-116). DESIGN.md §Copy asks for the idea as a picture first. Add an illustration in
  `src/features/illustrations/<Name>Idea.tsx` (numbers from the core, labels as props, tokens only; README there),
  optionally a step-through story (`IdeaSteps`, `<ID>_IDEA_STEPS`, sentences in `methods.page.idea.<id>.steps.s*`,
  MOTION.md "Explain" rules), and a branch in `MethodIdea`. Reuse it on the workbench stage.
- [ ] Prerender and sitemap need nothing: every card already has a route (`src/app/prerender.tsx:23-35`,
  `vite.config.ts:93-114`).
- [ ] Guide (`src/content/guide.ts`, `Guide.tsx`) needs nothing: it links every method and reads the status from
  `catalog.ts`. Recheck `weightingRequirements` / `rankingRequirements` against the re-research.

## 7. Example data (`src/data/examples.ts`)

- [ ] Add a dataset when the reference example is a usable workbench example (published, both languages for the
  criterion names): `id`, `name`, `summary`, `referenceFor: ['<id>']`, `citation` with `tables`, `alternatives`,
  `criteria`, `matrix`, `weights?`, `published` (label = the step key, decimals as printed). It then appears in the
  Data stage menu and as the method page's "Open in workbench" button.
- [ ] [U] generic checks in `tests/workbench-state.test.ts:32-40` (DOI, tables, shape). Add a "matches the fixture"
  case like `:24-31`; the "no invented data" rule depends on it.

## 8. Landing

- [ ] `CataloguePreview.tsx` counts and groups by status: automatic.
- [ ] `Verified.tsx:11,36-39` "checked against published results" ledger: rows are hard-coded; the tolerance comes from
  the fixture's `expected.tolerance`, the citation from `examples.ts`. Add a row (widen `Row.method`, import the
  fixture) with i18n `landing.verified.<id>.claim` (en.json:85) and `methods.names.<id>` (en.json:476). Optional, but
  DESIGN.md §Layout says the ledger lists each method.
- [ ] `Pipeline.tsx`, `HeroResult.tsx`: stay CRITIC → TOPSIS (the hero example).
- [ ] Copy that names only CRITIC and TOPSIS: `landing.lead`, `landing.meta.description`, `workbench.meta.*`,
  `workbench.empty.ranking.body`, `index.html` meta, `README.md` (method table, "3 methods compute today"),
  `package.json` description. Update when the method ships.

## 9. Tests

- [ ] `tests/<id>.test.ts` from the fixture (pattern `tests/critic.test.ts`, `tests/topsis.test.ts`, helpers
  `expectClose`, `step`, `makeProblem` in `tests/helpers.ts`): the published outputs within the fixture tolerance,
  each intermediate step the paper prints, the edge cases (constant column, zeros, ties, invalid input throws
  `ProblemValidationError`), direction handling (benefit vs cost).
- [ ] Hard-coded lists to update: `content.test.ts:111`, `content.test.ts:194-197`, `tests/i18n.test.ts:51-64`
  (only for new validation codes), `tests/i18n.test.ts:69-85`, `tests/validate.test.ts:78-79`.
- [ ] Optional: `tests/robustness.test.ts` runs with TOPSIS only; one sweep or Monte Carlo case with a new ranking
  method (especially an `asc` one) is cheap insurance.
- [ ] e2e: none required. Add a workbench run (example → method → numbers equal the core) when the UI changed.

## 10. Commands

```
pnpm run typecheck
pnpm test
pnpm build                        # tsc + vite build, prerenders every route
pnpm e2e                          # starts its own Vite on 127.0.0.1:5191 (E2E_PORT to change)
pnpm shot /app /methods/<id> --theme both --width 1440,390
pnpm shot /app?example=<example-id>&stage=weights --lang tr
```

Look at the method page and each workbench stage in both themes, both languages, 1440 and 390 px before calling it
done (Kurallar: show the visual result).

## 11. Method parameters (current state and proposal)

**Today.** The interfaces already carry a params argument: `WeightingMethod<P = {}>` with `compute(problem, params: P)`
and `RankingMethod<P = {}>` with `compute(problem, weights, params: P)` (`src/core/types.ts:39-61`). No method uses it;
every caller passes `{}` (store `workbench.ts:315,336`; robustness `robustness.ts:30,507`, worker `:39`,
`SweepSection.tsx:69`; landing, catalogue, tests). There is no params state in the store, no UI control, no URL
parameter (the URL carries only `?example` and `?stage`, removed after load). Entropy (normalization), SAW
(normalization), VIKOR (v) and WASPAS (λ) all need one, so it is worth one small generic path.

**Proposal, smallest change that works** (not implemented):

1. Core: a params type per method with optional fields and a default inside `compute`, e.g.
   `type EntropyParams = { normalization?: 'sum' | 'minmax' }`, `params.normalization ?? 'sum'`. Callers that pass
   `{}` keep working. Check that `WeightingMethod<EntropyParams>` still fits the registry array `WeightingMethod[]`
   (it does: method-syntax parameters are bivariant; checked with tsc on 2026-10-05).
2. Describe the option as data on the method object, e.g.
   `params: [{ key: 'normalization', kind: 'choice', options: ['sum', 'minmax'], default: 'sum' }]`
   (`kind: 'number'` with `min`, `max`, `step` for v and λ), so one generic control renders any method's options.
3. Store: `methodParams: Partial<Record<string, Record<string, string | number>>>` in `WorkbenchData`, in
   `partialize`, with `setMethodParam(methodId, key, value)`; `computeWeights` / `computeRanking` pass
   `data.methodParams?.[id] ?? {}`; `useWeights` / `useRanking` select it. Optional field, so no storage version bump
   (persist merges missing fields from the initial state).
4. UI: a `SegmentedControl` (choice) or `NumberInput` (number) under the method selector, in `WeightsStage` /
   `RankingStage`, with i18n labels `workbench.params.<id>.<key>` and `.<option>`.
5. Robustness must use the same params, or it silently analyses the default variant: thread them through
   `rankWith` (robustness.ts:30), the removal recompute (:507), the worker request `Common` type (`robustness.worker.ts:19`)
   and `useMonteCarlo` / `useSweep` (`useWorkerJob.ts:80,96`), `SweepSection.tsx:69`.
6. Calculation and provenance: emit variant-specific step keys (`entropy.normalizedSum`, `entropy.normalizedMinmax`)
   so `stepContent` stays one static formula per key; name the variant in the method label used by the Results
   byline and the xlsx About sheet ("Entropy (min-max)").
7. URL: skip for now (methods are not in the URL either). If needed later, read `?weights=entropy&normalization=minmax`
   in `useQueryBootstrap` (`WorkbenchPage.tsx:56`), validate against the descriptor, then delete it like the others.

## 12. Ranking methods with `order: 'asc'` (VIKOR)

The core supports it (`rankScores`, robustness sorts by the method's own ranking), and so does the Ranking stage since
SAW: the score chart sorts by `result.order`, the table is in rank order, the score's words come from
`workbench.ranking.score.<id>` and the best sentences read "ranks first (Q = ...)", which holds for either order.
The robustness sweep's y axis stays inside [0, 1] only while the scores do (COPRAS's or a negative score widens it),
and the highlighted bar of the score chart keeps a 2 px mark at 0, so a best Q = 0 is visible.
Still to decide for VIKOR: it has three scores (S, R, Q) and acceptance conditions. Put S and R in `steps` and Q in
`scores`; S and R can be the extra `columns` of its `RANKING_VIEWS` entry (their header keys under
`workbench.ranking.columns`), and the acceptance conditions need a sentence or a notice of their own. Careful: VIKOR's
group utility is also called S, so its score words must not reuse SAW's "Score S".

## 13. Warnings and validation errors

**Method warnings** (non-blocking, the result is still shown):

- Code `<id>.<kebab-case>` in `result.warnings` (`MethodWarning`, types.ts:24: `code`, optional `col`, `row`).
  Examples `critic.ts:22-25,67`, `topsis.ts:25,62`. To surface a data-level warning, map the validator's issue to
  your own code, as CRITIC does with `constant-column` (critic.ts:22-24).
- Text `warnings.<id>.<kebab-case>` in en.json (:669) and tr.json. Only `{{criterion}}` is filled, from `col`
  (`parts.tsx:154`); `row` is not rendered, so a warning about an alternative needs a change there.
- Shown on the Weights stage (`WeightsStage.tsx:101`) and the Ranking stage (`RankingStage.tsx:187`).
- [U] `tests/i18n.test.ts:85` only checks warnings that its tiny problem triggers; add a case that triggers each
  new warning, or the text can be missing unnoticed [S].

**Validation errors** (blocking):

- Codes: `ValidationCode` union (`src/core/validate.ts:3-15`). Generic checks in `validateProblem` (:39) and
  `validateWeights` (:81). Method requirements: `RankingMethod.requires` (types.ts:59, only `positiveValues`),
  checked by `validateRequirements` (validate.ts:103) in `computeRanking` (workbench.ts:329) and reported as
  `non-positive-value` with the cell.
- `WeightingMethod` has no `requires`. A weighting method checks its data inside `compute` and throws
  `ProblemValidationError` via `assertValid([...validateProblem(p), ...ownIssues])`; `computeWeights` catches it and
  shows the issues (workbench.ts:316-318), so the Weights stage lists them with links to the cells.
- Strictly positive data (MEREC, the ratio and product methods): reuse `non-positive-value` (ranking: set
  `requires.positiveValues`; weighting: push the same issue yourself, or add `requires` to `WeightingMethod` and call
  `validateRequirements` in `computeWeights`).
- A new code (e.g. `negative-value` for Entropy's sum normalization, where 0 is allowed): add it to the union
  (validate.ts:3), a `case` in `placeIssue` (`src/app/workbench/shared.ts:55-101`, which stage and which control to
  focus) [T] (the switch has no default, so TS reports a missing return), `validation.codes.<code>` in en.json (:654)
  and tr.json with the variables `{{alternative}}`, `{{criterion}}`, `{{value}}`, `{{n}}`, `{{min}}`, and the code in
  `tests/i18n.test.ts:51-64` [U only once listed]. Prefer making a check depend on the params (Entropy min-max
  accepts any sign) by doing it inside `compute`.

## 14. Two or more ranking methods: what exists today

- Selection is single: `rankingMethod: RankingMethodId` in the store, a `SegmentedControl` on the Ranking stage
  (`RankingStage.tsx:164`), one ranking on Results, one method in Robustness (`RobustnessStage.tsx:37`). Adding a second
  method gives a choice between them, not a comparison.
- Agreement statistics in `src/core/robustness.ts` §C.6: `midRanks` (:522), `spearman` (:540), `kendallTauB` (:566),
  `wsCoefficient` (:598), all tested (`tests/robustness.test.ts`). Spearman and WS are used by criterion removal;
  `kendallTauB` is not used by any UI. Not present: Kendall's W, Borda (or Copeland) merge, any "compare methods" view
  or store field for a set of ranking methods. The guide copy for them exists (`src/content/guide.ts:826-846`).
- What the PLAN.md §Next 3 item would need: a set of ranking methods in the store (or "compare with" on Results /
  Robustness), each run with the same weights; τ_b per pair and W over all; Borda on the competition ranks;
  shown next to the individual rankings, never instead of them (guide.ts:845).
