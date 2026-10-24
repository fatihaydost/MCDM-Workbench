# Rank-order weights: ROC, Rank Sum, Rank Reciprocal (roc)

- **Family:** weighting (subjective; ordinal rank-order approximation)
- **Origin:**
  - **ROC (Rank Order Centroid):** Barron, F.H. & Barrett, B.E. (1996). Decision Quality Using Ranked Attribute Weights. *Management Science* 42(11), 1515–1523. DOI [10.1287/mnsc.42.11.1515](https://doi.org/10.1287/mnsc.42.11.1515) (Crossref verified, 534 citations). Earlier formulation in SMARTS/SMARTER: Edwards, W. & Barron, F.H. (1994), *Organizational Behavior and Human Decision Processes* 60(3):306–325, DOI [10.1006/obhd.1994.1087](https://doi.org/10.1006/obhd.1994.1087). Independent derivation as "centralized weights": Solymosi, T. & Dombi, J. (1986), *European Journal of Operational Research* 26(1):35–41, DOI [10.1016/0377-2217(86)90157-8](https://doi.org/10.1016/0377-2217(86)90157-8) (cited in Roszkowska 2013 as 1985/1986).
  - **Rank Sum (RS) and Rank Reciprocal (RR):** Stillwell, W.G., Seaver, D.A. & Edwards, W. (1981). A comparison of weight approximation techniques in multiattribute utility decision making. *Organizational Behavior and Human Performance* 28(1), 62–77. DOI [10.1016/0030-5073(81)90015-5](https://doi.org/10.1016/0030-5073(81)90015-5) (Crossref verified, 392 citations).
  - **Comparative overview and numerical example:** Roszkowska, E. (2013). Rank Ordering Criteria Weighting Methods – a Comparative Overview. *Optimum. Studia Ekonomiczne* 5(65), 14–33. DOI [10.15290/ose.2013.05.65.02](https://doi.org/10.15290/ose.2013.05.65.02) (read in full from the University of Bialystok repository PDF; 275 Crossref citations).
- **Popularity:** Crossref cited-by 534 (Barron & Barrett 1996), 392 (Stillwell et al. 1981), 275 (Roszkowska 2013), 118 (Solymosi & Dombi 1986). Standard surrogate-weight family in multiattribute utility theory (SMARTER) and MCDM.

## For users (site copy)
- **EN:** ROC, Rank Sum and Rank Reciprocal turn a ranking of criteria into weights. ROC, the usual default, favours the top criterion, Rank Sum falls in equal steps and Rank Reciprocal drops sharply.
- **TR:** ROC, sıra toplamı ve ters sıra, kriterlerin sıralamasını ağırlığa çevirir. Genelde varsayılan olan ROC ilk kritere belirgin pay verir, sıra toplamı eşit adımlarla azalır, ters sıra hızla düşer.

## When to use / when not
- **Use when:**
  - Only ordinal importance information is available or agreed on (group decisions, time pressure, qualitative criteria).
  - Decision makers can order criteria from most to least important more reliably than they can assign ratio judgements or point weights.
- **Do not use when:**
  - The decision maker can quantify importance ratios or trade-offs: use BWM, AHP or SWARA.
  - Ties are frequent: the classical formulas assume a strict ranking (tied positions must be averaged).

## Inputs
- Number of criteria $n \ge 1$ from the problem (`problem.criteria.length`). Decision matrix values $x_{ij}$ and criterion directions (`benefit` / `cost`) are validated for problem integrity (`validateProblem`) but are not used in the weight formulas.
- Criterion importance ranks $r_j \in \{1, \dots, n\}$ ($1 = \text{most important}$, $n = \text{least important}$):
  - Default when `params.ranks` is omitted: table column order $r_j = j + 1$ for 0-based column index $j \in \{0, \dots, n - 1\}$ (i.e., $r_1 = 1, r_2 = 2, \dots, r_n = n$).
  - Optional `params.ranks?: readonly number[]`: custom importance rank per criterion.
- Parameter `formula` (`kind: 'choice'`, options `['roc', 'rs', 'rr']`, default `'roc'`):
  - `'roc'`: Rank Order Centroid (Barron & Barrett 1996; Solymosi & Dombi 1986; Roszkowska 2013 Eq. 9).
  - `'rs'`: Rank Sum (Stillwell et al. 1981; Roszkowska 2013 Eq. 6).
  - `'rr'`: Rank Reciprocal / Inverse weights (Stillwell et al. 1981; Roszkowska 2013 Eq. 8).

## Algorithm
1. **Strict-rank position weights.** For $n$ criteria and 1-based rank position $k \in \{1, \dots, n\}$:
   - **Rank Order Centroid (`'roc'`, default; Roszkowska 2013 Eq. 9):**
     $$w_{\text{strict}}(k) = \frac{1}{n}\sum_{i=k}^{n} \frac{1}{i}$$
     Geometrically, the ordered weight simplex $S_n = \{w \in \mathbb{R}^n : w_1 \ge w_2 \ge \dots \ge w_n \ge 0,\ \sum_{j=1}^n w_j = 1\}$ has $n$ extreme vertices $v^{(i)} = (\underbrace{1/i, \dots, 1/i}_{i}, 0, \dots, 0)$ for $i = 1, \dots, n$. Under a uniform distribution over $S_n$, the expected weight vector (centroid of $S_n$) is $\frac{1}{n}\sum_{i=1}^n v^{(i)}$, whose $k$-th component is $\frac{1}{n}\sum_{i=k}^n \frac{1}{i}$.
   - **Rank Sum (`'rs'`; Roszkowska 2013 Eq. 6):**
     $$w_{\text{strict}}(k) = \frac{n - k + 1}{\sum_{i=1}^{n}(n - i + 1)} = \frac{2(n + 1 - k)}{n(n + 1)}$$
   - **Rank Reciprocal (`'rr'`; Roszkowska 2013 Eq. 8):**
     $$w_{\text{strict}}(k) = \frac{1 / k}{\sum_{i=1}^{n}(1 / i)} = \frac{1}{k\,H_n}, \qquad H_n = \sum_{i=1}^{n}\frac{1}{i}$$

2. **Rank assignment and tie averaging.**
   - If `params.ranks` is omitted (or has length $\ne n$ or non-finite entries), each criterion takes its 1-based column position $r_j = j + 1$ ($j = 0, \dots, n - 1$), which is a strict permutation $(1, 2, \dots, n)$ with $w_j = w_{\text{strict}}(j + 1)$.
   - For general `params.ranks` of length $n$: sort criterion indices $0, \dots, n - 1$ by `ranks[j]` ascending. If a group of $m_{\text{tie}} \ge 1$ criteria share the same input rank value and occupy 1-based sorted positions $p, p + 1, \dots, p + m_{\text{tie}} - 1$, each criterion in the tie group receives:
     - Effective mid-rank:
       $$\bar{r}_j = p + \frac{m_{\text{tie}} - 1}{2}$$
     - Averaged position weight:
       $$w_j = \frac{1}{m_{\text{tie}}} \sum_{k=p}^{p + m_{\text{tie}} - 1} w_{\text{strict}}(k)$$
     When the input ranks are a strict permutation of $\{1, \dots, n\}$, $m_{\text{tie}} = 1$ everywhere, so $\bar{r}_j = r_j$ and $w_j = w_{\text{strict}}(r_j)$. When all criteria are tied, $w_j = 1/n$.

3. **Emitted steps:**
   - `roc.ranks` (`vector`, `axes: 'criteria'`): effective criterion ranks $\bar{r}_j$.
   - `roc.weights` (`vector`, `axes: 'criteria'`): criterion weights $w_j$.

### Mathematical properties
- **Exact closed-form normalization:** For all three formulas and any tie structure, $\sum_{j=1}^n w_j = \sum_{k=1}^n w_{\text{strict}}(k) = 1$ without a post-hoc normalization pass:
  - ROC: $\sum_{k=1}^n \frac{1}{n}\sum_{i=k}^n \frac{1}{i} = \frac{1}{n}\sum_{i=1}^n i \cdot \frac{1}{i} = 1$.
  - RS: $\sum_{k=1}^n \frac{2(n + 1 - k)}{n(n + 1)} = \frac{2}{n(n + 1)} \cdot \frac{n(n + 1)}{2} = 1$.
  - RR: $\sum_{k=1}^n \frac{1/k}{\sum_{i=1}^n 1/i} = 1$.
- **Strict monotonicity:** For strict ranks $1 \le k < m \le n$, $w_{\text{strict}}(k) > w_{\text{strict}}(m)$ under all three formulas.
- **Steepness and tail behaviour:**
  - Adjacent step differences for ROC are $w_{\text{ROC}}(k) - w_{\text{ROC}}(k+1) = \frac{1}{n k}$, which is largest between ranks 1 and 2 ($1/n$) and shrinks hyperbolically.
  - Adjacent step differences for RS are constant: $w_{\text{RS}}(k) - w_{\text{RS}}(k+1) = \frac{2}{n(n+1)}$.
  - At the least important criterion ($k = n$), ROC always assigns the smallest weight among the three formulas for $n \ge 2$:
    $$w_{\text{ROC}}(n) = \frac{1}{n^2} < w_{\text{RS}}(n) = \frac{2}{n(n+1)} < w_{\text{RR}}(n) = \frac{1}{n H_n} < \frac{1}{n}$$
    (with $w_{\text{RS}}(2) = w_{\text{RR}}(2) = 1/3$ at $n = 2$).
  - At the most important criterion ($k = 1$), $w_{\text{ROC}}(1) = \frac{H_n}{n}$, $w_{\text{RR}}(1) = \frac{1}{H_n}$, and $w_{\text{RS}}(1) = \frac{2}{n+1}$. Because $H_n > \sqrt{n}$ for $n \in \{2, 3, 4, 5, 6\}$ and $H_n < \sqrt{n}$ for $n \ge 7$, $w_{\text{ROC}}(1) > w_{\text{RR}}(1)$ for $2 \le n \le 6$ and $w_{\text{RR}}(1) > w_{\text{ROC}}(1)$ for $n \ge 7$.
- **Sign and scale invariance:** Weights depend only on $n$ and the ordinal ranks $r_j$, not on the decision matrix entries $x_{ij}$; negative, zero, or constant columns do not alter $w_j$.

**Variants not implemented:** Rank Exponent $w_j(\text{RE}) = (n - r_j + 1)^p / \sum_{k=1}^n (n - r_k + 1)^p$ (Roszkowska 2013 Eq. 7, requiring an extra dispersion exponent $p \ge 0$, which reduces to EW at $p = 0$ and RS at $p = 1$) and geometric weights (Lootsma 1996). In `pyDecision` 5.1.1, `roc_method(criteria_rank)` and `rsw_method(criteria_rank)` take an ordered list of criterion labels `['C3', 'C1', 'C4', 'C2']` and return weights in `C1..Cn` order; RR is not in `pyDecision`.

## Commonly combined with
- **ROC / RS / RR + SAW:** Roszkowska (2013), Section 7, Tables 5–6, DOI [10.15290/ose.2013.05.65.02](https://doi.org/10.15290/ose.2013.05.65.02) (5 alternatives $\times$ 5 criteria).
- **ROC + SMARTER (multiattribute utility):** Edwards & Barron (1994), DOI [10.1006/obhd.1994.1087](https://doi.org/10.1006/obhd.1994.1087); Barron & Barrett (1996), DOI [10.1287/mnsc.42.11.1515](https://doi.org/10.1287/mnsc.42.11.1515).
- **Comparison with AHP:** Roszkowska (2013), Section 5, Table 3 ($n = 5$ pairwise matrices $A_{\text{ROC}}, A_{\text{RS}}, A_{\text{RR}}$ vs rank formulas); Olson & Dorai (1992), *EJOR* 60(1):117–129, DOI [10.1016/0377-2217(92)90339-B](https://doi.org/10.1016/0377-2217(92)90339-B).

## Pitfalls
- **Default column-order assumption:** When no custom rank vector is supplied, criteria are ranked in table column order ($r_1 = 1, \dots, r_n = n$). Put the most important criterion in the first column, or reorder columns accordingly.
- **Ties:** The classical formulas assume a strict ranking $1 \dots n$. Averaging the weights of tied positions preserves $\sum w_j = 1$ and is the standard nonparametric mid-rank extension, though not covered in Roszkowska (2013).
- **Extreme top-heaviness for small $n$:** For $n = 2$, ROC gives $(0.75, 0.25)$ (a $3:1$ ratio); for $n = 3$, $(0.6111, 0.2778, 0.1111)$ (over $61\%$ on the first criterion). If criteria are closer in importance, RS gives a gentler linear decline.
- **Label-order vs rank-vector convention:** Rank $1$ means most important. Libraries like `pyDecision` pass an ordered list of criterion names instead of a rank vector per criterion, which yields the inverse permutation if confused.

## Reference example (test fixture)
- **Primary source:** Roszkowska, E. (2013). Rank Ordering Criteria Weighting Methods – a Comparative Overview. *Optimum. Studia Ekonomiczne* 5(65), 14–33, DOI [10.15290/ose.2013.05.65.02](https://doi.org/10.15290/ose.2013.05.65.02):
  1. **Table 4 (p. 25), "Approximations for criteria weights given by used different formulas, in case of $n = 2, \dots, 7$ criteria":**
     - Row $n = 2$:
       - Exact: ROC $(3/4, 1/4) = (0.75, 0.25)$, RR $(2/3, 1/3) \approx (0.6667, 0.3333)$, RS $(2/3, 1/3) \approx (0.6667, 0.3333)$, EW $(1/2, 1/2)$.
       - Printed (2 d.p.): ROC `[0.75, 0.25]`, RR `[0.67, 0.33]`, RS `[0.67, 0.33]` (`w1=067` missing decimal point in print).
     - Row $n = 3$:
       - Exact: ROC $(11/18, 5/18, 2/18) \approx (0.61111, 0.27778, 0.11111)$, RR $(6/11, 3/11, 2/11) \approx (0.54545, 0.27273, 0.18182)$, RS $(3/6, 2/6, 1/6) \approx (0.50000, 0.33333, 0.16667)$.
       - Printed (2 d.p.): ROC `[0.62, 0.28, 0.12]` (sums to `1.02`; true 2-d.p. rounding is `[0.61, 0.28, 0.11]`), RR `[0.55, 0.27, 0.18]` (`w2=027` missing decimal point in print), RS `[0.50, 0.33, 0.17]`.
     - **Row $n = 4$ (exact 2-decimal match across all three formulas):**
       - Exact:
         - ROC: $(25/48, 13/48, 7/48, 3/48) = (0.5208333333, 0.2708333333, 0.1458333333, 0.0625)$
         - RR: $(12/25, 6/25, 4/25, 3/25) = (0.48, 0.24, 0.16, 0.12)$
         - RS: $(4/10, 3/10, 2/10, 1/10) = (0.40, 0.30, 0.20, 0.10)$
         - EW: $(1/4, 1/4, 1/4, 1/4) = (0.25, 0.25, 0.25, 0.25)$
       - Printed (2 d.p.): ROC `[0.52, 0.27, 0.15, 0.06]`, RR `[0.48, 0.24, 0.16, 0.12]`, RS `[0.40, 0.30, 0.20, 0.10]`. Every entry matches its exact value rounded to 2 decimal places (max abs diff $4.17 \times 10^{-3}$ for ROC, $0$ for RS and RR).
     - Row $n = 5$ (also printed in Table 3, p. 24, and used in Section 7, pp. 28–30):
       - Exact:
         - ROC: $(137/300, 77/300, 47/300, 27/300, 12/300) \approx (0.4566666667, 0.2566666667, 0.1566666667, 0.09, 0.04)$
         - RR: $(60/137, 30/137, 20/137, 15/137, 12/137) \approx (0.4379562044, 0.2189781022, 0.1459854015, 0.1094890511, 0.0875912409)$
         - RS: $(5/15, 4/15, 3/15, 2/15, 1/15) \approx (0.3333333333, 0.2666666667, 0.20, 0.1333333333, 0.0666666667)$
       - Printed (2 d.p. in Tables 3 and 4):
         - ROC: `[0.45, 0.26, 0.16, 0.09, 0.04]` ($w_1 = 0.4567$ rounded down to $0.45$ so the five 2-decimal numbers sum to $1.00$ instead of $1.01$).
         - RR: `[0.44, 0.22, 0.14, 0.11, 0.09]` ($w_3 = 0.1460$ rounded down to $0.14$ so the column sums to $1.00$).
         - RS: `[0.33, 0.27, 0.21, 0.12, 0.07]` in Table 4 and Table 3 row RS ($w_3 = 0.20, w_4 = 0.1333$ printed as $0.21, 0.12$; note Table 3 row `AHP (ARS matrix)` prints the true 2-d.p. vector `[0.33, 0.27, 0.20, 0.13, 0.07]`).
     - Row $n = 6$:
       - Exact:
         - ROC: $(49/120, 29/120, 19/120, 37/360, 22/360, 10/360) \approx (0.40833, 0.24167, 0.15833, 0.10278, 0.06111, 0.02778)$
         - RR: $(20/49, 10/49, 20/147, 5/49, 4/49, 10/147) \approx (0.40816, 0.20408, 0.13605, 0.10204, 0.08163, 0.06803)$
         - RS: $(6/21, 5/21, 4/21, 3/21, 2/21, 1/21) \approx (0.28571, 0.23810, 0.19048, 0.14286, 0.09524, 0.04762)$
       - Printed (2 d.p.): ROC `[0.41, 0.24, 0.16, 0.10, 0.06, 0.03]` (matches 2-d.p. rounding!), RR `[0.41, 0.21, 0.13, 0.10, 0.08, 0.07]` ($w_2, w_3$ adjusted by $\pm 0.01$), RS `[0.29, 0.24, 0.19, 0.14, 0.09, 0.05]` ($w_5 = 0.0952$ rounded down to $0.09$ to sum to $1.00$).
     - Row $n = 7$:
       - Exact:
         - ROC: $(363/980, 223/980, 153/980, 319/2940, 207/2940, 117/2940, 45/2940) \approx (0.37041, 0.22755, 0.15612, 0.10850, 0.07041, 0.03980, 0.02041)$
         - RR: $(140/363, 70/363, 140/1089, 35/363, 28/363, 70/1089, 20/363) \approx (0.38567, 0.19284, 0.12856, 0.09642, 0.07713, 0.06428, 0.05510)$
         - RS: $(7/28, 6/28, 5/28, 4/28, 3/28, 2/28, 1/28) = (0.25, 0.21429, 0.17857, 0.14286, 0.10714, 0.07143, 0.03571)$
       - Printed (2 d.p.): ROC `[0.37, 0.23, 0.16, 0.11, 0.07, 0.04, 0.02]` (matches 2-d.p. rounding!), RR `[0.39, 0.19, 0.13, 0.09, 0.08, 0.07, 0.05]` ($w_4, w_6, w_7$ adjusted by $\pm 0.01$), RS `[0.25, 0.21, 0.18, 0.14, 0.11, 0.07, 0.04]` (matches 2-d.p. rounding!).

  2. **Section 7 worked example (Tables 5–6, pp. 28–30): 5 alternatives $\times$ 5 criteria with SAW:**
     - Alternatives: $A_1, A_2, A_3, A_4, A_5$.
     - Criteria in rank order $r = (1, 2, 3, 4, 5)$: $C_1, C_2, C_3$ (`benefit`), $C_4, C_5$ (`cost`).
     - Decision matrix $D$ (Table 5, p. 29):
       $$D = \begin{bmatrix} 15 & 5 & 3 & 6 & 10 \\ 20 & 3 & 7 & 4 & 25 \\ 10 & 2 & 20 & 1 & 10 \\ 20 & 10 & 3 & 3 & 20 \\ 15 & 8 & 7 & 4 & 10 \end{bmatrix}$$
     - Min-max normalized matrix $C$ (Eqs. 2–3, p. 16):
       $$C = \begin{bmatrix} 0.5 & 0.375 & 0 & 0 & 1 \\ 1 & 0.125 & 4/17 & 0.4 & 0 \\ 0 & 0 & 1 & 1 & 1 \\ 1 & 1 & 0 & 0.6 & 1/3 \\ 0.5 & 0.75 & 4/17 & 0.4 & 1 \end{bmatrix}$$
     - Reconciliation of Table 6 (p. 30) SAW scores $S = C w$:
       - **ROC:** Using the Table 4 printed weights $w_{\text{ROC, T4}} = (0.45, 0.26, 0.16, 0.09, 0.04)$ gives $S = (0.36250, 0.55615, 0.29000, 0.77733, 0.53365)$, which rounds to `[0.362, 0.556, 0.290, 0.777, 0.534]` (exact match to Table 6) with ranking $A_4 \succ A_2 \succ A_5 \succ A_1 \succ A_3$. Using exact ROC weights $(137/300, 77/300, 47/300, 27/300, 12/300)$ gives $S = (0.36458, 0.56161, 0.28667, 0.78067, 0.53370)$ and the same ranking $A_4 \succ A_2 \succ A_5 \succ A_1 \succ A_3$.
       - **RR:** Using true 2-d.p. rounded RR weights $(0.44, 0.22, 0.15, 0.11, 0.09)$ gives $S = (0.39250, 0.54676, 0.35000, 0.75600, 0.55429)$, which rounds to `[0.392, 0.547, 0.350, 0.756, 0.554]` (exact match to Table 6) with ranking $A_4 \succ A_5 \succ A_2 \succ A_1 \succ A_3$. Exact RR weights give $S = (0.38869, 0.54347, 0.34307, 0.75182, 0.54895)$ and the same ranking.
       - **RS:** Using true 2-d.p. rounded RS weights $(0.33, 0.27, 0.20, 0.13, 0.07)$ gives $S = (0.33625, 0.46281, 0.40000, 0.70133, 0.53656)$, which rounds to `[0.336, 0.463, 0.400, 0.701, 0.537]` (exact match to Table 6) with ranking $A_4 \succ A_5 \succ A_2 \succ A_3 \succ A_1$. Exact RS weights give $S = (0.33333, 0.46706, 0.40000, 0.70222, 0.53373)$ and the same ranking.
       - **EW:** $w = (0.2, 0.2, 0.2, 0.2, 0.2)$ gives $S = (0.37500, 0.35206, 0.60000, 0.58667, 0.57706)$, which rounds to `[0.375, 0.352, 0.600, 0.587, 0.577]` (exact match to Table 6) with ranking $A_3 \succ A_4 \succ A_5 \succ A_1 \succ A_2$.

- **Fixture (`tests/fixtures/roc-roszkowska2013.json`):** Stores both the $5 \times 5$ decision matrix problem from Roszkowska (2013) Table 5–6 and the complete $n = 2 \dots 7$ Table 4 weight lookup (published 2-d.p. values and exact closed-form vectors).

## Implementation notes
- `src/core/methods/roc.ts` implements `roc: WeightingMethod<RocParams>` with `params: [{ key: 'formula', kind: 'choice', options: ['roc', 'rs', 'rr'], default: 'roc' }]`.
- `RocParams` accepts `{ formula?: 'roc' | 'rs' | 'rr'; ranks?: readonly number[] }`.
- Closed-form $O(n \log n)$ computation (sorting for tie handling).

## Sources
- Barron, F.H. & Barrett, B.E. (1996). Decision Quality Using Ranked Attribute Weights. *Management Science* 42(11), 1515–1523. DOI [10.1287/mnsc.42.11.1515](https://doi.org/10.1287/mnsc.42.11.1515).
- Stillwell, W.G., Seaver, D.A. & Edwards, W. (1981). A comparison of weight approximation techniques in multiattribute utility decision making. *Organizational Behavior and Human Performance* 28(1), 62–77. DOI [10.1016/0030-5073(81)90015-5](https://doi.org/10.1016/0030-5073(81)90015-5).
- Solymosi, T. & Dombi, J. (1986). A method for determining the weights of criteria: The centralized weights. *European Journal of Operational Research* 26(1), 35–41. DOI [10.1016/0377-2217(86)90157-8](https://doi.org/10.1016/0377-2217(86)90157-8).
- Edwards, W. & Barron, F.H. (1994). SMARTS and SMARTER: Improved Simple Methods for Multiattribute Utility Measurement. *Organizational Behavior and Human Decision Processes* 60(3), 306–325. DOI [10.1006/obhd.1994.1087](https://doi.org/10.1006/obhd.1994.1087).
- Roszkowska, E. (2013). Rank Ordering Criteria Weighting Methods – a Comparative Overview. *Optimum. Studia Ekonomiczne* 5(65), 14–33. DOI [10.15290/ose.2013.05.65.02](https://doi.org/10.15290/ose.2013.05.65.02).
- `pyDecision` 5.1.1, `algorithm/roc.py` (`roc_method`) and `algorithm/rsw.py` (`rsw_method`), https://github.com/Valdecy/pyDecision.
