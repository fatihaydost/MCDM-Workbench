# UI foundation

What the foundation pass built on top of `DESIGN.md` and `src/styles/tokens.css`, and how to use it.
Read DESIGN.md first; this file is the API sheet.

## Layout of `src/`

| Path | What |
|---|---|
| `src/core/` | Methods, validation, registry (not touched by the UI). |
| `src/styles/tokens.css` | Colour, radius, shadow, motion tokens (the only place values live). |
| `src/styles/app.css` | Tailwind v4 entry: maps tokens to utilities, base styles. |
| `src/styles/fonts.css` | Self-hosted IBM Plex Sans 400/500/600 and Mono 400/500, latin + latin-ext, woff2. |
| `src/i18n/` | i18next setup, `en.json`, `tr.json`, number formatting and parsing. |
| `src/ui/` | Primitives, one file each, barrel `src/ui/index.ts`. |
| `src/state/workbench.ts` | zustand store (persisted) and derived results. |
| `src/state/theme.ts` | Theme mode (system / light / dark). |
| `src/data/examples.ts` | Published example datasets with citations. |
| `src/app/` | `App.tsx` (router), `shell/` (TopBar, WorkbenchLayout), `routes/` (stubs), `dev/DevUi.tsx`. |
| `scripts/shot.mjs` | Screenshot tool (`pnpm shot`). |

## Styling rules in code

- Colours only through the token utilities: `bg-bg`, `bg-surface`, `bg-surface-2`, `border-line`,
  `border-line-strong`, `text-text`, `text-text-2`, `text-text-3`, `bg-accent`, `text-accent`,
  `bg-accent-bg`, `text-accent-fg`, `hover:bg-accent-hover`, `text-danger` / `bg-danger-bg`,
  `text-warning` / `bg-warning-bg`, `text-ok` / `bg-ok-bg`, `bg-overlay`, and the data colours
  `data-context`, `data-accent`, `data-heat-0`, `data-heat-1`, `data-negative` (for SVG use
  `fill-data-accent` or `var(--data-accent)`). Tailwind's palette is switched off (`--color-*: initial`),
  so `bg-blue-500`, `text-gray-600`, `bg-white` generate nothing.
- Radius: `rounded-control` (2 px: inputs, cells, buttons) and `rounded-float` (4 px: popovers, dialogs).
  `rounded`, `rounded-md`, `rounded-lg` generate nothing.
- Shadow: `shadow-float` only, for floating elements. Other shadow utilities generate nothing.
- Type scale is by pixel value: `text-12`, `text-13`, `text-14` (UI base), `text-16` (prose), `text-20`,
  `text-24`, `text-32`, `text-44` (landing H1 only). Line heights are set on the 4 px grid.
  Weights: `font-normal` 400, `font-medium` 500, `font-semibold` 600. `font-sans` Plex Sans, `font-mono`
  Plex Mono; there is no serif family.
- Numbers: add `num` (tabular figures) and right-align in tables. Plex Sans digits measured equal width
  by default (16 px: `1111` = `8888` = 40 px), `num` keeps it explicit.
- Motion: see [MOTION.md](MOTION.md) (when motion is allowed, the duration tokens, the `animate-*` keyframes of the
  floating layers). `transition-*` utilities use `--dur`; every token drops to 0 under `prefers-reduced-motion`.
- Focus: every focusable element gets the global `:focus-visible` ring (`--ring`: 2 px bg gap, 2 px accent).
  Do not add `outline-none` without a replacement.
- `dark:` exists (it follows `data-theme` and the system) but components should not need it: tokens
  already switch.

## Primitives (`import { ... } from '../ui'`)

All props are typed; optional props accept `undefined` (the repo uses `exactOptionalPropertyTypes`).
Native props pass through where the component wraps one element.

