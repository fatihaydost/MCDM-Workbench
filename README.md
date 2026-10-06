<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/lockup-horizontal-dark.svg">
    <img src="docs/brand/lockup-horizontal.svg" alt="MCDM Workbench" height="48">
  </picture>
</h1>

A browser tool for multi-criteria decision analysis: weight criteria with CRITIC or Entropy, rank alternatives with TOPSIS or SAW and read every intermediate step, in English or Turkish.

**Live demo:** https://fatihaydost.github.io/kds-topsis-critic/

![Landing page with a live TOPSIS ranking of five smartphones and its CRITIC weights](docs/screenshots/landing.png)

## What it does

- Enter a decision matrix in a spreadsheet-like grid, paste it from Excel or import `.xlsx` / `.csv`, and mark each criterion as benefit or cost.
- Weights from CRITIC, Entropy (raw-data shares or min-max), equal weights or your own; ranking by TOPSIS (closeness C) or SAW (weighted sum S, linear max or sum normalization, with each score drawn as its criteria's contributions).
- Shows the worked calculation step by step, with formulas and labelled matrices; copy any step as TSV or LaTeX, or download the whole calculation as `.xlsx`.
- Runs entirely in the browser: no sign-up, no server, nothing uploaded.

![Workbench results: ranking, criterion weights, correlation heatmap and the first step of the worked calculation](docs/screenshots/workbench-results.png)

## Verified against the literature

The test suite recomputes published examples and compares every printed digit:

| Method | Reference | What is compared | Tolerance |
|---|---|---|---|
| CRITIC | Krishnan et al. (2021), Symmetry 13(6):973, Tables 1, 2 and 5 | standard deviations and weights | ±0.00005 |
| Entropy | Zavadskas et al. (2017), Sustainability 9(5):702, Tables 4 and 8 (the paper prints the weights on permuted rows); min-max option: Krishnan et al. (2021), Tables 1, 2 and 5 | weights (min-max: also the normalized matrix) | ±0.0001 (min-max ±0.00005) |
| TOPSIS | Opricovic and Tzeng (2004), EJOR 156(2):445, Table 3, two unit variants | D+, D−, closeness and ranks | ±0.0005 |
| SAW | Podvezko (2011), Engineering Economics 22(2):134, Tables 1-3 (linear max; Table 2 misprints one Lithuania value, Table 3 follows the misprint) and 5-6 (sum); ranks of Keshavarz Ghorabaee et al. (2015) Table 7, Zavadskas et al. (2012) Table 2 and Vujičić et al. (2017) Tables 8a-8b | normalized matrices, scores and ranks | ±0.0005 |

CRITIC is also checked against the hand-solved spreadsheet from the original coursework (`legacy/CRITIC(2).xlsx`) and the full CRITIC + TOPSIS chain against the legacy Python code, both to 10⁻¹². Fixtures are in [`tests/fixtures/`](tests/fixtures).

## Methods

5 methods compute today (CRITIC, Entropy, equal weights, TOPSIS, SAW) and 21 more are researched and documented, each with its own page: [methods catalogue](https://fatihaydost.github.io/kds-topsis-critic/methods).

![TOPSIS method page: an interactive distance diagram, when to use it and the algorithm](docs/screenshots/method-topsis.png)

## Tech

React 19, TypeScript, Vite, Tailwind CSS 4, Radix UI, KaTeX, SheetJS, i18next; Vitest and Playwright; static build on GitHub Pages.

## Run locally

Needs Node 24 or newer and pnpm.

```sh
pnpm i
pnpm dev      # http://localhost:5173
pnpm test     # unit tests
pnpm e2e      # Playwright end-to-end tests
```

## Docs

- [Design notes](docs/design/DESIGN.md)
- [Method research](docs/research/)

## Project history

Started as a Flask coursework app for CRITIC and TOPSIS; that version is kept unchanged in [`legacy/`](legacy).

## License

[MIT](LICENSE)
