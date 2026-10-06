# Design spec

**Design read:** an analysis instrument for researchers, engineers and consultants (and for the recruiter
who opens it to judge craft), in an instrument-like, technical-report language: quiet chrome, dense and
exact numbers, one signature element (the worked calculation). Leaning toward Tailwind v4 tokens, Radix
primitives, IBM Plex Sans / Plex Mono and KaTeX.

The product is a tool, not a campaign. Everything that is not data, input or explanation is quiet.
Boldness is spent in one place: the step-by-step calculation that reads like a worked example in a
paper appendix.

## Dials

| Surface | Variance | Motion | Density |
|---|---|---|---|
| Landing and method pages | 5 | 3 | 5 |
| Workbench | 2 | 2 | 7 |

Motion exists only for state change (result updated, row added, panel opened, a data mark moving to its new
place): 100-320 ms from the duration tokens, `cubic-bezier(0.2, 0, 0, 1)`, disabled under `prefers-reduced-motion`.
No entry fades, no staggers, no count-up numbers, no scroll reveal. The full contract (when, tokens, rules) is
[MOTION.md](MOTION.md).

## Tokens

All colour lives in `src/styles/tokens.css` as OKLCH custom properties. Components never contain hex
or Tailwind palette names (`bg-blue-500` is a bug). Light and dark are the same token names.

- **Neutrals:** cool, near-achromatic grey (chroma 0.004-0.008, hue ~250). Not cream, not pure white,
  not pure black.
  - `--bg` page, `--surface` panels and inputs, `--surface-2` table header / subtle fill,
    `--line` hairlines, `--line-strong` input borders, `--text`, `--text-2` secondary, `--text-3` tertiary
    (still >= 4.5:1 on `--bg` for any text it carries).
- **Accent (one):** petrol ink, `oklch(0.47 0.08 218)` in light, `oklch(0.74 0.09 212)` in dark. Used for
  primary action, focus ring, selection, the current step and the highlighted alternative in charts.
  Nothing else is accent-coloured.
- **Status:** `--danger`, `--warning`, `--ok` with a matching `-bg` tint. Used only for validation and
  method warnings, always with text, never as decorative dots.
- **Data colour is a separate system** (`--data-*`): context grey for the rest, accent for the selected
  or best alternative, a single-hue lightness ramp for unsigned heatmaps (normalized matrix), and a diverging ramp for signed
  data (correlation): muted red for negative, neutral at zero, petrol for positive. The red is kept low in
  chroma so it reads as data, not as an accent. A categorical set (`--data-cat-1..8`) gives one colour per
  criterion, in fixed order and never cycled (a ninth falls back to context grey), only where the parts of a mark
  carry a criterion's identity (SAW's stacked contributions, always with a legend and a table); single-series charts
  stay context grey plus the accent. It is validated in both themes for contrast and colour-vision deficiency (values
  and checks in `tokens.css`).
  No library default palettes.

## Type

- **IBM Plex Sans** for UI and prose (strong Turkish coverage, real tabular figures),
  **IBM Plex Mono** for matrix cells in the worked calculation and for code-ish values. Self-hosted via
  `@fontsource`, `font-display: swap`. No Inter, no Geist, no serif anywhere in the app.
- Scale (px): 12 / 13 / 14 (UI base) / 16 (prose base) / 20 / 24 / 32 / 44 (landing H1 only).
  Weights 400, 500, 600. Headlines are sentence case, never Title Case, never gradient.
- **Every number** uses `font-variant-numeric: tabular-nums`, is right-aligned in tables, and has a fixed
  number of decimals per column (weights 4, scores 4, raw input as entered). Numbers are formatted with
  `Intl.NumberFormat` for the active locale (TR `0,2345`, EN `0.2345`); input accepts both.
- Formulas are rendered with KaTeX, never as images or plain text approximations.

## Shape and space

- 4 px base grid. Radius: 2 px for inputs, cells and buttons, 4 px for popovers and dialogs. Nothing else
  is rounded. No pills except the TR/EN segmented control, which is a 2 px segmented control too.
- No shadows except on elements that float (menu, popover, dialog, toast): one tinted shadow token.
- No cards as decoration. Group with space and hairlines. No card inside card, no coloured side stripe.
- Tables: horizontal hairlines only, no vertical rules, no zebra, sticky header, row hover in `--surface-2`,
  two densities (32 px and 40 px rows).

## Layout

- **Workbench (`/app`):** top bar 48 px (wordmark, language, theme, GitHub). Left rail 224 px listing the
  four stages by name: Data, Weights, Ranking, Results (no "Step 1" labels). Main area is the widest
  column and holds the grid or table. An explanation panel (method notes, formula, sources) opens on the
  right at >= 1280 px and as a bottom sheet below that. Under 768 px the rail becomes a top segmented
  control and the grid scrolls horizontally inside its own container, never the page.
