# Features: decision grid and charts

Two component families for the workbench. Both style themselves with their own `*.module.css`
that only reads tokens from `src/styles/tokens.css`; they do not depend on Tailwind or `src/ui`.
Neither has built-in strings: every visible text comes in through props (i18n stays in `src/i18n`).

`src/features/env.d.ts` references `vite/client` for CSS module typings.

## Decision grid (`src/features/grid`)

```ts
import { DecisionGrid, type GridProblem, type GridLabels, type GridError } from '../features/grid'
```

`DecisionGrid` is controlled. It edits a `GridProblem`, which is `Problem` from `src/core/types.ts`
with nullable cells (an empty cell is `null`, never 0):

```ts
type GridProblem = { alternatives: string[]; criteria: Criterion[]; matrix: (number | null)[][] }
```

| Prop | Type | Notes |
|---|---|---|
| `alternatives`, `criteria`, `matrix` | as above | Pass the arrays from the store. |
| `onChange` | `(next: GridProblem) => void` | Called with a new object on every edit, paste, undo and redo. |
| `parse` | `(text) => number \| null` | `(s) => parseLocaleNumber(s, lang)`. Null means "not a number". |
| `format` | `(n) => string` | Raw value as entered: `(n) => formatRaw(n, lang)`. |
| `labels` | `GridLabels` | All texts, see below. |
| `errors` | `GridError[]` | `{ row?, col?, message }` in data space (alternative i, criterion j). `row`+`col` marks a cell, `col` alone the criterion header, `row` alone the alternative name. |
| `pasteHeaders` | `'auto' \| 'none'` | Default `'auto'`: a text first row / column of a pasted block becomes names. |
| `maxHeight` | `number \| string` | Caps the height; the grid then scrolls vertically with sticky header rows. |
| `className` | `string` | On the root. |

Mapping validation issues (`validateProblem`) to grid errors:

```ts
const errors = issues
  .filter((x) => x.row !== undefined || x.col !== undefined)
  .map((x) => ({ row: x.row, col: x.col, message: t(`validation.${x.code}`, { value: x.value }) }))
```

(with `exactOptionalPropertyTypes`, drop the undefined keys or build the object conditionally.)

`GridLabels` (every key is required):

```ts
const labels: GridLabels = {
  grid: t('grid.name'),                    // "Decision matrix"
  alternative: t('grid.alternative'),      // corner header, "Alternative"
  direction: t('grid.direction'),          // label of the type row, "Direction"
  benefit: t('criterion.benefit'),         // shown as "↑ Benefit"
  cost: t('criterion.cost'),               // shown as "↓ Cost"
  switchDirection: t('grid.switchHint'),   // "Enter or Space opens the benefit or cost choice."
  addAlternative: t('grid.addAlternative'),
  addCriterion: t('grid.addCriterion'),
  deleteAlternative: t('grid.deleteAlternative'),  // acts on the focused row
  deleteCriterion: t('grid.deleteCriterion'),      // acts on the focused column
  undo: t('grid.undo'),
  redo: t('grid.redo'),
  notANumber: (text) => t('grid.notANumber', { text }),        // "\"abc\" is not a number."
  pastedWithNames: t('grid.pastedWithNames'),                  // "The first row and column were used as names."
  pasteAsValues: t('grid.pasteAsValues'),                      // "Paste as values instead"
  pasteSkipped: (count) => t('grid.pasteSkipped', { count }),  // "2 pasted cells were not numbers and were skipped."
  newAlternative: (n) => t('grid.newAlternative', { n }),      // "Alternative 4"
  newCriterion: (n) => t('grid.newCriterion', { n }),          // "Criterion 3"
}
```

Usage with the workbench store:

```tsx
<DecisionGrid
  alternatives={problem.alternatives}
  criteria={problem.criteria}
  matrix={problem.matrix}
  errors={errors}
  onChange={(next) => setProblem(next)}
  parse={(s) => parseLocaleNumber(s, lang)}
  format={(n) => formatRaw(n, lang)}
  labels={labels}
/>
```

Before computing, turn nulls into NaN (`matrix.map((r) => r.map((v) => v ?? Number.NaN))`) so
`validateProblem` reports `invalid-cell` with its position.

### Layout of the grid

Row 1 holds the criterion names, row 2 the direction (`↑ Benefit` / `↓ Cost` with a caret), then one row per alternative with its name in a sticky first column. The grid
scrolls sideways inside its own container. Numbers use the UI font with `tabular-nums`, right
aligned. An invalid cell gets a danger underline, `aria-invalid` and `aria-describedby` to its
message; the message of the focused cell is also shown under the grid.

