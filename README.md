<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/lockup-horizontal-dark.svg">
    <img src="docs/brand/lockup-horizontal.svg" alt="MCDM Workbench" height="48">
  </picture>
</h1>

<p>
  <strong>English</strong> · <a href="README.tr.md">Türkçe</a>
  &nbsp;|&nbsp;
  <strong>Live app:</strong> <a href="https://fatihaydost.github.io/MCDM-Workbench/">fatihaydost.github.io/MCDM-Workbench</a>
  &nbsp;|&nbsp;
  <strong>Methods catalogue:</strong> <a href="https://fatihaydost.github.io/MCDM-Workbench/methods">/methods</a>
</p>

A client-side workbench for **multi-criteria decision analysis (MCDM / MCDA)**: weight criteria with **11 objective and subjective methods** (CRITIC, Entropy, SD, MEREC, LOPCOW, CILOS, Equal, BWM, AHP, ROC, SWARA or your own weights), rank alternatives with **15 ranking methods** (TOPSIS, SAW, VIKOR, EDAS, WASPAS, COPRAS, MARCOS, CoCoSo, MABAC, MOORA, ARAS, CODAS, PROMETHEE II, ELECTRE I, ELECTRE III), test robustness with weight sweeps and Monte Carlo simulation, compare all rankings side by side, and inspect every intermediate matrix and formula in **English** or **Turkish**.

![Landing page with a live TOPSIS ranking of five smartphones, pipeline overview, and the 26-method catalogue](docs/screenshots/landing.png)

## What it does

- **1. Data:** Enter a decision matrix in a spreadsheet grid, paste directly from Excel, import `.xlsx` / `.csv`, or load one of the 25 published reference examples. Mark each criterion as benefit (`↑`) or cost (`↓`).
- **2. Weights (11 methods + manual):** Compute objective weights from the matrix (**CRITIC**, **Entropy**, **SD**, **MEREC**, **LOPCOW**, **CILOS**, **Equal weights**), elicit subjective weights from structured judgements (**BWM**, **AHP**, **ROC / RS / RR**, **SWARA**), or enter weights by hand.
- **3. Ranking (15 methods):** Rank alternatives with distance-based (**TOPSIS**, **VIKOR**, **EDAS**, **MABAC**, **CODAS**), utility-based (**SAW**, **COPRAS**, **ARAS**, **WASPAS**, **CoCoSo**, **MARCOS**), ratio-based (**MOORA**), or outranking (**PROMETHEE II**, **ELECTRE I**, **ELECTRE III**) methods, each with an interactive geometric diagram of your own numbers.
- **4. Results & worked calculation:** Inspect the final ranking, criterion weights, inter-criterion correlation heatmap, and every step of the calculation with KaTeX formulas and labelled matrices. Copy any step as **TSV** or **LaTeX**, or export the entire multi-sheet calculation as `.xlsx` or `.csv`.
- **5. Robustness & sensitivity:** Sweep any criterion's weight from `0` to `1` to see exact rank-reversal crossover points, perturb all weights (`±5%`, `±10%`, `±20%`), run **1,000-trial Dirichlet Monte Carlo** simulations for rank acceptability, and test leave-one-criterion-out stability in a background Web Worker.
- **6. Multi-method comparison:** Run all compatible ranking methods on your matrix and weights simultaneously, inspect **Spearman ρ** and **Kendall τ** pairwise rank correlations, **Kendall's W** concordance, Borda consensus ranks, and method-by-method explanations of why two alternatives swap places.
- **100% private & in-browser:** No sign-up, no server, no telemetry; your data never leaves your browser.

![Workbench results: ranking, criterion weights, correlation heatmap and the first step of the worked calculation](docs/screenshots/workbench-results.png)

### Multi-method comparison & robustness

Compare how all 15 ranking methods order your alternatives, where rank lines cross, and why two methods disagree on a pair:

