# Step-wise Weight Assessment Ratio Analysis (SWARA)

**Verified against primary sources:** Keršulienė, Zavadskas & Turskis (2010), *Journal of Business Economics and Management* 11(2), 243–258, Sec. 3–4, Figs. 2–4, Table 1 (full PDF verified); Aytaç Adalı & Tuş Işık (2017), *IREM* 5(4), 56–77, Table 4 (secondary fixture with non-identity importance permutation).

- **Family:** weighting (subjective, step-wise ratio)
- **Origin:** Keršulienė, V., Zavadskas, E.K. & Turskis, Z. (2010). Selection of rational dispute resolution method by applying new step-wise weight assessment ratio analysis (SWARA). *Journal of Business Economics and Management* 11(2), 243–258. DOI [10.3846/jbem.2010.12](https://doi.org/10.3846/jbem.2010.12)
- **Popularity:** Crossref cited-by 829 (origin paper). OpenAlex title/abstract mentions: 558 works (rank 12 overall, #3 subjective weighting after AHP and BWM); 59% since 2023. TR 2021 survey: 10 uses (#8 overall).

## For users (site copy)
- **EN:** Order the criteria from most to least important, then for each criterion from the second on say how much less important it is than the one just above it ($s_j \ge 0$). SWARA chains those step-down ratios into weights that sum to one, asking $n-1$ comparisons instead of AHP's $n(n-1)/2$ and requiring no optimization solver.
- **TR:** Kriterleri en önemliden en az önemliye sıralayın; ikinciden başlayarak her kriterin bir üstündekinden ne kadar daha az önemli olduğunu ($s_j \ge 0$) belirtin. SWARA bu ardışık oranları toplamı bire eşit ağırlıklara dönüştürür; AHP'nin $n(n-1)/2$ karşılaştırması yerine yalnız $n-1$ karşılaştırma ister ve optimizasyon çözücüsü gerektirmez.

## When to use / when not
- **Use when:** experts can order criteria and state incremental importance drops between adjacent ranks; you want a fast, transparent alternative to AHP or BWM with no LP solver.
- **Do not use when:** you need a formal consistency check (SWARA has none, since $n-1$ adjacent comparisons form a tree with no redundant cycles); experts cannot agree on the initial rank ordering.

## Inputs
- Criteria $C_1, \dots, C_n$ ordered by decreasing importance: $j = 1$ most important, $j = n$ least important. (In code: default column order `[0, 1, ..., n - 1]`, or an explicit permutation `order` of `0..n-1` where `order[0]` is the most important criterion index.)
- For $j = 2, \dots, n$: comparative importance of average value $s_j \ge 0$, representing how much less important criterion $j$ is than criterion $j - 1$ (e.g. $s_j = 0.15$ means criterion $(j-1)$ is $15\%$ more significant than criterion $j$, so $q_j = q_{j-1} / 1.15$). By convention $s_1 = 0$ for the first criterion.
- When an explicit $s$ vector is not supplied (e.g. in the workbench stage preset selector), a uniform step ratio $s_j = s$ ($j \ge 2$) is controlled by `stepRatio`:
  - `'gentle'` $\to s_j = 0.10$ ($k_j = 1.10$)
  - `'moderate'` (default) $\to s_j = 0.15$ ($k_j = 1.15$, matching $s_2 = 0.15$ in Keršulienė et al. 2010 Table 1)
  - `'steep'` $\to s_j = 0.25$ ($k_j = 1.25$)

## Algorithm (Keršulienė, Zavadskas & Turskis 2010, Fig. 2 & Table 1, pp. 250–252)
Given criteria in decreasing importance order $j = 1, \dots, n$:
1. **Comparative importance ($s_j$):** $s_1 = 0$, and $s_j \ge 0$ for $j = 2, \dots, n$.
2. **Coefficient ($k_j$):**
   $$k_j = \begin{cases} 1, & j = 1 \\ s_j + 1, & j > 1 \end{cases}$$
3. **Recalculated weight ($q_j$):**
   $$q_j = \begin{cases} 1, & j = 1 \\ \dfrac{q_{j-1}}{k_j} = \dfrac{q_{j-1}}{1 + s_j}, & j > 1 \end{cases}$$
4. **Relative (final) weight ($w_j$):**
   $$w_j = \frac{q_j}{\sum_{k=1}^{n} q_k}$$
5. If a custom permutation `order` was supplied, map $s, k, q, w$ from rank position $r \in \{0, \dots, n-1\}$ back to original criterion index `c = order[r]`.

### Emitted calculation steps (`src/core/methods/swara.ts`)
1. `swara.s` (`vector`, `axes: 'criteria'`): comparative importance $s_j$ ($s_1 = 0$ for the top-ranked criterion).
2. `swara.k` (`vector`, `axes: 'criteria'`): step coefficient $k_j = 1 + s_j$ ($k_1 = 1$).
3. `swara.q` (`vector`, `axes: 'criteria'`): recalculated unnormalized weight $q_1 = 1,\; q_j = q_{j-1} / k_j$.
4. `swara.weights` (`vector`, `axes: 'criteria'`): normalized weight $w_j = q_j / \sum_{r=1}^{n} q_r$.

## Commonly combined with
- **SWARA + WASPAS** (224 papers, highest pairing — Lithuania school standard: Zavadskas/Turskis group; e.g. Aytaç Adalı & Tuş Işık 2017)
- **SWARA + COPRAS** (148), **SWARA + TOPSIS** (129), **SWARA + ARAS** (101), **SWARA + MARCOS** (82), **SWARA + CoCoSo** (81), **SWARA + VIKOR** (68), **SWARA + MABAC** (65), **SWARA + EDAS** (60), **SWARA + MOORA** (58)

## Pitfalls
- **No consistency ratio:** Because $n-1$ adjacent comparisons form a chain, any non-negative $s_j$ vector is algebraically consistent; errors in expert ordering or step sizes cannot be flagged by a CR test.
- **Scale ambiguity of $s_j$:** Some authors elicit $s_j$ in $[0, 1]$ (fractions/percentages divided by 100, as in Keršulienė et al. 2010 where experts score $0, 0.1, \dots, 1.0$), while others allow $s_j > 1$. Only $s_j \ge 0$ is required mathematically so that $k_j \ge 1$ and $q_1 \ge q_2 \ge \dots \ge q_n > 0$. Negative $s_j < 0$ violates the decreasing importance order and throws `RangeError`.
- **Group aggregation:** In Keršulienė et al. (2010), multiple experts' step-down assessments are averaged arithmetic-mean style before computing $k_j = 1 + s_j$.
- **All $s_j = 0$:** Every $k_j = 1$ and $q_j = 1$, yielding equal weights $w_j = 1/n$.

## Reference examples (test fixtures)

### A. Primary fixture: Keršulienė, Zavadskas & Turskis (2010), Table 1 (p. 252)
- **Problem context (Sec. 4, pp. 251–252):** Choosing a rational commercial dispute resolution method in Lithuania among four alternatives — **Negotiation**, **Mediation**, **Arbitration**, and **Litigation** — evaluated across $n = 6$ criteria ordered by decreasing importance (Figs. 3–4, Table 1):
  1. $x_1$: Expedition of dispute resolution
  2. $x_2$: Price of dispute resolution
  3. $x_3$: Possibility to appeal
  4. $x_4$: Assurance of confidentiality
  5. $x_5$: Authority of person solving the dispute
  6. $x_6$: Legal advice
- **Table 1 comparison (published 2 d.p. vs exact IEEE 754 double precision):**

| Rank $j$ | Criterion | $s_j$ | $k_j$ | $q_j$ (paper) | $q_j$ (exact) | $w_j$ (paper) | $w_j$ (exact) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | $x_1$ Expedition of dispute resolution | — ($0$) | $1.00$ | $1.00$ | $1.0000000000000000$ | $0.22$ | $0.21737743167382914$ |
| 2 | $x_2$ Price of dispute resolution | $0.15$ | $1.15$ | $0.87$ | $0.8695652173913044$ | $0.19$ | $0.18902385362941665$ |
| 3 | $x_3$ Possibility to appeal | $0.04$ | $1.04$ | $0.84$ | $0.8361204013377928$ | $0.18$ | $0.18175370541290065$ |
| 4 | $x_4$ Assurance of confidentiality | $0.29$ | $1.29$ | $0.65$ | $0.6481553498742579$ | $0.14$ | $0.14089434528131830$ |
| 5 | $x_5$ Authority of person solving the dispute | $0.02$ | $1.02$ | $0.64$ | $0.6354464214453509$ | $0.14$ | $0.13813171106011599$ |
| 6 | $x_6$ Legal advice | $0.04$ | $1.04$ | $0.61$ | $0.6110061744666836$ | $0.13$ | $0.13281895294241924$ |
| **Sum** | | | | **$4.61$** | **$4.600293564515390$** | **$1.00$** | **$1.0000000000000000$** |

- Every exact $q_j$ and $w_j$ rounds to the exact 2-decimal number printed in Table 1 (maximum absolute difference vs published 2-d.p. weights is $0.00282 < 0.005$).

### B. Secondary cross-check: Aytaç Adalı & Tuş Işık (2017), Table 4 (p. 69)
- **Source:** Aytaç Adalı, E. & Tuş Işık, A. (2017). *IREM* 5(4), 56–77, Table 4 (supplier selection, 6 criteria `C1..C6`).
- **Importance order:** `C1, C6, C3, C2, C4, C5` (`order = [0, 5, 2, 1, 3, 4]`).
- **Step ratios in sorted order:** $s = [0, 0.10, 0.15, 0.10, 0.25, 0.083]$.
- **Recomputed weights in original criterion order `C1..C6`:** `[0.2210, 0.1589, 0.1747, 0.1271, 0.1173, 0.2009]`, matching the paper's 3-d.p. `[0.221, 0.159, 0.175, 0.127, 0.117, 0.201]` (used in `waspas-adali2017.json` and `adali-2017-suppliers`) to within $1.5 \times 10^{-4}$.
