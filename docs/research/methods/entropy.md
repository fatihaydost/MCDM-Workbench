# Entropy weighting (Shannon) (entropy)

**Re-verified 2026-10-05** against primary sources (full texts of Zavadskas et al. 2017, Krishnan et al. 2021, Mukhametzyanov 2021, Vujičić et al. 2017, Keshavarz-Ghorabaee et al. 2021, Zhu et al. 2020; pyDecision source). Both fixtures recomputed independently: MATCH. See "Changes on re-verification" at the end.

- **Family:** weighting (objective)
- **Origin:** Shannon, C.E. (1948). A Mathematical Theory of Communication. *Bell System Technical Journal* 27(3), 379–423. DOI [10.1002/j.1538-7305.1948.tb01338.x](https://doi.org/10.1002/j.1538-7305.1948.tb01338.x) (information measure). Use as an MCDM weighting method is usually credited to Zeleny (1982, *Multiple Criteria Decision Making*, McGraw-Hill; no DOI) and Hwang, C.-L. & Yoon, K. (1981), *Multiple Attribute Decision Making*, Springer LNEMS 186, DOI [10.1007/978-3-642-48318-9](https://doi.org/10.1007/978-3-642-48318-9). Both books not read; the algorithm is taken from the open-access restatements listed in Sources (Zavadskas et al. 2017 Eqs. 1–4; Mukhametzyanov 2021 Eqs. 1–6; Vujičić et al. 2017 Eqs. 15–19).
- **Popularity:** Crossref cited-by 6,998 for Hwang & Yoon (1981) (2026-09-29). In the 30-study review table of Keshavarz-Ghorabaee et al. (2021, Symmetry 13:525, Table 1; 2020–2021) Entropy is used in 12 studies, CRITIC in 13, Standard Deviation in 8 (recounted from the full text 2026-10-05). Krishnan et al. (2021, Sec. 4) chose Entropy for comparison "because of its long existence and widespread application in real problems".

## For users (site copy)
- **EN:** Entropy weighting treats each criterion as a source of information: if all alternatives score almost the same on a criterion, that criterion cannot tell them apart and gets little weight; if scores are spread unevenly, it gets more. It only looks at the data, not at what the criterion means. Pick it for a quick, fully objective weighting of a filled decision matrix.
- **TR:** Entropi ağırlıklandırması her kriteri bir bilgi kaynağı gibi görür: tüm alternatifler bir kriterde hemen hemen aynı puanı alıyorsa o kriter onları ayırt edemez ve az ağırlık alır; puanlar dengesiz dağılıyorsa daha çok ağırlık alır. Yalnız veriye bakar, kriterin anlamına bakmaz. Dolu bir karar matrisi için hızlı ve tamamen nesnel bir ağırlık istediğinizde seçin.

**When to use / combined with (site bullets, each backed by a source read in full):**
- **EN:** Use it when no expert judgement is available and the matrix holds measured, non-negative numbers; the weights come from the data alone. *(Vujičić et al. 2017, Sec. 3.1, DOI 10.5937/tehnika1703422V; Zavadskas et al. 2017, Sec. 5.1.1, DOI 10.3390/su9050702)*
  **TR:** Uzman görüşü yoksa ve matris ölçülmüş, negatif olmayan sayılardan oluşuyorsa kullanın; ağırlıklar yalnız veriden çıkar.
- **EN:** Entropy only produces weights; a ranking method uses them. In published studies it is paired with TOPSIS, EDAS, SAW, COPRAS, MOORA, VIKOR and PROMETHEE. *(Zavadskas et al. 2017: COPRAS, SAW, TOPSIS, EDAS; Vujičić et al. 2017: MOORA, SAW; Keshavarz-Ghorabaee et al. 2021, Sec. 2: TOPSIS, EDAS, VIKOR, PROMETHEE, DOI 10.3390/sym13040525)*
  **TR:** Entropi yalnız ağırlık üretir; sıralamayı başka bir yöntem yapar. Yayımlanmış çalışmalarda TOPSIS, EDAS, SAW, COPRAS, MOORA, VIKOR ve PROMETHEE ile birlikte kullanılır.
- **EN:** It is often compared or combined with other objective weights (CRITIC, Standard Deviation, CILOS, MEREC) or merged with expert weights. *(Krishnan et al. 2021, Table 5, DOI 10.3390/sym13060973; Zavadskas et al. 2017, Eqs. 9–11: Entropy × CILOS → IDOCRIW, then × expert weights)*
  **TR:** Çoğu zaman başka nesnel ağırlıklarla (CRITIC, Standart Sapma, CILOS, MEREC) karşılaştırılır ya da uzman ağırlıklarıyla birleştirilir.
- **EN:** Be careful when the data are very similar across alternatives or contain many zeros: small differences or zeros can give one criterion most of the weight. *(Vujičić et al. 2017, Table 4; Zhu, Tian & Yan 2020, DOI 10.1155/2020/3564835; Mukhametzyanov 2021, Table 2, DOI 10.31181/dmame210402076i)*
  **TR:** Veriler alternatifler arasında çok benzerse ya da çok sayıda sıfır içeriyorsa dikkatli olun: küçük farklar veya sıfırlar bir kritere ağırlığın çoğunu verebilir.

## When to use / when not
- **Use when:** you have non-negative, ratio-scale data (counts, prices, rates) and want dispersion-based weights; as a baseline next to CRITIC/SD/MEREC.
- **Do not use when:** data contain negatives you cannot shift sensibly (variant (a)); a column is mostly zeros (Zhu et al. 2020: a near-constant column with one non-zero value takes most of the weight); the matrix is very homogeneous (weights decided by the third decimal of e_j, see Pitfalls); the set of alternatives is about to change (replacing one alternative moves Entropy weights strongly, Mukhametzyanov 2021 Table 2); the importance of criteria is known from the decision context.

## Inputs
- Decision matrix X (m × n), m ≥ 2 alternatives. Default variant needs x_ij ≥ 0.
- Criterion types are **not used** by the default variant (a): it measures dispersion only, direction does not enter (Vujičić et al. 2017, Sec. 3.1: "either the type or the nature of the criteria is not important"). Variant (b) uses them (cost inversion inside min–max).
- Parameter `normalization` ∈ {`sum` (default), `minmax`}; see Variants.

## Algorithm
1. Proportions: $p_{ij} = r_{ij} / \sum_{i=1}^{m} r_{ij}$, where $r = x$ in variant (a) and $r$ = min–max value in variant (b).
2. Entropy: $e_j = -k\sum_{i=1}^{m} p_{ij}\ln p_{ij}$, $k = 1/\ln m$, with $0\cdot\ln 0 := 0$; $0 \le e_j \le 1$.
3. Degree of diversification: $d_j = 1 - e_j$.
4. Weights: $w_j = d_j / \sum_k d_k$.

**Variants (what r is before step 1).** The literature does not agree on what p_ij is computed from:
- **(a) `sum` on raw data** — $r_{ij} = x_{ij}$, so $p_{ij} = x_{ij}/\sum_i x_{ij}$; criterion type ignored. Stated explicitly in Zavadskas et al. 2017 Eq. 1 and Vujičić et al. 2017 Eq. 15 (both reproduced below); usually attributed to Hwang & Yoon (book not read). **Default.**
- **(b) `minmax` first** — stated explicitly in Mukhametzyanov 2021 Eqs. 1–4:
  - benefit: $r_{ij} = \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}}$; cost: $r_{ij} = \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}}$; $r_{ij}\in[0,1]$;
  - $p_{ij} = r_{ij}/\sum_i r_{ij}$; $e_j = -\frac{1}{\ln m}\sum_i p_{ij}\ln p_{ij}$ "if $p_{ij}=0$, $p_{ij}\ln p_{ij}=0$" (Eq. 4, verbatim condition); $q_j = 1-e_j$; $w_j = q_j/\sum q_k$.
  - Krishnan et al. (2021) write the same min–max as one formula, Eq. 2: $\bar x_{ij} = (x_{ij} - x_j^{worst})/(x_j^{best} - x_j^{worst})$ (best = max for benefit, min for cost), and print the result as Table 2. Their text only says "Hwang's entropy-based method [25]" and does not state which matrix Entropy was run on; the calculation is in a Supplementary spreadsheet (MDPI returned 403, not read). **Inference from recomputation:** Table 5 "Entropy" is reproduced to 4.5e-5 only when Entropy runs on the Table 2 min–max matrix; (a) on raw Table 1 gives max diff 0.109, (c)/(d) give 0.115. So Krishnan Table 5 = variant (b).
  - Handles negatives and cost criteria, but the worst alternative always gets r = 0, which lowers e_j (see Pitfalls).
