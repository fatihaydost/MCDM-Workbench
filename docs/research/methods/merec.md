# MEREC — MEthod based on the Removal Effects of Criteria (merec)

**Re-verified 2026-10-13** against the primary source (published MDPI PDF, read in full via the Internet Archive copy of the MDPI PDF URL, because mdpi.com itself returns HTTP 403 to scripts) and three later papers read in full (Dua et al. 2024, Ulutaş et al. 2022, Popović et al. 2022), plus the pyDecision source. Four fixtures recomputed independently: MATCH. Reconciled against two skeptic reviews the same day (see "Verification log"). See "Changes on re-verification" at the end.

- **Family:** weighting (objective)
- **Origin:** Keshavarz-Ghorabaee, M., Amiri, M., Zavadskas, E.K., Turskis, Z. & Antucheviciene, J. (2021). Determination of Objective Weights Using a New Method Based on the Removal Effects of Criteria (MEREC). *Symmetry* 13(4), 525. DOI [10.3390/sym13040525](https://doi.org/10.3390/sym13040525). Open access (CC BY). Received 2 Mar 2021, published 24 Mar 2021. Crossref shows no correction or update notice (checked 2026-10-13).
- **Popularity:** OpenAlex cited-by 790 (2026-10-13; Crossref showed 722 on 2026-09-29); OpenAlex has 292 works with "MEREC" in the title. In `combinations.md` MEREC has 130 OpenAlex title/abstract co-mentions with TOPSIS, the lowest of the six weighting methods counted there, but it is a 2021 method. It is common in Turkish finance/sector studies (Bektaş 2022; see `combinations.md` "Typical Turkish pipelines").

## For users (site copy)
- **EN:** MEREC removes each criterion in turn and measures how much the alternatives' overall scores change; criteria whose removal changes the scores most get the largest weights. It needs every value to be above zero.
- **TR:** MEREC her kriteri sırayla çıkarır ve alternatiflerin genel puanlarının ne kadar değiştiğini ölçer; çıkarıldığında puanları en çok değiştiren kriter en büyük ağırlığı alır. Her değerin sıfırdan büyük olmasını ister.

**When to use / combined with (site bullets, one sentence each, each backed by a source read in full or by its abstract where marked):**
- **EN:** Use it when you want weights from the data alone and every value is a positive amount (price, mass, rate, count). *(origin paper, Step 1: "these elements should be greater than zero")*
  **TR:** Ağırlıkların yalnız veriden çıkmasını istiyorsanız ve her değer pozitif bir miktarsa (fiyat, kütle, oran, adet) kullanın.
- **EN:** Avoid it when the data contain zeros or negatives, or are scores on an interval scale such as 1–9 ratings or temperatures, because MEREC works with ratios to the column's worst value. *(origin paper, Eq. 2 and Step 1; scale behaviour recomputed, see Pitfalls)*
  **TR:** Veride sıfır ya da negatif değer varsa veya veriler 1–9 puanları ya da sıcaklık gibi aralık ölçeğindeyse kullanmayın, çünkü MEREC sütunun en kötü değerine oranlarla çalışır.
- **EN:** A criterion whose largest value is many times its smallest value tends to get a large weight, so check the removal effects before you trust the weights. *(inference from recomputing the origin paper's two examples, see Pitfalls)*
  **TR:** En büyük değeri en küçük değerinin kat kat üstünde olan bir kriter genellikle büyük ağırlık alır; ağırlıklara güvenmeden önce çıkarma etkilerine bakın.
- **EN:** MEREC only produces weights; published studies rank with CoCoSo, EDAS, MARCOS, WASPAS, CODAS, MABAC, COBRA, WISP and PIV. *(Bektaş 2022; Ecer & Ayçın 2022; Mastilo et al. 2024 (abstracts); Popović et al. 2022; Ulutaş et al. 2022; Dua et al. 2024 (full texts))*
  **TR:** MEREC yalnız ağırlık üretir; yayımlanmış çalışmalar sıralamayı CoCoSo, EDAS, MARCOS, WASPAS, CODAS, MABAC, COBRA, WISP ve PIV ile yapar.

## When to use / when not
- **Use when:** all x_ij > 0 on a ratio scale (zero means "none"); an objective weight is wanted; as a comparison next to Entropy/CRITIC/SD (the origin paper's Sec. 4.2 does exactly this, correlations r = 0.852 to 0.975).
- **Do not use when:** any x ≤ 0 (ln and min/x undefined; the paper says negatives "should be transformed into positive values using an appropriate technique" but names none, and every shift changes the weights, see Pitfalls); interval-scale data (Likert 1–9, °C, index scores that can be shifted), since the result depends on where zero is; one alternative has a near-zero value on a benefit or cost criterion (ln(max/min) is then large and that criterion dominates); the alternative set is about to change (min and max are taken over the current set).

## Inputs
- Decision matrix X (m × n), **x_ij > 0**, m ≥ 2, n ≥ 2. **Notation trap:** the paper uses n for alternatives and m for criteria, the reverse of our core. Its "1/m" in Eqs. 3–4 is 1/(number of criteria). Ulutaş et al. (2022) misread it as 1/(number of alternatives); see Variants.
- Criterion types benefit/cost (used in normalization only).
- **No parameters.** Equal internal weights in S_i are part of the method (Sec. 3: "a simple logarithmic measure is used with equal weights").

## Algorithm
Origin paper Sec. 3, Eqs. 1–6, rewritten in our notation (i = alternative 1..m, j = criterion 1..n):

1. Decision matrix X, $x_{ij} > 0$ (Step 1, Eq. 1).
2. Normalization that turns every criterion into "smaller is better" (Step 2, Eq. 2):
   $n_{ij} = \dfrac{\min_k x_{kj}}{x_{ij}}$ if $j$ is benefit, $\quad n_{ij} = \dfrac{x_{ij}}{\max_k x_{kj}}$ if $j$ is cost. So $0 < n_{ij} \le 1$, and the best alternative on a criterion gets the **smallest** $n$. The paper stresses that this swaps the WASPAS formulas ("we transform all the criteria into the minimization type criteria").
3. Overall performance (Step 3, Eq. 3): $S_i = \ln\!\Big(1 + \dfrac{1}{n}\sum_{j=1}^{n} \big|\ln n_{ij}\big|\Big)$.
4. Performance with criterion j removed (Step 4, Eq. 4): $S'_{ij} = \ln\!\Big(1 + \dfrac{1}{n}\sum_{k \ne j} \big|\ln n_{ik}\big|\Big)$. The divisor stays $n$, not $n-1$; the worked example confirms it ($S'_{11} = \ln(1 + \tfrac14(\ldots 3\text{ terms}\ldots)) = 0.03$).
5. Removal effect (Step 5, Eq. 5): $E_j = \sum_{i=1}^{m} \big|S'_{ij} - S_i\big|$. Since every $|\ln n| \ge 0$, $S'_{ij} \le S_i$ always, so the absolute value is just $S_i - S'_{ij}$, and $E_j = 0$ **iff** column j is constant.
6. Weights (Step 6, Eq. 6): $w_j = E_j / \sum_k E_k$.

**Variants found in later literature (we implement the origin form only):**
- **(a) Origin, Eqs. 2–6, divisor n (number of criteria).** Default and only option. Reproduced on all four fixtures below.
- **(b) Divisor = number of alternatives.** Ulutaş et al. (2022, Eqs. 4–5) print the paper's formula, but their Table 3 S values are reproduced to 4.3e-4 only with 1/6 (6 alternatives), not 1/7 (7 criteria): our S with 1/7 differs by 0.031. Their weights move little (≤ 1.6e-3 either way), because ln(1 + x) is nearly linear for small x. This is a misreading of the paper's swapped letters, not a separate method.
- **(c) Divisor n − 1 in Eq. 4** (an "average of the remaining criteria"). Not in the paper. It changes the weights a lot: illustrative example [0.378, 0.169, 0.280, 0.173] instead of [0.575, 0.014, 0.402, 0.009]. With it, S' can exceed S. Rejected.
- **(d) ln vs log10.** The paper uses ln. log10 gives different weights (max diff 3.9e-3 on the illustrative example), because the outer ln(1 + ·) is not linear. Rejected.
- **(e) WASPAS-style normalization by mistake** (x/max for benefit, min/x for cost) gives weights that are wrong but look plausible: [0.463, 0.014, 0.507, 0.016] on the illustrative example. Tests must catch this.
- *(Removed on reconciliation: an earlier "variant (f), Dua et al. print ln(n_ij) without |·|". The rendered PDF, p. 133, shows the bars in Eqs. 6, 7 and 8; pdftotext drops them. Dua's Eq. 7 does print the summand as n_ij under Σ_{k≠j}, an index slip for n_ik; their Case 2 and Case 3 weights match the origin form.)*
- **Fuzzy / neutrosophic / "parabolic measure" MEREC extensions** (Narang et al. 2023; Saidin et al. 2023 modify both normalization and the log measure) are out of scope for a crisp tool.

## Commonly combined with
- **MEREC → MARA, RAM, PIV** (and compared with Entropy, LOPCOW, CRITIC and equal weights), material selection: Dua, T.V., Duc, D.V., Bao, N.C. & Trung, D.D. (2024). Integration of objective weighting methods for criteria and MCDM methods: application in material selection. *EUREKA: Physics and Engineering* (2), 131–148, DOI [10.21303/2461-4262.2024.003171](https://doi.org/10.21303/2461-4262.2024.003171) (full PDF read). **The first author is Dua, not Trung**; the current site copy says "Trung et al.".
- **MEREC → WISP-S** (pallet truck selection; checked against ROV and WASPAS): Ulutaş, A., Stanujkić, D., Karabašević, D., Popović, G. & Novaković, S. (2022). *Strategic Management* 27(4), 23–29, DOI [10.5937/straman2200013u](https://doi.org/10.5937/straman2200013u) (full PDF read).
- **MEREC → COBRA** (e-commerce strategy): Popović, G., Pucar, Đ. & Smarandache, F. (2022). *Journal of Process Management and New Technologies* 10(3–4), 66–74, DOI [10.5937/jouproman2203066p](https://doi.org/10.5937/jouproman2203066p) (full PDF read).
- **MEREC + LOPCOW → CoCoSo, EDAS** (Turkish insurance sector 2002–2021): Bektaş, S. (2022). *BDDK Bankacılık ve Finansal Piyasalar Dergisi*, DOI [10.46520/bddkdergisi.1178359](https://doi.org/10.46520/bddkdergisi.1178359) (OpenAlex abstract). Cross-listed in Keleş (2023) Table 1, DOI [10.25287/ohuiibf.1239201](https://doi.org/10.25287/ohuiibf.1239201).
- **MEREC → CODAS, MABAC, MARCOS, CoCoSo, WASPAS, MAIRCA + Borda** (G7 innovation): Ecer, F. & Ayçın, E. (2022). *Informatica*, DOI [10.15388/22-infor494](https://doi.org/10.15388/22-infor494) (OpenAlex abstract).
- **MEREC → MARCOS** (banks, Bosnia and Herzegovina): Mastilo et al. (2024), DOI [10.2478/jcbtp-2024-0008](https://doi.org/10.2478/jcbtp-2024-0008) (abstract).
- **MEREC compared with CRITIC, Entropy and SD:** origin paper Sec. 4.2, Table 6.
- No MEREC → TOPSIS / SAW pipeline was read in full in this pass. Any ranking method that takes a weight vector works, but the claim "commonly paired with TOPSIS" is not sourced here.

## Pitfalls
- **Zero or negative values:** ln(0) and min/x with x ≤ 0 are undefined. The origin paper requires x > 0 and leaves the transformation of negatives open. Recommended: **block** with the existing `non-positive-value` error, cell by cell. Do not offer a shift: shifting C1 of the illustrative example by +100 moves w1 from 0.575 to 0.283 and w3 from 0.402 to 0.677 (recomputed), so "the" weights would depend on an arbitrary constant. This matches `combinations.md` rule 7.
- **Scale behaviour:** invariant to multiplying a column by a constant (C2 × 1000 leaves the weights unchanged, recomputed), **not** to adding a constant (see above). So MEREC suits ratio scales only.
- **Max/min ratio drives the weight (inference):** the largest |ln n| in column j is ln(max_j/min_j), for benefit and cost alike. In the comparative example C4 (0.04 to 0.20, ratio 5) gets 0.368 and C1 (8 to 23) gets 0.324, while C5/C7 (ratio ≈ 1.24) get about 0.045. In the illustrative example C1 (5 to 450) gets 0.575. A single near-zero value can therefore take most of the weight. Show E_j and warn when one weight is > 0.5, as Entropy does.
- **Constant column:** n_ij = 1 for all i, so |ln n| = 0, S' = S and E_j = 0, giving weight 0 (exact, no division). Recomputed: [[1,5,3],[2,5,1],[4,5,2]] gives w2 = 0. Emit a notice (the generic `constant-column` warning already fires in `validateProblem`).
- **All columns constant:** ΣE = 0, so w = 0/0. pyDecision returns **garbage, not NaN**: its 1e-9 guards make n = x/(x+1e-9), and [[1,2],[1,2]] gives [0.667, 0.333]. Recommended: equal weights 1/n plus a warning (same rule as Entropy; test ΣE < 1e-12).
- **Rank reversal / alternative-set dependence:** min and max are over the current alternatives, so adding or removing one alternative changes the weights.
- **m = 2:** works (each column has n ∈ {r, 1}). n = 1: trivial (w = 1), already blocked by `MIN_CRITERIA = 2`.
- **Ties:** no special handling. Tied values give equal n and need no tie-breaking.
- **Test precision trap:** the paper prints S, S' and E to 2 d.p. but computed weights at full precision. From the printed E, 1.71/2.97 = 0.5758, not 0.5752. Adding up the printed rounded |S' − S| terms gives E2 = 0.05, E3 = 1.20, E4 = 0.04, while the paper prints 0.04, 1.19, 0.03 (full precision: 0.0419, 1.1928, 0.0271). These are **rounding artifacts, not misprints**: the printed E are correct roundings of the exact values. Test weights at 5e-5, and S/S'/E only at 5e-3. The paper's weights are also **not** from the rounded Table 3 (that gives 5.3e-4 off). They come from exact normalization.

## Reference example (test fixture)
- **Fixture 1 (primary, with all intermediates):** origin paper Sec. 4.1. Input Table 2, normalized Table 3, S in Step 3, S' in Table 4, E in Step 5, w in Step 6. Labels and types checked against the PDF (C1, C2 ∈ B; C3, C4 ∈ H).
- **Fixture 2:** origin paper Sec. 4.2. Input Table 5 (borrowed from their ref. [62] = Keshavarz Ghorabaee et al. 2015, *Informatica* 26:435, DOI 10.15388/Informatica.2015.57), output Table 6 column MEREC (3 d.p.). C1–C3 ∈ B, C4–C7 ∈ H.
- **Fixture 3 (independent authors):** Dua et al. (2024), Case 2. Input Table 8 (six steels, six benefit criteria), output Table 9 row MEREC (4 d.p.).
- **Fixture 4 (independent authors, mixed types):** Dua et al. (2024), Case 3, p. 143. Input Table 12 (eight heavy-duty gear materials MG1–MG8, seven criteria; C1–C6 benefit, C7 cost per the text), output Table 13 row MEREC (4 d.p.). Fills the gap that fixture 3 is all benefit. Printed-text misprint, harmless: the paragraph says "C8 has the smallest value in MG8"; there is no C8, it means C7 (cost, MG8 = 20000 is the minimum).
- **Not usable as fixtures:**
  - Dua et al. (2024) Case 1 (Table 1 → Table 2 MEREC [0.8196, 0.0601, 0.0601, 0.0601]) is **not reproducible**. Ours with the stated types (C1 cost, C2–C4 benefit) is [0.0272, 0.2607, 0.2599, 0.4523]. None of the 16 benefit/cost assignments and not the WASPAS-style normalization comes close. Three identical weights from three different columns are implausible. Probably a calculation error in the paper.
  - Ulutaş et al. (2022): uses variant (b).
  - Popović et al. (2022) Table 2 (input Table 1 from Stanujkic et al. 2019): published [0.097, 0.056, 0.153, 0.347, 0.347], ours [0.0899, 0.0499, 0.1470, 0.3566, 0.3566], max diff 9.6e-3. No divisor choice explains it. Not reproducible, cause unknown.

```json
{
  "id": "merec-keshavarz2021-illustrative",
  "source": "Keshavarz-Ghorabaee et al. 2021, Symmetry 13(4):525, doi:10.3390/sym13040525, Sec. 4.1: Table 2 (input), Table 3 (normalized), Step 3 (S), Table 4 (S'), Step 5 (E), Step 6 (weights)",
  "alternatives": ["A1", "A2", "A3", "A4", "A5"],
  "criteria": ["C1", "C2", "C3", "C4"],
  "types": ["benefit", "benefit", "cost", "cost"],
  "matrix": [[450, 8000, 54, 145], [10, 9100, 2, 160], [100, 8200, 31, 153], [220, 9300, 1, 162], [5, 8400, 23, 158]],
  "expected": {
    "normalized": [[0.011, 1, 1, 0.895], [0.500, 0.879, 0.037, 0.988], [0.050, 0.976, 0.574, 0.944], [0.023, 0.860, 0.019, 1], [1, 0.952, 0.426, 0.975]],
    "S": [0.77, 0.71, 0.65, 1.09, 0.21],
    "S_removed": [[0.03, 0.77, 0.77, 0.75], [0.62, 0.69, 0.19, 0.71], [0.15, 0.64, 0.57, 0.64], [0.71, 1.08, 0.68, 1.09], [0.21, 0.20, 0.02, 0.20]],
    "E_printed": [1.71, 0.04, 1.19, 0.03],
    "E_full_precision_recomputed": [1.70867, 0.04187, 1.19282, 0.02709],
    "weights": [0.5752, 0.0141, 0.4016, 0.0091],
    "tolerance": {"normalized": 0.000500001, "S": 0.005000001, "S_removed": 0.005000001, "E": 0.005000001, "weights": 5e-5}
  }
}
```

```json
{
  "id": "merec-keshavarz2021-comparative",
  "source": "Keshavarz-Ghorabaee et al. 2021, Symmetry 13(4):525, Sec. 4.2: Table 5 (input, from their ref. [62] doi:10.15388/Informatica.2015.57), Table 6 column MEREC (output)",
  "alternatives": ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"],
  "criteria": ["C1", "C2", "C3", "C4", "C5", "C6", "C7"],
  "types": ["benefit", "benefit", "benefit", "cost", "cost", "cost", "cost"],
  "matrix": [[23, 264, 2.37, 0.05, 167, 8900, 8.71], [20, 220, 2.2, 0.04, 171, 9100, 8.23], [17, 231, 1.98, 0.15, 192, 10800, 9.91], [12, 210, 1.73, 0.2, 195, 12300, 10.21], [15, 243, 2, 0.14, 187, 12600, 9.34], [14, 222, 1.89, 0.13, 180, 13200, 9.22], [21, 262, 2.43, 0.06, 160, 10300, 8.93], [20, 256, 2.6, 0.07, 163, 11400, 8.44], [19, 266, 2.1, 0.06, 157, 11200, 9.04], [8, 218, 1.94, 0.11, 190, 13400, 10.11]],
  "expected": {"weights": [0.324, 0.055, 0.086, 0.368, 0.044, 0.077, 0.045], "tolerance": 0.000500001}
}
```

```json
{
  "id": "merec-dua2024-case2",
  "source": "Dua, Duc, Bao & Trung 2024, EUREKA: Physics and Engineering (2), doi:10.21303/2461-4262.2024.003171, Table 8 (input), Table 9 row MEREC (output)",
  "alternatives": ["C35", "C45", "C50", "42CrMoS4", "C15", "C10"],
  "criteria": ["hardness_HB", "tensile_strength", "yield_limit", "relative_elongation", "relative_contraction", "impact_toughness"],
  "types": ["benefit", "benefit", "benefit", "benefit", "benefit", "benefit"],
  "matrix": [[242, 55.9, 94.9, 42, 41, 44], [232, 65.7, 33.9, 42, 12, 14], [234, 39.4, 68.2, 23, 44, 43], [213, 77.6, 61.4, 32, 33, 34], [321, 37.4, 38.1, 31, 43, 34], [431, 24.3, 76.8, 24, 24, 14]],
  "expected": {"weights": [0.0758, 0.2002, 0.1602, 0.0953, 0.2747, 0.1938], "tolerance": 5e-5}
}
```

```json
{
  "id": "merec-dua2024-case3",
  "source": "Dua, Duc, Bao & Trung 2024, EUREKA: Physics and Engineering (2), doi:10.21303/2461-4262.2024.003171, p. 143: Table 12 (input), Table 13 row MEREC (output)",
  "alternatives": ["MG1", "MG2", "MG3", "MG4", "MG5", "MG6", "MG7", "MG8"],
  "criteria": ["tensile_strength", "elongation", "reduction_in_area", "C4", "hardness_HB", "impact_strength", "cost"],
  "types": ["benefit", "benefit", "benefit", "benefit", "benefit", "benefit", "cost"],
  "matrix": [[780, 18, 55, 635, 229, 880, 22000], [880, 15, 50, 735, 225, 390, 30000], [930, 13, 45, 785, 269, 590, 31000], [980, 15, 45, 785, 217, 600, 22000], [980, 12, 45, 835, 250, 950, 24000], [1080, 12, 50, 930, 220, 960, 22000], [885, 12, 40, 685, 195, 970, 21000], [750, 12, 45, 400, 179, 940, 20000]],
  "expected": {"weights": [0.0837, 0.0536, 0.0705, 0.2640, 0.0972, 0.3077, 0.1233], "tolerance": 5e-5}
}
```
(C4 is labelled "melting point (MPa)" in the paper, a unit mismatch in the source; the label is kept neutral.)

- **Recomputed** (`scratchpad/mcdm/scripts/merec.py`, numpy, independent of pyDecision):
  - Fixture 1: w = [0.57522, 0.01410, 0.40156, 0.00912] → **MATCH**, max abs diff 3.9e-5. N vs Table 3: 4.8e-4 (3-d.p. rounding). S = [0.76671, 0.70930, 0.64613, 1.09224, 0.20849] vs Step 3: 3.9e-3. S' vs Table 4: all 20 within 5.0e-3. E vs printed: 2.9e-3. No misprint in the published version. The printed E/S/S' are 2-d.p. roundings of the exact values (see Pitfalls). Printed vs corrected: none needed.
  - Fixture 2: w = [0.32443, 0.05518, 0.08636, 0.36777, 0.04449, 0.07662, 0.04514] → **MATCH** at 3 d.p., max abs diff 4.9e-4 (every weight rounds to the printed value).
  - Fixture 3: w = [0.07582, 0.20019, 0.16018, 0.09530, 0.27470, 0.19381] → **MATCH**, max abs diff 1.8e-5.
  - Fixture 4: w = [0.08372, 0.05359, 0.07049, 0.26396, 0.09719, 0.30769, 0.12334] → **MATCH**, max abs diff 4.4e-5; every weight rounds to the printed 4 d.p. Of all 128 benefit/cost assignments the stated one fits best (next best 2.3e-3). Script `scripts/merec_reconcile.py`.
  - **Tolerance margins (why the odd tolerances above):** the printed values are correct roundings that sit at the half-step. Fixture 1 A4/C3: S' = 0.68496 vs printed 0.68 (diff 4.96e-3, margin 4e-5); fixture 2 C5: w = 0.04449 vs 0.044 (diff 4.91e-4, margin 9e-6). Tests use `|x − printed| ≤ 0.5·10^-k + 1e-9` (the JSON values), never a strict `<` against 0.5·10^-k and never rounded intermediates.
  - Variant checks on fixture 1 (all MISMATCH, as expected): divisor n − 1 (0.197), log10 (3.9e-3), WASPAS-style normalization (0.113), weights from rounded Table 3 (5.3e-4).
- **pyDecision** `merec_method` (GitHub master; file last changed 2023-10-26; transcribed into the script for comparison only): same algorithm as the origin paper plus 1e-9 guards. Fixture 1: 8.2e-12, fixture 2: 1.5e-9, fixture 3: 4.9e-12 from ours. Divergences matter only on bad input:
  - a zero in a benefit column is silently accepted (divisor 1e-9). [[0,2],[1,3],[2,1]] gives [0.929, 0.071] with no error.
  - negatives give NaN.
  - an all-constant matrix gives non-equal garbage weights ([0.667, 0.333]) instead of 0/0.
  - It does not return N, S, S' or E.
  - The owner's rule stands: pyDecision is not the reference. Here it happens to agree on valid input.

## Implementation notes
- `src/core/methods/merec.ts`: `export const merec: WeightingMethod = { id: 'merec', kind: 'weighting', compute(problem) }`, with **no `params`** (the origin method has none). Register it in `registry.ts` in `weighting`.
- Validation: `assertValid([...validateProblem(problem), ...own])`, where `own` pushes `{ code: 'non-positive-value', severity: 'error', row, col, value }` for every finite x ≤ 0. The code already exists in `ValidationCode`. `validateRequirements` is only for `RankingMethod.requires`, so do it inline, as Entropy does for `negative-value`.
- Compute in float64. L_ij = |ln n_ij| = −ln n_ij (n ≤ 1). Compute it once, then R_i = Σ_j L_ij, S_i = log1p(R_i / n), S'_ij = log1p((R_i − L_ij)/n) (for the step view). This is O(mn), not O(mn²). For E use the cancellation-free identity S_i − S'_ij = ln((n + R_i)/(n + R_i − L_ij)) = `Math.log1p(L_ij / (n + R_i − L_ij))`, so E_j = Σ_i log1p(L_ij / (n + R_i − L_ij)). It is ≥ 0 by construction and exactly 0 when L_ij = 0, so no clamp is needed. (Robustness only: the naive difference already matches every fixture; on a near-constant column beside a widely spread one it carries ~4e-4 relative error on a ~1e-13 weight.)
- Constant column (**decided 2026-10-17, owner**): detect it with the shared `isConstant` tolerance from `src/core/math.ts` (max - min <= 1e-12 * max|x|, as SD and CRITIC do), not the exact `col.every(v => v === col[0])` test first proposed here; set L_ij = 0 exactly (so E_j = 0 exactly). Emit warning `merec.constant-column`. A column above that band but within `isNearConstant` (1e-9) keeps its weight and gets `merec.near-constant-column`.
- All-constant (**decided 2026-10-17**): `allConstant` = every column is constant by `isConstant`; then weights 1/n plus warning `merec.all-constant-equal-weights` (mirrors `ENTROPY_NO_INFORMATION`). The one-ulp matrix [[0.3, 1], [0.1 + 0.2, 1]] therefore counts as all-constant and gets 1/n with the warning. Keep the 0/0 guard (if ΣE === 0 while `allConstant` is false, return 1/n with the same warning and set `allConstant = true`); with `isConstant` it is defensive only.
- If one weight is > 0.5, emit warning `merec.dominant-weight` with col (mirrors Entropy; illustrative example triggers it with w1 = 0.575).
- Steps for the step view:
  - `merec.normalized` (matrix N)
  - `merec.absLog` (matrix |ln N|, optional)
  - `merec.performance` (vector S)
  - `merec.performanceRemoved` (matrix S')
  - `merec.removalEffect` (vector E)
  - `merec.weights` (vector w)
- Diagnostics: `constantColumns`, `allConstant`.
- Tests: the four fixtures as JSON in `tests/fixtures/` with `types` as benefit/cost; intermediate assertions on fixture 1 at the tolerances above. Edge tests:
  - x = 0 and x < 0 throw `ProblemValidationError` with `non-positive-value`
  - a constant column gives w = 0
  - an all-constant matrix gives 1/n
  - the one-ulp matrix ([[0.3, 1], [0.1 + 0.2, 1]]) is all-constant under `isConstant`: 1/n and the all-constant warning (decided 2026-10-17); a near-but-not-constant column (relative spread 5e-10) gives finite weights summing to 1, no all-constant warning, and `merec.near-constant-column`
  - multiplying a column by 1000 leaves the weights unchanged
  - adding a constant changes them (document the behaviour)
  - a regression test that the WASPAS-style normalization is **not** used (fixture 1 would give 0.463).
- Site content (`src/content/methods/merec.ts`):
  - replace "Trung et al. (2024)" / "Trung vd. (2024)" with "Dua et al. (2024)" / "Dua vd. (2024)" at every occurrence (grep of main-ro/src/content, 2026-10-13): `merec.ts` lines 51 (EN), 52 (TR), 81 (source label); `equal.ts` lines 32, 33, 56; `lopcow.ts` lines 76, 77, 83. OpenAlex gives the first author as Tran Van Dua.
  - drop "reproduced exactly" wording unless it cites Case 2
  - swap the shift pitfall for "blocked"
  - TR copy uses "siz", and "min-maks" where min–max appears.

## Sources
- Keshavarz-Ghorabaee, M., Amiri, M., Zavadskas, E.K., Turskis, Z. & Antucheviciene, J. (2021), *Symmetry* 13(4), 525, DOI 10.3390/sym13040525. Full published PDF (20 pp.) read via web.archive.org snapshot 2026-09-14 of `mdpi.com/2073-8994/13/4/525/pdf` (mdpi.com blocks scripted access). Sec. 3 Eqs. 1–6, Sec. 4.1 Tables 2–4, Sec. 4.2 Tables 5–6, references [62], [65].
- Dua, T.V., Duc, D.V., Bao, N.C. & Trung, D.D. (2024), *EUREKA: Physics and Engineering* (2), 131–148, DOI 10.21303/2461-4262.2024.003171. Full PDF (journal.eu-jr.eu), Eqs. 4–9 (p. 133 rendered as an image to check the |·| bars), Tables 1–2, 8–9, 12–13.
- Ulutaş, A. et al. (2022), *Strategic Management* 27(4), 23–29, DOI 10.5937/straman2200013u. Full PDF (scindeks), Eqs. 1–7, Tables 1–5.
- Popović, G., Pucar, Đ. & Smarandache, F. (2022), *J. Process Management and New Technologies*, DOI 10.5937/jouproman2203066p. Full PDF (scindeks), Tables 1–2.
- Bektaş, S. (2022), DOI 10.46520/bddkdergisi.1178359; Ecer, F. & Ayçın, E. (2022), DOI 10.15388/22-infor494; Mastilo et al. (2024), DOI 10.2478/jcbtp-2024-0008. OpenAlex abstracts only.
- Keleş (2023), DOI 10.25287/ohuiibf.1239201. Table 1 (from the 29.09 pass, not re-read).
- pyDecision `pyDecision/algorithm/merec.py` (GitHub master, last commit 2023-10-26, read 2026-10-13).
- Figshare supplementary data (ref. [65], the simulation matrices behind Tables 7–9). **Printed DOI misprint:** the PDF links `10.6084/m6089.figshare.13806302` (HTTP 404). **Corrected:** `10.6084/m9.figshare.13806302` resolves (302 to figshare.com/articles/dataset/…/13806302), checked 2026-10-13. Data set not downloaded; not needed for the fixtures.

## Changes on re-verification (2026-10-13)
- Primary source re-read in full (published PDF). All formulas confirmed. Added: the paper's swapped notation (n = alternatives, m = criteria); E_j ≥ 0 with E_j = 0 iff the column is constant; the paper's line on negatives ("transformed into positive values using an appropriate technique").
- Fixtures: input/output values re-checked against the PDF; types now `benefit`/`cost` like the repo fixtures; fixture 1 now also carries printed and full-precision E. Both MATCH as before (3.9e-5, 4.9e-4).
- **New fixture 3:** Dua et al. 2024 Case 2 (MATCH 1.8e-5).
- **Citation fix:** first author is Tran Van Dua, not "Trung" (the draft and the site copy in `merec.ts` and `equal.ts` say "Trung et al.").
- New: Dua et al. Case 1 is not reproducible (documented; not a fixture). Popović 2022 is not reproducible (9.6e-3).
- Draft's "precision trap" kept and made precise. The E sums that look off by 0.01 are rounding artifacts, not misprints.
- Variants section rewritten:
  - (b) Ulutaş divisor = #alternatives, verified (S to 4.3e-4)
  - (c) n − 1
  - (d) log10
  - (e) WASPAS-style normalization
  - (f) Dua's missing |·| (withdrawn on reconciliation, see Verification log)
  - The origin form stays the only one implemented.
- Pitfalls: shift is no longer offered (it was "optionally offer a shift" in the draft), with the size of the effect recomputed. Added scale invariance, the max/min-ratio driver (marked as inference), the all-constant case and pyDecision's garbage output there.
- pyDecision: source read; the agreement on valid input is unchanged. The new finding is how it behaves on zeros, negatives and all-constant input.
- Removed the draft's remark about a "pre-print copy on semanticscholar": not re-checked and not needed now that the published PDF is read.
- Combined-with: replaced "commonly with TOPSIS"-style claims by six sourced pipelines. No full-text MEREC→TOPSIS/SAW source in this pass.
- Popularity: OpenAlex 790 (2026-10-13).

## Verification log (reconciliation, 2026-10-13)
Two skeptic reviews (10 items, 8 distinct). Each checked against the primary PDFs and `scripts/merec_reconcile.py`.
1. **Site copy "ratios to the column's best value" (blocker, raised twice):** skeptics right. Eq. 2 divides by the column's worst value (benefit min/x, cost x/max); recomputed N[A5,C1] = 1.0 (worst), N[A1,C1] = 0.0111 (best). Fixed EN "worst value", TR "en kötü değerine".
2. **Dua Case 3 missing (raised twice):** skeptics right. Recomputed to 4.4e-5, all 4 d.p. equal; stated types are the best of 128. Added as fixture 4.
3. **"Trung" list incomplete (raised twice):** skeptics right; grep confirms 9 lines in merec.ts, equal.ts, lopcow.ts. Implementation note lists all.
4. **log1p does not address cancellation:** skeptic right (algebra checked; small effect measured). Implementation note now uses log1p(L/(n + R − L)), no clamp. Not a fixture issue.
5. **All-constant threshold vs exact detection:** skeptic right (one-ulp matrix gives ΣE = 2.2e-16). Rule changed to exact all-constant plus a ΣE === 0 guard; new edge test.
6. **Tolerance margins:** skeptic right (margins 4e-5 and 9e-6, reproduced). Tolerances widened to 0.5·10^-k + 1e-9; rounding-equality noted.
7. **Variant (f) Dua missing |·|:** skeptic right. Rendered p. 133 shows the bars in Eqs. 6–8; the claim came from pdftotext. Variant deleted; the real slip (n_ij for n_ik in Eq. 7) noted instead.
8. **Figshare data "not found":** skeptic right. Printed DOI (m6089) 404s; corrected m9 DOI resolves. Both recorded in Sources.
