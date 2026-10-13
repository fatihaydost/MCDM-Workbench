# CRITIC — CRiteria Importance Through Intercriteria Correlation (critic)

- **Family:** weighting (objective)
- **Origin:** Diakoulaki, D., Mavrotas, G. & Papayannakis, L. (1995). Determining objective weights in multiple criteria problems: The CRITIC method. *Computers & Operations Research* 22(7), 763–770. DOI [10.1016/0305-0548(94)00059-H](https://doi.org/10.1016/0305-0548(94)00059-H) (verified on Crossref; full text paywalled, not read — the algorithm below is taken from the open-access restatements in Krishnan et al. 2021 and Mukhametzyanov 2021, which agree with each other and with the repo's `methods/critic.py`).
- **Popularity:** Crossref "cited-by" 3,094 for the origin paper (queried 2026-09-29). In the 30-study review table of Keshavarz-Ghorabaee et al. (2021, Symmetry 13:525, Table 1; 2020–2021) CRITIC is used in 13 studies (Entropy 12, SD 8).

## For users (site copy)
- **EN:** CRITIC gives more weight to a criterion when its values vary a lot across alternatives (contrast) and when it disagrees with the other criteria (conflict). Two criteria that tell the same story share weight instead of double-counting. Use it when you have a filled decision matrix and no expert opinion about importance.
- **TR:** CRITIC, bir kriterin değerleri alternatifler arasında çok değişiyorsa (kontrast) ve diğer kriterlerle çelişiyorsa (çatışma) o kritere daha çok ağırlık verir. Aynı şeyi söyleyen iki kriter ağırlığı paylaşır, iki kez sayılmaz. Dolu bir karar matrisiniz varsa ve önem konusunda uzman görüşü yoksa kullanın.

## When to use / when not
- **Use when:** weights must come from the data; criteria may be correlated (financial ratios, technical specs) and you want redundancy penalised; you want a method whose steps (σ, r, C) are easy to show.
- **Do not use when:** there are very few alternatives (m ≤ 3: correlations are ±1 or unstable, see Pitfalls); the decision maker has clear importance preferences (use AHP/BWM/SWARA or combine); the matrix contains the alternatives you will later add or remove (weights change with the set).

## Inputs
- Decision matrix X (m alternatives × n criteria), real values; m ≥ 3 recommended (m ≥ 2 technically).
- Criterion type per column: `max` (benefit) or `min` (cost). Only used in normalization.
- No parameters. Output: weight vector w (n), plus intermediate σ, correlation matrix R, information C for display.

## Algorithm
1. Min–max normalization (the "ideal point" transformation of the origin paper):
   $r_{ij} = \dfrac{x_{ij} - x_j^{\min}}{x_j^{\max} - x_j^{\min}}$ (benefit), $r_{ij} = \dfrac{x_j^{\max} - x_{ij}}{x_j^{\max} - x_j^{\min}}$ (cost).
2. Contrast: $\sigma_j = \sqrt{\tfrac{1}{m-1}\sum_i (r_{ij} - \bar r_j)^2}$ (sample SD, as Excel `STDEV`).
3. Pearson correlation between columns: $\rho_{jk} = \mathrm{corr}(r_{\cdot j}, r_{\cdot k})$.
4. Information: $C_j = \sigma_j \sum_{k=1}^{n} (1 - \rho_{jk})$.
5. Weights: $w_j = C_j / \sum_k C_k$.

**Variants (and which one we implement).**
- **SD with n or n−1:** irrelevant for the weights (both scale every σ_j by the same factor √(m/(m−1)), which cancels in step 5; checked numerically: difference 0). We use n−1 to match the xlsx and Krishnan et al.
- **Absolute correlation** $\sum_k (1 - |\rho_{jk}|)$: proposed by Mukhametzyanov (2021) as a correction; his Table 2 "CRITIC" weights are this variant (we reproduce them only with |ρ|). Not the origin method — offer at most as an option.
- **CRITIC on a different normalization** (e.g., WASPAS-type x/max, min/x in Keshavarz-Ghorabaee et al. 2021 Table 6): changes weights because min/x is nonlinear. Not implemented.
- **D-CRITIC** (distance correlation, Krishnan et al. 2021): separate method, not implemented.
- We implement the origin method (min–max, Pearson ρ, no absolute value). pyDecision `critic_method` is the same method (adds 1e-10 to the denominator; weights differ by < 1e-10).

## Commonly combined with
- CRITIC → TOPSIS / GRA / ORESTE: Şahin (material selection) as reviewed in Keshavarz-Ghorabaee et al. (2021) Sec. 2, DOI [10.3390/sym13040525](https://doi.org/10.3390/sym13040525).
- CRITIC → (fuzzy) TOPSIS for personnel selection: the repo's own TOPSIS module is the natural first pairing on this site.
- CRITIC alongside Entropy/SD/MEREC as competing objective weights: Keshavarz-Ghorabaee et al. (2021) Table 6; Mukhametzyanov (2021), DOI [10.31181/dmame210402076i](https://doi.org/10.31181/dmame210402076i).

## Pitfalls
- **Constant column** (x_max = x_min): normalization divides by zero. Choose: r = 0 for the column, σ = 0 → C = 0 → weight 0 (repo `critic.py` and pyDecision behave this way; pyDecision via `nan_to_num`). Show a warning.
- **Correlation undefined** for a constant column. Setting ρ = 0 for that pair (repo `critic.py`, pyDecision) is harmless for the constant column itself (σ = 0) but adds 1 to the conflict sum Σ(1 − ρ) of every other column, which is not proportional to C_j and so shifts the other weights (Krishnan 2021 plus one constant column: thickness 0.2599 → 0.2491; plus three: 0.2360). **TS choice (audit 13.10):** a constant column is left out of every conflict sum, which gives exactly the weights of the problem without it. A column whose spread is within 1e-12 of its largest magnitude counts as constant (0.3 vs 0.1 + 0.2).
- **All columns constant:** ΣC = 0; fall back to equal weights and warn (repo behaviour).
- **Small m:** with m = 2 every correlation is ±1; with m = 3 correlations jump. Warn below m = 4.
- **Negative correlation raises weight:** 1 − ρ can reach 2, so strongly anti-correlated criteria get large weights. This is by design in the origin method (Mukhametzyanov argues it is a flaw).
- **Rank reversal of criteria:** adding/removing an alternative changes min/max, σ and ρ, so weights and their order can change (Krishnan et al. 2021 Sec. 5 show this for their variant).
- **Negative data** is fine (min–max handles it).

## Reference example (test fixture)
- **Source A (primary):** Krishnan, A.R., Kasim, M.M., Hamid, R. & Ghazali, M.F. (2021). A Modified CRITIC Method to Estimate the Objective Weights of Decision Criteria. *Symmetry* 13(6), 973. DOI [10.3390/sym13060973](https://doi.org/10.3390/sym13060973). Input: Table 1 (5 smartphones × 5 criteria). Published: Table 2 (normalized matrix and σ), Table 5 column "CRITIC" (weights).
- **Source B (repo):** `CRITIC(2).xlsx`, sheet `Sayfa1` (hand calculation with Excel formulas; weights in B47:G47).

```json
{
  "id": "critic-krishnan2021",
  "source": "Krishnan et al. 2021, Symmetry 13(6):973, Table 1 (input), Table 2 and Table 5 (output)",
  "alternatives": ["A", "B", "C", "D", "E"],
  "criteria": ["price", "screen", "pixel_density", "thickness", "mass"],
  "types": ["min", "max", "max", "min", "min"],
  "matrix": [
    [649, 4.7, 326, 7.1, 143],
    [749, 5.5, 401, 7.3, 192],
    [740, 5.7, 520, 7.6, 171],
    [400, 5.7, 520, 11.1, 179],
    [600, 5.5, 538, 8.9, 152]
  ],
  "expected": {
    "sigma_sample": [0.4062, 0.4147, 0.4394, 0.4161, 0.4063],
    "weights": [0.1872, 0.1838, 0.1691, 0.2599, 0.2000],
    "tolerance": 5e-5
  }
}
```

```json
{
  "id": "critic-repo-xlsx",
  "source": "kds-topsis-critic/CRITIC(2).xlsx, Sayfa1 B4:G10 (input), B47:G47 (weights)",
  "types": ["min", "min", "min", "max", "max", "max"],
  "matrix": [
    [5, 16, 2, 4, 913, 148],
    [2, 18, 10, 2, 842, 75],
    [9, 12, 9, 5, 720, 84],
    [10, 17, 6, 9, 792, 185],
    [8, 13, 8, 2, 765, 246],
    [9, 16, 1, 6, 260, 120],
    [2, 12, 2, 2, 699, 70]
  ],
  "expected": {
    "sigma_sample": [0.4260840516231733, 0.4130797993547017, 0.41503206706959545, 0.37538448058017404, 0.3254826834264091, 0.37113273844203887],
    "weights": [0.19559527548858474, 0.17522717443851069, 0.1698834148287881, 0.17377375419718524, 0.1327697404499886, 0.15275064059694266],
    "tolerance": 1e-12
  }
}
```

- **Published ranking of criteria (A):** thickness > mass > price > screen > pixel density.
- **Recomputed** (`scratchpad/mcdm/agirlik/recompute_all.py`, numpy 2.5.3; pyDecision 5.1.1):
  - A: numpy = [0.18718, 0.18376, 0.16907, 0.25995, 0.20004] → **MATCH**, max abs diff 4.6e-5 (4-decimal rounding). σ matches Table 2 to 4 decimals. pyDecision `critic_method`: **MATCH** (differs from numpy by 1.6e-11).
  - B: numpy, pyDecision and the repo's `methods/critic.py` all **MATCH** the xlsx cached values (max abs diff 2.8e-17 numpy/repo, 3.3e-12 pyDecision).
  - Checked but not used as fixture: Mukhametzyanov (2021) Table 2 "CRITIC" DM-1 = [0.144, 0.147, 0.322, 0.214, 0.173] is reproduced only with |ρ| ([0.1436, 0.1469, 0.3222, 0.2145, 0.1729]); plain CRITIC gives [0.2429, 0.2152, 0.1944, 0.1674, 0.1802]. Keshavarz-Ghorabaee et al. (2021) Table 6 CRITIC is reproduced (3 decimals) only when CRITIC is run on their WASPAS-normalized matrix.

## Implementation notes
- pyDecision: `pyDecision.algorithm.critic_method(dataset, criterion_type)` with `'max'/'min'`.
- Return intermediates (r, σ, ρ, C) for the step-by-step view; the repo already does this.
- Edge cases (decided in TS): constant column (relative spread ≤ 1e-12) → r = 0, σ = 0, ρ_jk shown as 0, left out of every conflict sum, weight 0 with warning; all constant → equal weights with warning; varying columns with no conflict at all (only one varies, or ρ = 1 between them) → they share equally, constants 0, with a notice; m < 2 → error; NaN/empty cells → reject before computing.
- Keep `ddof` fixed to 1 for displayed σ so it matches Excel; weights do not depend on it.

## Sources
- Diakoulaki et al. (1995), DOI 10.1016/0305-0548(94)00059-H (Crossref metadata only).
- Krishnan et al. (2021), DOI 10.3390/sym13060973 — read in full (Tables 1–5) via mdpi.com.
- Mukhametzyanov (2021), *Decision Making: Applications in Management and Engineering* 4(2), 76–105, DOI 10.31181/dmame210402076i — read in full (PDF from dmame-journal.org).
- Keshavarz-Ghorabaee et al. (2021), *Symmetry* 13(4), 525, DOI 10.3390/sym13040525 — read (PDF from elaba.lt).
- Repo: `CRITIC(2).xlsx`, `methods/critic.py`.
