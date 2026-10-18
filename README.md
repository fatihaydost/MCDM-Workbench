<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/lockup-horizontal-dark.svg">
    <img src="docs/brand/lockup-horizontal.svg" alt="MCDM Workbench" height="48">
  </picture>
</h1>

A browser tool for multi-criteria decision analysis: weight criteria with CRITIC, Entropy, SD or MEREC, rank alternatives with TOPSIS, SAW, VIKOR, EDAS, WASPAS, COPRAS, MARCOS, CoCoSo or MABAC and read every intermediate step, in English or Turkish.

**Live demo:** https://fatihaydost.github.io/MCDM-Workbench/ (published once ten methods compute)

![Landing page with a live TOPSIS ranking of five smartphones and its CRITIC weights](docs/screenshots/landing.png)

## What it does

- Enter a decision matrix in a spreadsheet-like grid, paste it from Excel or import `.xlsx` / `.csv`, and mark each criterion as benefit or cost.
- Weights from CRITIC, Entropy (raw-data shares or min-max), SD (standard deviation of the min-max columns), MEREC (removal effect of each criterion, positive data only), equal weights or your own; ranking by TOPSIS (closeness C), SAW (weighted sum S, linear max or sum normalization, with each score drawn as its criteria's contributions) or VIKOR (compromise index Q with a v slider, group utility S against the largest regret R, the acceptable advantage and stability conditions and the compromise set) or EDAS (appraisal score AS from the weighted distance above and below the average solution, drawn as one diverging bar per alternative) or WASPAS (weighted sum and weighted product blended by a λ slider, with Q of every alternative drawn against λ) or COPRAS (relative significance Q from the benefit share S+ and a cost bonus that grows as the cost share S- shrinks, with the utility degree N in percent of the best, drawn as one two-part bar per alternative) or MARCOS (utility f(K) from the weighted total against an imaginary ideal and anti-ideal row, drawn between those two dashed rows; always the order of SAW with linear max, shown as one straight line and counted once in Compare) or CoCoSo (combined score k from a weighted sum S and a power sum P read three ways, drawn as the three readings and k side by side, with a λ slider and k drawn against λ; zeros and negative values allowed, an alternative worst on every criterion blocked by name) or MABAC (distance to border S: each criterion's distance above or below the border, the geometric mean of the alternatives, added up; drawn as one stick per criterion up or down from the border, with S beside it; always the order of a min-max weighted sum, shown as one straight line; zeros and negative values allowed).
- Shows the worked calculation step by step, with formulas and labelled matrices; copy any step as TSV or LaTeX, or download the whole calculation as `.xlsx`.
- Runs entirely in the browser: no sign-up, no server, nothing uploaded.

![Workbench results: ranking, criterion weights, correlation heatmap and the first step of the worked calculation](docs/screenshots/workbench-results.png)

## Verified against the literature

The test suite recomputes published examples and compares every printed digit:

