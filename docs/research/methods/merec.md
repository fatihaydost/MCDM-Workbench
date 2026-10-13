# MEREC — MEthod based on the Removal Effects of Criteria (merec)

- **Family:** weighting (objective)
- **Origin:** Keshavarz-Ghorabaee, M., Amiri, M., Zavadskas, E.K., Turskis, Z. & Antucheviciene, J. (2021). Determination of Objective Weights Using a New Method Based on the Removal Effects of Criteria (MEREC). *Symmetry* 13(4), 525. DOI [10.3390/sym13040525](https://doi.org/10.3390/sym13040525) (open access; read in full).
- **Popularity:** Crossref cited-by 722 (2026-09-29) — high for a 2021 method; frequently paired with the newer ranking methods (see below).

## For users (site copy)
- **EN:** MEREC asks, for each criterion, "how much would the alternatives' overall scores change if this criterion were removed?" Criteria whose removal changes the scores most get the largest weights. It needs strictly positive data. Pick it when you want objective weights that reflect each criterion's effect on the result rather than just its spread.
- **TR:** MEREC her kriter için şunu sorar: "Bu kriteri çıkarsam alternatiflerin toplam puanları ne kadar değişir?" Çıkarıldığında puanları en çok değiştiren kriterler en büyük ağırlığı alır. Kesinlikle pozitif veri ister. Ağırlıkların yalnızca yayılımı değil, kriterin sonuç üzerindeki etkisini yansıtmasını istediğinizde seçin.

## When to use / when not
- **Use when:** data are positive ratio-scale values; you want an objective method that is less driven by pure variance than SD/Entropy.
- **Do not use when:** the matrix has zeros or negatives (log of normalized value undefined — requires a shift that changes the weights); a criterion has one extreme outlier (min/x ratios explode, see Pitfalls).

## Inputs
- Decision matrix X (m × n), **x_ij > 0** (origin paper Step 1: "these elements should be greater than zero").
- Criterion types `max`/`min` (used in normalization).
- No parameters.

## Algorithm
1. Normalization **into "smaller is better"** (note: reversed w.r.t. WASPAS):
   $n_{ij} = \dfrac{\min_k x_{kj}}{x_{ij}}$ for benefit, $n_{ij} = \dfrac{x_{ij}}{\max_k x_{kj}}$ for cost; so $0 < n_{ij} \le 1$ and the best value maps to the smallest $n$.
2. Overall performance with all criteria: $S_i = \ln\!\Big(1 + \frac{1}{n}\sum_{j} |\ln n_{ij}|\Big)$.
3. Performance with criterion j removed: $S'_{ij} = \ln\!\Big(1 + \frac{1}{n}\sum_{k\ne j} |\ln n_{ik}|\Big)$ (denominator stays n, as in Eq. (4) of the paper).
4. Removal effect: $E_j = \sum_i |S'_{ij} - S_i|$.
5. Weights: $w_j = E_j / \sum_k E_k$.

**Variants.** The paper gives one form. pyDecision `merec_method` is the same algorithm with 1e-9 guards (matches to 8e-12). Fuzzy/intuitionistic MEREC extensions exist but are out of scope.

## Commonly combined with
- MEREC with other objective weightings, then MARA / RAM / PIV (material selection): Dua et al. (2024), *EUREKA: Physics and Engineering*, DOI [10.21303/2461-4262.2024.003171](https://doi.org/10.21303/2461-4262.2024.003171) (their MEREC weights for Case 2 are reproduced exactly by our code: [0.0758, 0.2002, 0.1602, 0.0953, 0.2747, 0.1938]).
- LOPCOW/MEREC → CoCoSo / EDAS (insurance sector, Bektaş 2022) as listed in Keleş (2023) Table 1, DOI [10.25287/ohuiibf.1239201](https://doi.org/10.25287/ohuiibf.1239201).
- MEREC compared with CRITIC, Entropy, SD: origin paper Sec. 4.2.

## Pitfalls
- **Zero or negative values:** ln(0) undefined; min/x with x ≤ 0 meaningless. Reject; optionally offer a shift (x − min + 1) with a warning that weights depend on the shift.
- **Constant column:** n_ij = 1 for all i → |ln n| = 0 → removal changes nothing → E_j = 0 → weight 0.
- **Outliers dominate:** a benefit criterion with one tiny value (e.g., C1 = 5 vs 450 in the paper's example) produces n = 5/450 and a large |ln n|; that criterion then gets most of the weight (0.575 in the example). Show E_j.
- **Precision trap for tests:** the paper prints E_j to 2 decimals (1.71, 0.04, 1.19, 0.03; sum 2.97) but its weights were computed at full precision. Recomputing w from the printed E gives [0.5758, 0.0135, 0.4007, 0.0101] ≠ published — test against weights, not printed E.
- **Dependence on the alternative set:** min/max change when alternatives are added or removed.

## Reference example (test fixture)
- **Source:** Keshavarz-Ghorabaee et al. (2021), *Symmetry* 13(4), 525, DOI 10.3390/sym13040525. Sec. 4.1 illustrative example: input Table 2, normalized Table 3, S'_ij Table 4, weights in Step 6. Second case: Sec. 4.2, input Table 5, output Table 6 column "MEREC".

```json
{
  "id": "merec-keshavarz2021-illustrative",
  "source": "Keshavarz-Ghorabaee et al. 2021, Symmetry 13(4):525, Table 2 (input), Tables 3-4 and Step 6 (output)",
  "types": ["max", "max", "min", "min"],
  "matrix": [[450, 8000, 54, 145], [10, 9100, 2, 160], [100, 8200, 31, 153], [220, 9300, 1, 162], [5, 8400, 23, 158]],
  "expected": {
    "normalized": [[0.011, 1, 1, 0.895], [0.500, 0.879, 0.037, 0.988], [0.050, 0.976, 0.574, 0.944], [0.023, 0.860, 0.019, 1], [1, 0.952, 0.426, 0.975]],
    "S": [0.77, 0.71, 0.65, 1.09, 0.21],
    "S_removed": [[0.03, 0.77, 0.77, 0.75], [0.62, 0.69, 0.19, 0.71], [0.15, 0.64, 0.57, 0.64], [0.71, 1.08, 0.68, 1.09], [0.21, 0.20, 0.02, 0.20]],
    "weights": [0.5752, 0.0141, 0.4016, 0.0091],
    "ranking": [1, 3, 2, 4],
    "tolerance": {"normalized": 5e-4, "S": 5e-3, "weights": 5e-5}
  }
}
```

```json
{
  "id": "merec-keshavarz2021-comparative",
  "source": "Keshavarz-Ghorabaee et al. 2021, Table 5 (input, borrowed from their ref. [62]), Table 6 MEREC column (output)",
  "types": ["max", "max", "max", "min", "min", "min", "min"],
  "matrix": [[23, 264, 2.37, 0.05, 167, 8900, 8.71], [20, 220, 2.2, 0.04, 171, 9100, 8.23], [17, 231, 1.98, 0.15, 192, 10800, 9.91], [12, 210, 1.73, 0.2, 195, 12300, 10.21], [15, 243, 2, 0.14, 187, 12600, 9.34], [14, 222, 1.89, 0.13, 180, 13200, 9.22], [21, 262, 2.43, 0.06, 160, 10300, 8.93], [20, 256, 2.6, 0.07, 163, 11400, 8.44], [19, 266, 2.1, 0.06, 157, 11200, 9.04], [8, 218, 1.94, 0.11, 190, 13400, 10.11]],
  "expected": {"weights": [0.324, 0.055, 0.086, 0.368, 0.044, 0.077, 0.045], "tolerance": 5e-4}
}
```

- **Recomputed** (`scratchpad/mcdm/agirlik/recompute_all.py`):
  - Illustrative: numpy = [0.57522, 0.01410, 0.40156, 0.00912] → **MATCH**, max abs diff 3.9e-5; S = [0.7667, 0.7093, 0.6461, 1.0922, 0.2085] and all 20 S'_ij match Table 4 at 2 d.p.; normalized matrix matches Table 3 at 3 d.p. pyDecision `merec_method` → **MATCH** (diff to numpy 8.2e-12).
  - Comparative: numpy = [0.32443, 0.05518, 0.08636, 0.36777, 0.04449, 0.07662, 0.04514] → **MATCH** at 3 d.p. (max 4.9e-4); pyDecision **MATCH** (1.5e-9).
  - No typo found in the published version (the elaba.lt copy). A pre-print copy on semanticscholar (text extraction partly garbled) appears to contain a worked line "n₂₁ = 10/450 = 0.022, n₄₄ = 145/162 = 0.895", which contradicts Table 3 (n₂₁ = 5/10 = 0.500; 145/162 would be n₁₄); build fixtures from the published version only.

## Implementation notes
- pyDecision: `merec_method(dataset, criterion_type)`.
- TS: validate x > 0 before computing; compute |ln n| once and reuse for S and S' (S'_ij uses the row sum minus column j).
- Return N, S, S', E for the step view.

## Sources
- Keshavarz-Ghorabaee et al. (2021), DOI 10.3390/sym13040525 — full PDF (gs.elaba.lt), Sec. 3–4, Tables 2–6.
- Dua et al. (2024), DOI 10.21303/2461-4262.2024.003171 — full text (journal.eu-jr.eu), Tables 8–9.
- Keleş (2023), DOI 10.25287/ohuiibf.1239201 — Table 1 (literature list).
