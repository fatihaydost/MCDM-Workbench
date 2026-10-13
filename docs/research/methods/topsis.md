# Technique for Order Preference by Similarity to Ideal Solution (TOPSIS)

- **Family:** ranking (compensatory / distance)
- **Origin:** Hwang, C.L.; Yoon, K. (1981). *Multiple Attribute Decision Making: Methods and Applications*. Lecture Notes in Economics and Mathematical Systems 186, Springer. (Book; no DOI checked. Not opened — the canonical English statement of the steps used here is Opricovic & Tzeng 2004, §3, which cites Hwang & Yoon 1981 and Chen & Hwang 1992.)
- **Popularity:** Very high. The review by Behzadian et al. (2012), *A state-of the-art survey of TOPSIS applications*, ESWA 39(17):13051–13069, doi:10.1016/j.eswa.2012.05.056, classified 266 papers from 103 journals (2000–2012); Crossref cited-by counts (checked 2026-09-29): 2,433 for that review, 4,167 for Opricovic & Tzeng (2004).

## For users (site copy)
- **EN:** TOPSIS ranks alternatives by how close they are to an imaginary "best" option and how far they are from an imaginary "worst" option. Pick it when criteria are numeric, trade-offs between criteria are acceptable, and you want a single 0–1 score per alternative.
- **TR:** TOPSIS, alternatifleri hayali "en iyi" seçeneğe ne kadar yakın ve hayali "en kötü" seçenekten ne kadar uzak olduklarına göre sıralar. Kriterler sayısalsa, bir kriterdeki zayıflığın başka bir kriterle telafi edilmesi kabul edilebiliyorsa ve her alternatif için 0–1 arası tek bir skor istiyorsanız uygundur.

## When to use / when not
- Use: quantitative criteria, compensatory logic acceptable, a moderate number of alternatives, need for a closeness score that is easy to explain.
- Avoid / warn: when a criterion scale may be shifted (e.g., °C vs °F, "height above sea" vs "height above foothill") — vector normalization is not invariant to affine transforms and the ranking can change (see the reference example, problem f vs φ). Avoid when non-compensation matters (a very bad value must not be offset) — use an outranking method. Adding/removing an alternative can reverse ranks.

## Inputs
- Decision matrix `X` (m alternatives × n criteria), real numbers; vector normalization tolerates zeros; an all-zero column has norm 0 and is guarded (r = 0, the column drops out, with a warning; see Pitfalls).
- Criterion types: `benefit` | `cost`.
- Weights `w` (n values, ≥ 0; normalize to sum 1 — TOPSIS is invariant to a common scale of `w`, since both distances scale equally).
- No extra parameters in the default. Optional variants: normalization (`vector` default | `linear-max` | `min-max`), distance (`euclidean` default).

## Algorithm
1. Vector normalization: $r_{ij} = x_{ij} / \sqrt{\sum_{i=1}^{m} x_{ij}^2}$.
2. Weighted matrix: $v_{ij} = w_j r_{ij}$.
3. Ideal and anti-ideal: $A^+_j = \max_i v_{ij}$ (benefit) or $\min_i v_{ij}$ (cost); $A^-_j = \min_i v_{ij}$ (benefit) or $\max_i v_{ij}$ (cost).
4. Distances: $D_i^+ = \sqrt{\sum_j (v_{ij} - A^+_j)^2}$, $D_i^- = \sqrt{\sum_j (v_{ij} - A^-_j)^2}$.
5. Closeness: $C_i = D_i^- / (D_i^+ + D_i^-)$, $C_i \in [0,1]$.
6. Rank by decreasing $C_i$.

Variants: linear normalization (Lai & Hwang 1994, as quoted in Opricovic & Tzeng 2004 Eq. 10), min–max normalization, Manhattan/Chebyshev distances, fixed (absolute) ideal points to reduce rank reversal. **We implement the vector-normalized Euclidean version** (Opricovic & Tzeng 2004 §3; same as pyDecision `topsis_method` and the existing `methods/topsis.py`).

## Commonly combined with
- Objective weights → TOPSIS: CRITIC→TOPSIS is this project's existing pipeline (`methods/critic.py` → `methods/topsis.py`); Deng, Yeh & Willis (2000), *Inter-company comparison using modified TOPSIS with objective weights*, Computers & OR 27(10):963–973 (entropy-type objective weights; cited in Opricovic & Tzeng 2004, DOI not checked).
- AHP → TOPSIS is one of the combinations tabulated by Behzadian et al. (2012) (review section "other methods combined or compared with TOPSIS"; exact counts not extracted).
- Used as a comparison method in newer-method papers (EDAS 2015, CODAS 2016, CoCoSo 2019).

## Pitfalls
- **Rank reversal on unit change**: vector normalization depends on affine shifts (φ = a·f + b). The reference example shows the winner switching A1 → A2 between two equivalent encodings.
- **Rank reversal on adding/removing alternatives** (ideal/anti-ideal move).
- Division by zero: an all-zero column gives norm 0 (guard: treat column as uninformative, `r = 0`); if all alternatives are identical, $D^+ = D^- = 0$ → define $C_i = 0.5$ or flag ties (the current Python sets denominator to 1 → C = 0, which silently ranks all as worst; prefer returning ties).
- Negative values: vector normalization still works mathematically but the meaning of "distance" changes little; min–max variant is safer for mixed signs.
- Constant column: contributes 0 to both distances (fine).
- Single alternative: $D^+ = D^- = 0$ → undefined; return C = NaN/"not rankable" or 1.
- A1 can be ranked first without being closest to the ideal (Opricovic & Tzeng 2004, Eq. 7 and Table 3, problem f).

