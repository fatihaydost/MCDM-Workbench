# ELECTRE III (electre-iii)

- **Family:** ranking (outranking; pseudo-criteria with indifference/preference/veto thresholds, fuzzy credibility, distillation)
- **Origin:** Roy, B. (1978). ELECTRE III : un algorithme de classements fondé sur une représentation floue des préférences en présence de critères multiples. *Cahiers du Centre d'Études de Recherche Opérationnelle* 20(1), 3–24 (no DOI). Standard modern description: Figueira, Mousseau & Roy (2005), ELECTRE methods, in *Multiple Criteria Decision Analysis: State of the Art Surveys*, Springer, 133–153, DOI [10.1007/0-387-23081-5_4](https://doi.org/10.1007/0-387-23081-5_4).
- **Popularity:** Govindan & Jepsen (2016, EJOR 250(1):1–29, DOI [10.1016/j.ejor.2015.07.019](https://doi.org/10.1016/j.ejor.2015.07.019)) review 686 ELECTRE papers (544 applications) and tabulate them by ELECTRE version. Co-occurrence counts with weighting methods (OpenAlex) are in `../combinations.md` §A.

## For users (site copy)
- **EN:** ELECTRE III asks, for every pair, "is there enough evidence that A is at least as good as B, and does any criterion strongly object?". Small differences are ignored (indifference threshold q), large ones count fully (preference threshold p), and a very bad score on one criterion can block A from outranking B no matter how good it is elsewhere (veto threshold v). Choose it when a weakness must not be compensated by strengths, and when you accept that some alternatives come out as incomparable rather than forced into a strict order.
- **TR:** ELECTRE III her çift için "A'nın en az B kadar iyi olduğuna dair yeterli kanıt var mı ve bir kriter buna güçlü biçimde itiraz ediyor mu?" diye sorar. Küçük farklar yok sayılır (farksızlık eşiği q), büyük farklar tam sayılır (tercih eşiği p); bir kriterde çok kötü bir değer, A başka yerlerde ne kadar iyi olursa olsun A'nın B'yi geçmesini engelleyebilir (veto eşiği v). Bir zayıflığın güçlü yönlerle telafi edilmemesi gerektiğinde ve bazı alternatiflerin zorla sıraya sokulmak yerine kıyaslanamaz çıkmasını kabul ettiğinizde seçin.

## When to use / when not
- **Use when:** non-compensation matters (environmental, safety, regulatory limits); data are imprecise and the DM can state q, p (and optionally v) per criterion; the audience accepts a partial pre-order with incomparabilities.
- **Do not use when:** the user needs a single score per alternative or a strict complete ranking for reporting (use PROMETHEE II or a compensatory method; or state clearly that the ELECTRE III "rank" is a pre-order); thresholds cannot be justified; n is large and repeated distillation in the browser is too slow (O(n³) worst case); the audience cannot be taught what "incomparable" means.

## Inputs
- Decision matrix X (n × m); any real values (only differences are used). Criterion direction max/min.
- Weights w_j > 0 (normalized internally). In ELECTRE, weights are "voting powers", not trade-off coefficients (Figueira et al. 2005); objective weights from dispersion are a conceptual mismatch (see `../combinations.md` §B).
- Thresholds per criterion, in criterion units: 0 ≤ q_j ≤ p_j ≤ v_j (v_j optional = +∞ / no veto). Each may be constant or affine in the performance, $t_j(g) = \alpha_j g + \beta_j$ (e.g., "10 % of the value"). We must also store whether a relative threshold is **direct** (computed on the value of a, the alternative being tested as outranking) or **inverse** (on b); the reference fixture below uses direct thresholds.
- Distillation parameters: $s(\lambda) = \alpha + \beta\lambda$ with defaults $\alpha = 0.30$, $\beta = -0.15$ (Roy 1978; Figueira et al. 2005).

## Algorithm
Write $\Delta_j(a,b)$ for the advantage of b over a on criterion j: $g_j(b) - g_j(a)$ for max, $g_j(a) - g_j(b)$ for min; thresholds $q_j, p_j, v_j$ evaluated at $g_j(a)$ (direct).
1. Partial concordance: $c_j(a,b) = 1$ if $\Delta_j \le q_j$; $0$ if $\Delta_j \ge p_j$; else $\dfrac{p_j - \Delta_j}{p_j - q_j}$.
2. Global concordance: $C(a,b) = \sum_j w_j c_j(a,b) \big/ \sum_j w_j$.
3. Partial discordance: $d_j(a,b) = 0$ if $\Delta_j \le p_j$; $1$ if $\Delta_j \ge v_j$; else $\dfrac{\Delta_j - p_j}{v_j - p_j}$. No veto ⇒ $d_j \equiv 0$.
4. Credibility: $\sigma(a,b) = C(a,b)$ if $d_j(a,b) \le C(a,b)$ for all j; otherwise $\sigma(a,b) = C(a,b)\prod_{j:\,d_j > C} \dfrac{1 - d_j(a,b)}{1 - C(a,b)}$. Any $d_j = 1$ gives $\sigma = 0$. Set $\sigma(a,a)$ aside (not used).
5. Distillation on a set D (start with D = A). $\lambda_0 = \max_{a\ne b\in D}\sigma(a,b)$; $\lambda_1 = \max\{\sigma(a,b) : \sigma(a,b) < \lambda_0 - s(\lambda_0)\}$ (0 if none). λ₁-outranking: $a\,S^{\lambda_1} b \iff \sigma(a,b) > \lambda_1$ and $\sigma(a,b) - \sigma(b,a) > s(\sigma(a,b))$. Qualification $Q(a) = |\{b: a S b\}| - |\{b: b S a\}|$. Descending: keep the maxima of Q; if more than one remains, repeat inside that subset with $\lambda_0 := \lambda_1$ until one remains or λ = 0. The survivors form the next class; remove them and restart on the rest. Ascending: same with minima of Q, classes collected from the bottom.
6. Final partial pre-order = intersection of the two pre-orders: a P b if a is ranked at least as well as b in both and strictly better in one; a I b if tied in both; a R b (incomparable) if the two pre-orders disagree.

**Variants (must be a documented setting, they change results).** (i) The discrimination threshold is evaluated at $s(\sigma(a,b))$ in the step-5 test (our default; it reproduces the fixture) or at $s(\lambda)$ of the current cut level (some textbooks and code). On the fixture below, $s(\lambda_1)$ gives a different descending pre-order (A9 > A7 > A4 = A10 > …). (ii) pyDecision uses $s(\lambda_{\max})$ and a slightly different tie loop; it still matched the fixture. (iii) A popular shortcut in applied papers ranks by a "net credibility" score $\sum_b \sigma(a,b) - \sum_b \sigma(b,a)$ instead of distillation — easy to explain, but it is not Roy's exploitation; offer it only as a labelled alternative. (iv) Thresholds direct vs inverse.

## Commonly combined with
- **Subjective weights (AHP, direct rating, stakeholder votes) → ELECTRE III**, the usual pattern because ELECTRE weights are voting powers; e.g., Hokkanen & Salminen (1994), The choice of a solid waste management system by using the ELECTRE III decision-aid method, Springer (Eurocourses series), 111–153, DOI [10.1007/978-94-017-0767-1_9](https://doi.org/10.1007/978-94-017-0767-1_9).
- **SMAA-III** for robustness when weights/thresholds are uncertain: Tervonen, Figueira, Lahdelma et al., SMAA-III, NATO Science for Peace and Security Series C, 241–253, DOI [10.1007/978-1-4020-9026-4_15](https://doi.org/10.1007/978-1-4020-9026-4_15).
- **As a non-compensatory cross-check** next to PROMETHEE II or TOPSIS in the same study (Brans et al. 1986 already compare PROMETHEE with ELECTRE III).

## Pitfalls
- **Exploitation is fragile.** The distillation depends on s(λ), on rounding of σ and on tie handling. On the fixture below, rounding σ to 2 decimals before distilling changes the descending pre-order (A7 moves above A9). Compute with full precision; show σ rounded only for display.
- **Rank reversal / irregularities.** Replacing a non-optimal alternative by a worse one can change the best one; Wang & Triantaphyllou (2008, *Omega* 36(1), 45–63, DOI [10.1016/j.omega.2005.12.003](https://doi.org/10.1016/j.omega.2005.12.003)) report this for ELECTRE III on a real case and in simulations (their Fig. 5 shows rates rising to roughly 0.2 of random problems for 21 alternatives). Their three test criteria are the basis for the rank-reversal panel (`../combinations.md` §C).
- **Thresholds.** Enforce q ≤ p ≤ v; relative thresholds on cost criteria must use the same "direct" reference; a threshold of 0 on a p makes the criterion a true criterion (step function). Thresholds in raw units: rescaling a column requires rescaling thresholds.
- **Degenerate inputs.** n = 1: nothing to distill. C(a,b) = 1 with a veto-free set: σ = 1, avoid division by 1 − C = 0 (the product is only taken over j with d_j > C, which is empty when C = 1). All σ equal: everything ends in one class.
- **Not a score.** Do not display a "rank number" without saying it is a class in a pre-order; show incomparable pairs explicitly.

## Reference example (test fixture)
- **Source:** Wang, X. & Triantaphyllou, E. (2008). Ranking irregularities when evaluating alternatives by using some ELECTRE methods. *Omega* 36(1), 45–63. DOI 10.1016/j.omega.2005.12.003. Section 3.2 (waste incineration strategy, eastern Switzerland; data from Rogers, Bruen & Maystre 1999, *ELECTRE and Decision Support*, Kluwer, ch. 6): decision matrix and W/Q/P table on p. 51, credibility matrix on p. 52, distillation pre-orders on p. 53; modified problem (A1 replaced by a worse A1′) on p. 53. Author PDF: http://bit.csc.lsu.edu/trianta/Journal_PAPERS1/RankingIrregularities_with_ELECTRE2009.pdf
- **Input** (no veto thresholds; C2, C6, C7 benefit, others cost; "rel" = fraction of g_j(a), direct):

```json
{
  "alternatives": ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11"],
  "matrix": [[125,866,9.81,218,1.41,542,483,23,1.5,1,1],
             [11980,900,11.45,189,1.45,452,303,12,1.5,6,6],
             [31054,883,9.86,172,1.82,341,311,0,0,3,3],
             [28219,840,10.38,171,1.95,339,318,0,0,3,3],
             [31579,903,10.74,165,1.7,312,281,0,0,5,5],
             [39364,922,13.87,167,1.65,287,269,0,0,8,7],
             [125,769,9.33,182,1.64,458,180,0,1.5,1,1],
             [8075,896,9.82,172,1.7,408,121,0,1.5,6,6],
             [3089,770,9.39,177,1.9,430,228,0,1,2,2],
             [6449,766,7.22,172,1.65,401,157,0,1,4,4],
             [12074,897,10.61,169,1.65,378,162,0,1,7,6]],
  "types": ["min","max","min","min","min","max","max","min","min","min","min"],
  "weights": [0.16,0.033,0.033,0.097,0.097,0.16,0.097,0.16,0.033,0.033,0.097],
  "q": [{"abs":1000},{"rel":0.1},{"rel":0.1},{"abs":5},{"rel":0.1},{"rel":0.1},{"rel":0.1},{"abs":2},{"abs":0.2},{"abs":0},{"abs":0}],
  "p": [{"abs":2000},{"rel":0.2},{"rel":0.2},{"abs":10},{"rel":0.2},{"rel":0.2},{"rel":0.2},{"abs":4},{"abs":0.4},{"abs":1},{"abs":1}],
  "v": null,
  "distillation": {"alpha": 0.30, "beta": -0.15, "s_argument": "sigma_ab"},
  "modified_case": {"replace_row": 0, "with": [2125,866,9.81,218,1.41,452,483,23,1.5,1,1]}
}
```

- **Published outputs:** credibility (= concordance, no veto), 2 decimals, row A1 = [–, .74, .71, .71, .71, .71, .74, .74, .71, .68, .71], row A9 = [.35, .78, .85, .85, .74, .73, .67, .97, –, .94, .89] (full 11 × 11 matrix on p. 52). Descending: A9 > A4 > A7 > A10 > A3 = A5 = A8 = A11 > A1 > A2 > A6. Ascending: A1 = A7 > A9 > A4 > A10 > A2 = A5 > A3 = A11 > A8 > A6. Final: A7 and A9 at the top, incomparable. Modified case: descending A7 > A9 > A4 > A10 > A3 = A5 = A8 = A11 > A1 > A2 > A6; ascending A7 > A1 = A9 > A4 > A10 > A2 = A5 > A3 = A11 > A8 > A6; A7 alone on top (the rank reversal the paper reports).
- **Recomputed (numpy, `scratchpad/mcdm/kombinasyon/electre3_ref.py`, `distill.py`):**
  - Credibility: rounded to 2 decimals equals the published matrix in all 110 cells; **MATCH**, max abs diff (unrounded vs published) 0.0048. Inverse thresholds (on b) give 0.07 max diff, so the paper uses direct thresholds.
  - Descending and ascending pre-orders: identical to the published ones; **MATCH**. Final pre-order: A7 and A9 non-dominated, A7 R A9; **MATCH**.
  - Modified case: ascending **MATCH**; descending gives A1 = A2 (tie) where the paper prints A1 > A2 (**MISMATCH** in the last-but-one class only); top alternative A7 alone **MATCH**, so the reported reversal is reproduced. Both our code and pyDecision produce the A1 = A2 tie; we attribute the difference to an unstated tie-break in the authors' MATLAB code.
- **pyDecision 5.1.1:** `electre_iii` only takes constant thresholds and benefit criteria, so the relative-threshold credibility cannot be reproduced end-to-end ("not run for step 1–4"). Its distillation functions `destilation_descending` / `destilation_ascending` applied to our credibility matrix return exactly the published pre-orders (**MATCH**), and the A1 = A2 tie in the modified case.
- **Veto unit test (hand-derived, not published; covers the path the fixture does not):** two max criteria, w = (0.6, 0.4), a = (10, 0), b = (8, 7), q = (1, 1), p = (3, 3), v = (20, 9) ⇒ C(a,b) = 0.6, d₂ = 4/6 = 0.667 > C, σ(a,b) = 0.6 · (1 − 0.667)/(1 − 0.6) = 0.5; with v₂ = 7, d₂ = 1 and σ(a,b) = 0 (`veto_unit.py`).

## Implementation notes
- pyDecision: `pyDecision.algorithm.electre_iii(dataset, P, Q, V, W, graph)` → `(global_concordance, credibility, rank_D, rank_A, rank_M, rank_P)`; constant thresholds, benefit-only (negate costs), s(λ) = 0.3 − 0.15·λ_max inside `qualification`.
- Our TypeScript choices:
  - Interactive `thresholdPreset?: 'standard' | 'strict' | 'veto'` (default `'standard'`) derived from each criterion's column range $\text{range}_j = \max_i x_{ij} - \min_i x_{ij}$:
    - `'standard'`: $q_j = 0.10 \cdot \text{range}_j$, $p_j = 0.25 \cdot \text{range}_j$, $v_j = \text{null}$
    - `'strict'`: $q_j = 0.05 \cdot \text{range}_j$, $p_j = 0.15 \cdot \text{range}_j$, $v_j = \text{null}$
    - `'veto'`: $q_j = 0.10 \cdot \text{range}_j$, $p_j = 0.25 \cdot \text{range}_j$, $v_j = 0.60 \cdot \text{range}_j$
  - Programmatic per-criterion thresholds `ThresholdSpec = number | { abs: number } | { rel: number; ref?: 'direct' | 'inverse' }` via `q`, `p`, `v`, plus configurable distillation parameters `alpha` (default `0.30`) and `beta` (default `-0.15`).
  - Full-precision $\sigma(a,b)$; `electreIIIDistill` returns 1-based competition ranks `descending` ($r_D$) and `ascending` ($r_A$), equivalence classes `descendingClasses` and `ascendingClasses`, and `incomparablePairs` (`electreIIIIncomparablePairs`).
  - Steps emitted: `electre-iii.concordance`, `electre-iii.credibility`, `electre-iii.descending`, `electre-iii.ascending`, `electre-iii.netCredibility` ($\Phi(a) = \frac{1}{m-1}\sum_{b \neq a} (\sigma(a,b) - \sigma(b,a))$). Overall `ranking` is `rankScores(meanRank, 'asc')` where $\bar{r}(a) = \frac{1}{2}(r_D(a) + r_A(a))$.
- Validate q ≤ p ≤ v per criterion and warn when p > column range (criterion can never express strict preference).

## Sources
- Roy (1978), Cahiers du CERO 20(1), 3–24.
- Figueira, Mousseau & Roy (2005), ELECTRE methods, DOI 10.1007/0-387-23081-5_4.
- Wang & Triantaphyllou (2008), Omega 36(1), 45–63, DOI 10.1016/j.omega.2005.12.003.
- Rogers, Bruen & Maystre (1999), *ELECTRE and Decision Support*, Kluwer (original data of the fixture, not seen by us).
- Govindan & Jepsen (2016), EJOR 250(1), 1–29, DOI 10.1016/j.ejor.2015.07.019.
- Hokkanen & Salminen (1994), DOI 10.1007/978-94-017-0767-1_9.
- Tervonen, Figueira, Lahdelma et al., SMAA-III, DOI 10.1007/978-1-4020-9026-4_15.
- pyDecision 5.1.1, `pyDecision/algorithm/e_iii.py`, https://github.com/Valdecy/pyDecision
