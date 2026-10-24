# CILOS — Criterion Impact LOSs (cilos)

- **Status:** Re-verified 2026-10-24 — Zavadskas et al. (2017) full text read and all three Vilnius blocks (Social Table 10, Economic Table 8, Environmental Table 12) recomputed in Python/NumPy; secondary Turkish applications Pala (2021) and Çiftaslan & Rençber (2022) full PDFs read and intermediate matrices ($R, F, q$) verified; `pyDecision` source (`pyDecision/algorithm/cilos.py`) audited line-by-line.
- **Family:** weighting (objective)
- **Origin:**
  - Conceptual origin: Mirkin, B.G. (1974). *Problema gruppovogo vybora* [The Problem of Group Choice]. Nauka, Moscow, p. 256 (Russian monograph; no DOI; cited as ref. [80] in Zavadskas et al. 2017 and in Zavadskas & Podvezko 2016).
  - Formalized as the **CILOS** (Criterion Impact LOSs) objective weighting method and combined with Shannon Entropy into **IDOCRIW** (Integrated Determination of Objective CRIteria Weights) in:
    **Zavadskas, E.K. & Podvezko, V. (2016).** "Integrated Determination of Objective CRIteria Weights in MCDM." *International Journal of Information Technology & Decision Making*, 15(2), 267-283. DOI [10.1142/S0219622016500036](https://doi.org/10.1142/S0219622016500036) (Crossref and OpenAlex metadata verified).
  - Primary open-access formulation by the same authors with full equations (Sec. 5.1.2, Eqs. 5-8) and three empirical Vilnius neighbourhood blocks (Tables 4, 8, 10, 12):
    **Zavadskas, E.K., Cavallaro, F., Podvezko, V., Ubarte, I., & Kaklauskas, A. (2017).** "MCDM Assessment of a Healthy and Safe Built Environment According to Sustainable Development Principles: A Practical Neighborhood Approach in Vilnius." *Sustainability*, 9(5), 702. DOI [10.3390/su9050702](https://doi.org/10.3390/su9050702) (full PDF read).
- **Popularity:** OpenAlex `cited_by_count`: **367** for Zavadskas & Podvezko (2016) and **112** for Zavadskas et al. (2017) (queried 2026-10-24). Used both as a standalone objective weighting method and as the impact-loss component of IDOCRIW across urban sustainability, logistics, banking, and manufacturing MCDM.

## For users (site copy)
- **EN:** CILOS asks: if we pick the alternative that is best on criterion $i$, how much do we lose on every other criterion? A criterion whose best alternative costs a lot elsewhere gets less weight; one that can be optimized with little loss gets more.
- **TR:** CILOS şunu sorar: $i$. kriterde en iyi alternatifi seçersek diğer her kriterde ne kadar kaybederiz? En iyi seçimi başka yerlerde yüksek kayba yol açan kriter daha az, az kayıpla optimize edilebilen kriter daha çok ağırlık alır.

## When to use / when not
- **Use when:**
  - All decision-matrix entries are strictly positive ($x_{ij} > 0$).
  - You want weights driven by trade-offs at the top of each criterion rather than overall column dispersion.
  - You want to compare or combine impact-loss weights with Shannon Entropy (IDOCRIW).
- **Do not use when:**
  - Any cell is zero or negative (cost inversion $\min_k x_{kj} / x_{ij}$ divides by zero, and negative values break sum normalization and relative losses).
  - One alternative dominates every criterion simultaneously (all relative losses $p_{ij}$ vanish, so $F = 0$ and the method falls back to equal weights).
  - You want weights to reflect spread across all $m$ alternatives rather than only the column-winning alternatives (use CRITIC, SD, or LOPCOW).

## Inputs
- Decision matrix $X = [x_{ij}]_{m \times n}$ with strictly positive values $x_{ij} > 0$ ($m \ge 2$, $n \ge 2$).
- Criterion directions: `'benefit'` (`max`) or `'cost'` (`min`).
- No free parameters.

## Algorithm

Given an $m \times n$ decision matrix $X = [x_{ij}]$ with $x_{ij} > 0$ (Zavadskas et al. 2017, Sec. 5.1.2, Eqs. 5-8):

1. **Cost-to-benefit transformation (Eq. 5):** Convert cost criteria into benefit form using the reciprocal ratio to the column minimum, leaving benefit criteria unchanged:
   $$\tilde{x}_{ij} = \begin{cases} x_{ij}, & \text{if } j \text{ is a benefit criterion} \\[4pt] \dfrac{\min_{1 \le r \le m} x_{rj}}{x_{ij}}, & \text{if } j \text{ is a cost criterion} \end{cases}$$

2. **Column-sum normalization:** Normalize each column to shares summing to $1$:
   $$\bar{x}_{ij} = \frac{\tilde{x}_{ij}}{\sum_{r=1}^{m} \tilde{x}_{rj}}, \qquad \sum_{i=1}^{m} \bar{x}_{ij} = 1.$$
   *Scale-invariance and cost-minimum cancellation:* Multiplying any column $j$ by a positive constant $c_j > 0$ leaves $\bar{x}_{ij}$ unchanged. For a cost criterion, $\min_{r} x_{rj}$ is a positive column factor that cancels in sum normalization:
   $$\bar{x}_{ij} = \frac{(\min_r x_{rj}) / x_{ij}}{\sum_{k=1}^{m} (\min_r x_{rj}) / x_{kj}} = \frac{1 / x_{ij}}{\sum_{k=1}^{m} (1 / x_{kj})}.$$
   In the workbench step breakdown, Steps 1 and 2 are presented together as the oriented sum-normalized matrix $\bar{X}$ (`cilos.normalized`), matching the pattern of `aras.normalized` and `merec.normalized`.

3. **Square matrix $A$ of column winners (`cilos.squareMatrix`):** For each criterion $i \in \{1, \dots, n\}$, find the index $k_i \in \{1, \dots, m\}$ of the alternative that maximizes column $i$ of $\bar{X}$ (using first-occurrence tie-breaking when two alternatives tie for the column maximum):
   $$k_i = \arg\max_{1 \le r \le m} \bar{x}_{ri}, \qquad a_{ij} = \bar{x}_{k_i j} \quad (i, j = 1, \dots, n).$$
   Row $i$ of the $n \times n$ matrix $A = [a_{ij}]$ is row $k_i$ of $\bar{X}$, and the main diagonal holds the column maxima $a_{ii} = \max_{1 \le r \le m} \bar{x}_{ri}$.

4. **Relative impact-loss matrix $P$ (Eq. 6, `cilos.lossMatrix`):** Compute the relative loss on criterion $j$ when the optimal alternative $k_i$ for criterion $i$ is selected:
   $$p_{ij} = \frac{a_{jj} - a_{ij}}{a_{jj}} = 1 - \frac{a_{ij}}{a_{jj}}, \qquad p_{ii} = 0 \quad (i, j = 1, \dots, n).$$
   Since $0 < a_{ij} \le a_{jj}$, every entry satisfies $0 \le p_{ij} < 1$.

5. **System matrix $F$ (Eq. 8, `cilos.systemMatrix`):** Place the negative column sums of $P$ on the main diagonal of $P$:
   $$f_{ij} = \begin{cases} p_{ij}, & i \neq j \\[4pt] -\sum_{r \neq j} p_{rj}, & i = j \end{cases}$$
   Every column of $F$ sums to zero: $\sum_{i=1}^{n} f_{ij} = 0$.

6. **Homogeneous linear system and weights (Eq. 7, `cilos.weights`):** Solve the linear system
   $$F q = \mathbf{0}, \qquad \sum_{j=1}^{n} q_j = 1,$$
   and set the criterion weights to $w_j = q_j$. Written out row by row, the $i$-th equation of $F q = \mathbf{0}$ is the balance condition:
   $$\sum_{j \neq i} p_{ij} q_j = \left(\sum_{r \neq i} p_{ri}\right) q_i.$$
   Thus $-F^\top$ is the generator (out-degree Laplacian) of a continuous-time Markov chain on the criteria with transition rates $p_{ij} \ge 0$, and $q$ is its unique stationary distribution when $P$ has a single closed communicating class.

### Mathematical properties and edge-case analysis

1. **Equivalence of $(n+1) \times n$ least-squares and $n \times n$ last-row replacement:**
   Because every column of $F$ sums to zero ($\mathbf{1}^\top F = \mathbf{0}^\top$), the $n$-th row of $F$ is identically the negative sum of the first $n - 1$ rows: $\text{row}_n(F) = -\sum_{i=1}^{n-1} \text{row}_i(F)$. Consequently, for any vector $q \in \mathbb{R}^n$, if $(F q)_i = 0$ for $i = 1, \dots, n - 1$, then $(F q)_n = -\sum_{i=1}^{n-1} (F q)_i = 0$ holds automatically. Replacing the last row of $F$ with $\mathbf{1}^\top = [1, 1, \dots, 1]$ and solving the $n \times n$ square system $\tilde{F} q = [0, \dots, 0, 1]^\top$ by Gaussian elimination with partial pivoting is algebraically equivalent to solving $[F;\ \mathbf{1}^\top] q = [0, \dots, 0, 1]^\top$ (verified in NumPy to within $1.1 \times 10^{-15}$).

2. **Shared optimal alternatives ($k_a = k_b$) — partial vs. total overlap:**
   - *Partial overlap (two or more criteria share a winner, but at least two winners are distinct):* Suppose criteria $a \neq b$ achieve their optimum on the same alternative ($k_a = k_b$). Then rows $a$ and $b$ of $A$ and $P$ are identical ($p_{aj} = p_{bj}$ for all $j$, with $p_{aa} = p_{ab} = p_{ba} = p_{bb} = 0$). Subtracting row $b$ from row $a$ in $F q = \mathbf{0}$ gives
     $$f_{aa} q_a - f_{bb} q_b = 0 \implies \frac{q_a}{q_b} = \frac{|f_{bb}|}{|f_{aa}|} = \frac{\sum_{i} p_{ib}}{\sum_{i} p_{ia}}.$$
     Provided column losses are positive, $F$ still has rank $n - 1$ and $q$ remains uniquely determined! Both reference blocks of Zavadskas et al. (2017) exhibit this exact structure: in the Social block, `Senamiestis` (index 13) wins criteria 0 and 3 (`winners = [13, 5, 16, 13, 11]`, $\text{rank}(F) = 4$); in the Economic block, `Paneriai` (index 9) wins criteria 1 and 3 (`winners = [2, 9, 19, 9, 6]`, $\text{rank}(F) = 4$). The core emits a non-blocking warning `cilos.shared-optimum` whenever duplicate winner indices exist among active criteria.
   - *Total overlap ($k_1 = k_2 = \dots = k_n$) or singular reduced system ($\text{rank}(F_{\text{active}}) < n_{\text{active}} - 1$):* When a single alternative is simultaneously optimal on all active criteria, every row of $A$ is identical ($a_{ij} = a_{jj}$), so $P = 0$ and $F = 0$ ($\text{rank}(F) = 0$). More generally, if $\max |F_{\text{active}}| \le 10^{-12}$ or Gaussian elimination with partial pivoting encounters a near-zero pivot ($|\text{pivot}| \le 10^{-12}$) or non-positive weights, the core never returns `NaN`; it falls back to equal weights $1 / n_{\text{active}}$ on the active criteria (and $0$ on constant criteria), sets `diagnostics.zeroLoss = 1`, and emits `cilos.zero-loss-equal-weights` (plus `cilos.shared-optimum` when applicable).

3. **Constant columns (`isConstant`):**
   As noted by Zavadskas et al. (2017, Sec. 5.1.2, p. 11), if criterion $j$ is constant across all alternatives, $\bar{x}_{ij} = 1/m$, so $a_{ij} = a_{jj} = 1/m$ and column $j$ of $P$ and $F$ is all zeros, making the $n \times n$ homogeneous system rank-deficient. Furthermore, keeping row $j$ of $P$ with an arbitrary tie-broken winner $k_j = 0$ would inject alternative $0$'s losses into the remaining columns' diagonal sums $f_{cc}$ and distort their weights. Our implementation sets $\bar{x}_{ij} = 1/m$ for constant column $j$, zeroes both row $j$ and column $j$ of $P$ and $F$, assigns $w_j = 0$ with warning `cilos.constant-column`, and solves the reduced system on the active (non-constant) criteria subset. Consequently, adding or removing a constant criterion leaves the active criteria's weights invariant, while $F w = \mathbf{0}$ holds on the displayed $n \times n$ matrix $F$. If all columns are constant, `cilos.all-constant-equal-weights` is emitted and $w_j = 1/n$.

4. **Near-constant columns (`isNearConstant`):**
   Because $p_{ij} = (a_{jj} - a_{ij}) / a_{jj}$ rescales differences relative to the column maximum, a column that varies only by rounding noise can still affect the system; `cilos.near-constant-column` warns on any such column.

### Variants and library audit
- **`pyDecision` (`pyDecision/algorithm/cilos.py`) deviates with three verified bugs:**
  1. *Missing cost inversion (lines 33-36):* `if (criterion_type[j] == 'max'): X[:,j] = dataset[:,j] / np.min(dataset[:,j]) else: X[:,j] = dataset[:,j] / np.max(dataset[:,j])`. Both branches divide column $j$ by a positive scalar ($\min_i x_{ij}$ or $\max_i x_{ij}$), which cancels identically in line 37 (`X = X / np.sum(X, axis = 0)`). Cost criteria are **never inverted** ($\min_i x_{ij} / x_{ij}$ is omitted), so for cost criteria `np.argmax` selects the *highest-cost* (worst) alternative as the winner!
  2. *Random noise injection on constant columns (lines 28-31):* When `np.ptp(dataset[:, j]) == 0`, it overwrites the column with `np.random.uniform(1e-2, 1e-1, dataset.shape[0])`, making the function non-deterministic and assigning random positive weight to a constant column.
  3. *Silent zero-division mask (line 44):* Replaces `a_jj == 0` entries in $P$ with `0` without guarding `np.linalg.solve(F, B)` against singular matrices.
  Do **not** use `pyDecision` as an oracle when any criterion is `'cost'` or constant.
- **IDOCRIW (Zavadskas & Podvezko 2016):** Combines CILOS weights $q_j$ with raw-sum Shannon Entropy weights $W_j$ via product normalization $\omega_j = q_j W_j / \sum_{k=1}^{n} q_k W_k$.

## Commonly combined with
- **CILOS × Entropy → IDOCRIW**, then **EDAS / SAW / TOPSIS / COPRAS**: Zavadskas et al. (2017), DOI [10.3390/su9050702](https://doi.org/10.3390/su9050702).
- **CILOS / IDOCRIW + TOPSIS**: Pala (2021), *Kafkas Üniversitesi İİBF Dergisi* 12(23), 263-294, DOI [10.36543/kauiibfd.2021.013](https://doi.org/10.36543/kauiibfd.2021.013).
- **CILOS / IDOCRIW + CoCoSo**: Çiftaslan & Rençber (2022), *KSÜ Sosyal Bilimler Dergisi* 19(1), 53-71, DOI [10.33437/ksusbd.1135258](https://doi.org/10.33437/ksusbd.1135258).
- **CILOS compared alongside Entropy, IDOCRIW, CRITIC, D-CRITIC**: Krishnan et al. (2021), *Symmetry* 13(6), 973, DOI [10.3390/sym13060973](https://doi.org/10.3390/sym13060973).

## Pitfalls
1. **Non-positive data ($x_{ij} \le 0$):** Cost transformation $\min_i x_{ij} / x_{ij}$ fails at zero or negative values. Even on benefit columns, negative values can make $\sum_i x_{ij} < 0$ or $a_{ij} < 0$: in Pala (2021, Tables 7-10, 2020 dataset), negative net-profit and ROA values made the column sums negative ($-0.299$ and $-0.351$), flipping the signs of $\bar{x}_{ij}$ so the worst-performing firm (`PGSUS`, $-0.409$) became the apparent maximum of $\bar{X}$ ($+1.368$) and relative losses exceeded $1$ ($p_{ij} = 2.760$). Our implementation blocks any $x_{ij} \le 0$ with `non-positive-value`.
2. **Constant criterion:** Produces a zero column in $P$ and $F$; handled by giving the constant criterion weight $0$ (`cilos.constant-column`) and solving the reduced system on the varying criteria.
3. **Shared winning alternative across criteria:** Duplicate rows in $A$ and $P$ (`cilos.shared-optimum`); if a single alternative wins every active criterion, $P = 0$ and $F = 0$, falling back to equal weights across active criteria (`cilos.zero-loss-equal-weights`).

## Reference example (for tests & UI)

- **Primary source:** Zavadskas, E.K., Cavallaro, F., Podvezko, V., Ubarte, I., & Kaklauskas, A. (2017), *Sustainability* 9(5), 702, DOI [10.3390/su9050702](https://doi.org/10.3390/su9050702), Table 4 (21 Vilnius neighbourhoods across three blocks), Table 8 (Economic block weights), Table 10 (Social block weights), and Table 12 (Environmental block weights).
  **Note on row/column label permutations in the paper:** In Zavadskas et al. (2017), all three output tables (Tables 8, 10, 12) print the exact 4-decimal CILOS, Entropy, and IDOCRIW numbers on permuted criterion rows:
  - In **Table 10 (Social block, primary fixture)**, the first two rows (`educational_institutions_per_1000` and `kindergarten_places`) are swapped: printed CILOS is `[0.1924, 0.1277, 0.2993, 0.1180, 0.2626]`, whereas Table-4 column order gives `[0.1277, 0.1924, 0.2993, 0.1180, 0.2626]` (max abs diff `3.43e-5`). The exact same swap appears in the Entropy column of Table 10 (`[0.1185, 0.1439, 0.2638, 0.3546, 0.1192]` vs `[0.1439, 0.1185, 0.2638, 0.3546, 0.1192]`, max abs diff `3.6e-5`).
  - In **Table 8 (Economic block, secondary fixture)**, printed row $k$ corresponds to Table-4 column `perm[k]` with `perm = [2, 4, 0, 1, 3]`: printed CILOS is `[0.2132, 0.1933, 0.3188, 0.1369, 0.1378]`, whereas Table-4 column order gives `[0.3188, 0.1369, 0.2132, 0.1378, 0.1933]` (max abs diff `4.68e-5`).
  - In **Table 12 (Environmental block)**, rows 2 and 3 are swapped and the Entropy and CILOS column headers are exchanged (`[0.2934, 0.0147, 0.1026, 0.5894]`, max abs diff `4.6e-5`), plus IDOCRIW for green spaces is misprinted as `0.1606` instead of `0.4606` (the four printed IDOCRIW weights sum to `1.0001` only with `0.4606`).

```json
{
  "id": "cilos-zavadskas2017-social",
  "source": "Zavadskas et al. 2017, Sustainability 9(5):702, doi:10.3390/su9050702, Table 4 (input, social block), Table 10 CILOS (output; rows 1-2 swapped in paper)",
  "alternatives": ["Antakalnis", "Fabijoniškės", "Grigiškės", "Justiniškės", "Karoliniškės", "Lazdynai", "Naujamiestis", "Naujininkai", "Naujoji Vilnia", "Paneriai", "Pašilaičiai", "Pilaitė", "Rasos", "Senamiestis", "Šeškinė", "Verkiai", "Vilkpėdė", "Viršuliškės", "Žirmūnai", "Žvėrynas", "Šnipiškės"],
  "criteria": ["educational_institutions_per_1000", "kindergarten_places", "healthcare_institutions_per_1000", "recreational_facilities_per_1000", "crime_rate_per_1000"],
  "types": ["benefit", "benefit", "benefit", "benefit", "cost"],
  "matrix_transposed_by_criterion": {
    "educational_institutions_per_1000": [0.4366, 0.2515, 0.3563, 0.2549, 0.3667, 0.2894, 0.5596, 0.1925, 0.5454, 0.3876, 0.1513, 0.1969, 0.2831, 0.9256, 0.2553, 0.1897, 0.2811, 0.5430, 0.2588, 0.5416, 0.2607],
    "kindergarten_places": [1630, 1567, 634, 1731, 1541, 2104, 1507, 1371, 1250, 318, 1679, 551, 513, 1015, 2067, 1787, 1009, 897, 1479, 1002, 746],
    "healthcare_institutions_per_1000": [0.4622, 0.1006, 0.0891, 0.1821, 0.1100, 0.0965, 0.3444, 0.1283, 0.0962, 0.2584, 0.1513, 0.1476, 0.1887, 0.4628, 0.0638, 0.3319, 0.4685, 0.0679, 0.2804, 0.2708, 0.0652],
    "recreational_facilities_per_1000": [0.0770, 0.1006, 0.5345, 0.1457, 0.1834, 0.0965, 0.3874, 0.2566, 0.1283, 0.3876, 0.0908, 0.3445, 0.0944, 0.8227, 0.1596, 0.0948, 0.0937, 0.4751, 0.2157, 0.7221, 0.3911],
    "crime_rate_per_1000": [5.6497, 6.2627, 5.7907, 4.843, 5.6105, 4.7395, 13.1284, 15.2385, 8.9562, 13.6951, 5.9595, 4.5276, 13.7775, 13.421, 5.9681, 5.9983, 11.1965, 6.7195, 5.9737, 7.2207, 13.9486]
  },
  "published_as_printed": {
    "cilos": [0.1924, 0.1277, 0.2993, 0.1180, 0.2626],
    "entropy": [0.1185, 0.1439, 0.2638, 0.3546, 0.1192],
    "perm": [1, 0, 2, 3, 4]
  },
  "expected": {
    "winners": [13, 5, 16, 13, 11],
    "squareMatrix": [
      [0.122961, 0.038450, 0.105984, 0.141793, 0.025541],
      [0.038445, 0.079703, 0.022099, 0.016632, 0.072325],
      [0.037343, 0.038223, 0.107289, 0.016149, 0.030615],
      [0.122961, 0.038450, 0.105984, 0.141793, 0.025541],
      [0.026157, 0.020873, 0.033801, 0.059375, 0.075710]
    ],
    "lossMatrix": [
      [0.0,      0.517586, 0.012166, 0.0,      0.662648],
      [0.687338, 0.0,      0.794023, 0.882703, 0.044709],
      [0.696305, 0.520437, 0.0,      0.886107, 0.595624],
      [0.0,      0.517586, 0.012166, 0.0,      0.662648],
      [0.787273, 0.738118, 0.684952, 0.581257, 0.0     ]
    ],
    "systemMatrix": [
      [-2.170916,  0.517586,  0.012166,  0.0,       0.662648],
      [ 0.687338, -2.293726,  0.794023,  0.882703,  0.044709],
      [ 0.696305,  0.520437, -1.503308,  0.886107,  0.595624],
      [ 0.0,       0.517586,  0.012166, -2.350067,  0.662648],
      [ 0.787273,  0.738118,  0.684952,  0.581257, -1.965629]
    ],
    "weights_exact": [0.127703, 0.192405, 0.299334, 0.117968, 0.262590],
    "weights": [0.1277, 0.1924, 0.2993, 0.1180, 0.2626],
    "tolerance": 1e-4
  }
}
```

- **Secondary verified cases:**
  1. **Zavadskas et al. (2017) Economic block (Table 4 & Table 8):** 21 Vilnius neighbourhoods × 5 criteria (`housing_price`, `population_density`, `single_family_density`, `blocks_of_flats_density`, `jobs_per_1000`), types `["cost", "cost", "benefit", "cost", "benefit"]` (matrix in `tests/fixtures/entropy-zavadskas2017.json`).
     - Winners: `[2, 9, 19, 9, 6]` (`Grigiškės`, `Paneriai`, `Žvėrynas`, `Paneriai`, `Naujamiestis`).
     - Recomputed CILOS weights: `[0.318837, 0.136947, 0.213181, 0.137753, 0.193282]` vs Table 8 (after undoing `perm = [2, 4, 0, 1, 3]`): `[0.3188, 0.1369, 0.2132, 0.1378, 0.1933]` → **MATCH** (max abs diff `4.68e-5`).
  2. **Pala (2021) intermediate-matrix verification (`doi:10.36543/kauiibfd.2021.013`, Tables 7-10, 2019 dataset):** 7 BIST transportation firms × 8 financial ratios (`K1..K8`). From the positive 2019 normalized winner matrix $R$ (Table 9, where `TLMAN` wins `K1, K2, K3, K7, K8` and `BEYAZ` wins `K4, K6`), our $F$ diagonal `[-1.657, -2.670, -1.513, -5.203, -5.455, -5.010, -2.945, -2.395]` and normalized weights `q_j = [0.171, 0.106, 0.187, 0.092, 0.134, 0.095, 0.096, 0.118]` reproduce Table 10 to **exact 3-decimal precision** across all 8 criteria.

## Implementation notes
- Step keys emitted by `src/core/methods/cilos.ts`:
  - `cilos.normalized` (`matrix`: $\bar{X}_{m \times n}$, `axes: ['alternatives', 'criteria']`)
  - `cilos.squareMatrix` (`matrix`: $A_{n \times n}$, `axes: ['criteria', 'criteria']`)
  - `cilos.lossMatrix` (`matrix`: $P_{n \times n}$, `axes: ['criteria', 'criteria']`)
  - `cilos.systemMatrix` (`matrix`: $F_{n \times n}$, `axes: ['criteria', 'criteria']`)
  - `cilos.weights` (`vector`: $w_{1 \times n}$, `axes: 'criteria'`)
- Validation: any finite cell $x_{ij} \le 0$ emits a blocking `non-positive-value` error at `(row: i, col: j)`.
- Warning codes:
  - `cilos.constant-column` (per constant column $j$, weight $0$, excluded from reduced system)
  - `cilos.near-constant-column` (per near-constant column $j$)
  - `cilos.shared-optimum` (when two or more active criteria share the same winning alternative $k_a = k_b$)
  - `cilos.zero-loss-equal-weights` (when all active criteria share the same optimum or $\tilde{F}_{\text{active}}$ is singular so active criteria receive $1 / n_{\text{active}}$)
  - `cilos.all-constant-equal-weights` (when every column is constant, returning $1 / n$)

## Sources
- Mirkin, B.G. (1974). *Problema gruppovogo vybora*. Nauka, Moscow, p. 256 — attribution verified via Zavadskas & Podvezko (2016) and Zavadskas et al. (2017).
- Zavadskas, E.K. & Podvezko, V. (2016). "Integrated Determination of Objective CRIteria Weights in MCDM." *IJITDM* 15(2), 267-283, DOI [10.1142/S0219622016500036](https://doi.org/10.1142/S0219622016500036) — Crossref & OpenAlex metadata verified.
- Zavadskas, E.K., Cavallaro, F., Podvezko, V., Ubarte, I., & Kaklauskas, A. (2017). "MCDM Assessment of a Healthy and Safe Built Environment According to Sustainable Development Principles: A Practical Neighborhood Approach in Vilnius." *Sustainability* 9(5), 702, DOI [10.3390/su9050702](https://doi.org/10.3390/su9050702) — full text read, Sec. 5.1.2, Tables 4, 8, 10, 12.
- Pala, O. (2021). "BIST Ulaştırma Endeksinde IDOCRIW ve TOPSIS Yöntemleri ile Finansal Performans Analizi." *Kafkas Üniversitesi İktisadi ve İdari Bilimler Fakültesi Dergisi* 12(23), 263-294, DOI [10.36543/kauiibfd.2021.013](https://doi.org/10.36543/kauiibfd.2021.013) — full PDF read, Tables 3, 7, 8, 9, 10, 11.
- Çiftaslan, M.E. & Rençber, Ö.F. (2022). "IDOCRIW ve CoCoSo Yöntemleri ile Sistemik Önemli Bankaların Performanslarının İncelenmesi." *Kahramanmaraş Sütçü İmam Üniversitesi Sosyal Bilimler Dergisi* 19(1), 53-71, DOI [10.33437/ksusbd.1135258](https://doi.org/10.33437/ksusbd.1135258) — full PDF read, Tables 4, 7, 8, 9.
- Krishnan, A.R., Kasim, M.M., Hamid, R., & Ghazali, M.F. (2021). *Symmetry* 13(6), 973, DOI [10.3390/sym13060973](https://doi.org/10.3390/sym13060973) — full text read, Table 5.
- `pyDecision` source `pyDecision/algorithm/cilos.py` — read from GitHub master and audited.