| Method | Reference | What is compared | Tolerance |
|---|---|---|---|
| CRITIC | Krishnan et al. (2021), Symmetry 13(6):973, Tables 1, 2 and 5 | standard deviations and weights | ±0.00005 |
| Entropy | Zavadskas et al. (2017), Sustainability 9(5):702, Tables 4 and 8 (the paper prints the weights on permuted rows); min-max option: Krishnan et al. (2021), Tables 1, 2 and 5 | weights (min-max: also the normalized matrix) | ±0.0001 (min-max ±0.00005) |
| SD | Diakoulaki et al. (1995), Computers & OR 22(7):763, Table 1, Section 5 and Table 3 (the printed σ is the population SD); Mukhametzyanov (2021), DMAME 4(2):76, Tables 1, 2 and 4, four matrices with cost criteria | weights and standard deviations | ±0.0005 |
| MEREC | Keshavarz-Ghorabaee et al. (2021), Symmetry 13(4):525, Tables 2-4 and Steps 3-6 (illustrative) and Tables 5-6 (comparative); Dua et al. (2024), EUREKA: Physics and Engineering (2):131, Tables 8-9 and 12-13 | weights, normalized matrix, S, S′ and removal effects | ±0.00005 (comparative ±0.0005; S, S′, E ±0.005) |
| TOPSIS | Opricovic and Tzeng (2004), EJOR 156(2):445, Table 3, two unit variants | D+, D−, closeness and ranks | ±0.0005 |
| SAW | Podvezko (2011), Engineering Economics 22(2):134, Tables 1-3 (linear max; Table 2 misprints one Lithuania value, Table 3 follows the misprint) and 5-6 (sum); ranks of Keshavarz Ghorabaee et al. (2015) Table 7, Zavadskas et al. (2012) Table 2 and Vujičić et al. (2017) Tables 8a-8b | normalized matrices, scores and ranks | ±0.0005 |
| VIKOR | Opricovic and Tzeng (2004), EJOR 156(2):445, Table 3, two unit variants; ranks of Keshavarz Ghorabaee et al. (2015) Table 7, all seven weight sets (v = 0.5) | S, R, Q, ranks, C1, C2 and the compromise | ±0.0005 |
| EDAS | Keshavarz Ghorabaee et al. (2015), Informatica 26(3):435, Tables 1-3 (47 items; Table 2 is rounded to 3 and then 2 decimals, all 517 cells reproduced) and Table 7 (ranks, all seven weight sets); Aydın Ünal (2019) and Sarıhan and Aydın (2023), each with a printing error recorded | average, PDA, NDA, SP, SN, NSP, NSN, AS, classes and ranks | ±0.006 |
| WASPAS | Aytaç Adalı and Tuş Işık (2017), IREM 5(4):56, Tables 4-7 (supplier selection, all 55 scores of Table 7 over λ); Chakraborty and Zavadskas (2014), Informatica 25(1):1, Tables 13-15 (robots); Zavadskas et al. (2012) Table 2 (Table 1 misprints one a1 value, recorded) | normalized matrix, WSM, WPM, Q at every λ and ranks | ±0.0001 |
| COPRAS | Özcan and Çelik (2021), IJPME 9(2):81, Tables 1, 2, 10, 11 (cream separators, Entropy then COPRAS; the printed rank row swaps A2 and A3, the printed Q does not); Podvezko (2011) Tables 7-8 (two cost changes flip the ranks); Zavadskas et al. (2007) Tables 1-2 (S+ and S- only: the printed Q is S+ + S-, not the paper's own Eq. 5) | weighted shares, S+, S-, Q, N and ranks | ±0.0001 |
| MARCOS | Stević and Brković (2020), Logistics 4(1):4, Tables 2-5 (23 drivers, FUCOM weights as Table 4 applies them; the paper's Figure 2 swaps C3 and C4, which would move 9 ranks); Madenoğlu (2020), EBOR 2(2):99, Tables 3-7 (6 suppliers, 16 criteria, AHP weights) | S, K-, f(K), the reference totals and ranks; f(K) = c x SAW (linear max) on 300 random problems | ±0.001 |
| CoCoSo | Yazdani et al. (2019), Management Decision 57(9):2501, Tables I, III-VI (7 logistics providers, expert weights; the paper prints k rounded, 1.3 for 1.2987) and Tables X-XI (10 green suppliers); Akgül (2021), Ekonomi ve Finansal Araştırmalar Dergisi 3(2):71, Tables 4-12 (9 Turkish banks, CRITIC weights) | S, P, ka, kb, kc, k, ranks and the λ rank changes; shift and scale invariance, zero-weight and constant columns on 200 random problems | ±0.0015 |
| MABAC | Pamučar and Ćirović (2015), Expert Systems with Applications 42(6):3016, Tables 5, 7-12 (7 forklifts, 10 criteria, DEMATEL weights; the two Likert criteria coded 1-5); Biswas and Das (2018), Management Science Letters 8:121, Tables 2-7 (9 hybrid vehicles, Entropy weights, all 9 printed digits); Çelik (2020), İslam Ekonomisi ve Finansı Dergisi 6(2):311, Tables 3-12 (6 Turkish participation banks, CRITIC weights computed here) | G, Q, S and ranks; S = min-max weighted sum - B on 300 random problems; G finite at 500 alternatives | ±0.0001 |

CRITIC is also checked against the hand-solved spreadsheet from the original coursework (`legacy/CRITIC(2).xlsx`) and the full CRITIC + TOPSIS chain against the legacy Python code, both to 10⁻¹². Fixtures are in [`tests/fixtures/`](tests/fixtures).

## Methods

14 methods compute today (CRITIC, Entropy, SD, MEREC, equal weights, TOPSIS, SAW, VIKOR, EDAS, WASPAS, COPRAS, MARCOS, CoCoSo, MABAC) and 12 more are researched and documented, each with its own page: [methods catalogue](https://fatihaydost.github.io/MCDM-Workbench/methods).

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