## Reference example (test fixture)
- **Source:** Opricovic, S.; Tzeng, G.-H. (2004). Compromise solution by MCDM methods: A comparative analysis of VIKOR and TOPSIS. *European Journal of Operational Research* 156(2):445–455. doi:10.1016/S0377-2217(03)00020-1 (DOI read from the PDF header). Tables 1, 2 (inputs) and 3 (outputs, "TOPSIS vector normalization"). Full text read via a third-party mirror (pdfcoffee); the article itself is paywalled at Elsevier.
- **Input** (mountain-climber example; problem φ is the same data in other units: φ1 = f1 + 5, φ2 = f2/1000 − 1):

```json
{
  "id": "opricovic-tzeng-2004-f",
  "alternatives": ["A1", "A2", "A3"],
  "criteria": ["risk (1-5)", "altitude (m a.s.l.)"],
  "types": ["cost", "benefit"],
  "weights": [0.5, 0.5],
  "matrix": [[1, 3000], [2, 3750], [5, 4500]],
  "expected": {
    "d_plus":  [0.114, 0.108, 0.365],
    "d_minus": [0.365, 0.280, 0.114],
    "closeness": [0.762, 0.722, 0.238],
    "ranking": [1, 2, 3],
    "tolerance": 0.0005
  }
}
```

```json
{
  "id": "opricovic-tzeng-2004-phi",
  "alternatives": ["A1", "A2", "A3"],
  "criteria": ["risk (6-10)", "altitude (km above foothill)"],
  "types": ["cost", "benefit"],
  "weights": [0.5, 0.5],
  "matrix": [[6, 2.0], [7, 2.75], [10, 3.5]],
  "expected": {
    "d_plus":  [0.154, 0.085, 0.147],
    "d_minus": [0.147, 0.134, 0.154],
    "closeness": [0.489, 0.612, 0.511],
    "ranking": [3, 1, 2],
    "tolerance": 0.0005
  }
}
```

- **Published outputs** (Table 3, 3 decimals): f: C* = 0.762, 0.722, 0.238 → A1 ≻ A2 ≻ A3; φ: C* = 0.489, 0.612, 0.511 → A2 ≻ A3 ≻ A1. Normalized values r(f) = (0.183, 0.365, 0.913 | 0.456, 0.570, 0.684) also match.
- **Recomputed (numpy):** f: D+ = 0.1140, 0.1076, 0.3651; D− = 0.3651, 0.2797, 0.1140; C = 0.7621, 0.7222, 0.2379. φ: D+ = 0.1537, 0.0852, 0.1470; D− = 0.1470, 0.1344, 0.1537; C = 0.4889, 0.6121, 0.5111. **MATCH** (max abs diff 0.00039 on D, 0.00018 on C; paper rounds to 3 dp).
- **pyDecision 5.1.1 `topsis_method`:** identical to ours (diff 0) → **MATCH**.
- **Secondary check (ranks only, 7 weight sets):** Keshavarz Ghorabaee et al. (2015), Informatica 26(3):435–451, doi:10.15388/Informatica.2015.57, Tables 5–7 (10 alternatives × 7 criteria, C1–C3 benefit, C4–C7 cost). Our TOPSIS ranks equal the published TOPSIS ranks in **7/7 sets (MATCH)**. Matrix and weights are in `edas.md`.
- **Secondary check (values):** Podvezko (2011), Engineering Economics 22(2):134–146, doi:10.5755/j01.ee.22.2.310, Tables 7–8: Variant II C = 0.526, 0.471, 0.494 → ours 0.5260, 0.4708, 0.4943 **MATCH**. Variant I MISMATCH (ours 0.5672, 0.4303, 0.5265 vs 0.575, 0.423, 0.539); it matches (max diff 0.0005) only if A2-R4 = 220 instead of the printed 215 → likely a typo in Table 7 (the same 220 also reproduces the paper's COPRAS S− values; see `copras.md`).

## Implementation notes
- pyDecision: `pyDecision.algorithm.topsis_method(dataset, weights, criterion_type, graph, verbose)`; criterion_type `'max'|'min'`; returns `c_i`. No zero guards.
- Existing `methods/topsis.py`: `calculate_closeness()` stores `self.ranking = np.argsort(-C) + 1`, which is an *order* (indices), not ranks; `run()` recomputes ranks correctly. Port only the `run()` logic to TS.
- Edge cases to choose: zero-norm column → r = 0; $D^+ + D^- = 0$ → C = 0.5 and mark tie; ranks with ties → average or "min" rank (pick one globally for all methods; suggest "min" / competition ranking).
- Expose normalization as an option later, but default and tests use vector normalization.

## Sources
- Opricovic & Tzeng 2004, EJOR 156(2):445–455, doi:10.1016/S0377-2217(03)00020-1 (Tables 1–3; mirror: https://pdfcoffee.com/compromise-solution-by-mcdm-methods-a-comparative-analysis-of-vikor-and-topsis-pdf-free.html).
- Keshavarz Ghorabaee et al. 2015, Informatica 26(3):435–451, doi:10.15388/Informatica.2015.57 (Tables 5–7), https://informatica.vu.lt/journal/INFORMATICA/article/779/file/pdf.
- Podvezko 2011, Inžinerinė ekonomika 22(2):134–146, doi:10.5755/j01.ee.22.2.310 (Tables 7–8).
- Behzadian et al. 2012, ESWA 39(17):13051–13069, doi:10.1016/j.eswa.2012.05.056 (popularity).
- pyDecision 5.1.1 (PyPI), `pyDecision/algorithm/topsis.py`.
- Recompute script: `scratchpad/mcdm/siralama/scripts/topsis_vikor.py` (session scratchpad).