| Component | Key props | Notes |
|---|---|---|
| `Button` | `variant` primary / secondary (default) / ghost, `size` sm 28 / md 32, `icon`, `iconEnd` | `type="button"` default; `:active` moves 1 px. Copy is verb + object. |
| `buttonClasses({variant,size,className})` | | For `<Link>` that looks like a button. |
| `IconButton` | `aria-label` (required), `icon`, `size` sm 28 / md 32, `bordered` | Pair with `Tooltip` when needed. `iconButtonClasses()` for icon links. |
| `Field` | `label`, `hint`, `error`, `id`, `required`, `optionalLabel` | Label, hint, control, error. Passes `id`, `aria-describedby`, `aria-invalid` to its control through context (`useField`, `useFieldProps`). Give a fixed `id` when an ErrorSummary links to it. |
| `TextInput` | `controlSize` sm / md, `invalid` | Native input props. |
| `NumberInput` | `value: number \| null`, `onValueChange(value, {text, valid, ambiguous})`, `decimals` | Accepts `0,25` and `0.25` in both languages. While focused keeps the typed text; on blur re-formats (fixed `decimals`, or "as entered" when omitted). Invalid text stays and sets `aria-invalid`; the parent writes the message (`validation.notANumber`). |
| `Select` | `options: {value,label,disabled?}[]` or `<option>` children, `controlSize`, `invalid` | Native select. |
| `SegmentedControl<T>` | `value`, `onValueChange`, `options: {value,label,ariaLabel?,disabled?}[]`, `aria-label` (required), `size` sm / md, `fullWidth` | Radix toggle group, never empty. |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Radix props | Accent underline on the active tab. |
| `Tooltip` | `content`, `side`, `align`; one focusable child | `TooltipProvider` is mounted in `App`. |
| `Dialog`, `DialogTrigger`, `DialogClose`, `DialogContent` | `DialogContent`: `title` (required), `description`, `footer`, `width` sm 400 / md 560 / lg 720 | Scrim `--overlay`, close button, focus trap. Footer: secondary first, primary last. |
| `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverClose`, `PopoverAnchor` | Radix props | 288 px wide by default, `className` to change. |
| `DropdownMenu`, `...Trigger`, `...Content`, `...Item` (`icon`, `shortcut`), `...RadioGroup`, `...RadioItem`, `...Label`, `...Separator`, `...Group` | Radix props | Content aligns to the trigger's end by default. |
| `Table`, `THead`, `TBody`, `Tr`, `Th`, `Td` | `Table`: `density` compact 32 / regular 40, `stickyHeader` (default true), `maxHeight`, `containerClassName`. `Th`/`Td`: `numeric` (right, tabular), `mono`. `Th scope="row"` for row labels. `Tr selected` tints the row with `--accent-bg`. | The table sits in its own `overflow-auto` container (sideways scroll never moves the page). The sticky header sticks inside that container, so give `maxHeight` when it should scroll vertically. Horizontal hairlines only, hover row `--surface-2`. Inside a grid or flex item, give that item `min-w-0`, or the table's width pushes the page sideways. |
| `Formula` | `tex`, `display`, `align` left (default) / center | KaTeX with MathML. Bad TeX shows the raw source in mono, red, with the parser message as title. |
| `Notice` | `tone` info / warning / danger, `title`, `role` | Icon + text, tinted background, no side stripe. |
| `ErrorSummary` | `errors: {targetId, message}[]`, `title`, `autoFocus` (default true), `focusKey` | GOV.UK: focuses itself on mount (and when `focusKey` changes); each link focuses and scrolls to `#targetId`. Renders nothing for an empty list. |
| `Skeleton` | `width`, `height` | Static, no shimmer. Size it like the content. |
| `Kbd` | children | |
| `EmptyState` | `title`, `description`, `action`, `as` h2 / h3 | Left-aligned, no illustration. |
| `cn(...)` | | Joins class names. |

`/dev/ui` (dev server only, not in the production bundle) shows every primitive, the states (error,
empty, disabled) and both table densities.

## Shell

- `TopBar`: 48 px; wordmark "MCDM Workbench" ("MCDM" below 640 px) + subtitle (from 1024 px), Workbench and Methods links
  (`aria-current="page"`), TR/EN segmented control, theme menu (System / Light / Dark), GitHub link
  (from 640 px; the landing footer should carry the source link for phones). Skip link to `#main`.
- `WorkbenchLayout` (`src/app/shell/WorkbenchLayout.tsx`): props `stage`, `onStageChange`, `stageMeta`
  (optional short status under each rail item), `explanation` (panel content), `children` (main).
  Rail 224 px with the current stage marked by `bg-surface-2` and a 2 px accent line; at >= 1280 px a
  320 px explanation column on the right; below that a "Show explanation" button opens a bottom sheet;
  under 768 px the rail becomes a full-width segmented control. The stage heading (h1) is rendered by
  the layout. Each route renders `<main id="main">` (the layout does it for `/app`).
- Routes (`src/app/App.tsx`, wouter, base `import.meta.env.BASE_URL` without the trailing slash):
  `/` Landing, `/app` Workbench, `/methods`, `/methods/:id`, `/dev/ui` (dev only), anything else 404.
  Route components are stubs to be replaced.
- GitHub Pages: `base` is `/MCDM-Workbench/` for `build` and `preview`, `/` for dev. The build writes
  one `index.html` per static route (`/`, `/app/`, `/methods/`, `/methods/<id>/`) with its own title,
  description, canonical and og tags, so a deep link is an HTTP 200 page; `404.html` (bare app,
  "not found" title, `noindex`) is left for unknown addresses, plus `sitemap.xml`. The home page,
  `/methods` and every method page are prerendered (EN in `#root`, TR in a template;
  `src/app/prerender.tsx`, `vite.config.ts`); `main.tsx` loads that page's chunk (`preloadRoute`)
  before it replaces the HTML. `/app` is not prerendered (it shows the saved matrix) and preloads its
  chunk. Every copy preloads the Plex Sans faces of the first screen. `vite preview` answers like
  Pages (301 to the trailing slash, 404.html with HTTP 404).