- **(c) WASPAS-type** x/max (benefit), min/x (cost), then p (Keshavarz-Ghorabaee et al. 2021, comparative analysis). Not offered.
- **(d) pyDecision** `entropy_method` (source read 2026-10-05): benefit p = x/Σx, cost p = (1/(x+1e-9))/Σ(1/(x+1e-9)), then `np.abs`, `log(p+1e-9)`, `k = 1/log(m+1e-9)`, `d += 1e-9`. Same weights as (c) up to the 1e-9 guards (sum-normalization removes the max/min scaling). **Differs from (a) and (b)** (see Recomputed). Not our default.

We implement (a) as default and (b) as an option, and label the option in the UI (Fatih, 05.10).

## Commonly combined with
- Entropy × CILOS → IDOCRIW, combined with expert weights, then COPRAS, SAW, TOPSIS and EDAS: Zavadskas et al. (2017), DOI [10.3390/su9050702](https://doi.org/10.3390/su9050702), Secs. 5–6 (read).
- Entropy and CRITIC as weights for MOORA and SAW (air-conditioner selection, 6 normalization variants): Vujičić, M.D., Papić, M.Z. & Blagojević, M.D. (2017). Comparative analysis of objective techniques for criteria weighing in two MCDM methods on example of an air conditioner selection. *Tehnika* 72(3), 422–429, DOI [10.5937/tehnika1703422V](https://doi.org/10.5937/tehnika1703422V) (full PDF read; authors/DOI confirmed via Crossref and the PDF header).
- Entropy → EDAS: Yazdani et al. (2020), *Sustainable Operations and Computers* 1, 35–42, DOI [10.1016/j.susoc.2020.12.002](https://doi.org/10.1016/j.susoc.2020.12.002) (Crossref metadata; described in Keshavarz-Ghorabaee et al. 2021 Sec. 2). Entropy → TOPSIS: Alao et al. (2020), *Energy* 201, 117675, DOI [10.1016/j.energy.2020.117675](https://doi.org/10.1016/j.energy.2020.117675) (Crossref metadata; same review). The same review also lists Entropy with VIKOR (Li et al. 2020), fuzzy PROMETHEE (Zha et al. 2020) and OCRA/EATWIOS (Görçün 2020).
- Entropy compared with CRITIC, CILOS, IDOCRIW and D-CRITIC on one matrix: Krishnan et al. (2021), DOI [10.3390/sym13060973](https://doi.org/10.3390/sym13060973), Table 5 (read).

## Pitfalls
- **Zeros (a):** 0·ln 0 is defined as 0, so zeros are allowed, but they pull e_j down and inflate the weight. Zhu, Tian & Yan (2020, Table 2) give a sulfide column [0.045, 0, 0, 0, 0] (practically constant, all "excellent") that receives the largest weight. Our recomputation of their Table 2 with (a) gives e = [0.768, 0.806, 0.000], w = [0.163, 0.136, **0.701**]; the paper prints e = [0.994, 0.995, 0.970], w = [0.138, 0.119, 0.743], which we could not reproduce (a one-non-zero column has e = 0 by definition), but the direction of the distortion is the same. Show a notice when a column contains zeros.
- **Zeros (b):** min–max always sets the worst alternative to r = 0 (and with m = 2 every non-constant column becomes p = (1, 0), e = 0, so all non-constant criteria get equal weight). Krishnan c1: e = 0.635 against 0.79–0.86 for the others.
- **All-zero column (a):** Σx = 0, p undefined. It is the limit of a constant column (p = 1/m, e = 1), so treat it as constant: d = 0, weight 0, with a warning. (Earlier draft: reject the matrix.)
- **Negatives:** variant (a) is invalid with negative values (p < 0). Behaviour (Fatih, 05.10): (a) raises an error that offers (b); (b) is shift-invariant and accepts negatives. Shifting (x − min + ε) is not offered: it changes the weights and is not in any source we reproduced.
- **Constant column:** (a): p = 1/m → e = 1 → d = 0 → weight 0 (correct). Float can give e = 1 ± 1e-16; clamp d to ≥ 0. (b): max = min → 0/0; define d = 0, weight 0 explicitly (do not divide).
- **All columns constant:** Σd = 0 (use Σd < 1e-12) → fall back to equal weights with a warning.
- **Homogeneous data amplify noise:** when all e_j ≈ 1, tiny differences in d_j decide the weights. Vujičić et al. (2017) Table 4: e = 0.991…0.999, w = 0.024…0.378 (a 16× spread from the third decimal of e; recomputed, see secondary fixtures). Show d_j next to w_j.
- **Instability under a change of alternatives:** Mukhametzyanov (2021) Table 2: replacing one of 8 alternatives moves Entropy weights by up to 185 % (CRITIC 52 %, SD 24 %) and changes the SAW ranking.
- **Variant choice changes results a lot:** on the Krishnan et al. (2021) matrix, (b) gives w1 = 0.348, pyDecision 0.443; on Zavadskas et al. (2017) data (a) vs pyDecision differ by up to 0.198 per weight.
- **Scale invariance:** (a) is invariant to multiplying a column by a constant but **not** to adding one (°C vs K give different weights). (b) is invariant to both.
- **m = 1:** ln m = 0 → undefined; require m ≥ 2.
- **Missing / non-numeric cells:** reject.

## Reference example (test fixture)
- **Source A (default variant (a), raw data):** Zavadskas, E.K., Cavallaro, F., Podvezko, V., Ubarte, I. & Kaklauskas, A. (2017). MCDM Assessment of a Healthy and Safe Built Environment According to Sustainable Development Principles: A Practical Neighborhood Approach in Vilnius. *Sustainability* 9(5), 702. DOI [10.3390/su9050702](https://doi.org/10.3390/su9050702). Input: Table 4 (21 neighbourhoods; economic criteria). Output: Table 8, column "Entropy". Method stated in Sec. 5.1.1 Eqs. 1–4 (p on raw data). No correction notice in Crossref (checked 2026-10-05).
  - **Row-label error in the paper (re-checked 2026-10-05 against the MDPI full text):** the five published values match our recomputation, but assigned to the wrong rows. Published row k equals our column perm[k] with perm = [2, 4, 0, 1, 3] (e.g., the paper labels 0.0308 as "Density of single-family houses"; from the data it belongs to "Housing prices", whose values are the most homogeneous, e = 0.986). The same permutation applies to the CILOS and IDOCRIW columns of Table 8 (our CILOS and IDOCRIW recomputation matches under the same perm, max diff 9.3e-5), so whole rows are mislabeled, not one column; whether the Subjective/Overall columns are also shifted cannot be told from the data. Table 10: rows 1–2 swapped (perm [1, 0, 2, 3, 4]). Table 12: the Entropy and CILOS column headers are swapped and rows 1 and 3 are swapped (perm [2, 1, 0, 3]); in addition IDOCRIW "Green spaces" is printed 0.1606 but computes to 0.4606 (the printed column sums to 0.700). The fixture below lists expected weights **in Table-4 column order**, i.e. what the data give.
- **Source B (option (b), min–max):** Krishnan, A.R., Kasim, M.M., Hamid, R. & Ghazali, M.F. (2021). A Modified CRITIC Method to Estimate the Objective Weights of Decision Criteria. *Symmetry* 13(6), 973, DOI [10.3390/sym13060973](https://doi.org/10.3390/sym13060973). Table 1 input, Table 5 column "Entropy". Labels consistent. Our min–max matrix equals their Table 2 to 4 d.p. (the text says Table 2 comes from "Equation (1)"; the normalization is Eq. 2, a typo). The use of the min–max matrix for Entropy is inferred (see Variants (b)).

```json
{
  "id": "entropy-zavadskas2017-economic",
  "variant": "sum (raw data, types ignored)",
  "source": "Zavadskas et al. 2017, Sustainability 9(5):702, Table 4 (input, economic block), Table 8 Entropy (output, rows permuted in paper)",
  "criteria": ["housing_price", "population_density", "single_family_density", "blocks_of_flats_density", "jobs_per_1000"],
  "types": ["min", "min", "max", "min", "max"],
  "matrix_transposed_by_criterion": {
    "housing_price": [1888.34, 1154.10, 676.10, 1080.61, 1222.06, 1190.30, 1711.44, 967.13, 854.64, 950.14, 1136.80, 1243.52, 1601.00, 2221.89, 1055.02, 1481.19, 1205.37, 1175.03, 1582.93, 2153.47, 1612.65],
    "population_density": [504.40, 9697.32, 1580.99, 9215.44, 6817.50, 3019.13, 4840.00, 758.42, 793.16, 91.12, 4031.22, 1472.46, 834.41, 4321.56, 7121.14, 757.93, 2072.43, 5893.20, 5455.29, 4103.33, 4917.31],
    "single_family_density": [44.62, 106.59, 76.90, 39.26, 11.50, 54.66, 116.04, 40.54, 89.03, 19.11, 74.88, 48.84, 97.48, 186.22, 55.00, 70.87, 38.54, 22.80, 23.18, 256.30, 188.78],
    "blocks_of_flats_density": [3.60, 42.20, 14.79, 86.58, 12.75, 14.17, 33.54, 6.18, 8.22, 1.04, 13.29, 7.68, 9.37, 40.67, 41.36, 5.03, 11.55, 31.60, 27.65, 72.59, 56.09],
    "jobs_per_1000": [18.20, 9.30, 2.00, 4.60, 7.20, 7.20, 94.60, 21.50, 11.00, 41.70, 10.70, 6.00, 7.70, 49.20, 9.20, 22.30, 9.50, 7.30, 37.90, 10.40, 21.50]
  },
  "alternatives_order": ["Antakalnis", "Fabijoniškės", "Grigiškės", "Justiniškės", "Karoliniškės", "Lazdynai", "Naujamiestis", "Naujininkai", "Naujoji Vilnia", "Paneriai", "Pašilaičiai", "Pilaitė", "Rasos", "Senamiestis", "Šeškinė", "Verkiai", "Vilkpėdė", "Viršuliškės", "Žirmūnai", "Žvėrynas", "Šnipiškės"],
  "published_as_printed": {"rows": ["housing_price", "population_density", "single_family_density", "blocks_of_flats_density", "jobs_per_1000"], "weights": [0.1879, 0.2970, 0.0308, 0.2196, 0.2648]},
  "expected": {"weights": [0.0308, 0.2196, 0.1879, 0.2648, 0.2970], "tolerance": 1e-4}
}
```

```json
{
  "id": "entropy-krishnan2021-minmax",
  "variant": "minmax (cost inverted) then p = r / sum r",
  "source": "Krishnan et al. 2021, Symmetry 13(6):973, Table 1 (input), Table 5 Entropy (output)",
  "types": ["min", "max", "max", "min", "min"],
  "matrix": [[649, 4.7, 326, 7.1, 143], [749, 5.5, 401, 7.3, 192], [740, 5.7, 520, 7.6, 171], [400, 5.7, 520, 11.1, 179], [600, 5.5, 538, 8.9, 152]],
  "expected": {"weights": [0.3481, 0.1360, 0.1690, 0.1463, 0.2006], "tolerance": 5e-5}
}
```

**Secondary fixtures (optional; labels consistent, published to 3 d.p.):**

```json
{
  "id": "entropy-vujicic2017-homogeneous",
  "variant": "sum (raw data, types ignored)",
  "source": "Vujicic, Papic & Blagojevic 2017, Tehnika 72(3):422-429, DOI 10.5937/tehnika1703422V, Table 2 (input), Table 4 (output)",
  "criteria": ["power_factor", "active_power_kW", "air_flow_m3h", "price_rsd", "current_A"],
  "types": ["max", "min", "max", "min", "min"],
  "matrix": [[0.87356, 0.621764706, 520, 25000, 3.160588], [0.900285714, 0.789785714, 550, 27500, 4.082143], [0.911652, 0.577609, 550, 31500, 2.815217], [0.95144, 0.82989, 450, 28500, 3.855556], [0.808, 0.837652, 530, 26000, 4.617391], [0.947846, 0.636308, 600, 30500, 3.006154], [0.95008, 0.50583, 530, 24500, 2.369167], [0.9325, 0.788917, 530, 26450, 3.841667], [0.930615, 0.791615, 750, 35000, 3.863077]],
  "expected": {"entropy": [0.999, 0.994, 0.996, 0.997, 0.991], "weights": [0.024, 0.282, 0.186, 0.129, 0.378], "tolerance": 5e-4}
}
```

```json
{
  "id": "entropy-mukhametzyanov2021-dm1-minmax",
  "variant": "minmax (cost inverted) then p = r / sum r",
  "source": "Mukhametzyanov 2021, DMAME 4(2):76-105, DOI 10.31181/dmame210402076i, Table 1 DM-1 (input), Table 2 Entropy DM-1 (output)",
  "types": ["max", "min", "max", "max", "min"],
  "matrix": [[71, 4500, 150, 1056, 478], [85, 5800, 145, 2680, 564], [76, 5600, 135, 1230, 620], [74, 4200, 160, 1480, 448], [82, 6200, 183, 1350, 615], [81, 6000, 178, 2065, 580], [80, 5900, 160, 1650, 610], [85, 6500, 140, 1650, 667]],
  "expected": {"weights": [0.146, 0.228, 0.211, 0.223, 0.191], "tolerance": 5e-4}
}
```

- **Recomputed** (re-verification 2026-10-05; independent numpy scripts `recompute.py`, `tehnika_check.py`, `muk_check.py`, `zhu_check.py` in the session scratchpad, not in the repo; Table 4 of Zavadskas parsed directly from the MDPI full text, 105/105 values equal to the JSON above):
  - A: numpy (a) = [0.03075, 0.21956, 0.18785, 0.26480, 0.29703], e = [0.98575, 0.89825, 0.91294, 0.87728, 0.86234]; against the published numbers after undoing the row permutation → **MATCH**, max abs diff 4.6e-5. Against the rows as printed → MISMATCH (label error in paper, explained above). pyDecision `entropy_method` (run from its source) = [0.0172, 0.4181, 0.1063, 0.2903, 0.1681] → **MISMATCH** (variant d, max abs diff 0.198).
  - B: numpy (b) = [0.34814, 0.13603, 0.16897, 0.14625, 0.20060], e = [0.63533, 0.85751, 0.82301, 0.84680, 0.78988] → **MATCH**, max abs diff 4.5e-5. (a) on raw Table 1 = [0.3534, 0.0389, 0.2754, 0.2409, 0.0914] → MISMATCH (0.109). pyDecision = [0.4429, 0.0356, 0.2524, 0.1835, 0.0856] → MISMATCH (variant d).
  - Vujičić et al. (2017) Table 4 (variant a): [0.02415, 0.28220, 0.18601, 0.12945, 0.37818] → MATCH at 3 d.p. (max 4.5e-4).
  - Mukhametzyanov (2021) Table 2 (variant b): DM-1 [0.1465, 0.2284, 0.2111, 0.2226, 0.1914], DM-2, DM-3 and DM-12 also → MATCH at 3 d.p. (max 4.6e-4).
  - Keshavarz-Ghorabaee et al. (2021) Table 6 Entropy (variant c) → MATCH at 3 d.p. (max 3.8e-4) — from the 29.09 pass, not re-run.

## Implementation notes
- pyDecision: `entropy_method(dataset, criterion_type)` = variant (d). Do not use it as oracle for our default.
- TS: compute in float64; use `p > 0 ? p*Math.log(p) : 0`; `k = 1/Math.log(m)`.
- Validation order: m ≥ 2, all cells finite; variant (a): any x < 0 → error offering (b).
- Per column: constant (incl. all-zero in (a), max = min in (b)) → d = 0 without dividing; otherwise clamp d = max(0, 1 − e). If Σd < 1e-12 → equal weights + warning.
- Notices: column with zeros (a); m = 2 with (b); one weight > 0.5.
- Return r, p, e, d for the step view.

## Sources
- Zavadskas et al. (2017), DOI 10.3390/su9050702 — full text (mdpi.com via fetch; elaba.lt PDF in the 29.09 pass), Sec. 5.1.1, Tables 4, 8, 10, 12.
- Krishnan et al. (2021), DOI 10.3390/sym13060973 — full text (mdpi.com), Eq. 2, Tables 1, 2, 5; Supplementary spreadsheet not accessible (HTTP 403).
- Mukhametzyanov, I.Z. (2021). Specific character of objective methods for determining weights of criteria in MCDM problems: Entropy, CRITIC and SD. *Decision Making: Applications in Management and Engineering* 4(2), 76–105, DOI 10.31181/dmame210402076i — full PDF (dmame-journal.org), Eqs. 1–6, Tables 1–2.
- Vujičić, M.D., Papić, M.Z. & Blagojević, M.D. (2017), *Tehnika* 72(3), 422–429, DOI 10.5937/tehnika1703422V — full PDF (scindeks-clanci.ceon.rs), Eqs. 15–19, Tables 2–4.
- Keshavarz-Ghorabaee, M., Amiri, M., Zavadskas, E.K., Turskis, Z. & Antucheviciene, J. (2021), *Symmetry* 13(4), 525, DOI 10.3390/sym13040525 — full text, Sec. 2, Table 1.
- Zhu, Y., Tian, D. & Yan, F. (2020). Effectiveness of Entropy Weight Method in Decision-Making. *Mathematical Problems in Engineering* 2020, 3564835, DOI 10.1155/2020/3564835 — full text (Wiley Online Library), Tables 2–3.
- Yazdani et al. (2020), DOI 10.1016/j.susoc.2020.12.002; Alao et al. (2020), DOI 10.1016/j.energy.2020.117675 — Crossref metadata only.
- pyDecision `pyDecision/algorithm/entropy.py` (GitHub master, read 2026-10-05).
- Shannon (1948); Hwang & Yoon (1981) — Crossref metadata only.

## Changes on re-verification (2026-10-05)
- Fixtures A and B: inputs re-checked against the full texts (A: all 105 values parsed from the paper), expected values unchanged; both MATCH (4.6e-5, 4.5e-5).
- Zavadskas label error: confirmed and made precise — whole rows of Table 8 (Entropy, CILOS, IDOCRIW) are permuted together; Table 10 rows 1–2 swapped; Table 12 Entropy/CILOS headers swapped plus rows 1/3 swapped; new: Table 12 IDOCRIW typo 0.1606 → 0.4606.
- Variant (b): full definition now cited to Mukhametzyanov 2021 Eqs. 1–4 (min–max with cost inversion, 0·ln0 = 0, k = 1/ln m). Krishnan's use of the min–max matrix for Entropy is marked as an inference (paper text does not say; supplement unreadable). Removed the unverified claim that Hwang & Yoon use (a).
- Variant (d): pyDecision source read; 1e-9 guards and `np.abs` documented.
- Tehnika 2017: authors and DOI verified (Vujičić, Papić & Blagojević, DOI 10.5937/tehnika1703422V); Table 4 numbers confirmed and recomputed; added as a secondary fixture. Mukhametzyanov DM-1 added as a secondary (b) fixture.
- Site copy: added "When to use / combined with" bullets in EN + TR, each with DOI'd sources read in full.
- Pitfalls: all-zero column changed from "reject" to "treat as constant, weight 0"; added zero-inflation (Zhu et al. 2020), (b) with m = 2, (b) constant column (0/0), float clamp, instability under alternative change (Mukhametzyanov 2021), missing cells. Popularity line recounted (Entropy 12, CRITIC 13, SD 8 of 30).
- Not verified: Hwang & Yoon (1981) and Zeleny (1982) books; Krishnan Supplementary file; Zhu et al. (2020) Table 3 numbers (not reproducible with the standard formula, cited only for direction); Keshavarz-Ghorabaee Table 6 not re-run.
