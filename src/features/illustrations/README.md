# Illustrations (`src/features/illustrations`)

Small SVG pictures that carry a method's idea so the text around them can be shorter. Same rules
as the charts: colours only from tokens (UI colour for chrome, `--data-context` / `--data-accent`
for marks), IBM Plex with tabular numbers, no gradient, shadow or decorative motion. The only
motion is a 200 ms transition when the selection changes (0 under `prefers-reduced-motion`).
Numbers are always computed by `src/core` (`geometry.ts` reads the core's steps), never typed in.

**No visible text is built in.** Every component takes a `labels` prop (partial; missing keys fall
back to the exported English `*_LABELS_EN`, meant for development only). Pass translated strings
from `src/i18n`. Number formats come in as `format` (use `useNumberFormat().format` with 3 or 4
decimals).

```ts
import { PipelineDiagram, TopsisGeometry, CriticIdea, EntropyIdea, SawContributions, VikorIdea, EdasIdea, StepFlow, MethodGlyph, EmptyMatrixHint } from '../features/illustrations'
```

Preview: `/dev/illustrations` (dev only, `Preview.tsx`), e.g.
`pnpm shot /dev/illustrations --theme both --width 1440,390`.

## PipelineDiagram

Data to weights to ranking to result (plus a faded "robustness, coming later" box). Each box has a
sketch of what it holds: a 3 x 3 matrix, weight bars, 1-2-3, a result table. A row of boxes in a
container of at least 600 px, a column below that (container query, so it also fits the 224 px
rail). One `role="img"` figure; its name lists the stages.

| Prop | Type | Notes |
|---|---|---|
| `active` | `'data' \| 'weights' \| 'ranking' \| 'results' \| 'robustness'` | Stage in the accent. |
| `methods` | `Partial<Record<stage, string>>` | Small line under a stage, e.g. `{ weights: 'CRITIC', ranking: 'TOPSIS' }`. |
| `weights` | `number[]` | Real weights for the bars (up to 6); without it a neutral shape. |
| `showRobustness` | `boolean` | Default `true`. |
| `labels` | `{ data, weights, ranking, results, robustness, ariaLabel? }` | |

Use: landing "How it works" (full width, with the example's weights), workbench rail or stage
header (`active={stage}`, `showRobustness={false}`).

## TopsisGeometry

TOPSIS as a picture, two views behind a small segmented control:

- **Distances** (default): every alternative at (D+, D−), the core's n-criteria distances, with
  dashed rays of constant closeness C = 0.25, 0.5, 0.75 through the origin (C = D− / (D+ + D−) is
  constant along each ray). Top left is best. One scale on both axes, so C = 0.5 is the diagonal.
  Exact for any number of criteria, so the picture always agrees with the ranking.
- **Two criteria**: the weighted normalized values of two criteria with A+, A− and the selected
  alternative's distance lines. Values grow right and up on both axes, also on a cost criterion
  (no reversed axis); the axis names say which direction is better ("Risk, lower is better"), so
  A+ sits where the data puts it. Exact for two criteria; with more, `projectionNote` is appended.

Point labels go through `placeLabels`: a label that would cover another label or dot, or sit about
as near to another dot as to its own, moves to a free side of its own dot (best ranked placed first,
the same for every selection). Below: a readout with the real D+, D− and C, then one caption line. Points are a radio group:
click, or Tab to it and use the arrow keys / Home / End. Table equivalent behind "Show as table"
(Distances: D+, D−, C; Two criteria: v on both axes, D+, D−, C, and rows for A+ and A−).

| Prop | Type | Notes |
|---|---|---|
| `problem` | `Problem` | Valid, numeric (render nothing when TOPSIS cannot run). |
| `weights` | `number[]` | |
| `axes` | `[number, number]` | Criterion indices of the two-criteria view; default the two largest weights. |
| `defaultView` | `'distances' \| 'criteria'` | Default `'distances'`. |
| `selected`, `onSelectedChange` | `number`, `(i) => void` | Controlled if `selected` is set; default the best ranked. |
| `format` | `(n) => string` | Readout, table and the ray labels (trailing zeros dropped). |
| `labels` | `{ title, caption, projectionNote, ideal, antiIdeal, dPlus, dMinus, formula, select, point(name, c), showTable, alternative, closeness, viewLabel, viewDistances, viewCriteria, axisDPlus, axisDMinus, isoC(c), planeCaption, higherBetter(name), lowerBetter(name) }` | Translations in `methods.page.idea.topsis.*`. `caption` is the two-criteria line, `planeCaption` the distances line. |

Use: `/methods/topsis` "The idea" (the Opricovic and Tzeng example, `weights=[0.5, 0.5]`, max 760 px);
workbench Ranking next to the closeness bars (current problem and weights).

## MethodThumb

A small decorative picture (132 x 72, `aria-hidden`, no text) for catalogue cards, drawn from real
values the page passes in: `kind: 'bars'` (`values`, `highlight`: CRITIC or equal weights),
`kind: 'shares'` (`even`, `uneven`: Entropy's shares of its most even and most uneven criterion, the second in the
accent) or `kind: 'plane'` (`points` from `distancePoints`, `highlight`: the TOPSIS distance plane), `kind: 'stack'`
(`rows`: SAW contributions per alternative in rank order, the first in the accent) or `kind: 'compromise'` (`points`,
`v`, `q`, `inSet`: VIKOR's plane with the DQ line, the compromise set in the accent) or `kind: 'diverging'` (`rows` of
`{ below, above }`: EDAS's SN left and SP right of the average line, in rank order, the first in the accent).

## CriticIdea

One row per criterion, read left to right: contrast (normalized values as dots on 0..1, with a
mean ± σ bracket) × conflict Σ(1 − ρ) (bar) → weight (bar with its value; the largest in the
accent). Column heads break onto two lines when narrow. Table: σ, conflict, information C, weight.

| Prop | Type | Notes |
|---|---|---|
| `problem` | `Problem` | Renders nothing when CRITIC cannot run. |
| `highlight` | `number` | Criterion in the accent; default the largest weight. |
| `format` | `(n) => string` | Weight labels and table (4 decimals). |
| `labels` | `{ title, caption?, contrast, conflict, weight, information, showTable, criterion }` | |

Use: `/methods/critic` "The idea" (Krishnan et al. 2021 example); workbench Weights stage when
the method is CRITIC.

## EntropyIdea

Two criteria side by side: the most even one (largest entropy e) on the left, the most uneven one (smallest e) on the
right. Each alternative's share p_ij is a bar, both panels on one scale, with the even share 1/m dashed (legend under
the panels). Under each panel: `e = ...`, `w = ...` and a weight bar on one scale; the heavier of the two in the
accent. Static: no motion, no step-through story yet. Numbers from `entropyParts(problem, params)` (the core's
Entropy steps of the chosen variant). Table: the shares per alternative, then rows for e and w.

| Prop | Type | Notes |
|---|---|---|
| `problem` | `Problem` | Renders nothing when Entropy cannot run (e.g. a negative value with raw-data shares). |
| `params` | `EntropyParams` | `{ normalization: 'sum' \| 'minmax' }`; default raw-data shares. |
| `format` | `(n) => string` | e, w and the table (4 decimals). |
| `labels` | `{ title, caption?, even, entropy, weight, share, showTable, alternative }` | Translations in `workbench.visual.entropy.*` and `methods.page.idea.entropy.*`. |

Use: `/methods/entropy` "The idea" (Zavadskas et al. 2017 example); workbench Weights stage when the method is
Entropy (current problem and option).

## SdIdea

One row per criterion, CriticIdea without the conflict column: the min-max values as dots on 0..1 with σ under them as
a ruler from 0 on the same scale, then `→` and the weight w = σ / Σσ as a bar (relative to the largest, so the bars
compare like the rulers) with its value; the largest weight in the accent. Static: no motion. Numbers from
`sdParts(problem)` (the core's SD steps). Table: σ and w per criterion.

| Prop | Type | Notes |
|---|---|---|
| `problem` | `Problem` | Renders nothing when SD cannot run. |
| `format` | `(n) => string` | w and the table (4 decimals). |
| `labels` | `{ title, caption?, spread, weight, weightHead?, showTable, criterion }` | Translations in `workbench.visual.sd.*` and `methods.page.idea.sd.*`. |

Use: `/methods/sd` "The idea" (Diakoulaki et al. 1995 example); workbench Weights stage when the method is SD.

## MerecIdea

One row per criterion, read left to right like SdIdea: what removing the criterion costs each alternative
(S_i - S'_ij) as the segments of one bar (stripDot fill, the background stroke draws the gaps), so the bar is the
removal effect E_j with its value, then `→` and the weight w = E / ΣE as a bar (relative to the largest) with its
value; the largest weight in the accent. Each segment has a `<title>` with the alternative and its drop. Static: no
motion. Numbers from `merecParts(problem)` (the core's MEREC steps). Table: E and w per criterion.

| Prop | Type | Notes |
|---|---|---|
| `problem` | `Problem` | Renders nothing when MEREC cannot run (a value <= 0). |
| `format` | `(n) => string` | E, w and the table (4 decimals). |
| `labels` | `{ title, caption?, drop, effect, weight, weightHead?, showTable, criterion }` | Translations in `workbench.visual.merec.*` and `methods.page.idea.merec.*`. |

Use: `/methods/merec` "The idea" (Keshavarz-Ghorabaee et al. 2021 example); workbench Weights stage when the method is MEREC.

## SawContributions

SAW as a picture: one horizontal stacked bar per alternative, in rank order. Each segment is one criterion's
contribution w_j r_ij (the core's `saw.weighted` step) and the bar ends at S_i, printed after it. Criteria keep one
colour each from `--data-cat-1..8` (tokens.css; validated for contrast and colour-vision deficiency in both themes),
in fixed order, never cycled: a ninth criterion and later share `--data-context` and one "others" legend entry.
Neighbouring segments are split by a 2 px gap in `--bg`. Hovering or focusing a segment names it in the readout and
fades the other criteria, so one criterion can be followed through every bar; segments are a roving tab stop (arrow
keys, Home / End, Escape). Name beside the bar from 380 px, above it below that. Static at first paint; new numbers
move rows and segments at `--dur-data`. Table: contributions per criterion and S, in rank order.

| Prop | Type | Notes |
|---|---|---|
| `problem` | `Problem` | Renders nothing when SAW cannot run (a value of 0 or less). |
| `weights` | `number[]` | |
| `params` | `SawParams` | `{ normalization: 'linearMax' \| 'sum' }`; default linear max. |
| `format` | `(n) => string` | S, contributions and table (4 decimals). |
| `labels` | `{ title, caption?, showTable, alternative, score, legend, others, segment(a, c, v, s), readout(a, c, v, s) }` | Translations in `workbench.visual.saw.*` and `methods.page.idea.saw.*`. |

Use: `/methods/saw` "The idea" (Podvezko 2011 example); workbench Ranking stage when the method is SAW.

## VikorIdea

VIKOR as a picture, two panels side by side from 600 px, stacked below. Left, the plane of Q's two terms: x =
(S − S*)/(S− − S*) (group utility), y = (R − R*)/(R− − R*) (largest regret), 0 best on both, so the ideal is the bottom
left corner (marked, named outside the square). Q = v x + (1 − v) y is constant along straight lines; the dashed accent
line is Q = Q(a′) + DQ and the `--accent-bg` tint below it holds the alternatives within DQ of the leader. A new v turns
the line (CSS `d`, `--dur-data`); the points do not move (S and R do not depend on v). Right, Q in rank order on a fixed
[0, 1] axis with the same band from Q(a′) to Q(a′) + DQ (its label under the bars); a Q of 0 keeps a 2 px bar. The
compromise set is in the accent, the rest context grey; names in the plane for up to 12 alternatives, else only the
set. Under both: C1 (acceptable advantage) and C2 (acceptable stability) as sentences with a check or a cross, then
the compromise. Not interactive; table: S, R, Q, in the compromise.

| Prop | Type | Notes |
|---|---|---|
| `problem` | `Problem` | Renders nothing when VIKOR cannot run. |
| `weights` | `number[]` | |
| `params` | `VikorParams` | `{ v }`, default 0.5. |
| `format` | `(n) => string` | S, R, Q, gap and DQ (4 decimals). |
| `labels` | `{ title, caption?, showTable, alternative, axisS, axisR, ideal, barsTitle, threshold, s, r, q, inSet, yes, no, c1(ok, a, b, gap, dq), c2(ok, a, byS, byR), result(names) }` | `useVikorLabels` (`src/app/workbench/vikorLabels.ts`) builds them from `workbench.visual.vikor.*`. |

Use: `/methods/vikor` "The idea" (Keshavarz Ghorabaee et al. 2015, set 1, where C1 fails; the page has its own v
slider); workbench Ranking stage when the method is VIKOR (it replaces the score chart).

## EdasIdea

EDAS as a picture: one diverging bar per alternative, in rank order, around a vertical line that stands for the
average solution. Each criterion's weighted distance above the average (w_j PDA_ij, the core's `edas.weightedPda`)
stacks to the right, its weighted distance below (w_j NDA_ij) to the left, in the criterion's SAW colour
(`--data-cat-1..8`, then the context grey); a criterion at the average keeps a zero-width segment on the line. One
scale on both sides, so the right part ends at SP_i and the left part at SN_i; the line sits where the longest SN ends.
AS closes each row on the right (the best in bold). Heads "← Below average: SN" and "Above average: SP →" sit against
the line, or shorten to "← SN" and "SP →" when either would be cut. Hover and keyboard as SawContributions (segments
in criterion order). Name beside the bar from 420 px, above it below that. Table: the signed weighted distance per
criterion (negative = below the average), SP, SN, AS.

| Prop | Type | Notes |
|---|---|---|
| `problem` | `Problem` | Renders nothing when EDAS cannot run (a varying column with an average of 0 or below). |
| `weights` | `number[]` | |
| `format` | `(n) => string` | AS, distances and table (4 decimals). |
| `labels` | `{ title, caption?, above, below, average, showTable, alternative, score, sp, sn, legend, others, segmentAbove/Below(a, c, v, s), segmentAt(a, c, s), readoutAbove/Below(a, c, v), readoutAt(a, c) }` | `useEdasLabels` (`src/app/workbench/edasLabels.ts`) builds them from `workbench.visual.edas.*`. |

Use: `/methods/edas` "The idea" (Keshavarz Ghorabaee et al. 2015, ten alternatives, set 1); workbench Ranking stage
when the method is EDAS (it replaces the score chart).

## CoprasBonus

COPRAS as a picture: one horizontal bar per alternative, in rank order, made of two parts: the benefit share S+_i
(`--data-cat-1`) and the cost bonus Q_i - S+_i = W_C (1 / S-_i) / Σ (1 / S-_k) (`--data-cat-5`, not red: the bonus is
good news). The bar ends at Q_i, printed after it; the utility degree N_i closes the row on the right. Hover and keyboard
as SawContributions (left / right: the two parts). Numbers from `coprasParts(problem, weights)` (the core's COPRAS
steps). Table: S+, bonus, Q, N per alternative, in rank order.

| Prop | Type | Notes |
|---|---|---|
| `problem` | `Problem` | Renders nothing when COPRAS cannot run (a value of 0 or less). |
| `weights` | `number[]` | |
| `format`, `formatPercent` | `(n) => string` | Q and its parts (4 decimals); N with its locale's percent sign (2 decimals). |
| `labels` | `{ title, caption?, showTable, alternative, score, utility, legend, benefit, bonus, segment(a, p, v, s, u), readout(a, p, v, s) }` | Translations in `workbench.visual.copras.*` and `methods.page.idea.copras.*`. |

Use: `/methods/copras` "The idea" (Özcan and Çelik 2021, Entropy weights from the data); workbench Ranking stage when
the method is COPRAS (it replaces the score chart).

## MarcosRows, MarcosSawLine

MARCOS as two pictures. `MarcosRows`: the table grows two imaginary rows, the ideal AI on top and the anti-ideal AAI at
the bottom (dashed outlines, `--text-3`, not data); between them one bar per alternative at its weighted total S_i, in
rank order, the first in the accent, S after the bar and f(K) closing the row on the right. Two dotted guides through
every row at S_aai and S_ai: K- = S / S_aai and K+ = S / S_ai are a bar's length against them. Hover or focus a bar
(up / down) for its K- and K+ in the readout. Table: AI, the alternatives, AAI with S, K-, K+, f(K).
`MarcosSawLine`: x = SAW (Linear) score from SAW itself, y = f(K), both 0 to 1 on one scale; every dot lies on the line
f(K) = c S through the origin (accent, labelled with c). Static. Numbers from `marcosParts(problem, weights)`.

| Prop | Type | Notes |
|---|---|---|
| `problem`, `weights` | `Problem`, `number[]` | Renders nothing when MARCOS cannot run (a value of 0 or less). |
| `format` | `(n, decimals) => string` | Active locale. |
| `labels` | `MarcosRowsLabels` / `MarcosSawLineLabels` | Translations in `workbench.visual.marcos.*` and `methods.page.idea.marcos.*`. |

Use: `/methods/marcos` "The idea" (Stević and Brković 2020, 23 drivers, both pictures); workbench Ranking stage when the
method is MARCOS (`MarcosRows`, it replaces the score chart).

## CocosoLenses

CoCoSo's three readings of the same two scores. One row per alternative in rank order, four bar columns: k_a (share of
the total), k_b (against the weakest), k_c (λ-mix against the best), each bar against its column's largest value, and
the combined k, the first in the accent, with k's value at the right. Hover or focus a k bar (up / down) for the four
numbers in the readout. Numbers from `cocoso.compute`; renders nothing when CoCoSo cannot rank (an all-worst row).
`WaspasLambda` with `method="cocoso"` draws k against λ beside it (λ moves only k_c).

Use: `/methods/cocoso` "The idea" (Yazdani et al. 2019, seven logistics providers, both pictures); workbench Ranking
stage when the method is CoCoSo (both pictures; they replace the score chart).

## ArasOptimalBar

ARAS as a picture: the optimal benchmark row A_0 at the top with a dashed bar reaching S_0 and a vertical dotted line
at S_0 dropping through every row, and one horizontal bar per alternative below in rank order showing its weighted sum
S_i against S_0 (the winner in the accent) with S_i printed after the bar and the utility degree K_i = S_i / S_0 on the
right. Hover or focus a row for its S_i, S_0, K_i and rank in the readout. Numbers from `arasParts(problem, weights)`.
Table: A_0 and the alternatives in rank order with S, S_0, K.

Use: `/methods/aras` "The idea" (Bakır and Atalık 2018, 11 airlines); workbench Ranking stage when the method is ARAS
(it replaces the score chart).

## StepFlow

Map of the worked calculation: numbered square nodes on a hairline, the active one in the accent,
each a button (`aria-current="step"`), inside a `<nav>`. Scrolls sideways in itself when narrow.
The node lists live with each method's step content (`flow` in `src/content/steps/<id>.ts`, read with
`stepFlow(methodId, stepKeys)` from `src/content/steps`). They give the node keys (the first core step key of each
node) and `stepKeys` (all core steps the node covers); add your labels:

```tsx
<StepFlow
  steps={topsis.flow.map((n) => ({ ...n, label: t(`flow.${n.key}`) }))}
  active={currentStepKey}                // any core step key, e.g. 'topsis.idealWorst' marks node 3
  onSelect={(key) => scrollToStep(key)}   // key = node key = first core step key
  labels={{ nav: t('calc.steps') }}
/>
```

Without `onSelect` the nodes are disabled buttons (a static picture). Use: above the workbench's
"Show the calculation" view; method pages' algorithm section could use it static.

## MethodGlyph

One mark per **method family** (`MethodFamily` from `src/content/types`, i.e. `method.family`),
in `currentColor`, Phosphor regular weight: objective weights `ChartBar`, subjective weights
`SlidersHorizontal`, distance `LineSegment`, utility a Σ drawn on Phosphor's 256 grid (stroke 16),
ratio `Divide`, outranking `ArrowsLeftRight`.

| Prop | Type | Notes |
|---|---|---|
| `family` | `MethodFamily` | Not the method id: `<MethodGlyph family={method.family} />`. |
| `size` | `number` | Default 20; 16 in dense lists, 32 to 48 for a page's idea block. |
| `label` | `string` | Accessible name; without it the glyph is `aria-hidden` (put it next to the visible family label). |

Use: catalogue cards next to the family label (20 px), landing catalogue preview, research-method
pages' "The idea" (large).

## EmptyMatrixHint

The empty Data stage: header row, direction row (↑ ↓), three empty rows, the first cell framed in
the accent with a caret. `role="img"`.

| Prop | Type | Notes |
|---|---|---|
| `label` | `string` | Accessible name. |
| `maxWidth` | `number` | Default 216 px; shrinks with the container. |

Use: the workbench's empty Data state, above "Load example" / "Start blank".

## RankLines

The Compare stage's chart: one column per method, one line per alternative across them (y = its
competition rank, ties share a y), the Borda rank at the right end after a dashed step. Where two
lines cross, two neighbouring methods order that pair differently; each crossing is a button
(`data-testid="crossing"`, `data-pair="i-k"`, roving tabindex, arrow keys / Home / End, Enter,
Space or click call `onSelectPair`). The selected pair keeps its colour, the rest step back.
A column with `ranking: null` shows its `reason` instead of points; a column `note` is a line
under the chart (`data-testid="<methodId>-note"`). Rows are 22 px, so 47 alternatives stay
readable; the width follows the container. Heads wider than a column step (six methods at 390 px) alternate between two lines. Table: alternatives by Borda rank, methods + Borda.

| Prop | Type | Notes |
|---|---|---|
| `columns` | `{ methodId, label, ranking: number[] \| null, note?, reason? }[]` | In the method order. |
| `borda` | `number[] \| null` | Borda ranks per alternative. |
| `names` | `string[]` | Alternative names. |
| `selected` / `onSelectPair` | `[number, number] \| null` / `(pair) => void` | Controlled. |
| `labels` | `Partial<RankLinesLabels>` | `title`, `description`, `showTable`, `alternative`, `borda`, `notRanked`, `crossing(a, b, from, to)`. |

## Pure helpers (`geometry.ts`, tested in `geometry.test.ts`)

`topsisProjection(problem, weights, axes?)`, `defaultAxes(weights)`, `fitPlot(...)` (equal-scale
screen scales, values growing right and up), `distancePoints(proj)`, `closenessAt(p)`,
`isoClosenessEnd(c, xMax, yMax)`, `fitDistancePlane(...)`, `placeLabels(...)`, `ISO_C_DEFAULT`, `linePath(...)`, `pointCss(...)`,
`planarDistance`, `criticParts(problem)`, `entropyParts(problem, params)`, `sdParts(problem)`, `merecParts(problem)`, `sawParts(problem, weights, params)`, `stackSegments(...)`, `vikorParts(problem, weights, params)`, `edasParts(problem, weights)`, `coprasParts(problem, weights)`, `marcosParts(problem, weights)`, `divergingSegments(above, below, center, px)`, `isoQSegment(v, q)`, `isoQRegion(v, q)`, `argMax`, `flowIndex`. The
tests check that A+ / A- and C equal the core and the published values (Opricovic and Tzeng 2004:
C = 0.762, 0.722, 0.238; Krishnan et al. 2021: σ and weights), that the distance plane places every
alternative at the core's (D+, D-) with C = y / (x + y) and the core's order, that each ray keeps its
C, that a cost axis is not reversed, and that both pictures use one scale on both axes.