![Workbench Compare stage: rank lines across 14 methods, Kendall's W agreement, pairwise disagreement breakdown, and Borda consensus matrix](docs/screenshots/workbench-compare.png)

Stress-test the winning alternative against weight shifts, uniform perturbations, Monte Carlo weight sampling, and criterion removal:

![Workbench Robustness stage: one-at-a-time weight sensitivity sweep and Monte Carlo rank acceptability matrix](docs/screenshots/workbench-robustness.png)

## Methods (26 / 26)

All **26 methods** compute in the browser and have a dedicated reference page with an interactive step-by-step illustration, formulas, pitfalls, compatible method pairs, and a decision tree guide at [`/methods`](https://fatihaydost.github.io/MCDM-Workbench/methods):

| Family | Method | Origin | What it computes |
|---|---|---|---|
| **Objective weighting** | **CRITIC** | Diakoulaki et al. (1995) | Weights from min-max contrast ($\sigma_j$) times inter-criterion conflict $\sum_k (1 - r_{jk})$ |
| **Objective weighting** | **Entropy** | Shannon (1948) / Zeleny (1982) | Weights from Shannon entropy diversification $1 - e_j$ (sum shares or min-max) |
| **Objective weighting** | **SD** | Diakoulaki et al. (1995) | Weights proportional to the sample standard deviation of min-max normalized columns |
| **Objective weighting** | **MEREC** | Keshavarz-Ghorabaee et al. (2021) | Weights from the logarithmic performance drop when each criterion is removed |
| **Objective weighting** | **LOPCOW** | Ecer & Pamucar (2022) | Weights from the log ratio of root-mean-square to sample standard deviation |
| **Objective weighting** | **CILOS** | Zavadskas & Podvezko (2016) | Weights solving the homogeneous impact-loss linear system $F w = 0$ |
| **Objective weighting** | **Equal weights** | Laplace | Baseline $w_j = 1 / n$ for every criterion |
| **Subjective weighting** | **BWM** | Rezaei (2015, 2016) | Closed-form Linear Best-Worst Method from $2n - 3$ comparisons with input-based CR |
| **Subjective weighting** | **AHP** | Saaty (1977, 1980) | Principal eigenvector & geometric mean priorities from pairwise ratios with Saaty's CR |
| **Subjective weighting** | **ROC** | Barron & Barrett (1996) | Cardinal weights from criterion importance ranks (ROC centroid, Rank Sum, Rank Reciprocal) |
| **Subjective weighting** | **SWARA** | Keršulienė et al. (2010) | Step-wise weight assessment chaining comparative importance ratios $k_j = 1 + s_j$ |
| **Distance-based ranking** | **TOPSIS** | Hwang & Yoon (1981) | Relative closeness $C_i = D_i^- / (D_i^+ + D_i^-)$ to Euclidean ideal and anti-ideal |
| **Distance-based ranking** | **VIKOR** | Opricovic (1998) | Compromise index $Q_i$ balancing group utility $S_i$ and individual regret $R_i$, with $C_1, C_2$ checks |
| **Distance-based ranking** | **EDAS** | Keshavarz Ghorabaee et al. (2015) | Appraisal score from weighted positive ($PDA$) and negative ($NDA$) distances from the mean |
| **Distance-based ranking** | **MABAC** | Pamučar & Ćirović (2015) | Signed distance $S_i$ to the geometric-mean border approximation area $G_j$ |
| **Distance-based ranking** | **CODAS** | Keshavarz Ghorabaee et al. (2016) | Pairwise Euclidean distance $E_i$ plus $\tau$-gated Taxicab distance $T_i$ from the negative-ideal |
| **Utility-based ranking** | **SAW** | Churchman & Ackoff (1954) | Weighted sum $S_i$ under linear-max or column-sum normalization |
| **Utility-based ranking** | **WASPAS** | Zavadskas et al. (2012) | $\lambda$-blend of Weighted Sum ($Q^{(1)}$) and Weighted Product ($Q^{(2)}$) with a live $\lambda$ sweep |
| **Utility-based ranking** | **COPRAS** | Zavadskas et al. (1994) | Benefit share $S_i^+$ plus inverse-cost share bonus $S_i^-$, reported with utility degree $N_i$ |
| **Utility-based ranking** | **MARCOS** | Stević et al. (2020) | Utility function $f(K_i)$ measured against extended ideal ($AI$) and anti-ideal ($AAI$) rows |
| **Utility-based ranking** | **CoCoSo** | Yazdani et al. (2019) | Combined compromise score $k_i$ from three appraisal readings ($k_{ia}, k_{ib}, k_{ic}$) of $S_i$ and $P_i$ |
| **Utility-based ranking** | **ARAS** | Zavadskas & Turskis (2010) | Optimality ratio $K_i = S_i / S_0$ against a prepended optimal alternative $A_0$ |
| **Ratio-based ranking** | **MOORA** | Brauers & Zavadskas (2006) | Vector-normalized benefit sum minus cost sum $y_i = S_i^+ - S_i^-$ |
| **Outranking** | **PROMETHEE II** | Brans & Vincke (1985) | Unicriterion preference functions (Linear, Usual, Level, Gaussian) and net outranking flow $\phi$ |
| **Outranking** | **ELECTRE I** | Roy (1968) | Concordance majority $C \ge \hat{c}$, discordance veto $D \le \hat{d}$, SCC condensation and outranking kernel |
| **Outranking** | **ELECTRE III** | Roy (1978) | Pseudo-criteria ($q, p, v$), fuzzy credibility matrix $\sigma(a,b)$, and descending/ascending distillation |

![Methods catalogue and interactive method-selection decision tree](docs/screenshots/methods-catalog.png)

![TOPSIS method page: an interactive distance diagram, step-through guide, when to use it and the algorithm](docs/screenshots/method-topsis.png)

## Verified against the literature

The automated test suite (**57 test files, 1,732 unit tests**) recomputes published examples from peer-reviewed papers and checks every printed digit:

| Method | Reference | What is compared | Tolerance |
|---|---|---|---|
| CRITIC | Krishnan et al. (2021), *Symmetry* 13(6):973, Tables 1, 2 and 5 | standard deviations and weights | ±0.00005 |
| Entropy | Zavadskas et al. (2017), *Sustainability* 9(5):702, Tables 4 and 8 (the paper prints the weights on permuted rows); min-max option: Krishnan et al. (2021), Tables 1, 2 and 5 | weights (min-max: also the normalized matrix) | ±0.0001 (min-max ±0.00005) |
| SD | Diakoulaki et al. (1995), *Computers & OR* 22(7):763, Table 1, Section 5 and Table 3 (the printed σ is the population SD); Mukhametzyanov (2021), *DMAME* 4(2):76, Tables 1, 2 and 4, four matrices with cost criteria | weights and standard deviations | ±0.0005 |
| MEREC | Keshavarz-Ghorabaee et al. (2021), *Symmetry* 13(4):525, Tables 2-4 and Steps 3-6 (illustrative) and Tables 5-6 (comparative); Dua et al. (2024), *EUREKA: Physics and Engineering* (2):131, Tables 8-9 and 12-13 | weights, normalized matrix, S, S′ and removal effects | ±0.00005 (comparative ±0.0005; S, S′, E ±0.005) |
| LOPCOW | Ecer and Pamucar (2022), *Omega* 112:102690; Keleş (2023), *ÖHÜ İİBF Dergisi* 16(3):727, Tables 6-8 (10 logistics firms, 8 criteria) | normalized matrix, RMS, sample SD, PV and weights; RMS >= σ identity and m = 2 collapse | ±0.0005 |
| CILOS | Zavadskas and Podvezko (2016), *IJITDM* 15(2):267; Zavadskas et al. (2017), *Sustainability* 9(5):702, Tables 4 and 10 (Social block) and Table 8 (Economic block); Pala (2021), *Bingöl Univ. J. Econ. Admin. Sci.* 5(2):277 | sum-normalized matrix, square matrix A, relative impact-loss matrix P, system matrix F and weights | ±0.00005 |
| ROC | Barron and Barrett (1996), *Management Science* 42(11):1515; Stillwell, Seaver and Edwards (1981), *OBHP* 28(1):62; Roszkowska (2013), *Optimum. Studia Ekonomiczne* 5(65):14, Table 4 and Tables 5-6 | Rank Order Centroid (ROC), Rank Sum (RS) and Rank Reciprocal (RR) weights and tie-averaged rank weights | ±0.00006 |
| SWARA | Keršulienė, Zavadskas and Turskis (2010), *Journal of Business Economics and Management* 11(2):243, Table 1 (6 dispute-resolution criteria); Adalı and Işık (2017), *IREM* 5(4):56, Table 5 | comparative importance ratios s_j, step coefficients k_j = 1 + s_j, recalculated weights q_j and normalized weights w_j | ±0.005 |
| BWM | Rezaei (2016), *Omega* 64:126, Examples 1-3 (Example 3 from Liang et al. (2020), Table 1); Ratandhara and Kumar, *arXiv* 2506.17666, Examples 1-4 (one per closed-form branch); Demir and Bircan (2020), Tables 5-7; Arsu and Uğuz Arsu (2021), Tables 4-5 | linear-model weights, ξ, input-based CR and the criterion that fits worst | ±0.00006 |
| AHP | Saaty (2008), *IJSSci* 1(1):83, Tables 2, 7 and 8 (job choice, drink consumption corrected for a printed reciprocal typo, flexibility); Doğuç (2022), *Beykent Univ. J. Sci. Eng.* 15(1):19, Table 2 (recruitment); Bozóki, Fülöp and Rónyai (2010), *EJOR* 206(2):355, Section 6 (incomplete 8×8 matrix, LLSM completion) | principal-eigenvector and geometric-mean weights, λ_max, CI, CR, worst-fitting pair and incomplete-graph LLSM weights | ±0.0005 |
| TOPSIS | Opricovic and Tzeng (2004), *EJOR* 156(2):445, Table 3, two unit variants | D+, D−, closeness and ranks | ±0.0005 |
| SAW | Podvezko (2011), *Engineering Economics* 22(2):134, Tables 1-3 (linear max; Table 2 misprints one Lithuania value, Table 3 follows the misprint) and 5-6 (sum); ranks of Keshavarz Ghorabaee et al. (2015) Table 7, Zavadskas et al. (2012) Table 2 and Vujičić et al. (2017) Tables 8a-8b | normalized matrices, scores and ranks | ±0.0005 |
| VIKOR | Opricovic and Tzeng (2004), *EJOR* 156(2):445, Table 3, two unit variants; ranks of Keshavarz Ghorabaee et al. (2015) Table 7, all seven weight sets (v = 0.5) | S, R, Q, ranks, C1, C2 and the compromise | ±0.0005 |
| EDAS | Keshavarz Ghorabaee et al. (2015), *Informatica* 26(3):435, Tables 1-3 (47 items; Table 2 is rounded to 3 and then 2 decimals, all 517 cells reproduced) and Table 7 (ranks, all seven weight sets); Aydın Ünal (2019) and Sarıhan and Aydın (2023), each with a printing error recorded | average, PDA, NDA, SP, SN, NSP, NSN, AS, classes and ranks | ±0.006 |
| WASPAS | Aytaç Adalı and Tuş Işık (2017), *IREM* 5(4):56, Tables 4-7 (supplier selection, all 55 scores of Table 7 over λ); Chakraborty and Zavadskas (2014), *Informatica* 25(1):1, Tables 13-15 (robots); Zavadskas et al. (2012) Table 2 (Table 1 misprints one a1 value, recorded) | normalized matrix, WSM, WPM, Q at every λ and ranks | ±0.0001 |
| COPRAS | Özcan and Çelik (2021), *IJPME* 9(2):81, Tables 1, 2, 10, 11 (cream separators, Entropy then COPRAS; the printed rank row swaps A2 and A3, the printed Q does not); Podvezko (2011) Tables 7-8 (two cost changes flip the ranks); Zavadskas et al. (2007) Tables 1-2 (S+ and S- only: the printed Q is S+ + S-, not the paper's own Eq. 5) | weighted shares, S+, S-, Q, N and ranks | ±0.0001 |
| MARCOS | Stević and Brković (2020), *Logistics* 4(1):4, Tables 2-5 (23 drivers, FUCOM weights as Table 4 applies them; the paper's Figure 2 swaps C3 and C4, which would move 9 ranks); Madenoğlu (2020), *EBOR* 2(2):99, Tables 3-7 (6 suppliers, 16 criteria, AHP weights) | S, K-, f(K), the reference totals and ranks; f(K) = c x SAW (linear max) on 300 random problems | ±0.001 |
| CoCoSo | Yazdani et al. (2019), *Management Decision* 57(9):2501, Tables I, III-VI (7 logistics providers, expert weights; the paper prints k rounded, 1.3 for 1.2987) and Tables X-XI (10 green suppliers); Akgül (2021), *Ekonomi ve Finansal Araştırmalar Dergisi* 3(2):71, Tables 4-12 (9 Turkish banks, CRITIC weights) | S, P, ka, kb, kc, k, ranks and the λ rank changes; shift and scale invariance, zero-weight and constant columns on 200 random problems | ±0.0015 |
| MABAC | Pamučar and Ćirović (2015), *Expert Systems with Applications* 42(6):3016, Tables 5, 7-12 (7 forklifts, 10 criteria, DEMATEL weights; the two Likert criteria coded 1-5); Biswas and Das (2018), *Management Science Letters* 8:121, Tables 2-7 (9 hybrid vehicles, Entropy weights, all 9 printed digits); Çelik (2020), *İslam Ekonomisi ve Finansı Dergisi* 6(2):311, Tables 3-12 (6 Turkish participation banks, CRITIC weights computed here) | G, Q, S and ranks; S = min-max weighted sum - B on 300 random problems; G finite at 500 alternatives | ±0.0001 |
| MOORA | Brauers and Zavadskas (2010), *Technological and Economic Development of Economy* 16(1):5, Appendix C Table 2 (6 projects, 9 criteria); Brauers and Zavadskas (2006), *Control and Cybernetics* 35(2):445, Tables 1 and 5; Vujičić et al. (2017), *Tehnički vjesnik* 24(2):619, Tables 1, 7 and 8a-8b (aircraft selection with Entropy and CRITIC weights) | vector-normalized matrix, weighted matrix, S+, S-, y and ranks | ±0.0002 |
| ARAS | Zavadskas and Turskis (2010), *Technological and Economic Development of Economy* 16(2):159, Tables 1-4 (14 rooms, 6 criteria; Table 2 Room 8 illumination typo 390 vs 400 lx recorded); Bakır and Atalık (2018), *Business and Economics Research Journal* 9(1):179, Tables 3-6 (11 airlines, 8 criteria, Entropy weights) | optimal row, normalized and weighted matrices, S0, Si, utility degree Ki and ranks | ±0.0001 |
| CODAS | Keshavarz Ghorabaee et al. (2016), *Economic Computation and Economic Cybernetics Studies and Research* 50(3):25, Examples 1-2 (7 robots, 5 criteria and 14 rooms, 6 criteria; Section 4 sensitivity script < τ inversion recorded); Badi et al. (2018), *DMAME* 1(1):1, Tables 2-5 (6 steelmaking suppliers, AHP weights); Trung (2022), *EUREKA: Physics and Engineering* (5):112, Tables 12 and 14-16 | normalized and weighted matrices, negative-ideal point, Euclidean Ei, Taxicab Ti, relative assessment matrix and Hi | ±0.0005 |
| PROMETHEE II | Brans, Vincke and Mareschal (1986), *EJOR* 24(2):228, Tables 2-4 (6 hydroelectric power plants, 6 criteria, all 6 preference function types); Goswami (2020), *Foundations of Management* 12(1):93, Tables 4, 7, 13-18 (6 laptops, 7 criteria); Abdullah, Chan and Afshari (2019), *IEEE Access* 7:43472, Tables 5 and 9-12 | aggregated preference matrix Π, leaving flow φ+, entering flow φ−, net flow φ and PROMETHEE I incomparabilities | ±0.00001 |
| ELECTRE I | Roy (1968), *RIRO* 2(V1):57; Wang and Triantaphyllou (2008), *Omega* 36(1):45, Section 3.1 (Galway wastewater treatment plant, 5 sites, 7 criteria); Soner and Önüt (2006), *J. Fac. Eng. Arch. Gazi Univ.* 21(3):579 | concordance C, discordance D, outranking graph S, SCC-condensed kernel K = {A2, A3, A5} and net concordance / discordance | ±0.0005 |
| ELECTRE III | Roy (1978), *Cahiers du CERO* 20(1):3; Wang and Triantaphyllou (2008), *Omega* 36(1):45, Section 3.2, Tables 2-3 (11 waste incineration strategies, 11 criteria, 110 off-diagonal credibility cells) | pseudo-criterion concordance C, credibility σ(a, b), descending and ascending distillation pre-orders and incomparabilities | ±0.005 |

Alongside the published literature tables in [`tests/fixtures/`](tests/fixtures), the suite verifies permutation, scale, and shift invariants, exact algebraic equivalences across methods, and boundary conditions across degenerate or extreme inputs.

## Tech stack

- **UI & state:** React 19, TypeScript, Vite, Zustand, Wouter, Tailwind CSS 4, Radix UI
- **Math, tables & i18n:** Pure TypeScript core (`src/core/`), KaTeX, SheetJS (`.xlsx` import/export), i18next (`en` / `tr`)
- **Verification:** Vitest (1,867 unit, property, invariant, and literature fixture tests across 65 test files) and Playwright (end-to-end & axe-core accessibility tests)
- **Deployment:** Static build on GitHub Pages

## Run locally

Requires **Node 24+** and **pnpm**.

```sh
pnpm i
pnpm dev      # http://localhost:5173
pnpm test     # Vitest unit & literature verification suite
pnpm e2e      # Playwright end-to-end & accessibility tests
pnpm build    # TypeScript check + production bundle
```

## Docs

- [Design system & product principles](docs/design/DESIGN.md)
- [Implementation roadmap](docs/design/PLAN.md)
- [Method research dossiers (`docs/research/`)](docs/research/)

## License

[MIT](LICENSE)