- **Landing (`/`):** one screen hero, left-aligned: headline, one sentence, primary action "Open workbench"
  and secondary "Methods". The right side is a **real, running component**: the Results table computed
  live from the bundled example dataset, not a screenshot and not a div mock. A slider under the table moves
  the weight of price (the others keep their proportions), and the rows slide to their new ranks: the one
  idea of the tool, that the result depends on the weights, in one gesture. Below: how it works (a
  diagram of the actual pipeline, data to weights to ranking), the methods catalogue with honest status
  (available / in research), and "verified against the literature" listing each method's reference paper
  and tolerance, taken from the test fixtures. Footer: source, author, licence. No logo wall, no
  testimonials, no metrics, no pricing.
- **Method pages (`/methods/:id`):** the research card rendered for users: what it does, when to use and
  when not, inputs, the algorithm as numbered formulas, commonly combined with, pitfalls, the reference
  example with a button to open it in the workbench, sources with DOI links.

## Signature element: the worked calculation

Every method result has a "Show the calculation" view built from `result.steps`. Each step is one block:

1. a plain one-line description of what the step does (i18n, from the step key),
2. the formula in KaTeX with the symbols used in the matrix below,
3. the matrix or vector, in Plex Mono, tabular, with row and column labels from the problem,
4. an affordance to copy the block as TSV or LaTeX.

The current step is marked with the accent on its left hairline and number. Hovering a cell highlights
its row and column labels. This is the one place where the design is allowed to be proud.

## Data entry

The decision matrix is a spreadsheet-like grid, not a form of cards:

- arrow keys, Tab, Shift+Tab and Enter navigate; typing replaces, F2 or double click edits;
- pasting a block copied from Excel or Sheets fills cells from the focused one and grows the grid;
- the criterion header holds the name and a benefit / cost control written as text (`↑ Benefit`,
  `↓ Cost`), not an icon alone;
- import `.xlsx` / `.csv` (semicolon or comma), export the full calculation to `.xlsx`;
- "Load example" loads a published dataset with its citation shown.

## States

Every screen draws four states: empty (says what to do, offers the example), loading (layout-shaped
skeleton, no spinner, no layout shift), error, and filled. Validation follows the GOV.UK pattern: the
message next to the cell or field, plus an error summary at the top of the stage that links to each
problem and takes focus. Messages are specific and fixable: "Weights sum to 0.950, they must sum to 1."

## Copy

**Less text, more seeing (owner review, 29.09).** Every section is a short headline, at most one
sentence, then a visual or the real component. Details live behind a disclosure, never on the page by
default. Method pages open with a picture of the method's idea before any formula. Test for every
screen: can someone get the point in five seconds without reading a paragraph?

Plain, specific, equal quality in Turkish and English. Buttons are verb plus object ("Calculate ranking",
"Download .xlsx"). No buzzwords (unlock, seamless, powerful, elevate), no emoji, no em dash or en dash
anywhere visible, no fake numbers. Every number on the site comes from a computation or a cited source.

## Banned patterns

Named explicitly because naming them works better than "avoid generic design" (Anthropic's Opus 5.5
prompting guide, "Frontend design defaults", and the AI-slop research behind this spec):

- purple or indigo gradients, Tailwind default blue, gradient text, glow, glassmorphism;
- cream or off-white "paper" backgrounds, serif display headlines, an italic accent word in a headline,
  terracotta or acid-green accents (the 2026 escape-from-purple defaults);
- centered hero with a pill badge above it, three equal feature cards, bento grids as filler;
- "01 / 02 / 03" section numbers, small uppercase monospace eyebrows over every section, pill buttons;
- `rounded-2xl` everywhere, shadow on everything, card inside card, coloured side stripe on a card;
- emoji, Sparkles / Zap / Shield icon clichés, decorative status dots;
- fake metrics, testimonials, logo walls, animated counters, placeholder names;
- library default chart colours, centered or proportional numbers in tables, full grid or zebra tables.

## Accessibility

Visible `:focus-visible` ring (2 px accent, 2 px offset) on everything interactive; the whole flow works
by keyboard; text contrast >= 4.5:1, chart marks >= 3:1; every chart has a table equivalent; light and
dark both tested; `lang` attribute follows the selected language.

## Stack

Vite, React 19, TypeScript, Tailwind v4 (`@tailwindcss/vite`), Radix primitives (dialog, popover,
tabs, toggle group, tooltip, dropdown menu), `@phosphor-icons/react` (one family, regular weight),
i18next + react-i18next, KaTeX, SheetJS, zustand (workbench state, persisted to localStorage), wouter
(routing with a base path for GitHub Pages). Charts are small hand-written SVG components (bar, dot,
heatmap) so they follow the data colour system exactly; no chart library in v1.