- Method cards: lists read `src/content/methods/catalog.ts` (id, name, family, status, year); a page
  loads its own card with `loadMethod(id)` (`load.ts`, one chunk per method). KaTeX loads when an
  algorithm step is first opened.
- `index.html` has an inline script that applies the saved theme and language before first paint.

## Theme

`src/state/theme.ts`: `useThemeMode()` returns `[mode, setMode]`, mode `'system' | 'light' | 'dark'`.
`system` removes `data-theme` (tokens follow `prefers-color-scheme`); light and dark set it. Stored in
localStorage `kds.theme`.

## i18n

- Init: `initI18n()` in `main.tsx`. Language: localStorage `kds.lang`, else `navigator.language`
  (`tr*` gives Turkish), else English. `setLanguage(lang)` saves it and updates `<html lang>`.
  Hooks: `useTranslation()` from react-i18next (keys are type-checked against `en.json`),
  `useLang()` returns `[lang, setLang]`.
- One namespace, key tree:
  - `common`: wordmark, productName, documentTitle, `actions.*`, optional, loading, `notFound.*`, stub.
  - `nav`: main, skipToContent, home, workbench, methods, github, language, `theme.*`.
  - `landing`: title, lead, openWorkbench, methods.
  - `workbench`: stagesLabel, `stages.{data,weights,ranking,results}`, `empty.<stage>.*`,
    `explanation.*`, alternative(s), criterion / criteria, alternativeN / criterionN (`{{n}}`),
    `criterionType.{label,benefit,cost}` (`↑ Benefit` / `↓ Cost`), `weightMethod.*`, `rankingMethod.*`,
    `example.*`.
  - `methods`: title, lead, `columns.*`, `status.{available,research}`, `kind.{weighting,ranking}`,
    `names.*`, `fullNames.*`, notFound (`{{id}}`), backToCatalog.
  - `steps`: one line per core step key, exactly the key the core emits: `steps.critic.normalized`,
    `steps.topsis.closeness`, plus `steps.equal.weights` and `steps.manual.weights`.
  - `validation`: summaryTitle, notANumber, required, ambiguousNumber (`{{value}}`), and
    `codes.<ValidationCode>` for every core code, with `{{alternative}}`, `{{criterion}}`, `{{value}}`,
    `{{n}}`, `{{min}}`. Pass names and already formatted numbers.
  - `warnings`: `warnings.<MethodWarning.code>` (e.g. `warnings.critic.few-alternatives`).
  - A test (`tests/i18n.test.ts`) checks: same keys and same `{{vars}}` in both files, no em or en dash,
    no emoji, no empty strings, a few banned buzzwords, and that every core step key, warning code and
    validation code has a string. Add new strings to both files.
- Turkish copy addresses the reader as "siz" (owner decision, 29.09; short button labels stay in
  the plain imperative, "Çalışma alanını aç"), and uses "kriter", "fayda / maliyet", "ağırlık";
  "kütle" for mass (so it never collides with "ağırlık" = weight).
- Numbers (`src/i18n/number.ts`, re-exported from `src/i18n`):
  - `useNumberFormat(decimals = 4)` returns `{ lang, format(v, d?), formatRaw(v), parse(text), isAmbiguous(text) }`.
  - `formatNumber(v, lang, decimals)`: fixed decimals, grouping, `''` for null / NaN, never `-0`.
  - `formatRaw(v, lang)`: shortest digits, locale separator, no grouping (for raw input "as entered";
    round-trips through `parseLocaleNumber` in the same language).
  - `parseLocaleNumber(text, lang)`: accepts `0,25`, `0.25`, `1.234,5`, `1,234.5`, `1 234,5`, `−3,5`,
    `1e-3`, `,5`. Both separators present: the last one is the decimal. One kind repeated: grouping in
    threes. A single separator followed by exactly three digits after a short integer part (`1,234`,
    `12.500`) is ambiguous: the active language decides (TR reads `.` as grouping, EN reads `,` as
    grouping); `0,250` is never ambiguous. Everything else is `null`. Tests: `tests/number-format.test.ts`.

## Workbench store (`src/state/workbench.ts`)

```ts
type Stage = 'data' | 'weights' | 'ranking' | 'results'          // STAGES in order
type DraftProblem = { alternatives: string[]; criteria: Criterion[]; matrix: (number | null)[][] }
type WorkbenchData = {
  problem: DraftProblem              // raw input; null cell = empty, never read as 0
  weightMethod: 'critic' | 'equal' | 'manual'
  manualWeights: (number | null)[]   // one per criterion, matched to the criterion (not its column) by the actions
  rankingMethod: 'topsis'
  stage: Stage
  exampleId: string | null           // loaded example, cleared by the first data edit
}
```