A direction never changes on one click or one key. One click selects the cell; a click on the
selected cell or on its caret, or Enter / Space / F2 / Alt+ArrowDown, opens a two-item menu
(`menuitemradio`, Radix Popover): arrows move, Enter or Space picks, Esc closes without a change.
A change tints the cell for a second and is announced with the undo shortcut (`typeChanged`).

### Keyboard and clipboard

- Arrows, Tab / Shift+Tab (wrap across rows), Enter / Shift+Enter, Home / End, Ctrl+Home /
  Ctrl+End, PageUp / PageDown move. Shift+arrows extend the selection, Ctrl+A selects all.
  Tab on the last cell and Shift+Tab on the first leave the grid (no keyboard trap).
- Typing replaces the cell; F2 or double click edits it; Enter / Tab commit and move; Esc cancels.
  In a typing-started edit the arrows commit and move, in an F2 edit they move the caret.
  Text that is not a number keeps the editor open with the message.
- Delete / Backspace clear the selection (values to empty, names to empty; directions stay).
- Ctrl+Z undo, Ctrl+Y or Ctrl+Shift+Z redo, 100 steps. Changes from outside (load example,
  import) are undoable steps too. Undo hands back the earlier table object with its original
  `criteria` objects; the workbench store relies on that to bring weights and methods back.
- Copy / cut write TSV. Paste reads TSV (Excel, Sheets), semicolon CSV and comma CSV, quoted
  fields, `\r\n`. The block fills from the focused cell and grows the grid. Pasted on the
  top-left corner it replaces the whole table. A text first row / column becomes names, with a
  "Paste as values instead" action to undo that choice.

### Pure model (`grid/model.ts`)

Everything the component does is testable without a DOM (`grid/model.test.ts`):
`move`, `commandForKey`, `editCommandForKey`, `writeCell`, `clearRange`, `setType`, `toggleType`,
`insertAlternative` / `deleteAlternative` / `insertCriterion` / `deleteCriterion`, `ensureSize`,
`detectDelimiter`, `parseDelimited`, `parseClipboard`, `detectHeaders`, `applyPaste`,
`rangeToTsv`, `sameProblem`, and `createHistory` / `pushHistory` / `undo` / `redo`.
`parseClipboard`, `detectHeaders` and `applyPaste` are exported from the index for file import.

## Charts (`src/features/charts`)

```ts
import { BarChart, Heatmap } from '../features/charts'
```

Hand-written SVG, no library. Each chart is a `<figure>` with its title, the SVG
(`role="img"`), and the same data as a real table in a `<details>` ("Show as table") that the
figure and the SVG reference with `aria-describedby`. Width follows the container
(ResizeObserver); nothing animates except a 150 ms transform when values change (0 under
`prefers-reduced-motion`).

### BarChart

Horizontal bars, alternative names on the left, value printed after the bar end, no axis, no
legend. `highlight` draws one bar in `--data-accent`, the rest in `--data-context`. Negative values
grow left from a zero line.

```tsx
<BarChart
  title={t('results.closeness')}
  labels={problem.alternatives}
  values={result.scores}
  highlight={bestIndex}
  sort="desc"                       // 'desc' | 'asc' | 'none' (default: input order)
  format={(n) => formatNumber(n, lang, 4)}
  tableLabels={{ show: t('chart.showTable'), label: t('grid.alternative'), value: t('results.score') }}
/>
```

Optional: `domain` ([min, max], default includes 0), `description`, `className`.

### Heatmap

Matrix with the value in every cell and row / column labels. `scale="diverging"` (correlation,
default domain -1..1): `--data-negative` to the neutral `--data-heat-0` at 0 to `--data-heat-1`.
`scale="sequential"` (0..1 data such as a normalized matrix): `--data-heat-0` to `--data-heat-1`.
Fills are `color-mix()` of tokens (OKLCH; the negative arm mixes in OKLab so it does not pass
through purple). The value text switches to `--bg` on strong cells, with per-theme thresholds in
the stylesheet. Too many columns for the width: cells stop at 44 px and the figure scrolls
sideways.

```tsx
<Heatmap
  title={t('critic.correlation')}
  scale="diverging"
  rowLabels={names}
  colLabels={names}
  values={correlation}
  format={(n) => formatNumber(n, lang, 2)}
  tableLabels={{ show: t('chart.showTable'), corner: t('grid.criterion') }}
/>
```

Optional: `domain`, `description`, `className`.

### Pure helpers

`scale.ts`: `scaleLinear`, `niceTicks`, `niceDomain`, `tickStep`, `scaleBand`, `extent`,
`normalize`. `layout.ts`: `layoutBars`, `barOrder`, `layoutHeatmap`, `heatColor`,
`estimateTextWidth`, `truncate`. Tests in `charts/scale.test.ts`.
