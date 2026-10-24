# LOPCOW — LOgarithmic Percentage Change-driven Objective Weighting (lopcow)

- **Family:** weighting (objective)
- **Origin:** Ecer, F. & Pamucar, D. (2022). A novel LOPCOW-DOBI multi-criteria sustainability performance assessment methodology: An application in developing country banking sector. *Omega* 112, 102690. DOI [10.1016/j.omega.2022.102690](https://doi.org/10.1016/j.omega.2022.102690) (Crossref verified; **full text not accessible** — paywalled). The formulas below are taken from four open-access papers that quote Ecer & Pamucar (2022, pp. 4–5) identically (Keleş 2023; Ayçın & Bektaş 2024; isarder LOPCOW-RAM 2024; Dua et al. 2024), and confirmed numerically on Keleş (2023).
- **Popularity:** Crossref cited-by 310 for the origin paper (2026-09-29). Keleş (2023) Table 1 lists 8 LOPCOW applications within the first year (mostly with EDAS).

## For users (site copy)
- **EN:** LOPCOW scales each criterion to 0–1 and compares its typical size (root-mean-square) with its spread (standard deviation) on a logarithmic scale. This dampens the huge weight gaps that Entropy can produce and works with negative raw data. Pick it when you want objective weights that are more even than Entropy's.
- **TR:** LOPCOW her kriteri 0–1 aralığına ölçekler ve tipik büyüklüğünü (karesel ortalama) yayılımıyla (standart sapma) logaritmik ölçekte karşılaştırır. Entropinin üretebildiği aşırı ağırlık farklarını yumuşatır ve negatif ham verilerle çalışır. Entropiden daha dengeli nesnel ağırlıklar istediğinizde seçin.

## When to use / when not
- **Use when:** data include negative values (financial ratios, growth rates); you want flatter, less extreme objective weights; paired with the newer ranking methods (EDAS, CRADIS, RAM, DOBI).
- **Do not use when:** only two alternatives are compared ($m = 2$ forces $\text{RMS}_j = \sigma_j = 1/\sqrt{2}$ on every varying column, so $\text{PV}_j = 0$ and weights collapse to equal $1/n$); a criterion is constant ($\sigma_j = 0 \to$ division by zero); you need a well-studied method with known axiomatic properties (LOPCOW is new and its behaviour is only empirically described).

## Inputs
- Decision matrix $X$ ($m \times n$), any real values, $m \ge 2$, $n \ge 1$.
- Criterion types `benefit` (`max`) / `cost` (`min`) — min–max normalization with cost inversion.
- No user parameters.

## Algorithm
1. **Min–max normalization (`lopcow.normalized`):**
   $$r_{ij} = \frac{x_{ij}-x_j^{\min}}{x_j^{\max}-x_j^{\min}} \quad (\text{benefit}), \qquad r_{ij} = \frac{x_j^{\max}-x_{ij}}{x_j^{\max}-x_j^{\min}} \quad (\text{cost}).$$
   Each normalized column $r_{\cdot j}$ lies in $[0, 1]$ with $1$ = best and $0$ = worst (for non-constant columns). If $x_j^{\max} = x_j^{\min}$, set $r_{ij} = 0$ for all $i$.
2. **Root-mean-square (`lopcow.rms`) and sample standard deviation (`lopcow.stdDev`):**
   $$\text{RMS}_j = \sqrt{\frac{1}{m}\sum_{i=1}^{m} r_{ij}^2}, \qquad \sigma_j = \sqrt{\frac{1}{m-1}\sum_{i=1}^{m}\left(r_{ij} - \bar{r}_j\right)^2}, \quad \bar{r}_j = \frac{1}{m}\sum_{i=1}^{m} r_{ij}.$$
3. **Logarithmic percentage value (`lopcow.pv`):**
   $$PV_j = \left|\,\ln\!\left(\frac{\text{RMS}_j}{\sigma_j}\right)\cdot 100\,\right|.$$
   If a column is constant ($\sigma_j = 0$) or $\text{RMS}_j = \sigma_j$ within floating-point tolerance, set $PV_j = 0$.
4. **Objective weights (`lopcow.weights`):**
   $$w_j = \frac{PV_j}{\sum_{k=1}^{n} PV_k}.$$
   If $\sum_{k=1}^{n} PV_k = 0$ (all columns constant, $m = 2$, or every column has a single non-zero $r_{ij}$), fall back to equal weights $w_j = 1/n$.

## Mathematical properties & variants
- **Why $\sigma_j$ with $m - 1$ vs $m$ matters here** (unlike CRITIC/SD, where $\sqrt{m/(m-1)}$ cancels in the weight ratio): in LOPCOW, replacing $\sigma_j$ by $\sqrt{(m-1)/m}\,\sigma_j$ shifts every $\ln(\text{RMS}_j/\sigma_j)$ by an additive constant $+\frac{1}{2}\ln\!\left(\frac{m}{m-1}\right)$, which changes the relative ratios $PV_j / \sum_k PV_k$. Keleş (2023) is reproduced **only** with sample standard deviation ($m - 1$, `ddof = 1`; max diff $\le 5\times 10^{-4}$ across Tables 6, 7, 8), whereas population $\sigma$ misses by up to $4.5\times 10^{-3}$.
- **Exact algebraic identity for $\text{RMS}_j$ vs $\sigma_j$:** For any real vector $r_{\cdot j} \in \mathbb{R}^m$ with $m \ge 2$,
  $$\text{RMS}_j^2 - \sigma_j^2 = \frac{1}{m}\sum_{i=1}^{m} r_{ij}^2 - \frac{1}{m-1}\left(\sum_{i=1}^{m} r_{ij}^2 - \frac{1}{m}\left(\sum_{i=1}^{m} r_{ij}\right)^2\right) = \frac{2}{m(m-1)}\sum_{1 \le i < k \le m} r_{ij} r_{kj}.$$
  Because min–max normalization gives $r_{ij} \in [0, 1]$, every pairwise product $r_{ij} r_{kj} \ge 0$, so **$\text{RMS}_j \ge \sigma_j$ holds for all $m \ge 2$ even with sample standard deviation ($m - 1$)**.
- **When does $\text{RMS}_j = \sigma_j$ ($PV_j = 0$) on a varying column?** Since $r_{ij} \ge 0$ and at least one $r_{ij} = 1$ and one $r_{ij} = 0$, the sum $\sum_{i < k} r_{ij} r_{kj}$ is zero if and only if **at most one entry is positive** — i.e., **exactly one alternative achieves the best value ($r_{ij} = 1$) and all other $m - 1$ alternatives are tied at the worst value ($r_{kj} = 0$)**. In that case $\text{RMS}_j = \sigma_j = 1/\sqrt{m}$ and $PV_j = \ln(1)\cdot 100 = 0$.
- **Complete degeneracy at $m = 2$ (`lopcow.two-alternatives`):** When $m = 2$, every non-constant min–max column consists of $\{0, 1\}$, so $\text{RMS}_j = \sigma_j = 1/\sqrt{2} \approx 0.707107$ and $PV_j = 0$ for **every** criterion. Consequently $\sum_k PV_k = 0$ and LOPCOW collapses to equal weights $1/n$.
- **Direction sensitivity (`benefit` vs `cost`):** Unlike SD and CRITIC, flipping a criterion between `benefit` and `cost` replaces $r_{ij} \mapsto 1 - r_{ij}$, which preserves $\sigma_j$ but changes the mean $\bar{r}_j \mapsto 1 - \bar{r}_j$ and therefore changes $\text{RMS}_j = \sqrt{\frac{m-1}{m}\sigma_j^2 + \bar{r}_j^2}$ and the resulting weights.
- **Affine invariance:** Positive linear rescaling and translation $x_{ij} \mapsto a_j x_{ij} + b_j$ ($a_j > 0$) leaves $r_{ij}$ unchanged, so $\text{RMS}_j$, $\sigma_j$, $PV_j$, and $w_j$ are invariant.
- **Non-standard "LOPCOW" in the wild:** some papers normalize with $x_{ij}/(m + \sum x_{ij}^2)$ (e.g., Indonesian applications seen in search results) — a different method; do not use them as fixtures. Dua et al. (2024) publish LOPCOW weights we could not reproduce with either $\sigma$ (see Recomputed).
- pyDecision v5.1.1 has **no LOPCOW** function.

## Commonly combined with
- LOPCOW → DOBI (Dombi–Bonferroni): Ecer & Pamucar (2022), DOI [10.1016/j.omega.2022.102690](https://doi.org/10.1016/j.omega.2022.102690).
- LOPCOW → CRADIS: Keleş (2023), DOI [10.25287/ohuiibf.1239201](https://doi.org/10.25287/ohuiibf.1239201).
- LOPCOW → EDAS (Biswas et al. 2022a–e, Niu et al. 2022) and LOPCOW + MEREC → CoCoSo/EDAS (Bektaş 2022), as listed in Keleş (2023) Table 1.
- LOPCOW → MARA / RAM / PIV: Dua et al. (2024), DOI [10.21303/2461-4262.2024.003171](https://doi.org/10.21303/2461-4262.2024.003171).

## Pitfalls & warnings
- **Constant column (`lopcow.constant-column`):** $\sigma_j = 0 \to PV_j = 0$, weight $0$ (unless all columns have $PV = 0$, in which case `lopcow.all-constant-equal-weights` returns $1/n$).
- **Near-constant column (`lopcow.near-constant-column`):** relative range $(x_j^{\max} - x_j^{\min}) / \max(1, |x_j^{\max}|, |x_j^{\min}|) < 10^{-9}$ amplifies floating-point noise in min–max normalization.
- **Two alternatives (`lopcow.two-alternatives`):** $m = 2 \implies \text{RMS}_j = \sigma_j = 1/\sqrt{2} \implies PV_j = 0$ on every column, collapsing weights to $1/n$.
- **Single-best-alternative column ($\text{RMS}_j = \sigma_j$):** For $m \ge 3$, a column with one best alternative ($r_{ij} = 1$) and $m - 1$ tied worst alternatives ($r_{kj} = 0$) has $\text{RMS}_j = \sigma_j = 1/\sqrt{m}$, giving $PV_j = 0$ and weight $0$ even though the criterion varies.
- **Negative raw data:** handled naturally by min–max normalization (claimed advantage in the origin paper).
- **Rank reversal of criteria:** min–max bounds depend on the alternative set.
- **Sample vs population $\sigma$:** a silent source of 0.3–0.5 percentage-point differences between implementations; state $m - 1$ explicitly in the UI.

## Reference example (test fixture)
- **Source:** Keleş, N. (2023). Lopcow ve Cradis yöntemleriyle G7 ülkelerinin ve Türkiye'nin yaşanabilir güç merkezi şehirlerinin değerlendirilmesi. *Ömer Halisdemir Üniversitesi İİBF Dergisi* 16(3), 727–747. DOI [10.25287/ohuiibf.1239201](https://doi.org/10.25287/ohuiibf.1239201) (DergiPark, open access). Input and output in the same tables: Table 6 (GPCI, 15 cities × 6 benefit criteria, weight row), Table 7 (QLI, 15 × 8, 3 benefit + 5 cost), Table 8 (all 14 criteria). Weights printed to 3 decimals; no PV values printed.

```json
{
  "id": "lopcow-keles2023-gpci",
  "source": "Keles 2023, OHU IIBF Dergisi 16(3):727-747, Table 6",
  "alternatives": ["New York", "London", "Tokyo", "San Francisco", "Washington", "Paris", "Toronto", "Los Angeles", "Boston", "Chicago", "Vancouver", "Frankfurt", "Berlin", "Milan", "Istanbul"],
  "criteria": ["economy", "rnd", "cultural_interaction", "livability", "environment", "accessibility"],
  "types": ["max", "max", "max", "max", "max", "max"],
  "matrix": [[362.5, 207.4, 254.3, 304, 157.1, 220.6], [324.5, 181.3, 338.9, 358.3, 192.9, 196.6], [292, 145.4, 210.6, 353.1, 181, 185.1], [281.3, 118.2, 95.5, 300.6, 136.8, 133.8], [264.4, 85.9, 75.9, 273.7, 142.4, 132.9], [253.1, 103.1, 235.5, 383.4, 156.3, 225.4], [245.9, 61, 94.7, 352.9, 173, 145.5], [239.3, 155.8, 113.3, 302.9, 144.2, 146.1], [238.2, 135.4, 65.7, 289.1, 159.5, 145.4], [228.3, 109.5, 106.9, 287.2, 133.7, 192.8], [236.7, 45.8, 59.4, 322.8, 198.7, 113.2], [220.9, 30.6, 78.1, 346.8, 179.4, 217.8], [222.8, 80.9, 171.6, 359, 195.2, 153.5], [177.1, 27.8, 118.7, 362.5, 159.2, 171.8], [132.4, 37.3, 195.7, 318.4, 146.8, 166.7]],
  "expected": {"weights": [0.241, 0.142, 0.105, 0.180, 0.151, 0.181], "ranking": [1, 5, 6, 3, 4, 2], "tolerance": 5e-4},
  "our_rms": [0.553222, 0.509998, 0.426381, 0.574588, 0.563499, 0.588601],
  "our_sample_sd": [0.240164, 0.311943, 0.296587, 0.307614, 0.333568, 0.313714],
  "our_pv_sample_sd": [83.443928, 49.158599, 36.299184, 62.480710, 52.431731, 62.926626],
  "our_weights": [0.240652, 0.141773, 0.104687, 0.180194, 0.151213, 0.181480]
}
```

```json
{
  "id": "lopcow-keles2023-qli",
  "source": "Keles 2023, Table 7",
  "criteria": ["purchasing_power", "safety", "health_care", "cost_of_living", "property_price_to_income", "traffic_commute_time", "pollution", "climate"],
  "types": ["max", "max", "max", "min", "min", "min", "min", "min"],
  "matrix": [[100, 50.9, 62.3, 100, 10.2, 43.6, 57.6, 79.7], [88.1, 46.2, 70.2, 74.2, 16, 44.4, 58.1, 88.3], [90, 75.4, 79.9, 73.7, 12.6, 41.6, 43, 85.3], [104, 38.9, 63.9, 99.6, 9.2, 51, 50.4, 97.3], [127.9, 39.9, 69.9, 83.8, 5.5, 40.5, 40.2, 81.6], [77.9, 43.1, 79.1, 76.1, 20.2, 41.5, 63.9, 88.4], [91, 57.8, 75.6, 73, 12.9, 44.8, 37.5, 65.3], [116, 47.8, 62.5, 78.7, 7.3, 61, 67.3, 95.5], [111.1, 60.6, 74.5, 84.6, 8.1, 45, 30.9, 71.7], [121.3, 33.9, 64.8, 79, 3.4, 41.6, 49.2, 66.1], [94, 60.4, 73.9, 71.7, 12.9, 36.6, 25.4, 91.2], [108, 55.3, 75.2, 70.1, 13.2, 25.7, 36.3, 84.7], [98, 56.8, 68, 69.7, 11.4, 34.4, 39, 83.3], [55.4, 51.3, 71.7, 73.6, 19, 36.2, 67.8, 88.1], [28.5, 52.5, 69.5, 34.6, 21, 51.7, 69.1, 93]],
  "expected": {"weights": [0.185, 0.120, 0.104, 0.114, 0.122, 0.163, 0.097, 0.094], "tolerance": 5e-4},
  "our_rms": [0.704844, 0.486677, 0.572034, 0.425928, 0.576531, 0.566597, 0.557297, 0.511050],
  "our_sample_sd": [0.256744, 0.252074, 0.323412, 0.228040, 0.296424, 0.232642, 0.327333, 0.306293],
  "our_pv_sample_sd": [100.989601, 65.787674, 57.027069, 62.474808, 66.523776, 89.014798, 53.212177, 51.192642],
  "our_weights": [0.184887, 0.120441, 0.104403, 0.114376, 0.121789, 0.162964, 0.097418, 0.093721]
}
```

- **Third case (Table 8):** the 15 × 14 concatenation of the two matrices above (types concatenated); expected weights `[0.093, 0.055, 0.041, 0.070, 0.059, 0.070, 0.113, 0.074, 0.064, 0.070, 0.074, 0.100, 0.060, 0.057]` (our recomputed weights: `[0.093446, 0.055051, 0.040650, 0.069970, 0.058716, 0.070470, 0.113095, 0.073673, 0.063863, 0.069964, 0.074498, 0.099685, 0.059591, 0.057329]`, max diff `4.98e-4`).
- **Recomputed** (`scratchpad/mcdm/agirlik/recompute_all.py`):
  - Table 6: numpy (sample $\sigma$) = `[0.24065, 0.14177, 0.10469, 0.18019, 0.15121, 0.18148]` → **MATCH**, max abs diff `4.8e-4`. Population $\sigma$ = `[0.2365, 0.1432, 0.1082, 0.1794, 0.1521, 0.1806]` → MISMATCH (`4.5e-3`).
  - Table 7: sample $\sigma$ → **MATCH** (`4.4e-4`); population $\sigma$ → MISMATCH (`3.0e-3`).
  - Table 8: sample $\sigma$ → **MATCH** (`5.0e-4`, at the rounding limit; $w_{12} = 0.09969$ printed as $0.100$); population $\sigma$ → MISMATCH (`2.0e-3`).
  - pyDecision: **not run** (no LOPCOW in v5.1.1).
  - Checked, not usable: Dua et al. (2024) Case 1/2 LOPCOW weights (e.g., Case 2 `[0.2831, 0.1700, 0.1818, 0.1068, 0.1244, 0.1339]`) are not reproduced by either $\sigma$ (ours: `[0.0753, 0.1849, 0.1687, 0.1484, 0.2527, 0.1700]` with sample $\sigma$). Their MEREC weights on the same data are reproduced exactly, so the input transcription is right; their LOPCOW computation differs from the published formula (cause unknown).

## Implementation notes
- TS: compute `r` via `minMaxNormalize(problem)`, then `rms[j] = Math.sqrt(sumSquares / m)`, `stdDev[j] = sampleStd(col)`, `pv[j] = constant[j] || sd === 0 || tied(rms[j], sd) ? 0 : Math.abs(Math.log(rms[j] / sd) * 100)`.
- Edge cases:
  - `constant[j]` → `lopcow.constant-column` warning + `pv[j] = 0`;
  - `nearConstant[j]` → `lopcow.near-constant-column` warning;
  - `m === 2` → `lopcow.two-alternatives` warning;
  - `allConstant` → `lopcow.all-constant-equal-weights` warning;
  - `total === 0` (`allConstant` or all `pv[j] === 0`) → equal weights `1 / n`.
- Emit steps: `lopcow.normalized`, `lopcow.rms`, `lopcow.stdDev`, `lopcow.pv`, `lopcow.weights`.

## Sources
- Ecer & Pamucar (2022) — Crossref metadata only; formulas as quoted in the open-access papers below.
- Keleş (2023), DOI 10.25287/ohuiibf.1239201 — full PDF (DergiPark), Tables 1, 3, 4, 6, 7, 8.
- Dua et al. (2024), DOI 10.21303/2461-4262.2024.003171 — full text, Eqs. (10)–(13), Tables 1, 2, 8, 9.
- Ayçın & Bektaş (2024), BIST Kocaeli LOPCOW–OPARA (DergiPark; seen only as a search snippet) and "Bankaların Finansal Performansının LOPCOW-RAM Yöntemiyle Değerlendirilmesi" (isarder.org, 2024) — used only to cross-check the formula text (the latter's Table 6 row "Kareler Toplamı" is actually $\sqrt{\sum r^2/m}$: $\ln(0.6807/0.3763)\cdot 100 = 59.28$ = its PV for C1).