- Hook: `useWorkbench(selector)` (zustand). Persisted to localStorage `kds.workbench.v1` (`version` 1;
  bump both when the stored shape changes). Falls back to memory when storage is blocked.
- Actions: `setStage`, `setProblem`, `loadExample(id, lang)` (criterion names in that language; sets
  `weightMethod: 'manual'` with the paper's weights when the example has them, otherwise `'critic'`),
  `startBlank(m, n, names?)`, `setCell(i, j, v)`, `setAlternativeName`, `setCriterion(j, patch)`,
  `addAlternative(name)`, `removeAlternative(i)`, `addCriterion(criterion)`, `removeCriterion(j)`,
  `setWeightMethod`, `setManualWeight(j, v)`, `setRankingMethod`, `reset`, `localizeExample(lang)` (an unchanged
  example's names follow a language switch).
- Manual weights follow their criterion through `setProblem` (`carryWeights`: same criterion object, one seen
  before, same name, then the same column only when the count is unchanged), so a grid delete never shifts them.
  `setProblem` with a table that was on screen as an example or import (the grid's undo) restores the methods
  and weights it had then. An import matches weights by name only.
- Derived (pure functions, plus memoized hooks):
  - `computeValidation(problem)` / `useValidation()`: core `validateProblem` issues (empty cells arrive
    as NaN, so they come back as `invalid-cell` with row and col).
  - `computeWeights(data)` / `useWeights()`: `{ value: WeightingResult | null, issues }`. CRITIC from the
    core; equal = 1/n (computed here, step key `equal.weights`); manual = entered weights checked with
    `validateWeights` (step key `manual.weights`).
  - `computeRanking(data, weights?)` / `useRanking()`: `{ value: RankingResult | null, issues }`;
    issues merge problem, method requirements and weight issues.
  - `isEmptyProblem(problem)`.
- Tests: `tests/workbench-state.test.ts` (CRITIC and TOPSIS through the store reproduce the published
  numbers; empty cells and bad weights block with positions).

## Example datasets (`src/data/examples.ts`)

`examples` (readonly), `getExample(id)`, `formatCitation(c)`, `shortCitation(c, lang)`
("Krishnan et al. (2021)" / "Krishnan vd. (2021)"), `doiUrl(doi)`. Each dataset: `id`, `name` and
`summary` in both languages, `referenceFor` (method ids), `citation` {authors, year, title, venue, doi,
tables}, `alternatives`, `criteria` (localized names + type), `matrix`, optional `weights`, and
`published` outputs as printed (label = step key, decimals as in the paper).

| id | Source | Shape | For |
|---|---|---|---|
| `krishnan-2021-smartphones` | Krishnan et al. 2021, Symmetry 13(6) 973, doi:10.3390/sym13060973, Tables 1, 2, 5 | 5 x 5 | CRITIC |
| `opricovic-tzeng-2004-f` | Opricovic and Tzeng 2004, EJOR 156(2) 445-455, doi:10.1016/S0377-2217(03)00020-1, Tables 1 to 3, problem f | 3 x 2, w = 0.5, 0.5 | TOPSIS |
| `opricovic-tzeng-2004-phi` | same paper, problem φ (same data in other units, ranking reverses) | 3 x 2 | TOPSIS |

The numbers equal the test fixtures in `tests/fixtures/` (checked by a test). No invented data.

## Screenshot tool

```
pnpm shot <route...> [--theme light|dark|both] [--width 1440[,390]] [--lang en|tr]
                     [--height 900] [--viewport] [--preview] [--out path]
pnpm shot /app                                     # .shots/app-light-1440.png
pnpm shot / /app /dev/ui --theme both --width 1440,390
pnpm shot /app --lang tr --width 390 --viewport --out .shots/app-tr.png
pnpm build && pnpm shot /methods --preview         # the production build under /MCDM-Workbench/
```

It starts a Vite dev server (or `vite preview` with `--preview`) on a free port, sets the theme and
language in localStorage the way a user choice would, waits for `#main`, network idle and fonts, takes a
full-page shot (or the first screen with `--viewport`) and stops the server. Console errors are printed.
Output goes to `.shots/` (gitignored). Chromium comes from Playwright (`pnpm exec playwright install chromium`
if the revision changes).

## Checks

`pnpm typecheck && pnpm test && pnpm build`. Vitest runs `tests/**/*.test.ts` and `src/**/*.test.ts`.
Routes are split with `React.lazy`: the entry (React, Radix, i18next, both translations) is about
370 kB; the workbench, each method card, KaTeX and SheetJS are chunks of their own.
