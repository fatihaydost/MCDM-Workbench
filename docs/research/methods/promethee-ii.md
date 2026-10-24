# PROMETHEE II (promethee-ii)

- **Family:** ranking (outranking; valued pairwise preference, net-flow exploitation)
- **Origin:** Brans, J.-P., Vincke, Ph. & Mareschal, B. (1986). How to select and how to rank projects: The PROMETHEE method. *European Journal of Operational Research* 24(2), 228–238. DOI [10.1016/0377-2217(86)90044-5](https://doi.org/10.1016/0377-2217(86)90044-5). First presented by Brans in 1982 (Université Laval); companion paper Brans & Vincke (1985), *Management Science* 31(6), 647–656, DOI [10.1287/mnsc.31.6.647](https://doi.org/10.1287/mnsc.31.6.647).
- **Popularity:** Behzadian et al. (2010, EJOR 200(1):198–215, DOI [10.1016/j.ejor.2009.01.021](https://doi.org/10.1016/j.ejor.2009.01.021)) reviewed 217 PROMETHEE papers from 100 journals (1985–2009) and classify them by "PROMETHEE as applied with other MCDA methods". In the AHP-integration review of Çebi et al. (ISAHP 2022) PROMETHEE is among the five methods most often integrated with AHP (after TOPSIS, VIKOR). Co-occurrence counts from OpenAlex are in `../combinations.md` §A.

## For users (site copy)
- **EN:** PROMETHEE compares every pair of alternatives criterion by criterion and asks "how strongly is A preferred to B here?", using a preference function you choose per criterion (for example "any difference counts" or "differences under q are ignored, above p count fully"). It then sums how much each alternative beats the others (positive flow) minus how much it is beaten (negative flow). Pick it when small differences should not count, when criteria are on very different scales, or when you want to see which alternatives are genuinely incomparable (PROMETHEE I).
- **TR:** PROMETHEE alternatifleri ikişer ikişer, her kriterde ayrı ayrı karşılaştırır ve "burada A, B'ye ne kadar tercih edilir?" diye sorar; bunu her kriter için seçtiğiniz bir tercih fonksiyonuyla yapar (örneğin "her fark sayılır" ya da "q'nun altındaki farklar yok sayılır, p'nin üstü tam sayılır"). Sonra her alternatifin diğerlerini ne kadar geçtiğinden (pozitif akış) ne kadar geçildiğini (negatif akış) çıkarır. Küçük farkların sayılmaması gerektiğinde, kriterler çok farklı ölçeklerdeyse ya da gerçekten kıyaslanamayan alternatifleri görmek istediğinizde (PROMETHEE I) seçin.

## When to use / when not
- **Use when:** the decision maker can say what size of difference is negligible (q) and what size is decisive (p); criteria are on heterogeneous scales and you do not want a normalization step to decide their spread; partial compensation is acceptable (net flow is compensatory at the pair level, but bounded preference functions cap how much one big advantage can buy); you want PROMETHEE I's partial order to expose incomparabilities, or GAIA-style profiles (single-criterion net flows).
- **Do not use when:** there are many alternatives and the O(n²·m) pairwise cost matters in the browser (n = 1,000 → 10⁶ pairs per criterion; fine for n ≤ ~300); the user cannot justify thresholds and will pick them at random (results can then be less defensible than a plain weighted sum); strict independence from irrelevant alternatives is required (rank reversal is possible, see Pitfalls); a veto is needed (PROMETHEE has no veto; use ELECTRE III).
- **Degenerate shortcut to explain on the site:** with V-shape functions whose p ≥ the criterion range, the net flow is an affine function of a weighted sum (weights w_j/p_j); with all "usual" functions the net flow equals a weighted Borda count (Mareschal 2015, note below). So PROMETHEE only adds value when thresholds are chosen deliberately.

## Inputs
- Decision matrix X (n × m), n ≥ 2 alternatives, m ≥ 1 criteria. Any real values: negatives and zeros are fine, because only differences d_j(a,b) = g_j(a) − g_j(b) are used. No normalization step.
- Criterion type: max (benefit) or min (cost). Implementation: multiply cost columns by −1 before computing differences.
- Weights w_j ≥ 0, not all zero; normalized internally to sum 1. Weights can come from any weighting method (see `../combinations.md` §B for caveats on objective weights).
- Per criterion: a generalized criterion (preference function) type and its parameters, in the **units of that criterion**:

| Type | Name | Parameters | P(d) for d > 0 (P = 0 for d ≤ 0) |
|---|---|---|---|
| I | Usual | – | 1 |
| II | U-shape (quasi-criterion) | q ≥ 0 | 0 if d ≤ q, else 1 |
| III | V-shape (linear preference) | p > 0 | d/p if d ≤ p, else 1 |
| IV | Level | 0 ≤ q < p | 0 if d ≤ q; ½ if q < d ≤ p; 1 if d > p |
| V | Linear with indifference (V-shape with indifference) | 0 ≤ q < p | 0 if d ≤ q; (d − q)/(p − q) if q < d ≤ p; 1 if d > p |
| VI | Gaussian | s > 0 | 1 − exp(−d² / (2s²)) |

- Defaults we propose for the UI: type V with q = 0 and p = criterion range (this reproduces a scaled weighted sum and is a safe start), and let the user tighten q/p. Validation: q ≥ 0, p > q for IV and V, s > 0 for VI; Brans & Mareschal (2005) recommend choosing s between q and p. The Gaussian parameter is called σ in the 1986 paper and s in later texts.

## Algorithm
1. For each criterion j and ordered pair (a, b), a ≠ b: $d_j(a,b) = \sigma_j\,[x_{aj} - x_{bj}]$ with $\sigma_j = +1$ for max, $-1$ for min.
2. Unicriterion preference: $P_j(a,b) = F_j\big(d_j(a,b)\big) \in [0,1]$ with $F_j$ from the table above.
3. Aggregated preference index: $\pi(a,b) = \sum_{j=1}^{m} w_j P_j(a,b)$, $\sum_j w_j = 1$.
4. Leaving and entering flows: $\phi^+(a) = \frac{1}{n-1}\sum_{b\ne a}\pi(a,b)$, $\phi^-(a) = \frac{1}{n-1}\sum_{b\ne a}\pi(b,a)$.
5. Net flow and complete ranking (PROMETHEE II): $\phi(a) = \phi^+(a) - \phi^-(a) \in [-1, 1]$, $\sum_a \phi(a) = 0$; rank by decreasing $\phi$, equal $\phi$ = indifference.
6. Optional profile (for "why" explanations and GAIA): single-criterion net flow $\phi_j(a) = \frac{1}{n-1}\sum_{b\ne a}[P_j(a,b) - P_j(b,a)]$, and $\phi(a) = \sum_j w_j \phi_j(a)$.

**PROMETHEE I (partial ranking) note.** Use $\phi^+$ and $\phi^-$ separately: a P b if $\phi^+(a) \ge \phi^+(b)$ and $\phi^-(a) \le \phi^-(b)$ with at least one strict; a I b if both equal; otherwise a R b (incomparable, the two flows disagree). This is cheap once flows exist, so the site should show it next to PROMETHEE II (Brans & Mareschal 2005 recommend looking at both).

**Variants.** (i) The 1986 paper's worked example reports flows as plain sums (no 1/(n−1)); the 1/(n−1) scaling is used in Brans & Mareschal (2005), Visual PROMETHEE and pyDecision. Ranking is identical; we implement the scaled form. (ii) pyDecision adds a non-standard type `t7` (square-root "C-shape"); we do not implement it. (iii) PROMETHEE III (interval order), IV (continuous), V (constraints) and VI are out of scope.

## Commonly combined with
- **AHP → PROMETHEE:** Dağdeviren (2008) equipment selection, *J. Intelligent Manufacturing* 19, 397–406, DOI [10.1007/s10845-008-0091-7](https://doi.org/10.1007/s10845-008-0091-7). The first AHP–PROMETHEE integration is dated 1995 (Urli & Beaudry) by Çebi et al. (ISAHP 2022).
- **Fuzzy ANP / fuzzy AHP → PROMETHEE:** Tuzkaya et al. (2010), material handling equipment, *Expert Systems with Applications* 37(4), 2853–2863, DOI [10.1016/j.eswa.2009.09.004](https://doi.org/10.1016/j.eswa.2009.09.004).
- **Entropy / CRITIC → PROMETHEE:** objective weights are common, but note PROMETHEE does not normalize the matrix, so weights computed on a normalized matrix and thresholds in raw units describe different things; document both (see `../combinations.md` §B).
- **As a cross-check next to TOPSIS/VIKOR/COPRAS:** Sałabun, Wątróbski & Shekhovtsov (2020), *Symmetry* 12(9), 1549, DOI [10.3390/sym12091549](https://doi.org/10.3390/sym12091549) compare PROMETHEE II with TOPSIS, VIKOR and COPRAS using ρ_w and WS.

## Pitfalls
- **Rank reversal.** Adding or removing an alternative can swap two others, because flows are averages over the whole set (De Keyser & Peeters 1996, *EJOR* 89, 457–461, DOI [10.1016/0377-2217(94)00307-6](https://doi.org/10.1016/0377-2217(94)00307-6); Mareschal, De Smet & Nemery 2008, IEEM, DOI [10.1109/IEEM.2008.4738012](https://doi.org/10.1109/IEEM.2008.4738012); Verly & De Smet 2013, *IJMCDM* 3(4), 325–345, DOI [10.1504/IJMCDM.2013.056781](https://doi.org/10.1504/IJMCDM.2013.056781)). Mareschal et al. and Verly & De Smet show that removing one alternative cannot reverse a and b when $\phi(a) - \phi(b) > 2/(n-1)$ (because $\phi_{-y}(a) = \frac{n-1}{n-2}\phi(a) - \frac{1}{n-2}[\pi(a,y) - \pi(y,a)]$). UI idea: flag pairs with $|\Delta\phi| \le 2/(n-1)$ as "may swap if an alternative is added or removed". De Smet & Dejaegere (2022, *IJMCDM* 9(1), 1–16, DOI [10.1504/IJMCDM.2022.10049268](https://doi.org/10.1504/IJMCDM.2022.10049268)) give a stricter threshold.
- **Threshold units.** q, p, s are in raw criterion units; if the user rescales a column (e.g., € → k€) the thresholds must be rescaled too. Show the unit next to each threshold input.
- **Threshold sensitivity.** Results can change with q/p; add q/p to the sensitivity panel (Podvezko & Podviezko 2010 study the dependence on preference functions, *TEDE* 16(1), 143–158, DOI [10.3846/tede.2010.09](https://doi.org/10.3846/tede.2010.09)).
- **Degenerate inputs.** n = 1: flows undefined (division by n − 1); require n ≥ 2. Constant column: all P_j = 0, criterion is silently inactive; warn. All weights zero: reject. Ties in φ: report as indifference, rank by average position.
- **Type IV boundary.** Level function is ½ on (q, p] and 1 above p; some papers write the upper limit as q + p (e.g., Abdullah et al. 2019, *J. Ind. Eng. Int.* 15, 271–285) — check a paper's definition before using it as a fixture.
- **Cost criteria in pyDecision.** pyDecision has no min/max argument; cost columns must be negated by the caller.

## Reference example (test fixture)
- **Source:** Brans, Vincke & Mareschal (1986), EJOR 24(2):228–238, DOI 10.1016/0377-2217(86)90044-5, numerical application "location of a hydroelectric power station" (six projects, six criteria, one preference-function type per criterion). The original tables were not accessible to us (paywalled); the input table is taken from the authors' own teaching copy (Mareschal, *Exercises with Visual PROMETHEE*, 2019, Table 1, https://bertrand.mareschal.web.ulb.be/PG2024/assets/exercises-vp-2019.pdf) and the published π-matrix and flows from a course reproduction of the 1986 example (Scribd document 367488841, "3-Promethee", slides 29–34). f3 is given in 10⁶ units there as 6, 2, 4, 10, 6, 7 in some copies and as 600, 200, … with q = 50, p = 500 in others; f4 as 5.4 … with q = 1, p = 6 or as 54 … with q = 10, p = 60. The scalings are equivalent; we use the second form below.
- **Input:**

```json
{
  "alternatives": ["a1 Italy", "a2 Belgium", "a3 Germany", "a4 Sweden", "a5 Austria", "a6 France"],
  "criteria": ["f1 manpower", "f2 power", "f3 construction cost", "f4 maintenance cost", "f5 villages to evacuate", "f6 safety"],
  "matrix": [[80, 90, 600, 54, 8, 5],
             [65, 58, 200, 97, 1, 1],
             [83, 60, 400, 72, 4, 7],
             [40, 80, 1000, 75, 7, 10],
             [52, 72, 600, 20, 3, 8],
             [94, 96, 700, 36, 5, 6]],
  "types": ["min", "max", "min", "min", "min", "max"],
  "weights": [1, 1, 1, 1, 1, 1],
  "preference": [{"type": "II", "q": 10}, {"type": "III", "p": 30}, {"type": "V", "q": 50, "p": 500},
                 {"type": "IV", "q": 10, "p": 60}, {"type": "I"}, {"type": "VI", "s": 5}]
}
```

- **Published outputs (sum-based, as printed; 3 decimals):** π matrix rows a1…a6 = [0, .296, .250, .268, .100, .185], [.462, 0, .389, .333, .296, .500], [.236, .180, 0, .333, .056, .429], [.399, .505, .305, 0, .223, .212], [.444, .515, .487, .380, 0, .448], [.286, .399, .250, .432, .133, 0]. Net flows (Σ, not divided by n−1): a1 −0.728, a2 +0.085, a3 −0.447, a4 −0.102, a5 +1.466, a6 −0.274. Ranking a5 > a2 > a4 > a6 > a3 > a1. PROMETHEE I: the source text stresses the incomparability a1 R a2.
- **Recomputed (numpy, `scratchpad/mcdm/kombinasyon/promethee_ref.py`):**

| | a1 | a2 | a3 | a4 | a5 | a6 |
|---|---|---|---|---|---|---|
| φ⁺ | 0.2199 | 0.3963 | 0.2466 | 0.3293 | 0.4547 | 0.3001 |
| φ⁻ | 0.3655 | 0.3791 | 0.3362 | 0.3493 | 0.1618 | 0.3549 |
| φ | −0.1457 | 0.0172 | −0.0895 | −0.0200 | 0.2929 | −0.0549 |
| φ·(n−1) | −0.7283 | 0.0858 | −0.4476 | −0.1000 | 1.4645 | −0.2744 |

  Ranking a5 > a2 > a4 > a6 > a3 > a1. **MATCH** on ranking; π max abs diff 0.001, sum-based φ max abs diff 0.002 (a4: −0.1000 vs −0.102). The source truncates/rounds π to 3 decimals before summing (its a4 row sums 1.644 vs our 1.6462), which explains the gap. PROMETHEE I recomputed: a1 R a2 (MATCH with the text), also a2 R a3, a2 R a4, a2 R a6, a3 R a4, a3 R a6; a5 P all others.
- **pyDecision 5.1.1** `promethee_ii(X·sign, W=[1]*6, Q=[10,0,50,10,0,0], S=[0,0,0,0,0,5], P=[0,30,500,60,0,0], F=['t2','t3','t5','t4','t1','t6'])`: φ identical to numpy, max abs diff 1.1e-16. **MATCH.**
- **Extra behavioural checks (from the same teaching source):** with w2 = 50, others 10 France (a6) becomes best; with w5 = 55, others 9, Belgium (a2) becomes best. Recomputed: a6 best (φ = 0.2497) and a2 best (φ = 0.4693). **MATCH.** Use both as weight-sensitivity unit tests.

## Implementation notes
- pyDecision: `pyDecision.algorithm.promethee_ii(dataset, W, Q, S, P, F, sort, topn, graph, verbose)`; types `'t1'…'t6'` map to I…VI; returns `[[index, φ]]`. PROMETHEE I: `promethee_i`. No cost handling, no validation of q < p.
- Our TypeScript choices: explicit min/max; validate thresholds; compute π once and derive φ⁺, φ⁻, φ, φ_j and PROMETHEE I relations from it; expose φ_j for the "why" panel; tie tolerance 1e-12 on φ; n ≥ 2 required; warn on constant columns and on thresholds larger than the column range (function degenerates).
- Performance: π is n × n; for n > 500 compute flows by streaming rows rather than storing π.

---

## Re-verification (2026-04-20)

Script: [`../scripts/promethee_ii.py`](../scripts/promethee_ii.py) · Output: [`../scripts/promethee_ii.out`](../scripts/promethee_ii.out) · Tests: [`tests/promethee-ii.test.ts`](../../../tests/promethee-ii.test.ts) · Fixture: [`tests/fixtures/promethee-ii-brans1986.json`](../../../tests/fixtures/promethee-ii-brans1986.json)

### Primary sources & open-source implementations inspected
1. **Brans & Mareschal (2005)**, *PROMETHEE Methods*, Chapter 5 in Figueira, Greco & Ehrgott (eds.), *Multiple Criteria Decision Analysis: State of the Art Surveys*, Springer, pp. 163–195, DOI [10.1007/0-387-23081-5_5](https://doi.org/10.1007/0-387-23081-5_5) — inspected full text (Eqs. 5.3–5.21, Table 5.3 generalized criterion types I–VI).
2. **Mareschal (2019)**, *Exercises with Visual PROMETHEE*, Université Libre de Bruxelles — inspected full PDF (Table 1 power plant 6×6 input, Figures 1–4, Exercises 1–6; Table 2 Hypermarkets 12×5; Table 3 Marketing 6×5).
3. **Mareschal (2015)**, *Note on the PROMETHEE net flow computation*, Université Libre de Bruxelles — inspected full PDF (Eqs. 1–16: proves V-shape with $p_j \ge R_j$ reduces to an affine weighted sum $\phi(a) = \frac{m}{m-1}\sum_j \frac{w_j}{p_j}(x_{aj} - \bar{x}_j)$, and Usual Type I reduces to weighted Borda midrank score $\phi_j(a) = \frac{m+1}{m-1} - \frac{2}{m-1} R_j(a)$).
4. **Goswami (2020)**, *Outranking Methods: Promethee I and Promethee II*, *Foundations of Management* 12(1):93–110, DOI [10.2478/fman-2020-0008](https://doi.org/10.2478/fman-2020-0008) — inspected full PDF (6 laptop models × 7 criteria, Tables 3–18).
5. **Abdullah, Chan & Afshari (2019)**, *Application of PROMETHEE method for green supplier selection: a comparative result based on preference functions*, *Journal of Industrial Engineering International* 15(2):271–285, DOI [10.1007/s40092-018-0289-z](https://doi.org/10.1007/s40092-018-0289-z) — inspected full PDF (4 green suppliers × 7 criteria, Tables 3–17).
6. **Open-source Python libraries audited (`pymcdm` 1.4.0, `pyrepo-mcda` 0.1.15, `pyDecision` 5.1.8):**
   - `pymcdm` (`pymcdm/methods/promethee_ii.py`, `partial/promethee_i.py`): (a) stores `self.pfs` as a single-use generator expression when `p` or `q` is passed, so calling the same `PROMETHEE_II` instance a second time exhausts `self.pfs`, produces `pi_table = 0`, and crashes with `AxisError: axis 1 is out of bounds for array of dimension 0`; (b) omits Type VI (Gaussian) completely.
   - `pyrepo-mcda` (`pyrepo_mcda/mcda_methods/promethee.py`, `promethee_preference_functions.py`): couples the Gaussian parameter as `s = (p + q) / 2` in `preference_gaussian_function(d, p, q)` instead of accepting an independent $s_j$, and defaults `p = 2 * std`, `q = 0.5 * std` when omitted.
   - `pyDecision` (`pyDecision/algorithm/p_ii.py`): matches all 6 Brans & Vincke types to $1.11 \times 10^{-16}$, but has no `criterion_type` parameter (treats all columns as benefit unless negated by the caller) and does not validate $q < p$.

### Algebraic identity for default `'v-shape'` ($p_j = R_j = \max_i x_{ij} - \min_i x_{ij}$)
When every criterion uses Type III (`'v-shape'`) with $q_j = 0$ and $p_j = R_j = \max_i x_{ij} - \min_i x_{ij}$ (our workbench default when `preferenceFunction: 'v-shape'`), for any pair $(a, b)$ on criterion $j$ with $R_j > 0$:
$$P_j(a, b) - P_j(b, a) = \frac{\sigma_j(x_{aj} - x_{bj})}{R_j} = r_{aj} - r_{bj}$$
where $r_{aj} \in [0, 1]$ is the min–max normalized entry ($\frac{x_{aj} - \min_i x_{ij}}{R_j}$ for benefit, $\frac{\max_i x_{ij} - x_{aj}}{R_j}$ for cost). Averaging over $b \ne a$ yields the single-criterion net flow $\phi_j(a) = \frac{m}{m-1}(r_{aj} - \bar{r}_j)$ and the aggregated net flow:
$$\phi(a) = \frac{m}{m-1}\left(\sum_{j=1}^n w_j r_{aj} - \sum_{j=1}^n w_j \bar{r}_j\right)$$
Because $\frac{m}{m-1} > 0$ and $\sum_j w_j \bar{r}_j$ is constant across alternatives, **PROMETHEE II with default `'v-shape'` ($p_j = R_j$) is an exact positive affine transformation of the min–max weighted sum, and therefore always produces the exact same complete ranking as MABAC** (verified to $3.33 \times 10^{-16}$ across 1,000 random problems in `promethee_ii.py`). Unlike MABAC, however, PROMETHEE II decomposes $\phi(a)$ into separate leaving ($\phi^+$) and entering ($\phi^-$) flows that expose PROMETHEE I incomparabilities, and switching `preferenceFunction` to `'usual'`, `'level'`, or `'gaussian'` (or supplying per-criterion thresholds in `criteriaFunctions`) departs from the linear min–max order.

### Verified fixtures

1. **F1 — Brans, Vincke & Mareschal (1986) / Mareschal (2019), 6 hydroelectric projects × 6 criteria (all 6 types I–VI):**
   - Equal weights $w_j = 1/6$: $\phi^+ = [0.2199, 0.3963, 0.2466, 0.3293, 0.4547, 0.3001]$, $\phi^- = [0.3655, 0.3791, 0.3362, 0.3493, 0.1618, 0.3549]$, $\phi = [-0.1457, +0.0172, -0.0895, -0.0200, +0.2929, -0.0549]$, ranking $a_5 \succ a_2 \succ a_4 \succ a_6 \succ a_3 \succ a_1$ (`[6, 2, 5, 3, 1, 4]`). Matches published 3-d.p. $\pi$ matrix to $9.64 \times 10^{-4}$, scaled flows to $4.9 \times 10^{-5}$, and `pyDecision` 5.1.8 to $1.11 \times 10^{-16}$.
   - PROMETHEE I partial order: 6 incomparable pairs $(a_1, a_2), (a_2, a_3), (a_2, a_4), (a_2, a_6), (a_3, a_4), (a_3, a_6)$, matching Figure 1 in Mareschal (2019).
   - Weight sensitivity (Mareschal 2019, Exercises 1 & 2): $w = [10, 50, 10, 10, 10, 10] \implies a_6$ (France) ranks 1st ($\phi(a_6) = +0.2497$); $w = [9, 9, 9, 9, 55, 9] \implies a_2$ (Belgium) ranks 1st ($\phi(a_2) = +0.4693$).
   - All-Usual (Mareschal 2019, Exercise 4): $\phi = [-0.1667, -0.1333, -0.0667, 0.0000, +0.4333, -0.0667]$, ranking `[6, 5, 3, 2, 1, 4]` ($a_3$ and $a_6$ tie at $-1/15$).

2. **F2 — Goswami (2020), 6 laptop models × 7 criteria (Type III V-shape with $p_j = R_j$; workbench example `goswami-2020-laptops`):**
   - Table 7 matrix (`[[3,5,3,5,3,9,3], [5,7,5,5,7,3,3], [5,9,9,7,7,7,5], [7,9,9,9,9,2,9], [5,7,9,7,7,9,9], [3,5,5,5,7,5,3]]`, all benefit) and Table 4 AHP weights (`[0.37657, 0.09395, 0.04529, 0.21594, 0.16932, 0.07647, 0.02246]`, where $w_7$'s exact row average is $0.0224591$, printed as $0.02247$ in Table 4 so the printed column sums to $1.00001$).
   - Because Goswami (2020) min–max normalizes each column $R_{ij} \in [0, 1]$ (Eq. 4) and applies $P_j(a, b) = \max(0, R_{aj} - R_{bj})$ (Eqs. 7–8), his formulation is algebraically identical to our default `'v-shape'` with $p_j = \max_i x_{ij} - \min_i x_{ij}$ on the raw matrix.
   - Reproduces Table 13 ($\pi$), Table 15 ($\phi^+ = [0.04151, 0.12188, 0.26870, 0.60934, 0.26058, 0.03652]$, $\phi^- = [0.49889, 0.22204, 0.08527, 0.05025, 0.08933, 0.39276]$), Table 16 ($\phi = [-0.45738, -0.10015, +0.18343, +0.55909, +0.17125, -0.35624]$), Table 17 (unique PROMETHEE I incomparability $\text{Model 1 } R \text{ Model 6}$), and Table 18 (ranking $\text{Model 4} \succ \text{Model 3} \succ \text{Model 5} \succ \text{Model 2} \succ \text{Model 6} \succ \text{Model 1}$, `[6, 4, 2, 1, 3, 5]`) with max absolute difference $\le 8 \times 10^{-6}$.

3. **F3 — Abdullah, Chan & Afshari (2019), 4 green suppliers × 7 criteria (Usual Type I & mixed V-shape/Level):**
   - Case 1 (Usual Type I, Tables 8–11): $\phi^+ = [0.9608, 0.0841, 0.3433, 0.4515]$, $\phi^- = [0.0392, 0.8176, 0.5324, 0.4506]$, $\phi = [+0.9216, -0.7334, -0.1890, +0.0009]$, ranking $A_1 \succ A_4 \succ A_3 \succ A_2$ (`[1, 4, 3, 2]`), matching Tables 10–11 within $1.1 \times 10^{-4}$ (paper's Table 5 weights sum to $1.0001$).
   - Case 2 (V-shape $p = 0.10$ on $C_1$ + Level $q = 0.05, p = 0.10$ on $C_2\text{–}C_7$, Tables 12–16): reproduces Table 13 and Table 14 ($\pi$) to $8.8 \times 10^{-5}$ and ranking $A_1 \succ A_3 \succ A_4 \succ A_2$ (`[1, 4, 2, 3]`). Documents two paper errata: (i) Eq. (8) prints $q + p$ as the upper Level cutoff, but Table 13 uses standard $p = 0.10$ ($d = 0.15 \mapsto 1$); (ii) Table 15 misprints $\phi^+(A_1) = (0.8782 + 0.8285 + 0.79905)/3 = 0.83525$ with a shifted decimal point as $0.0835$.

## Sources
- Brans, Vincke & Mareschal (1986), EJOR 24(2), 228–238, DOI 10.1016/0377-2217(86)90044-5.
- Brans & Vincke (1985), Management Science 31(6), 647–656, DOI 10.1287/mnsc.31.6.647.
- Brans & Mareschal (2005), PROMETHEE methods, in Figueira, Greco & Ehrgott (eds.) *Multiple Criteria Decision Analysis: State of the Art Surveys*, Springer, 163–186, DOI [10.1007/0-387-23081-5_5](https://doi.org/10.1007/0-387-23081-5_5) (preprint read: https://www.cin.ufpe.br/~if703/aulas/promethee.pdf).
- Mareschal, B. (2015). Note on the PROMETHEE net flow computation (V-shape ⇒ weighted sum; usual ⇒ Borda). https://bertrand.mareschal.web.ulb.be/PG2024/assets/promethee_net_flow.pdf
- Mareschal, B. (2019). Exercises with Visual PROMETHEE. https://bertrand.mareschal.web.ulb.be/PG2024/assets/exercises-vp-2019.pdf
- Goswami, S. S. (2020). Outranking Methods: Promethee I and Promethee II. *Foundations of Management* 12(1), 93–110, DOI [10.2478/fman-2020-0008](https://doi.org/10.2478/fman-2020-0008).
- Abdullah, L., Chan, W. & Afshari, A. (2019). Application of PROMETHEE method for green supplier selection: a comparative result based on preference functions. *Journal of Industrial Engineering International* 15(2), 271–285, DOI [10.1007/s40092-018-0289-z](https://doi.org/10.1007/s40092-018-0289-z).
- Behzadian et al. (2010), EJOR 200(1), 198–215, DOI 10.1016/j.ejor.2009.01.021.
- Çebi, Onar, Öztayşi & Kahraman (2022). Integration of AHP with other MCDM methods: a literature review. ISAHP 2022. https://isahp.org/uploads/36_001.pdf
- De Keyser & Peeters (1996); Mareschal, De Smet & Nemery (2008); Verly & De Smet (2013) — rank reversal, DOIs above.
- Dağdeviren (2008); Tuzkaya et al. (2010); Sałabun et al. (2020) — DOIs above.
- pyDecision 5.1.8, `pyDecision/algorithm/p_ii.py` (Pereira, V.), https://github.com/Valdecy/pyDecision
- pymcdm 1.4.0, `pymcdm/methods/promethee_ii.py` (Kizielewicz, B., Shekhovtsov, A. & Sałabun, W.)
- pyrepo-mcda 0.1.15, `pyrepo_mcda/mcda_methods/promethee.py` (Bączkiewicz, A.)
